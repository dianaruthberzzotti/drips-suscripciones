// Netlify Function: pago-error
// e-Pagos redirige acá cuando el pago falló o fue cancelado
exports.handler = async (event) => {
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pago no completado — +Drips</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center;
           min-height: 100vh; margin: 0; background: #fff5f5; }
    .box { text-align: center; padding: 2.5rem; background: white; border-radius: 16px;
           box-shadow: 0 4px 24px rgba(0,0,0,0.08); max-width: 420px; }
    .icon { font-size: 3.5rem; margin-bottom: 1rem; }
    h1 { color: #c53030; font-size: 1.6rem; margin: 0 0 0.5rem; }
    p  { color: #4a5568; margin: 0 0 1rem; }
    .footer { margin-top: 1.5rem; font-size: 0.85rem; color: #a0aec0; }
  </style>
</head>
<body>
  <div class="box">
    <div class="icon">❌</div>
    <h1>Pago no completado</h1>
    <p>El pago no fue procesado o fue cancelado. Podés intentar nuevamente con el mismo link.</p>
    <p style="font-size:0.9rem;color:#718096;">Si el problema persiste, contactate con +Drips.</p>
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
