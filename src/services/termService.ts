import * as repo from "../repositories/freelancerRepository";
import { synchronizeCadastroStatus } from "./cadastroStatusService";

export async function getCurrentTerms(
  authUserId: number
) {
  const freelancerId =
    await repo.findIdByAuthUserId(authUserId);

  if (!freelancerId) {
    const err: any = new Error(
      "Perfil de freelancer nao encontrado"
    );

    err.statusCode = 404;
    err.code = "FREELANCER_NAO_ENCONTRADO";

    throw err;
  }

  const terms =
    await repo.findCurrentTerms(freelancerId);

  return terms;
}

export async function acceptCurrentTerm(params: {
  authUserId: number;
  termId: number;
  ip: string | null;
  userAgent: string | null;
  correlationId: string;
}) {
  const freelancerId =
    await repo.findIdByAuthUserId(params.authUserId);

  if (!freelancerId) {
    const err: any = new Error(
      "Perfil de freelancer nao encontrado"
    );

    err.statusCode = 404;
    err.code = "FREELANCER_NAO_ENCONTRADO";

    throw err;
  }

  // --------------------------------------------------
  // Busca o termo
  // --------------------------------------------------

  const term =
    await repo.findTermById(params.termId);

  if (!term) {
    const err: any = new Error(
      "Termo nao encontrado"
    );

    err.statusCode = 404;
    err.code = "TERMO_NAO_ENCONTRADO";

    throw err;
  }

  // --------------------------------------------------
  // Valida se o termo esta ativo
  // --------------------------------------------------

  if (!term.ativo) {
    const err: any = new Error(
      "Termo nao esta ativo"
    );

    err.statusCode = 409;
    err.code = "TERMO_INATIVO";

    throw err;
  }

  // --------------------------------------------------
  // Valida vigencia
  // --------------------------------------------------

  const now = new Date();

  if (
    term.vigencia_inicio &&
    new Date(term.vigencia_inicio) > now
  ) {
    const err: any = new Error(
      "Termo ainda nao esta vigente"
    );

    err.statusCode = 409;
    err.code = "TERMO_NAO_VIGENTE";

    throw err;
  }

  if (
    term.vigencia_fim &&
    new Date(term.vigencia_fim) <= now
  ) {
    const err: any = new Error(
      "Termo nao esta mais vigente"
    );

    err.statusCode = 409;
    err.code = "TERMO_EXPIRADO";

    throw err;
  }

  // --------------------------------------------------
  // Verifica se o freelancer ja aceitou esse termo
  // --------------------------------------------------

  const alreadyAccepted =
    await repo.hasAcceptedTerm(
      freelancerId,
      params.termId
    );

  if (alreadyAccepted) {
    const err: any = new Error(
      "Este termo ja foi aceito"
    );

    err.statusCode = 409;
    err.code = "TERMO_JA_ACEITO";

    throw err;
  }

  // --------------------------------------------------
  // Registra o aceite
  // --------------------------------------------------

  try {
    await repo.acceptTerm({
      freelancerId,
      termId: params.termId,
      ip: params.ip,
      userAgent: params.userAgent,
      correlationId: params.correlationId,
    });
    await synchronizeCadastroStatus(
  freelancerId
);
  } catch (error: any) {

    /*
     * Segunda protecao contra duplicidade.
     *
     * Mesmo fazendo o SELECT acima, duas requisicoes
     * simultaneas poderiam passar pela verificacao.
     *
     * A UNIQUE KEY do MySQL continua sendo a garantia
     * definitiva.
     */
    if (error?.code === "ER_DUP_ENTRY") {
      const err: any = new Error(
        "Este termo ja foi aceito"
      );

      err.statusCode = 409;
      err.code = "TERMO_JA_ACEITO";

      throw err;
    }

    throw error;
  }

  // --------------------------------------------------
  // Retorno
  // --------------------------------------------------

  return {
    termId: term.id,
    tipo: term.tipo,
    versao: term.versao,
    titulo: term.titulo,
  };
}