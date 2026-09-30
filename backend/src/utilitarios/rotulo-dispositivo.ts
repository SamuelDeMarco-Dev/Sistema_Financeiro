// Ordem importa: UAs de Edge/Opera tambem contem "Chrome", e quase todo
// navegador (inclusive Chrome) inclui "Safari/x" por compatibilidade — por
// isso Safari fica por ultimo, so pega quem sobrou.
const NAVEGADORES: [RegExp, string][] = [
  [/edg\//i, 'Edge'],
  [/opr\//i, 'Opera'],
  [/chrome\//i, 'Chrome'],
  [/firefox\//i, 'Firefox'],
  [/safari\//i, 'Safari'],
];

const SISTEMAS: [RegExp, string][] = [
  [/windows/i, 'Windows'],
  // iOS antes de macOS: o UA do iPhone/iPad inclui "like Mac OS X" como
  // string de compatibilidade.
  [/iphone|ipad|ios/i, 'iOS'],
  [/mac os x|macintosh/i, 'macOS'],
  [/android/i, 'Android'],
  [/linux/i, 'Linux'],
];

/** "Chrome · Windows" (04-API.md §7.9) — o suficiente para o usuario
 * reconhecer o dispositivo na lista de sessoes, sem depender de uma lib de
 * parsing completa de user-agent. */
export function rotularDispositivo(userAgent: string | null): string {
  if (!userAgent) return 'Dispositivo desconhecido';

  const navegador =
    NAVEGADORES.find(([regex]) => regex.test(userAgent))?.[1] ?? 'Navegador desconhecido';
  const sistema = SISTEMAS.find(([regex]) => regex.test(userAgent))?.[1] ?? 'Sistema desconhecido';

  return `${navegador} · ${sistema}`;
}
