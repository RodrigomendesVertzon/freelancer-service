import { Request, Response, NextFunction } from "express";
import { uploadFreelancerBiometric } from "../services/biometricService";

import {
  create as createFreelancer,
  getMe,
} from "../services/freelancerService";

import {
  uploadFreelancerDocument,
} from "../services/documentService";

/**
 * POST /v1/freelancers
 *
 * Cria o cadastro do freelancer associado
 * ao usuário autenticado.
 */
export async function create(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.auth?.userId) {
      return res.status(401).json({
        error: "NAO_AUTENTICADO",
        message: "Usuário não autenticado",
      });
    }

    const result = await createFreelancer(
      req.auth.userId,
      req.body,
      req.correlationId ?? ""
    );

    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /v1/freelancers/me
 *
 * Retorna o perfil do freelancer
 * associado ao usuário autenticado.
 */
export async function me(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.auth?.userId) {
      return res.status(401).json({
        error: "NAO_AUTENTICADO",
        message: "Usuário não autenticado",
      });
    }

    const freelancer = await getMe(
      req.auth.userId
    );

    if (!freelancer) {
      return res.status(404).json({
        error: "FREELANCER_NAO_ENCONTRADO",
        message: "Freelancer não encontrado",
      });
    }

    return res.status(200).json(freelancer);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /v1/freelancers/me/documents
 *
 * Upload de documento do freelancer autenticado.
 *
 * multipart/form-data
 *
 * tipo:
 * RG
 * CNH
 * COMPROVANTE_RESIDENCIA
 * OUTRO
 *
 * file:
 * PDF
 * JPG
 * PNG
 */
export async function uploadDocument(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.auth?.userId) {
      return res.status(401).json({
        error: "NAO_AUTENTICADO",
        message: "Usuário não autenticado",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: "ARQUIVO_OBRIGATORIO",
        message: "Envie um arquivo no campo 'file'",
      });
    }

    const tipo = String(req.body.tipo ?? "")
      .trim()
      .toUpperCase();

    if (!tipo) {
      return res.status(400).json({
        error: "TIPO_DOCUMENTO_OBRIGATORIO",
        message: "Informe o tipo do documento",
      });
    }

const result = await uploadFreelancerDocument({
  authUserId: req.auth.userId,
  correlationId: req.correlationId ?? "",
  tipo,
  file: req.file,
});

    return res.status(201).json({
      message: "Documento enviado com sucesso",
      documento: result,
    });
  } catch (error) {
    next(error);
  }
}
export async function uploadBiometric(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.auth) {
      const err: any = new Error("Usuario nao autenticado");
      err.statusCode = 401;
      err.code = "NAO_AUTENTICADO";
      throw err;
    }

    if (!req.file) {
      const err: any = new Error(
        "Arquivo da selfie e obrigatorio"
      );

      err.statusCode = 400;
      err.code = "SELFIE_OBRIGATORIA";

      throw err;
    }

    const finalidade =
      String(req.body.finalidade ?? "CADASTRO")
        .toUpperCase();

    if (
      finalidade !== "CADASTRO" &&
      finalidade !== "REVALIDACAO"
    ) {
      const err: any = new Error(
        "Finalidade invalida"
      );

      err.statusCode = 400;
      err.code = "FINALIDADE_INVALIDA";

      throw err;
    }

    const biometria =
      await uploadFreelancerBiometric({
        authUserId: req.auth.userId,
        correlationId:
          req.correlationId ?? "",
        finalidade,
        file: req.file,
      });

    return res.status(201).json({
      message:
        "Biometria enviada com sucesso",
      biometria,
    });

  } catch (error) {
    next(error);
  }
}