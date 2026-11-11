const https = require('https');

// Credenciales e-Pagos PRODUCCIÓN
const ID_ORGANISMO = '23603';
const ID_USUARIO   = '403070';
const HASH         = '738d6a8237e52204f0a4ea8c74579a85';
const PASSWORD     = 'e597c02dba4c21e80bdc91a2ed0f6934';
const CONVENIO     = 27603; // Recurrencia Tarjeta de Crédito
const ID_FP        = 34;    // Tarjeta de Crédito

// SANDBOX para pruebas:
// ID_USUARIO = '3587'
// HASH = '18fdfe7ea49d2f314980b0147b534c8a'
// PASSWORD = '5b9d96a24b02de6ca2bc8e954ec08d57'
// WSDL_ENDPOINT sandbox = 'https://sandbox.epagos.com/wsdl/2.5/index.php'

const WSDL_ENDPOINT = 'https://api.epagos.com/wsdl/2.5/index.php';

// Namespace de producción
const NS = 'https://api.epagos.net/';

function soapRequest(action, body) {
  return new Promise((resolve, reject) => {
    const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope
 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
 xmlns:xsd="http://www.w3.org/2001/XMLSchema"
 xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
 xmlns:san="${NS}"
 xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/">
 <soapenv:Header/>
 <soapenv:Body>
  ${body}
 </soapenv:Body>
</soapenv:Envelope>`;

    const url = new URL(WSDL_ENDPOINT);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': `${WSDL_ENDPOINT}/${action}`,
        'Content-Length': Buffer.byteLength(envelope, 'utf8'),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.write(envelope);
    req.end();
  });
}

function extractTag(xml, tag) {
  const m = xml.match(new RegExp(`<(?:[^:]+:)?${tag}[^>]*>([^<]*)<`));
  return m ? m[1].trim() : null;
}

async function obtenerToken() {
  const body = `<san:obtener_token soapenv:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
   <version xsi:type="xsd:string">2.0</version>
   <credenciales xsi:type="san:DatosCredenciales">
    <id_organismo xsi:type="xsd:int">${ID_ORGANISMO}</id_organismo>
    <id_usuario xsi:type="xsd:int">${ID_USUARIO}</id_usuario>
    <password xsi:type="xsd:string">${PASSWORD}</password>
    <Hash xsi:type="xsd:string">${HASH}</Hash>
   </credenciales>
  </san:obtener_token>`;

  const xml = await soapRequest('obtener_token', body);
  console.log('obtener_token response:', xml);

  const idResp = extractTag(xml, 'id_resp');
  if (idResp !== '00') {
    const respuesta = extractTag(xml, 'respuesta');
    throw new Error(`obtener_token error ${idResp}: ${respuesta}`);
  }
  return extractTag(xml, 'token');
}

async function solicitudPago(token, { monto, concepto, numeroOperacion, identificadorCliente, emailPagador, fechaVencimiento }) {
  const body = `<san:solicitud_pago soapenv:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
   <version xsi:type="xsd:string">2.0</version>
   <tipo_operacion xsi:type="san:TipoOperacion">op_pago</tipo_operacion>
   <credenciales xsi:type="san:DatosCredencialesPago">
    <id_organismo xsi:type="xsd:int">${ID_ORGANISMO}</id_organismo>
    <token xsi:type="xsd:string">${token}</token>
   </credenciales>
   <operacion xsi:type="san:DatosOperacionPago">
    <numero_operacion xsi:type="xsd:string">${numeroOperacion}</numero_operacion>
    <identificador_externo_2 xsi:type="xsd:string"></identificador_externo_2>
    <identificador_externo_3 xsi:type="xsd:string"></identificador_externo_3>
    <identificador_externo_4 xsi:type="xsd:string"></identificador_externo_4>
    <url_ok xsi:type="xsd:string"></url_ok>
    <url_error xsi:type="xsd:string"></url_error>
    <url_boleta xsi:type="xsd:string"></url_boleta>
    <identificador_cliente xsi:type="xsd:string">${identificadorCliente}</identificador_cliente>
    <id_moneda_operacion xsi:type="xsd:int">1</id_moneda_operacion>
    <monto_operacion xsi:type="xsd:float">${monto}</monto_operacion>
    <opc_pdf xsi:type="xsd:boolean">false</opc_pdf>
    <opc_fecha_vencimiento xsi:type="xsd:date">${fechaVencimiento}</opc_fecha_vencimiento>
    <opc_devolver_qr xsi:type="xsd:boolean">false</opc_devolver_qr>
    <opc_devolver_codbarras xsi:type="xsd:boolean">false</opc_devolver_codbarras>
    <opc_generar_pdf xsi:type="xsd:boolean">false</opc_generar_pdf>
    <opc_operaciones_lote xsi:type="san:OperacionesLoteArray" SOAP-ENC:arrayType="san:OperacionesLote[0]"/>
    <opc_fp_excluidas xsi:type="xsd:string"></opc_fp_excluidas>
    <opc_tp_excluidos xsi:type="xsd:string"></opc_tp_excluidos>
    <opc_fp_permitidas xsi:type="xsd:string"></opc_fp_permitidas>
    <detalle_operacion xsi:type="san:DetallePagoArray" SOAP-ENC:arrayType="san:DetallePago[1]">
     <item xsi:type="san:DetallePago">
      <id_item xsi:type="xsd:int">1</id_item>
      <desc_item xsi:type="xsd:string">${concepto}</desc_item>
      <monto_item xsi:type="xsd:float">${monto}</monto_item>
      <cantidad_item xsi:type="xsd:int">1</cantidad_item>
     </item>
    </detalle_operacion>
    <fecha_2do_venc xsi:type="xsd:date"></fecha_2do_venc>
    <monto_operacion_2do_venc xsi:type="xsd:float"></monto_operacion_2do_venc>
    <pagador xsi:type="san:DatosPagadorPago">
     <nombre_pagador xsi:type="xsd:string"></nombre_pagador>
     <apellido_pagador xsi:type="xsd:string"></apellido_pagador>
     <fechanac_pagador xsi:type="xsd:date">2000-01-01</fechanac_pagador>
     <email_pagador xsi:type="xsd:string">${emailPagador || ''}</email_pagador>
     <identificacion_pagador xsi:type="san:IdentificacionPagador">
      <tipo_doc_pagador xsi:type="xsd:int">0</tipo_doc_pagador>
      <numero_doc_pagador xsi:type="xsd:long">0</numero_doc_pagador>
      <cuit_doc_pagador xsi:type="xsd:long">0</cuit_doc_pagador>
     </identificacion_pagador>
     <domicilio_pagador xsi:type="san:DomicilioPagador">
      <calle_dom_pagador xsi:type="xsd:string"></calle_dom_pagador>
      <numero_dom_pagador xsi:type="xsd:string"></numero_dom_pagador>
      <adicional_dom_pagador xsi:type="xsd:string"></adicional_dom_pagador>
      <cp_dom_pagador xsi:type="xsd:string"></cp_dom_pagador>
      <ciudad_dom_pagador xsi:type="xsd:string"></ciudad_dom_pagador>
      <provincia_dom_pagador xsi:type="xsd:int">0</provincia_dom_pagador>
      <pais_dom_pagador xsi:type="xsd:int">0</pais_dom_pagador>
     </domicilio_pagador>
     <telefono_pagador xsi:type="san:TelefonoPagador">
      <codigo_telef_pagador xsi:type="xsd:int">0</codigo_telef_pagador>
      <numero_telef_pagador xsi:type="xsd:int">0</numero_telef_pagador>
     </telefono_pagador>
     <cbu_pagador xsi:type="xsd:string"></cbu_pagador>
    </pagador>
    <tipo_operacion xsi:type="xsd:int">1</tipo_operacion>
    <codigo_publicacion xsi:type="xsd:int"></codigo_publicacion>
    <opc_T30_cerrado xsi:type="xsd:boolean"></opc_T30_cerrado>
    <opc_T30_reutilizable xsi:type="xsd:boolean"></opc_T30_reutilizable>
    <opc_T30_require_orden xsi:type="xsd:boolean"></opc_T30_require_orden>
    <opc_una_cuota xsi:type="xsd:boolean"></opc_una_cuota>
   </operacion>
   <fp xsi:type="san:DatosFormaPagoArray" SOAP-ENC:arrayType="san:DatosFormaPago[1]">
    <item xsi:type="san:DatosFormaPago">
     <id_fp xsi:type="xsd:int">${ID_FP}</id_fp>
     <monto_fp xsi:type="xsd:float">${monto}</monto_fp>
    </item>
   </fp>
   <convenio xsi:type="xsd:int">${CONVENIO}</convenio>
  </san:solicitud_pago>`;

  const xml = await soapRequest('solicitud_pago', body);
  console.log('solicitud_pago response:', xml);

  const idResp = extractTag(xml, 'id_resp');
  if (idResp !== '00') {
    const respuesta = extractTag(xml, 'respuesta');
    throw new Error(`solicitud_pago error ${idResp}: ${respuesta}`);
  }

  // Buscar url_qr dentro del array fp de la respuesta
  const urlQr = extractTag(xml, 'url_qr');
  if (!urlQr) {
    throw new Error('No se recibió url_qr en la respuesta');
  }
  return urlQr;
}

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};
  const monto             = parseFloat(params.monto || '0');
  const concepto          = params.concepto || 'Suscripcion Drips';
  const cliente           = params.cliente || '';
  const email             = params.email || '';
  const numeroOperacion   = params.op || `DRIPS-${Date.now()}`;

  // Fecha de vencimiento: 30 días desde hoy
  const venc = new Date();
  venc.setDate(venc.getDate() + 30);
  const fechaVencimiento = venc.toISOString().split('T')[0];

  if (!monto || !cliente) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Parámetros requeridos: monto, cliente' }),
    };
  }

  try {
    // Paso 1: obtener token
    // El token se genera con obtener_token usando las credenciales.
    // Si falla 01002, probamos usar el PASSWORD directamente como token.
    let token;
    try {
      token = await obtenerToken();
      console.log('Token obtenido via obtener_token:', token);
    } catch (tokenErr) {
      console.warn('obtener_token falló, usando PASSWORD como token:', tokenErr.message);
      token = PASSWORD;
    }

    // Paso 2: generar link de pago
    const urlPago = await solicitudPago(token, {
      monto,
      concepto,
      numeroOperacion,
      identificadorCliente: cliente,
      emailPagador: email,
      fechaVencimiento,
    });

    // Redirigir al link de pago
    return {
      statusCode: 302,
      headers: { Location: urlPago },
      body: '',
    };
  } catch (err) {
    console.error('Error:', err.message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: `<h2>Error al generar link de pago</h2><p>${err.message}</p>`,
    };
  }
};
