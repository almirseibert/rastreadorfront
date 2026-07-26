import { test, expect } from '@playwright/test';

// Smoke test básico: a aplicação sobe e cai na tela de login (sem sessão).
// Seletores por tipo/estrutura para não depender do idioma da UI.
test('carrega a aplicação e mostra o login', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeVisible();
});

// Caminho autenticado: só roda com credenciais no ambiente e backend acessível.
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.describe('sessão autenticada', () => {
  test.skip(!email || !password, 'Defina E2E_EMAIL e E2E_PASSWORD para rodar este teste');

  test('faz login e renderiza o mapa', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type="text"]').first().fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.locator('button[type="submit"]').click();

    // O mapa MapLibre monta um canvas quando a home carrega.
    await expect(page.locator('.maplibregl-canvas')).toBeVisible({ timeout: 20_000 });
  });
});
