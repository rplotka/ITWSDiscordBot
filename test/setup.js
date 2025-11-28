/**
 * Vitest test setup and global mocks
 */
import { vi } from 'vitest';

// Mock environment variables for tests
process.env.DISCORD_SERVER_ID = 'test-server-id';
process.env.DISCORD_TOKEN = 'test-token';
process.env.DISCORD_CLIENT_ID = 'test-client-id';

// Suppress pino logging during tests
vi.mock('../core/logging', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    })),
  },
}));
