import { randomUUID } from "crypto";
import { Request, Response, NextFunction } from "express";

export function correlationId(req: Request, res: Response, next: NextFunction) {
  const incoming = req.header("x-correlation-id");
  req.correlationId = incoming || randomUUID();
  res.setHeader("x-correlation-id", req.correlationId);
  next();
}
