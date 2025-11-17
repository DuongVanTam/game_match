import { NextRequest, NextResponse } from 'next/server';
import { createApiAuthClient, createServerClient } from '@/lib/supabase-server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authClient = createApiAuthClient(request);
    const serviceClient = createServerClient();
    const { id: roomId } = await params;

    // Get current user from auth
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get room details
    const { data: room, error: roomError } = await serviceClient
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.status !== 'open') {
      return NextResponse.json(
        {
          error: 'Room is not open for joining',
          message: 'Phòng đấu này không còn mở để tham gia.',
        },
        { status: 400 }
      );
    }

    // Check if user already has a membership record
    const { data: existingMember } = await serviceClient
      .from('room_players')
      .select('*')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single();

    if (existingMember && existingMember.status === 'active') {
      return NextResponse.json(
        {
          error: 'You have already joined this room',
          message: 'Bạn đã có mặt trong phòng đấu này.',
        },
        { status: 400 }
      );
    }

    // Get current member count
    const { count: activeMembersCount, error: countError } = await serviceClient
      .from('room_players')
      .select('id', { count: 'exact', head: true })
      .eq('room_id', roomId)
      .eq('status', 'active');

    if (countError) {
      console.error('Error counting room members:', countError);
      return NextResponse.json(
        {
          error: 'Failed to check room members',
          message: 'Không thể kiểm tra số lượng người chơi trong phòng.',
        },
        { status: 500 }
      );
    }

    if ((activeMembersCount ?? 0) >= room.max_players) {
      return NextResponse.json(
        {
          error: 'Room is full',
          message: 'Phòng đấu đã đủ người tham gia.',
        },
        { status: 400 }
      );
    }

    // Check user's wallet balance
    const { data: wallet, error: walletError } = await serviceClient
      .from('wallets')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) {
      return NextResponse.json(
        {
          error: 'Wallet not found',
          message: 'Không tìm thấy ví của bạn. Vui lòng khởi tạo ví.',
        },
        { status: 404 }
      );
    }

    if (Number(wallet.balance) < Number(room.entry_fee)) {
      return NextResponse.json(
        {
          error: 'Insufficient balance',
          message:
            'Số dư của bạn không đủ để tham gia phòng đấu. Vui lòng nạp thêm tiền.',
        },
        { status: 400 }
      );
    }

    // Join or reactivate membership
    if (existingMember) {
      const { error: reactivateError } = await serviceClient
        .from('room_players')
        .update({
          status: 'active',
          joined_at: new Date().toISOString(),
          left_at: null,
        })
        .eq('id', existingMember.id);

      if (reactivateError) {
        console.error('Error reactivating room membership:', reactivateError);
        return NextResponse.json(
          {
            error: 'Failed to rejoin room',
            message: 'Không thể tham gia lại phòng đấu.',
          },
          { status: 500 }
        );
      }
    } else {
      const { error: joinError } = await serviceClient
        .from('room_players')
        .insert({
          room_id: roomId,
          user_id: user.id,
          status: 'active',
          joined_at: new Date().toISOString(),
        });

      if (joinError) {
        if (joinError.code === '23505') {
          return NextResponse.json(
            {
              error: 'Duplicate join',
              message: 'Bạn đã tham gia phòng đấu này rồi.',
            },
            { status: 400 }
          );
        }

        console.error('Error joining room:', joinError);
        return NextResponse.json(
          {
            error: 'Failed to join room',
            message: 'Không thể thêm bạn vào phòng đấu.',
          },
          { status: 500 }
        );
      }
    }

    const { count: finalActiveCount } = await serviceClient
      .from('room_players')
      .select('id', { count: 'exact', head: true })
      .eq('room_id', roomId)
      .eq('status', 'active');

    return NextResponse.json({
      success: true,
      message: 'Tham gia phòng đấu thành công',
      current_players: finalActiveCount ?? (activeMembersCount ?? 0) + 1,
    });
  } catch (error) {
    console.error('Error in POST /api/matches/[id]/join:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
