import { CreateFreelancerInput } from "../schemas/freelancerSchema";
import * as repo from "../repositories/freelancerRepository";
import { getRegistrationSummary } from "./registrationService";

export async function create(authUserId: number, data: CreateFreelancerInput, correlationId: string) {
  const existing = await repo.findByAuthUserId(authUserId);
  if (existing) {
    const err: any = new Error("Usuario ja possui perfil de freelancer");
    err.statusCode = 409;
    err.code = "FREELANCER_JA_EXISTE";
    throw err;
  }

  const id = await repo.createFreelancer(authUserId, data, correlationId);
  return { id };
}

export async function getMe(
  authUserId: number
) {
  const freelancer =
    await repo.findByAuthUserId(authUserId);

  if (!freelancer) {
    return null;
  }

  const cadastro =
    await getRegistrationSummary(
      freelancer.id
    );

  return {
    ...freelancer,
    cadastro,
  };
}
