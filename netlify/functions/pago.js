// Netlify Function: /netlify/functions/pago
// Obtiene un token de e-Pagos y redirige al usuario al checkout
// URL de uso: /.netlify/functions/pago?monto=100000&concepto=Test+ADN&cliente=DRIPS-12345678

const https = require('https');
const querystring = require('querystring');

// Credenciales productivas e-Pagos (MAS SALUD / +Drips)
const EPAGOS_ID_ORGANISMO = '23603';
const EPAGOS_ID_USUARIO    = '403070';
const EPAGOS_HASH          = '738d6a8237e52204f0a4ea8c74579a85';
const EPAGOS_PASSWORD      = 'e597c02dba4c21e80bdc91a2ed0f6934';
const EPAGOS_CONVENIO      = '25603'; // TEST: Emisión Masiva (para diagnosticar si el problema es el convenio)

const TOKEN_URL   = 'https://api.epagos.com/post.php';
const CHECKOUT_URL = 'https://post.epagos.com';

function postRequest(url, data) {
  return new Promise((resolve, reject) => {
    const body = querystring.stringify(data);
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => resolve(raw));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};
  const monto    = params.monto    || '';
  const concepto = params.concepto || 'Servicio +Drips';
  const cliente  = params.cliente  || '';
  const email    = params.email    || '';

  // numero_operacion debe ser numérico — extraemos solo los dígitos del cliente
  const numeroOperacion = cliente.replace(/\D/g, '') || Date.now().toString();

  // identificador_cliente: alfanumérico, mínimo 6 caracteres, único por contribuyente
  // Usamos el cliente original (ej: "DRIPS-23804521") que ya es alfanumérico
  const identificadorCliente = cliente || numeroOperacion;

  if (!monto || isNaN(parseFloat(monto))) {
    return {
      statusCode: 400,
      body: '<h2>Error: parámetro monto inválido o faltante.</h2>',
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    };
  }

  // 1. Obtener token
  let token;
  try {
    const tokenResp = await postRequest(TOKEN_URL, {
      id_usuario:   EPAGOS_ID_USUARIO,
      id_organismo: EPAGOS_ID_ORGANISMO,
      password:     EPAGOS_PASSWORD,
      hash:         EPAGOS_HASH,
    });
    console.log('[pago] token response:', tokenResp);
    const parsed = JSON.parse(tokenResp);
    const tokenValue = parsed.Token || parsed.token;
    if (parsed.id_resp !== '01001' || !tokenValue) {
      throw new Error(`Token error: ${tokenResp}`);
    }
    token = tokenValue;
    console.log('[pago] token ok, monto:', monto, 'montoDecimal:', parseFloat(monto).toFixed(2), 'cliente:', cliente, 'numeroOperacion:', cliente.replace(/\D/g,''), 'concepto:', params.concepto || 'Servicio +Drips');
  } catch (err) {
    console.error('Error obteniendo token e-Pagos:', err);
    return {
      statusCode: 502,
      body: `<h2>Error al conectar con e-Pagos. Intentá de nuevo.</h2><p>${err.message}</p>`,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    };
  }

  // 2. Generar HTML con form auto-submit hacia post.epagos.com
  const montoDecimal = parseFloat(monto).toFixed(2);
  const baseUrl = event.headers && event.headers.host
    ? `https://${event.headers.host}`
    : 'https://superlative-figolla-1fa580.netlify.app';

  const okUrl    = `${baseUrl}/pago-ok.html`;
  const errorUrl = `${baseUrl}/.netlify/functions/pago-error`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redirigiendo al pago...</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center;
           min-height: 100vh; margin: 0; background: #f0f4f8; }
    .box { text-align: center; padding: 2rem; background: white; border-radius: 12px;
           box-shadow: 0 4px 20px rgba(0,0,0,0.1); max-width: 400px; }
    .logo { font-size: 2.5rem; margin-bottom: 0.5rem; }
    h2 { color: #1a365d; margin: 0 0 0.5rem; }
    p  { color: #718096; margin: 0 0 1.5rem; }
    .spinner { width: 40px; height: 40px; border: 4px solid #e2e8f0;
               border-top-color: #3182ce; border-radius: 50%;
               animation: spin 0.8s linear infinite; margin: 0 auto; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="box">
    <div class="logo">💧</div>
    <h2>+Drips</h2>
    <p>Redirigiendo al portal de pago...</p>
    <div class="spinner"></div>
  </div>
  <form id="f" method="POST" action="${CHECKOUT_URL}" style="display:none">
    <input name="version"              value="1.0">
    <input name="operacion"            value="op_pago">
    <input name="convenio"             value="${EPAGOS_CONVENIO}">
    <input name="id_organismo"         value="${EPAGOS_ID_ORGANISMO}">
    <input name="token"                value="${token}">
    <input name="ok_url"               value="${okUrl}">
    <input name="error_url"            value="${errorUrl}">
    <input name="id_moneda_operacion"  value="1">
    <input name="monto_operacion"      value="${montoDecimal}">
    <input name="numero_operacion"     value="${numeroOperacion}">
    <input name="detalle_operacion"    value="${concepto}">
    <input name="detalle_operacion_visible"  value="S">
    <input name="identificador_cliente"     value="${identificadorCliente}">
    ${email ? `<input name="email_pagador" value="${email}">` : ''}
    <input name="opc_guardado_obligatorio"  value="true">
  </form>
  <script>
    // Enviar una sola vez, evitar reenvíos por recarga
    if (!sessionStorage.getItem('submitted_${token}')) {
      sessionStorage.setItem('submitted_${token}', '1');
      document.getElementById('f').submit();
    } else {
      document.querySelector('p').textContent = 'Este link ya fue usado. Generá uno nuevo desde la app.';
      document.querySelector('.spinner').style.display = 'none';
    }
  </script>
</body>
</html>`;

  return {
    statusCode: 200,
    body: html,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  };
};
