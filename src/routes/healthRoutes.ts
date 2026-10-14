import { Router } from "express";
import { checkDatabase } from "../config/db";

export const healthRoutes = Router();

healthRoutes.get("/live", (_req, res) => res.json({ status: "UP" }));

healthRoutes.get("/ready", async (_req, res) => {
  try {
    await checkDatabase();
    res.json({ status: "UP", database: "UP" });
  } catch {
    res.status(503).json({ status: "DOWN", database: "DOWN" });
  }
});
