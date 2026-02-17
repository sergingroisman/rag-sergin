import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/huggingface_transformers";
import { ChatDeepSeek } from "@langchain/deepseek";
import { config } from "../config.js";

// Embeddings - HuggingFace local (384 dimensões, 100% offline)
// Modelo: Xenova/bge-small-en-v1.5 (~133MB, download automático na primeira execução)
export const embeddings = new HuggingFaceTransformersEmbeddings({
	model: "Xenova/bge-small-en-v1.5",
});

// LLM - DeepSeek (95% mais barato que Gemini, cache 90% desconto)
export const llm = new ChatDeepSeek({
	apiKey: config.deepseek.apiKey,
	model: "deepseek-chat",
	temperature: 0, // Respostas mais determinísticas
	maxRetries: 2,
});
