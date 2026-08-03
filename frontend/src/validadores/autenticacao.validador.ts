import { z } from 'zod';

// Espelha backend/src/validadores/autenticacao.validador.ts (RN-52 +
// 04-API.md §7.1) — validar aqui so antecipa o feedback ao usuario; a
// validacao que garante a regra continua sendo a do backend.
const senhaSchema = z
  .string()
  .min(8, 'A senha deve ter no minimo 8 caracteres.')
  .max(72, 'A senha deve ter no maximo 72 caracteres.')
  .regex(/[a-z]/, 'A senha deve conter ao menos uma letra minuscula.')
  .regex(/[A-Z]/, 'A senha deve conter ao menos uma letra maiuscula.')
  .regex(/\d/, 'A senha deve conter ao menos um digito.')
  .regex(/[^A-Za-z0-9]/, 'A senha deve conter ao menos um simbolo.');

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Informe o e-mail.').email('E-mail invalido.'),
  // Sem regras de forca aqui: e login, nao cadastro — a senha ja e o que
  // o usuario tem, nao o que o sistema esta validando agora.
  senha: z.string().min(1, 'Informe a senha.'),
  lembrarMe: z.boolean(),
});

export type LoginFormulario = z.infer<typeof loginSchema>;

export const cadastroSchema = z
  .object({
    nome: z
      .string()
      .trim()
      .min(3, 'O nome deve ter no minimo 3 caracteres.')
      .max(120, 'O nome deve ter no maximo 120 caracteres.'),
    email: z.string().trim().min(1, 'Informe o e-mail.').email('E-mail invalido.'),
    senha: senhaSchema,
    confirmacaoSenha: z.string().min(1, 'Confirme a senha.'),
  })
  .refine((dados) => dados.senha === dados.confirmacaoSenha, {
    message: 'A confirmacao de senha nao corresponde a senha informada.',
    path: ['confirmacaoSenha'],
  });

export type CadastroFormulario = z.infer<typeof cadastroSchema>;
