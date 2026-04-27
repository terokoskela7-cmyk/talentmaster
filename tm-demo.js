/**
 * TalentMaster Demo Panel (tm-demo.js)
 * ------------------------------------------------------------
 * Kelluva ohjauspaneeli näytöstä esittelyä varten.
 * Käynnistä skenaarioita joita ajetaan TMBus.sim kautta.
 *
 * Käyttö: liitä minkä tahansa TMBus-tiedoston loppuun:
 *   <script src="tm-bus.js"></script>
 *   <script src="tm-demo.js"></script>
 *
 * Paneeli näkyy vain jos URL sisältää ?demo  TAI
 * localStorage['tm-demo-panel']==='on'. Muuten piilossa.
 */
(function(){
  'use strict';

  // Näkyvyys: ?demo tai tallennettu
  const u = new URL(location.href);
  const force = u.searchParams.get('demo')!==null;
  const stored = localStorage.getItem('tm-demo-panel')==='on';
  if(!force && !stored) return;
  if(force) localStorage.setItem('tm-demo-panel','on');

  if(!window.TMBus){
    console.warn('[tm-demo] TMBus ei latautunut — ohitetaan paneeli');
    return;
  }

  // ── Skenaariot ──────────────────────────────────────────
  const SCENARIOS = [
    {
      key:'family-logs',
      label:'Vanhempi kirjaa Eemelin pihapelin',
      desc:'Perheen puolesta-kirjaus · U12',
      steps:[
        {t:0,    fn:()=>TMBus.sim.parentLogsForChild('eemeli',{tyyppi:'pihapeli',minutes:45,fiilis:5,note:'Naapurin Jaakon kanssa 1,5h ulkona'})}
      ]
    },
    {
      key:'player-logs',
      label:'Pelaaja kirjaa omatoimisen',
      desc:'Aino · 35 min oma-keho',
      steps:[
        {t:0, fn:()=>TMBus.sim.playerLogsTraining('aino',{tyyppi:'oma-keho',minutes:35,fiilis:4,note:'Aamutreeni ennen koulua'})}
      ]
    },
    {
      key:'coach-reacts',
      label:'Valmentaja reagoi ❤️',
      desc:'Eemelin viimeisimpään kirjaukseen',
      steps:[
        {t:0, fn:()=>TMBus.sim.coachReacts('eemeli','❤️')}
      ]
    },
    {
      key:'coach-message',
      label:'Valmentaja viestii perheelle',
      desc:'Henkilökohtainen viesti',
      steps:[
        {t:0, fn:()=>TMBus.sim.coachMessages('eemeli','Hienoa kun Eemeli on aktiivinen! Muistakaa että tässä iässä tärkeintä on hauskuus ja monipuolisuus.','family')}
      ]
    },
    {
      key:'full-cycle',
      label:'Koko sykli (4 vaihetta, 12s)',
      desc:'Kirjaus → reaktio → viesti → uusi kirjaus',
      steps:[
        {t:0,    fn:()=>TMBus.sim.parentLogsForChild('eemeli',{tyyppi:'pihapeli',minutes:50,fiilis:5,note:'Pihalla 2h, tuli hikisenä takaisin'})},
        {t:3000, fn:()=>TMBus.sim.coachReacts('eemeli','🔥')},
        {t:6000, fn:()=>TMBus.sim.coachMessages('eemeli','Loistavaa! Tuo hiki on paras merkki. Pitäkää tätä linjaa.','family')},
        {t:9000, fn:()=>TMBus.sim.playerLogsTraining('lauri',{tyyppi:'kaveri',minutes:40,fiilis:5,kavereita:1,note:'Eemelin kanssa pihalla'})},
        {t:12000,fn:()=>TMBus.sim.coachReacts('lauri','⭐')}
      ]
    },
    {
      key:'team-rush',
      label:'Joukkue-rush (6 kirjausta 6s)',
      desc:'Samanaikaisia kirjauksia Inboxiin',
      steps:[
        {t:0,   fn:()=>TMBus.sim.playerLogsTraining('aino',  {tyyppi:'oma-keho',minutes:30,fiilis:4})},
        {t:1000,fn:()=>TMBus.sim.playerLogsTraining('joonas',{tyyppi:'voimasali',minutes:60,fiilis:5})},
        {t:2000,fn:()=>TMBus.sim.parentLogsForChild('milla', {tyyppi:'pihapeli',minutes:25,fiilis:4,note:'Trampoliinilla'})},
        {t:3000,fn:()=>TMBus.sim.playerLogsTraining('elina', {tyyppi:'pallo-yksin',minutes:20,fiilis:3})},
        {t:4000,fn:()=>TMBus.sim.parentLogsForChild('lauri', {tyyppi:'metsa',minutes:60,fiilis:5,note:'Metsäretki perheen kanssa'})},
        {t:5000,fn:()=>TMBus.sim.playerLogsTraining('matias',{tyyppi:'kaveri',minutes:45,fiilis:5,kavereita:2})}
      ]
    },
    {
      key:'challenge',
      label:'Haaste: Eemeli → Lauri',
      desc:'Pelaajien välinen haaste',
      steps:[
        {t:0, fn:()=>TMBus.sim.challenge('lauri','eemeli','3 pihaharjoitusta tällä viikolla')}
      ]
    }
  ];

  // ── UI ──────────────────────────────────────────────────
  const css = `
    .tmd-fab{position:fixed;right:16px;bottom:16px;z-index:99998;width:44px;height:44px;border-radius:50%;background:#D97757;color:#fff;border:none;cursor:pointer;font-size:18px;box-shadow:0 6px 20px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-weight:600;letter-spacing:.02em;transition:transform .15s}
    .tmd-fab:hover{transform:scale(1.08)}
    .tmd-panel{position:fixed;right:16px;bottom:72px;z-index:99998;width:320px;max-height:80vh;background:#1C1C1A;border:.5px solid rgba(242,239,230,.12);border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.6);display:none;flex-direction:column;font-family:'DM Sans',system-ui,sans-serif;color:#F2EFE6}
    .tmd-panel.on{display:flex}
    .tmd-hd{padding:14px 16px;border-bottom:.5px solid rgba(242,239,230,.08);display:flex;justify-content:space-between;align-items:center}
    .tmd-hd .tit{font-size:13px;font-weight:600;letter-spacing:.02em}
    .tmd-hd .sub{font-size:10px;color:rgba(242,239,230,.5);letter-spacing:.08em;text-transform:uppercase}
    .tmd-hd button{background:transparent;border:none;color:rgba(242,239,230,.4);cursor:pointer;font-size:18px;padding:0 4px}
    .tmd-hd button:hover{color:#F2EFE6}
    .tmd-body{padding:10px;overflow-y:auto;flex:1}
    .tmd-sc{width:100%;padding:10px 12px;margin-bottom:6px;background:#212120;border:.5px solid rgba(242,239,230,.08);border-radius:6px;color:#F2EFE6;text-align:left;cursor:pointer;transition:all .1s}
    .tmd-sc:hover{border-color:rgba(217,119,87,.5);background:rgba(217,119,87,.08)}
    .tmd-sc.running{border-color:#D97757;background:rgba(217,119,87,.12)}
    .tmd-sc .l{font-size:12px;font-weight:600;margin-bottom:3px}
    .tmd-sc .d{font-size:10px;color:rgba(242,239,230,.55);line-height:1.4}
    .tmd-ft{padding:10px 14px;border-top:.5px solid rgba(242,239,230,.08);display:flex;gap:8px;justify-content:space-between}
    .tmd-ft button{flex:1;padding:8px;background:transparent;border:.5px solid rgba(242,239,230,.12);border-radius:5px;color:rgba(242,239,230,.72);font-size:11px;cursor:pointer;letter-spacing:.04em;font-weight:500}
    .tmd-ft button:hover{color:#F2EFE6;border-color:rgba(242,239,230,.3)}
    .tmd-ft button.danger:hover{border-color:#E67E4F;color:#E67E4F}
    .tmd-log{padding:10px 14px;font-size:10px;color:rgba(242,239,230,.45);font-family:'DM Mono',monospace;border-top:.5px solid rgba(242,239,230,.08);max-height:80px;overflow-y:auto;line-height:1.6}
    .tmd-log .e{color:#28B090}
    .tmd-status{display:inline-block;width:6px;height:6px;border-radius:50%;background:#28B090;margin-right:5px;animation:tmdp 2s ease infinite}
    @keyframes tmdp{0%,100%{opacity:1}50%{opacity:.4}}
  `;
  const style=document.createElement('style');
  style.textContent=css;
  document.head.appendChild(style);

  const fab=document.createElement('button');
  fab.className='tmd-fab';
  fab.title='Demo-paneeli';
  fab.innerHTML='▶';
  document.body.appendChild(fab);

  const panel=document.createElement('div');
  panel.className='tmd-panel';
  panel.innerHTML=`
    <div class="tmd-hd">
      <div>
        <div class="sub"><span class="tmd-status"></span>TalentMaster Demo</div>
        <div class="tit" id="tmdRole">Skenaariot</div>
      </div>
      <button id="tmdClose" title="Sulje">×</button>
    </div>
    <div class="tmd-body" id="tmdBody"></div>
    <div class="tmd-log" id="tmdLog">Valmis. Klikkaa skenaariota aloittaaksesi.</div>
    <div class="tmd-ft">
      <button id="tmdReset" class="danger">Nollaa data</button>
      <button id="tmdHide">Piilota paneeli</button>
    </div>
  `;
  document.body.appendChild(panel);

  const body=panel.querySelector('#tmdBody');
  body.innerHTML=SCENARIOS.map(s=>`
    <button class="tmd-sc" data-k="${s.key}">
      <div class="l">${s.label}</div>
      <div class="d">${s.desc}</div>
    </button>
  `).join('');

  // Rooli-indikaattori URL:sta
  const roleEl=panel.querySelector('#tmdRole');
  const fn=location.pathname.split('/').pop().toLowerCase();
  let role='Skenaariot';
  if(fn.includes('perhe')) role='Perhe-näkymä';
  else if(fn.includes('pelaaja')) role='Pelaaja-näkymä';
  else if(fn.includes('master')||fn.includes('valmentaja')) role='Valmentaja-näkymä';
  roleEl.textContent=role;

  const logEl=panel.querySelector('#tmdLog');
  const log=(msg,t='')=>{
    const time=new Date().toLocaleTimeString('fi-FI');
    const line=document.createElement('div');
    line.innerHTML=`<span class="e">${time}</span> ${msg}`;
    logEl.insertBefore(line,logEl.firstChild);
    while(logEl.children.length>30) logEl.removeChild(logEl.lastChild);
  };

  fab.onclick=()=>panel.classList.toggle('on');
  panel.querySelector('#tmdClose').onclick=()=>panel.classList.remove('on');
  panel.querySelector('#tmdHide').onclick=()=>{
    localStorage.removeItem('tm-demo-panel');
    fab.remove();panel.remove();style.remove();
    alert('Demo-paneeli piilotettu. Käy URL ?demo näyttääksesi uudelleen.');
  };
  panel.querySelector('#tmdReset').onclick=()=>{
    if(confirm('Nollaa kaikki TMBus-data (viestit, kirjaukset, reaktiot)?')){
      TMBus.reset();
      log('⟲ Data nollattu');
    }
  };

  let running=null;
  body.onclick=(e)=>{
    const btn=e.target.closest('.tmd-sc');
    if(!btn) return;
    const k=btn.dataset.k;
    const sc=SCENARIOS.find(s=>s.key===k);
    if(!sc) return;
    if(running){ clearTimeouts(running); running=null; document.querySelectorAll('.tmd-sc').forEach(b=>b.classList.remove('running')); }
    btn.classList.add('running');
    log(`▶ ${sc.label}`);
    running=sc.steps.map(step=>setTimeout(()=>{
      try{ step.fn(); log(`  → vaihe +${step.t}ms ok`); }
      catch(err){ log(`  ✗ virhe: ${err.message}`); }
    },step.t));
    const total=Math.max(...sc.steps.map(s=>s.t));
    setTimeout(()=>{
      btn.classList.remove('running');
      log(`✓ ${sc.label} valmis`);
      running=null;
    },total+500);
  };
  function clearTimeouts(list){ list.forEach(id=>clearTimeout(id)); }

  console.log('[tm-demo] Paneeli ladattu — klikkaa ▶ oikeassa alakulmassa');
})();
