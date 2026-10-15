import {
  describe,
  expect,
  it,
} from "vitest";

import {
  determineCadastroStatus,
} from "./registrationService";

describe("determineCadastroStatus", () => {

  it("deve retornar INCOMPLETO quando faltam dados", () => {
    const result = determineCadastroStatus({
      cadastroCompleto: false,

      dadosFaltantes: [
        "DOCUMENTO_IDENTIFICACAO",
      ],

      validacoesPendentes: [],
      problemasValidacao: [],
    });

    expect(result).toBe("INCOMPLETO");
  });


  it("deve retornar PENDENTE_VALIDACAO quando cadastro esta completo mas existem validacoes pendentes", () => {
    const result = determineCadastroStatus({
      cadastroCompleto: true,

      dadosFaltantes: [],

      validacoesPendentes: [
        "EMAIL",
        "WHATSAPP",
        "DOCUMENTO",
        "BIOMETRIA_LIVENESS",
      ],

      problemasValidacao: [],
    });

    expect(result).toBe(
      "PENDENTE_VALIDACAO"
    );
  });


  it("deve retornar REJEITADO quando documento foi rejeitado", () => {
    const result = determineCadastroStatus({
      cadastroCompleto: true,

      dadosFaltantes: [],

      validacoesPendentes: [],

      problemasValidacao: [
        "DOCUMENTO",
      ],
    });

    expect(result).toBe("REJEITADO");
  });


  it("deve priorizar REJEITADO mesmo quando existem outras validacoes pendentes", () => {
    const result = determineCadastroStatus({
      cadastroCompleto: true,

      dadosFaltantes: [],

      validacoesPendentes: [
        "EMAIL",
      ],

      problemasValidacao: [
        "BIOMETRIA_LIVENESS",
      ],
    });

    expect(result).toBe("REJEITADO");
  });


  it("deve retornar ATIVO somente quando cadastro esta completo e nenhuma validacao esta pendente ou rejeitada", () => {
    const result = determineCadastroStatus({
      cadastroCompleto: true,

      dadosFaltantes: [],
      validacoesPendentes: [],
      problemasValidacao: [],
    });

    expect(result).toBe("ATIVO");
  });

});