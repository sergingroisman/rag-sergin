import { Document } from "@langchain/core/documents";
import * as fs from "fs";
import { IDocumentLoader } from "./types.js";

/**
 * Loader especializado para arquivos PDF
 * Usa pdf-parse v2 diretamente (contorna bug do LangChain)
 */
export class PDFDocumentLoader implements IDocumentLoader {
  async load(filePath: string): Promise<Document[]> {
    try {
      // Import dinâmico da classe PDFParse do pdf-parse v2
      const { PDFParse } = await import("pdf-parse");

      // Lê o arquivo PDF como buffer e converte para array de números para evitar erros de transferência do worker
      const dataBuffer = fs.readFileSync(filePath);
      const dataArray = Array.from(new Uint8Array(dataBuffer));

      // Cria uma instância do parser
      const parser = new PDFParse({ data: dataArray });

      // Extrai o texto e informações do documento
      const [textResult, infoResult] = await Promise.all([
        parser.getText(),
        parser.getInfo()
      ]);

      const textContent = textResult.text || "";

      if (!textContent || textContent.trim().length === 0) {
        throw new Error("Nenhum texto encontrado no PDF.");
      }

      // Retorna no formato LangChain Document
      return [
        new Document({
          pageContent: textContent,
          metadata: {
            source: filePath,
            totalPages: infoResult.total || 0,
            title: infoResult.info?.Title || "",
            author: infoResult.info?.Author || "",
            subject: infoResult.info?.Subject || "",
            creator: infoResult.info?.Creator || "",
            pdfVersion: infoResult.info?.PDFFormatVersion || "",
          },
        }),
      ];
    } catch (error) {
      throw new Error(
        `Erro ao carregar PDF: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
