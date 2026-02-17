/**
 * Configuration for the MCP server
 *
 * CRITICAL: All logging in this MCP server MUST use stderr (console.error)
 *
 * Why?
 * The MCP server communicates with Claude Code using stdio transport over JSON-RPC.
 * This means:
 * - stdin: Receives JSON-RPC requests from Claude Code
 * - stdout: Sends JSON-RPC responses back to Claude Code
 * - stderr: Used for logging (doesn't interfere with the protocol)
 *
 * If we use console.log() anywhere, it writes to stdout and corrupts the JSON-RPC
 * messages, causing the protocol to break. ALWAYS use console.error() for logging.
 *
 * The MCP server acts as an HTTP client to the RAG Express server:
 * Claude Code <--(JSON-RPC via stdio)--> MCP Server <--(HTTP)--> RAG Server
 */

/**
 * Configuration interface
 */
export interface Config {
	ragServer: {
		/** Base URL of the RAG Express server (default: http://localhost:3000) */
		url: string;
		/** HTTP request timeout in milliseconds (30 seconds) */
		timeout: number;
		/** API endpoint paths */
		endpoints: {
			/** RAG query endpoint (POST /rag) */
			rag: string;
			/** Health check endpoint (GET /health) */
			health: string;
		};
	};
	logging: {
		/** Logging level */
		level: "info" | "debug" | "error";
		/** Always true - logs must go to stderr to avoid corrupting stdio transport */
		toStderr: boolean;
	};
}

/**
 * Default configuration
 * Environment variables can override these defaults:
 * - MCP_RAG_SERVER_URL: Override the RAG server URL
 * - MCP_LOG_LEVEL: Override the logging level
 */
export const config: Config = {
	ragServer: {
		url: process.env.MCP_RAG_SERVER_URL || "http://localhost:3000",
		timeout: 30000,
		endpoints: {
			rag: "/rag",
			health: "/health",
		},
	},
	logging: {
		level: (process.env.MCP_LOG_LEVEL as Config["logging"]["level"]) || "info",
		toStderr: true, // ALWAYS true - never change this
	},
};

/**
 * Simple logger that respects the stderr requirement
 */
export const logger = {
	info: (...args: unknown[]) => {
		if (config.logging.level === "info" || config.logging.level === "debug") {
			console.error("[MCP INFO]", ...args);
		}
	},
	debug: (...args: unknown[]) => {
		if (config.logging.level === "debug") {
			console.error("[MCP DEBUG]", ...args);
		}
	},
	error: (...args: unknown[]) => {
		console.error("[MCP ERROR]", ...args);
	},
};
