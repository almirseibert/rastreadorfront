import { test, expect } from '@playwright/test';

// Perfis de acesso (common/util/pages.js + useAccess.js) com o backend inteiro mockado:
// o teste roda sem Traccar acessível, o que o torna útil em CI.
//
// Cenário: usuário comum com o perfil "cliente", que concede apenas Mapa e Viagens.
// Esperado: o trilho mostra só essas entradas e a URL de um relatório redireciona.

const PROFILES = {
  v: 1,
  profiles: [
    {
      id: 'cliente',
      name: 'Cliente',
      default: true,
      pages: { map: 'view', trips: 'view' },
    },
  ],
};

const SERVER = {
  id: 1,
  registration: false,
  readonly: false,
  deviceReadonly: false,
  limitCommands: false,
  disableReports: false,
  forceSettings: false,
  map: 'locationIqStreets',
  attributes: { 'argos.profiles': JSON.stringify(PROFILES) },
};

const USER = {
  id: 10,
  name: 'Cliente Teste',
  email: 'cliente@example.com',
  administrator: false,
  readonly: false,
  deviceReadonly: false,
  disableReports: false,
  userLimit: 0,
  deviceLimit: -1,
  attributes: { 'argos.profile': 'cliente' },
};

const json = (route, body) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

const mockBackend = async (page) => {
  await page.route('**/api/server', (route) => json(route, SERVER));
  await page.route('**/api/session', (route) => json(route, USER));
  await page.route('**/api/devices**', (route) => json(route, []));
  await page.route('**/api/groups**', (route) => json(route, []));
  await page.route('**/api/geofences**', (route) => json(route, []));
  await page.route('**/api/drivers**', (route) => json(route, []));
  await page.route('**/api/maintenance**', (route) => json(route, []));
  await page.route('**/api/calendars**', (route) => json(route, []));
  await page.route('**/api/notifications**', (route) => json(route, []));
  await page.route('**/api/reports/**', (route) => json(route, []));
};

// O trilho lateral (desktop) é a referência: cada item é um <button> com rótulo curto.
const railLabels = async (page) => {
  const buttons = page.locator('button:has(svg) >> css=span');
  await expect(buttons.first()).toBeVisible({ timeout: 20_000 });
  return (await buttons.allTextContents()).map((it) => it.trim()).filter(Boolean);
};

test.describe('perfis de acesso', () => {
  test('o trilho mostra apenas as páginas concedidas pelo perfil', async ({ page }) => {
    await mockBackend(page);
    await page.goto('/');

    const labels = await railLabels(page);
    expect(labels).toContain('Map');
    expect(labels).toContain('Trips');
    // Concedidos? Não: o perfil "cliente" deste teste não inclui relatórios nem painel.
    expect(labels).not.toContain('Reports');
    expect(labels).not.toContain('Dashboard');
  });

  test('digitar a URL de uma página não concedida redireciona', async ({ page }) => {
    await mockBackend(page);
    await page.goto('/reports/combined');

    // RequirePage manda para a primeira página permitida (o mapa).
    await expect(page).toHaveURL(/\/$/, { timeout: 20_000 });
  });
});
