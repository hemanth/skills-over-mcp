/**
 * Skills Over MCP — Demo Client
 *
 * This client demonstrates the full discovery-and-consumption flow for
 * Skills Over MCP (SEP-2640):
 *
 *   1. Connect to the MCP server via stdio
 *   2. Read skill://index.json to discover available skills
 *   3. List all resources and filter for skill:// URIs
 *   4. Read a skill's SKILL.md for the full instructions
 *   5. Read a supporting reference file linked from a skill
 *   6. List available tools that skills reference
 *
 * Run:  npm run client
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import {
  ListResourcesResultSchema,
  ListToolsResultSchema,
  ReadResourceResultSchema,
} from "@modelcontextprotocol/sdk/types.js";

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------
const DIVIDER = "─".repeat(60);

function header(title: string) {
  console.log(`\n${DIVIDER}`);
  console.log(`  ${title}`);
  console.log(DIVIDER);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("🚀 Skills Over MCP — Client Demo\n");

  // ── 1. Connect to the server ────────────────────────────────────────
  // The client spawns the server as a child process using stdio transport.
  // In production, servers may run remotely via SSE or HTTP.
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["tsx", "src/server.ts"],
  });

  const client = new Client(
    { name: "skills-demo-client", version: "1.0.0" },
    { capabilities: {} },
  );

  console.log("Connecting to skills-demo-server via stdio...");
  await client.connect(transport);

  const info = client.getServerVersion();
  console.log(`✅ Connected to ${info?.name} v${info?.version}\n`);

  // ── 2. Discover skills via skill://index.json ───────────────────────
  // The well-known index resource lists all top-level skills the server
  // offers.  This is the primary discovery mechanism.
  header("Step 1 · Read skill://index.json (discovery)");

  const indexResult = await client.request(
    { method: "resources/read", params: { uri: "skill://index.json" } },
    ReadResourceResultSchema,
  );

  const indexText = (indexResult.contents[0] as { text?: string }).text ?? "{}";
  const index = JSON.parse(indexText);

  console.log(`\nFound ${index.skills?.length ?? 0} skills:\n`);
  for (const skill of index.skills ?? []) {
    console.log(`  • ${skill.name}`);
    console.log(`    ${skill.description}`);
    console.log(`    URI: ${skill.url}`);
  }

  // ── 3. List all resources and identify skills ───────────────────────
  // resources/list returns every resource the server exposes, including
  // the index, SKILL.md files, and supporting reference files.
  // Clients filter by the skill:// URI prefix.
  header("Step 2 · List all resources (resources/list)");

  const resourcesResult = await client.request(
    { method: "resources/list" },
    ListResourcesResultSchema,
  );

  const allResources = resourcesResult.resources;
  const skillResources = allResources.filter((r) => r.uri.startsWith("skill://"));

  console.log(`\n${skillResources.length} skill resources found:\n`);
  for (const r of skillResources) {
    const ann = r.annotations as { priority?: number } | undefined;
    const priority = ann?.priority ?? "—";
    console.log(`  ${r.uri}`);
    console.log(`    name: ${r.name}  |  priority: ${priority}`);
  }

  // ── 4. Read a skill's full content ──────────────────────────────────
  // Once the agent decides a skill is relevant (e.g. by matching
  // trigger patterns or user intent), it reads the full SKILL.md.
  header("Step 3 · Read a skill (resources/read)");

  const skillUri = "skill://code-review/SKILL.md";
  console.log(`\nReading: ${skillUri}\n`);

  const skillResult = await client.request(
    { method: "resources/read", params: { uri: skillUri } },
    ReadResourceResultSchema,
  );

  const skillContent = (skillResult.contents[0] as { text?: string }).text ?? "";
  // Show first 20 lines as a preview
  const preview = skillContent.split("\n").slice(0, 20).join("\n");
  console.log(preview);
  console.log(`\n  ... (${skillContent.split("\n").length} total lines)`);

  // ── 5. Read a supporting reference file ─────────────────────────────
  // Skills can link to supporting files using relative paths or full
  // skill:// URIs.  The client reads them on demand (progressive disclosure).
  header("Step 4 · Read a supporting file (progressive disclosure)");

  const refUri = "skill://code-review/references/security-checklist.md";
  console.log(`\nReading: ${refUri}\n`);

  const refResult = await client.request(
    { method: "resources/read", params: { uri: refUri } },
    ReadResourceResultSchema,
  );

  const refContent = (refResult.contents[0] as { text?: string }).text ?? "";
  const refPreview = refContent.split("\n").slice(0, 15).join("\n");
  console.log(refPreview);
  console.log(`\n  ... (${refContent.split("\n").length} total lines)`);

  // ── 6. List tools that skills reference ─────────────────────────────
  // Skills reference tools by name in their instructions.  The agent can
  // verify those tools are available before executing a skill.
  header("Step 5 · List tools (tools/list)");

  const toolsResult = await client.request(
    { method: "tools/list" },
    ListToolsResultSchema,
  );

  console.log(`\n${toolsResult.tools.length} tools available:\n`);
  for (const tool of toolsResult.tools) {
    console.log(`  🔧 ${tool.name}`);
    console.log(`     ${tool.description}\n`);
  }

  // ── Done ────────────────────────────────────────────────────────────
  header("Demo complete");
  console.log("\nThe client discovered skills, read their content, and verified");
  console.log("tool availability — all through standard MCP primitives.\n");

  await transport.close();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
