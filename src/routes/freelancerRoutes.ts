import { Router } from "express";

import { authenticate } from "../middlewares/auth";
import { uploadDocument as uploadFile } from "../middlewares/upload";



import {
  create,
  me,
  uploadDocument,
  uploadBiometric,
} from "../controllers/freelancerController";

const router = Router();

/**
 * Todas as rotas de freelancer exigem autenticação.
 */
router.use(authenticate);

/**
 * POST /v1/freelancers
 */
router.post("/", create);

/**
 * GET /v1/freelancers/me
 */
router.get("/me", me);

/**
 * POST /v1/freelancers/me/documents
 *
 * multipart/form-data:
 * tipo = RG | CNH | COMPROVANTE_RESIDENCIA | OUTRO
 * file = PDF | JPG | PNG
 */
router.post(
  "/me/documents",
  uploadFile.single("file"),
  uploadDocument
);

router.post(
  "/me/biometrics",
  uploadFile.single("file"),
  uploadBiometric
);

export default router;