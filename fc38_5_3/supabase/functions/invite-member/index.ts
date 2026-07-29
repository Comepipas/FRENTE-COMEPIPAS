import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
Deno.serve(async(req)=>{if(req.method==='OPTIONS')return new Response('ok',{headers:cors});try{
 const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
 const token=req.headers.get('Authorization')||'';
 const caller=createClient(url,anon,{global:{headers:{Authorization:token}}});const {data:{user},error:ue}=await caller.auth.getUser();if(ue||!user)throw new Error('Sesión de administrador no válida.');
 const admin=createClient(url,service);const {data:role}=await admin.from('admin_profiles').select('activo,rol').eq('user_id',user.id).maybeSingle();if(!role?.activo)throw new Error('Acceso reservado a la directiva.');
 const {socio_id,redirect_to}=await req.json();const {data:s,error:se}=await admin.from('socios').select('id,numero_socio,nombre,apellidos,email,telefono,estado,auth_user_id').eq('id',socio_id).single();if(se)throw se;if(!s.email)throw new Error('El socio no tiene correo electrónico.');if(s.auth_user_id)throw new Error('El socio ya tiene una cuenta vinculada.');
 const verification=String(s.telefono||'').replace(/\D/g,'').slice(-4);if(verification.length<4)throw new Error('El socio necesita un teléfono válido antes de enviar la invitación.');
 const {data:inv,error:ie}=await admin.auth.admin.inviteUserByEmail(s.email,{redirectTo:redirect_to,data:{member_number:s.numero_socio,member_verification:verification,member_id:s.id}});if(ie)throw ie;
 await admin.from('socios').update({auth_user_id:inv.user.id,access_status:'invitado',invited_at:new Date().toISOString()}).eq('id',s.id);
 await admin.from('member_account_events').insert({socio_id:s.id,auth_user_id:inv.user.id,evento:'invitacion_enviada_17_1',detalle:{email:s.email}});
 return new Response(JSON.stringify({ok:true,email:s.email}),{headers:{...cors,'Content-Type':'application/json'}});
}catch(e){return new Response(JSON.stringify({error:e.message||String(e)}),{status:400,headers:{...cors,'Content-Type':'application/json'}});}});