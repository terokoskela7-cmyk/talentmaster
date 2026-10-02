'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { esc, otsikkoPuhdas, rakennaKutsuLinkki } = require('../sahkoposti_turva');
const pohjat = require('../sahkoposti_pohjat');

const BASE = 'https://talentmasterid.com';
const SIVU = BASE + '/TalentMaster_Rekisterointi_Suostumus.html';

test('esc: & < > " \' kaikki', () => {
  assert.strictEqual(esc(`&<>"'`), '&amp;&lt;&gt;&quot;&#39;');
  assert.strictEqual(esc(null), '');
  assert.strictEqual(esc(undefined), '');
});

test('nimi <b>x</b> renderöityy tekstinä kaikissa pohjissa', () => {
  const n = '<b>x</b>';
  const kaikki = [
    pohjat.pohjaRekisteriKutsu({ seuraNimi: n, pelaajaNimi: n, joukkueNimi: n, linkki: SIVU }),
    pohjat.pohjaMuistutus({ seuraNimi: n, pelaajaNimi: n, linkki: SIVU }),
    pohjat.pohjaPelaajaSivu({ seuraNimi: n, pelaajaNimi: n, joukkueNimi: n, salasanaLinkki: SIVU,
      vanhempiLinkki: SIVU, pelaajaLinkki: SIVU, hEmail: n, palloId: n, pin: n }),
    pohjat.pohjaPelaajaSivu({ seuraNimi: n, pelaajaNimi: n, vanhempiLinkki: SIVU, pelaajaLinkki: SIVU, hEmail: n }),
    pohjat.pohjaSalasanaAsetus({ etunimi: n, rooli: n, resetLinkki: SIVU }),
    pohjat.pohjaSuostumusLinkki({ lapsiNimi: n, resetLinkki: SIVU, pin: n }),
    pohjat.pohjaSoloLupa({ child_etunimi: n, linkki: SIVU }),
  ];
  for (const html of kaikki) {
    assert.ok(!html.includes('<b>x</b>'), 'raaka <b> vuoti');
    assert.ok(html.includes('&lt;b&gt;x&lt;/b&gt;'));
  }
});

test("O'Koskela ja href-attribuutin rikkominen", () => {
  const html = pohjat.pohjaRekisteriKutsu({ seuraNimi: "O'Koskela", pelaajaNimi: 'a', linkki: 'x" onmouseover="alert(1)' });
  assert.ok(html.includes('O&#39;Koskela'));
  assert.ok(!html.includes('" onmouseover="'));
  assert.ok(html.includes('&quot; onmouseover=&quot;'));
});

test('pohjaHeader ei käytä kiellettyä taustaa #06090F', () => {
  const h = pohjat.pohjaHeader('X');
  assert.ok(!/06090F/i.test(h));
  assert.ok(h.includes('#111110'));
});

test('otsikkoPuhdas: rivinvaihdot pois + pituusraja', () => {
  assert.strictEqual(otsikkoPuhdas('Hei\r\nBcc: a@b.fi'), 'Hei Bcc: a@b.fi');
  assert.strictEqual(otsikkoPuhdas('x'.repeat(500), 70).length, 70);
});

test('linkki: vieras domain hylätään', () => {
  assert.throws(() => rakennaKutsuLinkki('https://evil.example/', BASE), /linkki_hylatty/);
  assert.throws(() => rakennaKutsuLinkki('https://evil.example/TalentMaster_Rekisterointi_Suostumus.html?seuraId=a', BASE), /linkki_hylatty/);
  assert.throws(() => rakennaKutsuLinkki('https://talentmasterid.com.evil.example/TalentMaster_Rekisterointi_Suostumus.html', BASE), /linkki_hylatty/);
  assert.throws(() => rakennaKutsuLinkki('javascript:alert(1)', BASE), /linkki_hylatty/);
  assert.throws(() => rakennaKutsuLinkki('http://talentmasterid.com/TalentMaster_Rekisterointi_Suostumus.html', BASE), /linkki_hylatty/);
});

test('linkki: ilman TM_BASE_URL-alkua / väärä sivu / ei-URL hylätään', () => {
  assert.throws(() => rakennaKutsuLinkki('TalentMaster_Rekisterointi_Suostumus.html?seuraId=a', BASE), /linkki_hylatty/);
  assert.throws(() => rakennaKutsuLinkki(BASE + '/muu.html?seuraId=a', BASE), /linkki_hylatty/);
  assert.throws(() => rakennaKutsuLinkki('', BASE), /linkki_hylatty/);
});

test('linkki: Seura-sivun muoto + #714 suostumusAnnettu + kutsuId säilyvät', () => {
  const raaka = SIVU + '?seuraId=s1&pelaajaId=p1&seura=FC%20O%27K&etunimi=Ella&sukunimi=K&joukkue=U12'
    + '&hEmail=a%40b.fi&suostumusAnnettu=2026-09-30&kutsuId=k9';
  const u = new URL(rakennaKutsuLinkki(raaka, BASE));
  assert.strictEqual(u.origin + u.pathname, SIVU);
  assert.strictEqual(u.searchParams.get('suostumusAnnettu'), '2026-09-30');
  assert.strictEqual(u.searchParams.get('kutsuId'), 'k9');
  assert.strictEqual(u.searchParams.get('seura'), "FC O'K");
  assert.strictEqual(u.searchParams.get('hEmail'), 'a@b.fi');
});

test('linkki: vanha Pages- ja web.app-origin sallitaan mutta kirjoitetaan uudelleen TM_BASE_URL:lle; tuntemattomat parametrit tippuvat', () => {
  const p = 'https://terokoskela7-cmyk.github.io/talentmaster/TalentMaster_Rekisterointi_Suostumus.html?seuraId=s1&redirect=https%3A%2F%2Fevil.example';
  const l = rakennaKutsuLinkki(p, BASE);
  assert.strictEqual(l, SIVU + '?seuraId=s1');
  assert.ok(rakennaKutsuLinkki('https://talentmaster-pilot.web.app/TalentMaster_Rekisterointi_Suostumus.html?seuraId=s1', BASE).startsWith(SIVU));
});
