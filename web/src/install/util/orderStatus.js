// Espelho (somente leitura) da máquina de estados de argos-api/src/status.js.
// Serve para dar feedback imediato na UI; a validação que vale é a do servidor.

export const STATUS = {
  DRAFT: 'rascunho',
  IN_PROGRESS: 'em_andamento',
  DONE: 'concluida',
  APPROVED: 'aprovada',
  REJECTED: 'reprovada',
  CANCELLED: 'cancelada',
};

export const statusLabelKey = (status) =>
  ({
    [STATUS.DRAFT]: 'orderStatusDraft',
    [STATUS.IN_PROGRESS]: 'orderStatusInProgress',
    [STATUS.DONE]: 'orderStatusDone',
    [STATUS.APPROVED]: 'orderStatusApproved',
    [STATUS.REJECTED]: 'orderStatusRejected',
    [STATUS.CANCELLED]: 'orderStatusCancelled',
  })[status] || 'sharedUnknown';

export const statusColor = (status) =>
  ({
    [STATUS.DRAFT]: 'default',
    [STATUS.IN_PROGRESS]: 'info',
    [STATUS.DONE]: 'warning',
    [STATUS.APPROVED]: 'success',
    [STATUS.REJECTED]: 'error',
    [STATUS.CANCELLED]: 'default',
  })[status] || 'default';

export const isOpen = (status) =>
  [STATUS.DRAFT, STATUS.IN_PROGRESS, STATUS.REJECTED].includes(status);

export default STATUS;
