import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.warn(
    '[openai] OPENAI_API_KEY is not set. AI-powered image analysis will be disabled.'
  );
}

export const openaiClient = apiKey
  ? new OpenAI({
      apiKey,
    })
  : null;

export const DEFAULT_OPENAI_VISION_MODEL =
  process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini';

export interface MatchAnalysisInput {
  imageUrl: string;
  players: Array<{
    userId: string;
    displayName: string;
  }>;
  matchContext?: {
    roomTitle?: string;
    roundNumber?: number;
  };
}

export interface MatchPlacement {
  userId: string;
  displayName: string;
  rank: number | null;
  confidence: number | null;
  reason: string;
}

export interface MatchAnalysisResult {
  placements: MatchPlacement[];
  rawText: string;
  warnings?: string[];
}
