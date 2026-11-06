import express from 'express';
import { query } from '../db.js';
import { loadOrder } from '../auth.js';
import { audit } from '../audit.js';

const router = express.Router();

// Laudo de instalação em HTML imprimível. Não usamos puppeteer de propósito: ele adicionaria
// ~400MB à imagem e ~300MB de RAM por render, o que derruba um container pequeno; o navegador
// do usuário gera o PDF pelo próprio "Imprimir", com o mesmo layout.

const escape = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const RESULTS = { ok: 'OK', na: 'N/A', problem: 'PROBLEMA' };

const SLOT_LABELS = {
  veiculo: 'Veículo',
  placa: 'Placa',
  etiqueta_imei: 'Etiqueta / IMEI',
  local_instalacao: 'Local da instalação',
  chicote: 'Chicote / emendas',
  odometro: 'Odômetro',
  teste_bloqueio: 'Teste de bloqueio',
  assinatura: 'Assinatura do cliente',
  extra: 'Fotos adicionais',
};

const formatDate = (value) =>
  value ? new Date(value).toLocaleString('pt-BR', { timeZone: 'UTC' }) : '—';

const buildHtml = (order, items, photos, baseUrl) => {
  const field = (label, value) =>
    `<div class="field"><span class="label">${escape(label)}</span><span class="value">${escape(
      value || '—',
    )}</span></div>`;

  const rows = items
    .map(
      (item) => `<tr>
        <td>${item.position}</td>
        <td>${escape(item.label_snapshot)}</td>
        <td class="result ${item.result || 'pending'}">${RESULTS[item.result] || '—'}</td>
        <td>${escape(item.note)}</td>
      </tr>`,
    )
    .join('');

  const gallery = Object.entries(
    photos.reduce((acc, photo) => {
      acc[photo.slot] = [...(acc[photo.slot] || []), photo];
      return acc;
    }, {}),
  )
    .map(
      ([slot, slotPhotos]) => `<section class="slot">
        <h3>${escape(SLOT_LABELS[slot] || slot)}</h3>
        <div class="photos">
          ${slotPhotos
            .map(
              (photo) =>
                `<figure><img src="${baseUrl}/photos/${photo.id}" alt="${escape(slot)}" />
                 <figcaption>${formatDate(photo.created_at)}</figcaption></figure>`,
            )
            .join('')}
        </div>
      </section>`,
    )
    .join('');

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Laudo de instalação ${escape(order.code)}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: Roboto, Arial, sans-serif; color: #182438; margin: 0; font-size: 12px; }
  header { display: flex; justify-content: space-between; align-items: flex-start;
           border-bottom: 2px solid #20304a; padding-bottom: 8px; margin-bottom: 16px; }
  h1 { font-size: 18px; margin: 0; }
  h2 { font-size: 14px; margin: 20px 0 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  h3 { font-size: 12px; margin: 12px 0 6px; }
  .status { padding: 3px 10px; border-radius: 10px; background: #20304a; color: #fff;
            font-size: 11px; text-transform: uppercase; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; }
  .field { display: flex; gap: 6px; padding: 3px 0; border-bottom: 1px dotted #e4e7ec; }
  .label { color: #667085; min-width: 150px; }
  .value { font-weight: 500; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 5px 6px; border-bottom: 1px solid #e4e7ec;
           vertical-align: top; }
  th { background: #f4f6f8; font-size: 11px; text-transform: uppercase; color: #667085; }
  .result { font-weight: 700; }
  .result.ok { color: #1b7f3b; }
  .result.problem { color: #c62828; }
  .result.na, .result.pending { color: #90a4ae; }
  section.slot { page-break-inside: avoid; }
  .photos { display: flex; flex-wrap: wrap; gap: 8px; }
  figure { margin: 0; width: 31%; page-break-inside: avoid; }
  figure img { width: 100%; border: 1px solid #ddd; border-radius: 4px; }
  figcaption { font-size: 9px; color: #667085; }
  footer { margin-top: 24px; font-size: 10px; color: #667085;
           border-top: 1px solid #ddd; padding-top: 8px; }
  @media print { .noprint { display: none; } }
</style>
</head>
<body>
<header>
  <div>
    <h1>Laudo de instalação</h1>
    <div>${escape(order.code)}</div>
  </div>
  <span class="status">${escape(order.status)}</span>
</header>

<h2>Equipamento e veículo</h2>
<div class="grid">
  ${field('Identificador (IMEI)', order.device_unique_id)}
  ${field('Modelo do rastreador', order.tracker_model)}
  ${field('Operadora do chip', order.sim_carrier)}
  ${field('Número do chip', order.sim_number)}
  ${field('Categoria', order.equipment_category)}
  ${field('Placa / identificação', order.vehicle_plate)}
  ${field('Marca', order.vehicle_brand)}
  ${field('Modelo', order.vehicle_model)}
  ${field('Ano', order.vehicle_year)}
  ${field('Cor', order.vehicle_color)}
  ${field('Odômetro inicial (km)', order.odometer_start)}
  ${field('Local da instalação', order.install_location)}
  ${field('Bloqueio', order.has_immobilizer ? 'Sim' : 'Não')}
  ${field('Sirene', order.has_siren ? 'Sim' : 'Não')}
  ${field('Botão de pânico', order.has_panic_button ? 'Sim' : 'Não')}
  ${field('Posição recebida', order.position_ok ? 'Sim' : 'Não')}
  ${field('Teste de bloqueio', order.block_test_ok === null ? '—' : order.block_test_ok ? 'OK' : 'Falhou')}
  ${field('Concluída em', formatDate(order.finished_at))}
</div>

<h2>Checklist</h2>
<table>
  <thead><tr><th>#</th><th>Item</th><th>Resultado</th><th>Observação</th></tr></thead>
  <tbody>${rows || '<tr><td colspan="4">Sem itens</td></tr>'}</tbody>
</table>

${order.notes ? `<h2>Observações</h2><p>${escape(order.notes)}</p>` : ''}

<h2>Fotos</h2>
${gallery || '<p>Sem fotos.</p>'}

${
  order.review_comment
    ? `<h2>Parecer</h2><p>${escape(order.review_comment)} (${formatDate(order.reviewed_at)})</p>`
    : ''
}

<footer>
  Argos Track — Studio Mythos · Ordem ${escape(order.code)} ·
  Criada em ${formatDate(order.created_at)} · Instalador #${escape(order.installer_user_id)}
</footer>
</body>
</html>`;
};

router.get('/orders/:id/report', loadOrder, async (req, res, next) => {
  try {
    const items = await query(
      'SELECT * FROM argos_install_item WHERE order_id = ? ORDER BY position',
      [req.order.id],
    );
    const photos = await query(
      'SELECT * FROM argos_install_photo WHERE order_id = ? AND deleted_at IS NULL ORDER BY slot, position, id',
      [req.order.id],
    );
    await audit(req, { orderId: req.order.id, action: 'report.export' });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(buildHtml(req.order, items, photos, req.baseUrl.replace(/\/$/, '')));
  } catch (error) {
    next(error);
  }
});

export default router;
