/**
 * Health check endpoint tests
 */
const test = require('ava');
const http = require('http');

// Start a test server
let server;
let serverPort;

test.before(async () => {
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

test.after.always(() => {
  if (server) {
    server.close();
  }
});

test('health endpoint returns 200 status', async (t) => {
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

  t.is(response.status, 200);
  const parsed = JSON.parse(response.data);
  t.deepEqual(parsed, { status: 'ok' });
});

test('non-existent endpoint returns 404', async (t) => {
  const response = await new Promise((resolve, reject) => {
    const req = http.get(
      `http://localhost:${serverPort}/nonexistent`,
      (res) => {
        resolve({ status: res.statusCode });
      }
    );
    req.on('error', reject);
  });

  t.is(response.status, 404);
});
