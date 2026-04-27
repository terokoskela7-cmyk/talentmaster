/* ==========================================================================
   tm-charts.js · v1.0 · TalentMaster — ammattilaistason visualisoinnit
   --------------------------------------------------------------------------
   Vanilla JS · ei riippuvuuksia · puhdas SVG · Cormorant-numerot
   Kaikki funktiot palauttavat SVG-merkkijonon innerHTML-istutusta varten.
   --------------------------------------------------------------------------
   API
     TM.charts.radar({ akselit, pelaaja, vertailu?, kohorttiKaista?, koko? })
     TM.charts.trendLine({ pisteet, percentiilit?, tavoite?, koko? })
     TM.charts.percentileLane({ arvo, percentiilit, koko? })
     TM.charts.sparkline({ pisteet, suunta?, koko? })
     TM.charts.heatmap({ rivit, sarakkeet, arvot, koko? })
     TM.charts.benchmarkBar({ pelaaja, kohortti, kv?, koko? })
     TM.charts.violin({ jakauma, pelaajaArvo, koko? })
   --------------------------------------------------------------------------
   Tyylivakiot — design system
   ========================================================================== */
(function(){
  'use strict';
  if (typeof window === 'undefined') return;
  window.TM = window.TM || {};

  // ── Värit (täsmää colors_and_type.css) ──────────────────────────────────
  var V = {
    ink:    '#1C1C1A',
    ink2:   'rgba(28,28,26,.62)',
    ink3:   'rgba(28,28,26,.40)',
    line:   'rgba(28,28,26,.14)',
    line2:  'rgba(28,28,26,.08)',
    paper:  '#FAFAF7',
    bg:     '#F2EFE6',
    teal:   '#1A7A5E',
    tealBg: 'rgba(26,122,94,.10)',
    amber:  '#A06A1A',
    amberBg:'rgba(160,106,26,.10)',
    red:    '#B24A3C',
    redBg:  'rgba(178,74,60,.10)',
    plum:   '#6B4A7A',
    gold:   '#B8860B',
    fire:   '#B85C38'
  };
  var FONT_NUM = "'Cormorant Garamond', serif";
  var FONT_LBL = "'DM Mono', ui-monospace, monospace";
  var FONT_TXT = "'DM Sans', system-ui, sans-serif";

  // ── Apufunktiot ──────────────────────────────────────────────────────────
  function esc(s){ return String(s==null?'':s).replace(/[<>&"']/g,function(c){return{'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c];}); }
  function nf(n,d){ d=d==null?1:d; if(n==null||isNaN(n))return '—'; return Number(n).toFixed(d).replace('.',','); }
  function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
  function lerp(a,b,t){ return a+(b-a)*t; }

  // ── Polku- ja muotoutilities ────────────────────────────────────────────
  function pathPolyline(pts, closed){
    if (!pts || !pts.length) return '';
    var d = 'M'+pts.map(function(p){return p[0].toFixed(2)+' '+p[1].toFixed(2);}).join(' L');
    return closed ? d+' Z' : d;
  }
  // Catmull-Rom → Bezier (sileät trendiviivat)
  function pathSmooth(pts){
    if (!pts || pts.length < 2) return pathPolyline(pts);
    var d = 'M'+pts[0][0].toFixed(2)+' '+pts[0][1].toFixed(2);
    for (var i=0;i<pts.length-1;i++){
      var p0 = pts[i-1] || pts[i];
      var p1 = pts[i];
      var p2 = pts[i+1];
      var p3 = pts[i+2] || p2;
      var c1x = p1[0] + (p2[0]-p0[0])/6;
      var c1y = p1[1] + (p2[1]-p0[1])/6;
      var c2x = p2[0] - (p3[0]-p1[0])/6;
      var c2y = p2[1] - (p3[1]-p1[1])/6;
      d += ' C'+c1x.toFixed(2)+' '+c1y.toFixed(2)+', '+c2x.toFixed(2)+' '+c2y.toFixed(2)+', '+p2[0].toFixed(2)+' '+p2[1].toFixed(2);
    }
    return d;
  }

  /* ========================================================================
     RADAR · 5 ketjun sädekartta · pelaaja ▒ vs ▒ kohortin percentiilikaista
     ====================================================================== */
  function radar(o){
    o = o || {};
    var akselit  = o.akselit || ['SBL','SFL','LL','DIAG','DFL'];
    var pelaaja  = o.pelaaja  || [60,55,72,48,65];
    var vertailu = o.vertailu || null;
    var kaista   = o.kohorttiKaista || null; // {p25:[...], p75:[...]}
    var koko     = o.koko || 360;
    var maxArvo  = o.max || 100;
    var nimi     = o.nimi || 'Pelaaja';
    var vertailuNimi = o.vertailuNimi || 'Ikäluokka';

    var cx = koko/2, cy = koko/2 + 6;
    var r  = koko*0.36;
    var n  = akselit.length;
    var ang = function(i){ return (i/n)*Math.PI*2 - Math.PI/2; };
    var pt = function(i, val){
      var v = clamp(val/maxArvo, 0, 1.05);
      return [cx + Math.cos(ang(i))*r*v, cy + Math.sin(ang(i))*r*v];
    };

    var svg = ['<svg viewBox="0 0 '+koko+' '+koko+'" width="'+koko+'" height="'+koko+'" xmlns="http://www.w3.org/2000/svg" style="display:block">'];

    // Defs — gradient pelaajalle
    svg.push('<defs>'
      +'<radialGradient id="rg-pl" cx="50%" cy="50%" r="50%">'
      +'<stop offset="0%" stop-color="'+V.teal+'" stop-opacity=".22"/>'
      +'<stop offset="100%" stop-color="'+V.teal+'" stop-opacity=".05"/>'
      +'</radialGradient>'
      +'<filter id="rg-soft"><feGaussianBlur stdDeviation=".3"/></filter>'
      +'</defs>');

    // Konsentriset ringit (4 tasoa) + arvolabelit
    for (var k=1;k<=4;k++){
      var rk = r*(k/4);
      var ringPts = [];
      for (var i=0;i<n;i++) ringPts.push([cx+Math.cos(ang(i))*rk, cy+Math.sin(ang(i))*rk]);
      svg.push('<path d="'+pathPolyline(ringPts,true)+'" fill="none" stroke="'+V.line+'" stroke-width=".5"'+(k===4?'':' stroke-dasharray="2 3"')+'/>');
    }
    // Akselit
    for (var i=0;i<n;i++){
      var p = pt(i, maxArvo);
      svg.push('<line x1="'+cx+'" y1="'+cy+'" x2="'+p[0].toFixed(2)+'" y2="'+p[1].toFixed(2)+'" stroke="'+V.line+'" stroke-width=".5"/>');
    }

    // Kohortin percentiilikaista (25–75)
    if (kaista && kaista.p25 && kaista.p75){
      var ulko = [], sis = [];
      for (var i=0;i<n;i++){ ulko.push(pt(i, kaista.p75[i])); sis.push(pt(i, kaista.p25[i])); }
      // ulko polygoni miinus sisä polygoni → täytä even-odd
      svg.push('<path fill="'+V.amber+'" fill-opacity=".10" stroke="none" fill-rule="evenodd" d="'+pathPolyline(ulko,true)+' '+pathPolyline(sis.slice().reverse(),true)+'"/>');
      // mediaani p50 jos annettu
      if (kaista.p50){
        var med = []; for (var i=0;i<n;i++) med.push(pt(i, kaista.p50[i]));
        svg.push('<path d="'+pathPolyline(med,true)+'" fill="none" stroke="'+V.amber+'" stroke-width="1" stroke-dasharray="3 2" opacity=".7"/>');
      }
    }

    // Vertailu (ikäluokan keskiarvo viiva)
    if (vertailu){
      var vp = []; for (var i=0;i<n;i++) vp.push(pt(i, vertailu[i]));
      svg.push('<path d="'+pathPolyline(vp,true)+'" fill="none" stroke="'+V.ink2+'" stroke-width="1" stroke-dasharray="4 3"/>');
    }

    // Pelaaja — täytetty
    var pp = []; for (var i=0;i<n;i++) pp.push(pt(i, pelaaja[i]));
    svg.push('<path d="'+pathPolyline(pp,true)+'" fill="url(#rg-pl)" stroke="'+V.teal+'" stroke-width="1.5"/>');
    // Pisteet
    for (var i=0;i<n;i++){
      svg.push('<circle cx="'+pp[i][0].toFixed(2)+'" cy="'+pp[i][1].toFixed(2)+'" r="3.5" fill="'+V.paper+'" stroke="'+V.teal+'" stroke-width="1.5"/>');
    }

    // Akseli-labelit + arvot
    for (var i=0;i<n;i++){
      var lp = [cx + Math.cos(ang(i))*(r+22), cy + Math.sin(ang(i))*(r+22)];
      var anchor = 'middle';
      if (Math.cos(ang(i)) > 0.3) anchor='start';
      else if (Math.cos(ang(i)) < -0.3) anchor='end';
      svg.push('<text x="'+lp[0].toFixed(1)+'" y="'+lp[1].toFixed(1)+'" font-family="'+FONT_LBL+'" font-size="9" letter-spacing=".18em" fill="'+V.ink+'" text-anchor="'+anchor+'" dominant-baseline="middle">'+esc(akselit[i])+'</text>');
      // arvo
      var ap = [cx + Math.cos(ang(i))*(r+38), cy + Math.sin(ang(i))*(r+38)];
      svg.push('<text x="'+ap[0].toFixed(1)+'" y="'+ap[1].toFixed(1)+'" font-family="'+FONT_NUM+'" font-size="18" font-weight="300" fill="'+V.teal+'" text-anchor="'+anchor+'" dominant-baseline="middle">'+pelaaja[i]+'</text>');
    }

    // Legend (alhaalla)
    var ly = koko - 14;
    svg.push('<g font-family="'+FONT_LBL+'" font-size="9" letter-spacing=".12em" fill="'+V.ink2+'">');
    svg.push('<rect x="20" y="'+(ly-8)+'" width="12" height="3" fill="'+V.teal+'"/><text x="36" y="'+(ly-5)+'" dominant-baseline="middle">'+esc(nimi.toUpperCase())+'</text>');
    if (vertailu){
      svg.push('<line x1="120" y1="'+(ly-7)+'" x2="132" y2="'+(ly-7)+'" stroke="'+V.ink2+'" stroke-width="1" stroke-dasharray="4 3"/><text x="136" y="'+(ly-5)+'" dominant-baseline="middle">'+esc(vertailuNimi.toUpperCase())+'</text>');
    }
    if (kaista){
      svg.push('<rect x="240" y="'+(ly-9)+'" width="12" height="6" fill="'+V.amber+'" fill-opacity=".25"/><text x="256" y="'+(ly-5)+'" dominant-baseline="middle">25–75 PERSENT.</text>');
    }
    svg.push('</g>');
    svg.push('</svg>');
    return svg.join('');
  }

  /* ========================================================================
     TREND LINE · 12 kk pitkittäistrendi · percentiilikaista taustalla
     ====================================================================== */
  function trendLine(o){
    o = o || {};
    var pisteet = o.pisteet || []; // [{x:'2026-01', y:32, baseline?:bool}]
    var percentiilit = o.percentiilit || null; // {p10:[...], p25:[...], p50:[...], p75:[...], p90:[...]} samansuuruinen kuin pisteet
    var tavoite = o.tavoite != null ? o.tavoite : null;
    var koko = o.koko || {w:540, h:240};
    var yksikko = o.yksikko || '';
    var otsikko = o.otsikko || '';
    var korkein = o.korkein != null ? o.korkein : null; // "korkein parempi" = true → vihreä ylöspäin
    var suunta = o.suunta || 'ylos'; // ylos | alas (esim. sprint-aika alaspäin = parempi)

    var W = koko.w, H = koko.h;
    var M = {t:30, r:24, b:38, l:48};
    var iw = W - M.l - M.r, ih = H - M.t - M.b;

    // Y-skaala
    var ys = pisteet.map(function(p){return p.y;}).filter(function(v){return v!=null;});
    if (percentiilit){
      ['p10','p25','p50','p75','p90'].forEach(function(k){ if(percentiilit[k]) percentiilit[k].forEach(function(v){if(v!=null)ys.push(v);}); });
    }
    if (tavoite!=null) ys.push(tavoite);
    var ymin = Math.min.apply(null, ys), ymax = Math.max.apply(null, ys);
    var pad = (ymax-ymin)*0.1 || 1;
    ymin -= pad; ymax += pad;
    var X = function(i){ return M.l + (i/(pisteet.length-1 || 1)) * iw; };
    var Y = function(v){ return M.t + ih - ((v - ymin)/(ymax - ymin)) * ih; };

    var svg = ['<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" xmlns="http://www.w3.org/2000/svg" style="display:block">'];

    // Otsikko
    if (otsikko){
      svg.push('<text x="'+M.l+'" y="16" font-family="'+FONT_LBL+'" font-size="9" letter-spacing=".18em" fill="'+V.ink3+'">'+esc(otsikko.toUpperCase())+'</text>');
    }

    // Y-grid (4 viivaa)
    for (var g=0; g<=4; g++){
      var yv = ymin + (ymax-ymin)*(g/4);
      var y = Y(yv);
      svg.push('<line x1="'+M.l+'" y1="'+y.toFixed(1)+'" x2="'+(M.l+iw)+'" y2="'+y.toFixed(1)+'" stroke="'+V.line2+'" stroke-width=".5"/>');
      svg.push('<text x="'+(M.l-8)+'" y="'+y.toFixed(1)+'" font-family="'+FONT_NUM+'" font-size="13" fill="'+V.ink3+'" text-anchor="end" dominant-baseline="middle">'+nf(yv, yksikko==='s'?2:0)+'</text>');
    }

    // Percentiilikaista (10–90 vaaleampi, 25–75 tummempi)
    if (percentiilit && percentiilit.p10 && percentiilit.p90){
      var top=[], bot=[];
      for (var i=0;i<pisteet.length;i++){
        top.push([X(i), Y(percentiilit.p90[i])]);
        bot.push([X(i), Y(percentiilit.p10[i])]);
      }
      svg.push('<path d="'+pathSmooth(top)+' L'+bot.slice().reverse().map(function(p){return p[0].toFixed(2)+' '+p[1].toFixed(2);}).join(' L')+' Z" fill="'+V.ink+'" fill-opacity=".04"/>');
    }
    if (percentiilit && percentiilit.p25 && percentiilit.p75){
      var top=[], bot=[];
      for (var i=0;i<pisteet.length;i++){
        top.push([X(i), Y(percentiilit.p75[i])]);
        bot.push([X(i), Y(percentiilit.p25[i])]);
      }
      svg.push('<path d="'+pathSmooth(top)+' L'+bot.slice().reverse().map(function(p){return p[0].toFixed(2)+' '+p[1].toFixed(2);}).join(' L')+' Z" fill="'+V.ink+'" fill-opacity=".07"/>');
    }
    if (percentiilit && percentiilit.p50){
      var med = pisteet.map(function(p,i){return [X(i), Y(percentiilit.p50[i])];});
      svg.push('<path d="'+pathSmooth(med)+'" fill="none" stroke="'+V.ink2+'" stroke-width=".8" stroke-dasharray="3 3"/>');
    }

    // Tavoite-viiva
    if (tavoite!=null){
      var ty = Y(tavoite);
      svg.push('<line x1="'+M.l+'" y1="'+ty.toFixed(1)+'" x2="'+(M.l+iw)+'" y2="'+ty.toFixed(1)+'" stroke="'+V.gold+'" stroke-width="1" stroke-dasharray="4 2"/>');
      svg.push('<text x="'+(M.l+iw-4)+'" y="'+(ty-4)+'" font-family="'+FONT_LBL+'" font-size="9" letter-spacing=".12em" fill="'+V.gold+'" text-anchor="end">TAVOITE '+nf(tavoite, yksikko==='s'?2:0)+'</text>');
    }

    // Pelaajan trendiviiva
    var pl = pisteet.map(function(p,i){return [X(i), Y(p.y)];});
    svg.push('<path d="'+pathSmooth(pl)+'" fill="none" stroke="'+V.teal+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>');

    // Pisteet + viimeisin korostettu
    pisteet.forEach(function(p,i){
      var x=X(i), y=Y(p.y), last = (i===pisteet.length-1);
      svg.push('<circle cx="'+x.toFixed(2)+'" cy="'+y.toFixed(2)+'" r="'+(last?5:3.5)+'" fill="'+(last?V.teal:V.paper)+'" stroke="'+V.teal+'" stroke-width="1.5"/>');
      if (p.baseline){
        svg.push('<text x="'+x.toFixed(2)+'" y="'+(y-12)+'" font-family="'+FONT_LBL+'" font-size="9" letter-spacing=".1em" fill="'+V.ink3+'" text-anchor="middle">LÄHTÖ</text>');
      }
      if (last){
        svg.push('<text x="'+x.toFixed(2)+'" y="'+(y-14)+'" font-family="'+FONT_NUM+'" font-size="20" font-weight="300" fill="'+V.teal+'" text-anchor="middle">'+nf(p.y, yksikko==='s'?2:0)+(yksikko?' '+yksikko:'')+'</text>');
      }
    });

    // X-axis labelit
    pisteet.forEach(function(p,i){
      if (i % Math.ceil(pisteet.length/8) === 0 || i===pisteet.length-1){
        svg.push('<text x="'+X(i).toFixed(1)+'" y="'+(H-M.b+18)+'" font-family="'+FONT_LBL+'" font-size="9" letter-spacing=".1em" fill="'+V.ink3+'" text-anchor="middle">'+esc(p.x)+'</text>');
      }
    });

    svg.push('</svg>');
    return svg.join('');
  }

  /* ========================================================================
     PERCENTILE LANE · pieni horisontaalinen percentiilikaista 10–25–50–75–90
     ====================================================================== */
  function percentileLane(o){
    o = o || {};
    var arvo = o.arvo;
    var p = o.percentiilit; // {p10,p25,p50,p75,p90,min,max,suunta}
    var koko = o.koko || {w:280, h:42};
    var yksikko = o.yksikko || '';
    var W = koko.w, H = koko.h;
    var min = p.min!=null ? p.min : p.p10*0.85;
    var max = p.max!=null ? p.max : p.p90*1.15;
    var X = function(v){ return 12 + ((v-min)/(max-min)) * (W-24); };

    var svg = ['<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" xmlns="http://www.w3.org/2000/svg" style="display:block">'];
    // Tausta
    svg.push('<rect x="12" y="'+(H/2-6)+'" width="'+(W-24)+'" height="12" fill="'+V.line2+'" rx="6"/>');
    // 10–90 kaista
    svg.push('<rect x="'+X(p.p10).toFixed(1)+'" y="'+(H/2-6)+'" width="'+(X(p.p90)-X(p.p10)).toFixed(1)+'" height="12" fill="'+V.amber+'" fill-opacity=".18" rx="6"/>');
    // 25–75 kaista
    svg.push('<rect x="'+X(p.p25).toFixed(1)+'" y="'+(H/2-6)+'" width="'+(X(p.p75)-X(p.p25)).toFixed(1)+'" height="12" fill="'+V.amber+'" fill-opacity=".30" rx="6"/>');
    // mediaani-merkki
    svg.push('<line x1="'+X(p.p50).toFixed(1)+'" y1="'+(H/2-9)+'" x2="'+X(p.p50).toFixed(1)+'" y2="'+(H/2+9)+'" stroke="'+V.amber+'" stroke-width="1.5"/>');
    // Pelaajan piste
    if (arvo!=null){
      var ax = X(arvo);
      svg.push('<line x1="'+ax.toFixed(1)+'" y1="'+(H/2-12)+'" x2="'+ax.toFixed(1)+'" y2="'+(H/2+12)+'" stroke="'+V.teal+'" stroke-width="2"/>');
      svg.push('<circle cx="'+ax.toFixed(1)+'" cy="'+(H/2)+'" r="5" fill="'+V.teal+'" stroke="'+V.paper+'" stroke-width="2"/>');
      svg.push('<text x="'+ax.toFixed(1)+'" y="'+(H/2-16)+'" font-family="'+FONT_NUM+'" font-size="14" font-weight="500" fill="'+V.teal+'" text-anchor="middle">'+nf(arvo, yksikko==='s'?2:0)+'</text>');
    }
    // Skaalalabelit
    svg.push('<text x="12" y="'+(H-3)+'" font-family="'+FONT_LBL+'" font-size="8" letter-spacing=".15em" fill="'+V.ink3+'">'+nf(min, yksikko==='s'?2:0)+'</text>');
    svg.push('<text x="'+(W-12)+'" y="'+(H-3)+'" font-family="'+FONT_LBL+'" font-size="8" letter-spacing=".15em" fill="'+V.ink3+'" text-anchor="end">'+nf(max, yksikko==='s'?2:0)+'</text>');
    svg.push('<text x="'+X(p.p50).toFixed(1)+'" y="'+(H-3)+'" font-family="'+FONT_LBL+'" font-size="8" letter-spacing=".15em" fill="'+V.amber+'" text-anchor="middle">P50</text>');
    svg.push('</svg>');
    return svg.join('');
  }

  /* ========================================================================
     SPARKLINE · pieni inline-trendi
     ====================================================================== */
  function sparkline(o){
    o = o || {};
    var pts = o.pisteet || [];
    var koko = o.koko || {w:80, h:22};
    var suunta = o.suunta || 'ylos'; // ylos = positiivinen ylös
    if (!pts.length) return '<svg width="'+koko.w+'" height="'+koko.h+'"></svg>';
    var min = Math.min.apply(null, pts), max = Math.max.apply(null, pts);
    if (min===max){ min -= 1; max += 1; }
    var X = function(i){ return 1 + (i/(pts.length-1))*(koko.w-2); };
    var Y = function(v){ return 1 + (1 - (v-min)/(max-min))*(koko.h-2); };
    var trendi = pts[pts.length-1] - pts[0];
    var positiivinen = (suunta==='ylos') ? trendi>0 : trendi<0;
    var stroke = positiivinen ? V.teal : (trendi===0 ? V.ink3 : V.red);
    var poly = pts.map(function(v,i){return [X(i),Y(v)];});
    var svg = ['<svg viewBox="0 0 '+koko.w+' '+koko.h+'" width="'+koko.w+'" height="'+koko.h+'" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle">'];
    // täyttö alle viivan
    var fill = poly.slice();
    fill.push([X(pts.length-1), koko.h-1]); fill.push([X(0), koko.h-1]);
    svg.push('<path d="'+pathPolyline(fill,true)+'" fill="'+stroke+'" fill-opacity=".10" stroke="none"/>');
    svg.push('<path d="'+pathSmooth(poly)+'" fill="none" stroke="'+stroke+'" stroke-width="1.4" stroke-linecap="round"/>');
    svg.push('<circle cx="'+X(pts.length-1).toFixed(1)+'" cy="'+Y(pts[pts.length-1]).toFixed(1)+'" r="2" fill="'+stroke+'"/>');
    svg.push('</svg>');
    return svg.join('');
  }

  /* ========================================================================
     HEATMAP · joukkue × testi
     ====================================================================== */
  function heatmap(o){
    o = o || {};
    var rivit = o.rivit || [];      // pelaajat
    var sarak = o.sarakkeet || [];  // testit
    var arvot = o.arvot || [];      // [[..],[..]] 0–100 normalisoitu
    var koko = o.koko || {w:560, h: 24*rivit.length+44};
    var solu = { w: (koko.w-150)/sarak.length, h: 24 };
    var W=koko.w, H=koko.h;
    var svg = ['<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" xmlns="http://www.w3.org/2000/svg" style="display:block">'];
    // Sarakeotsikot
    sarak.forEach(function(s,i){
      var x = 150 + i*solu.w + solu.w/2;
      svg.push('<text x="'+x.toFixed(1)+'" y="14" font-family="'+FONT_LBL+'" font-size="9" letter-spacing=".15em" fill="'+V.ink3+'" text-anchor="middle">'+esc(s.toUpperCase())+'</text>');
    });
    // Rivit
    rivit.forEach(function(r,i){
      var y = 30 + i*solu.h;
      svg.push('<text x="142" y="'+(y+solu.h/2)+'" font-family="'+FONT_TXT+'" font-size="11" fill="'+V.ink+'" text-anchor="end" dominant-baseline="middle">'+esc(r)+'</text>');
      sarak.forEach(function(s,j){
        var v = arvot[i][j];
        var color = v==null ? V.line2 : v<25 ? V.red : v<50 ? V.amber : v<75 ? V.teal : V.gold;
        var alpha = v==null ? 0.3 : 0.25 + (v/100)*0.65;
        svg.push('<rect x="'+(150+j*solu.w+1).toFixed(1)+'" y="'+y+'" width="'+(solu.w-2).toFixed(1)+'" height="'+(solu.h-2)+'" fill="'+color+'" fill-opacity="'+alpha.toFixed(2)+'"/>');
        if (v!=null){
          svg.push('<text x="'+(150+j*solu.w+solu.w/2).toFixed(1)+'" y="'+(y+solu.h/2)+'" font-family="'+FONT_NUM+'" font-size="13" fill="'+V.ink+'" text-anchor="middle" dominant-baseline="middle">'+v+'</text>');
        }
      });
    });
    svg.push('</svg>');
    return svg.join('');
  }

  /* ========================================================================
     BENCHMARK BAR · pelaaja vs kohortti vs KV-norm
     ====================================================================== */
  function benchmarkBar(o){
    o = o || {};
    var pelaaja = o.pelaaja, kohortti = o.kohortti, kv = o.kv;
    var max = Math.max(pelaaja, kohortti||0, kv||0) * 1.2;
    var koko = o.koko || {w:380, h:130};
    var W=koko.w, H=koko.h;
    var X = function(v){ return 14 + (v/max)*(W-30); };
    var rows = [
      {nimi: o.nimi||'PELAAJA', arvo: pelaaja, vari: V.teal},
      kohortti!=null ? {nimi:'IKÄLUOKKA P50', arvo:kohortti, vari: V.amber} : null,
      kv!=null ? {nimi:'KV-NORM 14V', arvo:kv, vari: V.plum} : null
    ].filter(Boolean);
    var svg = ['<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" xmlns="http://www.w3.org/2000/svg" style="display:block">'];
    rows.forEach(function(r,i){
      var y = 14 + i*38;
      svg.push('<text x="14" y="'+y+'" font-family="'+FONT_LBL+'" font-size="9" letter-spacing=".15em" fill="'+V.ink3+'">'+esc(r.nimi)+'</text>');
      svg.push('<rect x="14" y="'+(y+6)+'" width="'+(W-28)+'" height="6" fill="'+V.line2+'" rx="3"/>');
      svg.push('<rect x="14" y="'+(y+6)+'" width="'+((X(r.arvo)-14)).toFixed(1)+'" height="6" fill="'+r.vari+'" rx="3"/>');
      svg.push('<text x="'+X(r.arvo).toFixed(1)+'" y="'+(y+1)+'" font-family="'+FONT_NUM+'" font-size="16" fill="'+r.vari+'" text-anchor="end">'+nf(r.arvo,1)+(o.yksikko?' '+o.yksikko:'')+'</text>');
    });
    svg.push('</svg>');
    return svg.join('');
  }

  /* ========================================================================
     VIOLIN · jakauma + pelaajan piste (kohortin jakauman muoto)
     ====================================================================== */
  function violin(o){
    o = o || {};
    var jakauma = o.jakauma || []; // [{x:arvo, n:tiheys}]
    var koko = o.koko || {w:120, h:240};
    var pelaaja = o.pelaajaArvo;
    var W=koko.w, H=koko.h;
    if (!jakauma.length) return '';
    var ymin = jakauma[0].x, ymax = jakauma[jakauma.length-1].x;
    var nmax = Math.max.apply(null, jakauma.map(function(d){return d.n;}));
    var Y = function(v){ return 16 + (1-(v-ymin)/(ymax-ymin))*(H-32); };
    var Xr= function(n){ return (n/nmax)*(W*0.4); };
    var cx = W/2;
    var pts = jakauma.map(function(d){return [cx + Xr(d.n), Y(d.x)];});
    var pts2= jakauma.map(function(d){return [cx - Xr(d.n), Y(d.x)];}).reverse();
    var svg = ['<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" xmlns="http://www.w3.org/2000/svg" style="display:block">'];
    svg.push('<path d="'+pathSmooth(pts)+' L'+pts2.map(function(p){return p[0].toFixed(2)+' '+p[1].toFixed(2);}).join(' L')+' Z" fill="'+V.amber+'" fill-opacity=".18" stroke="'+V.amber+'" stroke-width=".8"/>');
    if (pelaaja!=null){
      var py = Y(pelaaja);
      svg.push('<line x1="'+(cx-W*0.42)+'" y1="'+py+'" x2="'+(cx+W*0.42)+'" y2="'+py+'" stroke="'+V.teal+'" stroke-width="1.5"/>');
      svg.push('<circle cx="'+cx+'" cy="'+py+'" r="5" fill="'+V.teal+'" stroke="'+V.paper+'" stroke-width="2"/>');
      svg.push('<text x="'+cx+'" y="'+(py-10)+'" font-family="'+FONT_NUM+'" font-size="14" fill="'+V.teal+'" text-anchor="middle">'+nf(pelaaja,1)+'</text>');
    }
    svg.push('</svg>');
    return svg.join('');
  }

  // Export
  window.TM.charts = {
    radar: radar,
    trendLine: trendLine,
    percentileLane: percentileLane,
    sparkline: sparkline,
    heatmap: heatmap,
    benchmarkBar: benchmarkBar,
    violin: violin,
    _v: V
  };

})();
