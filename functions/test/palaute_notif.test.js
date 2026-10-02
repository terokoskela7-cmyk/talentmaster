'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { muodostaPalauteNotif: m, pvmPK, rooliSelkokielella } = require('../palaute_notif');

test('ääni vs. teksti', () => {
  assert.strictEqual(m({ tekijaEtunimi: 'Rasmus', onAani: true, pvm: '2026-10-02', joukkue: 'KPV U13' }).teksti,
    'Rasmus antoi äänipalautetta harjoituksestasi 2.10. (KPV U13).');
  assert.strictEqual(m({ tekijaEtunimi: 'Rasmus', onAani: false, pvm: '2026-10-02', joukkue: 'KPV U13' }).teksti,
    'Rasmus antoi palautetta harjoituksestasi 2.10. (KPV U13).');
  assert.strictEqual(m({ tekijaEtunimi: 'R', pvm: '2026-10-02' }).onAani, false);   // vain onAani === true on ääni
});
test('nimi puuttuu → rooli selkokielellä, sitten "Joku"', () => {
  assert.ok(m({ tekijaRooli: 'vp', pvm: '2026-10-02' }).teksti.startsWith('Valmennuspäällikkö antoi'));
  assert.ok(m({ tekijaEtunimi: '   ', tekijaRooli: 'valmentaja' }).teksti.startsWith('Valmentaja antoi'));
  assert.ok(m({ tekijaRooli: 'tuntematon_rooli' }).teksti.startsWith('Joku antoi'));
  assert.strictEqual(m({}).tekija_etunimi, null);
});
test('päivä puuttuu / virheellinen, joukkue puuttuu — ei kaksoispisteitä eikä "undefined"', () => {
  assert.strictEqual(m({ tekijaEtunimi: 'A', joukkue: 'U9' }).teksti, 'A antoi palautetta harjoituksestasi (U9).');
  assert.strictEqual(m({ tekijaEtunimi: 'A', pvm: 'ei-päivä' }).teksti, 'A antoi palautetta harjoituksestasi.');
  assert.strictEqual(m({ tekijaEtunimi: 'A', pvm: '2026-10-02' }).teksti, 'A antoi palautetta harjoituksestasi 2.10.');
  assert.strictEqual(m({}).teksti, 'Joku antoi palautetta harjoituksestasi.');
  for (const t of [m({}).teksti, m({ pvm: 'x', joukkue: '' }).teksti]) assert.ok(!/undefined|null|\.\./.test(t));
});
test('P.K.-muoto: ISO-aika, Date, Timestamp-olio; etunimestä vain ensimmäinen sana', () => {
  assert.strictEqual(pvmPK('2026-01-09'), '9.1.');
  assert.strictEqual(pvmPK('2026-10-02T11:30:00.000Z'), '2.10.');
  assert.strictEqual(pvmPK(new Date(Date.UTC(2026, 9, 2))), '2.10.');
  assert.strictEqual(pvmPK({ toDate: () => new Date(Date.UTC(2026, 9, 2)) }), '2.10.');
  assert.strictEqual(m({ tekijaEtunimi: 'Mari Anna', pvm: '2026-10-02' }).tekija_etunimi, 'Mari');
  assert.strictEqual(rooliSelkokielella('VP'), 'Valmennuspäällikkö');
});
test('teksti ei sisällä pelaajien nimiä (funktio ei edes saa niitä)', () => {
  assert.strictEqual(m.length, 1);
  const t = m({ tekijaEtunimi: 'Rasmus', pelaajaNimi: 'Testi Pelaaja', pelaajat: ['Testi Pelaaja'] }).teksti;
  assert.ok(!t.includes('Testi'));
});
