import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileTypeFromBuffer } from 'file-type';
import { ambiente } from '@/configuracao/ambiente';
import {
  EXTENSOES_POR_MIME_ANEXO,
  LIMITE_ANEXOS_POR_MOVIMENTACAO,
  TIPOS_MIME_ANEXO_PERMITIDOS,
} from '@/configuracao/constantes';
import {
  NaoEncontradoErro,
  RegraNegocioErro,
  TipoArquivoInvalidoErro,
  ValidacaoErro,
} from '@/erros';
import { AnexoRepositorio } from '@/repositorios/anexo.repositorio';
import type { DadosCriarAnexo } from '@/repositorios/anexo.repositorio';
import { MovimentacaoRepositorio } from '@/repositorios/movimentacao.repositorio';
import { mapearAnexo } from '@/utilitarios/mapear-anexo';
import type { AnexoDTO } from '@/utilitarios/mapear-anexo';
import type { Anexo } from '@prisma/client';

// Remove caracteres de controle (ex.: \r\n) que quebrariam o header
// Content-Disposition — a regex os cita de proposito.
function sanitizarNomeOriginal(nome: string): string {
  // eslint-disable-next-line no-control-regex
  const semControle = nome.replace(/[\x00-\x1f"]/g, '');
  const base = path.basename(semControle).replace(/[/\\]/g, '_');
  return base.slice(0, 255) || 'arquivo';
}

export class AnexoServico {
  constructor(
    private readonly repositorio = new AnexoRepositorio(),
    private readonly movimentacaoRepositorio = new MovimentacaoRepositorio(),
  ) {}

  /** RF-32: extensao no disco vem do *magic number* detectado, nunca do
   * nome/extensao declarados pelo cliente — um `.exe` renomeado para
   * `.pdf` e rejeitado aqui, antes de qualquer escrita. Caminho
   * `<uploads>/anexos/<usuarioId>/<ano>/<mes>/<uuid>.<ext>` (issue #40). */
  async enviar(
    movimentacaoId: string,
    usuarioId: string,
    arquivos: Express.Multer.File[],
  ): Promise<AnexoDTO[]> {
    if (arquivos.length === 0) {
      throw new ValidacaoErro('Envie ao menos um arquivo no campo "arquivo".');
    }

    const movimentacao = await this.movimentacaoRepositorio.buscarPorId(movimentacaoId, usuarioId);
    if (!movimentacao) {
      throw new NaoEncontradoErro('Movimentação não encontrada.');
    }

    const existentes = await this.repositorio.contarPorMovimentacao(movimentacaoId);
    if (existentes + arquivos.length > LIMITE_ANEXOS_POR_MOVIMENTACAO) {
      throw new RegraNegocioErro(
        `Esta movimentação já tem ${existentes} anexo(s) — o limite é ${LIMITE_ANEXOS_POR_MOVIMENTACAO}.`,
        [{ campo: 'arquivo', mensagem: 'Remova um anexo existente antes de enviar mais.' }],
      );
    }

    const agora = new Date();
    const diretorio = this.diretorioDoMes(usuarioId, agora);
    await mkdir(diretorio, { recursive: true });

    const dadosParaCriar: DadosCriarAnexo[] = [];
    for (const arquivo of arquivos) {
      const tipoDetectado = await fileTypeFromBuffer(arquivo.buffer);
      if (!tipoDetectado || !TIPOS_MIME_ANEXO_PERMITIDOS.has(tipoDetectado.mime)) {
        throw new TipoArquivoInvalidoErro('Tipo de arquivo não suportado. Envie PDF, JPEG ou PNG.');
      }

      const extensao = EXTENSOES_POR_MIME_ANEXO.get(tipoDetectado.mime) ?? 'bin';
      const nomeArmazenado = `${randomUUID()}.${extensao}`;
      const caminho = path.join(diretorio, nomeArmazenado);
      await writeFile(caminho, arquivo.buffer);

      dadosParaCriar.push({
        movimentacaoId,
        usuarioId,
        nomeOriginal: sanitizarNomeOriginal(arquivo.originalname),
        nomeArmazenado,
        caminho,
        tipoMime: tipoDetectado.mime,
        tamanhoBytes: arquivo.size,
      });
    }

    const criados = await this.repositorio.criarVarios(dadosParaCriar);
    return criados.map(mapearAnexo);
  }

  /** RN-51: 404 tanto para anexo de outro usuario quanto para anexo cuja
   * movimentacao ja foi excluida. */
  async buscarConteudo(id: string, usuarioId: string): Promise<Anexo> {
    const anexo = await this.repositorio.buscarPorId(id, usuarioId);
    if (!anexo) {
      throw new NaoEncontradoErro('Anexo não encontrado.');
    }
    return anexo;
  }

  async excluir(id: string, usuarioId: string): Promise<void> {
    const anexo = await this.repositorio.buscarPorId(id, usuarioId);
    if (!anexo) {
      throw new NaoEncontradoErro('Anexo não encontrado.');
    }
    await this.repositorio.excluir(id);
    // best-effort: o objetivo e o arquivo nao existir mais, nao que o
    // unlink "tenha sucesso" — se ja estiver ausente, nao e erro.
    await unlink(anexo.caminho).catch(() => undefined);
  }

  /** Chamado por MovimentacaoServico ao excluir (logicamente) uma ou mais
   * movimentacoes — remove os arquivos do disco e os registros do banco,
   * ja que a exclusao logica da movimentacao nao dispara o
   * `onDelete: Cascade` do schema (esse so vale para DELETE fisico). */
  async excluirPorMovimentacoes(movimentacaoIds: string[]): Promise<void> {
    const anexos = await this.repositorio.listarPorMovimentacoes(movimentacaoIds);
    if (anexos.length === 0) return;

    await Promise.allSettled(anexos.map((anexo) => unlink(anexo.caminho)));
    await this.repositorio.excluirPorMovimentacoes(movimentacaoIds);
  }

  private diretorioDoMes(usuarioId: string, data: Date): string {
    const ano = String(data.getUTCFullYear());
    const mes = String(data.getUTCMonth() + 1).padStart(2, '0');
    return path.join(ambiente.DIRETORIO_UPLOADS, 'anexos', usuarioId, ano, mes);
  }
}
