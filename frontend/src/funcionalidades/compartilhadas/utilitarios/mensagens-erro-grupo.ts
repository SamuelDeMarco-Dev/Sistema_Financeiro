import type { ErroApi } from '@/servicos/erro-api';
import { traduzirErroApi } from '@/utilitarios/traduzir-erro-api';

/** Erro de conflito num fluxo de administracao de grupo raramente e' erro
 * de digitacao: e' um estado do grupo que o usuario nao estava vendo. Cada
 * mensagem aqui, alem de dizer o que houve, aponta a saida — sem isso o
 * usuario reenvia o mesmo formulario e recebe o mesmo 409. */
export function mensagemErroConvite(erro: ErroApi): string {
  switch (erro.codigo) {
    // RN-36: um unico convite PENDENTE por e-mail em cada grupo.
    case 'CONVITE_DUPLICADO':
      return 'Já existe um convite pendente para este e-mail neste grupo. Cancele o convite anterior na lista de pendentes para enviar um novo.';
    // RN-38: quem ja e' membro nao pode ser convidado outra vez.
    case 'JA_E_MEMBRO':
      return 'Esta pessoa já faz parte do grupo. Para mudar o que ela pode fazer, altere o papel dela na lista de membros.';
    case 'LIMITE_EXCEDIDO':
      return 'Muitos convites enviados em pouco tempo. Aguarde alguns minutos antes de convidar outra pessoa.';
    default:
      return traduzirErroApi(erro);
  }
}

export type AcaoSobreMembro = 'remover' | 'sair' | 'alterar-papel';

/** RN-29 responde o mesmo `ADMINISTRADOR_UNICO` para sair e para remover,
 * mas a saida e' diferente em cada caso: quem tenta sair transfere a
 * propria administracao; quem tenta remover o administrador nao pode
 * transferir por ele. */
export function mensagemErroMembro(erro: ErroApi, acao: AcaoSobreMembro): string {
  if (erro.codigo === 'ADMINISTRADOR_UNICO') {
    switch (acao) {
      case 'sair':
        return 'Você administra este grupo e ele não pode ficar sem administrador. Transfira a administração a outro membro e então saia.';
      case 'remover':
        return 'O administrador do grupo não pode ser removido. Ele precisa transferir a administração antes de deixar o grupo.';
      case 'alterar-papel':
        return 'O papel do administrador não muda por aqui. Use "Transferir administração" para passar o posto a outro membro.';
    }
  }

  return traduzirErroApi(erro);
}
