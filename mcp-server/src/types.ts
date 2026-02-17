/**
 * Type definitions and validation schemas for the MCP server
 *
 * This file mirrors the types from the main RAG server (/src/types.ts) and adds
 * Zod schemas for runtime validation of inputs from Claude Code.
 *
 * Why Zod schemas?
 * - MCP tools receive arguments as arbitrary objects from Claude Code
 * - We need to validate inputs at runtime to ensure type safety
 * - Zod provides clear error messages when validation fails
 */

import { z } from "zod";

/**
 * Zod schema for validating query_rag tool inputs
 * Matches the querySchema from the main RAG server (/src/schemas/index.ts:4-22)
 */
export const queryRagSchema = z.object({
	question: z
		.string({
			required_error: "Question is required",
			invalid_type_error: "Question must be a string",
		})
		.min(1, "Question cannot be empty")
		.max(500, "Question cannot exceed 500 characters")
		.trim(),
	topK: z
		.number({
			invalid_type_error: "topK must be a number",
		})
		.int("topK must be an integer")
		.min(1, "topK must be at least 1")
		.max(10, "topK cannot exceed 10")
		.optional()
		.default(3),
});

export type QueryRagInput = z.infer<typeof queryRagSchema>;

/**
 * RAG source information (mirrors /src/types.ts:45-49)
 */
export interface RAGSource {
	fileName: string;
	chunkIndex: number;
	score: number;
}

/**
 * RAG response structure (mirrors /src/types.ts:42-51)
 * This is what the RAG server returns from the POST /rag endpoint
 */
export interface RAGResponse {
	question: string;
	answer: string;
	sources: RAGSource[];
	tokensUsed?: number;
}

/**
 * Wrapper for the RAG API response
 * The RAG server wraps the RAGResponse in { success, data }
 */
export interface RAGApiResponse {
	success: boolean;
	data: RAGResponse;
}

/**
 * Health check response from the RAG server
 */
export interface HealthCheckResponse {
	status: "healthy" | "unhealthy";
	serverUrl: string;
	message: string;
}
