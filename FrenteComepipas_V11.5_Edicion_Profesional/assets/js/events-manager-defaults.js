window.FRENTE_EVENTS_MANAGER_DEFAULTS = {
  events: [
    {id:"event-granada",title:"Granada CF - Málaga CF",type:"Viaje + entrada",date:"2026-09-20",time:"08:00",location:"Salida desde Málaga",price:35,capacity:55,available:12,status:"Abierto",notes:"Punto exacto de salida pendiente de confirmar."},
    {id:"event-cadiz",title:"Málaga CF - Cádiz CF",type:"Solo entrada",date:"2026-09-27",time:"18:30",location:"La Rosaleda",price:20,capacity:42,available:6,status:"Abierto",notes:"Recogida de entradas en el punto indicado por la peña."}
  ],
  reservations: [
    {id:"RES-2001",eventId:"event-granada",memberId:"socio-0001",name:"Socio Ejemplo",phone:"600 000 000",email:"socio@frentecomepipas.es",quantity:1,status:"Confirmada",payment:"Pagado",delivery:"No aplica",checkin:false,notes:""},
    {id:"RES-2002",eventId:"event-cadiz",memberId:"socio-0002",name:"María Malaguista",phone:"611 111 111",email:"maria@example.com",quantity:2,status:"Reservada",payment:"Pendiente",delivery:"Pendiente",checkin:false,notes:"Recoger juntas."}
  ]
};