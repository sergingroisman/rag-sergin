import { processDocument } from "./document.js";
import type { ScraperEngine } from "../utils/scraper.js";

/**
 * Resposta do processamento de URL
 */
export interface ProcessUrlResponse {
  success: boolean;
  documentId: string;
  chunksCount: number;
  message?: string;
  metadata: {
    title: string | null;
    ogImage: string | null;
    scrapedAt: string;
    scraperEngine: ScraperEngine;
  };
}

/**
 * Processa uma URL fazendo scraping, gerando embeddings e armazenando no Qdrant
 * Reutiliza o pipeline completo de processDocument()
 *
 * @param url - URL para processar
 * @param scraperEngine - Engine de scraping a usar (auto-detecta se não especificado)
 * @returns Informações do documento processado com metadata adicional
 * @throws Error se URL for inválida ou processamento falhar
 */
export async function processUrl(
  url: string,
  scraperEngine?: ScraperEngine
): Promise<ProcessUrlResponse> {
  // 1. Validar URL
  try {
    new URL(url); // Throws if invalid
  } catch {
    throw new Error(`URL inválida: ${url}`);
  }

  console.log(`📄 Iniciando scraping de URL: ${url}`);

  // 2. REUTILIZAR pipeline existente
  // URLDocumentLoader será usado automaticamente via factory
  const result = await processDocument({
    fileName: url, // detectDocumentType() vai identificar como URL
    filePath: url, // URLLoader aceita URL como filePath
  });

  // 3. Extrair metadata do scraping
  // Precisamos fazer scraping aqui também para obter metadata
  // (o loader já fez, mas a metadata está encapsulada)
  const { scrapeUrl, detectScraperEngine } = await import("../utils/scraper.js");
  const scraped = await scrapeUrl(url, scraperEngine);

  // Determina qual engine foi usado
  const usedEngine = scraperEngine || detectScraperEngine(url);

  // 4. Retornar com metadata adicional
  return {
    ...result,
    metadata: {
      title: scraped.title,
      ogImage: scraped.ogImage,
      scrapedAt: scraped.scrapedAt,
      scraperEngine: usedEngine,
    },
  };
}
