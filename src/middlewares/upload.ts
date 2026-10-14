import multer from "multer";
import { env } from "../config/env";

export const uploadDocument = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: env.MAX_UPLOAD_BYTES,
    files: 1,
  },
});