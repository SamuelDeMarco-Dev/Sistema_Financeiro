import { beforeEach, describe, expect, it, vi } from 'vitest';
import { enviarEmail } from '@/utilitarios/email/enviador';
import { registrador } from '@/utilitarios/registrador';

const { sendMailMockado } = vi.hoisted(() => ({ sendMailMockado: vi.fn() }));

vi.mock('nodemailer', () => ({
  default: { createTransport: () => ({ sendMail: sendMailMockado }) },
}));

describe('utilitarios/email/enviador', () => {
  beforeEach(() => {
    sendMailMockado.mockReset();
  });

  it('envia com os campos corretos quando o SMTP responde', async () => {
    sendMailMockado.mockResolvedValue(undefined);

    await enviarEmail({ para: 'samuel@exemplo.com', assunto: 'Assunto', html: '<p>Corpo</p>' });

    expect(sendMailMockado).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'samuel@exemplo.com',
        subject: 'Assunto',
        html: '<p>Corpo</p>',
      }),
    );
  });

  it('nunca lanca quando o SMTP falha — apenas loga o erro', async () => {
    sendMailMockado.mockRejectedValue(new Error('Conexao recusada'));
    const espiao = vi.spyOn(registrador, 'error').mockImplementation(() => registrador);

    await expect(
      enviarEmail({ para: 'samuel@exemplo.com', assunto: 'Assunto', html: '<p>Corpo</p>' }),
    ).resolves.toBeUndefined();

    expect(espiao).toHaveBeenCalledOnce();
    espiao.mockRestore();
  });
});
