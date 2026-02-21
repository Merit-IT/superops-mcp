#!/usr/bin/env node
/**
 * Remote MCP Server with OAuth 2.0 (Microsoft Entra ID)
 * Entry point for Claude.ai remote MCP connections via Streamable HTTP.
 */
import express from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { mcpAuthRouter } from '@modelcontextprotocol/sdk/server/auth/router.js';
import { requireBearerAuth } from '@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { entraIdProvider, handleEntraCallback, initAuthStore } from './auth/entra-id-provider.js';
import { tools } from './tools/definitions.js';
import { handleToolCall } from './tools/handlers.js';

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.MCP_SERVER_BASE_URL || `http://localhost:${PORT}`;

const app = express();
app.set('trust proxy', 1);

// --- Middleware ---
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [
        'https://claude.ai',
        'https://claude.com',
        /\.claude\.ai$/,
        /\.claude\.com$/,
        'https://chatgpt.com',
        'https://chat.openai.com',
        /\.openai\.com$/,
        'https://copilot.microsoft.com',
        /\.microsoft\.com$/,
        /\.azure-apim\.net$/,
        /\.azure-api\.net$/,
      ]
    : true,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request logging
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// --- OAuth Routes (auto-creates /.well-known, /authorize, /token, /register) ---
app.use(mcpAuthRouter({
  provider: entraIdProvider,
  issuerUrl: new URL(BASE_URL),
}));

// Entra ID callback (user redirected here after Microsoft login)
app.get('/callback', handleEntraCallback);

// --- Health Check ---
let storeReady = false;

app.get('/health', (_req, res) => {
  const status = storeReady ? 'healthy' : 'starting';
  res.status(storeReady ? 200 : 503).json({
    status,
    timestamp: new Date().toISOString(),
    version: '1.2.0',
  });
});

// --- Power Platform connector compatibility ---
// Copilot Studio / Power Platform sends the Bearer token in the JSON body
// (as { Authorization: "Bearer ...", SkipAuthorization: true }) instead of
// the HTTP Authorization header. This middleware promotes it to the header
// so requireBearerAuth works normally.
app.use('/mcp', (req, _res, next) => {
  if (!req.headers.authorization && req.body?.Authorization) {
    req.headers.authorization = req.body.Authorization;
    delete req.body.Authorization;
    delete req.body.SkipAuthorization;
  }
  next();
});

// --- MCP Streamable HTTP Endpoint ---
const sessions = new Map<string, { transport: StreamableHTTPServerTransport; server: Server }>();

const bearerAuth = requireBearerAuth({ verifier: entraIdProvider });

function createMcpServer(): Server {
  const server = new Server(
    { name: 'superops-mcp-server', version: '1.2.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
  server.setRequestHandler(CallToolRequestSchema, handleToolCall);

  return server;
}

// POST /mcp - JSON-RPC messages
app.post('/mcp', bearerAuth, async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;

  // Route to existing session if session ID matches
  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId)!;
    await session.transport.handleRequest(req, res, req.body);
    return;
  }

  // Check if this is an initialize request
  const body = req.body;
  const isInit = body && !Array.isArray(body) && body.method === 'initialize';

  if (!isInit && !sessionId && sessions.size > 0) {
    const [lastSessionId, session] = [...sessions.entries()].pop()!;
    req.headers['mcp-session-id'] = lastSessionId;
    (req as any).rawHeaders.push('mcp-session-id', lastSessionId);
    await session.transport.handleRequest(req, res, req.body);
    return;
  }

  // New session (initialize request)
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
    enableJsonResponse: true,
    onsessioninitialized: (id) => {
      sessions.set(id, { transport, server });
    },
  });

  const server = createMcpServer();
  await server.connect(transport);

  transport.onclose = () => {
    const sid = transport.sessionId;
    if (sid) sessions.delete(sid);
  };

  await transport.handleRequest(req, res, req.body);
});

// GET /mcp - SSE stream for server-initiated messages
app.get('/mcp', bearerAuth, async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !sessions.has(sessionId)) {
    res.status(400).json({ error: 'Invalid or missing session ID' });
    return;
  }
  const session = sessions.get(sessionId)!;
  await session.transport.handleRequest(req, res, req.body);
});

// DELETE /mcp - Session termination
app.delete('/mcp', bearerAuth, async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !sessions.has(sessionId)) {
    res.status(400).json({ error: 'Invalid or missing session ID' });
    return;
  }
  const session = sessions.get(sessionId)!;
  await session.transport.handleRequest(req, res, req.body);
  sessions.delete(sessionId);
});

// --- 404 Handler ---
app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`SuperOps Remote MCP Server running on port ${PORT}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`OAuth metadata: ${BASE_URL}/.well-known/oauth-authorization-server`);
  console.log(`MCP endpoint: ${BASE_URL}/mcp`);

  initAuthStore()
    .then(() => { storeReady = true; console.log('Auth store ready'); })
    .catch(err => { console.error('Auth store init failed:', err); process.exit(1); });
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...');
  process.exit(0);
});
