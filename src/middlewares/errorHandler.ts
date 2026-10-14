import { Request, Response, NextFunction } from "express";

export function errorHandler(
  error: any,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error("====================================");
  console.error("ERRO ORIGINAL");
  console.error(error);
  console.error("CorrelationId:", req.correlationId);
  console.error("====================================");

  const statusCode =
    typeof error?.statusCode === "number"
      ? error.statusCode
      : 500;

  return res.status(statusCode).json({
    error: error?.code ?? "ERRO_INTERNO",
    message:
      process.env.NODE_ENV === "development"
        ? error?.message
        : undefined,
    correlationId: req.correlationId,
  });
}