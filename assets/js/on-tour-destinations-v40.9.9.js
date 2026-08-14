(()=>{"use strict";
const rows={
"Atlético de Madrid":["Riyadh Air Metropolitano","Madrid",540,330,"atletico-de-madrid.svg","riyadh-air-metropolitano.jpg"],
"Real Madrid":["Santiago Bernabéu","Madrid",540,330,"real-madrid.svg","santiago-bernabeu-v2.png"],
"Celta":["Abanca Balaídos","Vigo",1020,615,"celta.svg","abanca-balaidos.jpg"],
"Getafe CF":["Coliseum","Getafe",535,325,"getafe-cf.svg","coliseum.jpg"],
"Deportivo Alavés":["Mendizorroza","Vitoria-Gasteiz",895,555,"deportivo-alaves.svg","mendizorroza.jpg"],
"Real Betis":["Benito Villamarín","Sevilla",210,150,"real-betis.svg","benito-villamarin.jpg"],
"CA Osasuna":["El Sadar","Pamplona",930,570,"ca-osasuna.svg","el-sadar.jpg"],
"Sevilla FC":["Ramón Sánchez-Pizjuán","Sevilla",210,150,"sevilla-fc.svg","ramon-sanchez-pizjuan.jpg"],
"Rayo Vallecano":["Vallecas","Madrid",540,330,"rayo-vallecano.svg","vallecas.jpg"],
"Valencia CF":["Mestalla","Valencia",650,405,"valencia-cf.svg","mestalla.jpg"],
"Real Sociedad":["Reale Arena","San Sebastián",980,600,"real-sociedad.svg","reale-arena.jpg"],
"RC Deportivo":["Riazor","A Coruña",1120,675,"rc-deportivo.svg","riazor.jpg"],
"Levante UD":["Ciutat de València","Valencia",650,405,"levante-ud.svg","ciutat-de-valencia.jpg"],
"Elche CF":["Martínez Valero","Elche",480,300,"elche-cf.svg","martinez-valero.jpg"],
"Villarreal CF":["Estadio de la Cerámica","Vila-real",690,430,"villarreal-cf.svg","estadio-de-la-ceramica.jpg"],
"RCD Espanyol":["RCDE Stadium","Cornellà de Llobregat",1000,600,"rcd-espanyol.svg","rcde-stadium.jpg"],
"Racing Club":["El Sardinero","Santander",1000,610,"racing-club.svg","el-sardinero.jpg"],
"Athletic Club":["San Mamés","Bilbao",930,570,"athletic-club.svg","san-mames.jpg"],
"FC Barcelona":["Spotify Camp Nou","Barcelona",1000,600,"fc-barcelona.svg","spotify-camp-nou.jpg"]
};
const norm=v=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");
window.ON_TOUR_DESTINATIONS=Object.fromEntries(Object.entries(rows).map(([team,r])=>[norm(team),{equipo:team,estadio:r[0],ciudad:r[1],km_desde_rosaleda:r[2],duracion_minutos:r[3],escudo_url:`assets/images/teams/${r[4]}`,imagen_url:`assets/images/stadiums/${r[5]}`}]))
})();
