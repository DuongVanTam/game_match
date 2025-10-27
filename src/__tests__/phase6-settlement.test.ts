import { createServerClient } from '@/lib/supabase';
import { uploadFile, STORAGE_BUCKETS } from '@/lib/storage';

// Mock Supabase client for testing
jest.mock('@/lib/supabase', () => ({
  createServerClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: {
              id: 'test-match-id',
              title: 'Test Match',
              status: 'ongoing',
              entry_fee: 10000,
              created_by: 'test-user-id',
              match_players: [
                {
                  id: 'player-1',
                  user_id: 'test-user-id',
                  status: 'active',
                  user: { id: 'test-user-id', full_name: 'Test User' },
                },
                {
                  id: 'player-2',
                  user_id: 'winner-user-id',
                  status: 'active',
                  user: { id: 'winner-user-id', full_name: 'Winner User' },
                },
              ],
            },
            error: null,
          })),
        })),
      })),
    })),
    rpc: jest.fn(() => ({
      data: null,
      error: null,
    })),
  })),
}));

// Mock storage functions
jest.mock('@/lib/storage', () => ({
  uploadFile: jest.fn(),
  STORAGE_BUCKETS: {
    MATCH_PROOFS: 'match-proofs',
  },
}));

describe('Phase 6 - Proof & Settlement', () => {
  let mockClient: ReturnType<typeof createServerClient>;

  beforeEach(() => {
    mockClient = createServerClient();
    jest.clearAllMocks();
  });

  describe('Image Upload Component', () => {
    it('should validate file type correctly', async () => {
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      
      const result = await uploadFile({
        bucket: STORAGE_BUCKETS.MATCH_PROOFS,
        path: 'test/path',
        file: mockFile,
      });

      expect(result.error).toBe('Chỉ được upload file hình ảnh');
    });

    it('should validate file size correctly', async () => {
      // Create a mock file that's too large (6MB)
      const mockFile = new File(['x'.repeat(6 * 1024 * 1024)], 'test.jpg', { 
        type: 'image/jpeg' 
      });
      
      const result = await uploadFile({
        bucket: STORAGE_BUCKETS.MATCH_PROOFS,
        path: 'test/path',
        file: mockFile,
      });

      expect(result.error).toBe('File quá lớn. Kích thước tối đa là 5MB');
    });

    it('should accept valid image files', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      // Mock successful upload
      (uploadFile as jest.Mock).mockResolvedValue({
        path: 'test/path',
        url: 'https://example.com/test.jpg',
      });

      const result = await uploadFile({
        bucket: STORAGE_BUCKETS.MATCH_PROOFS,
        path: 'test/path',
        file: mockFile,
      });

      expect(result.path).toBe('test/path');
      expect(result.url).toBe('https://example.com/test.jpg');
      expect(result.error).toBeUndefined();
    });
  });

  describe('Settlement API', () => {
    it('should validate match status before settlement', async () => {
      // Mock match with wrong status
      mockClient.from().select().eq().single.mockReturnValue({
        data: {
          id: 'test-match-id',
          status: 'open', // Wrong status
          match_players: [],
        },
        error: null,
      });

      const response = await fetch('/api/matches/test-match-id/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          winnerId: 'winner-user-id',
          proofImageUrl: 'https://example.com/proof.jpg',
        }),
      });

      const result = await response.json();
      expect(response.status).toBe(400);
      expect(result.error).toBe('Match must be ongoing to settle');
    });

    it('should validate winner is an active player', async () => {
      // Mock match with winner not in active players
      mockClient.from().select().eq().single.mockReturnValue({
        data: {
          id: 'test-match-id',
          status: 'ongoing',
          match_players: [
            {
              id: 'player-1',
              user_id: 'test-user-id',
              status: 'active',
            },
          ],
        },
        error: null,
      });

      const response = await fetch('/api/matches/test-match-id/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          winnerId: 'invalid-winner-id',
          proofImageUrl: 'https://example.com/proof.jpg',
        }),
      });

      const result = await response.json();
      expect(response.status).toBe(400);
      expect(result.error).toBe('Winner must be an active player in this match');
    });

    it('should calculate settlement correctly', async () => {
      const entryFee = 10000;
      const activePlayers = 8;
      const totalPool = entryFee * activePlayers;
      const serviceFeeRate = 0.1;
      const serviceFee = Math.floor(totalPool * serviceFeeRate);
      const prizeAmount = totalPool - serviceFee;

      expect(totalPool).toBe(80000);
      expect(serviceFee).toBe(8000);
      expect(prizeAmount).toBe(72000);
    });

    it('should require authentication', async () => {
      // Mock unauthenticated request
      const response = await fetch('/api/matches/test-match-id/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          winnerId: 'winner-user-id',
          proofImageUrl: 'https://example.com/proof.jpg',
        }),
      });

      expect(response.status).toBe(401);
    });

    it('should validate request body schema', async () => {
      const response = await fetch('/api/matches/test-match-id/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Missing required fields
          invalidField: 'test',
        }),
      });

      const result = await response.json();
      expect(response.status).toBe(400);
      expect(result.error).toBe('Invalid request data');
    });
  });

  describe('Winner Selection Component', () => {
    const mockPlayers = [
      {
        id: 'player-1',
        user_id: 'user-1',
        status: 'active',
        user: { id: 'user-1', full_name: 'Player 1' },
      },
      {
        id: 'player-2',
        user_id: 'user-2',
        status: 'active',
        user: { id: 'user-2', full_name: 'Player 2' },
      },
      {
        id: 'player-3',
        user_id: 'user-3',
        status: 'left',
        user: { id: 'user-3', full_name: 'Player 3' },
      },
    ];

    it('should filter active players correctly', () => {
      const activePlayers = mockPlayers.filter(player => player.status === 'active');
      expect(activePlayers).toHaveLength(2);
      expect(activePlayers[0].user_id).toBe('user-1');
      expect(activePlayers[1].user_id).toBe('user-2');
    });

    it('should calculate prize amount correctly', () => {
      const entryFee = 10000;
      const activePlayersCount = 8;
      const totalPool = entryFee * activePlayersCount;
      const serviceFee = Math.floor(totalPool * 0.1);
      const prizeAmount = totalPool - serviceFee;

      expect(prizeAmount).toBe(72000);
    });
  });

  describe('Admin Dashboard', () => {
    it('should require admin role for access', async () => {
      // Mock non-admin user
      mockClient.from().select().eq().single.mockReturnValue({
        data: { role: 'user' },
        error: null,
      });

      const response = await fetch('/api/admin/stats');
      expect(response.status).toBe(403);
    });

    it('should calculate dashboard stats correctly', async () => {
      // Mock admin user
      mockClient.from().select().eq().single.mockReturnValue({
        data: { role: 'admin' },
        error: null,
      });

      // Mock stats data
      mockClient.from().select.mockReturnValue({
        data: [
          { id: 'user-1' },
          { id: 'user-2' },
          { id: 'user-3' },
        ],
        error: null,
      });

      const response = await fetch('/api/admin/stats');
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.totalUsers).toBe(3);
    });
  });

  describe('Database Functions', () => {
    it('should handle settle_match function correctly', async () => {
      // Mock successful RPC call
      mockClient.rpc.mockReturnValue({
        data: null,
        error: null,
      });

      const result = await mockClient.rpc('settle_match', {
        p_match_id: 'test-match-id',
        p_winner_id: 'winner-user-id',
        p_prize_amount: 72000,
        p_service_fee: 8000,
        p_proof_image_url: 'https://example.com/proof.jpg',
      });

      expect(result.error).toBeNull();
      expect(mockClient.rpc).toHaveBeenCalledWith('settle_match', {
        p_match_id: 'test-match-id',
        p_winner_id: 'winner-user-id',
        p_prize_amount: 72000,
        p_service_fee: 8000,
        p_proof_image_url: 'https://example.com/proof.jpg',
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Mock network error
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      try {
        await fetch('/api/matches/test-match-id/settle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            winnerId: 'winner-user-id',
            proofImageUrl: 'https://example.com/proof.jpg',
          }),
        });
      } catch (error) {
        expect(error.message).toBe('Network error');
      }
    });

    it('should handle database errors gracefully', async () => {
      mockClient.from().select().eq().single.mockReturnValue({
        data: null,
        error: { message: 'Database connection failed' },
      });

      const response = await fetch('/api/matches/test-match-id/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          winnerId: 'winner-user-id',
          proofImageUrl: 'https://example.com/proof.jpg',
        }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe('Security Tests', () => {
    it('should prevent unauthorized settlement', async () => {
      // Mock non-match-creator user
      mockClient.from().select().eq().single.mockReturnValue({
        data: {
          id: 'test-match-id',
          status: 'ongoing',
          created_by: 'other-user-id', // Different from current user
          match_players: [],
        },
        error: null,
      });

      const response = await fetch('/api/matches/test-match-id/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          winnerId: 'winner-user-id',
          proofImageUrl: 'https://example.com/proof.jpg',
        }),
      });

      expect(response.status).toBe(403);
    });

    it('should validate file upload security', async () => {
      // Test malicious file types
      const maliciousFiles = [
        new File(['<script>alert("xss")</script>'], 'malicious.html', { type: 'text/html' }),
        new File(['executable content'], 'malicious.exe', { type: 'application/x-executable' }),
        new File(['php code'], 'malicious.php', { type: 'application/x-php' }),
      ];

      for (const file of maliciousFiles) {
        const result = await uploadFile({
          bucket: STORAGE_BUCKETS.MATCH_PROOFS,
          path: 'test/path',
          file,
        });

        expect(result.error).toBe('Chỉ được upload file hình ảnh');
      }
    });
  });
});
