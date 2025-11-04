import { NextRequest, NextResponse } from 'next/server';
import { createApiAuthClient, createServerClient } from '@/lib/supabase-server';
import { payosService } from '@/lib/payos';
import { z } from 'zod';

// Validation schema
const topupInitSchema = z.object({
  amount: z
    .number()
    .min(10000, 'Số tiền tối thiểu là 10,000 VNĐ')
    .max(10000000, 'Số tiền tối đa là 10,000,000 VNĐ'),
  paymentMethod: z.enum(['momo', 'payos']),
});

export async function POST(request: NextRequest) {
  try {
    const authClient = createApiAuthClient(request);

    // Get current user from auth
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = topupInitSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { amount, paymentMethod } = validation.data;

    // Generate unique transaction reference
    const txRef = `TFT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Generate orderCode for PayOS (if PayOS payment method)
    let orderCode: number | null = null;
    if (paymentMethod === 'payos' && payosService.isAvailable()) {
      // Generate orderCode: extract numbers from txRef or use timestamp
      orderCode =
        parseInt(txRef.replace(/\D/g, '').slice(-8)) || Date.now() % 100000000;
    }

    // Create topup record
    // Use service role client for DB writes (bypass RLS) with server-side checks
    const serviceClient = createServerClient();

    const { data: topup, error: topupError } = await serviceClient
      .from('topups')
      .insert({
        user_id: user.id,
        amount,
        tx_ref: txRef,
        payment_method: paymentMethod,
        status: 'pending',
        order_code: orderCode,
      })
      .select()
      .single();

    if (topupError) {
      console.error('Error creating topup:', topupError);
      return NextResponse.json(
        { error: 'Failed to create topup request' },
        { status: 500 }
      );
    }

    // Generate payment URL based on payment method
    let paymentUrl = '';

    if (paymentMethod === 'momo') {
      // For Momo, we'll use a simple redirect URL
      // In production, you would integrate with Momo API
      paymentUrl = `https://momo.vn/payment?amount=${amount}&tx_ref=${txRef}`;
    } else if (paymentMethod === 'payos') {
      // Use PayOS service if available

      if (payosService.isAvailable() && orderCode) {
        try {
          const baseUrl =
            process.env.NEXT_PUBLIC_BASE_URL || 'https://game-match.net';
          // description maxlength 25 characters: can't use txRef because it's too long
          // Format: DD/MM/YY HH:mm (e.g., "25/01/25 14:30" = 13 characters)
          const now = new Date();
          const day = String(now.getDate()).padStart(2, '0');
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const year = String(now.getFullYear()).slice(-2);
          const hours = String(now.getHours()).padStart(2, '0');
          const minutes = String(now.getMinutes()).padStart(2, '0');
          const dateTimeStr = `${day}/${month}/${year} ${hours}:${minutes}`; // Format: "25/01/25 14:30"

          const paymentLinkData = {
            orderCode,
            amount,
            description: dateTimeStr, // Date and time only, max 13 characters
            items: [
              {
                name: 'Nạp tiền tạm ứng dịch vụ',
                quantity: 1,
                price: amount,
              },
            ],
            returnUrl: `${baseUrl}/wallet/topup/result?success=true&tx_ref=${txRef}`,
            cancelUrl: `${baseUrl}/wallet/topup/result?cancelled=true&tx_ref=${txRef}`,
          };

          const paymentLink =
            await payosService.createPaymentLink(paymentLinkData);
          console.log('paymentLinkData', paymentLinkData);
          console.log('paymentLink', paymentLink);
          paymentUrl = paymentLink.checkoutUrl;
        } catch (error) {
          console.error('Error creating PayOS payment link:', error);
          // Fallback to simple URL
          paymentUrl = `https://payos.vn/payment?amount=${amount}&tx_ref=${txRef}`;
        }
      } else {
        // Fallback if PayOS is not configured
        paymentUrl = `https://payos.vn/payment?amount=${amount}&tx_ref=${txRef}`;
      }
    }

    return NextResponse.json({
      success: true,
      txRef,
      paymentUrl,
      amount,
      paymentMethod,
      topupId: topup.id,
    });
  } catch (error) {
    console.error('Error initializing topup:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
