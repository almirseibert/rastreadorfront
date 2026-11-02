// Máquina de estados da ordem de instalação.
//
//  rascunho ──► em_andamento ──► concluida ──► aprovada
//                   ▲                │
//                   └────────────────┴──► reprovada ──► em_andamento   (retrabalho)
//  rascunho|em_andamento ──► cancelada
//
// "quem" é avaliado contra { owner, reviewer } (instalador dono da ordem / admin-gestor).

export const STATUS = {
  DRAFT: 'rascunho',
  IN_PROGRESS: 'em_andamento',
  DONE: 'concluida',
  APPROVED: 'aprovada',
  REJECTED: 'reprovada',
  CANCELLED: 'cancelada',
};

const TRANSITIONS = {
  [STATUS.DRAFT]: [
    { to: STATUS.IN_PROGRESS, who: 'owner' },
    { to: STATUS.CANCELLED, who: 'reviewer' },
  ],
  [STATUS.IN_PROGRESS]: [
    { to: STATUS.DONE, who: 'owner', requiresComplete: true },
    { to: STATUS.CANCELLED, who: 'reviewer' },
  ],
  [STATUS.DONE]: [
    { to: STATUS.APPROVED, who: 'reviewer' },
    { to: STATUS.REJECTED, who: 'reviewer', requiresComment: true },
  ],
  [STATUS.REJECTED]: [{ to: STATUS.IN_PROGRESS, who: 'owner' }],
  [STATUS.APPROVED]: [],
  [STATUS.CANCELLED]: [],
};

export const allowedTransitions = (from, { owner, reviewer }) =>
  (TRANSITIONS[from] || []).filter(
    (transition) =>
      (transition.who === 'owner' && (owner || reviewer)) ||
      (transition.who === 'reviewer' && reviewer),
  );

export const findTransition = (from, to, actor) =>
  allowedTransitions(from, actor).find((transition) => transition.to === to) || null;

// A ordem só pode ser editada enquanto está em andamento (ou por um revisor, com auditoria).
export const isEditable = (status, { reviewer }) =>
  [STATUS.DRAFT, STATUS.IN_PROGRESS, STATUS.REJECTED].includes(status) || reviewer;

// Slots de foto exigidos para concluir. `extra` é livre e não entra aqui.
export const REQUIRED_PHOTO_SLOTS = [
  'veiculo',
  'placa',
  'etiqueta_imei',
  'local_instalacao',
  'chicote',
  'odometro',
];

export const PHOTO_SLOTS = [...REQUIRED_PHOTO_SLOTS, 'teste_bloqueio', 'assinatura', 'extra'];
