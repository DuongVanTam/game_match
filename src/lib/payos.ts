import { PayOS } from '@payos/node';
import { createHmac } from 'crypto';

// PayOS configuration
const payosClientId = process.env.PAYOS_CLIENT_ID;
const payosApiKey = process.env.PAYOS_API_KEY;
const payosChecksumKey = process.env.PAYOS_CHECKSUM_KEY;

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
  private payOS: PayOS | null = null;

  private constructor() {
    if (this.isAvailable()) {
      this.payOS = new PayOS({
        clientId: payosClientId as string,
        apiKey: payosApiKey as string,
        checksumKey: payosChecksumKey as string,
      });
    }
  }

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
    if (!this.isAvailable() || !this.payOS) {
      throw new Error(
        'PayOS client not initialized. Please check environment variables.'
      );
    }
    console.log('pauload', {
      orderCode: data.orderCode,
      amount: data.amount,
      description: data.description,
      items: data.items,
      returnUrl: data.returnUrl,
      cancelUrl: data.cancelUrl,
    });
    console.log('payosClientId', payosClientId);
    console.log('payosApiKey', payosApiKey);
    console.log('payosChecksumKey', payosChecksumKey);

    try {
      const paymentLink = await this.payOS.paymentRequests.create({
        orderCode: data.orderCode,
        amount: data.amount,
        description: data.description,
        items: data.items,
        returnUrl: data.returnUrl,
        cancelUrl: data.cancelUrl,
      });

      // Map PayOS SDK response to our PaymentLinkResponse interface
      // Handle different possible response structures
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const paymentLinkData = paymentLink as any;
      const result: PaymentLinkResponse = {
        bin: paymentLinkData.bin || '',
        accountNumber: paymentLinkData.accountNumber || '',
        accountName: paymentLinkData.accountName || '',
        amount: paymentLinkData.amount || data.amount,
        description: paymentLinkData.description || data.description,
        orderCode: paymentLinkData.orderCode || data.orderCode,
        currency: paymentLinkData.currency || 'VND',
        paymentLinkId:
          paymentLinkData.paymentLinkId ||
          paymentLinkData.id ||
          String(data.orderCode),
        status: paymentLinkData.status || 'PENDING',
        checkoutUrl: paymentLinkData.checkoutUrl || '',
        qrCode: paymentLinkData.qrCode || '',
      };

      return result;
    } catch (error) {
      console.error('Error creating PayOS payment link:', error);
      throw new Error(
        `Failed to create payment link: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  public async getPaymentLinkInfo(
    orderCode: number
  ): Promise<PaymentLinkResponse> {
    if (!this.isAvailable() || !this.payOS) {
      throw new Error(
        'PayOS client not initialized. Please check environment variables.'
      );
    }

    try {
      const paymentInfo = await this.payOS.paymentRequests.get(orderCode);

      // Map PayOS SDK response to our PaymentLinkResponse interface
      // Handle different possible response structures
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const paymentInfoData = paymentInfo as any;
      const result: PaymentLinkResponse = {
        bin: paymentInfoData.bin || '',
        accountNumber: paymentInfoData.accountNumber || '',
        accountName: paymentInfoData.accountName || '',
        amount: paymentInfoData.amount || 0,
        description: paymentInfoData.description || '',
        orderCode: paymentInfoData.orderCode || orderCode,
        currency: paymentInfoData.currency || 'VND',
        paymentLinkId:
          paymentInfoData.paymentLinkId ||
          paymentInfoData.id ||
          String(orderCode),
        status: paymentInfoData.status || 'PENDING',
        checkoutUrl: paymentInfoData.checkoutUrl || '',
        qrCode: paymentInfoData.qrCode || '',
      };

      return result;
    } catch (error) {
      console.error('Error getting PayOS payment link info:', error);
      throw new Error(
        `Failed to get payment link information: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  public async cancelPaymentLink(
    orderCode: number,
    cancellationReason: string
  ): Promise<boolean> {
    if (!this.isAvailable() || !this.payOS) {
      throw new Error(
        'PayOS client not initialized. Please check environment variables.'
      );
    }

    try {
      // PayOS SDK cancel method signature: cancel(orderCode: number, cancellationReason?: string)
      await this.payOS.paymentRequests.cancel(orderCode, cancellationReason);

      return true;
    } catch (error) {
      console.error('Error canceling PayOS payment link:', error);
      throw new Error(
        `Failed to cancel payment link: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  public verifyWebhookSignature(
    webhookBody: string,
    signature: string
  ): boolean {
    if (!this.isAvailable() || !payosChecksumKey) {
      return false;
    }

    try {
      // Verify HMAC-SHA256 signature
      const calculatedSignature = createHmac('sha256', payosChecksumKey)
        .update(webhookBody)
        .digest('hex');

      return calculatedSignature === signature;
    } catch (error) {
      console.error('Error verifying PayOS webhook signature:', error);
      return false;
    }
  }

  public verifyWebhookData(webhookData: unknown): boolean {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      // Basic validation - ensure payload has expected structure
      return typeof webhookData === 'object' && webhookData !== null;
    } catch (error) {
      console.error('Error verifying PayOS webhook data:', error);
      return false;
    }
  }
}

export const payosService = PayOSService.getInstance();
