import { Router } from "express";

import { authenticate } from "../middlewares/auth";

import {
  currentTerms,
  acceptTerm,
} from "../controllers/termController";

const router = Router();

router.use(authenticate);

router.get(
  "/current",
  currentTerms
);

router.post(
  "/:id/accept",
  acceptTerm
);

export default router;