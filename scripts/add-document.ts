#!/usr/bin/env tsx
/**
 * Script para adicionar e processar documentos no Qdrant
 *
 * Uso:
 *   npm run add-doc caminho/para/documento.pdf
 *   npm run add-doc caminho/para/livro.epub
 *   npm run add-doc caminho/para/dados.csv
 */

import path from "node:path";
import fs from "node:fs";
import { processDocument } from "../src/services/document.js";
import { initQdrantCollection } from "../src/services/qdrant.js";

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error(`
❌ Uso incorreto!

Exemplos:
  npm run add-doc ./uploads/meu-livro.pdf
  npm run add-doc ./uploads/artigo.epub
  npm run add-doc ./uploads/dados.csv

Ou usando tsx diretamente:
  npx tsx scripts/add-document.ts ./uploads/arquivo.pdf
    `);
    process.exit(1);
  }

  const filePath = path.resolve(args[0] as string);
  const fileName = path.basename(filePath);

  // Validar se arquivo existe
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Arquivo não encontrado: ${filePath}`);
    process.exit(1);
  }

  // Validar extensão
  const validExtensions = [".pdf", ".epub", ".csv"];
  const ext = path.extname(fileName).toLowerCase();
  if (!validExtensions.includes(ext)) {
    console.error(`❌ Formato não suportado: ${ext}`);
    console.error(`Formatos aceitos: ${validExtensions.join(", ")}`);
    process.exit(1);
  }

  console.log(`\n🚀 Processando documento...`);
  console.log(`📄 Arquivo: ${fileName}`);
  console.log(`📁 Caminho: ${filePath}\n`);

  try {
    // Inicializar coleção Qdrant
    await initQdrantCollection();

    const startTime = Date.now();

    // Processar documento
    const result = await processDocument({
      fileName,
      filePath,
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n✅ Documento processado com sucesso!`);
    console.log(`📝 ID do Documento: ${result.documentId}`);
    console.log(`📊 Chunks criados: ${result.chunksCount}`);
    console.log(`⏱️  Tempo: ${duration}s\n`);
  } catch (error) {
    console.error(`\n❌ Erro ao processar documento:`, error);
    process.exit(1);
  }
}

main();
