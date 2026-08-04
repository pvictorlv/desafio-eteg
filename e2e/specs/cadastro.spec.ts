import { validarCpf } from '@desafio-eteg/contratos';
import { expect, test, type Page } from '@playwright/test';

const NOME = 'Maria Aparecida de Souza';
const COR = 'Azul';

test.describe('cadastro de cliente', () => {
  test('confirma o primeiro envio e recusa o segundo com o mesmo CPF', async ({ page }) => {
    // Cada execução usa um CPF novo: o banco da esteira não é recriado entre
    // uma e outra, e um valor fixo passaria só na primeira vez.
    const cpf = gerarCpf();

    await page.goto('/');
    await preencher(page, { cpf, email: `${cpf}@exemplo.com.br` });
    await page.getByRole('button', { name: 'Enviar cadastro' }).click();

    // O formulário sai da tela e dá lugar à confirmação — é assim que a pessoa
    // "sabe se o cadastro foi bem sucedido", como pede o enunciado.
    await expect(page.getByRole('heading', { name: /^Tudo certo/ })).toBeVisible();
    await expect(page.getByText('Protocolo')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enviar cadastro' })).toHaveCount(0);

    // Segundo envio: mesmo CPF, outro e-mail. Trocar o e-mail é o que garante
    // que a recusa venha do CPF, e não do índice único do e-mail.
    await page.goto('/');
    await preencher(page, { cpf, email: `${cpf}.segunda@exemplo.com.br` });
    await page.getByRole('button', { name: 'Enviar cadastro' }).click();

    await expect(page.getByRole('alert')).toHaveText('Este CPF já está cadastrado.');
    await expect(page.getByLabel('CPF')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByRole('heading', { name: /^Tudo certo/ })).toHaveCount(0);
  });
});

async function preencher(
  page: Page,
  { cpf, email }: { cpf: string; email: string },
): Promise<void> {
  await page.getByLabel('Nome completo').fill(NOME);
  await page.getByLabel('CPF').fill(cpf);
  await page.getByLabel('E-mail').fill(email);

  // Clica no nome da cor, que é onde a pessoa clica: o rádio fica sob a
  // amostra colorida, invisível mas focável pelo teclado. As cores só
  // aparecem depois que GET /api/cores responde.
  await page.getByText(COR, { exact: true }).click();
  await expect(page.getByRole('radio', { name: COR })).toBeChecked();
}

/**
 * CPF aleatório aprovado pelo validador do contrato.
 *
 * Reusar `validarCpf` em vez de repetir o cálculo dos dígitos verificadores:
 * é o mesmo código que a aplicação executa, então não há como o gerador e a
 * regra divergirem.
 */
function gerarCpf(): string {
  const base = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join('');

  for (let verificadores = 0; verificadores < 100; verificadores += 1) {
    const candidato = `${base}${String(verificadores).padStart(2, '0')}`;

    if (validarCpf(candidato)) {
      return candidato;
    }
  }

  // Só acontece se os nove dígitos sorteados forem todos iguais, caso que o
  // validador recusa por regra própria.
  throw new Error(`Nenhum dígito verificador torna ${base} um CPF válido.`);
}
