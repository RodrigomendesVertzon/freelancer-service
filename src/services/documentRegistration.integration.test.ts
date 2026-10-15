import {
  beforeAll,
  beforeEach,
  afterAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { db } from "../config/db";
import { uploadFreelancerDocument } from "./documentService";

/*
 * O objetivo deste teste é validar:
 *
 * uploadFreelancerDocument()
 *        ↓
 * freelancer_documento
 *        ↓
 * synchronizeCadastroStatus()
 *        ↓
 * INCOMPLETO -> PENDENTE_VALIDACAO
 *
 * Não precisamos testar o MinIO aqui.
 */
vi.mock("./storageService", () => ({
  uploadObject: vi.fn().mockResolvedValue(undefined),
  deleteObject: vi.fn().mockResolvedValue(undefined),
}));

/*
 * Gera um CPF matematicamente valido para testes.
 * O prefixo usa parte do timestamp para reduzir
 * drasticamente a possibilidade de colisao.
 */
function gerarCpfValido(seed: number): string {
  let base = String(seed % 1_000_000_000)
    .padStart(9, "0");

  // Evita CPFs formados pelo mesmo digito.
  if (/^(\d)\1{8}$/.test(base)) {
    base = "123456789";
  }

  const calcularDigito = (
    numeros: string,
    pesoInicial: number
  ) => {
    let soma = 0;

    for (let i = 0; i < numeros.length; i++) {
      soma +=
        Number(numeros[i]) *
        (pesoInicial - i);
    }

    const resto = soma % 11;

    return resto < 2
      ? 0
      : 11 - resto;
  };

  const primeiroDigito =
    calcularDigito(base, 10);

  const segundoDigito =
    calcularDigito(
      base + primeiroDigito,
      11
    );

  return (
    base +
    primeiroDigito +
    segundoDigito
  );
}

/*
 * Identificador exclusivo desta execucao.
 *
 * Date.now() sozinho normalmente seria suficiente,
 * mas acrescentamos um valor aleatorio para permitir
 * inclusive execucoes paralelas.
 */
const RUN_ID =
  `${Date.now()}-${Math.floor(
    Math.random() * 1_000_000
  )}`;

/*
 * auth_user_id precisa continuar numerico/BIGINT.
 *
 * Mantemos o valor dentro da faixa segura do
 * JavaScript e do BIGINT UNSIGNED.
 */
const AUTH_USER_ID =
  Date.now() * 1000 +
  Math.floor(Math.random() * 1000);

/*
 * CPF valido e diferente por execucao.
 */
const TEST_CPF =
  gerarCpfValido(AUTH_USER_ID);

/*
 * Email exclusivo.
 */
const TEST_EMAIL =
  `integracao-${RUN_ID}@example.com`;

/*
 * Telefone/WhatsApp exclusivo.
 *
 * Formato:
 * 11 + 9 + oito digitos
 */
const telefoneSufixo =
  String(
    AUTH_USER_ID % 100_000_000
  ).padStart(8, "0");

const TEST_WHATSAPP =
  `119${telefoneSufixo}`;

/*
 * Contatos de emergencia tambem exclusivos.
 */
const TEST_PHONE_1 =
  `118${telefoneSufixo}`;

const TEST_PHONE_2 =
  `117${telefoneSufixo}`;
  
let freelancerId: number;
let termoUsoId: number;
let termoLgpdId: number;

describe("Upload de documento + sincronizacao do cadastro", () => {

  beforeAll(async () => {
    /*
     * Cria um freelancer exclusivo para o teste.
     *
     * Não usamos o freelancer id=1 para não alterar
     * os dados utilizados nos testes manuais.
     */
const [result]: any = await db.query(
  `
  INSERT INTO freelancer (
    auth_user_id,
    cpf,
    nome,
    data_nascimento,
    email,
    telefone_whatsapp,
    tipo_chave_pix,
    chave_pix,
    email_verificado,
    whatsapp_verificado,
    status,
    cadastro_status
  )
  VALUES (
    ?,
    ?,
    'Freelancer Integracao',
    '1990-01-12',
    ?,
    ?,
    'CPF',
    ?,
    0,
    0,
    'DISPONIVEL',
    'INCOMPLETO'
  )
  `,
  [
    AUTH_USER_ID,
    TEST_CPF,
    TEST_EMAIL,
    TEST_WHATSAPP,
    TEST_CPF,
  ]
);


    freelancerId = result.insertId;

    /*
     * Endereco principal.
     *
     * ATENCAO:
     * os nomes das colunas precisam corresponder
     * à estrutura real da sua freelancer_endereco.
     */
    await db.query(
      `
      INSERT INTO freelancer_endereco (
        freelancer_id,
        cep,
        logradouro,
        numero,
        bairro,
        cidade,
        estado,
        principal,
        ativo
      )
      VALUES (
        ?,
        '06300000',
        'Rua Teste',
        '100',
        'Centro',
        'Carapicuiba',
        'SP',
        1,
        1
      )
      `,
      [freelancerId]
    );

    /*
     * Dois contatos de emergencia.
     *
     * Da mesma forma, ajuste somente se sua tabela
     * utilizar nomes diferentes.
     */
   await db.query(
  `
  INSERT INTO freelancer_contato_emergencia (
    freelancer_id,
    ordem,
    nome,
    telefone,
    parentesco
  )
  VALUES
    (?, 1, 'Contato Teste 1', ?, 'AMIGO'),
    (?, 2, 'Contato Teste 2', ?, 'AMIGO')
  `,
  [
    freelancerId,
    TEST_PHONE_1,

    freelancerId,
    TEST_PHONE_2,
  ]
);

    /*
     * Biometria já enviada, mas ainda não avaliada.
     *
     * Dessa maneira o único item de completude
     * que falta antes do upload será o documento.
     */
    await db.query(
      `
      INSERT INTO freelancer_biometria (
        freelancer_id,
        finalidade,
        storage_provider,
        storage_key,
        checksum_sha256,
        liveness_status,
        ativo
      )
      VALUES (
        ?,
        'CADASTRO',
        'MINIO',
        ?,
        ?,
        'NAO_AVALIADO',
        1
      )
      `,
      [
        freelancerId,
        `tests/${freelancerId}/selfie.jpg`,
        "a".repeat(64),
      ]
    );

    /*
     * Localiza os dois termos vigentes.
     */
    const [terms]: any = await db.query(
      `
      SELECT id, tipo
      FROM termo
      WHERE ativo = 1
        AND obrigatorio = 1
        AND vigencia_inicio <= NOW(3)
        AND (
          vigencia_fim IS NULL
          OR vigencia_fim > NOW(3)
        )
      `
    );

    const termoUso =
      terms.find(
        (t: any) =>
          t.tipo === "TERMOS_USO"
      );

    const termoLgpd =
      terms.find(
        (t: any) =>
          t.tipo === "PRIVACIDADE_LGPD"
      );

    if (!termoUso || !termoLgpd) {
      throw new Error(
        "Termos obrigatorios de teste nao encontrados"
      );
    }

    termoUsoId = termoUso.id;
    termoLgpdId = termoLgpd.id;

    /*
     * Aceita os dois termos.
     */
    await db.query(
      `
      INSERT INTO aceite_termo (
        freelancer_id,
        termo_id,
        ip,
        user_agent,
        correlation_id
      )
      VALUES
        (?, ?, '127.0.0.1', 'vitest', 'integration-test'),
        (?, ?, '127.0.0.1', 'vitest', 'integration-test')
      `,
      [
        freelancerId,
        termoUsoId,
        freelancerId,
        termoLgpdId,
      ]
    );
  });


  beforeEach(async () => {
    /*
     * Remove documentos de execuções anteriores.
     */
    await db.query(
      `
      DELETE FROM freelancer_documento
      WHERE freelancer_id = ?
      `,
      [freelancerId]
    );

    /*
     * Garante o estado inicial.
     */
    await db.query(
      `
      UPDATE freelancer
      SET cadastro_status = 'INCOMPLETO'
      WHERE id = ?
      `,
      [freelancerId]
    );
  });


  afterAll(async () => {
    /*
     * Limpeza em ordem por causa das FKs.
     */

    await db.query(
      `
      DELETE FROM freelancer_documento
      WHERE freelancer_id = ?
      `,
      [freelancerId]
    );

    await db.query(
      `
      DELETE FROM aceite_termo
      WHERE freelancer_id = ?
      `,
      [freelancerId]
    );

    await db.query(
      `
      DELETE FROM freelancer_biometria
      WHERE freelancer_id = ?
      `,
      [freelancerId]
    );

    await db.query(
      `
      DELETE FROM freelancer_contato_emergencia
      WHERE freelancer_id = ?
      `,
      [freelancerId]
    );

    await db.query(
      `
      DELETE FROM freelancer_endereco
      WHERE freelancer_id = ?
      `,
      [freelancerId]
    );

    await db.query(
      `
      DELETE FROM freelancer
      WHERE id = ?
      `,
      [freelancerId]
    );

    await db.end();
  });


  it(
    "deve alterar INCOMPLETO para PENDENTE_VALIDACAO apos upload do documento",
    async () => {

      /*
       * Confirma o estado inicial.
       */
      const [beforeRows]: any =
        await db.query(
          `
          SELECT cadastro_status
          FROM freelancer
          WHERE id = ?
          `,
          [freelancerId]
        );

      expect(
        beforeRows[0].cadastro_status
      ).toBe("INCOMPLETO");


      /*
       * PDF mínimo para passar pela nossa
       * validação de magic bytes.
       */
      const fileBuffer = Buffer.from(
        "%PDF-1.4\nIntegration Test\n%%EOF"
      );

      const file =
        {
          fieldname: "file",
          originalname: "rg-integracao.pdf",
          encoding: "7bit",
          mimetype: "application/pdf",
          size: fileBuffer.length,
          buffer: fileBuffer,
        } as Express.Multer.File;


      /*
       * Este método deve:
       *
       * 1. validar arquivo
       * 2. mockar upload MinIO
       * 3. registrar documento
       * 4. sincronizar cadastro_status
       */
      await uploadFreelancerDocument({
        authUserId: AUTH_USER_ID,
        correlationId:
          "integration-document-upload",
        tipo: "RG",
        file,
      });


      /*
       * Confirma que o documento realmente
       * foi persistido.
       */
      const [documents]: any =
        await db.query(
          `
          SELECT
            tipo,
            status
          FROM freelancer_documento
          WHERE freelancer_id = ?
          ORDER BY id DESC
          LIMIT 1
          `,
          [freelancerId]
        );

      expect(documents).toHaveLength(1);

      expect(
        documents[0].tipo
      ).toBe("RG");

      expect(
        documents[0].status
      ).toBe("PENDENTE");


      /*
       * Agora a regra principal do teste.
       */
      const [afterRows]: any =
        await db.query(
          `
          SELECT cadastro_status
          FROM freelancer
          WHERE id = ?
          `,
          [freelancerId]
        );

      expect(
        afterRows[0].cadastro_status
      ).toBe("PENDENTE_VALIDACAO");
    }
  );

});