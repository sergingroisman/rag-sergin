/**
 * query_rag Tool Implementation
 *
 * This tool connects Claude Code to the RAG (Retrieval-Augmented Generation) system.
 *
 * HIGH-LEVEL FLOW:
 * 1. Claude Code calls the query_rag MCP tool with a question
 * 2. This MCP server validates the input and makes an HTTP POST to the RAG server
 * 3. The RAG server:
 *    - Embeds the question using a sentence transformer model
 *    - Searches QDrant vector database for similar document chunks
 *    - Sends the question + retrieved context to DeepSeek LLM
 *    - Returns the LLM's answer with source citations
 * 4. This MCP server formats the response for Claude Code to read
 * 5. Claude Code incorporates the RAG answer into its response to the user
 *
 * EXAMPLE USAGE IN CLAUDE CODE:
 * User: "What is the Repository Pattern?"
 * Claude Code internally calls: query_rag({ question: "What is the Repository Pattern?", topK: 3 })
 * This server returns: formatted answer with sources
 * Claude Code shows the answer to the user
 */

import axios from "axios";
import { config, logger } from "../config.js";
import {
	type QueryRagInput,
	type RAGApiResponse,
	type RAGResponse,
	queryRagSchema,
} from "../types.js";

/**
 * Execute a RAG query by calling the RAG Express server
 *
 * This function is the core of the query_rag tool. It:
 * 1. Validates the input using Zod schema
 * 2. Makes an HTTP POST request to the RAG server's /rag endpoint
 * 3. Returns the RAG response with answer and sources
 *
 * @param args - Raw arguments from Claude Code (must contain question, optional topK)
 * @returns RAGResponse with answer, sources, and token usage
 * @throws Error if validation fails, server is unreachable, or request fails
 */
export async function executeQueryRag(args: unknown): Promise<RAGResponse> {
	logger.debug("executeQueryRag called with args:", args);

	// Step 1: Validate input using Zod schema
	// This ensures type safety and provides clear error messages
	let validatedInput: QueryRagInput;
	try {
		validatedInput = queryRagSchema.parse(args);
	} catch (error) {
		logger.error("Input validation failed:", error);
		throw new Error(
			`Invalid input: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}

	const { question, topK } = validatedInput;

	// Step 2: Make HTTP request to RAG server
	const url = `${config.ragServer.url}${config.ragServer.endpoints.rag}`;
	logger.info(`Querying RAG server at ${url} with question: "${question}"`);

	try {
		const response = await axios.post<RAGApiResponse>(
			url,
			{ question, topK },
			{
				timeout: config.ragServer.timeout,
				headers: { "Content-Type": "application/json" },
			},
		);

		// Step 3: Extract RAG response from the wrapper
		// The RAG server returns { success: boolean, data: RAGResponse }
		if (!response.data.success) {
			throw new Error("RAG server returned success=false");
		}

		const ragResponse = response.data.data;
		logger.info(
			`RAG query successful. Answer length: ${ragResponse.answer.length} chars, Sources: ${ragResponse.sources.length}`,
		);

		return ragResponse;
	} catch (error) {
		// Step 4: Provide user-friendly error messages
		logger.error("Error querying RAG server:", error);

		if (axios.isAxiosError(error)) {
			// Connection refused - server is not running
			if (error.code === "ECONNREFUSED") {
				throw new Error(
					`Cannot connect to RAG server at ${config.ragServer.url}. ` +
						`Make sure the server is running with 'npm run dev' in the rag-sergin directory.`,
				);
			}

			// Timeout - server is slow or unresponsive
			if (error.code === "ETIMEDOUT" || error.code === "ECONNABORTED") {
				throw new Error(
					`RAG server request timed out after ${config.ragServer.timeout}ms. ` +
						`The query might be too complex or the server is overloaded.`,
				);
			}

			// Server returned an error response
			if (error.response) {
				throw new Error(
					`RAG server error (${error.response.status}): ${
						error.response.data?.message || error.response.statusText
					}`,
				);
			}
		}

		// Generic error
		throw new Error(
			`Failed to query RAG server: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

/**
 * Format the RAG response for Claude Code to read
 *
 * This function converts the structured RAG response into a human-readable
 * text format that Claude Code can parse and present to the user.
 *
 * WHY FORMAT AS TEXT?
 * MCP tools return content blocks with text type. Claude Code reads this text
 * and can extract information from it. By formatting the sources clearly, we
 * make it easy for Claude to cite them in its response to the user.
 *
 * @param response - The RAG response from the server
 * @returns Formatted string with answer and sources
 */
export function formatRagResponse(response: RAGResponse): string {
	const parts: string[] = [];

	// Add the answer
	parts.push("## Answer");
	parts.push(response.answer);
	parts.push("");

	// Add sources if available
	if (response.sources.length > 0) {
		parts.push("## Sources");
		response.sources.forEach((source, index) => {
			parts.push(
				`${index + 1}. ${source.fileName} (chunk ${source.chunkIndex}, relevance: ${(source.score * 100).toFixed(1)}%)`,
			);
		});
		parts.push("");
	}

	// Add token usage if available
	if (response.tokensUsed !== undefined) {
		parts.push(`*Tokens used: ${response.tokensUsed}*`);
	}

	return parts.join("\n");
}
