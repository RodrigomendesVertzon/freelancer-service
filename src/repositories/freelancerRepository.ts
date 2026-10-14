import { RowDataPacket } from "mysql2";
import { db } from "../config/db";
import { CreateFreelancerInput } from "../schemas/freelancerSchema";

/**
 * Cria o cadastro principal do freelancer.
 */
export async function createFreelancer(
  authUserId: number,
  data: CreateFreelancerInput,
  correlationId: string
): Promise<number> {
  const [sets] = await db.query<any>(
    `
      CALL sp_cadastrar_freelancer(
        ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?
      )
    `,
    [
      authUserId,
      data.cpf,
      data.nome,
      data.dataNascimento,
      data.email,
      data.whatsapp,
      data.chavePix,
      data.tipoChavePix,

      data.endereco.cep,
      data.endereco.logradouro,
      data.endereco.numero,
      data.endereco.complemento ?? null,
      data.endereco.bairro,
      data.endereco.cidade,
      data.endereco.estado,

      data.contatosEmergencia[0].nome,
      data.contatosEmergencia[0].telefone,
      data.contatosEmergencia[0].parentesco ?? null,

      data.contatosEmergencia[1].nome,
      data.contatosEmergencia[1].telefone,
      data.contatosEmergencia[1].parentesco ?? null,

      correlationId,
    ]
  );

  return Number(sets[0][0].freelancer_id);
}

/**
 * Busca o perfil completo do freelancer
 * através do usuário do Auth Service.
 */
export async function findByAuthUserId(
  authUserId: number
) {
  const [rows] = await db.query<RowDataPacket[]>(
    `
      SELECT *
      FROM vw_freelancer_perfil
      WHERE auth_user_id = ?
      LIMIT 1
    `,
    [authUserId]
  );

  return rows[0] ?? null;
}

/**
 * Busca somente o ID interno do freelancer.
 *
 * Usado em operações internas como documentos,
 * biometria, termos etc.
 */
export async function findIdByAuthUserId(
  authUserId: number
): Promise<number | null> {
  const [rows] = await db.query<RowDataPacket[]>(
    `
      SELECT id
      FROM freelancer
      WHERE auth_user_id = ?
      LIMIT 1
    `,
    [authUserId]
  );

  if (rows.length === 0) {
    return null;
  }

  return Number(rows[0].id);
}

/**
 * Registra no MySQL os metadados de um
 * documento armazenado no MinIO.
 */
export async function registerDocument(params: {
  freelancerId: number;
  tipo: string;
  storageKey: string;
  mimeType: string;
  tamanhoBytes: number;
  checksumSha256: string;
  actorAuthUserId: number;
  correlationId: string;
}): Promise<void> {
  await db.query(
    `
      CALL sp_registrar_documento(
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?
      )
    `,
    [
      params.freelancerId,
      params.tipo,
      "MINIO",
      params.storageKey,
      params.mimeType,
      params.tamanhoBytes,
      params.checksumSha256,
      params.actorAuthUserId,
      params.correlationId,
    ]
  );
}

export async function registerBiometric(params: {
  freelancerId: number;
  finalidade: "CADASTRO" | "REVALIDACAO";
  storageKey: string;
  checksumSha256: string;
  actorAuthUserId: number;
  correlationId: string;
}) {
  await db.query(
    `
    CALL sp_registrar_biometria(
      ?, ?, ?, ?, ?, ?, ?
    )
    `,
    [
      params.freelancerId,
      params.finalidade,
      "MINIO",
      params.storageKey,
      params.checksumSha256,
      params.actorAuthUserId,
      params.correlationId,
    ]
  );
}

export async function findCurrentTerms(freelancerId: number) {
  const [rows] = await db.query<RowDataPacket[]>(
    `
    SELECT
        t.id,
        t.tipo,
        t.versao,
        t.titulo,
        t.texto_hash,
        t.documento_url,
        t.obrigatorio,
        t.vigencia_inicio,
        t.vigencia_fim,

        CASE
            WHEN a.id IS NULL THEN 0
            ELSE 1
        END AS aceito,

        a.accepted_at

    FROM termo t

    LEFT JOIN aceite_termo a
        ON a.termo_id = t.id
       AND a.freelancer_id = ?

    WHERE t.ativo = 1
      AND t.vigencia_inicio <= NOW(3)
      AND (
          t.vigencia_fim IS NULL
          OR t.vigencia_fim > NOW(3)
      )

    ORDER BY t.tipo, t.vigencia_inicio DESC
    `,
    [freelancerId]
  );

  return rows;
}

export async function findTermById(termId: number) {
  const [rows] = await db.query<RowDataPacket[]>(
    `
    SELECT
        id,
        tipo,
        versao,
        titulo,
        texto_hash,
        documento_url,
        obrigatorio,
        ativo,
        vigencia_inicio,
        vigencia_fim
    FROM termo
    WHERE id = ?
    LIMIT 1
    `,
    [termId]
  );

  return rows[0] ?? null;
}

export async function acceptTerm(params: {
  freelancerId: number;
  termId: number;
  ip: string | null;
  userAgent: string | null;
  correlationId: string;
}) {
  await db.query(
    `
    CALL sp_aceitar_termo(
      ?, ?, ?, ?, ?
    )
    `,
    [
      params.freelancerId,
      params.termId,
      params.ip,
      params.userAgent,
      params.correlationId,
    ]
  );
}

export async function hasAcceptedTerm(
  freelancerId: number,
  termId: number
): Promise<boolean> {
  const [rows] = await db.query<RowDataPacket[]>(
    `
    SELECT id
    FROM aceite_termo
    WHERE freelancer_id = ?
      AND termo_id = ?
    LIMIT 1
    `,
    [freelancerId, termId]
  );

  return rows.length > 0;
}

export async function getRegistrationStatus(
  freelancerId: number
) {
  const [rows] = await db.query<RowDataPacket[]>(
    `
    SELECT
      f.id,

      /* DADOS BASICOS */
      CASE
        WHEN
          f.nome IS NOT NULL
          AND TRIM(f.nome) <> ''
          AND f.cpf IS NOT NULL
          AND TRIM(f.cpf) <> ''
          AND f.data_nascimento IS NOT NULL
          AND f.email IS NOT NULL
          AND TRIM(f.email) <> ''
          AND f.telefone_whatsapp IS NOT NULL
          AND TRIM(f.telefone_whatsapp) <> ''
          AND f.chave_pix IS NOT NULL
          AND TRIM(f.chave_pix) <> ''
          AND f.tipo_chave_pix IS NOT NULL
        THEN 1
        ELSE 0
      END AS dados_basicos_ok,

      /* VERIFICACOES DE CONTATO */
      f.email_verificado,
      f.whatsapp_verificado,

      /* ENDERECO */
      EXISTS (
        SELECT 1
        FROM freelancer_endereco e
        WHERE e.freelancer_id = f.id
          AND e.ativo = 1
          AND e.principal = 1
      ) AS endereco_ok,

      /* CONTATOS DE EMERGENCIA */
      (
        SELECT COUNT(*)
        FROM freelancer_contato_emergencia c
        WHERE c.freelancer_id = f.id
      ) AS contatos_emergencia,

      /* DOCUMENTO ENVIADO */
      EXISTS (
        SELECT 1
        FROM freelancer_documento d
        WHERE d.freelancer_id = f.id
          AND d.tipo IN ('RG', 'CNH')
      ) AS documento_enviado,

      /* STATUS DO DOCUMENTO MAIS RECENTE */
      (
        SELECT d.status
        FROM freelancer_documento d
        WHERE d.freelancer_id = f.id
          AND d.tipo IN ('RG', 'CNH')
        ORDER BY d.created_at DESC, d.id DESC
        LIMIT 1
      ) AS documento_status,

      /* BIOMETRIA ENVIADA */
      EXISTS (
        SELECT 1
        FROM freelancer_biometria b
        WHERE b.freelancer_id = f.id
          AND b.ativo = 1
      ) AS biometria_enviada,

      /* STATUS DA BIOMETRIA ATIVA MAIS RECENTE */
      (
        SELECT b.liveness_status
        FROM freelancer_biometria b
        WHERE b.freelancer_id = f.id
          AND b.ativo = 1
        ORDER BY b.capturado_em DESC, b.id DESC
        LIMIT 1
      ) AS liveness_status,

      /* TERMOS OBRIGATORIOS VIGENTES */
      (
        SELECT COUNT(*)
        FROM termo t
        WHERE t.obrigatorio = 1
          AND t.ativo = 1
          AND t.vigencia_inicio <= NOW(3)
          AND (
            t.vigencia_fim IS NULL
            OR t.vigencia_fim > NOW(3)
          )
      ) AS termos_obrigatorios,

      /* TERMOS OBRIGATORIOS VIGENTES ACEITOS */
      (
        SELECT COUNT(*)
        FROM termo t
        INNER JOIN aceite_termo a
          ON a.termo_id = t.id
         AND a.freelancer_id = f.id
        WHERE t.obrigatorio = 1
          AND t.ativo = 1
          AND t.vigencia_inicio <= NOW(3)
          AND (
            t.vigencia_fim IS NULL
            OR t.vigencia_fim > NOW(3)
          )
      ) AS termos_aceitos

    FROM freelancer f
    WHERE f.id = ?
    LIMIT 1
    `,
    [freelancerId]
  );

  return rows[0] ?? null;
}