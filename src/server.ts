/**
 * Skills Over MCP — Demo Server (HTTP Streaming Transport)
 *
 * This MCP server demonstrates the "Skills Over MCP" pattern (SEP-2640).
 * Skills are served as standard MCP Resources using the `skill://` URI scheme.
 *
 * Transport: Streamable HTTP on port 3001 at /mcp
 *
 * Protocol flow:
 *   1. Client connects via HTTP POST/GET to /mcp
 *   2. Server declares `capabilities.resources` (and the skills extension)
 *   3. Client calls `resources/list` to discover skill resources
 *   4. Client calls `resources/read` with a `skill://` URI to fetch content
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Resolve paths — we read skill files from the skills/ directory on disk.
// ---------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SKILLS_DIR = path.resolve(__dirname, "../skills");
const MCP_PORT = 3001;

// ---------------------------------------------------------------------------
// Helper — recursively list all files under a directory.
// ---------------------------------------------------------------------------
function walkSync(dir: string, filelist: string[] = []): string[] {
  if (!fs.existsSync(dir)) return filelist;
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) {
      walkSync(full, filelist);
    } else {
      filelist.push(full);
    }
  }
  return filelist;
}

// ---------------------------------------------------------------------------
// Helper — parse simple YAML frontmatter from a markdown file.
// ---------------------------------------------------------------------------
function parseFrontmatter(content: string): { name: string; description: string } {
  const nameMatch = content.match(/^name:\s*(.+)$/m);
  const descMatch = content.match(/^description:\s*(.+)$/m);
  return {
    name: nameMatch ? nameMatch[1].trim() : "unknown",
    description: descMatch ? descMatch[1].trim() : "No description",
  };
}

// ---------------------------------------------------------------------------
// Build skill://index.json — the discovery index.
// ---------------------------------------------------------------------------
function buildSkillIndex(): object {
  const skills: Array<{ name: string; type: string; description: string; url: string }> = [];
  const files = walkSync(SKILLS_DIR);

  for (const file of files) {
    if (!file.endsWith("SKILL.md")) continue;
    const relPath = path.relative(SKILLS_DIR, file);
    const content = fs.readFileSync(file, "utf-8");
    const meta = parseFrontmatter(content);
    const posixPath = relPath.split(path.sep).join("/");

    skills.push({
      name: meta.name,
      type: "skill-md",
      description: meta.description,
      url: `skill://${posixPath}`,
    });
  }

  return {
    $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
    skills,
  };
}

// ---------------------------------------------------------------------------
// Create the MCP Server and register handlers.
// ---------------------------------------------------------------------------
function createSkillsServer(): Server {
  const server = new Server(
    { name: "skills-demo-server", version: "1.0.0" },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
      instructions:
        "This server provides workflow skills for Git, code review, and deployment. " +
        "Read skill://index.json to discover available skills. Then read individual " +
        "skill resources (e.g. skill://git-workflow/SKILL.md) for step-by-step instructions. " +
        "Skills may reference supporting files (e.g. skill://code-review/references/security-checklist.md) " +
        "that you can read on demand for additional detail.",
    },
  );

  // ── resources/list ──────────────────────────────────────────────────
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const resources: Array<{
      uri: string;
      name: string;
      description: string;
      mimeType: string;
      annotations: { audience: string[]; priority: number; lastModified: string };
    }> = [];

    resources.push({
      uri: "skill://index.json",
      name: "skills-index",
      description: "Discovery index listing all available skills on this server",
      mimeType: "application/json",
      annotations: {
        audience: ["assistant", "user"],
        priority: 1.0,
        lastModified: new Date().toISOString(),
      },
    });

    for (const file of walkSync(SKILLS_DIR)) {
      const relPath = path.relative(SKILLS_DIR, file);
      const posixPath = relPath.split(path.sep).join("/");
      const uri = `skill://${posixPath}`;
      const isSkillMd = file.endsWith("SKILL.md");

      let name = posixPath;
      let description = `Supporting file: ${posixPath}`;
      if (isSkillMd) {
        const content = fs.readFileSync(file, "utf-8");
        const meta = parseFrontmatter(content);
        name = meta.name;
        description = meta.description;
      }

      resources.push({
        uri,
        name,
        description,
        mimeType: "text/markdown",
        annotations: {
          audience: ["assistant"],
          priority: isSkillMd ? 0.8 : 0.3,
          lastModified: fs.statSync(file).mtime.toISOString(),
        },
      });
    }

    return { resources };
  });

  // ── resources/read ──────────────────────────────────────────────────
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    if (uri === "skill://index.json") {
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(buildSkillIndex(), null, 2),
          },
        ],
      };
    }

    if (uri.startsWith("skill://")) {
      const relPath = uri.replace("skill://", "");
      const fullPath = path.resolve(SKILLS_DIR, relPath);

      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        return {
          contents: [
            {
              uri,
              mimeType: "text/markdown",
              text: fs.readFileSync(fullPath, "utf-8"),
            },
          ],
        };
      }
    }

    throw new Error(`Resource not found: ${uri}`);
  });

  // ── tools/list ──────────────────────────────────────────────────────
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "create_branch",
        description:
          "Create a new Git branch from the current HEAD. " +
          "Referenced by the git-workflow skill.",
        inputSchema: {
          type: "object" as const,
          properties: {
            branch_name: {
              type: "string",
              description: "Branch name (e.g. feat/123-add-login)",
            },
            base: {
              type: "string",
              description: "Base branch (default: main)",
            },
          },
          required: ["branch_name"],
        },
      },
      {
        name: "run_tests",
        description:
          "Run the project test suite and return a pass/fail summary. " +
          "Referenced by the git-workflow and deploy-service skills.",
        inputSchema: {
          type: "object" as const,
          properties: {
            suite: {
              type: "string",
              description: "Test suite: unit | integration | all",
            },
          },
        },
      },
    ],
  }));

  // ── tools/call ──────────────────────────────────────────────────────
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "create_branch": {
        const branchName = (args as Record<string, unknown>)?.branch_name ?? "unnamed";
        const base = (args as Record<string, unknown>)?.base ?? "main";
        return {
          content: [
            {
              type: "text" as const,
              text: `✅ Branch "${branchName}" created from "${base}". (mock)`,
            },
          ],
        };
      }

      case "run_tests": {
        const suite = (args as Record<string, unknown>)?.suite ?? "all";
        return {
          content: [
            {
              type: "text" as const,
              text: `✅ Test suite "${suite}" passed — 42 tests, 0 failures. (mock)`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  return server;
}

// ---------------------------------------------------------------------------
// Read the raw request body as a string.
// ---------------------------------------------------------------------------
function readBody(req: import("node:http").IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

// ---------------------------------------------------------------------------
// Start the HTTP server with Streamable HTTP transport.
//
// The MCP Streamable HTTP transport uses:
//   POST /mcp  — client sends JSON-RPC requests, server responds (or streams SSE)
//   GET  /mcp  — client opens SSE stream for server-initiated notifications
//   DELETE /mcp — client terminates the session
// ---------------------------------------------------------------------------
async function main() {
  // Track transports by session ID for stateful connections
  const transports = new Map<string, StreamableHTTPServerTransport>();

  const httpServer = createServer(async (req, res) => {
    // CORS headers for the web UI
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, mcp-session-id, Accept");
    res.setHeader("Access-Control-Expose-Headers", "mcp-session-id");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url ?? "/", `http://localhost:${MCP_PORT}`);

    if (url.pathname !== "/mcp") {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found. Use /mcp endpoint." }));
      return;
    }

    // --- Handle MCP requests on /mcp ---
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    if (req.method === "POST") {
      const body = await readBody(req);
      const parsed = JSON.parse(body);

      // Check if this is an existing session
      if (sessionId && transports.has(sessionId)) {
        const transport = transports.get(sessionId)!;
        await transport.handleRequest(req, res, parsed);
        return;
      }

      // New session — create transport + server
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => {
          transports.set(id, transport);
        },
      });

      // Clean up on close
      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid) transports.delete(sid);
      };

      const server = createSkillsServer();
      await server.connect(transport);
      await transport.handleRequest(req, res, parsed);
      return;
    }

    if (req.method === "GET") {
      // SSE stream for server-initiated notifications
      if (sessionId && transports.has(sessionId)) {
        const transport = transports.get(sessionId)!;
        await transport.handleRequest(req, res);
        return;
      }
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "No valid session. Send an initialize request first." }));
      return;
    }

    if (req.method === "DELETE") {
      if (sessionId && transports.has(sessionId)) {
        const transport = transports.get(sessionId)!;
        await transport.handleRequest(req, res);
        transports.delete(sessionId);
        return;
      }
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Session not found." }));
      return;
    }

    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Method not allowed" }));
  });

  httpServer.listen(MCP_PORT, () => {
    console.log(`\n⚡ Skills MCP Server (Streamable HTTP)`);
    console.log(`   http://localhost:${MCP_PORT}/mcp\n`);
  });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
