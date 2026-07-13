// Vaihe 3a — IDP-kausitavoite ehdotusmoottori (lib/tm_idp.js). Spec: docs/CODE_TASK_VAIHE3_KAUSITAVOITE.md · IDP_YDIN_SPEC §2.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const {
  idpKypsyysEstetty, idpKeraaKandidaatit, idpValitseHeikoin, idpTavoitearvo,
  idpVahvinDim, idpEhdotaTavoite, idpPikakentat,
  idpJarjestaKandidaatit, idpKandidaatitJarjestetty, idpKohdeKandidaatti, idpRakennaTavoite,
  idpDviSuunta, idpLisaaArvio, idpElinkaari, idpEdistyma,
  idpPelaajaKaari, idpPelaajaKonsepti
} = require('../lib/tm_idp.js');
const tax = require('../lib/tm_arviointi_taksonomia.js');
const eer = require('../lib/tm_eerikkila_normit.js');

// Yhteiset opts — oikeat lib-helperit injektoituna (kuten VP:ssä globaalit).
const baseOpts = {
  tmTaksonomiaByAvain: tax.tmTaksonomiaByAvain,
  tmAdarHavaittu: tax.tmAdarHavaittu,
  laskeD1Osaindeksit: eer.laskeD1Osaindeksit,
  eerikkilaNormiarvo: eer.eerikkilaNormiarvo,
  hhSeuraavaTaso: eer.hhSeuraavaTaso,
  tkLajiTaso: (function () { try { return require('../docs/testit_indeksit.js').tkLajiTaso; } catch (e) { return undefined; } })(),
  tkLajiViite: (function () { try { return require('../docs/testit_indeksit.js').tkLajiViite; } catch (e) { return undefined; } })(),
  tklajiAvain: (function () { const m = tax.tmMitattuMappaus(); return m.tklaji; })(),
  ika: 13, sp: 'M', spTk: 'P', nyt: new Date(2026, 3, 5)   // 5.4.2026 · sp M/N (eerikkilä), spTk P/T (tkLajiTaso)
};

describe('§28 kypsyysvahti (idpKypsyysEstetty)', () => {
  it('pre-PHV: speed/endurance/power estetty (biologisesti odotettu)', () => {
    ['speed', 'endurance', 'power'].forEach(a => {
      expect(idpKypsyysEstetty(a, 'PRE')).toBe(true);
      expect(idpKypsyysEstetty(a, 'LAH')).toBe(true);
    });
  });
  it('pre-PHV: acceleration/mobility/tekniikka EI estetty (harjoiteltavissa / kultaikkuna)', () => {
    ['acceleration', 'mobility', 'short_passing', 'vision'].forEach(a => expect(idpKypsyysEstetty(a, 'PRE')).toBe(false));
  });
  it('post-PHV (PH/POST/AN): mikään ei estetty', () => {
    ['speed', 'endurance', 'power'].forEach(a => { expect(idpKypsyysEstetty(a, 'PH')).toBe(false); expect(idpKypsyysEstetty(a, 'AN')).toBe(false); });
  });
});

describe('Kandidaatit (idpKeraaKandidaatit)', () => {
  it('havaittu ≤2 (litteä arviointi_havaittu) → kandidaatti, >2 ei', () => {
    const p = { arviointi_havaittu: { vision: 2, decision_making: 4, balance: 1 } };
    const k = idpKeraaKandidaatit(p, baseOpts).filter(c => c.tyyppi === 'havaittu').map(c => c.avain).sort();
    expect(k).toEqual(['balance', 'vision']);   // decision_making=4 pois
  });
  it('pelihavainto (ADAR-johdettu) ≤2 mukaan; tallennettu silma voittaa pelihavainnon', () => {
    const p = { adar_viimeisin: { a: 1, r: 1, pvm: '2026-06-01' }, arviointi_havaittu: { vision: 4 } };
    const kand = idpKeraaKandidaatit(p, baseOpts).filter(c => c.tyyppi === 'havaittu');
    const byAvain = Object.fromEntries(kand.map(c => [c.avain, c]));
    // a→anticipation+vision (norm 1→1), r→positioning (1→1). vision tallennettu 4 → EI havaittu-kandidaatti.
    expect(byAvain.anticipation.lahde).toBe('pelihavainto');
    expect(byAvain.positioning.taso).toBe(1);
    expect(byAvain.vision).toBeUndefined();   // silma 4 yliajaa pelihavainnon
  });
  it('mitattu D2 tki_kehityskohde → D2-kandidaatti', () => {
    const p = { tki_kehityskohde: 'syotto', tk_lajit_viimeisin: { syotto_s: 16 } };
    const d2 = idpKeraaKandidaatit(p, baseOpts).find(c => c.tyyppi === 'mitattu_d2');
    expect(d2.dim).toBe('D2');
    expect(d2.laji).toBe('syotto');
    expect(d2.mittariSuunta).toBe('pienempi');
  });
  it('mitattu D1 → heikoin osaindeksi kandidaatiksi', () => {
    // 30m heikko (taso ~1), cmj hyvä → maksinopeus (speed) heikoin
    const p = { hh_viimeisin: { lin30m: 6.0, cmj: 45, kasirata: 7.0 } };
    const d1 = idpKeraaKandidaatit(p, baseOpts).find(c => c.tyyppi === 'mitattu_d1');
    expect(d1.dim).toBe('D1');
    expect(['speed', 'power', 'mobility']).toContain(d1.avain);
  });
});

describe('Heikoin-valinta + §28 (idpValitseHeikoin)', () => {
  it('valitsee matalimman havaitun', () => {
    const kand = [
      { avain: 'vision', dim: 'D4', taso: 2, lahde: 'havaittu' },
      { avain: 'balance', dim: 'D1', taso: 1, lahde: 'havaittu' }
    ];
    expect(idpValitseHeikoin(kand, { phv_tila: 'PH' }).avain).toBe('balance');
  });
  it('pre-PHV: heikko speed (mitattu taso 1) OHITETAAN, valitaan tekniikka', () => {
    const kand = [
      { avain: 'speed', dim: 'D1', taso: 1, lahde: 'mitattu' },           // gated pre-PHV
      { avain: 'short_passing', dim: 'D2', taso: 3, lahde: 'mitattu' }     // ei gated
    ];
    const v = idpValitseHeikoin(kand, { phv_tila: 'PRE' });
    expect(v.avain).toBe('short_passing');   // speed estetty → tekniikka
  });
  it('pre-PHV: tekniikka (D2) etusijalla vaikka fyysinen ei-gated matalampi', () => {
    const kand = [
      { avain: 'mobility', dim: 'D1', taso: 1, lahde: 'mitattu' },        // ei gated, mutta D1
      { avain: 'dribbling', dim: 'D2', taso: 2, lahde: 'mitattu' }        // D2 → etusija pre-PHV
    ];
    expect(idpValitseHeikoin(kand, { phv_tila: 'LAH' }).avain).toBe('dribbling');
  });
  it('kaikki gated pre-PHV + ei muita → null', () => {
    const kand = [{ avain: 'speed', dim: 'D1', taso: 1, lahde: 'mitattu' }, { avain: 'power', dim: 'D1', taso: 1, lahde: 'mitattu' }];
    expect(idpValitseHeikoin(kand, { phv_tila: 'PRE' })).toBeNull();
  });
});

describe('Tavoitearvo-johto (idpTavoitearvo, Achievable §28)', () => {
  it('havaittu 1–5 → current+1 (≤5)', () => {
    expect(idpTavoitearvo({ tyyppi: 'havaittu', taso: 2 }, {}, {}).arvo).toBe(3);
    expect(idpTavoitearvo({ tyyppi: 'havaittu', taso: 5 }, {}, {}).arvo).toBe(5);   // ei yli 5
  });
  it('mitattu pienempi=parempi → tavoite < lähtö (fallback 5 %)', () => {
    const r = idpTavoitearvo({ tyyppi: 'mitattu_d2', raaka: 20, mittariSuunta: 'pienempi', laji: 'syotto' }, { tk_lajit_pvm: '2026-04-01' }, {});
    expect(r.lahto).toBe(20);
    expect(r.arvo).toBeLessThan(20);
    expect(r.lahtoPvm).toBe('2026-04-01');
  });
});

describe('idpEhdotaTavoite — kokonaisluonnos', () => {
  it('Sibbo-tyyppinen (tki_kehityskohde) → status ehdotettu, lahde moottori, fokus D2', () => {
    const p = { tki_kehityskohde: 'syotto', tk_lajit_viimeisin: { syotto_s: 18 }, tk_lajit_pvm: '2026-03-10',
      d1_taso: 3.5, d2_taso: 2.1, phv_tila: 'LAH' };
    const t = idpEhdotaTavoite(p, baseOpts);
    expect(t.status).toBe('ehdotettu');
    expect(t.lahde).toBe('moottori');
    expect(t.fokus.dim).toBe('D2');
    expect(t.pelaajan_tavoite).toBe('');           // pelaajan ääni tyhjä (täytetään hyväksynnässä)
    expect(t.ankkuri_7030.vahvuus_dim).toBe('D1'); // d1_taso 3.5 > d2_taso 2.1
    expect(t.perustelu.lahde).toBe('moottori');
    expect(Array.isArray(t.arviot)).toBe(true);
    expect(t.aikaraami.kesto_vk).toBe(6);
  });
  it('pre-PHV heikko fysiikka + tekniikkakohde → fokus tekniikka (ei fysiikka)', () => {
    const p = { hh_viimeisin: { lin30m: 6.2, cmj: 20, mas: 10 }, tki_kehityskohde: 'pujottelu',
      tk_lajit_viimeisin: { pujottelu_s: 22 }, phv_tila: 'PRE', d1_taso: 2, d2_taso: 2 };
    const t = idpEhdotaTavoite(p, baseOpts);
    expect(t.fokus.dim).toBe('D2');   // §28: heikko 30m/MAS/CMJ pre-PHV ei kelpaa → tekniikka
  });
  it('§7b — perustelu.teksti + perustelu.pelilause sisältää pelisovelluslauseen (mitattu D2)', () => {
    const p = { tki_kehityskohde: 'syotto', tk_lajit_viimeisin: { syotto_s: 18 }, tk_lajit_pvm: '2026-03-10', d1_taso: 3.5, d2_taso: 2.1, phv_tila: 'LAH' };
    const t = idpEhdotaTavoite(p, baseOpts);
    expect(t.perustelu.pelilause).toBe('Näkyy ottelussa: uskallus avata peli eteenpäin paineessa.');   // short_passing
    expect(t.perustelu.teksti).toContain('Näkyy ottelussa');
    expect(t.perustelu.teksti).toMatch(/pelissä|ottelussa/i);
  });
  it('§7b — pelilause myös havaitulle (peliäly), ei jää irralliseksi testisuoritukseksi', () => {
    const p = { arviointi_havaittu: { vision: 2 }, phv_tila: 'PH' };
    const t = idpEhdotaTavoite(p, baseOpts);
    expect(t.fokus.alue).toBe('vision');
    expect(t.perustelu.pelilause).toBe('Näkyy pelissä: syöttöikkunan näkeminen ennen palloa.');
    expect(t.perustelu.teksti).toContain(t.perustelu.pelilause);
  });
  it('§7b — geneerinen fallback kun avaimelle ei mäppäystä', () => {
    // physical_presence: ei IDP_PELILAUSE-avainta → dim-fallback (D1)
    const p = { arviointi_havaittu: { physical_presence: 1 }, phv_tila: 'PH' };
    const t = idpEhdotaTavoite(p, baseOpts);
    expect(t.perustelu.pelilause).toMatch(/Näkyy pelissä|näkyy pelissä/i);
    expect(t.perustelu.teksti).toContain(t.perustelu.pelilause);
  });
  it('ei dataa → null', () => {
    expect(idpEhdotaTavoite({}, baseOpts)).toBeNull();
    expect(idpEhdotaTavoite(null, baseOpts)).toBeNull();
  });
});

describe('idpPikakentat (§26 lista+kortti)', () => {
  it('tavoitteesta idp_tila + idp_fokus + idp_edistyma', () => {
    const t = { status: 'aktiivinen', fokus: { alue: 'short_passing', dim: 'D2', nimi: 'Lyhyt syöttö' },
      lahto: { arvo: 20 }, tavoitearvo: 18, arviot: [] };
    const pk = idpPikakentat(t);
    expect(pk.idp_tila).toBe('aktiivinen');
    expect(pk.idp_fokus).toEqual({ alue: 'short_passing', dim: 'D2', nimi: 'Lyhyt syöttö' });
    expect(pk.idp_edistyma).toBe('0 %');   // vasta lähtö, ei arvioita
  });
  it('edistymä kasvaa arvion myötä (pienempi=parempi)', () => {
    const t = { status: 'aktiivinen', fokus: { alue: 'x', dim: 'D2', nimi: 'X' }, lahto: { arvo: 20 }, tavoitearvo: 18,
      arviot: [{ arvo: 19 }] };   // 20→19, tavoite 18 → 50 %
    expect(idpPikakentat(t).idp_edistyma).toBe('50 %');
  });
  it('null tavoite → null-kentät', () => {
    expect(idpPikakentat(null)).toEqual({ idp_tila: null, idp_edistyma: null, idp_fokus: null, idp_viim_review: null, idp_lahde: null });
  });
  it('idp_lahde = fokus.lahdeTieto (tyyppi + pvm)', () => {
    const t = { status: 'aktiivinen', fokus: { alue: 'positioning', dim: 'D4', nimi: 'Sijoittuminen', lahdeTieto: { tyyppi: 'pelihavainto', pvm: '2026-06-01' } }, arviot: [] };
    expect(idpPikakentat(t).idp_lahde).toEqual({ tyyppi: 'pelihavainto', pvm: '2026-06-01' });
  });
});

describe('B2 — lahde+pvm säilyy moottorissa (IDP-silta lähdemerkintä)', () => {
  it('idpKeraaKandidaatit: pelihavainto-kandidaatti kantaa lahdePvm:n adar_viimeisin.pvm:stä', () => {
    const p = { adar_viimeisin: { a: 1, pvm: '2026-06-01' } };
    const k = idpKeraaKandidaatit(p, baseOpts).find(c => c.avain === 'anticipation');
    expect(k.lahde).toBe('pelihavainto');
    expect(k.lahdePvm).toBe('2026-06-01');
  });
  it('idpKeraaKandidaatit: havaittu-kandidaatti kantaa arviointi_pvm:n', () => {
    const p = { arviointi_havaittu: { vision: 2 }, arviointi_pvm: '2026-05-10' };
    const k = idpKeraaKandidaatit(p, baseOpts).find(c => c.avain === 'vision');
    expect(k.lahde).toBe('havaittu');
    expect(k.lahdePvm).toBe('2026-05-10');
  });
  it('idpRakennaTavoite: fokus.lahde säilyttää alkuperän (ei romahda moottoriksi) + fokus.lahdeTieto', () => {
    const p = { adar_viimeisin: { a: 1, pvm: '2026-06-01' } };
    const k = idpKeraaKandidaatit(p, baseOpts).find(c => c.avain === 'anticipation');
    const t = idpRakennaTavoite(p, k, baseOpts);
    expect(t.fokus.lahde).toBe('pelihavainto');            // EI 'moottori'
    expect(t.fokus.lahdeTieto).toEqual({ tyyppi: 'pelihavainto', pvm: '2026-06-01' });
    expect(t.lahde).toBe('moottori');                       // top-level = kuka rakensi (säilyy)
    expect(idpPikakentat(t).idp_lahde).toEqual({ tyyppi: 'pelihavainto', pvm: '2026-06-01' });
  });
  it('idpKohdeKandidaatti: opts.lahde + opts.lahdePvm + opts.arvo (pelihavainto-silta)', () => {
    const p = {};   // ei arviointi_havaittu — arvo tulee ADAR:sta silta-handlerissa
    const k = idpKohdeKandidaatti(p, 'positioning', Object.assign({}, baseOpts, { lahde: 'pelihavainto', lahdePvm: '2026-06-01', arvo: 2 }));
    expect(k.lahde).toBe('pelihavainto');
    expect(k.lahdePvm).toBe('2026-06-01');
    expect(k.taso).toBe(2);
    const t = idpRakennaTavoite(p, k, baseOpts);
    expect(t.fokus.lahdeTieto).toEqual({ tyyppi: 'pelihavainto', pvm: '2026-06-01' });
  });
  it('idpKohdeKandidaatti: oletus-lahde säilyy valmentajana (ei opts.lahde)', () => {
    const p = { arviointi_havaittu: { vision: 3 } };
    const k = idpKohdeKandidaatti(p, 'vision', baseOpts);
    expect(k.lahde).toBe('valmentaja');
    expect(k.lahdePvm).toBeNull();
  });
});

describe('B2 — idpVahvinDim ADAR 1–3-kaanon (I1)', () => {
  it('adar_viimeisin.yht 1–3 skaalataan /3*5 (ei /12)', () => {
    const p = { d1_taso: 2, adar_viimeisin: { yht: 3 } };   // yht=3 (max) → 5.0, voittaa d1_taso 2
    const v = idpVahvinDim(p, baseOpts);
    expect(v.dim).toBe('D4');
    expect(Math.round(v.taso * 10) / 10).toBe(5);
  });
});

// ─── Vaihe 3b — review-sykli + kehityskaari ───

describe('idpDviSuunta (§29 kaksi deltaa · abs+ ei down-väri)', () => {
  // Mitattava pienempi=parempi (sekunnit): lähtö 46, tavoite ≤44.
  const t = () => ({ mittari: { yksikko: 's', suunta: 'pienempi' }, lahto: { arvo: 46 }, tavoitearvo: 44, arviot: [{ arvo: 45 }] });
  it('up — parani edellisestä', () => {
    const d = idpDviSuunta(t(), 44.5);
    expect(d.suunta).toBe('up');
    expect(d.stepDelta).toBeCloseTo(0.5);   // 45 → 44.5
    expect(d.absDelta).toBeCloseTo(1.5);    // 46 → 44.5
  });
  it('flat — sama kuin edellinen', () => {
    expect(idpDviSuunta(t(), 45).suunta).toBe('flat');
  });
  it('down — notkahti JA alle lähdön (abs-parannus negatiivinen)', () => {
    const d = idpDviSuunta(t(), 46.5);   // edell 45 → 46.5 (huononi), lähtö 46 → 46.5 (myös alle)
    expect(d.suunta).toBe('down');
    expect(d.absPositiivinen).toBe(false);
  });
  it('INVARIANTTI abs+ ei down: notkahti edellisestä mutta yhä parempi kuin lähtö → flat, EI down', () => {
    const d = idpDviSuunta(t(), 45.5);   // edell 45 → 45.5 (step huononi) mutta lähtö 46 → 45.5 (abs+)
    expect(d.stepDelta).toBeLessThan(0);
    expect(d.absPositiivinen).toBe(true);
    expect(d.suunta).toBe('flat');       // ei 'down'
  });
  it('suurempi=parempi (havaittu taso): nousu → up', () => {
    const tt = { mittari: { yksikko: 'taso', suunta: 'suurempi' }, lahto: { arvo: 2 }, tavoitearvo: 4, arviot: [{ arvo: 3 }] };
    expect(idpDviSuunta(tt, 4).suunta).toBe('up');
  });
  it('fiilis-review (arvo null) → flat, deltat null', () => {
    const d = idpDviSuunta(t(), null);
    expect(d.suunta).toBe('flat');
    expect(d.absDelta).toBeNull();
    expect(d.stepDelta).toBeNull();
  });
});

describe('idpEdistyma (§26)', () => {
  it('mitattava → X % lähtö→tavoite', () => {
    const t = { mittari: { yksikko: 's', suunta: 'pienempi' }, lahto: { arvo: 20 }, tavoitearvo: 18, arviot: [{ arvo: 19 }] };
    expect(idpEdistyma(t)).toBe('50 %');   // 20→19 / matka 2
  });
  it('mitattava ilman arvioita → 0 %', () => {
    const t = { mittari: { yksikko: 's', suunta: 'pienempi' }, lahto: { arvo: 20 }, tavoitearvo: 18, arviot: [] };
    expect(idpEdistyma(t)).toBe('0 %');
  });
  it('havaittu (taso) → review N', () => {
    const t = { mittari: { yksikko: 'taso', suunta: 'suurempi' }, lahto: { arvo: 2 }, tavoitearvo: 4, arviot: [{ arvo: 3 }, { arvo: 3 }] };
    expect(idpEdistyma(t)).toBe('review 2');
  });
  it('vapaa-yksikkö → review N (kvalitatiivinen)', () => {
    const t = { mittari: { yksikko: 'vapaa' }, lahto: { arvo: null }, tavoitearvo: null, arviot: [{ pelaajan_arvio: 4 }] };
    expect(idpEdistyma(t)).toBe('review 1');
  });
  it('vapaa ilman arvioita → null', () => {
    expect(idpEdistyma({ mittari: { yksikko: 'vapaa' }, arviot: [] })).toBeNull();
  });
});

describe('idpLisaaArvio (arviot[] + pvm ISO §7.6)', () => {
  const opts = { nyt: new Date(2026, 5, 20) };
  it('pushaa täyden arvion + johtaa dvi_suunta', () => {
    const t = { mittari: { yksikko: 's', suunta: 'pienempi' }, lahto: { arvo: 46 }, tavoitearvo: 44, arviot: [{ arvo: 45 }] };
    idpLisaaArvio(t, { arvo: 44.5, pelaajan_arvio: 4, pelaajan_note: 'näen paikat', valmentajan_kommentti: 'hyvä' }, opts);
    expect(t.arviot.length).toBe(2);
    const a = t.arviot[1];
    expect(a.arvo).toBe(44.5);
    expect(a.pelaajan_arvio).toBe(4);
    expect(a.dvi_suunta).toBe('up');
    expect(typeof a.pvm).toBe('string');   // ISO-string, ei serverTimestamp arrayssa
  });
  it('fiilis-review (tyhjä arvo) → arvo null, ei kaadu', () => {
    const t = { mittari: { yksikko: 's', suunta: 'pienempi' }, lahto: { arvo: 46 }, tavoitearvo: 44, arviot: [] };
    idpLisaaArvio(t, { arvo: '', pelaajan_arvio: 3, pelaajan_note: 'ok' }, opts);
    expect(t.arviot[0].arvo).toBeNull();
    expect(t.arviot[0].dvi_suunta).toBe('flat');
  });
});

describe('idpElinkaari (§4)', () => {
  const opts = { nyt: new Date(2026, 5, 20) };
  it('saavutettu → status + pvm', () => {
    const t = { status: 'aktiivinen', arviot: [{ arvo: 44 }] };
    idpElinkaari(t, 'saavutettu', opts);
    expect(t.status).toBe('saavutettu');
    expect(typeof t.saavutettu_pvm).toBe('string');
  });
  it('jatkuu → uusi tavoitearvo, status aktiivinen, arviot SÄILYY, sama fokus', () => {
    const t = { status: 'aktiivinen', fokus: { alue: 'short_passing', dim: 'D2' }, tavoitearvo: 44, arviot: [{ arvo: 45 }, { arvo: 44 }] };
    idpElinkaari(t, 'jatkuu', { nyt: opts.nyt, uusiTavoitearvo: 43 });
    expect(t.status).toBe('aktiivinen');
    expect(t.tavoitearvo).toBe(43);        // rima nostettu
    expect(t.arviot.length).toBe(2);       // kaari säilyy
    expect(t.fokus.alue).toBe('short_passing');
  });
  it('hylatty → status hylatty', () => {
    const t = { status: 'aktiivinen', arviot: [] };
    idpElinkaari(t, 'hylatty', opts);
    expect(t.status).toBe('hylatty');
  });
});

// ─── Vaihe 3c-a — pelaajan aikajana (§7.22 EHDOTON) ───

describe('idpPelaajaKaari (§7.22-turvallinen pelaajanäkymä)', () => {
  // Mitattava: lähtö 46.1, tavoite 44.0, kaksi reviewiä (45.5 paremp, 44.8 paremp).
  const mitattava = () => ({
    fokus: { alue: 'short_passing', dim: 'D2', nimi: 'Syöttö eteenpäin' },
    mittari: { yksikko: 's', suunta: 'pienempi' }, lahto: { arvo: 46.1 }, tavoitearvo: 44.0,
    pelaajan_tavoite: 'Haluan uskaltaa syöttää eteenpäin.', status: 'aktiivinen',
    arviot: [
      { arvo: 45.5, pelaajan_arvio: 3, pelaajan_note: 'Menee eteenpäin.', dvi_suunta: 'up' },
      { arvo: 44.8, pelaajan_arvio: 4, pelaajan_note: 'Näen syöttöpaikat aikaisemmin.', dvi_suunta: 'up' }
    ]
  });
  it('rakentaa matkan: lähtö + per review + seuraava askel + kehu', () => {
    const k = idpPelaajaKaari(mitattava());
    expect(k.otsikko).toBe('Syöttö eteenpäin');
    expect(k.aani).toBe('Haluan uskaltaa syöttää eteenpäin.');
    expect(k.pisteet[0].luokka).toBe('lahto');
    expect(k.pisteet.length).toBe(3);                 // lähtö + 2 reviewiä
    expect(k.pisteet[2].luokka).toBe('nyt');
    expect(k.seuraavaAskel.teksti).toContain('Syöttö eteenpäin');
    expect(k.kehu).toMatch(/[Hh]ienoa/);
  });
  it('§7.22 EHDOTON: ulostulossa EI numeroarvoja/deltoja (mittausluvut piilossa)', () => {
    const k = idpPelaajaKaari(mitattava());
    const kaikkiTeksti = JSON.stringify(k.pisteet) + JSON.stringify(k.seuraavaAskel) + k.kehu;
    ['46.1', '45.5', '44.8', '44.0', '46,1', '45,5', '0.6', '1.3'].forEach(function (n) {
      expect(kaikkiTeksti).not.toContain(n);
    });
  });
  it('§7.22: regressoinut review EI näytä negatiivista (positiivinen kehys aina)', () => {
    const t = mitattava();
    t.arviot = [{ arvo: 47.0, pelaajan_arvio: 2, pelaajan_note: '' }];   // huononi lähdöstä (46.1→47.0)
    const k = idpPelaajaKaari(t);
    const nyt = k.pisteet[1];
    expect(nyt.win).toBe(false);
    expect(nyt.teksti).toMatch(/matkalla|eteenpäin/i);           // positiivinen
    expect(nyt.teksti).not.toMatch(/huono|laski|pudon|alle|miinus|hitaampi/i);
    expect(nyt.teksti).not.toContain('47');
  });
  it('mitattava paraneva review → win true', () => {
    const k = idpPelaajaKaari(mitattava());
    expect(k.pisteet[1].win).toBe(true);   // 45.5 < 46.1 → edistyi
  });
  it('vapaa-yksikkö → kvalitatiivinen (mitattava false, käyttää pelaajan omia sanoja)', () => {
    const t = { fokus: { alue: 'vapaa', dim: 'D2', nimi: '1v1 laidalla', vapaa: true },
      mittari: { yksikko: 'vapaa' }, lahto: { arvo: null }, tavoitearvo: null,
      pelaajan_tavoite: 'Uskallan viedä 1v1.', status: 'aktiivinen',
      arviot: [{ arvo: null, pelaajan_arvio: 4, pelaajan_note: 'Menee paremmin' }] };
    const k = idpPelaajaKaari(t);
    expect(k.mitattava).toBe(false);
    expect(k.pisteet.length).toBe(2);
    expect(k.pisteet[1].teksti).toContain('Menee paremmin');
  });
  it('ei tavoitetta / hylätty → null (tyhjä tila)', () => {
    expect(idpPelaajaKaari(null)).toBeNull();
    expect(idpPelaajaKaari({ fokus: { nimi: 'X' }, status: 'hylatty', arviot: [] })).toBeNull();
  });
  it('ei arvioita → vain lähtö + seuraava askel (positiivinen tyhjä matka)', () => {
    const t = { fokus: { nimi: 'Syöttö' }, mittari: { yksikko: 's', suunta: 'pienempi' }, lahto: { arvo: 46 }, tavoitearvo: 44, status: 'aktiivinen', arviot: [] };
    const k = idpPelaajaKaari(t);
    expect(k.pisteet.length).toBe(1);
    expect(k.seuraavaAskel).toBeTruthy();
  });
});

describe('idpPelaajaKonsepti (mikä/miksi/mieti)', () => {
  it('kuvaus + pelilause → mikä/miksi; mieti aina', () => {
    const t = { fokus: { nimi: 'Syöttö' }, kuvaus: 'Avaa peli eteenpäin.', perustelu: { pelilause: 'Vie joukkueen lähemmäs maalia.' } };
    const c = idpPelaajaKonsepti(t);
    expect(c.mika).toBe('Avaa peli eteenpäin.');
    expect(c.miksi).toBe('Vie joukkueen lähemmäs maalia.');
    expect(c.mietiKysymys).toMatch(/\?$/);
  });
  it('fallbackit kun kuvaus/pelilause puuttuu', () => {
    const c = idpPelaajaKonsepti({ fokus: { nimi: 'Syöttö' } });
    expect(c.mika).toContain('Syöttö');
    expect(c.miksi.length).toBeGreaterThan(0);
  });
});

describe('Kandidaattikierto (idpValitseHeikoin idx + idpEhdotaTavoite ehdotusIdx)', () => {
  // 3 havaittu-kandidaattia eri tasoilla → kierto käy kaikki läpi ja palaa alkuun.
  const p = { arviointi_havaittu: { balance: 1, vision: 2, ball_control: 2 }, phv_tila: 'PH' };
  it('idx kiertää järjestettyä listaa (heikoin = idx 0)', () => {
    const kand = idpKeraaKandidaatit(p, baseOpts);
    const lista = idpJarjestaKandidaatit(kand, p);
    expect(lista.length).toBe(3);
    expect(idpValitseHeikoin(kand, p, 0).avain).toBe(lista[0].avain);   // heikoin (balance=1)
    expect(idpValitseHeikoin(kand, p, 1).avain).toBe(lista[1].avain);
    expect(idpValitseHeikoin(kand, p, 3).avain).toBe(lista[0].avain);   // kiertää ympäri (3 % 3 = 0)
    expect(idpValitseHeikoin(kand, p, -1).avain).toBe(lista[2].avain);  // negatiivinen wrap
  });
  it('idpEhdotaTavoite eri ehdotusIdx → eri fokus', () => {
    const t0 = idpEhdotaTavoite(p, Object.assign({}, baseOpts, { ehdotusIdx: 0 }));
    const t1 = idpEhdotaTavoite(p, Object.assign({}, baseOpts, { ehdotusIdx: 1 }));
    expect(t0.fokus.alue).not.toBe(t1.fokus.alue);
  });
  it('idpKandidaatitJarjestetty = kerää+järjestä pelaajasta (VP kierto/määrä)', () => {
    expect(idpKandidaatitJarjestetty(p, baseOpts).length).toBe(3);
  });
  it('1 kandidaatti → lista pituus 1 (VP näyttää vihjeen)', () => {
    const p1 = { arviointi_havaittu: { vision: 2 }, phv_tila: 'PH' };
    expect(idpKandidaatitJarjestetty(p1, baseOpts).length).toBe(1);
  });
});

describe('VP:n oma fokus-valinta (idpKohdeKandidaatti + idpRakennaTavoite)', () => {
  it('havaittu-avain → candidate lahde valmentaja, mittari yksikko taso', () => {
    const p = { arviointi_havaittu: { vision: 3 } };
    const k = idpKohdeKandidaatti(p, 'vision', baseOpts);
    expect(k.lahde).toBe('valmentaja');
    expect(k.dim).toBe('D4');
    expect(k.mittariYks).toBe('taso');
    expect(k.taso).toBe(3);   // olemassa oleva arvo lähtönä
  });
  it('mitattu-avain (short_passing) → tklaji-candidate mittari sekunneissa', () => {
    const p = { tk_lajit_viimeisin: { syotto_s: 18 } };
    const k = idpKohdeKandidaatti(p, 'short_passing', baseOpts);
    expect(k.tyyppi).toBe('mitattu_d2');
    expect(k.mittariTestId).toBe('syotto');
    expect(k.mittariYks).toBe('s');
    expect(k.raaka).toBe(18);
  });
  it('rakennettu tavoite VP-valinnasta → fokus.lahde valmentaja, status ehdotettu', () => {
    const p = { arviointi_havaittu: { positioning: 2 } };
    const t = idpRakennaTavoite(p, idpKohdeKandidaatti(p, 'positioning', baseOpts), baseOpts);
    expect(t.fokus.lahde).toBe('valmentaja');
    expect(t.lahde).toBe('valmentaja');
    expect(t.status).toBe('ehdotettu');
    expect(t.fokus.nimi).toBe('Sijoittuminen');
    expect(t.perustelu.pelilause).toContain('Näkyy pelissä');
  });
});

describe('Vapaa fokus (yksikko:vapaa → ei kaada palkkia)', () => {
  it('vapaa candidate → tavoite yksikko vapaa, lähtö/tavoitearvo null, fokus.vapaa true', () => {
    const p = {};
    const kVapaa = { avain: 'vapaa', dim: 'D2', nimi: 'Laitahyökkääjän 1v1 laidalla', lahde: 'valmentaja',
      tyyppi: 'vapaa', vapaa: true, mittariTestId: null, mittariYks: 'vapaa', mittariSuunta: null };
    const t = idpRakennaTavoite(p, kVapaa, baseOpts);
    expect(t.fokus.vapaa).toBe(true);
    expect(t.mittari.yksikko).toBe('vapaa');
    expect(t.lahto.arvo).toBeNull();     // ei mitattavaa palkkia (kortti ohittaa)
    expect(t.tavoitearvo).toBeNull();
    expect(t.perustelu.pelilause).toMatch(/pelissä|ottelussa/i);   // §7b myös vapaalle
  });
});

describe('§4 — §28 kypsyysvaroitus ilman PHV-dataa', () => {
  it('fyysinen fokus ilman PHV → perustelu.kypsyysvaroitus asetettu', () => {
    const p = { hh_viimeisin: { mas: 9 } };   // heikko MAS (endurance), EI phv_tila
    const k = idpKohdeKandidaatti(p, 'endurance', baseOpts);
    const t = idpRakennaTavoite(p, k, baseOpts);
    expect(t.fokus.dim).toBe('D1');
    expect(t.perustelu.kypsyysvaroitus).toMatch(/[Kk]ypsyysdataa/);
    expect(t.perustelu.teksti).toMatch(/[Kk]ypsyysdataa/);
  });
  it('fyysinen fokus PHV:n kanssa → EI varoitusta', () => {
    const p = { hh_viimeisin: { mas: 9 }, phv_tila: 'PH' };
    const t = idpRakennaTavoite(p, idpKohdeKandidaatti(p, 'endurance', baseOpts), baseOpts);
    expect(t.perustelu.kypsyysvaroitus).toBeNull();
  });
  it('ilman PHV: ei-fyysiset kandidaatit priorisoidaan (§4)', () => {
    // heikko fyysinen (D1) + havaittu D4 vision=2 → moottori valitsee ei-fyysisen (vision) ilman PHV:tä
    const p = { hh_viimeisin: { lin30m: 6.5, cmj: 20, mas: 9 }, arviointi_havaittu: { vision: 2 } };
    const t = idpEhdotaTavoite(p, baseOpts);
    expect(t.fokus.dim).not.toBe('D1');   // ei-fyysinen etusijalla ilman kypsyysdataa
  });
});
