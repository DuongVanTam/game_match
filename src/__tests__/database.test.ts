// Mock Supabase client for testing
jest.mock('@/lib/supabase', () => ({
  createServerClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        limit: jest.fn(() => ({
          data: [],
          error: null,
        })),
      })),
    })),
  })),
}));

describe('Database Connection', () => {
  it('should have database service available', () => {
    // Test that our database service can be imported
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@/lib/database');
    }).not.toThrow();
  });

  it('should have all required types available', () => {
    // Test that our database types can be imported
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@/types/database');
    }).not.toThrow();
  });
});
