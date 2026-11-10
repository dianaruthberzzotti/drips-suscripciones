// Netlify Function: /netlify/functions/pago-error
// Recibe el POST de e-Pagos cuando hay error y muestra los parámetros

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};
  const body = event.body || '';

  // Parsear body si viene como form-urlencoded
  let bodyParams = {};
  try {
    if (body) {
      body.split('&').forEach(pair => {
        const [k, v] = pair.split('=');
        if (k) bodyParams[decodeURIComponent(k)] = decodeURIComponent((v || '').replace(/\+/g, ' '));
      });
    }
  } catch(e) {}

  const allParams = { ...params, ...bodyParams };
  const lines = Object.entries(allParams).map(([k, v]) => `${k} = ${v}`).join('\n');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pago no completado — +Drips</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center;
           min-height: 100vh; margin: 0; background: #f0f4f8; }
    .box { text-align: center; padding: 2rem; background: white; border-radius: 12px;
           box-shadow: 0 4px 20px rgba(0,0,0,0.1); max-width: 480px; }
    .icon { font-size: 3rem; margin-bottom: 1rem; }
    h2 { color: #742a2a; margin: 0 0 0.5rem; }
    p  { color: #718096; margin: 0 0 1rem; }
    .debug { background: #1a202c; color: #68d391; font-family: monospace; font-size: 0.8rem;
             padding: 1rem; border-radius: 8px; text-align: left; white-space: pre-wrap; word-break: break-all; }
  </style>
</head>
<body>
  <div class="box">
    <div class="icon">❌</div>
    <h2>Pago no completado</h2>
    <p>Hubo un problema al procesar el pago.</p>
    <div class="debug">${lines || '(sin parámetros)'}</div>
  </div>
</body>
</html>`;

  return {
    statusCode: 200,
    body: html,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  };
};
