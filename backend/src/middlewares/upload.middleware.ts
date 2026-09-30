import multer from 'multer';
import { ambiente } from '@/configuracao/ambiente';

// Memoria, nao disco: o buffer precisa passar pelo file-type (magic number)
// e pelo sharp antes de qualquer coisa ser gravada — nunca confiar no
// nome/Content-Type que o cliente declarou.
export const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: ambiente.TAMANHO_MAXIMO_AVATAR_MB * 1024 * 1024, files: 1 },
});

// RF-32: mesmo raciocinio do avatar — o buffer precisa passar por
// fileTypeFromBuffer antes de qualquer coisa ser gravada em disco.
export const uploadAnexo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: ambiente.TAMANHO_MAXIMO_ANEXO_MB * 1024 * 1024, files: 5 },
});
