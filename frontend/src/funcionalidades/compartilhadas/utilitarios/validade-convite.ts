const UM_DIA_MS = 24 * 60 * 60 * 1000;

/** Dias inteiros restantes até a expiração, arredondando para cima: um
 * convite que vence em 30 minutos ainda mostra "1 dia", nunca "0 dias" —
 * enquanto vale, o texto não pode sugerir que já venceu. Negativo quando
 * já passou. */
export function diasAteExpirar(expiraEmIso: string, agora: Date = new Date()): number {
  const restanteMs = new Date(expiraEmIso).getTime() - agora.getTime();
  return Math.ceil(restanteMs / UM_DIA_MS);
}

export function rotuloValidadeConvite(expiraEmIso: string, agora: Date = new Date()): string {
  const dias = diasAteExpirar(expiraEmIso, agora);
  if (dias <= 0) return 'Expirado';
  if (dias === 1) return 'Expira hoje';
  return `Expira em ${dias} dias`;
}
