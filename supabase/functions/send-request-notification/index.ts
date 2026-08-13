import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const safe = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const body = await req.json()
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const settingsResult = await supabase.from('fc_app_settings').select('valor').eq('clave', 'notificaciones').single()
    const settings = settingsResult.data?.valor || {}
    let subject = '', html = '', to = ''

    if (body.tipo === 'material') {
      let data = body.solicitud || {}
      const isMember = body.solicitud?.es_socio !== false
      if (body.request_id) {
        const result = await supabase.from('material_requests')
          .select('referencia,nombre,telefono,email,cantidad,variante,observaciones,material_id')
          .eq('id', body.request_id).single()
        if (result.error) throw result.error
        data = result.data
      }
      let materialName = 'Material solicitado'
      if (data.material_id) {
        const item = await supabase.from('material_items').select('nombre').eq('id', data.material_id).maybeSingle()
        if (item.data?.nombre) materialName = item.data.nombre
      }
      to = settings.material_email
      subject = ((isMember ? 'Solicitud de material ' : 'Consulta pública sobre material ') + (data.referencia || '')).trim()
      html = '<h2>' + (isMember ? 'Nueva solicitud de material' : 'Nueva consulta pública sobre material') + '</h2>'
        + '<p><b>' + (isMember ? 'Socio' : 'Persona interesada') + ':</b> ' + safe(data.nombre) + '</p>'
        + '<p><b>Material:</b> ' + safe(materialName) + '</p>'
        + '<p><b>Cantidad:</b> ' + safe(data.cantidad) + '</p>'
        + '<p><b>Variante:</b> ' + safe(data.variante || '-') + '</p>'
        + '<p><b>Teléfono:</b> ' + safe(data.telefono) + '</p>'
        + '<p><b>Correo:</b> ' + safe(data.email || '-') + '</p>'
        + '<p><b>Observaciones:</b> ' + safe(data.observaciones || '-') + '</p>'
    } else {
      const result = await supabase.from('contact_requests').select('*').eq('id', body.request_id).single()
      if (result.error) throw result.error
      const data = result.data
      to = settings.altas_email
      subject = 'Contacto web: ' + data.asunto
      html = '<h2>Nueva solicitud desde la web</h2>'
        + '<p><b>Nombre:</b> ' + safe(data.nombre) + '</p>'
        + '<p><b>Correo:</b> ' + safe(data.email) + '</p>'
        + '<p><b>Teléfono:</b> ' + safe(data.telefono) + '</p>'
        + '<p><b>Asunto:</b> ' + safe(data.asunto) + '</p>'
        + '<p>' + safe(data.mensaje) + '</p>'
    }

    if (!to) throw new Error('Correo destinatario no configurado')
    const apiKey = Deno.env.get('BREVO_API_KEY')
    if (!apiKey) throw new Error('BREVO_API_KEY no configurada')
    const from = Deno.env.get('BREVO_SENDER_EMAIL') || 'frentecomepipas2007@gmail.com'
    const senderName = Deno.env.get('BREVO_SENDER_NAME') || 'Frente Comepipas'
    const sent = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({ sender: { name: senderName, email: from }, to: [{ email: to }], subject, htmlContent: html }),
    })
    if (!sent.ok) throw new Error(await sent.text())
    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, 'content-type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error?.message || error) }), {
      status: 400,
      headers: { ...cors, 'content-type': 'application/json' },
    })
  }
})
