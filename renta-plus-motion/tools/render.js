// usage: node render.js <index.html> <outdir> <fps> <workers>
// Each worker renders a contiguous chunk and pipes PNG frames straight into its own ffmpeg segment.
const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs'); const {spawn}=require('child_process');
(async()=>{
  const [,,f,out,fpsS='30',wS='4']=process.argv; const fps=+fpsS, W=+wS;
  fs.mkdirSync(out,{recursive:true});
  const b=await chromium.launch();
  const probe=await b.newPage(); await probe.goto('file://'+path.resolve(f)); await probe.evaluate(()=>window.ready);
  const N=Math.round(await probe.evaluate(()=>window.DURATION)*fps); await probe.close();
  let done=0; const t0=Date.now(); const per=Math.ceil(N/W);
  await Promise.all([...Array(W)].map(async(_,w)=>{
    const p=await b.newPage({viewport:{width:1920,height:1080}});
    p.on('pageerror',e=>console.log('PAGEERR',e.message));
    await p.goto('file://'+path.resolve(f)); await p.evaluate(()=>window.ready);
    const ff=spawn('ffmpeg',['-y','-loglevel','error','-f','image2pipe','-framerate',String(fps),'-c:v','png','-i','-',
      '-c:v','libx264','-preset','slow','-crf','16','-pix_fmt','yuv420p','-r',String(fps),`${out}/seg${w}.mp4`],{stdio:['pipe','inherit','inherit']});
    const closed=new Promise(r=>ff.on('close',r));
    for(let i=w*per;i<Math.min(N,(w+1)*per);i++){
      await p.evaluate(t=>render(t),i/fps);
      const buf=await p.screenshot({type:'png'});
      if(!ff.stdin.write(buf)) await new Promise(r=>ff.stdin.once('drain',r));
      if(++done%300===0) console.log(done,'/',N,((Date.now()-t0)/1000).toFixed(0)+'s');
    }
    ff.stdin.end(); await closed;
  }));
  await b.close();
  fs.writeFileSync(`${out}/list.txt`,[...Array(W)].map((_,w)=>`file 'seg${w}.mp4'`).join('\n'));
  console.log('frames',N);
})();
