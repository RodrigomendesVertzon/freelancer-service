import * as repo from "../repositories/freelancerRepository";

export async function getRegistrationSummary(
  freelancerId: number
) {
  const status =
    await repo.getRegistrationStatus(freelancerId);

  if (!status) {
    const err: any =
      new Error("Freelancer nao encontrado");

    err.statusCode = 404;
    err.code = "FREELANCER_NAO_ENCONTRADO";

    throw err;
  }

  let percentual = 0;

  const dadosFaltantes: string[] = [];
  const validacoesPendentes: string[] = [];
  const problemasValidacao: string[] = [];

  /*
   * ==========================================
   * DADOS BASICOS - 20%
   * ==========================================
   */

  const dadosBasicosOk =
    Boolean(status.dados_basicos_ok);

  if (dadosBasicosOk) {
    percentual += 20;
  } else {
    dadosFaltantes.push("DADOS_BASICOS");
  }

  /*
   * ==========================================
   * EMAIL / WHATSAPP
   *
   * Nao alteram a completude.
   * Sao validacoes.
   * ==========================================
   */

  const emailVerificado =
    Boolean(status.email_verificado);

  const whatsappVerificado =
    Boolean(status.whatsapp_verificado);

  if (!emailVerificado) {
    validacoesPendentes.push("EMAIL");
  }

  if (!whatsappVerificado) {
    validacoesPendentes.push("WHATSAPP");
  }

  /*
   * ==========================================
   * ENDERECO - 20%
   * ==========================================
   */

  const enderecoOk =
    Boolean(status.endereco_ok);

  if (enderecoOk) {
    percentual += 20;
  } else {
    dadosFaltantes.push("ENDERECO");
  }

  /*
   * ==========================================
   * CONTATOS DE EMERGENCIA - 20%
   * ==========================================
   */

  const contatos =
    Number(status.contatos_emergencia ?? 0);

  const contatosOk =
    contatos >= 2;

  if (contatosOk) {
    percentual += 20;
  } else {
    dadosFaltantes.push(
      "CONTATOS_EMERGENCIA"
    );
  }

  /*
   * ==========================================
   * DOCUMENTO - 15%
   * ==========================================
   */

  const documentoEnviado =
    Boolean(status.documento_enviado);

  const documentoStatus =
    status.documento_status
      ? String(status.documento_status)
      : null;

  if (documentoEnviado) {
    percentual += 15;

    if (documentoStatus === "PENDENTE") {
      validacoesPendentes.push("DOCUMENTO");
    }

    if (documentoStatus === "REJEITADO") {
      problemasValidacao.push("DOCUMENTO");
    }

    /*
     * Fail-safe:
     * qualquer estado inesperado nao deve
     * liberar o cadastro.
     */
    if (
      documentoStatus !== "PENDENTE" &&
      documentoStatus !== "APROVADO" &&
      documentoStatus !== "REJEITADO"
    ) {
      validacoesPendentes.push("DOCUMENTO");
    }
  } else {
    dadosFaltantes.push(
      "DOCUMENTO_IDENTIFICACAO"
    );
  }

  /*
   * ==========================================
   * BIOMETRIA - 15%
   * ==========================================
   */

  const biometriaEnviada =
    Boolean(status.biometria_enviada);

  const livenessStatus =
    status.liveness_status
      ? String(status.liveness_status)
      : null;

  if (biometriaEnviada) {
    percentual += 15;

    if (livenessStatus === "NAO_AVALIADO") {
      validacoesPendentes.push(
        "BIOMETRIA_LIVENESS"
      );
    }

    if (livenessStatus === "REJEITADO") {
      problemasValidacao.push(
        "BIOMETRIA_LIVENESS"
      );
    }

    if (
      livenessStatus !== "NAO_AVALIADO" &&
      livenessStatus !== "APROVADO" &&
      livenessStatus !== "REJEITADO"
    ) {
      validacoesPendentes.push(
        "BIOMETRIA_LIVENESS"
      );
    }
  } else {
    dadosFaltantes.push(
      "SELFIE_BIOMETRIA"
    );
  }

  /*
   * ==========================================
   * TERMOS - 10%
   * ==========================================
   */

  const termosObrigatorios =
    Number(status.termos_obrigatorios ?? 0);

  const termosAceitos =
    Number(status.termos_aceitos ?? 0);

  const termosCompletos =
    termosObrigatorios > 0 &&
    termosAceitos >= termosObrigatorios;

  if (termosCompletos) {
    percentual += 10;
  } else {
    dadosFaltantes.push(
      "TERMOS_OBRIGATORIOS"
    );
  }

  /*
   * ==========================================
   * RESULTADO
   * ==========================================
   */

  const cadastroCompleto =
    percentual === 100;

  const validacoesConcluidas =
    validacoesPendentes.length === 0 &&
    problemasValidacao.length === 0;

  const aptoParaAtivacao =
    cadastroCompleto &&
    validacoesConcluidas;

  return {
    percentual,
    cadastroCompleto,
    aptoParaAtivacao,

    dadosFaltantes,
    validacoesPendentes,
    problemasValidacao,

    checklist: {
      dadosBasicos: dadosBasicosOk,

      endereco: enderecoOk,

      contatosEmergencia: {
        quantidade: contatos,
        minimo: 2,
        completo: contatosOk,
      },

      email: {
        informado: true,
        verificado: emailVerificado,
      },

      whatsapp: {
        informado: true,
        verificado: whatsappVerificado,
      },

      documento: {
        enviado: documentoEnviado,
        status: documentoStatus,
      },

      biometria: {
        enviada: biometriaEnviada,
        livenessStatus,
      },

      termos: {
        obrigatorios: termosObrigatorios,
        aceitos: termosAceitos,
        completo: termosCompletos,
      },
    },
  };
}