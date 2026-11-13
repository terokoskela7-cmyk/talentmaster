#!/usr/bin/env node
'use strict';
/* kylma_aikajana.js — PR B diagnoosi: kylmän avauksen AIKAJANA paikallisesti (ei stagingia, ei tunnuksia, ei Firestore-lukuja).
 *   node scripts/kuorma/kylma_aikajana.js [sivu.html] [cpu=4] [slow|fast] [odotus_ms=1500]
 * Palvelee repon gzip-pakattuna (Hosting-vastine), Chrome puhelinprofiililla (390×844, Slow 4G 1,6 Mbit/s + 150 ms, CPU 4×), `fast` = ei verkkokuristusta (erottaa CPU:n verkosta).
 * Raportoi: kirjautumisnäkymän/FCP:n aika, siirretyt tavut (paikalliset vs ulkoiset), per ulkoinen skripti tavut+kesto, pitkät taskit, JS:n compile+evaluate per tiedosto (Chrome-trace).
 * Rajaus: mittaa KIRJAUTUMATTOMAN kuoren (ennen datalukuja); kirjautumisen jälkeinen renderöinti/luvut mitataan mittaa_sivut.js:llä. */
const http=require('http'),fs=require('fs'),path=require('path'),zlib=require('zlib');
const ROOT=path.resolve(__dirname,'../..'), {chromium}=require('playwright-core');
const SIVU=process.argv[2]||'TalentMaster_Master_v16.html', CPU=+(process.argv[3]||4), VERKKO=process.argv[4]!=='fast';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
const srv=http.createServer((rq,rs)=>{let p=decodeURIComponent(rq.url.split('?')[0]);const f=path.join(ROOT,p);if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){rs.statusCode=404;return rs.end()}
 const b=fs.readFileSync(f),t=MIME[path.extname(f)]||'application/octet-stream';rs.setHeader('content-type',t);rs.setHeader('cache-control','no-store');
 if(/html|javascript|css|json|svg/.test(t)){rs.setHeader('content-encoding','gzip');rs.end(zlib.gzipSync(b,{level:6}))}else rs.end(b)});
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;
 const br=await chromium.launch({executablePath:process.env.TM_CHROME_PATH||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(p=>fs.existsSync(p)),args:['--no-sandbox']});
 const ctx=await br.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
 await ctx.addInitScript(()=>{window.__lt=[];try{new PerformanceObserver(l=>l.getEntries().forEach(e=>__lt.push([e.startTime,e.duration]))).observe({type:'longtask',buffered:true})}catch(e){}
  window.__fcp=null;try{new PerformanceObserver(l=>l.getEntries().forEach(e=>{if(e.name==='first-contentful-paint')__fcp=e.startTime})).observe({type:'paint',buffered:true})}catch(e){}});
 const page=await ctx.newPage(),cdp=await ctx.newCDPSession(page);await cdp.send('Network.enable');
 if(VERKKO)await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1.6e6/8,uploadThroughput:750e3/8});
 if(CPU>1)await cdp.send('Emulation.setCPUThrottlingRate',{rate:CPU});
 const req=new Map();cdp.on('Network.requestWillBeSent',e=>req.set(e.requestId,{url:e.request.url,t0:e.timestamp,type:e.type,enc:0,fin:null}));
 cdp.on('Network.loadingFinished',e=>{const r=req.get(e.requestId);if(r){r.enc=e.encodedDataLength;r.fin=e.timestamp}});
 await br.startTracing(page,{categories:['devtools.timeline','v8','disabled-by-default-v8.compile','blink.user_timing']});
 const t0=Date.now();await page.goto('http://127.0.0.1:'+port+'/'+SIVU,{waitUntil:'commit'});
 let kunnossa=false;for(let i=0;i<200;i++){await page.waitForTimeout(300);try{kunnossa=await page.evaluate(()=>{const a=document.getElementById('sLogin');return !!(a&&!a.classList.contains('hidden')&&a.getBoundingClientRect().height>0)})}catch(e){} if(kunnossa)break}
 const tLogin=Date.now()-t0;await page.waitForTimeout(1500);
 const tr=JSON.parse((await br.stopTracing()).toString());
 const m=await page.evaluate(()=>({fcp:__fcp,lt:__lt,nyt:performance.now()}));
 // trace: per url compile+evaluate
 const agg={};const ev=tr.traceEvents||tr;
 for(const e of ev){if(e.ph!=='X'||!e.dur)continue;const u=e.args&&e.args.data&&(e.args.data.url||e.args.data.fileName);
  if(['EvaluateScript','v8.compile','v8.produceCache','FunctionCall'].includes(e.name)&&u){const k=u.replace(/^http:\/\/127\.0\.0\.1:\d+\//,'');const a=agg[k]=agg[k]||{compile:0,eval:0};if(e.name==='v8.compile')a.compile+=e.dur/1000;else if(e.name==='EvaluateScript')a.eval+=e.dur/1000}}
 const parse=ev.filter(e=>e.name==='ParseHTML'&&e.dur).reduce((s,e)=>s+e.dur/1000,0);
 const R=[...req.values()].filter(r=>r.fin);const sum=f=>R.filter(f).reduce((s,r)=>s+r.enc,0);
 const out={sivu:SIVU,cpu:CPU,verkko:VERKKO,loginNakyy_ms:tLogin,fcp_ms:Math.round(m.fcp),pyyntoja:R.length,enc_kt:Math.round(sum(()=>1)/1024),
  local_kt:Math.round(sum(r=>r.url.includes('127.0.0.1'))/1024),ulkoiset_kt:Math.round(sum(r=>!r.url.includes('127.0.0.1'))/1024),
  pitkat_taskit:m.lt.length,pitkat_yht_ms:Math.round(m.lt.reduce((s,x)=>s+x[1],0)),pisin_ms:Math.round(Math.max(0,...m.lt.map(x=>x[1]))),parseHTML_ms:Math.round(parse),
  ulkoiset:R.filter(r=>!r.url.includes('127.0.0.1')).map(r=>[r.url.replace(/\?.*/,'').slice(0,80),Math.round(r.enc/1024),Math.round((r.fin-r.t0)*1000)]).sort((a,b)=>b[1]-a[1]).slice(0,12),
  jsKompilEval:Object.entries(agg).map(([k,v])=>[k,Math.round(v.compile+v.eval),Math.round(v.compile),Math.round(v.eval)]).sort((a,b)=>b[1]-a[1]).slice(0,22),
  jsYht_ms:Math.round(Object.values(agg).reduce((s,v)=>s+v.compile+v.eval,0)),
  top_aika:R.map(r=>[r.url.replace(/^http:\/\/127\.0\.0\.1:\d+\//,'').replace(/\?.*/,'').slice(0,60),Math.round((r.fin-r.t0)*1000)]).sort((a,b)=>b[1]-a[1]).slice(0,5)};
 console.log(JSON.stringify(out,null,1));await br.close();srv.close()})();
