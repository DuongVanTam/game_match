export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          phone: string | null;
          role: 'user' | 'admin';
          email_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          role?: 'user' | 'admin';
          email_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          role?: 'user' | 'admin';
          email_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'users_id_fkey';
            columns: ['id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      wallets: {
        Row: {
          id: string;
          user_id: string;
          balance: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          balance?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          balance?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'wallets_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      topups: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          tx_ref: string;
          status: 'pending' | 'confirmed' | 'failed' | 'cancelled';
          payment_method: string | null;
          payment_data: Json | null;
          confirmed_at: string | null;
          order_code: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          tx_ref: string;
          status?: 'pending' | 'confirmed' | 'failed' | 'cancelled';
          payment_method?: string | null;
          payment_data?: Json | null;
          confirmed_at?: string | null;
          order_code?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          tx_ref?: string;
          status?: 'pending' | 'confirmed' | 'failed' | 'cancelled';
          payment_method?: string | null;
          payment_data?: Json | null;
          confirmed_at?: string | null;
          order_code?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'topups_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      matches: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          entry_fee: number;
          max_players: number;
          current_players: number;
          status: 'open' | 'ongoing' | 'completed' | 'cancelled';
          created_by: string;
          started_at: string | null;
          completed_at: string | null;
          winner_id: string | null;
          proof_image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          entry_fee: number;
          max_players?: number;
          current_players?: number;
          status?: 'open' | 'ongoing' | 'completed' | 'cancelled';
          created_by: string;
          started_at?: string | null;
          completed_at?: string | null;
          winner_id?: string | null;
          proof_image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          entry_fee?: number;
          max_players?: number;
          current_players?: number;
          status?: 'open' | 'ongoing' | 'completed' | 'cancelled';
          created_by?: string;
          started_at?: string | null;
          completed_at?: string | null;
          winner_id?: string | null;
          proof_image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'matches_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'matches_winner_id_fkey';
            columns: ['winner_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      match_players: {
        Row: {
          id: string;
          match_id: string;
          user_id: string;
          joined_at: string;
          left_at: string | null;
          status: 'active' | 'left' | 'disqualified';
        };
        Insert: {
          id?: string;
          match_id: string;
          user_id: string;
          joined_at?: string;
          left_at?: string | null;
          status?: 'active' | 'left' | 'disqualified';
        };
        Update: {
          id?: string;
          match_id?: string;
          user_id?: string;
          joined_at?: string;
          left_at?: string | null;
          status?: 'active' | 'left' | 'disqualified';
        };
        Relationships: [
          {
            foreignKeyName: 'match_players_match_id_fkey';
            columns: ['match_id'];
            referencedRelation: 'matches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'match_players_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      ledger: {
        Row: {
          id: string;
          user_id: string;
          transaction_type:
            | 'topup'
            | 'join_match'
            | 'leave_match'
            | 'win_prize'
            | 'service_fee'
            | 'withdraw';
          amount: number;
          balance_after: number;
          reference_id: string | null;
          reference_type: string | null;
          description: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          transaction_type:
            | 'topup'
            | 'join_match'
            | 'leave_match'
            | 'win_prize'
            | 'service_fee'
            | 'withdraw';
          amount: number;
          balance_after: number;
          reference_id?: string | null;
          reference_type?: string | null;
          description?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          transaction_type?:
            | 'topup'
            | 'join_match'
            | 'leave_match'
            | 'win_prize'
            | 'service_fee'
            | 'withdraw';
          amount?: number;
          balance_after?: number;
          reference_id?: string | null;
          reference_type?: string | null;
          description?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ledger_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      payout_requests: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          status:
            | 'pending'
            | 'approved'
            | 'processing'
            | 'completed'
            | 'rejected';
          payment_method: string;
          payment_details: Json;
          admin_notes: string | null;
          processed_by: string | null;
          processed_at: string | null;
          proof_tx: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          status?:
            | 'pending'
            | 'approved'
            | 'processing'
            | 'completed'
            | 'rejected';
          payment_method: string;
          payment_details: Json;
          admin_notes?: string | null;
          processed_by?: string | null;
          processed_at?: string | null;
          proof_tx?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          status?:
            | 'pending'
            | 'approved'
            | 'processing'
            | 'completed'
            | 'rejected';
          payment_method?: string;
          payment_details?: Json;
          admin_notes?: string | null;
          processed_by?: string | null;
          processed_at?: string | null;
          proof_tx?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'payout_requests_processed_by_fkey';
            columns: ['processed_by'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payout_requests_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      update_wallet_balance: {
        Args: {
          p_user_id: string;
          p_amount: number;
          p_transaction_type: string;
          p_reference_id?: string;
          p_reference_type?: string;
          p_description?: string;
          p_metadata?: Json;
        };
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
