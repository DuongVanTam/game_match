import '@testing-library/jest-dom';

// Setup test environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://kxcydvdvxvibcivabwpo.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4Y3lkdmR2eHZpYmNpdmFid3BvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNjg4MjMsImV4cCI6MjA3Njg0NDgyM30.bzdz9cjkWxwPrRAyUfYLQoF_ukKWizQqXs_R93V1g8A';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_service_role_key';
process.env.NEXTAUTH_URL = 'http://localhost:3000';

// Mock Next.js Request and Response for API route testing
global.Request = global.Request || class Request {
  constructor(input, init = {}) {
    this.url = typeof input === 'string' ? input : input.url;
    this.method = init.method || 'GET';
    this.headers = new Map(Object.entries(init.headers || {}));
    this.body = init.body;
  }
};

global.Response = global.Response || class Response {
  constructor(body, init = {}) {
    this.body = body;
    this.status = init.status || 200;
    this.statusText = init.statusText || 'OK';
    this.headers = new Map(Object.entries(init.headers || {}));
  }

  json() {
    return Promise.resolve(JSON.parse(this.body));
  }
};

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '/';
  },
}));

// Mock Next.js image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt="" />;
  },
}));
