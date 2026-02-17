import { Document } from "@langchain/core/documents";
import { IDocumentLoader } from "./types.js";
import { scrapeUrl } from "../utils/scraper.js";

/**
 * Loader especializado para URLs web
 * Faz scraping do conteúdo HTML e extrai texto principal
 */
export class URLDocumentLoader implements IDocumentLoader {
  async load(filePath: string): Promise<Document[]> {
    try {
      // filePath é na verdade uma URL neste contexto
      const url = filePath;

      // Fazer scraping da URL
      const scraped = await scrapeUrl(url);

      // Retornar no formato LangChain Document
      return [
        new Document({
          pageContent: scraped.content,
          metadata: {
            source: url,
            title: scraped.title,
            ogImage: scraped.ogImage,
            scrapedAt: scraped.scrapedAt,
            type: "url",
            contentLength: scraped.content.length,
          },
        }),
      ];
    } catch (error) {
      throw new Error(
        `Erro ao carregar URL: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
