/**
 * check_rag_health Tool Implementation
 *
 * This tool verifies that the RAG Express server is running and accessible.
 *
 * PURPOSE:
 * - Helps users debug connection issues between MCP server and RAG server
 * - Provides quick status check without making a full RAG query
 * - Useful for initial setup verification
 *
 * EXAMPLE USAGE IN CLAUDE CODE:
 * User: "Is the RAG server running?"
 * Claude Code calls: check_rag_health()
 * This server returns: { status: "healthy", serverUrl: "http://localhost:3000", message: "..." }
 */

import axios from "axios";
import { config, logger } from "../config.js";
import type { HealthCheckResponse } from "../types.js";

/**
 * Check if the RAG server is healthy and accessible
 *
 * This function makes a GET request to the /health endpoint of the RAG server.
 * The health endpoint is a simple route that returns "OK" if the server is running.
 *
 * @returns HealthCheckResponse with status and details
 */
export async function executeHealthCheck(): Promise<HealthCheckResponse> {
	const url = `${config.ragServer.url}${config.ragServer.endpoints.health}`;
	logger.info(`Checking RAG server health at ${url}`);

	try {
		const response = await axios.get(url, {
			timeout: 5000, // Shorter timeout for health checks
			validateStatus: (status) => status < 500, // Accept 2xx, 3xx, 4xx
		});

		// Check if response is OK (status 200)
		if (response.status === 200) {
			logger.info("RAG server is healthy");
			return {
				status: "healthy",
				serverUrl: config.ragServer.url,
				message: `RAG server is running and accessible at ${config.ragServer.url}`,
			};
		}

		// Server responded but with unexpected status
		logger.error(`RAG server returned unexpected status: ${response.status}`);
		return {
			status: "unhealthy",
			serverUrl: config.ragServer.url,
			message: `RAG server responded with status ${response.status}. Expected 200.`,
		};
	} catch (error) {
		logger.error("Health check failed:", error);

		// Provide specific error messages based on the error type
		if (axios.isAxiosError(error)) {
			if (error.code === "ECONNREFUSED") {
				return {
					status: "unhealthy",
					serverUrl: config.ragServer.url,
					message:
						`Cannot connect to RAG server at ${config.ragServer.url}. ` +
						`Make sure it is running with 'npm run dev' in the rag-sergin directory.`,
				};
			}

			if (error.code === "ETIMEDOUT" || error.code === "ECONNABORTED") {
				return {
					status: "unhealthy",
					serverUrl: config.ragServer.url,
					message: `RAG server health check timed out. The server might be unresponsive.`,
				};
			}
		}

		// Generic error
		return {
			status: "unhealthy",
			serverUrl: config.ragServer.url,
			message: `Health check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
		};
	}
}

/**
 * Format the health check response for Claude Code to read
 *
 * @param response - The health check response
 * @returns Formatted string with status and message
 */
export function formatHealthCheckResponse(response: HealthCheckResponse): string {
	const parts: string[] = [];

	parts.push(`## RAG Server Health Check`);
	parts.push("");
	parts.push(`**Status:** ${response.status === "healthy" ? "✓ Healthy" : "✗ Unhealthy"}`);
	parts.push(`**Server URL:** ${response.serverUrl}`);
	parts.push("");
	parts.push(response.message);

	return parts.join("\n");
}
