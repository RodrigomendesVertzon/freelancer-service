import { z } from "zod";
import { isValidCpf } from "../utils/cpf";

const contato = z.object({
  nome: z.string().min(2).max(150),
  telefone: z.string().min(8).max(20),
  parentesco: z.string().max(80).optional().nullable()
});

export const createFreelancerSchema = z.object({
  cpf: z.string().transform(v => v.replace(/\D/g, "")).refine(isValidCpf, "CPF invalido"),
  nome: z.string().min(3).max(150),
  dataNascimento: z.coerce.date(),
  email: z.string().email().max(254),
  whatsapp: z.string().min(8).max(20),
  chavePix: z.string().min(1).max(150),
  tipoChavePix: z.enum(["CPF", "EMAIL", "TELEFONE", "ALEATORIA"]),
  endereco: z.object({
    cep: z.string().transform(v => v.replace(/\D/g, "")).refine(v => /^\d{8}$/.test(v), "CEP invalido"),
    logradouro: z.string().min(2).max(180),
    numero: z.string().min(1).max(20),
    complemento: z.string().max(100).optional().nullable(),
    bairro: z.string().min(2).max(100),
    cidade: z.string().min(2).max(100),
    estado: z.string().length(2).transform(v => v.toUpperCase())
  }),
  contatosEmergencia: z.array(contato).length(2)
}).superRefine((data, ctx) => {
  if (data.contatosEmergencia[0].telefone === data.contatosEmergencia[1].telefone) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["contatosEmergencia"],
      message: "Os dois contatos de emergencia devem possuir telefones distintos"
    });
  }
});

export type CreateFreelancerInput = z.infer<typeof createFreelancerSchema>;
