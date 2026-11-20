const https = require('https');

// Credenciales e-Pagos PRODUCCIÓN
const ID_ORGANISMO = '23603';
const ID_USUARIO   = '403070';
const HASH         = '738d6a8237e52204f0a4ea8c74579a85';
const PASSWORD     = 'e597c02dba4c21e80bdc91a2ed0f6934';

const WSDL_ENDPOINT = 'https://api.epagos.com/wsdl/2.5/index.php';
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
        'SOAPAction': `${NS}${action}`,
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
    <id_usuario xsi:type="xsd:string">${ID_USUARIO}</id_usuario>
    <password xsi:type="xsd:string">${PASSWORD}</password>
    <hash xsi:type="xsd:string">${HASH}</hash>
   </credenciales>
  </san:obtener_token>`;

  const xml = await soapRequest('obtener_token', body);
  const idResp = extractTag(xml, 'id_resp');
  if (idResp !== '00' && idResp !== '01001') {
    throw new Error(`obtener_token error ${idResp}: ${extractTag(xml, 'respuesta')}`);
  }
  return extractTag(xml, 'token');
}

async function obtenerTarjetasCliente(token, identificadorCliente) {
  const body = `<san:obtener_tarjetas_cliente soapenv:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
   <version xsi:type="xsd:string">2.0</version>
   <credenciales xsi:type="san:DatosCredencialesPago">
    <id_organismo xsi:type="xsd:int">${ID_ORGANISMO}</id_organismo>
    <token xsi:type="xsd:string">${token}</token>
   </credenciales>
   <datosCliente xsi:type="san:DatosClienteArray" SOAP-ENC:arrayType="san:DatosCliente[1]">
    <item xsi:type="san:DatosCliente">
     <identificador_cliente xsi:type="xsd:string">${identificadorCliente}</identificador_cliente>
    </item>
   </datosCliente>
  </san:obtener_tarjetas_cliente>`;

  const xml = await soapRequest('obtener_tarjetas_cliente', body);
  console.log('obtener_tarjetas_cliente response:', xml);

  const idResp = extractTag(xml, 'id_resp');
  if (idResp !== '10001') {
    throw new Error(`obtener_tarjetas_cliente error ${idResp}: ${extractTag(xml, 'respuesta')} | XML: ${xml}`);
  }

  // Extraer identificador_tarjeta del primer resultado
  const idTarjeta = extractTag(xml, 'identificador_tarjeta');
  const idFp = extractTag(xml, 'id_fp');
  if (!idTarjeta) {
    throw new Error(`No se encontró tarjeta guardada para este cliente | XML: ${xml}`);
  }
  return { identificadorTarjeta: idTarjeta, idFp: parseInt(idFp) || 34 };
}

async function solicitudPagoRecurrente(token, { identificadorCliente, identificadorTarjeta, monto, concepto, numeroOperacion, convenio }) {
  // Fecha de hoy
  const hoy = new Date().toISOString().split('T')[0];
  // Vencimiento en 5 días
  const venc = new Date();
  venc.setDate(venc.getDate() + 5);
  const fechaVencimiento = venc.toISOString().split('T')[0];

  const body = `<san:solicitud_pago_recurrente soapenv:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
   <version xsi:type="xsd:string">2.0</version>
   <tipo_operacion xsi:type="san:TipoOperacion">op_pago_recurrente</tipo_operacion>
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
    <detalle_operacion xsi:type="san:DetallePagoArray" SOAP-ENC:arrayType="san:DetallePago[1]">
     <item xsi:type="san:DetallePago">
      <id_item xsi:type="xsd:int">1</id_item>
      <desc_item xsi:type="xsd:string">${concepto}</desc_item>
      <monto_item xsi:type="xsd:float">${monto}</monto_item>
      <cantidad_item xsi:type="xsd:int">1</cantidad_item>
     </item>
    </detalle_operacion>
    <tipo_operacion xsi:type="xsd:int">1</tipo_operacion>
   </operacion>
   <convenio xsi:type="xsd:int">${convenio}</convenio>
   <medio xsi:type="san:TipoOperacion">op_pago_recurrente_medio_tarjeta</medio>
   <cliente xsi:type="san:SuscripcionCliente">
    <identificador_cliente xsi:type="xsd:string">${identificadorCliente}</identificador_cliente>
    <identificador_tarjeta xsi:type="xsd:string">${identificadorTarjeta}</identificador_tarjeta>
   </cliente>
  </san:solicitud_pago_recurrente>`;

  const xml = await soapRequest('solicitud_pago_recurrente', body);
  console.log('solicitud_pago_recurrente response:', xml);

  const idResp = extractTag(xml, 'id_resp');
  if (idResp !== '00' && idResp !== '02002') {
    throw new Error(`solicitud_pago_recurrente error ${idResp}: ${extractTag(xml, 'respuesta')}`);
  }
  return { idResp, respuesta: extractTag(xml, 'respuesta'), numeroOperacion };
}

exports.handler = async (event) => {
  // Solo POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Body inválido' }) };
  }

  const { identificadorCliente, monto, concepto, convenio } = body;
  if (!identificadorCliente || !monto) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Parámetros requeridos: identificadorCliente, monto' }) };
  }

  const numeroOperacion = `DRIPS-REC-${Date.now()}`;
  const convenioFinal = convenio || 27603; // default: Recurrencia Tarjeta de Crédito

  try {
    // 1. Obtener token
    const token = await obtenerToken();

    // 2. Obtener tarjeta guardada del cliente
    const { identificadorTarjeta } = await obtenerTarjetasCliente(token, identificadorCliente);

    // 3. Ejecutar cobro recurrente
    const resultado = await solicitudPagoRecurrente(token, {
      identificadorCliente,
      identificadorTarjeta,
      monto,
      concepto: concepto || 'Suscripcion Drips',
      numeroOperacion,
      convenio: convenioFinal,
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, ...resultado }),
    };
  } catch (err) {
    console.error('Error cobrar:', err.message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};
