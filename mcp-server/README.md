# RAG-Sergin MCP Server

This is a Model Context Protocol (MCP) server that exposes the rag-sergin RAG (Retrieval-Augmented Generation) system to Claude Code.

## What is MCP?

**Model Context Protocol (MCP)** is an open protocol that standardizes how AI assistants connect to external data sources and tools. Think of it as a bridge that allows Claude Code to query your RAG system, databases, APIs, or any other external service.

### Architecture

```
┌─────────────────┐
│   Claude Code   │  (MCP Client)
│   (User IDE)    │
└────────┬────────┘
         │ JSON-RPC via stdio
         │ (stdin/stdout)
         ▼
┌─────────────────┐
│   MCP Server    │  (This code)
│  (Node.js)      │
└────────┬────────┘
         │ HTTP (axios)
         ▼
┌─────────────────┐
│   RAG Server    │  (Express.js at localhost:3000)
│   (QDrant +     │
│    DeepSeek)    │
└─────────────────┘
```

**Flow Example:**
1. User asks Claude Code: "What is the Repository Pattern?"
2. Claude Code calls the `query_rag` MCP tool
3. MCP Server makes HTTP POST to `http://localhost:3000/rag`
4. RAG Server:
   - Embeds the question
   - Queries QDrant vector database
   - Sends context to DeepSeek LLM
   - Returns answer with sources
5. MCP Server formats the response
6. Claude Code shows the answer to the user

## Available Tools

### 1. `query_rag`

Query the RAG system to retrieve information about design patterns, clean architecture, and best practices.

**Inputs:**
- `question` (string, required, 1-500 chars): The question to ask
- `topK` (number, optional, 1-10, default: 3): Number of chunks to retrieve

**Example:**
```typescript
{
  "question": "What is the Repository Pattern?",
  "topK": 5
}
```

**Output:**
```
## Answer
The Repository Pattern is a design pattern that...

## Sources
1. clean-architecture.pdf (chunk 42, relevance: 92.3%)
2. design-patterns.pdf (chunk 15, relevance: 87.1%)
3. best-practices.pdf (chunk 8, relevance: 81.5%)

*Tokens used: 1247*
```

### 2. `check_rag_health`

Check if the RAG server is running and accessible.

**Inputs:** None

**Output:**
```
## RAG Server Health Check

**Status:** ✓ Healthy
**Server URL:** http://localhost:3000

RAG server is running and accessible at http://localhost:3000
```

## Setup Instructions

### Prerequisites

1. **RAG server must be running** at `http://localhost:3000`
   ```bash
   cd /Users/avanade/Workspace/rag-sergin
   npm run dev
   ```

2. **Node.js v24.13.1 or higher** (matches parent project)

### Installation

```bash
# Navigate to the MCP server directory
cd /Users/avanade/Workspace/rag-sergin/mcp-server

# Install dependencies
npm install

# Build the TypeScript code
npm run build

# Verify the build
ls dist/index.js  # Should exist
```

### Configuration in Claude Code

Edit your Claude Code configuration file to add this MCP server:

**Location:** `~/.claude.json` or `~/.claude/mcp_settings.json`

```json
{
  "mcpServers": {
    "rag-sergin": {
      "type": "stdio",
      "command": "node",
      "args": [
        "/Users/avanade/Workspace/rag-sergin/mcp-server/dist/index.js"
      ],
      "env": {
        "MCP_RAG_SERVER_URL": "http://localhost:3000"
      }
    }
  }
}
```

**IMPORTANT:** Update the path in `args` to match your actual absolute path.

After editing the config:
1. Save the file
2. **Restart Claude Code** for changes to take effect

## Testing

### Test 1: Build and Inspect Locally

The MCP Inspector is a web-based tool for testing MCP servers locally before integrating with Claude Code.

```bash
# Start the inspector (builds automatically if needed)
npm run inspect
```

This opens a web UI where you can:
- See all available tools
- Test tool calls with sample inputs
- View responses in real-time
- Debug errors without Claude Code

**Try these tests:**
1. Call `query_rag` with question: "What is clean architecture?"
2. Call `check_rag_health` with no inputs
3. Test error handling with invalid inputs (e.g., empty question)

### Test 2: Integration with Claude Code

After configuring Claude Code and restarting:

**Test health check:**
```
In Claude Code: "Use check_rag_health to verify the RAG server"
```
Expected: Returns healthy status

**Test basic query:**
```
In Claude Code: "Use query_rag to ask: What is the RAG architecture?"
```
Expected: Returns answer with sources

**Test error handling:**
1. Stop RAG server (Ctrl+C)
2. In Claude Code: "Use query_rag to ask about design patterns"
Expected: Clear error message about server not running

### Test 3: Real Workflow

1. Open a TypeScript file in Claude Code
2. Ask: "Check the RAG for best practices about error handling in Express"
3. Claude should automatically use `query_rag` and incorporate the answer
4. Ask follow-up questions to verify context retention

## Troubleshooting

### "Cannot connect to RAG server"

**Symptoms:**
- Error: "Cannot connect to RAG server at http://localhost:3000"

**Solutions:**
1. Start the RAG server:
   ```bash
   cd /Users/avanade/Workspace/rag-sergin
   npm run dev
   ```
2. Verify it's running:
   ```bash
   curl http://localhost:3000/health
   # Should return: OK
   ```
3. Check the URL in config matches (default: http://localhost:3000)

### "Tool not appearing in Claude Code"

**Symptoms:**
- Claude doesn't offer the `query_rag` or `check_rag_health` tools

**Solutions:**
1. Verify the MCP server is built:
   ```bash
   ls /Users/avanade/Workspace/rag-sergin/mcp-server/dist/index.js
   ```
2. Check Claude Code config file syntax (must be valid JSON)
3. **Restart Claude Code** after config changes
4. Check Claude Code logs for MCP connection errors

### "JSON-RPC protocol errors"

**Symptoms:**
- Claude Code shows protocol errors or garbled responses
- Tools fail unexpectedly

**Solutions:**
1. Check if you accidentally used `console.log()` anywhere (NEVER do this)
2. All logging must use `console.error()` (stderr)
3. Rebuild the MCP server:
   ```bash
   npm run build
   ```
4. Restart Claude Code

### "Timeout errors"

**Symptoms:**
- "RAG server request timed out after 30000ms"

**Solutions:**
1. Check if RAG server is slow (large documents, slow LLM)
2. Increase timeout in `src/config.ts`:
   ```typescript
   timeout: 60000, // 60 seconds
   ```
3. Reduce `topK` in queries (fewer chunks = faster)
4. Check QDrant and DeepSeek API availability

## Configuration Options

### Environment Variables

Set these in the Claude Code config or shell:

- `MCP_RAG_SERVER_URL`: RAG server URL (default: `http://localhost:3000`)
- `MCP_LOG_LEVEL`: Logging level - `info`, `debug`, or `error` (default: `info`)

Example in Claude Code config:
```json
{
  "mcpServers": {
    "rag-sergin": {
      "env": {
        "MCP_RAG_SERVER_URL": "http://localhost:3000",
        "MCP_LOG_LEVEL": "debug"
      }
    }
  }
}
```

### Logging

Logs are written to **stderr** (not stdout to avoid corrupting JSON-RPC).

To view logs when running with Claude Code:
```bash
# Claude Code might redirect stderr to a log file
# Check Claude Code documentation for log locations
```

When using MCP Inspector, logs appear in the terminal.

## Development

### Watch Mode

Rebuild automatically on file changes:
```bash
npm run dev
```

Then restart the MCP Inspector or Claude Code to test changes.

### Project Structure

```
mcp-server/
├── src/
│   ├── index.ts            # Main MCP server (stdio transport, request handlers)
│   ├── config.ts           # Configuration and logging
│   ├── types.ts            # Type definitions and Zod schemas
│   └── tools/
│       ├── query-rag.ts    # query_rag tool implementation
│       └── health-check.ts # check_rag_health tool implementation
├── dist/                   # Compiled JavaScript (created by build)
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
└── README.md               # This file
```

### Adding New Tools

To add a new MCP tool:

1. Create implementation in `src/tools/new-tool.ts`:
   ```typescript
   export async function executeNewTool(args: unknown): Promise<Result> {
     // Validate input with Zod
     // Make HTTP request to RAG server or other service
     // Return result
   }
   ```

2. Add to `src/index.ts`:
   - Add tool to `ListToolsRequestSchema` handler
   - Add case to `CallToolRequestSchema` handler

3. Rebuild and test:
   ```bash
   npm run build
   npm run inspect
   ```

## Future Enhancements

Potential features not yet implemented:

- **Streaming support**: Use `/rag/stream` endpoint for real-time responses
- **Collection selection**: Allow choosing between document collections
- **Document management**: Tools to upload/delete documents
- **MCP resources**: Expose documents as MCP resources (not just tools)
- **Prompt templates**: Pre-configured prompts for common queries
- **Caching**: Cache frequent queries for faster responses

## References

- [MCP Documentation](https://modelcontextprotocol.io/)
- [MCP SDK](https://github.com/modelcontextprotocol/sdk)
- [Claude Code MCP Guide](https://docs.anthropic.com/claude/docs/mcp)
- [RAG Server README](../README.md)
