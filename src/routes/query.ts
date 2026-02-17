import { Router } from "express";
import { validateSchema } from "../middleware/validation.js";
import { type QueryInput, querySchema } from "../schemas/index.js";
import { searchDocuments } from "../services/query.js";

export const queryRouter = Router();

queryRouter.post("/", validateSchema(querySchema), async (req, res) => {
	try {
		const { question, topK } = req.body as QueryInput;
		const result = await searchDocuments({ question, topK });
		res.json({
			success: true,
			data: result,
		});
	} catch (error) {
		console.log("Error processing query:", error);
		res.status(500).json({
			success: false,
			message: "Error processing query",
		});
	}
});
