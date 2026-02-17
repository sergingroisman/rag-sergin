import multer from "multer";
import path from "node:path";
import { config } from "../config.js";

// Configuração de armazenamento
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, config.uploads.directory);
	},
	filename: (req, file, cb) => {
		// Mantém o nome original com timestamp para evitar conflitos
		const timestamp = Date.now();
		const ext = path.extname(file.originalname);
		const name = path.basename(file.originalname, ext);
		cb(null, `${name}-${timestamp}${ext}`);
	},
});

// Filtro de arquivos permitidos
const fileFilter = (req: any, file: any, cb: any) => {
	const allowedTypes = [".pdf", ".epub"];
	const ext = path.extname(file.originalname).toLowerCase();

	if (allowedTypes.includes(ext)) {
		cb(null, true);
	} else {
		cb(new Error(`Tipo de arquivo não suportado: ${ext}. Use: ${allowedTypes.join(", ")}`), false);
	}
};

export const upload = multer({
	storage,
	fileFilter,
	limits: {
		fileSize: config.uploads.maxFileSize,
	},
});
