import dotenv from "dotenv";

dotenv.config();

const MAX_FILE_SIZE_10MB = 10 * 1024 * 1024;

export const config = {
	deepseek: {
		apiKey: process.env.DEEPSEEK_API_KEY!,
	},
	qdrant: {
		url: process.env.QDRANT_URL || "http://localhost:6333",
		collectionName: process.env.QDRANT_COLLECTION_NAME || "documents",
	},
	server: {
		port: process.env.SERVER_PORT || "3000",
	},
	uploads: {
		directory: process.env.UPLOADS_DIRECTORY || "./uploads",
		maxFileSize: Number(MAX_FILE_SIZE_10MB),
	},
	scraping: {
		defaultEngine: (process.env.SCRAPER_ENGINE || "cheerio") as "cheerio" | "playwright",
		playwright: {
			headless: process.env.PLAYWRIGHT_HEADLESS !== "false",
			timeout: Number(process.env.PLAYWRIGHT_TIMEOUT) || 30000,
		},
	},
} as const;

if (!config.deepseek.apiKey) {
	throw new Error("DEEPSEEK_API_KEY is not set in environment variables");
}
