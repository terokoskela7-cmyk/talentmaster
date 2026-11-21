#!/usr/bin/env node
'use strict';
/* kylma_aikajana.js — PR B diagnoosi: kylmän avauksen AIKAJANA paikallisesti (ei stagingia, ei tunnuksia, ei Firestore-lukuja).
 *   node scripts/kuorma/kylma_aikajana.js [sivu.html] [cpu=4] [slow|fast] [odotus_ms=1500] [--deploy]
 * --deploy: palvelee DEPLOY-MUOTOISEN puun (scripts/versiotiiviste.js laske, muistissa: ?v, irrotettu pääskripti, defer) eikä repon lähdettä → mittaa mitä käyttäjä saa; ilman lippua repon lähde (inline).
 * Palvelee repon gzip-pakattuna (Hosting-vastine), Chrome puhelinprofiililla (390×844, Slow 4G 1,6 Mbit/s + 150 ms, CPU 4×), `fast` = ei verkkokuristusta (erottaa CPU:n verkosta).
 * Raportoi: init_ms (firebase.initializeApp-kutsun hetki = auth/App Check alkaa; null jos ei kutsuttu), app_check_token_ms (1. App Check -vaihtopyynnön valmistuminen; null = ei vaihtoa/ei yhteyttä), dcl_ms, VESIPUTOUS (jokainen skripti: haku alkaa/valmis, koko, ajon alku + kesto, sisältää `defer`-tiedot), kirjautumisnäkymän/FCP:n aika, siirretyt tavut (paikalliset vs ulkoiset), per ulkoinen skripti tavut+kesto, pitkät taskit, JS:n compile+evaluate per tiedosto (Chrome-trace).
 * --token=voimassa|ei (oletus ei): tapaus (a) lämmin = voimassa oleva App Check -token kylvetty IndexedDB:hen; (b) kylmä = ei tokenia. ensimmainen_backend_arvio_ms = appCheck().getToken(false):n ratkeamishetki kuoren tultua näkyviin (= milloin 1. Firestore-kutsu voisi lähteä).
 * Rajaus: mittaa KIRJAUTUMATTOMAN kuoren (ennen datalukuja); kirjautumisen jälkeinen renderöinti/luvut mitataan mittaa_sivut.js:llä. */
const http=require('http'),fs=require('fs'),path=require('path'),zlib=require('zlib');
const ROOT=path.resolve(__dirname,'../..'), {chromium}=require('playwright-core');
const ARGV=process.argv.slice(2).filter(x=>x!=='--deploy'&&!x.startsWith('--token=')),DEPLOY=process.argv.includes('--deploy'),TOKEN=(process.argv.find(x=>x.startsWith('--token='))||'--token=ei').slice(8);   /* --token=voimassa: IndexedDB:hen kylvetään voimassa oleva App Check -token (tapaus a, lämmin); ei (oletus): ei tokenia (tapaus b, kylmä) */
const SIVU=ARGV[0]||'TalentMaster_Master_v16.html', CPU=+(ARGV[1]||4), VERKKO=ARGV[2]!=='fast';
const OVERLAY=DEPLOY?require('../versiotiiviste.js').laske(ROOT):null; if(OVERLAY&&OVERLAY.virheet.length){console.error('deploy-muunnos epäonnistui: '+OVERLAY.virheet.join('; '));process.exit(1)}
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
const srv=http.createServer((rq,rs)=>{let p=decodeURIComponent(rq.url.split('?')[0]);const f=path.join(ROOT,p),ov=OVERLAY&&Object.prototype.hasOwnProperty.call(OVERLAY.tiedostot,p.slice(1))?OVERLAY.tiedostot[p.slice(1)]:null;if(ov===null&&(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory())){rs.statusCode=404;return rs.end()}
 const b=ov!==null?Buffer.from(ov,'utf8'):fs.readFileSync(f),t=MIME[path.extname(f)]||'application/octet-stream';rs.setHeader('content-type',t);rs.setHeader('cache-control','no-store');
 if(/html|javascript|css|json|svg/.test(t)){rs.setHeader('content-encoding','gzip');rs.end(zlib.gzipSync(b,{level:6}))}else rs.end(b)});
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;
 const br=await chromium.launch({executablePath:process.env.TM_CHROME_PATH||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(p=>fs.existsSync(p)),args:['--no-sandbox']});
 const ctx=await br.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
 if(TOKEN==='voimassa'){const AID=(fs.readFileSync(path.join(ROOT,SIVU),'utf8').match(/appId:\s*'([^']+)'/)||[])[1];if(!AID){console.error('appId ei löytynyt');process.exit(1)}
  await ctx.addInitScript((aid)=>{try{if(sessionStorage.getItem('__acSeed'))return;sessionStorage.setItem('__acSeed','1');var r=indexedDB.open('firebase-app-check-database',1);r.onupgradeneeded=function(e){if(e.oldVersion===0)r.result.createObjectStore('firebase-app-check-store',{keyPath:'compositeKey'})};r.onsuccess=function(){try{var t=r.result.transaction('firebase-app-check-store','readwrite');t.objectStore('firebase-app-check-store').put({compositeKey:aid+'-[DEFAULT]',value:{token:'eyJ.mallitoken.x',expireTimeMillis:Date.now()+36e5*20,issuedAtTimeMillis:Date.now()-36e5*2}});t.oncomplete=function(){r.result.close()}}catch(e){}}}catch(e){}},AID)}
 await ctx.addInitScript(()=>{window.__lt=[];try{new PerformanceObserver(l=>l.getEntries().forEach(e=>__lt.push([e.startTime,e.duration]))).observe({type:'longtask',buffered:true})}catch(e){}
  window.__initMs=null;try{var _fb;Object.defineProperty(window,'firebase',{configurable:true,get:function(){return _fb},set:function(v){_fb=v;try{if(v&&typeof v.initializeApp==='function'&&!v.__tmKaare){var o=v.initializeApp;v.initializeApp=function(){if(window.__initMs===null)window.__initMs=performance.now();return o.apply(this,arguments)};v.__tmKaare=1}}catch(e){}}})}catch(e){}
  window.__fcp=null;try{new PerformanceObserver(l=>l.getEntries().forEach(e=>{if(e.name==='first-contentful-paint')__fcp=e.startTime})).observe({type:'paint',buffered:true})}catch(e){}});
 const page=await ctx.newPage(),cdp=await ctx.newCDPSession(page);await cdp.send('Network.enable');
 if(VERKKO)await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1.6e6/8,uploadThroughput:750e3/8});
 if(CPU>1)await cdp.send('Emulation.setCPUThrottlingRate',{rate:CPU});
 const req=new Map();cdp.on('Network.requestWillBeSent',e=>req.set(e.requestId,{url:e.request.url,t0:e.timestamp,type:e.type,enc:0,fin:null}));
 cdp.on('Network.loadingFinished',e=>{const r=req.get(e.requestId);if(r){r.enc=e.encodedDataLength;r.fin=e.timestamp}});
 await br.startTracing(page,{categories:['devtools.timeline','v8','disabled-by-default-v8.compile','blink.user_timing']});
 const t0=Date.now();await page.goto('http://127.0.0.1:'+port+'/'+SIVU,{waitUntil:'commit'});
 let kunnossa=false;for(let i=0;i<200;i++){await page.waitForTimeout(300);try{kunnossa=await page.evaluate(()=>{const a=document.getElementById('sLogin');return !!(a&&!a.classList.contains('hidden')&&a.getBoundingClientRect().height>0)})}catch(e){} if(kunnossa)break}
 const tLogin=Date.now()-t0;
 /* 1. Firestore -arvio: ensimmäinen backend-kutsu odottaa App Check -tokenia → mitataan milloin appCheck().getToken(false) ratkeaa kutsuttuna heti kun kuori on näkyvissä (ei kirjautumista → ei oikeaa Firestorea). Virhe/aikakatkaisu 20 s raportoidaan. */
 const gt=await page.evaluate(()=>new Promise(res=>{const a=performance.now();let v=false;const lop=(k)=>{if(v)return;v=true;res({alku:Math.round(a),valmis:Math.round(performance.now()),tulos:k})};setTimeout(()=>lop('aikakatkaisu'),20000);try{firebase.appCheck().getToken(false).then(r=>lop(r&&r.token&&!r.error?'token':'ei_tokenia'),()=>lop('virhe'))}catch(e){lop('heitti')}})).catch(()=>null);
 await page.waitForTimeout(1500);
 const tr=JSON.parse((await br.stopTracing()).toString());
 const m=await page.evaluate(()=>({fcp:__fcp,lt:__lt,nyt:performance.now(),init:window.__initMs,act:(()=>{const r=performance.getEntriesByType('resource').filter(e=>/firebaseappcheck\.googleapis\.com/.test(e.name)).sort((a,b)=>a.startTime-b.startTime)[0];return r?r.responseEnd:null})(),dcl:(performance.getEntriesByType('navigation')[0]||{}).domContentLoadedEventEnd||null,res:performance.getEntriesByType('resource').filter(e=>e.initiatorType==='script'||/\.js(\?|$)/.test(e.name)).map(e=>({url:e.name,start:e.startTime,valmis:e.responseEnd,kt:Math.round((e.encodedBodySize||0)/102.4)/10})),scr:[].map.call(document.scripts,s=>({src:s.src||null,defer:s.defer,async:s.async,tyyppi:s.type||''}))}));
 // trace: per url compile+evaluate
 const agg={},evalAlku={};const ev=tr.traceEvents||tr;
 const navTs=(ev.filter(e=>e.name==='navigationStart'&&e.args&&e.args.data&&e.args.data.isLoadingMainFrame).map(e=>e.ts).sort((a,b)=>a-b)[0])||null;
 for(const e of ev){if(e.ph!=='X'||!e.dur)continue;const u=e.args&&e.args.data&&(e.args.data.url||e.args.data.fileName);
  if(['EvaluateScript','v8.compile','v8.produceCache','FunctionCall'].includes(e.name)&&u){const k=u.replace(/^http:\/\/127\.0\.0\.1:\d+\//,'');const a=agg[k]=agg[k]||{compile:0,eval:0};if(e.name==='v8.compile')a.compile+=e.dur/1000;else if(e.name==='EvaluateScript'){a.eval+=e.dur/1000;if(navTs!==null&&(evalAlku[k]===undefined||e.ts<evalAlku[k]))evalAlku[k]=Math.round((e.ts-navTs)/1000)}}}
 const parse=ev.filter(e=>e.name==='ParseHTML'&&e.dur).reduce((s,e)=>s+e.dur/1000,0);
 const R=[...req.values()].filter(r=>r.fin);const sum=f=>R.filter(f).reduce((s,r)=>s+r.enc,0);
 const nimiRe=/^http:\/\/127\.0\.0\.1:\d+\//,lyh=u=>u.replace(nimiRe,'').replace(/\?.*/,'');
 const defMap=new Map(m.scr.filter(x=>x.src).map(x=>[lyh(x.src),x]));
 const vesiputous=m.res.map(e=>{const k=lyh(e.url),a=agg[Object.keys(agg).find(x=>x.replace(/\?.*/,'')===k)||''],d=defMap.get(k);return{skripti:k.slice(0,70),haku_alkaa_ms:Math.round(e.start),haku_valmis_ms:Math.round(e.valmis),kt_gz:e.kt,ajo_alkaa_ms:evalAlku[Object.keys(evalAlku).find(x=>x.replace(/\?.*/,'')===k)||'']??null,ajo_kesto_ms:a?Math.round(a.compile+a.eval):null,defer:d?d.defer:null,async:d?d.async:null}}).sort((a,b)=>a.haku_alkaa_ms-b.haku_alkaa_ms);
 const out={sivu:SIVU,deploy:DEPLOY,token:TOKEN,cpu:CPU,verkko:VERKKO,init_ms:m.init===null?null:Math.round(m.init),app_check_token_ms:m.act==null?null:Math.round(m.act),ensimmainen_backend_arvio_ms:gt?gt.valmis:null,getToken_tulos:gt?gt.tulos:null,dcl_ms:m.dcl===null?null:Math.round(m.dcl),skriptit_yht:m.scr.filter(x=>x.src).length,skriptit_defer:m.scr.filter(x=>x.src&&x.defer).length,loginNakyy_ms:tLogin,fcp_ms:Math.round(m.fcp),pyyntoja:R.length,enc_kt:Math.round(sum(()=>1)/1024),
  local_kt:Math.round(sum(r=>r.url.includes('127.0.0.1'))/1024),ulkoiset_kt:Math.round(sum(r=>!r.url.includes('127.0.0.1'))/1024),
  pitkat_taskit:m.lt.length,pitkat_yht_ms:Math.round(m.lt.reduce((s,x)=>s+x[1],0)),pisin_ms:Math.round(Math.max(0,...m.lt.map(x=>x[1]))),parseHTML_ms:Math.round(parse),
  ulkoiset:R.filter(r=>!r.url.includes('127.0.0.1')).map(r=>[r.url.replace(/\?.*/,'').slice(0,80),Math.round(r.enc/1024),Math.round((r.fin-r.t0)*1000)]).sort((a,b)=>b[1]-a[1]).slice(0,12),
  jsKompilEval:Object.entries(agg).map(([k,v])=>[k,Math.round(v.compile+v.eval),Math.round(v.compile),Math.round(v.eval)]).sort((a,b)=>b[1]-a[1]).slice(0,22),
  jsYht_ms:Math.round(Object.values(agg).reduce((s,v)=>s+v.compile+v.eval,0)),
  vesiputous:vesiputous,
  top_aika:R.map(r=>[r.url.replace(/^http:\/\/127\.0\.0\.1:\d+\//,'').replace(/\?.*/,'').slice(0,60),Math.round((r.fin-r.t0)*1000)]).sort((a,b)=>b[1]-a[1]).slice(0,5)};
 console.log(JSON.stringify(out,null,1));await br.close();srv.close()})();
