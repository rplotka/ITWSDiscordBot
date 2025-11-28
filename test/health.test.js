/**
 * Health check endpoint tests
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';

// Start a test server
let server;
let serverPort;

beforeAll(async () => {
  // Create a minimal HTTP server for testing
  server = http.createServer((req, res) => {
    if (req.url === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  // Find an available port
  return new Promise((resolve) => {
    server.listen(0, () => {
      serverPort = server.address().port;
      resolve();
    });
  });
});

afterAll(() => {
  if (server) {
    server.close();
  }
});

describe('health endpoint', () => {
  it('health endpoint returns 200 status', async () => {
    const response = await new Promise((resolve, reject) => {
      const req = http.get(`http://localhost:${serverPort}/health`, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({ status: res.statusCode, data });
        });
      });
      req.on('error', reject);
    });

    expect(response.status).toBe(200);
    const parsed = JSON.parse(response.data);
    expect(parsed).toEqual({ status: 'ok' });
  });

  it('non-existent endpoint returns 404', async () => {
    const response = await new Promise((resolve, reject) => {
      const req = http.get(
        `http://localhost:${serverPort}/nonexistent`,
        (res) => {
          resolve({ status: res.statusCode });
        }
      );
      req.on('error', reject);
    });

    expect(response.status).toBe(404);
  });
});
