# Project: rag-sergin

## Stack
- TypeScript + Express + NodeJS (v24.13.1)
- QDrant :6333 (vector DB, Cosine, 384 dims)
- HuggingFace BGE `Xenova/bge-small-en-v1.5` (local embedding, offline)
- DeepSeek `deepseek-chat` via Langchain (LLM, temp=0)
- MCP Server at `mcp-server/` (stdio JSON-RPC → Claude Code)
- Docker & Docker Compose (run `docker compose up -d` before `npm run dev`)

## Conventions
- Use async/await everywhere
- Max file length: 500 lines
- NEVER use `console.log` in `mcp-server/` — only `console.error` (stderr)
- Embeddings in batches of 50; QDrant upsert in batches of 50 with 3x retry

## Before ANY task
1. Enter Plan Mode (Shift+Tab 2x)
2. Check PROGRESS.json for context
3. Search similar patterns: rg "function.*Task" --type ts
4. If you are lost, ask: "Can I solve with existing code patterns?"

## Before coding
1. Visual architecture: `docs/architecture.excalidraw`
2. Flow: upload→embed→QDrant | question→embed→search→chunks→DeepSeek→RAGResponse
3. Use `git log -p <file>` to understand history

## Context Management
When context > 50%:
- Summarize progress to `PROGRESS.json`
- Start new session referencing JSON
When context > 80%:
- FORCE new session immediately
Never paste full DB dumps — use schema only

## Data/File Handling Rules
- NEVER load entire files > 1000 lines
- Use head/tail/grep to inspect