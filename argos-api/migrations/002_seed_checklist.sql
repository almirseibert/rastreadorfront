-- Modelo de checklist genérico, usado quando não existe um específico da categoria.
INSERT INTO argos_checklist_template (name, category, active, created_at, updated_at)
SELECT 'Checklist padrão de instalação', NULL, 1, NOW(3), NOW(3)
WHERE NOT EXISTS (SELECT 1 FROM argos_checklist_template WHERE category IS NULL);

INSERT INTO argos_checklist_item (template_id, position, label, help, required)
SELECT t.id, v.position, v.label, v.help, v.required
FROM argos_checklist_template t
JOIN (
  SELECT 1 AS position, 'Equipamento fixado em local oculto e seco' AS label,
         'Longe de calor, água e pontos de vibração' AS help, 1 AS required
  UNION ALL SELECT 2, 'Alimentação ligada em ponto pós-chave/direto conforme projeto',
         'Conferir tensão com multímetro', 1
  UNION ALL SELECT 3, 'Negativo/terra em ponto de chassi limpo', NULL, 1
  UNION ALL SELECT 4, 'Emendas soldadas e isoladas (sem conectores frágeis)', NULL, 1
  UNION ALL SELECT 5, 'Fio de ignição identificado e testado', NULL, 1
  UNION ALL SELECT 6, 'Antena GPS com visada para o teto', NULL, 1
  UNION ALL SELECT 7, 'Chip instalado e com sinal', NULL, 1
  UNION ALL SELECT 8, 'Bloqueio instalado e testado (quando contratado)', NULL, 0
  UNION ALL SELECT 9, 'Sirene/botão de pânico testados (quando contratados)', NULL, 0
  UNION ALL SELECT 10, 'Chicotes amarrados e acabamento recolocado', NULL, 1
  UNION ALL SELECT 11, 'Veículo entregue limpo e sem avarias', NULL, 1
  UNION ALL SELECT 12, 'Cliente orientado sobre o uso da plataforma', NULL, 1
) v
WHERE t.category IS NULL
  AND NOT EXISTS (SELECT 1 FROM argos_checklist_item i WHERE i.template_id = t.id);
