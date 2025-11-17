import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createApiAuthClient } from '@/lib/supabase-server';
import {
  DEFAULT_OPENAI_VISION_MODEL,
  MatchAnalysisResult,
  MatchPlacement,
  openaiClient,
} from '@/lib/openai';
import type {
  ResponseFormatTextJSONSchemaConfig,
  ResponseOutputMessage,
  ResponseOutputText,
} from 'openai/resources/responses/responses';

const analyzeMatchRequestSchema = z.object({
  imageUrl: z.string().url(),
  players: z
    .array(
      z.object({
        userId: z.string().uuid(),
        displayName: z.string().min(1),
      })
    )
    .min(2, 'Cần ít nhất hai người chơi để phân tích'),
  matchId: z.string().uuid().optional(),
  roomId: z.string().uuid().optional(),
  matchTitle: z.string().optional(),
  roundNumber: z.number().int().positive().optional(),
});

const structuredOutputFormat: ResponseFormatTextJSONSchemaConfig = {
  type: 'json_schema',
  name: 'match_analysis',
  description:
    'Trả về danh sách thứ hạng người chơi trong trận đấu TFT dựa trên ảnh chụp màn hình.',
  strict: false,
  schema: {
    type: 'object',
    properties: {
      placements: {
        type: 'array',
        description:
          'Danh sách thứ hạng cho từng người chơi trong ảnh đã được xác thực với danh sách đầu vào.',
        items: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description:
                'UUID của người chơi, phải khớp với danh sách đầu vào. Nếu không xác định được thì trả về giá trị "unknown".',
            },
            displayName: {
              type: 'string',
              description:
                'Tên hiển thị của người chơi. BẮT BUỘC phải giống hệt `displayName` đã cung cấp trong danh sách đầu vào, không được tự ý chỉnh sửa.',
            },
            rank: {
              type: ['integer', 'null'],
              description:
                'Thứ hạng (1-8). Nếu không xác định được hoặc không có trong ảnh, để null.',
            },
            confidence: {
              type: ['number', 'null'],
              description: 'Độ tự tin (0-1). Nếu không thể ước lượng, để null.',
            },
            reason: {
              type: 'string',
              description:
                'Giải thích ngắn gọn (tiếng Việt) về cách xác định vị trí hoặc lý do không chắc chắn.',
            },
          },
          required: ['userId', 'displayName', 'rank', 'confidence', 'reason'],
          additionalProperties: false,
        },
      },
      warnings: {
        type: 'array',
        description:
          'Các cảnh báo hoặc ghi chú nếu ảnh bị mờ, thiếu thông tin, hoặc có nghi vấn gian lận.',
        items: {
          type: 'string',
        },
      },
    },
    required: ['placements'],
    additionalProperties: false,
  },
};

export async function POST(request: NextRequest) {
  if (!openaiClient) {
    return NextResponse.json(
      {
        error:
          'AI image analysis is not available. Please configure OPENAI_API_KEY.',
      },
      { status: 503 }
    );
  }

  const authClient = createApiAuthClient(request);

  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof analyzeMatchRequestSchema>;

  try {
    const json = await request.json();
    body = analyzeMatchRequestSchema.parse(json);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Invalid JSON payload',
      },
      { status: 400 }
    );
  }

  const { imageUrl, players, matchId, roomId, matchTitle, roundNumber } = body;

  const IMAGE_FETCH_TIMEOUT_MS = 15_000;
  const MAX_IMAGE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB limit per OpenAI vision docs

  let imageDataUrl: string;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      IMAGE_FETCH_TIMEOUT_MS
    );

    const imageResponse = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        Accept: 'image/*',
      },
    });

    clearTimeout(timeoutId);

    if (!imageResponse.ok) {
      throw new Error(
        `Failed to fetch image. Status: ${imageResponse.status} ${imageResponse.statusText}`
      );
    }

    const contentType =
      imageResponse.headers.get('content-type') || 'image/png';
    const arrayBuffer = await imageResponse.arrayBuffer();

    if (arrayBuffer.byteLength > MAX_IMAGE_SIZE_BYTES) {
      throw new Error(
        `Image exceeds maximum size of 20MB (received ${(
          arrayBuffer.byteLength /
          (1024 * 1024)
        ).toFixed(2)}MB)`
      );
    }

    const base64Data = Buffer.from(arrayBuffer).toString('base64');
    imageDataUrl = `data:${contentType};base64,${base64Data}`;
  } catch (error) {
    console.error('Failed to download proof image for AI analysis:', error);
    return NextResponse.json(
      {
        error:
          'Không thể tải hình ảnh để phân tích. Vui lòng kiểm tra kết nối và thử lại.',
      },
      { status: 422 }
    );
  }

  const playerListSummary = players
    .map(
      (player, index) =>
        `${index + 1}. ${player.displayName} (userId: ${player.userId})`
    )
    .join('\n');

  const metadataSummary = [
    matchTitle ? `Tên phòng/trận: ${matchTitle}` : null,
    typeof roundNumber === 'number' ? `Round/hiệp: ${roundNumber}` : null,
    matchId ? `Match ID: ${matchId}` : null,
    roomId ? `Room ID: ${roomId}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const systemPrompt =
    'Bạn là trợ lý phân tích kết quả trận đấu Teamfight Tactics. Bạn nhận được ảnh chụp màn hình bảng xếp hạng trận đấu và danh sách người chơi đã được hệ thống xác thực. Hãy trả về thứ hạng của từng người chơi theo đúng JSON schema. LƯU Ý: Trong kết quả, `displayName` phải trùng khớp từng ký tự với giá trị được cung cấp trong danh sách đầu vào, tuyệt đối không thay đổi.';
  const instructions = `Danh sách người chơi đã xác thực (luôn sử dụng đúng \`displayName\` này trong kết quả, không chỉnh sửa):\n${playerListSummary}\n\n${metadataSummary}\n\nNhiệm vụ của bạn:\n1. Đọc ảnh screenshot TFT.\n2. Xác định thứ hạng của từng người chơi trong danh sách.\n3. Nếu có người không có mặt trên ảnh hoặc không thể đọc chính xác, đặt rank = null và ghi lý do rõ ràng.\n4. Đảm bảo cả userId và displayName trong kết quả phải khớp với danh sách đầu vào (không được cắt bớt hoặc đổi chữ thường/hoa).\n5. Đánh giá độ tự tin (0-1). Nếu không chắc chắn, đặt null và giải thích trong reason.\n6. Có thể thêm warnings nếu ảnh mờ, bị chỉnh sửa hoặc có điều bất thường.`;

  try {
    const response = await openaiClient.responses.create({
      model: DEFAULT_OPENAI_VISION_MODEL,
      text: {
        format: structuredOutputFormat,
      },
      input: [
        {
          role: 'system',
          type: 'message',
          content: [
            {
              type: 'input_text',
              text: systemPrompt,
            },
          ],
        },
        {
          role: 'user',
          type: 'message',
          content: [
            {
              type: 'input_text',
              text: instructions,
            },
            {
              type: 'input_image',
              image_url: imageDataUrl,
              detail: 'high',
            },
          ],
        },
      ],
    });

    const messageOutput = response.output?.find(
      (item): item is ResponseOutputMessage =>
        Boolean(item) && (item as ResponseOutputMessage).type === 'message'
    );

    const outputText =
      messageOutput?.content?.find(
        (content): content is ResponseOutputText =>
          content.type === 'output_text'
      )?.text ?? '';

    const parsed =
      outputText.trim().length > 0
        ? (JSON.parse(outputText) as MatchAnalysisResult)
        : null;

    if (!parsed) {
      return NextResponse.json(
        {
          error: 'AI did not return a valid response. Please try again.',
        },
        { status: 502 }
      );
    }

    const placementsByUserId = new Map<string, MatchPlacement>();

    for (const placement of parsed.placements) {
      placementsByUserId.set(placement.userId, placement);
    }

    const normalizedPlacements: MatchPlacement[] = players.map((player) => {
      if (placementsByUserId.has(player.userId)) {
        return placementsByUserId.get(player.userId)!;
      }

      return {
        userId: player.userId,
        displayName: player.displayName,
        rank: null,
        confidence: null,
        reason:
          'Không tìm thấy người chơi trong ảnh hoặc tên hiển thị khác danh sách được cung cấp.',
      };
    });

    const result: MatchAnalysisResult = {
      placements: normalizedPlacements,
      rawText: outputText,
      warnings: parsed.warnings ?? undefined,
    };

    return NextResponse.json(
      {
        success: true,
        analysis: result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error analyzing match image with OpenAI:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze image. Please try again later.',
      },
      { status: 502 }
    );
  }
}
