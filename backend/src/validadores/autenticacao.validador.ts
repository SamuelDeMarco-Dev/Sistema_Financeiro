import { z } from 'zod';

// RN-52 + 04-API.md §7.1: 8-72 (bcrypt trunca acima disso), com ao menos
// 1 maiuscula, 1 minuscula, 1 digito e 1 simbolo.
const senhaSchema = z
  .string()
  .min(8, 'A senha deve ter no minimo 8 caracteres.')
  .max(72, 'A senha deve ter no maximo 72 caracteres.')
  .regex(/[a-z]/, 'A senha deve conter ao menos uma letra minuscula.')
  .regex(/[A-Z]/, 'A senha deve conter ao menos uma letra maiuscula.')
  .regex(/\d/, 'A senha deve conter ao menos um digito.')
  .regex(/[^A-Za-z0-9]/, 'A senha deve conter ao menos um simbolo.');

export const cadastrarSchema = z.object({
  body: z
    .object({
      nome: z.string().trim().min(3, 'O nome deve ter no minimo 3 caracteres.').max(120),
      email: z.string().trim().email('E-mail invalido.'),
      senha: senhaSchema,
      confirmacaoSenha: z.string(),
    })
    .refine((dados) => dados.senha === dados.confirmacaoSenha, {
      message: 'A confirmacao de senha nao corresponde a senha informada.',
      path: ['confirmacaoSenha'],
    }),
});

export type CadastrarDTO = z.infer<typeof cadastrarSchema>['body'];

export const entrarSchema = z.object({
  body: z.object({
    email: z.string().trim().email('E-mail invalido.'),
    // Nao aplica as regras de forca aqui: e login, nao cadastro — a senha
    // ja e o que o usuario tem, nao o que o sistema esta validando agora.
    senha: z.string().min(1, 'Informe a senha.'),
    lembrarMe: z.boolean().default(false),
  }),
});

export type EntrarDTO = z.infer<typeof entrarSchema>['body'];
