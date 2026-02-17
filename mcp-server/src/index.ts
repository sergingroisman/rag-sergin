#!/usr/bin/env node

/**
 * MCP Server for rag-sergin RAG System
 *
 * ============================================================================
 * WHAT IS MCP (Model Context Protocol)?
 * ============================================================================
 *
 * MCP is a protocol that allows AI assistants like Claude Code to connect to
 * external tools and data sources. Think of it as a standardized way for AI
 * to call APIs, query databases, or access any external system.
 *
 * Key concepts:
 * - SERVER: This code (exposes tools to Claude Code)
 * - CLIENT: Claude Code (calls the tools we expose)
 * - TOOLS: Functions that Claude Code can call (like query_rag, check_rag_health)
 * - TRANSPORT: How messages are sent (stdio = stdin/stdout using JSON-RPC)
 *
 * ============================================================================
 * HOW THE STDIO TRANSPORT WORKS
 * ============================================================================
 *
 * Claude Code launches this MCP server as a subprocess and communicates via:
 * - stdin:  Claude sends JSON-RPC requests (tool calls)
 * - stdout: This server sends JSON-RPC responses (tool results)
 * - stderr: This server writes logs (doesn't interfere with JSON-RPC)
 *
 * CRITICAL: NEVER use console.log() in MCP servers! It corrupts the protocol.
 * ALWAYS use console.error() for logging.
 *
 * Example communication flow:
 * 1. Claude Code starts this server: node /path/to/dist/index.js
 * 2. Claude sends (via stdin): {"jsonrpc":"2.0","method":"tools/list","id":1}
 * 3. This server responds (via stdout): {"jsonrpc":"2.0","result":{"tools":[...]}}
 * 4. Claude sends (via stdin): {"jsonrpc":"2.0","method":"tools/call","params":{"name":"query_rag",...}}
 * 5. This server responds (via stdout): {"jsonrpc":"2.0","result":{"content":[...]}}
 *
 * ============================================================================
 * REQUEST/RESPONSE FLOW BETWEEN CLAUDE CODE AND MCP SERVER
 * ============================================================================
 *
 * Typical conversation:
 *
 * USER in Claude Code: "What is the Repository Pattern?"
 *   ↓
 * CLAUDE CODE decides to use the query_rag tool
 *   ↓
 * CLAUDE CODE sends JSON-RPC request via stdin:
 *   { "method": "tools/call", "params": { "name": "query_rag", "arguments": { "question": "..." } } }
 *   ↓
 * THIS MCP SERVER receives the request and:
 *   1. Validates the arguments
 *   2. Calls executeQueryRag() which makes HTTP POST to RAG server
 *   3. RAG server queries QDrant and DeepSeek LLM
 *   4. Formats the response
 *   ↓
 * THIS MCP SERVER sends JSON-RPC response via stdout:
 *   { "result": { "content": [{ "type": "text", "text": "## Answer\n..." }] } }
 *   ↓
 * CLAUDE CODE receives the response and incorporates it into its answer
 *   ↓
 * USER sees Claude's response with RAG-augmented information
 *
 * ============================================================================
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { logger } from "./config.js";
import {
	executeHealthCheck,
	formatHealthCheckResponse,
} from "./tools/health-check.js";
import { executeQueryRag, formatRagResponse } from "./tools/query-rag.js";

/**
 * Create the MCP server instance
 *
 * The Server class from the MCP SDK handles the JSON-RPC protocol automatically.
 * We just need to:
 * 1. Define what tools are available (tools/list handler)
 * 2. Implement what each tool does (tools/call handler)
 */
const server = new Server(
	{
		name: "rag-sergin",
		version: "1.0.0",
	},
	{
		capabilities: {
			// Declare that this server supports tools
			// (MCP also supports "resources" and "prompts", but we only use tools)
			tools: {},
		},
	},
);

/**
 * Handle "tools/list" requests
 *
 * When Claude Code connects to this MCP server, it first asks "what tools do you have?"
 * This handler responds with the list of available tools and their schemas.
 *
 * The inputSchema uses JSON Schema format to describe what arguments each tool accepts.
 * Claude Code uses these schemas to know how to call the tools correctly.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
	logger.info("Received tools/list request");

	return {
		tools: [
			{
				name: "query_rag",
				description:
					"Query the RAG (Retrieval-Augmented Generation) system to retrieve information " +
					"about design patterns, clean architecture, and best practices from indexed documents. " +
					"The system searches through PDFs, EPUBs, and web content to find relevant information " +
					"and generates a comprehensive answer using DeepSeek LLM.",
				inputSchema: {
					type: "object",
					properties: {
						question: {
							type: "string",
							description:
								"The question to ask the RAG system (1-500 characters). " +
								"Be specific and clear. Examples: 'What is the Repository Pattern?', " +
								"'How to implement dependency injection in TypeScript?'",
							minLength: 1,
							maxLength: 500,
						},
						topK: {
							type: "number",
							description:
								"Number of document chunks to retrieve from the vector database (1-10). " +
								"Higher values provide more context but may include less relevant results. " +
								"Default: 3",
							minimum: 1,
							maximum: 10,
							default: 3,
						},
					},
					required: ["question"],
				},
			},
			{
				name: "check_rag_health",
				description:
					"Check if the RAG Express server is running and accessible. " +
					"Useful for debugging connection issues or verifying the setup. " +
					"Returns the server status, URL, and a diagnostic message.",
				inputSchema: {
					type: "object",
					properties: {},
					required: [],
				},
			},
		],
	};
});

/**
 * Handle "tools/call" requests
 *
 * When Claude Code wants to execute a tool, it sends a tools/call request with:
 * - name: The tool name (e.g., "query_rag")
 * - arguments: The tool arguments as an object
 *
 * This handler:
 * 1. Routes to the appropriate tool implementation
 * 2. Executes the tool
 * 3. Returns the result in MCP format (content blocks)
 *
 * MCP responses use "content blocks" which can be:
 * - text: Plain text or markdown
 * - image: Base64-encoded images
 * - resource: References to external resources
 *
 * We use text blocks to return formatted answers that Claude Code can read.
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
	const { name, arguments: args } = request.params;
	logger.info(`Received tools/call request for tool: ${name}`);

	try {
		switch (name) {
			case "query_rag": {
				// Execute the RAG query
				const result = await executeQueryRag(args);

				// Format the response for Claude Code to read
				const formattedText = formatRagResponse(result);

				logger.debug(`Returning RAG response (${formattedText.length} chars)`);

				// Return as MCP content block
				return {
					content: [
						{
							type: "text",
							text: formattedText,
						},
					],
				};
			}

			case "check_rag_health": {
				// Execute the health check
				const result = await executeHealthCheck();

				// Format the response
				const formattedText = formatHealthCheckResponse(result);

				logger.debug(`Returning health check: ${result.status}`);

				// Return as MCP content block
				return {
					content: [
						{
							type: "text",
							text: formattedText,
						},
					],
				};
			}

			default: {
				// Unknown tool name
				throw new Error(`Unknown tool: ${name}`);
			}
		}
	} catch (error) {
		// Handle errors and return them as text content
		// Claude Code will see this error and can inform the user
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error occurred";
		logger.error(`Tool execution failed: ${errorMessage}`);

		return {
			content: [
				{
					type: "text",
					text: `Error: ${errorMessage}`,
				},
			],
			isError: true,
		};
	}
});

/**
 * Start the MCP server with stdio transport
 *
 * This is the main entry point. When Claude Code launches this script, we:
 * 1. Create a stdio transport (reads from stdin, writes to stdout)
 * 2. Connect the server to the transport
 * 3. The server is now running and waiting for JSON-RPC requests
 */
async function main() {
	logger.info("Starting MCP server for rag-sergin");
	logger.info("Server will communicate via stdio (stdin/stdout)");

	try {
		// Create stdio transport
		// This sets up bidirectional communication via stdin/stdout
		const transport = new StdioServerTransport();

		// Connect the server to the transport
		// The server will now listen for JSON-RPC messages on stdin
		await server.connect(transport);

		logger.info("MCP server started successfully");
		logger.info("Waiting for requests from Claude Code...");

		// The server is now running and will process requests until:
		// - Claude Code closes the connection
		// - The process is killed
		// - An unhandled error occurs
	} catch (error) {
		logger.error("Failed to start MCP server:", error);
		process.exit(1);
	}
}

// Start the server
main().catch((error) => {
	logger.error("Unhandled error in main:", error);
	process.exit(1);
});
