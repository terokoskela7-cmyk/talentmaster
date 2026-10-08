/**
 * R6.4 Mediaviesti M1 · PR 1 (data, Rules, lähetys, Inbox) — lib/tm_mediaviesti.js + Master/VP-adapterit (sivun oikea koodi vm:ssä). Rules-testit: tests/rules (v3.50).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import vm from 'vm';
const require = createRequire(import.meta.url);
const M = require('../lib/tm_mediaviesti.js');
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const MASTER = lue('TalentMaster_Master_v16.html'), VP = lue('TalentMaster_VP_v25.html');
function pala(src, alku, loppu) { const i = src.indexOf(alku), j = src.indexOf(loppu, i + 1); if (i < 0 || j < 0) throw new Error('ei löydy ' + alku); return src.slice(i, j); }

describe('linkki (D56): vain https, domain, mediatyyppi, kohta', () => {
  it('VEO / YouTube / youtu.be / Vimeo → video; kuvapääte → kuva; muu → linkki; domain pienillä', () => {
    expect(M.tmMvLinkki('https://app.veo.co/matches/x/clip/y?t=12')).toMatchObject({ ok: true, domain: 'app.veo.co', mediatyyppi: 'video', kohta_s: 12 });
    expect(M.tmMvLinkki('https://www.YouTube.com/watch?v=a&t=1m12s')).toMatchObject({ domain: 'www.youtube.com', mediatyyppi: 'video', kohta_s: 72 }); expect(M.tmMvLinkki('https://youtu.be/abc?t=90')).toMatchObject({ mediatyyppi: 'video', kohta_s: 90 }); expect(M.tmMvLinkki('https://vimeo.com/123')).toMatchObject({ mediatyyppi: 'video', kohta_s: null });
    for (const u of ['https://example.org/a.jpg', 'https://cdn.x.fi/kuva.PNG?x=1', 'https://x.fi/a.webp']) expect(M.tmMvLinkki(u).mediatyyppi, u).toBe('kuva'); expect(M.tmMvLinkki('https://seura.fi/uutinen/123')).toMatchObject({ mediatyyppi: 'linkki', kohta_s: null });
    expect(M.tmMvLinkki('https://notveo.co/x').mediatyyppi).toBe('linkki'); expect(M.tmMvLinkki('https://evil-youtube.com/x').mediatyyppi).toBe('linkki'); expect(M.tmMvLinkki('https://sub.veo.co/x').mediatyyppi).toBe('video');   // pääte ei tunnistu osamerkkijonosta
  });
  it('kohta: t=12 · 12s · 1m12s · 1h2m3s · 0:12 · 1:02:03; väärä muoto → null; ei-videolla ei kohtaa', () => {
    const k = (t) => M.tmMvLinkki('https://app.veo.co/c?t=' + t).kohta_s; expect([k('12'), k('12s'), k('1m12s'), k('1h2m3s'), k('0:12'), k('1:02:03'), k('x'), k('')]).toEqual([12, 12, 72, 3723, 12, 3723, null, null]); expect(M.tmMvLinkki('https://x.fi/a.jpg?t=12').kohta_s).toBeNull();
    expect([M.tmMvKohtaTeksti(12), M.tmMvKohtaTeksti(72), M.tmMvKohtaTeksti(3723), M.tmMvKohtaTeksti(null)]).toEqual(['0:12', '1:12', '1:02:03', '']);
  });
  it('HYLKÄÄ: http://, ftp://, javascript:, tyhjä, >500, välilyönti, tunnukset osoitteessa (user:pw@), host ilman pistettä', () => {
    for (const [u, syy] of [['http://app.veo.co/x', 'ei_https'], ['ftp://x.fi/a', 'ei_https'], ['javascript:alert(1)', 'ei_https'], ['', 'tyhja'], ['   ', 'tyhja'], ['https://' + 'a'.repeat(500), 'pitka'], ['https://x.fi/a b', 'virheellinen'], ['https://user:pw@x.fi/a', 'virheellinen'], ['https://localhost/x', 'virheellinen'], ['https://', 'virheellinen'], [null, 'tyhja']]) expect(M.tmMvLinkki(u), String(u).slice(0, 30)).toMatchObject({ ok: false, syy });
    expect(M.tmMvLinkki('https://x.fi/' + 'a'.repeat(487)).ok).toBe(true); expect(M.tmMvLinkki('https://x.fi/' + 'a'.repeat(488)).ok).toBe(false);   // 500 / 501
    for (const s of ['tyhja', 'ei_https', 'pitka', 'virheellinen', 'kysymys', 'saate', 'sana', 'luku', 'vastaanottajat', 'tyyppi', 'kuittaus']) expect(M.tmMvVirhe(s, {})).toMatch(/\S/);
  });
  it('tunnistusrivi sheetiin: domain · tyyppi · kohta TAI virheteksti', () => { expect(M.tmMvTunnistus('https://app.veo.co/x?t=12', {})).toEqual({ ok: true, teksti: 'app.veo.co · video · kohta 0:12' }); expect(M.tmMvTunnistus('http://a.fi', {}).ok).toBe(false); expect(M.tmMvTunnistus('', {})).toEqual({ ok: true, teksti: '' }); });
});

describe('toimitusaika (D62): lähetys klo 21–07 → seuraava klo 07', () => {
  const t = (h, m = 0, p = 3) => M.tmMvNakyvaAlkaen(new Date(2026, 10, p, h, m));
  it('22:00 → seuraavan päivän 07:00; 21:00 → seuraava 07:00; 20:59 → heti; 07:00 → heti; 06:59 → sama päivä 07:00; 03:00 → sama päivä 07:00; 23:59 kuun vaihteessa', () => {
    expect([t(22).getDate(), t(22).getHours()]).toEqual([4, 7]); expect(t(21).getDate()).toBe(4); expect(t(20, 59).getHours()).toBe(20); expect(t(7).getHours()).toBe(7); expect(t(7).getMinutes()).toBe(0);
    expect([t(6, 59).getDate(), t(6, 59).getHours(), t(6, 59).getMinutes()]).toEqual([3, 7, 0]); expect([t(3).getDate(), t(3).getHours()]).toEqual([3, 7]); const k = t(23, 59, 30); expect([k.getMonth(), k.getDate(), k.getHours()]).toEqual([11, 1, 7]);
    const nyt = new Date(2026, 10, 3, 12, 34); expect(M.tmMvNakyvaAlkaen(nyt).getTime()).toBe(nyt.getTime());   // klo 7–21: heti (sama hetki)
  });
});

describe('rekisteri, näkyvyys, kysymyspohjat (D57, D62)', () => {
  it('rekisteri: ≤12 Leikkijä · 13–15 Rakentaja · 16+ Showcase · tuntematon → Rakentaja; näkyvyys: ≤12 huoltaja, muuten pelaaja', () => {
    expect([8, 12, 13, 15, 16, 19, null, 'x'].map(M.tmMvRekisteri)).toEqual(['leikkija', 'leikkija', 'rakentaja', 'rakentaja', 'showcase', 'showcase', 'rakentaja', 'rakentaja']); expect([8, 12, 13, 17, null].map(M.tmMvNakyvyys)).toEqual(['huoltaja', 'huoltaja', 'pelaaja', 'pelaaja', 'pelaaja']);
  });
  it('3 tyyppiä × 3 rekisteriä × 3 pohjaa = 27; avain mv_pohja_<tyyppi>_<rekisteri>_<n> löytyy FI-kartasta; ei lukuja, vertailua tai KIELLETYT-sanoja; ei sanaa "ase"; mockupin esimerkit mukana', () => {
    let n = 0; for (const ty of M.TYYPIT) for (const r of M.REKISTERIT) { const p = M.tmMvPohjat(ty, r); expect(p).toHaveLength(3); p.forEach((x, i) => { n++; expect(x.avain).toBe('mv_pohja_' + ty + '_' + r + '_' + (i + 1)); expect(M.FI[x.avain]).toBe(x.teksti); expect(x.teksti.length).toBeLessThanOrEqual(M.MAX_KYSYMYS); expect(x.teksti).not.toMatch(/\d|\bmuut\b|paremmin kuin|heikkou|rajoit|kriittis/i); expect(M.tmMvTeksti(x.teksti, 160, { luvut: false }).ok, x.teksti).toBe(true); }); }
    expect(n).toBe(27); expect(M.tmMvPohjat('onnistui', 'rakentaja').map((x) => x.teksti)).toEqual(['Mitä näit ennen kuin päätit?', 'Missä muualla tämä toimisi?', 'Mikä teki tästä helpon?']); expect(M.tmMvPohjat('tuntematon', 'x')).toHaveLength(3);
    for (const [k, v] of Object.entries(M.FI)) expect(v, k).not.toMatch(/(^|[^a-zäö])ase([^a-zäö]|$)/i);   // D54
  });
  it('pelaajanimet: Onnistuminen · Katsotaan yhdessä · Tilanne (kiinteä käännös)', () => { expect(['onnistui', 'prosessi', 'tulos'].map((t) => M.FI['mv_pelaajanimi_' + t])).toEqual(['Onnistuminen', 'Katsotaan yhdessä', 'Tilanne']); });
});

describe('vartija: saate ≤120 + KIELLETYT + ei lukuja; kysymys ≤160 + KIELLETYT; kuittaus ≤120', () => {
  it('saate: 120 ok, 121 ✗, KIELLETYT ✗, luku ✗, tyhjä ok', () => { expect(M.tmMvTeksti('s'.repeat(120), 120).ok).toBe(true); expect(M.tmMvTeksti('s'.repeat(121), 120)).toMatchObject({ ok: false, syy: 'pitka' }); expect(M.tmMvTeksti('Heikkous näkyy', 120)).toMatchObject({ ok: false, syy: 'sana' }); expect(M.tmMvTeksti('Onnistui 4/5', 120)).toMatchObject({ ok: false, syy: 'luku' }); expect(M.tmMvTeksti('  ', 120)).toMatchObject({ ok: true, teksti: null }); });
  it('kuittaus: tila suljettu + lause; tyhjä lause sallittu (vain sulku); 121 ✗; KIELLETYT ✗', () => { expect(M.tmMvKuittaus({ lause: ' Hyvä havainto. ' })).toEqual({ ok: true, paivitys: { tila: 'suljettu', kuittaus_lause: 'Hyvä havainto.' } }); expect(M.tmMvKuittaus({ lause: '' })).toEqual({ ok: true, paivitys: { tila: 'suljettu' } }); expect(M.tmMvKuittaus({ lause: 'x'.repeat(121) })).toMatchObject({ ok: false, syy: 'kuittaus' }); expect(M.tmMvKuittaus({ lause: 'Kriittinen virhe' })).toMatchObject({ ok: false, syy: 'sana' }); });
});

describe('lähetys: dokumentit (yksi / valitut / koko joukkue, sama klippi_id)', () => {
  const NYT = new Date(2026, 10, 3, 22, 15), V = (id, ika, o = {}) => Object.assign({ pelaajaId: id, pelaajaNimi: 'P' + id, ika, vastaanottajaUid: 'vastuu-uid' }, o);
  const S = (o = {}) => Object.assign({ url: 'https://app.veo.co/m/c?t=12', klippityyppi: 'onnistui', kysymys: 'Mitä näit ennen kuin päätit?', kysymys_avain: 'mv_pohja_onnistui_rakentaja_1', saate: 'Pidit pallon lähellä.', osa: 'b', vastaanottajat: [V('a', 13)] }, o);
  const CTX = { nyt: NYT, lahettajaUid: 'lahettaja', lahettajaNimi: 'Valmentaja V.', rooli: 'valmentaja' };
  it('yksi pelaaja: kaikki §3-kentät, tila lahetetty, nakyva_alkaen seuraava 07, vastaanottaja vastuuhenkilö, nakyvyys iästä', () => {
    const x = M.tmMvKlippiDokumentit(S(), CTX); expect(x.ok).toBe(true); expect(x.dokit).toHaveLength(1); const d = x.dokit[0];
    expect(d).toMatchObject({ tyyppi: 'klippi', url: 'https://app.veo.co/m/c?t=12', domain: 'app.veo.co', mediatyyppi: 'video', kohta_s: 12, klippityyppi: 'onnistui', kysymys: 'Mitä näit ennen kuin päätit?', kysymys_avain: 'mv_pohja_onnistui_rakentaja_1', saate: 'Pidit pallon lähellä.', osa: 'b', klippi_id: x.klippi_id, pelaajaId: 'a', nakyvyys: 'pelaaja', vastaanottajaUid: 'vastuu-uid', lahettajaUid: 'lahettaja', tila: 'lahetetty', luettu: false });
    expect([d.nakyva_alkaen.getDate(), d.nakyva_alkaen.getHours()]).toEqual([4, 7]); expect(d.aika).toBeNull(); expect(M.tmMvKlippiDokumentit(S({ vastaanottajat: [V('k', 10)] }), CTX).dokit[0].nakyvyys).toBe('huoltaja');
    const ilmanVastuuta = M.tmMvKlippiDokumentit(S({ vastaanottajat: [{ pelaajaId: 'z', ika: 14 }] }), CTX).dokit[0]; expect(ilmanVastuuta.vastaanottajaUid).toBe('lahettaja');   // muuten lähettäjälle
    for (const u of ['https://example.org/a.jpg', 'https://seura.fi/x']) { const y = M.tmMvKlippiDokumentit(S({ url: u }), CTX).dokit[0]; expect('kohta_s' in y).toBe(false); }
  });
  it('koko joukkue: n dokumenttia SAMALLA klippi_id:llä, ei osaa/tukitavoitetta, joukkueklippi:true, nakyvyys per pelaaja; duplikaatit pudotetaan', () => {
    const x = M.tmMvKlippiDokumentit(S({ joukkueklippi: true, tukitavoite_id: 'tt', vastaanottajat: [V('a', 13), V('b', 11), V('c', 15), V('a', 13)] }), CTX); expect(x.dokit).toHaveLength(3); expect(new Set(x.dokit.map((d) => d.klippi_id)).size).toBe(1); expect(x.dokit.every((d) => !('osa' in d) && !('tukitavoite_id' in d) && d.joukkueklippi === true)).toBe(true);
    expect(x.dokit.map((d) => d.nakyvyys)).toEqual(['pelaaja', 'huoltaja', 'pelaaja']); expect(x.yhteinen).toBe(true);
    const yksi = M.tmMvKlippiDokumentit(S({ joukkueklippi: true }), CTX); expect(yksi.dokit[0].joukkueklippi).toBeUndefined();   // yksi vastaanottaja ei ole joukkueklippi
    expect(M.tmMvKlippiDokumentit(S({ osa: 'x', tukitavoite_id: 'tt1' }), CTX).dokit[0]).not.toHaveProperty('osa'); expect(M.tmMvKlippiDokumentit(S({ tukitavoite_id: 'tt1' }), CTX).dokit[0].tukitavoite_id).toBe('tt1');
  });
  it('VALIDOINTI ENNEN KIRJOITUSTA: http, ei kysymystä, kysymys 161, saate 121, KIELLETYT (saate + oma kysymys), luku saatteessa, ei vastaanottajia, väärä tyyppi; luku sallittu kysymyksessä', () => {
    const v = (o) => M.tmMvKlippiDokumentit(S(o), CTX);
    expect(v({ url: 'http://x.fi/v' })).toEqual({ ok: false, syy: 'ei_https' }); expect(v({ kysymys: '' }).syy).toBe('kysymys'); expect(v({ kysymys: 'k'.repeat(161) }).syy).toBe('kysymys'); expect(v({ saate: 's'.repeat(121) }).syy).toBe('saate'); expect(v({ saate: 'Heikkous näkyy' }).syy).toBe('sana'); expect(v({ kysymys: 'Mikä on rajoite?' }).syy).toBe('sana');
    expect(v({ saate: 'Taso 4' }).syy).toBe('luku'); expect(v({ vastaanottajat: [] }).syy).toBe('vastaanottajat'); expect(v({ vastaanottajat: [{}] }).syy).toBe('vastaanottajat'); expect(v({ klippityyppi: 'muu' }).syy).toBe('tyyppi'); expect(v({ kysymys: 'Mitä teit kolmen sekunnin aikana?' }).ok).toBe(true);
    expect(v({ kysymys: 'k'.repeat(160), saate: 's'.repeat(120) }).ok).toBe(true); expect('saate' in v({ saate: '' }).dokit[0]).toBe(false);
  });
});

describe('tila ja Inbox-rivit (JOHDETTU, ryhmittely klippi_id:llä)', () => {
  const K = (id, pid, o = {}) => ({ id, tyyppi: 'klippi', klippi_id: 'kl1', pelaajaId: pid, domain: 'app.veo.co', mediatyyppi: 'video', kohta_s: 12, klippityyppi: 'onnistui', kysymys: 'Mitä näit?', saate: 'Hyvä', osa: 'b', aika: new Date(2026, 10, 3, 16, 5), ...o });
  const VA = (id, viite, pid, o = {}) => ({ id, tyyppi: 'klippi_vastaus', vastaus_viestille: viite, pelaajaId: pid, valinta: 'Näin puolustajan', teksti: 'Se tuli vasemmalta.', aika: new Date(2026, 10, 3, 18, 40), ...o });
  const PL = { a: { nimi: 'Topias', suostumusTila: 'annettu' }, b: { nimi: 'Eetu', suostumusTila: 'annettu' }, c: { nimi: 'Aaro', suostumusTila: 'odottaa' } };
  it('tmMvTila: odottaa · vastattu · perhe_kuittasi · odottaa_lupaa (suostumus ≠ annettu, voittaa) · suljettu (voittaa kaiken)', () => {
    const k = K('k1', 'a'); expect(M.tmMvTila(k, [], PL.a)).toBe('odottaa'); expect(M.tmMvTila(k, [VA('v', 'k1', 'a')], PL.a)).toBe('vastattu'); expect(M.tmMvTila(k, [VA('v', 'k1', 'a'), { id: 'h', tyyppi: 'klippi_kuittaus', vastaus_viestille: 'k1', kuittaus: true }], PL.a)).toBe('perhe_kuittasi');
    expect(M.tmMvTila(k, [], PL.c)).toBe('odottaa_lupaa'); expect(M.tmMvTila(k, [VA('v', 'k1', 'a')], { suostumusTila: 'pilotti' })).toBe('odottaa_lupaa'); expect(M.tmMvTila({ ...k, tila: 'suljettu' }, [], PL.c)).toBe('suljettu'); expect(M.tmMvTila(k, [VA('v', 'MUU', 'a')], PL.a)).toBe('odottaa');
  });
  it('yksi pelaaja: yksi rivi nimellä ja vastauksella; joukkueklippi: YKSI koottu rivi (n pelaajaa · vastauksia · lupaa odottaa), ei jäsenten nimiä', () => {
    const r1 = M.tmMvRivit([K('k1', 'a', { klippi_id: 'solo' }), VA('v1', 'k1', 'a')], { pelaajat: PL }); expect(r1).toHaveLength(1); expect(r1[0]).toMatchObject({ yhteinen: false, tila: 'vastattu', pelaajaNimi: 'Topias', klippiDocId: 'k1', osa: 'b', kysymys: 'Mitä näit?', domain: 'app.veo.co', kohta_s: 12 }); expect(r1[0].vastaus).toMatchObject({ valinta: 'Näin puolustajan', teksti: 'Se tuli vasemmalta.' });
    const dokit = [K('k1', 'a', { joukkueklippi: true }), K('k2', 'b', { joukkueklippi: true }), K('k3', 'c', { joukkueklippi: true }), VA('v1', 'k1', 'a'), VA('v2', 'k2', 'b')]; const r = M.tmMvRivit(dokit, { pelaajat: PL }); expect(r).toHaveLength(1); expect(r[0]).toMatchObject({ yhteinen: true, n: 3, vastauksia: 2, lupaaOdottaa: 1, tila: 'vastattu', klippiDocId: null, pelaajaId: null }); expect(r[0].dokIds).toEqual(['k1', 'k2', 'k3']);
    const h = M.tmMvRiviHTML(r[0], {}); expect(h).toContain('3 pelaajaa · 2 vastausta · 1 odottaa lupaa'); expect(h).toContain('Joukkueklippi'); expect(h).not.toContain('Topias');
  });
  it('rivit uusin ensin; erilliset klippi_id:t erillisiä rivejä; vastaus toisen klipin viitteellä ei sekoitu; perhe kuittasi näkyy', () => {
    const r = M.tmMvRivit([K('k1', 'a', { klippi_id: 'x1', aika: new Date(2026, 10, 1) }), K('k2', 'b', { klippi_id: 'x2', aika: new Date(2026, 10, 2) }), VA('v', 'k1', 'a', { aika: new Date(2026, 10, 5) }), { id: 'h', tyyppi: 'klippi_kuittaus', vastaus_viestille: 'k2', kuittaus: true, aika: new Date(2026, 10, 3) }], { pelaajat: PL });
    expect(r.map((x) => x.avain)).toEqual(['x1', 'x2']); expect(r[0].tila).toBe('vastattu'); expect(r[1].tila).toBe('perhe_kuittasi'); expect(r[1].perheKuittasi).toBe(true); expect(M.tmMvRivit(null, {})).toEqual([]); expect(M.tmMvRivit([{ id: 'x', tyyppi: 'teksti' }], {})).toEqual([]);
  });
});

describe('HTML (tokenit, escapointi, 390 px -yhteensopiva rakenne)', () => {
  const OPTS = { kohdeFn: 'a', valitseFn: 'b', urlFn: 'c', tyyppiFn: 'd', osaFn: 'e', pohjaFn: 'f', kysymysFn: 'g', saateFn: 'h', lahetaFn: 'i', suljeFn: 'j' };
  const S = (o = {}) => Object.assign({ kohde: 'yksi', pid: 'a', pelaajanNimi: 'Topias K.', joukkueNimi: 'KPV U13', valitut: [], url: 'https://app.veo.co/x?t=12', klippityyppi: 'onnistui', osa: 'b', osat: [{ k: 'a', teksti: 'laukaus vauhdista' }, { k: 'b', teksti: 'heikompi jalka' }], rekisteri: 'rakentaja', suostumusPuuttuu: false, pelaajatLista: [{ id: 'a', nimi: 'Topias' }, { id: 'b', nimi: 'Eetu' }], tarjolla: { yksi: true } }, o);
  it('sheet: kuusi kenttää (Kenelle, Linkki, Tyyppi, Osa, Kysymys, Saate), pohjat rekisterin mukaan, tunnistusrivi, nappi "Lähetä Topias K."', () => {
    const h = M.tmMvSheetHTML(S(), OPTS); for (const t of ['Kenelle', '1 · Linkki', '2 · Tyyppi', '3 · Jakson osa', '4 · Kysymys', '5 · Saate', 'Onnistui', 'Prosessi', 'Tulos', 'Mitä näit ennen kuin päätit?', 'Lähetä Topias K.', 'tallentuu heti · näkyy klo 7–21', 'Kysy tilanteesta, älä vertaa.', 'app.veo.co · video · kohta 0:12']) expect(h, t).toContain(t);
    expect((h.match(/data-mv-pohja=/g) || []).length).toBe(3); expect(h).toContain('maxlength="160"'); expect(h).toContain('maxlength="120"'); expect(h).not.toMatch(/#[0-9a-fA-F]{3,6}\b/); expect(h).toContain('data-mv-oma'); expect(h).toContain('Mitä näit ennen kuin päätit?');
    expect(M.tmMvSheetHTML(S({ rekisteri: 'leikkija' }), OPTS)).toContain('Mitä teit tässä hyvin?'); expect(M.tmMvSheetHTML(S({ klippityyppi: 'tulos', rekisteri: 'showcase' }), OPTS)).toContain('Miten luet tämän tilanteen?');
  });
  it('suostumus puuttuu → nappi "Tallenna – näkyy kun lupa on annettu" + amber-huomautus; koko joukkue: ei osaa, vakiokysymys; valitut: pelaajalista checkboxeina', () => {
    const l = M.tmMvSheetHTML(S({ suostumusPuuttuu: true }), OPTS); expect(l).toContain('Tallenna – näkyy kun lupa on annettu'); expect(l).toContain('data-mv-lupa'); expect(l).not.toContain('Lähetä Topias K.');
    const j = M.tmMvSheetHTML(S({ kohde: 'joukkue' }), OPTS); expect(j).toContain('data-mv-joukkuekysymys'); expect(j).toContain('Mitä huomaat tästä tilanteesta?'); expect(j).not.toContain('3 · Jakson osa'); expect(j).not.toContain('data-mv-pohja='); expect(j).toContain('Koko joukkue KPV U13');
    const v = M.tmMvSheetHTML(S({ kohde: 'valitut', valitut: ['b'] }), OPTS); expect(v).toContain('data-mv-pelaaja="b" checked'); expect(v).not.toContain('data-mv-pelaaja="a" checked');
  });
  it('XSS: nimi, url, saate, oma kysymys escapataan; virheellinen linkki → amber + virheteksti', () => {
    const h = M.tmMvSheetHTML(S({ pelaajanNimi: '<b>x</b>', url: 'http://"><script>1</script>', saate: '</textarea><script>2</script>', kysymysOma: '"><img src=x>' }), OPTS); expect(h).not.toContain('<script>'); expect(h).not.toContain('<b>x</b>'); expect(h).not.toContain('<img src=x>'); expect(h).toContain('Linkin pitää alkaa https://');
  });
  it('Inbox-rivi: 🎬 + värillinen piste per tila (odottaa harmaa · vastattu teal · perhe sininen · lupa amber), linkitön (avaa ketjun); ketju: kolme askelta + kuittauskenttä (120) / suljettu', () => {
    const R = (tila, o = {}) => Object.assign({ avain: 'k', tila, yhteinen: false, pelaajaNimi: 'Topias', kysymys: 'Mitä näit?', domain: 'app.veo.co', kohta_s: 12, osa: 'b', saate: 'Hyvä', klippityyppi: 'onnistui', t: 1e12, vastaus: null }, o);
    const v = { odottaa: 'var(--ink3)', vastattu: 'var(--teal)', perhe_kuittasi: 'var(--blue', odottaa_lupaa: 'var(--amber)' }; for (const [t, c] of Object.entries(v)) { const h = M.tmMvRiviHTML(R(t), { avaaFn: 'x' }); expect(h, t).toContain('🎬'); expect(h).toContain('data-mv-tila="' + t + '"'); expect(h).toContain(c); expect(h).not.toMatch(/<a /); }
    expect(M.tmMvRiviHTML(R('vastattu', { vastaus: { teksti: 'Se tuli vasemmalta.', valinta: '' } }), {})).toContain('Topias vastasi klippiin'); expect(M.tmMvRiviHTML(R('perhe_kuittasi'), {})).toContain('Perhe kuittasi: katsoimme yhdessä'); expect(M.tmMvRiviHTML(R('odottaa_lupaa'), {})).toContain('Odottaa suostumusta');
    const k = M.tmMvKetjuHTML({ rivi: R('vastattu', { url: 'https://app.veo.co/x?t=12', vastaus: { valinta: 'Näin puolustajan', teksti: 'Se tuli vasemmalta.', aika: 1e12 } }), lause: '' }, { lauseFn: 'l', kuittaaFn: 'k', suljeFn: 's' });
    expect(k).toContain('href="https://app.veo.co/x?t=12"'); expect(k).toContain('target="_blank"'); expect(k).toContain('rel="noopener noreferrer"'); expect(k).toContain('app.veo.co · 0:12'); expect(k).toContain('Mitä näit?'); expect(k).toContain('Näin puolustajan — Se tuli vasemmalta.'); expect(k).toContain('maxlength="120"'); expect(k).toContain('Kuittaa ja sulje');
    const s = M.tmMvKetjuHTML({ rivi: R('suljettu', { kuittaus_lause: 'Hyvä havainto.' }) }, {}); expect(s).toContain('Hyvä havainto.'); expect(s).not.toContain('data-mv-kuittaa'); expect(M.tmMvKetjuHTML({ rivi: R('odottaa') }, {})).toContain('Ei vastausta vielä.');
  });
  it('Polku-kortti: Lisää klippi + rivit / tyhjä-tila', () => { const h = M.tmMvKlipitKorttiHTML([], { lisaaFn: '_a', pid: 'p1' }); expect(h).toContain('Ei klippejä vielä.'); expect(h).toContain("_a('p1')"); expect(M.tmMvKlipitKorttiHTML([{ avain: 'k', tila: 'odottaa', pelaajaNimi: 'T', kysymys: 'x', t: 1 }], {})).toContain('data-mv-rivi="k"'); });
});

/* ── Adapterit ── */
function ymp(sov, o = {}) {
  const master = sov === 'Master', src = master ? MASTER : VP, log = { toast: [], batch: [], update: [], warn: [], renderInbox: 0, jonot: [] }, els = {};
  const PEL = o.pelaajat || [{ id: 'a', etunimi: 'Topias', sukunimi: 'K', joukkue: 'KPV U13', syntymaVuosi: 2013, suostumusTila: 'annettu', vastuuhenkilo: { uid: 'vastuu-uid' }, jaksofokus: { konsepti_avain: 'x', konsepti_nimi: 'Kuljetus', tila: undefined, alkoi: new Date().toISOString(), kesto_vk: 6 } }, { id: 'b', etunimi: 'Eetu', sukunimi: 'M', joukkue: 'KPV U13', suostumusTila: 'annettu' }, { id: 'c', etunimi: 'Aaro', sukunimi: 'P', joukkue: 'KPV U11', suostumusTila: 'odottaa' }];
  const ikat = { a: 13, b: 12, c: 11 };
  const mkDoc = (polku) => ({ polku, update: async (d) => { if (o.kaada) throw Object.assign(new Error('x'), { code: 'permission-denied' }); log.update.push([polku, d]); } });
  const col = { doc: (id) => mkDoc('viestit/' + (id || 'uusi' + Math.random().toString(36).slice(2, 5))), where: (...a) => { log.jonot.push(a); return col; }, get: async () => ({ docs: [] }) };
  const db = { collection: () => ({ doc: () => ({ collection: () => col }) }), batch: () => { const ops = []; return { set: (r, d) => ops.push([r.polku, d]), commit: async () => { if (o.kaada) throw Object.assign(new Error('x'), { code: 'permission-denied' }); log.batch.push(ops); } }; } };
  const doc = { getElementById: (id) => els[id] || null, querySelector: () => null, createElement: () => ({ set innerHTML(v) { this.firstChild = { id: (/id="([^"]+)"/.exec(v) || [])[1], html: v, remove() { delete els[this.id]; } }; } }), body: { appendChild: (n) => { els[n.id] = n; } } };
  const sb = { window: { TM_MEDIAVIESTI: M, TM_TANAAN_KENTTA: require('../lib/tm_tanaan_kentta.js'), _vpRooli: 'vp' }, document: doc, console: { warn: (...a) => log.warn.push(a) }, Object, Array, Date, JSON, Math, Promise, String, Number, TM_VIRHEKOODI: require('../lib/tm_virhekoodi.js'),
    firebase: { auth: () => ({ currentUser: { displayName: 'Vera V.', getIdToken: async () => 't' } }), firestore: { FieldValue: { serverTimestamp: () => 'TS' }, Timestamp: { fromDate: (d) => ({ __ts: d.toISOString() }) } } },
    _seuraId: 'sibbo', _uid: 'lahettaja', _demo: !!o.demo, _isDemoMode: !!o.demo, _db: db, db, _pelaajatData: PEL, _pelaajat: PEL, _joukkue: 'KPV U13', _rooli: 'valmentaja', _tmHenkiloNimi: (p) => p.etunimi + ' ' + (p.sukunimi || '')[0] + '.', _devIkaSp: (p) => ({ ika: ikat[p.id] }), _dimIkaSp: (j, p) => ({ ika: ikat[p.id] }),
    masterT: (x) => x, vpT: (x) => x, _mEsc: (s) => String(s == null ? '' : s), _jsvEsc: (s) => String(s == null ? '' : s), _mVerkkoEnnenSulkua: () => !o.offline, _mTuoreToken: async () => {}, toast: (t, k) => log.toast.push([t, k]), renderInbox: () => { log.renderInbox++; }, _ktS: { pid: null } };
  vm.createContext(sb);
  const koodi = pala(src, '/* ═══ R6.4 Mediaviesti M1', master ? 'function _msDots(' : 'function _vpSulkuJaksovali(');
  vm.runInContext(koodi + '\nthis.__r=_mvRivit;this.__e=_mvEtsiRivi;this.__l=_mvLataaKlipit;', sb);
  return { sb, w: sb.window, log, els };
}
const lopeta = () => new Promise((r) => setTimeout(r, 0));
for (const sov of ['Master', 'VP']) {
  describe(sov + ' · mediaviesti-adapteri (vm)', () => {
    const tayta = (w, o = {}) => { w._mvUrl(o.url || 'https://app.veo.co/m/c?t=12'); w._mvPohja(0); w._mvSaate(o.saate == null ? 'Pidit pallon lähellä.' : o.saate); };
    it('avaus pelaajalle: sheet piirtyy, rekisteri iästä (13 → Rakentaja), vastaanottaja yksi', async () => {
      const e = ymp(sov); e.w._mvAvaa('a'); expect(e.els._mvModal.html).toContain('Lähetä Topias K.'); expect(e.w._mvTila.rekisteri).toBe('rakentaja'); expect(e.w._mvTila.kohde).toBe('yksi'); expect(e.w._mvTila.osat.length).toBeGreaterThanOrEqual(0);
    });
    it('LÄHETYS yhdelle: writeBatch, yksi dokumentti — kentät, aika=serverTimestamp, nakyva_alkaen Timestamp, vastaanottaja vastuuhenkilö; sheet sulkeutuu; toast ok', async () => {
      const e = ymp(sov); e.w._mvAvaa('a'); tayta(e.w); await e.w._mvLaheta(); expect(e.log.batch).toHaveLength(1); const [polku, d] = e.log.batch[0][0];
      expect(polku).toMatch(/^viestit\/uusi/); expect(d).toMatchObject({ tyyppi: 'klippi', domain: 'app.veo.co', mediatyyppi: 'video', kohta_s: 12, klippityyppi: 'onnistui', kysymys: 'Mitä näit ennen kuin päätit?', saate: 'Pidit pallon lähellä.', pelaajaId: 'a', nakyvyys: 'pelaaja', vastaanottajaUid: 'vastuu-uid', lahettajaUid: 'lahettaja', tila: 'lahetetty', aika: 'TS' }); expect(d.nakyva_alkaen.__ts).toMatch(/^2\d{3}-/);
      expect(e.els._mvModal).toBeUndefined(); expect(e.w._mvTila).toBeNull(); expect(e.log.toast.at(-1)).toEqual(['Klippi lähetetty ✓', 'ok']);
    });
    it('KOKO JOUKKUE: n dokumenttia samalla klippi_id:llä (vain valitun joukkueen pelaajat), vakiokysymys, ei osaa; U11 → huoltaja-näkyvyys', async () => {
      const e = ymp(sov, { pelaajat: [{ id: 'a', etunimi: 'T', sukunimi: 'K', joukkue: 'KPV U13', suostumusTila: 'annettu' }, { id: 'b', etunimi: 'E', sukunimi: 'M', joukkue: 'KPV U13', suostumusTila: 'annettu' }, { id: 'c', etunimi: 'A', sukunimi: 'P', joukkue: 'KPV U11', suostumusTila: 'annettu' }] }); e.w._mvAvaa('a'); e.w._mvKohde('joukkue'); e.w._mvUrl('https://youtu.be/x?t=5'); await e.w._mvLaheta();
      const dokit = e.log.batch[0].map((x) => x[1]); expect(dokit).toHaveLength(2); expect(new Set(dokit.map((d) => d.klippi_id)).size).toBe(1); expect(dokit.every((d) => d.kysymys === 'Mitä huomaat tästä tilanteesta?' && !('osa' in d) && d.joukkueklippi === true)).toBe(true); expect(dokit.map((d) => d.pelaajaId).sort()).toEqual(['a', 'b']); expect(e.log.toast.at(-1)[0]).toContain('2 pelaajalle');
    });
    it('VALITUT: vain valitut; ilman valintaa → toast, ei kirjoitusta', async () => {
      const e = ymp(sov); e.w._mvAvaa(null); expect(e.w._mvTila.kohde).toBe('valitut'); e.w._mvUrl('https://x.fi/v'); e.w._mvPohja(1); await e.w._mvLaheta(); expect(e.log.toast.at(-1)).toEqual(['Valitse vähintään yksi pelaaja.', 'error']); expect(e.log.batch).toEqual([]);
      e.w._mvValitse('b'); await e.w._mvLaheta(); expect(e.log.batch[0]).toHaveLength(1); expect(e.log.batch[0][0][1].pelaajaId).toBe('b');
    });
    it('SUOSTUMUS (D58): odottaa → nappi "Tallenna – näkyy kun lupa on annettu", viesti tallentuu silti heti (tila lahetetty); Inbox-rivi johdetaan "odottaa lupaa"', async () => {
      const e = ymp(sov); e.w._mvAvaa(null); e.w._mvValitse('c'); expect(e.w._mvTila.suostumusPuuttuu).toBe(true); expect(e.els._mvModal.html).toContain('Tallenna – näkyy kun lupa on annettu'); tayta(e.w); await e.w._mvLaheta();
      const d = e.log.batch[0][0][1]; expect(d.tila).toBe('lahetetty'); expect(d.nakyvyys).toBe('huoltaja'); const rivit = e.sb.__r([Object.assign({ id: 'k1' }, d)]); expect(rivit[0].tila).toBe('odottaa_lupaa');
    });
    it('VALIDOINTI ENNEN KIRJOITUSTA: http://, ei kysymystä, KIELLETYT saatteessa, 121 merkkiä → toast, EI batchia, sheet auki', async () => {
      const e = ymp(sov); e.w._mvAvaa('a'); e.w._mvUrl('http://app.veo.co/x'); e.w._mvPohja(0); await e.w._mvLaheta(); expect(e.log.toast.at(-1)).toEqual(['Linkin pitää alkaa https://', 'error']);
      e.w._mvUrl('https://app.veo.co/x'); e.w._mvKysymys(''); e.w._mvTyyppi('tulos'); await e.w._mvLaheta(); expect(e.log.toast.at(-1)[0]).toContain('kysymys');
      e.w._mvPohja(0); e.w._mvSaate('Heikkous näkyy'); await e.w._mvLaheta(); expect(e.log.toast.at(-1)[0]).toContain('sana'); e.w._mvSaate('x'.repeat(121)); await e.w._mvLaheta(); expect(e.log.toast.at(-1)[0]).toContain('liian pitkä');
      expect(e.log.batch).toEqual([]); expect(e.els._mvModal).toBeDefined();
    });
    it('D53: permission-denied → toast + koodi + konsoli, sheet AUKI, syötetyt säilyvät, uudelleenyritys mahdollinen; offline → ei kirjoitusta', async () => {
      const e = ymp(sov, { kaada: true }); e.w._mvAvaa('a'); tayta(e.w); await e.w._mvLaheta(); expect(e.log.toast.at(-1)).toEqual(['Tallennus epäonnistui (permission-denied)', 'error']); expect(e.log.warn.length).toBeGreaterThan(0); expect(e.els._mvModal).toBeDefined(); expect(e.w._mvTila.url).toContain('veo.co'); expect(e.w._mvTila.tallentaa).toBe(false);
      if (sov === 'Master') { const o = ymp(sov, { offline: true }); o.w._mvAvaa('a'); tayta(o.w); await o.w._mvLaheta(); expect(o.log.batch).toEqual([]); }
    });
    it('demo: ei Firestorea; Inbox-dokumentti lokaalisti', async () => { const e = ymp(sov, { demo: true }); e.w._mvAvaa('a'); tayta(e.w); await e.w._mvLaheta(); expect(e.log.batch).toEqual([]); expect(e.w._mvDokit).toHaveLength(1); });
    it('KETJU + KUITTAUS: kolme askelta; "Kuittaa ja sulje" → update VAIN { tila:suljettu, kuittaus_lause } klipin dokumenttiin; 121 / KIELLETYT → ei kirjoitusta; virhe → toast + auki', async () => {
      const dokit = [{ id: 'k1', tyyppi: 'klippi', klippi_id: 'x1', pelaajaId: 'a', domain: 'app.veo.co', mediatyyppi: 'video', url: 'https://app.veo.co/x', klippityyppi: 'onnistui', kysymys: 'Mitä näit?', saate: 'Hyvä', aika: new Date() }, { id: 'v1', tyyppi: 'klippi_vastaus', vastaus_viestille: 'k1', pelaajaId: 'a', valinta: 'Näin', teksti: 'Se tuli vasemmalta.', aika: new Date() }];
      const e = ymp(sov); e.w._mvPolku.a = dokit; e.w._mvAvaaKetju('x1'); expect(e.els._mvKetju.html).toContain('Näin — Se tuli vasemmalta.'); expect(e.els._mvKetju.html).toContain('Kuittaa ja sulje');
      e.w._mvKuittausLause('x'.repeat(121)); await e.w._mvKuittaa(); expect(e.log.update).toEqual([]); e.w._mvKuittausLause('Kriittinen'); await e.w._mvKuittaa(); expect(e.log.update).toEqual([]);
      e.w._mvKuittausLause('Hyvä havainto – sama katse.'); await e.w._mvKuittaa(); expect(e.log.update).toEqual([['viestit/k1', { tila: 'suljettu', kuittaus_lause: 'Hyvä havainto – sama katse.' }]]); expect(e.els._mvKetju).toBeUndefined(); expect(dokit[0].tila).toBe('suljettu');
      const k = ymp(sov, { kaada: true }); k.w._mvPolku.a = [dokit[0], dokit[1]].map((d) => ({ ...d, tila: undefined })); k.w._mvAvaaKetju('x1'); k.w._mvKuittausLause('Kiitos'); await k.w._mvKuittaa(); expect(k.log.toast.at(-1)).toEqual(['Tallennus epäonnistui (permission-denied)', 'error']); expect(k.els._mvKetju).toBeDefined();
    });
    it('koottu rivi avaa jäsenlistan (ei yksittäistä ketjua); Polku-kysely sisältää pelaajaId + nakyvyys in [pelaaja,huoltaja] (Rules todistettavasti sallii valmentajalle/johdolle)', async () => {
      const dokit = [{ id: 'k1', tyyppi: 'klippi', klippi_id: 'g', pelaajaId: 'a', domain: 'x.fi', kysymys: 'q', aika: new Date(), joukkueklippi: true }, { id: 'k2', tyyppi: 'klippi', klippi_id: 'g', pelaajaId: 'b', domain: 'x.fi', kysymys: 'q', aika: new Date(), joukkueklippi: true }];
      const e = ymp(sov); e.w._mvPolku.a = dokit; e.w._mvAvaaKetju('g'); expect(e.els._mvKetju.html).toContain('Joukkueklippi'); expect(e.els._mvKetju.html).toContain('data-mv-rivi='); expect(e.els._mvKetju.html).not.toContain('Kuittaa ja sulje');
      const p = ymp(sov); p.els.mvKlipit = { innerHTML: '' }; p.sb.document.getElementById = (id) => p.els[id] || null; await p.sb.__l({ id: 'a' }); const ehdot = p.log.jonot.map((a) => a.join(':')); expect(ehdot).toContain('pelaajaId:==:a'); expect(ehdot.some((x) => /^nakyvyys:in:pelaaja,huoltaja$/.test(x))).toBe(true); expect(p.els.mvKlipit.innerHTML).toContain('Klipit');
    });
  });
}

describe('Master: Inbox-integraatio + V4-valikko + Polku-kortti', () => {
  it('klippirivit Inboxiin (_getInboxEvents), kooste klippi_id:llä; sulkeutunut → arkistoon; vanha VP-viestien kuuntelija ohittaa klippityypit; oma kysely ilman 20 rivin rajaa', () => {
    expect(MASTER).toContain("_mvRivit(window._mvDokit).forEach(function (r) { yhdistetty.push({ id: 'mv_' + r.avain, type: 'klippi.rivi'"); expect(MASTER).toContain("(e.type==='klippi.rivi' && !!e.rivi && e.rivi.tila==='suljettu')"); expect(MASTER).toContain("if (e.type === 'klippi.rivi') return _mKlippiKorttiHTML(e);");
    expect(MASTER).toContain("if (data.tyyppi === 'klippi' || data.tyyppi === 'klippi_vastaus' || data.tyyppi === 'klippi_kuittaus') return null;"); expect(MASTER).toContain('_vpViestit = _vpViestit.filter(Boolean);');
    expect(MASTER).toContain(".where('vastaanottajaUid', '==', _uid).where('tyyppi', 'in', ['klippi', 'klippi_vastaus', 'klippi_kuittaus']).limit(600)"); expect(MASTER).toContain('_mvKuuntele();   // R6.4 mediaviesti');
  });
  it('Inboxin ＋ klippi -nappi on aina näkyvissä (ei Kenttä-lippua); V4 ⋯ "Lisää klippi" → _mvAvaa (lipulla, vain V4-näkymässä)', () => {
    expect(MASTER).toContain('onclick="_mvAvaa(null)" id="mvKlippiNappi"'); const blokki = pala(MASTER, '/* ═══ R6.4 Mediaviesti M1', 'function _msDots('); expect(blokki).not.toMatch(/_ktLippu|liput\.kentta/); expect(blokki).not.toMatch(/_mJjLataaLiput/);
    for (const src of [MASTER, VP]) expect(src).toContain("if (avain === 'klippi') return window._mvAvaa(pid);"); expect(require('../lib/tm_aloita_jakso.js').tmJaksoTila({ jaksofokus: { konsepti_avain: 'x', konsepti_nimi: 'X', alkoi: new Date().toISOString(), kesto_vk: 4 } }, {}).valikko.find((m) => m.avain === 'klippi').kaytettavissa).toBe(true);
  });
  it('Polku-kortti: #mvKlipit-paikka + lazy-lataus vain Polku avattaessa (Master + VP)', () => { for (const src of [MASTER, VP]) { expect(src).toContain('<div id="mvKlipit"></div>'); expect(src).toContain("if (S.ladattu.polku && typeof _mvLataaKlipit === 'function') _mvLataaKlipit(p);"); expect(src).toContain('<script src="lib/tm_mediaviesti.js?v=2"></script>'); } });
});

describe('Geminin sv-lista + sanasto', () => {
  it('docs/R6_4_MEDIAVIESTI_SV_KAANNOKSET.md sisältää KAIKKI mv_*-avaimet (27 pohjaa + käyttöliittymä); sv jää määrittelemättä', () => { const d = lue('docs/R6_4_MEDIAVIESTI_SV_KAANNOKSET.md'); for (const k of Object.keys(M.FI)) expect(d, k).toContain('`' + k + '`'); expect(Object.keys(M.FI).filter((k) => /^mv_pohja_/.test(k))).toHaveLength(27); expect(d).toContain('Sibbo'); });
  it('Rules v3.50 + indeksi', () => { const r = lue('tm_admin/firestore.rules'); expect(r).toMatch(/firestore\.rules v3\.(50|51)/); expect(r).toContain('function klippiLuontiKelpaa()'); expect(r).toContain('function klippiVastausKelpaa(seuraId)'); expect(JSON.parse(lue('firestore.indexes.json')).indexes.some((i) => i.collectionGroup === 'viestit' && i.fields.map((f) => f.fieldPath).join() === 'pelaajaId,nakyvyys,nakyva_alkaen')).toBe(true); });
});
