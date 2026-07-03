// Vaihe 3a — IDP-kausitavoite ehdotusmoottori (lib/tm_idp.js). Spec: docs/CODE_TASK_VAIHE3_KAUSITAVOITE.md · IDP_YDIN_SPEC §2.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const {
  idpKypsyysEstetty, idpKeraaKandidaatit, idpValitseHeikoin, idpTavoitearvo,
  idpVahvinDim, idpEhdotaTavoite, idpPikakentat
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
    expect(idpPikakentat(null)).toEqual({ idp_tila: null, idp_edistyma: null, idp_fokus: null });
  });
});
