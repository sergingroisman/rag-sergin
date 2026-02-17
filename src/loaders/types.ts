import { Document } from "@langchain/core/documents";

/**
 * Tipos de documentos suportados pelo sistema
 */
export enum DocumentType {
  PDF = "pdf",
  EPUB = "epub",
  URL = "url",
}

/**
 * Resultado do parsing de um documento
 */
export interface ParsedDocument {
  content: string;
  metadata: Record<string, any>;
}

/**
 * Interface base para todos os document loaders
 */
export interface IDocumentLoader {
  /**
   * Carrega e faz o parsing do documento
   * @param filePath Caminho absoluto do arquivo
   * @returns Array de documentos no formato LangChain
   */
  load(filePath: string): Promise<Document[]>;
}

/**
 * Detecta o tipo de documento baseado na extensão do arquivo ou URL
 * @param fileName Nome do arquivo (com extensão) ou URL
 * @returns Tipo do documento
 */
export function detectDocumentType(fileName: string): DocumentType {
  // Detectar URLs antes de verificar extensões
  if (fileName.startsWith("http://") || fileName.startsWith("https://")) {
    return DocumentType.URL;
  }

  const extension = fileName.toLowerCase().split(".").pop();

  switch (extension) {
    case "pdf":
      return DocumentType.PDF;
    case "epub":
      return DocumentType.EPUB;
    default:
      throw new Error(
        `Tipo de arquivo não suportado: ${extension}. Suportados: PDF, EPUB, URL`
      );
  }
}
