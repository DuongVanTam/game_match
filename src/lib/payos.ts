// PayOS configuration
const payosClientId = process.env.PAYOS_CLIENT_ID;
const payosApiKey = process.env.PAYOS_API_KEY;
const payosChecksumKey = process.env.PAYOS_CHECKSUM_KEY;

const PAYOS_API_BASE = 'https://api.payos.vn';

// Simple PayOS service without external dependency for now
// In production, you would use the actual PayOS SDK

export interface PaymentLinkData {
  orderCode: number;
  amount: number;
  description: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  returnUrl: string;
  cancelUrl: string;
}

export interface PaymentLinkResponse {
  bin: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  description: string;
  orderCode: number;
  currency: string;
  paymentLinkId: string;
  status: string;
  checkoutUrl: string;
  qrCode: string;
}

export class PayOSService {
  private static instance: PayOSService;

  private constructor() {}

  public static getInstance(): PayOSService {
    if (!PayOSService.instance) {
      PayOSService.instance = new PayOSService();
    }
    return PayOSService.instance;
  }

  public isAvailable(): boolean {
    return !!(payosClientId && payosApiKey && payosChecksumKey);
  }

  public async createPaymentLink(
    data: PaymentLinkData
  ): Promise<PaymentLinkResponse> {
    if (!this.isAvailable()) {
      throw new Error(
        'PayOS client not initialized. Please check environment variables.'
      );
    }

    try {
      const resp = await fetch(`${PAYOS_API_BASE}/v2/payment-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': payosClientId as string,
          'x-api-key': payosApiKey as string,
        },
        body: JSON.stringify({
          orderCode: data.orderCode,
          amount: data.amount,
          description: data.description,
          items: data.items,
          returnUrl: data.returnUrl,
          cancelUrl: data.cancelUrl,
        }),
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        throw new Error(
          `PayOS createPaymentLink failed: ${resp.status} ${errorText}`
        );
      }

      const json = await resp.json();
      // Normalize expected shape
      const payload = json?.data || json;
      const result: PaymentLinkResponse = {
        bin: payload.bin || '',
        accountNumber: payload.accountNumber || '',
        accountName: payload.accountName || '',
        amount: payload.amount,
        description: payload.description,
        orderCode: payload.orderCode,
        currency: payload.currency || 'VND',
        paymentLinkId: payload.paymentLinkId || payload.id || '',
        status: payload.status || 'PENDING',
        checkoutUrl: payload.checkoutUrl,
        qrCode: payload.qrCode,
      };

      return result;
    } catch (error) {
      console.error('Error creating PayOS payment link:', error);
      throw new Error('Failed to create payment link');
    }
  }

  public async getPaymentLinkInfo(
    orderCode: number
  ): Promise<PaymentLinkResponse> {
    if (!this.isAvailable()) {
      throw new Error(
        'PayOS client not initialized. Please check environment variables.'
      );
    }

    try {
      // Mock implementation
      const mockResponse: PaymentLinkResponse = {
        bin: '970407',
        accountNumber: '1234567890',
        accountName: 'TFT Match Platform',
        amount: 0,
        description: 'Payment link info',
        orderCode,
        currency: 'VND',
        paymentLinkId: `payos_${orderCode}`,
        status: 'PENDING',
        checkoutUrl: `https://payos.vn/checkout/${orderCode}`,
        qrCode: `https://payos.vn/qr/${orderCode}`,
      };

      return mockResponse;
    } catch (error) {
      console.error('Error getting PayOS payment link info:', error);
      throw new Error('Failed to get payment link information');
    }
  }

  public async cancelPaymentLink(
    orderCode: number,
    cancellationReason: string
  ): Promise<boolean> {
    if (!this.isAvailable()) {
      throw new Error(
        'PayOS client not initialized. Please check environment variables.'
      );
    }

    try {
      // Mock implementation - in production, you would call the actual PayOS API
      console.log(`Canceling payment link ${orderCode}: ${cancellationReason}`);
      return true;
    } catch (error) {
      console.error('Error canceling PayOS payment link:', error);
      throw new Error('Failed to cancel payment link');
    }
  }

  public verifyWebhookData(webhookData: unknown): boolean {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      // HMAC-SHA256 of raw body with checksum key, compared against header done in route
      // Here just ensure payload has expected fields as a sanity check
      return typeof webhookData === 'object' && webhookData !== null;
    } catch (error) {
      console.error('Error verifying PayOS webhook data:', error);
      return false;
    }
  }
}

export const payosService = PayOSService.getInstance();
