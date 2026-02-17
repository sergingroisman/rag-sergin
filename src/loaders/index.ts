/**
 * Módulo de Document Loaders
 * Suporta PDF, EPUB e URLs com parsing especializado
 */

export { DocumentLoaderFactory } from "./factory.js";
export { PDFDocumentLoader } from "./pdf.loader.js";
export { EPUBDocumentLoader } from "./epub.loader.js";
export { URLDocumentLoader } from "./url.loader.js";
export { DocumentType, detectDocumentType } from "./types.js";
export type { IDocumentLoader, ParsedDocument } from "./types.js";
