/* K1d: notifReviewEraantyy:n ydin (rytmi_notif.js) — jakson yhteenveto nollaa, jakso päättyy ennen eräpäivää → ei pushia; teksti. Pariteetti sovellukseen: tests/k1d_notif_rytmi_parity.test.js */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { rytmiNotifit } = require('../rytmi_notif');
const NYT = new Date(2026, 9, 21, 12, 0).getTime();
const iso = (n) => { const d = new Date(2026, 9, 21 + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const pel = (x) => Object.assign({ etunimi: 'Topi', sukunimi: 'Esimerkki', syntymaVuosi: 2013, joukkue: 'Demo U13' }, x);
test('erääntymässä (5 pv) → push, teksti viimeistään-päivällä', () => {
  const r = rytmiNotifit([{ id: 'a', data: pel({ review_viimeisin_pvm: iso(-37) }) }], NYT);
  assert.strictEqual(r.length, 1); assert.strictEqual(r[0].teksti, 'Jakson yhteenveto tai kehityskeskustelu viimeistään 26.10.: Topi Esimerkki (Demo U13).');
});
test('myöhässä → "myöhässä n pv"', () => {
  const r = rytmiNotifit([{ id: 'a', data: pel({ review_viimeisin_pvm: iso(-51) }) }], NYT);
  assert.strictEqual(r[0].myohassa_pv, 9); assert.match(r[0].teksti, /myöhässä 9 pv/);
});
test('jakso päättyy viimeistään eräpäivänä → ei pushia', () => {
  const p = pel({ review_viimeisin_pvm: iso(-35), review_viimeisin_tyyppi: 'jakso', jaksofokus: { konsepti_avain: 'y_h4', alkoi: iso(-35), kesto_vk: 6 } });
  assert.deepStrictEqual(rytmiNotifit([{ id: 'a', data: p }], NYT), []);
});
test('ei reviewia / yli 7 pv eräpäivään → ei pushia', () => {
  assert.deepStrictEqual(rytmiNotifit([{ id: 'a', data: pel({}) }, { id: 'b', data: pel({ review_viimeisin_pvm: iso(-20) }) }], NYT), []);
});
