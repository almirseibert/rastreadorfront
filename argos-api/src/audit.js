import { execute } from './db.js';

// Trilha de auditoria: quem fez o quê em cada ordem. O laudo é documento de entrega ao
// cliente, então toda alteração precisa ser rastreável.
export const audit = async (req, { orderId, action, fromStatus, toStatus, detail }) => {
  try {
    await execute(
      `INSERT INTO argos_audit
         (order_id, actor_id, action, from_status, to_status, detail, ip, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(3))`,
      [
        orderId || null,
        req.session?.userId || null,
        action,
        fromStatus || null,
        toStatus || null,
        detail ? String(detail).slice(0, 1024) : null,
        (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim().slice(0, 45),
      ],
    );
  } catch (error) {
    // Auditoria não pode derrubar a operação principal.
    console.error('[audit] falhou:', error.message);
  }
};

export default audit;
