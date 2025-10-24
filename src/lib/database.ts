import { createServerClient } from './supabase';
import { Database } from '@/types/database';

type TablesInsert = Database['public']['Tables'];

// Database utility functions
export class DatabaseService {
  private client = createServerClient();

  // User operations
  async createUser(userData: TablesInsert['users']['Insert']) {
    const { data, error } = await this.client
      .from('users')
      .insert(userData)
      .select()
      .single();

    return { data, error };
  }

  async getUser(userId: string) {
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    return { data, error };
  }

  // Wallet operations
  async getWallet(userId: string) {
    const { data, error } = await this.client
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    return { data, error };
  }

  async updateWalletBalance(
    userId: string,
    amount: number,
    transactionType: string,
    referenceId?: string,
    referenceType?: string,
    description?: string,
    metadata?: Record<string, unknown>
  ) {
    const { data, error } = await this.client.rpc('update_wallet_balance', {
      p_user_id: userId,
      p_amount: amount,
      p_transaction_type: transactionType,
      p_reference_id: referenceId,
      p_reference_type: referenceType,
      p_description: description,
      p_metadata: metadata,
    });

    return { data, error };
  }

  // Topup operations
  async createTopup(topupData: TablesInsert['topups']['Insert']) {
    const { data, error } = await this.client
      .from('topups')
      .insert(topupData)
      .select()
      .single();

    return { data, error };
  }

  async confirmTopup(txRef: string, paymentData?: Record<string, unknown>) {
    const { data, error } = await this.client
      .from('topups')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        payment_data: paymentData,
      })
      .eq('tx_ref', txRef)
      .select()
      .single();

    return { data, error };
  }

  // Match operations
  async createMatch(matchData: TablesInsert['matches']['Insert']) {
    const { data, error } = await this.client
      .from('matches')
      .insert(matchData)
      .select()
      .single();

    return { data, error };
  }

  async getMatches(status?: 'open' | 'ongoing' | 'completed' | 'cancelled') {
    let query = this.client
      .from('matches')
      .select(
        `
        *,
        created_by_user:users!matches_created_by_fkey(full_name, avatar_url),
        winner_user:users!matches_winner_id_fkey(full_name, avatar_url)
      `
      )
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    return { data, error };
  }

  async joinMatch(matchId: string, userId: string) {
    const { data, error } = await this.client
      .from('match_players')
      .insert({
        match_id: matchId,
        user_id: userId,
      })
      .select()
      .single();

    return { data, error };
  }

  // Ledger operations
  async getLedger(userId: string, limit = 50) {
    const { data, error } = await this.client
      .from('ledger')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    return { data, error };
  }

  // Payout operations
  async createPayoutRequest(
    payoutData: TablesInsert['payout_requests']['Insert']
  ) {
    const { data, error } = await this.client
      .from('payout_requests')
      .insert(payoutData)
      .select()
      .single();

    return { data, error };
  }

  async getPayoutRequests(userId?: string) {
    let query = this.client
      .from('payout_requests')
      .select(
        `
        *,
        user:users!payout_requests_user_id_fkey(full_name, email),
        processed_by_user:users!payout_requests_processed_by_fkey(full_name)
      `
      )
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    return { data, error };
  }
}

export const db = new DatabaseService();
