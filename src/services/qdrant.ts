import { QdrantClient } from "@qdrant/js-client-rest";
import { config } from "../config.js";

export const qdrantClient = new QdrantClient({
	url: config.qdrant.url,
	timeout: 300000, // 5 minutos de timeout para operações
});

// Cria a coleção no Qdrant se ela não existir
export async function initQdrantCollection() {
	const collectionName = config.qdrant.collectionName;

	// Verificar se a coleção já existe
	const existingCollections = await qdrantClient.getCollections();
	const collectionExists = existingCollections.collections.some(
		(col) => col.name === collectionName
	);

	if (!collectionExists) {
		// Cria a coleção com a configuração de vetor (embedding) e metadados
		await qdrantClient.createCollection(collectionName, {
			vectors: {
				size: 384, // Xenova/bge-small-en-v1.5
				distance: "Cosine",
			},
		});

		console.log(`Coleção '${collectionName}' criada com sucesso no Qdrant.`);
	} else {
		console.log(`Coleção '${collectionName}' já existe no Qdrant.`);
	}
}

/**
 * Garante que uma collection existe com configuração apropriada
 * Cria a collection se não existir
 *
 * @param collectionName - Nome da collection
 * @param vectorSize - Dimensão dos vetores (padrão: 384)
 */
export async function ensureCollection(
	collectionName: string,
	vectorSize: number = 384
): Promise<void> {
	try {
		await qdrantClient.getCollection(collectionName);
		console.log(`✅ Collection "${collectionName}" já existe`);
	} catch {
		console.log(`📦 Criando collection "${collectionName}"...`);
		await qdrantClient.createCollection(collectionName, {
			vectors: {
				size: vectorSize,
				distance: "Cosine",
			},
		});
		console.log(`✅ Collection "${collectionName}" criada`);
	}
}

