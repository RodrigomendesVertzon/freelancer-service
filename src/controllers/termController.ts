import {
  Request,
  Response,
  NextFunction,
} from "express";

import {
  getCurrentTerms,
  acceptCurrentTerm,
} from "../services/termService";

export async function currentTerms(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.auth) {
      const err: any =
        new Error("Usuario nao autenticado");

      err.statusCode = 401;
      err.code = "NAO_AUTENTICADO";

      throw err;
    }

    const terms =
      await getCurrentTerms(req.auth.userId);

    return res.json({
      termos: terms,
    });

  } catch (error) {
    next(error);
  }
}

export async function acceptTerm(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.auth) {
      const err: any =
        new Error("Usuario nao autenticado");

      err.statusCode = 401;
      err.code = "NAO_AUTENTICADO";

      throw err;
    }

    const termId = Number(req.params.id);

    if (
      !Number.isInteger(termId) ||
      termId <= 0
    ) {
      const err: any =
        new Error("ID do termo invalido");

      err.statusCode = 400;
      err.code = "TERMO_ID_INVALIDO";

      throw err;
    }

    const userAgent =
      req.get("user-agent") ?? null;

    /*
     * Por enquanto usamos req.ip.
     *
     * Quando colocarmos Nginx/reverse proxy na VPS,
     * configuraremos trust proxy corretamente.
     */
    const ip = req.ip ?? null;

    const result = await acceptCurrentTerm({
      authUserId: req.auth.userId,
      termId,
      ip,
      userAgent,
      correlationId:
        req.correlationId ?? "",
    });

    return res.status(201).json({
      message: "Termo aceito com sucesso",
      termo: result,
    });

  } catch (error) {
    next(error);
  }
}