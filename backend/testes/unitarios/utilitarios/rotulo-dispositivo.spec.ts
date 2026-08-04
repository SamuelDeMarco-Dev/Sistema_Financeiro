import { describe, expect, it } from 'vitest';
import { rotularDispositivo } from '@/utilitarios/rotulo-dispositivo';

const CHROME_WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const SAFARI_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15';
const FIREFOX_LINUX = 'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0';
const EDGE_WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';
const CHROME_ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const SAFARI_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1';

describe('rotularDispositivo', () => {
  it('retorna "Dispositivo desconhecido" quando nao ha user-agent', () => {
    expect(rotularDispositivo(null)).toBe('Dispositivo desconhecido');
  });

  it.each([
    [CHROME_WINDOWS, 'Chrome · Windows'],
    [SAFARI_MAC, 'Safari · macOS'],
    [FIREFOX_LINUX, 'Firefox · Linux'],
    [EDGE_WINDOWS, 'Edge · Windows'],
    [CHROME_ANDROID, 'Chrome · Android'],
    [SAFARI_IPHONE, 'Safari · iOS'],
  ])('%s => %s', (userAgent, esperado) => {
    expect(rotularDispositivo(userAgent)).toBe(esperado);
  });

  it('nao lanca para um user-agent desconhecido', () => {
    expect(rotularDispositivo('um-cliente-qualquer/1.0')).toBe(
      'Navegador desconhecido · Sistema desconhecido',
    );
  });
});
