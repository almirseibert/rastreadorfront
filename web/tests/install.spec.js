import { test, expect } from '@playwright/test';

// Degradação do módulo do instalador quando o argos-api não está roteado.
//
// Cenário real: o frontend novo é publicado antes de a regra de proxy /argos existir no
// EasyPanel. A requisição cai no servidor web do Traccar, que devolve o index.html da SPA
// (ou um 404 em HTML). Antes, esse HTML ia cru para o snackbar; agora a tela explica.

const SERVER = {
  id: 1,
  registration: false,
  readonly: false,
  deviceReadonly: false,
  limitCommands: false,
  disableReports: false,
  forceSettings: false,
  map: 'locationIqStreets',
  attributes: {},
};

// Administrador: sem perfil atribuído, vê todas as páginas (inclusive /install).
const USER = {
  id: 1,
  name: 'Admin',
  email: 'admin@example.com',
  administrator: true,
  readonly: false,
  deviceReadonly: false,
  disableReports: false,
  userLimit: -1,
  deviceLimit: -1,
  attributes: {},
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
};

test.describe('módulo do instalador sem o argos-api', () => {
  test('explica a indisponibilidade em vez de mostrar o HTML do 404', async ({ page }) => {
    await mockBackend(page);
    // É exatamente o que o servidor web do Traccar responde num caminho desconhecido.
    await page.route('**/argos/**', (route) =>
      route.fulfill({
        status: 404,
        contentType: 'text/html',
        body: '<!DOCTYPE html><html><head><title>Error 404</title></head><body>Not Found</body></html>',
      }),
    );

    await page.goto('/install');

    await expect(page.getByText('Installation module unavailable')).toBeVisible({
      timeout: 20_000,
    });
    // O trecho de HTML não pode aparecer na tela.
    await expect(page.getByText('DOCTYPE')).toHaveCount(0);
    await expect(page.getByText('Not Found')).toHaveCount(0);
  });

  test('com o serviço no ar, lista as ordens', async ({ page }) => {
    await mockBackend(page);
    await page.route('**/argos/orders**', (route) =>
      json(route, {
        items: [
          {
            id: 7,
            code: 'ARG-2026-000007',
            status: 'em_andamento',
            device_unique_id: '860123456789012',
            vehicle_plate: 'ABC1D23',
            created_at: '2026-11-06T14:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 100,
      }),
    );

    await page.goto('/install');

    await expect(page.getByText('ARG-2026-000007')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Installation module unavailable')).toHaveCount(0);
  });
});
