import { mkdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';
import { executarTransacao } from '@/banco/transacao';
import { ambiente } from '@/configuracao/ambiente';
import {
  TAMANHO_THUMBNAIL_AVATAR_PX,
  TIPOS_MIME_AVATAR_PERMITIDOS,
} from '@/configuracao/constantes';
import { NaoEncontradoErro, TipoArquivoInvalidoErro } from '@/erros';
import { PerfilRepositorio } from '@/repositorios/perfil.repositorio';
import { UsuarioRepositorio } from '@/repositorios/usuario.repositorio';
import { mapearPerfilCompleto } from '@/utilitarios/mapear-perfil';
import type { PerfilCompleto } from '@/utilitarios/mapear-perfil';
import type { AtualizarPerfilDTO } from '@/validadores/perfil.validador';
import type { Prisma } from '@prisma/client';

const QUALIDADE_WEBP = 85;

function caminhosAvatar(usuarioId: string): { diretorio: string; foto: string; thumb: string } {
  const diretorio = path.join(ambiente.DIRETORIO_UPLOADS, 'avatares');
  return {
    diretorio,
    foto: path.join(diretorio, `${usuarioId}.webp`),
    thumb: path.join(diretorio, `${usuarioId}-thumb.webp`),
  };
}

export class PerfilServico {
  constructor(
    private readonly perfilRepositorio = new PerfilRepositorio(),
    private readonly usuarioRepositorio = new UsuarioRepositorio(),
  ) {}

  async consultar(usuarioId: string): Promise<PerfilCompleto> {
    const usuario = await this.usuarioRepositorio.buscarPorId(usuarioId);
    if (!usuario?.perfil) {
      throw new NaoEncontradoErro('Perfil não encontrado.');
    }
    return mapearPerfilCompleto(usuario, usuario.perfil);
  }

  /** RF-10: `nome` mora em Usuario; o resto, em Perfil — quando os dois
   * vem juntos no PATCH, a escrita e atomica. */
  async atualizar(usuarioId: string, dados: AtualizarPerfilDTO): Promise<PerfilCompleto> {
    const { nome, ...camposPerfil } = dados;
    // Zod so inclui uma chave opcional quando o cliente a enviou, mas o
    // tipo inferido ainda permite `valor: undefined` — exactOptionalPropertyTypes
    // exige que a gente prove isso removendo o caso em runtime tambem.
    const dadosPerfil = Object.fromEntries(
      Object.entries(camposPerfil).filter(([, valor]) => valor !== undefined),
    ) as Prisma.PerfilUpdateInput;

    await executarTransacao(async (tx) => {
      if (nome !== undefined) {
        await this.usuarioRepositorio.atualizarNome(usuarioId, nome, tx);
      }
      if (Object.keys(dadosPerfil).length > 0) {
        await this.perfilRepositorio.atualizar(usuarioId, dadosPerfil, tx);
      }
    });

    return this.consultar(usuarioId);
  }

  /** RF-11: converte para WebP (nunca confia no tipo declarado — so no
   * magic number do proprio buffer), gera thumbnail 128x128 e grava com
   * nome fixo por usuario — a proxima foto sobrescreve a anterior no
   * mesmo caminho, entao nao ha orfao para limpar. */
  async atualizarFoto(usuarioId: string, arquivo: Buffer): Promise<string> {
    const tipoDetectado = await fileTypeFromBuffer(arquivo);
    if (!tipoDetectado || !TIPOS_MIME_AVATAR_PERMITIDOS.has(tipoDetectado.mime)) {
      throw new TipoArquivoInvalidoErro('Tipo de arquivo não suportado. Envie JPEG, PNG ou WebP.');
    }

    const { diretorio, foto, thumb } = caminhosAvatar(usuarioId);
    await mkdir(diretorio, { recursive: true });

    await sharp(arquivo).webp({ quality: QUALIDADE_WEBP }).toFile(foto);
    await sharp(arquivo)
      .resize(TAMANHO_THUMBNAIL_AVATAR_PX, TAMANHO_THUMBNAIL_AVATAR_PX, { fit: 'cover' })
      .webp({ quality: QUALIDADE_WEBP })
      .toFile(thumb);

    const fotoUrl = `${ambiente.URL_BASE_API}/uploads/avatares/${usuarioId}.webp`;
    await this.perfilRepositorio.definirFoto(usuarioId, fotoUrl);
    return fotoUrl;
  }

  async removerFoto(usuarioId: string): Promise<void> {
    const { foto, thumb } = caminhosAvatar(usuarioId);

    // allSettled: arquivo ja ausente (ex.: usuario nunca teve foto) nao e
    // erro — o objetivo e garantir fotoUrl null, nao que o unlink "tenha sucesso".
    await Promise.allSettled([unlink(foto), unlink(thumb)]);
    await this.perfilRepositorio.definirFoto(usuarioId, null);
  }
}
