import { EPUBDocumentLoader } from "./epub.loader.js";
import { PDFDocumentLoader } from "./pdf.loader.js";
import { URLDocumentLoader } from "./url.loader.js";
import { DocumentType, IDocumentLoader, detectDocumentType } from "./types.js";

/**
 * Factory para criar o loader apropriado baseado no tipo de documento
 */
export class DocumentLoaderFactory {
  /**
   * Cria um loader apropriado para o tipo de documento
   * @param type Tipo do documento (PDF, EPUB, URL)
   * @returns Instância do loader especializado
   */
  static createLoader(type: DocumentType): IDocumentLoader {
    switch (type) {
      case DocumentType.PDF:
        return new PDFDocumentLoader();
      case DocumentType.EPUB:
        return new EPUBDocumentLoader();
      case DocumentType.URL:
        return new URLDocumentLoader();
      default:
        throw new Error(`Tipo de documento não suportado: ${type}`);
    }
  }

  /**
   * Cria um loader baseado no nome do arquivo
   * @param fileName Nome do arquivo (com extensão)
   * @returns Instância do loader especializado
   */
  static createLoaderFromFileName(fileName: string): IDocumentLoader {
    const type = detectDocumentType(fileName);
    return this.createLoader(type);
  }
}
