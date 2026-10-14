import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";

import { logger } from "./config/logger";
import { correlationId } from "./middlewares/correlationId";
import { healthRoutes } from "./routes/healthRoutes";
import freelancerRoutes from "./routes/freelancerRoutes";
import { errorHandler } from "./middlewares/errorHandler";
import termRoutes from "./routes/termRoutes";

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(correlationId);
app.use(pinoHttp({ logger }));
app.use("/v1/terms", termRoutes);

app.use("/health", healthRoutes);

app.use(
  "/v1/freelancers",
  freelancerRoutes
);

app.use((_req, res) =>
  res.status(404).json({
    error: "ROTA_NAO_ENCONTRADA",
  })
);

app.use(errorHandler);