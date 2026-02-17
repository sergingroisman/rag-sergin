import { processDocument } from "./services/document.js";
import { initQdrantCollection } from "./services/qdrant.js";
import path from "node:path";

// Processa apenas os primeiros 20 chunks para teste rápido
async function main() {
  console.log("Processamento rápido (20 chunks apenas)...\n");

  await initQdrantCollection();

  const fileName = "Arquitetura-Limpa.pdf";
  const pdfPath = path.resolve(__dirname, "./uploads/Arquitetura-Limpa.pdf");

  // Importa e modifica temporariamente para limitar chunks
  const { RecursiveCharacterTextSplitter } = await import("@langchain/textsplitters");
  const { DocumentLoaderFactory } = await import("./loaders/index.js");
  const { HuggingFaceTransformersEmbeddings } = await import("@langchain/community/embeddings/huggingface_transformers");
  const { config } = await import("./config.js");
  const { qdrantClient } = await import("./services/qdrant.js");
  const { v4: uuidv4 } = await import("uuid");

  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const embeddings = new HuggingFaceTransformersEmbeddings({
    model: "Xenova/bge-small-en-v1.5",
  });

  const loader = DocumentLoaderFactory.createLoaderFromFileName(fileName);
  const documents = await loader.load(pdfPath);
  const chunks = await textSplitter.splitDocuments(documents);

  // LIMITA a 20 chunks
  const limitedChunks = chunks.slice(0, 20);
  console.log(`Processando ${limitedChunks.length} chunks...\n`);

  const documentId = uuidv4();
  const texts = limitedChunks.map(c => c.pageContent);

  // Gera embeddings locais (sem rate limits)
  console.log("Gerando embeddings localmente...");
  const embeddingsVectors = await embeddings.embedDocuments(texts);
  console.log(`✅ ${embeddingsVectors.length} embeddings gerados!`);

  const data = limitedChunks.map((chunk, index) => ({
    id: uuidv4(),
    vector: embeddingsVectors[index],
    payload: {
      text: chunk.pageContent,
      documentId,
      chunkIndex: index,
      fileName,
    },
  }));

  await qdrantClient.upsert(config.qdrant.collectionName, {
    points: data,
    wait: true,
  });

  console.log(`\n✅ ${limitedChunks.length} chunks vetorizados!\n`);
}

main();
