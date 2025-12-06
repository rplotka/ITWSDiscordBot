/**
 * MSW server setup for Node.js testing
 */
import { setupServer } from 'msw/node';
import { handlers, mockStore } from './handlers.js';

// Create the MSW server with our Discord API handlers
export const server = setupServer(...handlers);

// Re-export for convenience
export { mockStore, handlers };

/**
 * Start the MSW server
 * Call this in your test setup
 */
export function startMockServer() {
  server.listen({
    onUnhandledRequest: 'warn',
  });
}

/**
 * Stop the MSW server
 * Call this in your test teardown
 */
export function stopMockServer() {
  server.close();
}

/**
 * Reset handlers and mock store
 * Call this between tests
 */
export function resetMockServer() {
  server.resetHandlers();
  mockStore.reset();
}
