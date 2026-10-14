import crypto from "crypto";
import path from "path";
import * as repo from "../repositories/freelancerRepository";
import {
  uploadObject,
  deleteObject,
} from "./storageService";

type BiometricPurpose = "CADASTRO" | "REVALIDACAO";

function detectImage(
  buffer: Buffer
): { mimeType: string; extension: string } | null {

  // JPEG
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return {
      mimeType: "image/jpeg",
      extension: "jpg",
    };
  }

  // PNG
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return {
      mimeType: "image/png",
      extension: "png",
    };
  }

  return null;
}

export async function uploadFreelancerBiometric(params: {
  authUserId: number;
  correlationId: string;
  finalidade: BiometricPurpose;
  file: Express.Multer.File;
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

  const detected = detectImage(params.file.buffer);

  if (!detected) {
    const err: any = new Error(
      "Arquivo de biometria invalido. Envie JPG ou PNG."
    );

    err.statusCode = 400;
    err.code = "BIOMETRIA_ARQUIVO_INVALIDO";

    throw err;
  }

  const checksumSha256 = crypto
    .createHash("sha256")
    .update(params.file.buffer)
    .digest("hex");

  const uuid = crypto.randomUUID();

  const storageKey = path.posix.join(
    "freelancers",
    String(freelancerId),
    "biometrics",
    `${uuid}.${detected.extension}`
  );


  
  await uploadObject({
  key: storageKey,
  buffer: params.file.buffer,
  contentType: detected.mimeType,
});



  try {
    await repo.registerBiometric({
      freelancerId,
      finalidade: params.finalidade,
      storageKey,
      checksumSha256,
      actorAuthUserId: params.authUserId,
      correlationId: params.correlationId,
    });
  } catch (error) {

    // Compensacao:
    // se o banco falhar, removemos o arquivo do MinIO.
    try {
      await deleteObject(storageKey);
    } catch (deleteError) {
      console.error(
        "Falha ao remover biometria do storage:",
        deleteError
      );
    }

    throw error;
  }

  return {
    finalidade: params.finalidade,
    storageKey,
    mimeType: detected.mimeType,
    tamanhoBytes: params.file.size,
    checksumSha256,
    livenessStatus: "NAO_AVALIADO",
  };
}