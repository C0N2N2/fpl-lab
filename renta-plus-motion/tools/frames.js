// usage: node frames.js <index.html> <outdir> t1 t2 ...   -> stills for review
const { chromium } = require('playwright'); const path=require('path');
(async()=>{const [,,f,out,...ts]=process.argv;const b=await chromium.launch();const p=await b.newPage({viewport:{width:1920,height:1080}});
p.on('pageerror',e=>console.log('PAGEERR',e.message));p.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text())});
await p.goto('file://'+path.resolve(f));await p.evaluate(()=>window.ready);
for(const t of ts){await p.evaluate(t=>render(t),+t);await p.screenshot({path:`${out}/t${String(t).padStart(6,'0')}.png`});}
await b.close();})();
