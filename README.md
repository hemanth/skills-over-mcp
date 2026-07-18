# skills-over-mcp

Skills over MCP: agent workflows as standard MCP resources with a `skill://` URI scheme.

```bash
npm install
```

## Quick start

```bash
# Start the MCP server (port 3001) and web UI (port 3000)
npm run server &
npm run web
```

Open `http://localhost:3000`, type what you need ("deploy to production", "review this PR"), and the LLM routes you to the right skill. Steps walk you through the workflow with live tool execution.

## How it works

```
Browser → Web Bridge (:3000) → MCP Server (:3001)
              ↕                      ↕
      REST API bridge        StreamableHTTPTransport
              ↕                      ↕
    Cloudflare Workers AI     skill:// resources
    (Llama 4 Scout 17B)       + tools (create_branch, run_tests)
```

`skill://index.json` returns the discovery index. `skill://git-workflow/SKILL.md` returns the full skill. Skills reference tools by name; the UI renders inline tool panels.

## Skills included

```
skills/
├── git-workflow/SKILL.md      # Branching, commits, PRs
├── code-review/SKILL.md       # Structured review + security checklist
│   └── references/security-checklist.md
└── deploy-service/SKILL.md    # Pre-flight → staging → canary → monitoring
```

## Deploy

```bash
npm run deploy
```

Deploys to Cloudflare Workers as a self-contained worker with embedded skill content. Live at `https://skills-over-mcp.h3manth.com`.

## Architecture

- **MCP Server** (`src/server.ts`): Streamable HTTP transport, serves `skill://` resources and tools
- **Web Bridge** (`src/web.ts`): HTTP bridge connecting the browser to the MCP server
- **Worker** (`src/worker.ts`): Cloudflare Worker bundling everything for edge deployment
- **UI** (`public/index.html`): Intent-based runner, AI-powered skill routing via Cloudflare Workers AI

## Timeline

- **2025-12-20** [Skills and MCP, Better Together](https://h3manth.com/scribe/skills-and-mcp-better-together/) blog post
- **2025-12-22** [RFC: Remote Agent Skills](https://github.com/agentskills/agentskills/issues/42), URL-based Skill Import
- **2026-02-01** MCP Interest Group formed; experimental repo created
- **2026-04-14** Initial charter formalized by MCP (via SEP-2149)

## Related

- [SEP-2640: Skills Over MCP](https://github.com/nichochar/skills-over-mcp), the proposal
- [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk), protocol implementation

## License

MIT © [Hemanth.HM](https://h3manth.com)
