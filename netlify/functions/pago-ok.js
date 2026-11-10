// Netlify Function: pago-ok
// e-Pagos redirige acá cuando el pago fue exitoso
exports.handler = async (event) => {
  const p = event.queryStringParameters || {};
  const monto = p.monto_pagado || p.monto_operacion || '';
  const nro   = p.numero_operacion || '';

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pago exitoso — +Drips</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center;
           min-height: 100vh; margin: 0; background: #f0fff4; }
    .box { text-align: center; padding: 2.5rem; background: white; border-radius: 16px;
           box-shadow: 0 4px 24px rgba(0,0,0,0.08); max-width: 420px; }
    .icon { font-size: 3.5rem; margin-bottom: 1rem; }
    h1 { color: #276749; font-size: 1.6rem; margin: 0 0 0.5rem; }
    p  { color: #4a5568; margin: 0 0 0.5rem; }
    .detail { background: #f0fff4; border-radius: 8px; padding: 1rem; margin: 1rem 0; color: #276749; font-weight: 600; }
    .footer { margin-top: 1.5rem; font-size: 0.85rem; color: #a0aec0; }
  </style>
</head>
<body>
  <div class="box">
    <div class="icon">✅</div>
    <h1>¡Pago recibido!</h1>
    <p>Tu pago fue procesado correctamente.</p>
    ${monto ? `<div class="detail">Monto abonado: $${parseFloat(monto).toLocaleString('es-AR', {minimumFractionDigits:2})}</div>` : ''}
    ${nro ? `<p style="font-size:0.9rem;color:#718096;">Ref: ${nro}</p>` : ''}
    <div class="footer">+Drips · Podés cerrar esta ventana</div>
  </div>
</body>
</html>`;

  return {
    statusCode: 200,
    body: html,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  };
};
