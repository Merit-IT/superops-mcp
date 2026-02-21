#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { tools } from "./tools/definitions.js";
import { handleToolCall } from "./tools/handlers.js";

// --- SERVER SETUP ---
const server = new Server(
  {
    name: "superops-mcp-server",
    version: "1.2.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// --- TOOL DEFINITIONS ---
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// --- TOOL HANDLERS ---
server.setRequestHandler(CallToolRequestSchema, handleToolCall);

// --- START SERVER ---
const transport = new StdioServerTransport();
await server.connect(transport);
