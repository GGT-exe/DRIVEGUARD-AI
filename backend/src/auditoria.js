// auditoria.js
// Historia 23 — registra una acción auditable: quién, qué hizo y cuándo.

async function registrarAuditoria(prisma, usuario_id, accion, detalle) {
  try {
    await prisma.auditoria.create({
      data: { usuario_id, accion, detalle }
    });
  } catch (error) {
    console.error('No se pudo registrar la auditoría:', error.message);
  }
}

module.exports = { registrarAuditoria };