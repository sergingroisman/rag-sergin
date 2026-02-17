import { queryRAG } from "./services/rag.js";
import { QueryRequest } from "./types.js";

/**
 * Script de demonstração do serviço RAG
 * Uso: tsx src/query.ts
 */
async function demo() {
  const request: QueryRequest = {
    question: "Qual é a diferença entre uma type e uma interface no TypeScript?",
    topK: 3,
  };

  console.log(`\n🔍 Pergunta: ${request.question}\n`);
  console.log(`⏳ Buscando documentos e gerando resposta com Claude...\n`);

  const response = await queryRAG(request);

  console.log(`📚 Fontes encontradas (${response.sources.length}):\n`);
  response.sources.forEach((source: any, i: number) => {
    console.log(
      `${i + 1}. ${source.metadata.fileName} ` +
      `(página ${source.metadata.page || "N/A"}, ` +
      `chunk ${source.metadata.chunkIndex}, ` +
      `score: ${source.score.toFixed(3)})`
    );
  });

  console.log(`\n💬 Resposta:\n${response.answer}\n`);
}

demo().catch(console.error);
