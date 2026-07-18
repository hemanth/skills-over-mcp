/**
 * Skills Over MCP — Web UI Server
 *
 * An HTTP bridge that connects the browser to the MCP skills server.
 * The MCP server runs separately on port 3001 with Streamable HTTP transport.
 * This web server connects to it as an MCP client and serves the UI on port 3000.
 *
 * Run:  npm run server  (in one terminal — starts MCP server on :3001)
 *       npm run web     (in another  — starts web UI on :3000)
 *
 * Then: open http://localhost:3000
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  CallToolResultSchema,
  ListResourcesResultSchema,
  ListToolsResultSchema,
  ReadResourceResultSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 3000;
const MCP_SERVER_URL = "http://localhost:3001/mcp";

// ---------------------------------------------------------------------------
// Connect to the MCP skills server via Streamable HTTP
// ---------------------------------------------------------------------------
async function createMcpClient(): Promise<Client> {
  const transport = new StreamableHTTPClientTransport(
    new URL(MCP_SERVER_URL),
  );

  const client = new Client(
    { name: "skills-web-client", version: "1.0.0" },
    { capabilities: {} },
  );

  await client.connect(transport);
  console.log(`✅ Connected to MCP skills server at ${MCP_SERVER_URL}`);
  return client;
}

// ---------------------------------------------------------------------------
// JSON response helpers
// ---------------------------------------------------------------------------
function json(res: ServerResponse, data: unknown, status = 200) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(data));
}

function error(res: ServerResponse, msg: string, status = 500) {
  json(res, { error: msg }, status);
}

// ---------------------------------------------------------------------------
// Start the web UI server
// ---------------------------------------------------------------------------
async function main() {
  const client = await createMcpClient();

  const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
    const path = url.pathname;

    // CORS preflight
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      });
      res.end();
      return;
    }

    try {
      // ── API routes ──────────────────────────────────────────────
      if (path === "/api/index") {
        const result = await client.request(
          { method: "resources/read", params: { uri: "skill://index.json" } },
          ReadResourceResultSchema,
        );
        const text = (result.contents[0] as { text?: string }).text ?? "{}";
        json(res, JSON.parse(text));
        return;
      }

      if (path === "/api/resources") {
        const result = await client.request(
          { method: "resources/list" },
          ListResourcesResultSchema,
        );
        json(res, result.resources);
        return;
      }

      if (path === "/api/resource") {
        const uri = url.searchParams.get("uri");
        if (!uri) { error(res, "Missing ?uri= parameter", 400); return; }
        const result = await client.request(
          { method: "resources/read", params: { uri } },
          ReadResourceResultSchema,
        );
        json(res, result.contents[0]);
        return;
      }

      if (path === "/api/tools") {
        const result = await client.request(
          { method: "tools/list" },
          ListToolsResultSchema,
        );
        json(res, result.tools);
        return;
      }

      if (path === "/api/tool" && req.method === "POST") {
        const body = await readBody(req);
        const { name, arguments: args } = JSON.parse(body);
        const result = await client.request(
          { method: "tools/call", params: { name, arguments: args ?? {} } },
          CallToolResultSchema,
        );
        json(res, result);
        return;
      }

      // ── Serve static HTML ───────────────────────────────────────
      if (path === "/" || path === "/index.html") {
        const html = readFileSync(join(__dirname, "../public/index.html"), "utf-8");
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(html);
        return;
      }

      error(res, "Not found", 404);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("API error:", msg);
      error(res, msg);
    }
  });

  httpServer.listen(PORT, () => {
    console.log(`\n🌐 Skills Over MCP — Web UI`);
    console.log(`   http://localhost:${PORT}`);
    console.log(`   (MCP server: ${MCP_SERVER_URL})\n`);
  });
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
