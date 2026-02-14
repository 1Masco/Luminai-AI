// Backend Jest Setup
// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
process.env.GEMINI_API_KEY = 'test-gemini-key';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000,http://localhost:5173';

// Mock console methods to reduce noise in test output
const originalLog = console.log;
const originalError = console.error;

beforeAll(() => {
  // Only show error messages in test output
  console.log = jest.fn();
});

afterAll(() => {
  console.log = originalLog;
  console.error = originalError;
});
