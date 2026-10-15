import * as repo from "../repositories/freelancerRepository";

import {
  getRegistrationSummary,
  determineCadastroStatus,
  CadastroStatus,
} from "./registrationService";

export async function synchronizeCadastroStatus(
  freelancerId: number
) {
  const freelancer =
    await repo.findById(freelancerId);

  if (!freelancer) {
    const err: any =
      new Error("Freelancer nao encontrado");

    err.statusCode = 404;
    err.code = "FREELANCER_NAO_ENCONTRADO";

    throw err;
  }

  const summary =
    await getRegistrationSummary(freelancerId);

  const statusAtual =
    freelancer.cadastro_status as CadastroStatus;

  const novoStatus =
    determineCadastroStatus(summary);

  if (statusAtual === novoStatus) {
    return {
      alterado: false,
      statusAnterior: statusAtual,
      statusAtual,
      cadastro: summary,
    };
  }

  await repo.updateCadastroStatus(
    freelancerId,
    novoStatus
  );

  return {
    alterado: true,
    statusAnterior: statusAtual,
    statusAtual: novoStatus,
    cadastro: summary,
  };
}