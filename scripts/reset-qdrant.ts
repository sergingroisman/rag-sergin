import { qdrantClient } from "../src/services/qdrant.js";
import { config } from "../src/config.js";

async function resetQdrant() {
	try {
		const collectionName = config.qdrant.collectionName;

		console.log(`🗑️  Deletando coleção '${collectionName}'...`);
		await qdrantClient.deleteCollection(collectionName);
		console.log(`✅ Coleção '${collectionName}' deletada com sucesso!`);
		console.log(`\n💡 Reinicie o servidor com 'npm run dev' para recriar a coleção com as dimensões corretas (384).`);
	} catch (error) {
		console.error("❌ Erro ao deletar coleção:", error);
		process.exit(1);
	}
}

resetQdrant();
