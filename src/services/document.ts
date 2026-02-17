import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { v4 as uuidv4 } from "uuid";

import { config } from "../config.js";
import { DocumentLoaderFactory } from "../loaders/index.js";

import { qdrantClient } from "./qdrant.js";
import { embeddings } from "./providers.js";

interface UploadResponse {
  success: boolean;
  documentId: string;
  chunksCount: number;
  message?: string;
}

type DocumentDto = {
  fileName: string;
  filePath: string;
  fileSize?: number;
}

// Configuração do TextSplitter para dividir o texto em chunks menores
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000, // Tamanho máximo de cada chunk (ajuste conforme necessário)
  chunkOverlap: 200, // Sobreposição entre chunks para manter contexto (ajuste conforme necessário)
});

export async function processDocument({
  fileName,
  filePath,
  fileSize,
}: DocumentDto): Promise<UploadResponse> {
  // 0. Verifica conexão com Qdrant antes de processar
  try {
    await qdrantClient.getCollections();
    console.log("✅ Conexão com Qdrant OK");
  } catch (error) {
    throw new Error(`❌ Falha ao conectar com Qdrant: ${error}`);
  }

  // 1. Carregamento do documento PDF/EPUB usando loader apropriado
  const loader = DocumentLoaderFactory.createLoaderFromFileName(fileName);
  const documents = await loader.load(filePath);

  if (documents.length === 0) {
    throw new Error("Nenhum documento encontrado no arquivo carregado.");
  }

  // 2. Divisão do texto do documento em chunks (partes menores)
  const chunks = await textSplitter.splitDocuments(documents);

  if (chunks.length === 0) {
    throw new Error("Nenhum chunk gerado a partir do documento.");
  }

  // 3. Adiciona metadados e informações de contexto a cada chunk
  const documentId = uuidv4();

  // Filtra chunks vazios ou muito pequenos antes de processar
  const validChunks = chunks.filter((chunk) => {
    const text = chunk.pageContent.trim();
    return text.length >= 10; // Mínimo de 10 caracteres
  });

  if (validChunks.length === 0) {
    throw new Error("Nenhum chunk válido após filtrar conteúdo vazio.");
  }

  console.log(`Processando ${validChunks.length} chunks válidos (${chunks.length - validChunks.length} chunks vazios removidos)`);

  const documentsChunksWithMetadata = validChunks.map((chunk, index) => ({
    id: uuidv4(),
    text: chunk.pageContent.trim(),
    metadata: {
      documentId,
      chunkIndex: index,
      fileName,
      uploadAt: new Date().toISOString(),
      page: chunk.metadata.loc?.pageNumber,
    },
  }));

  // 4. Geração de embeddings para cada chunk usando o modelo de embedding escolhido
  const texts = documentsChunksWithMetadata.map((doc) => doc.text);
  console.log(`Gerando embeddings para ${texts.length} chunks...`);

  // Processa embeddings em batches para evitar consumir muita memória
  const EMBEDDING_BATCH_SIZE = 50;
  const embeddingsVectors: number[][] = [];
  const totalEmbeddingBatches = Math.ceil(texts.length / EMBEDDING_BATCH_SIZE);

  for (let i = 0; i < texts.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBEDDING_BATCH_SIZE);
    const batchNumber = Math.floor(i / EMBEDDING_BATCH_SIZE) + 1;

    console.log(`  🧠 Gerando batch ${batchNumber}/${totalEmbeddingBatches} (${batch.length} chunks)...`);

    const batchEmbeddings = await embeddings.embedDocuments(batch);
    embeddingsVectors.push(...batchEmbeddings);

    console.log(`  ✅ Batch ${batchNumber}/${totalEmbeddingBatches} concluído`);
  }

  console.log(`✅ Gerados ${embeddingsVectors.length} embeddings (dim=${embeddingsVectors[0]?.length || 0})`);

  // 5. Armazenamento dos chunks e embeddings no banco de dados vetorial (Qdrant)
  const EXPECTED_DIMENSION = 384;
  const validData = documentsChunksWithMetadata
    .map((chunk, index) => {
      const vector = embeddingsVectors[index];

      // Valida se o vetor existe, é um array e tem a dimensão correta
      if (!vector || !Array.isArray(vector) || vector.length !== EXPECTED_DIMENSION) {
        console.warn(`⚠️ Chunk ${index} ignorado: vetor com dimensão ${vector?.length || 0} (esperado: ${EXPECTED_DIMENSION})`);
        return null;
      }

      return {
        id: chunk.id,
        vector,
        payload: {
          text: chunk.text,
          ...chunk.metadata,
        },
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (validData.length === 0) {
    throw new Error("Nenhum vetor válido gerado após validação de dimensões.");
  }

  console.log(`✅ ${validData.length} vetores válidos prontos para inserção (${documentsChunksWithMetadata.length - validData.length} ignorados)`);

  const data = validData;

  // Divide em batches para evitar timeout e payload muito grande
  const BATCH_SIZE = 50;
  const totalBatches = Math.ceil(data.length / BATCH_SIZE);

  console.log(`📦 Inserindo ${data.length} vetores em ${totalBatches} batches de ${BATCH_SIZE}...`);

  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

    console.log(`  ⏳ Batch ${batchNumber}/${totalBatches} (${batch.length} vetores)...`);

    // Retry com backoff exponencial em caso de erro
    let retries = 3;
    let delay = 1000; // 1 segundo inicial

    while (retries > 0) {
      try {
        await qdrantClient.upsert(config.qdrant.collectionName, {
          points: batch,
          wait: true,
        });

        console.log(`  ✅ Batch ${batchNumber}/${totalBatches} inserido`);
        break; // Sucesso, sai do loop
      } catch (error) {
        retries--;
        if (retries === 0) {
          throw error; // Última tentativa falhou, propaga o erro
        }

        console.warn(`  ⚠️ Erro no batch ${batchNumber}. Tentando novamente em ${delay}ms... (${retries} tentativas restantes)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Backoff exponencial
      }
    }
  }

  console.log(`🎉 Todos os ${data.length} vetores inseridos com sucesso!`);

  // 6. Retorna uma resposta indicando o sucesso do processo e informações relevantes 
  // (como ID do documento, número de chunks, etc.)
  return {
    success: true,
    documentId,
    chunksCount: documentsChunksWithMetadata.length,
    message: "Documento processado com sucesso!",
  } as UploadResponse;
}