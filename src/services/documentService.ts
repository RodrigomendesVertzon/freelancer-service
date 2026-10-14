import { createHash, randomUUID } from "node:crypto";

import {
  findIdByAuthUserId,
  registerDocument,
} from "../repositories/freelancerRepository";

import {
  uploadObject,
  deleteObject,
} from "./storageService";

import { detectAllowedFile } from "../utils/fileValidation";

const DOCUMENT_TYPES = [
  "RG",
  "CNH",
  "COMPROVANTE_RESIDENCIA",
  "OUTRO",
] as const;

type DocumentType = (typeof DOCUMENT_TYPES)[number];

export async function uploadFreelancerDocument(params: {
  authUserId: number;
  correlationId: string;
  tipo: string;
  file: Express.Multer.File;
}) {
  /*
   * Valida o tipo de documento.
   */
  if (!DOCUMENT_TYPES.includes(params.tipo as DocumentType)) {
    const error: any = new Error(
      "Tipo de documento inválido. Permitidos: RG, CNH, COMPROVANTE_RESIDENCIA e OUTRO"
    );

    error.statusCode = 400;
    error.code = "TIPO_DOCUMENTO_INVALIDO";

    throw error;
  }

  /*
   * Descobre o freelancer a partir do usuário autenticado.
   *
   * O cliente não envia freelancerId.
   * Isso evita que alguém tente enviar documento
   * para outro freelancer.
   */
  const freelancerId = await findIdByAuthUserId(
    params.authUserId
  );

  if (!freelancerId) {
    const error: any = new Error(
      "Freelancer não encontrado"
    );

    error.statusCode = 404;
    error.code = "FREELANCER_NAO_ENCONTRADO";

    throw error;
  }

  /*
   * Detecta o tipo REAL do arquivo através
   * da assinatura binária.
   *
   * Não confiamos apenas no MIME enviado
   * pelo navegador.
   */
  const detected = detectAllowedFile(
    params.file.buffer
  );

  if (!detected) {
    const error: any = new Error(
      "Arquivo inválido. Permitidos: PDF, JPG e PNG"
    );

    error.statusCode = 400;
    error.code = "ARQUIVO_INVALIDO";

    throw error;
  }

  /*
   * SHA-256 do arquivo.
   *
   * Será armazenado no banco para permitir
   * verificação futura de integridade.
   */
  const checksumSha256 = createHash("sha256")
    .update(params.file.buffer)
    .digest("hex");

  /*
   * Nunca utilizamos CPF, nome ou e-mail
   * no nome físico do objeto.
   */
  const storageKey =
    `freelancers/${freelancerId}/documents/` +
    `${randomUUID()}.${detected.extension}`;

  /*
   * Primeiro grava o objeto no MinIO.
   */
  await uploadObject({
    key: storageKey,
    buffer: params.file.buffer,
    contentType: detected.mimeType,
  });

  try {
    /*
     * Depois registra os metadados no MySQL.
     *
     * actorAuthUserId:
     * identifica quem executou a operação.
     *
     * correlationId:
     * permite rastrear a requisição nos logs
     * e na auditoria.
     */
    await registerDocument({
      freelancerId,
      tipo: params.tipo,
      storageKey,
      mimeType: detected.mimeType,
      tamanhoBytes: params.file.size,
      checksumSha256,

      actorAuthUserId: params.authUserId,
      correlationId: params.correlationId,
    });
  } catch (error) {
    /*
     * Compensação:
     *
     * Se o MinIO recebeu o arquivo mas o
     * MySQL falhou, removemos o objeto para
     * evitar arquivos órfãos.
     */
    try {
      await deleteObject(storageKey);
    } catch (deleteError) {
      console.error(
        "Falha ao remover objeto órfão do MinIO:",
        storageKey,
        deleteError
      );
    }

    throw error;
  }

  return {
    tipo: params.tipo,
    storageKey,
    mimeType: detected.mimeType,
    tamanhoBytes: params.file.size,
    checksumSha256,
    status: "PENDENTE",
  };
}