import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { env } from "../config/env";

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "TOKEN_AUSENTE" });
  }

  try {
    const token = header.substring(7);
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;

    // Compatibilidade com claims comuns. Depois podemos restringir
    // aos nomes exatos emitidos pelo auth-service.
    const rawId = payload.sub ?? payload.userId ?? payload.id;
    const userId = Number(rawId);
    const role = String(payload.role ?? "");

    if (!Number.isSafeInteger(userId) || userId <= 0 || !role) {
      return res.status(401).json({ error: "TOKEN_INVALIDO" });
    }

    req.auth = {
      userId,
      role,
      email: typeof payload.email === "string" ? payload.email : undefined
    };
    next();
  } catch {
    return res.status(401).json({ error: "TOKEN_INVALIDO_OU_EXPIRADO" });
  }
}
