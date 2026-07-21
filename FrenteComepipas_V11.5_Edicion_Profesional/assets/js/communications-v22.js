(()=>{"use strict";let db;async function c(){if(db)return db;db=(await FrenteSupabase.init()).client;return db}window.CommsV22={
 async templates(){let r=await(await c()).from('communication_templates').select('*').order('nombre');if(r.error)throw r.error;return r.data||[]},
 async saveTemplate(o){let x=await c(),id=o.id;delete o.id;let r=id?await x.from('communication_templates').update(o).eq('id',id).select().single():await x.from('communication_templates').insert(o).select().single();if(r.error)throw r.error;return r.data},
 async list(){let r=await(await c()).from('c22_communication_summary').select('*').order('created_at',{ascending:false});if(r.error)throw r.error;return r.data||[]},
 async save(o){let x=await c(),id=o.id;delete o.id;let u=(await x.auth.getUser()).data.user;o.creado_por=o.creado_por||u?.id;o.importante=!!o.importante;o.destinatarios_ids=o.destinatarios_ids||[];let r=id?await x.from('communications').update(o).eq('id',id).select().single():await x.from('communications').insert(o).select().single();if(r.error)throw r.error;return r.data},
 async prepare(id){let r=await(await c()).rpc('c22_prepare_recipients',{p_communication_id:id});if(r.error)throw r.error;return r.data},
 async send(id){let x=await c();let r=await x.functions.invoke('send-communication',{body:{communication_id:id}});if(r.error)throw r.error;if(r.data?.error)throw new Error(r.data.error);return r.data},
 async cancel(id){let r=await(await c()).from('communications').update({estado:'cancelado'}).eq('id',id);if(r.error)throw r.error},
 async recipients(id){let r=await(await c()).from('communication_recipients').select('*').eq('communication_id',id).order('nombre');if(r.error)throw r.error;return r.data||[]},
 async myNotices(){let r=await(await c()).from('member_notices').select('*').order('created_at',{ascending:false});if(r.error)throw r.error;return r.data||[]},
 async readNotice(id){let r=await(await c()).from('member_notices').update({leido_at:new Date().toISOString()}).eq('id',id);if(r.error)throw r.error}
};})();
