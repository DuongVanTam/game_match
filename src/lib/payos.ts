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
  private static webhookRegistered = false;

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

  /**
   * Register webhook URL with PayOS
   * @param webhookUrl - The webhook URL to register
   * @returns Promise<boolean> - True if registration successful
   */
  public async registerWebhook(webhookUrl: string): Promise<boolean> {
    if (!this.isAvailable() || !this.payOS) {
      throw new Error(
        'PayOS client not initialized. Please check environment variables.'
      );
    }

    // Validate webhook URL format
    try {
      const url = new URL(webhookUrl);
      if (url.protocol !== 'https:') {
        throw new Error(
          'Webhook URL must use HTTPS protocol. PayOS requires HTTPS for webhook URLs.'
        );
      }
      if (!url.hostname || url.hostname === 'localhost') {
        throw new Error(
          'Webhook URL must use a public domain. localhost is not allowed.'
        );
      }
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error(`Invalid webhook URL format: ${webhookUrl}`);
      }
      throw error;
    }

    try {
      console.log('Attempting to register PayOS webhook:', webhookUrl);
      await this.payOS.webhooks.confirm(webhookUrl);
      PayOSService.webhookRegistered = true;
      console.log('✅ PayOS webhook registered successfully:', webhookUrl);
      return true;
    } catch (error) {
      console.error('❌ Error registering PayOS webhook:', error);

      // Provide more detailed error information
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;

        // Check for specific error patterns
        if (
          error.message.includes('400') ||
          error.message.includes('invalid')
        ) {
          errorMessage +=
            '. PayOS may require the URL to be publicly accessible and use HTTPS. ' +
            'Also ensure the domain is not blocked and the endpoint returns 200 OK.';
        } else if (
          error.message.includes('401') ||
          error.message.includes('Unauthorized')
        ) {
          errorMessage +=
            '. Check your PayOS credentials (CLIENT_ID, API_KEY, CHECKSUM_KEY).';
        } else if (
          error.message.includes('403') ||
          error.message.includes('Forbidden')
        ) {
          errorMessage +=
            '. Your PayOS account may not have permission to register webhooks.';
        }
      }

      throw new Error(`Failed to register webhook: ${errorMessage}`);
    }
  }

  /**
   * Verify webhook data using PayOS SDK
   * @param webhookData - The webhook data to verify
   * @returns Verified webhook data (as returned by SDK) or throws error if invalid
   */
  public async verifyWebhookData(webhookData: unknown): Promise<{
    orderCode: number;
    amount: number;
    description: string;
    accountNumber: string;
    reference: string;
    transactionDateTime: string;
    currency: string;
    paymentLinkId: string;
    code: string;
    desc: string;
    counterAccountBankId: string | null;
    counterAccountBankName: string | null;
    counterAccountName: string | null;
    counterAccountNumber: string | null;
    virtualAccountName: string | null;
    virtualAccountNumber: string | null;
    [key: string]: unknown;
  }> {
    if (!this.isAvailable() || !this.payOS) {
      throw new Error(
        'PayOS client not initialized. Please check environment variables.'
      );
    }

    try {
      // PayOS SDK verify method validates the webhook data
      // It returns Promise<WebhookData> which contains orderCode, amount, code (status), etc.
      // WebhookData is the data object inside {code, desc, success, data: WebhookData, signature}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const verifiedData = await this.payOS.webhooks.verify(webhookData as any);
      console.log('Verified data:', JSON.stringify(verifiedData, null, 2));

      // Return the verified data directly from SDK (this is the WebhookData object)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return verifiedData as any;
    } catch (error) {
      console.error('Error verifying PayOS webhook data:', error);
      throw new Error(
        `Invalid webhook data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Legacy method: Verify webhook signature manually (fallback)
   * @deprecated Use verifyWebhookData instead which uses SDK
   */
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
}

export const payosService = PayOSService.getInstance();
