import { Router } from "express";
import { upload } from "../middleware/upload.js";
import { validateSchema } from "../middleware/validation.js";
import { processDocument } from "../services/document.js";
import { processUrl } from "../services/url.js";
import { urlSchema } from "../schemas/index.js";

export const documentsRouter = Router();

/**
 * POST /documents/upload
 * Upload e processamento de documento (PDF/EPUB)
 */
documentsRouter.post("/upload", upload.single("file"), async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({
				success: false,
				message: "Nenhum arquivo enviado",
			});
		}

		console.log(`📄 Processando: ${req.file.originalname}`);

		const result = await processDocument({
			fileName: req.file.originalname,
			filePath: req.file.path,
			fileSize: req.file.size,
		});

		res.json({
			success: true,
			data: result,
		});
	} catch (error) {
		console.error("Erro ao processar upload:", error);
		res.status(500).json({
			success: false,
			message: error instanceof Error ? error.message : "Erro ao processar documento",
		});
	}
});

/**
 * POST /documents/from-url
 * Scraping e processamento de URL
 * Body: { url: string, scraperEngine?: "cheerio" | "playwright" }
 */
documentsRouter.post("/from-url", validateSchema(urlSchema), async (req, res) => {
	try {
		const { url, scraperEngine } = req.body;
		console.log(`🌐 Processando URL: ${url}${scraperEngine ? ` (engine: ${scraperEngine})` : ""}`);

		const result = await processUrl(url, scraperEngine);

		res.json({
			success: true,
			data: result,
		});
	} catch (error) {
		console.error("Erro ao processar URL:", error);
		res.status(500).json({
			success: false,
			message: error instanceof Error ? error.message : "Erro ao processar URL",
		});
	}
});

/**
 * GET /documents/stats
 * Estatísticas da base vetorial
 */
documentsRouter.get("/stats", async (req, res) => {
	try {
		const { qdrantClient } = await import("../services/qdrant.js");
		const { config } = await import("../config.js");

		const collection = await qdrantClient.getCollection(config.qdrant.collectionName);

		res.json({
			success: true,
			data: {
				collectionName: config.qdrant.collectionName,
				pointsCount: collection.points_count,
				vectorSize: collection.config?.params?.vectors?.size || 0,
			},
		});
	} catch (error) {
		console.error("Erro ao buscar estatísticas:", error);
		res.status(500).json({
			success: false,
			message: "Erro ao buscar estatísticas",
		});
	}
});
