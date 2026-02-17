import { Document } from "@langchain/core/documents";
import { EPubLoader } from "@langchain/community/document_loaders/fs/epub";
import { IDocumentLoader } from "./types.js";

/**
 * Loader especializado para arquivos EPUB
 * Usa o EPubLoader nativo do Langchain
 * Ideal para livros técnicos e documentação
 */
export class EPUBDocumentLoader implements IDocumentLoader {
  async load(filePath: string): Promise<Document[]> {
    try {
      // Usa o loader nativo do Langchain
      const loader = new EPubLoader(filePath, {
        splitChapters: true
      });

      const documents = await loader.load();

      if (!documents || documents.length === 0) {
        throw new Error("Nenhum conteúdo encontrado no EPUB.");
      }

      return documents.filter((doc) => doc.pageContent.trim().length > 0);
    } catch (error) {
      throw new Error(
        `Erro ao carregar EPUB: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
