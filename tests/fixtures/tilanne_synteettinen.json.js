/* Synteettinen tilanne kaavio-muunnoksen testeihin. EI oikeaa dataa (repo on julkinen):
   ei Metricaa (lisenssi: vain sisäinen kehitys), ei omien klippien dataa (alaikäisten sijainnit).
   Skenaario (oma puolustaa vasenta = hyökkää +x):
     O1 keskittää laidalta (x 40, y −20) hetkellä 0,0 → pallo lentää 0,9 s → O2 puskee (x 46, y 1).
     V1 (puolustaja) on puskussa 0,3 m pallosta samaan aikaan kuin O2 → 2D:stä kumpaa tahansa.
     V2 = maalivahti. T1 = erotuomari. O3 näkyy vain hetkestä 1,5 → ei mukana hetkellä 0. */
function linja(x0, y0, x1, y1, t0, t1, hz) {
  const n = Math.round((t1 - t0) * hz), o = [];
  for (let i = 0; i <= n; i++) { const k = i / n; o.push({ t: +(t0 + k * (t1 - t0)).toFixed(3), x: +(x0 + k * (x1 - x0)).toFixed(2), y: +(y0 + k * (y1 - y0)).toFixed(2) }); }
  return o;
}
const pallo = [].concat(
  linja(40, -20, 46.2, 1.2, 0, 0.9, 25),          // keskitys
  linja(46.4, 1.0, 52.6, -1.0, 0.94, 1.3, 25)     // pusku kohti maalia (suunta kääntyy)
);
module.exports = {
  kentta: { pituus_m: 105, leveys_m: 68 }, suunta: { omaPuolustaa: 'vasen' }, pelimuoto: '11v11',
  hz: { pelaajat: 25, pallo: 25 },
  pelaajat: [
    { tunniste: 1, joukkue: 'oma', rooli: 'pelaaja', tarkkuus_m: 0.3, polku: linja(40, -20, 41, -19, 0, 2.5, 25) },
    { tunniste: 2, joukkue: 'oma', rooli: 'pelaaja', tarkkuus_m: 0.3, polku: linja(42, 4, 46.3, 1.1, 0, 0.9, 25).concat(linja(46.3, 1.1, 47, 0, 0.94, 2.5, 25)) },
    { tunniste: 3, joukkue: 'oma', rooli: 'pelaaja', tarkkuus_m: 0.4, polku: linja(30, 10, 34, 10, 1.5, 2.5, 25) },
    { tunniste: 11, joukkue: 'vast', rooli: 'pelaaja', tarkkuus_m: 0.3, polku: linja(45, 3, 46.2, 1.3, 0, 0.9, 25).concat(linja(46.2, 1.3, 46.5, 1.5, 0.94, 2.5, 25)) },
    { tunniste: 12, joukkue: 'vast', rooli: 'mv', tarkkuus_m: 0.5, polku: linja(51, 0, 51, -1, 0, 2.5, 25) },
    { tunniste: 21, joukkue: 'tuomari', rooli: 'pelaaja', tarkkuus_m: 0.5, polku: linja(20, -5, 25, -5, 0, 2.5, 25) },
    { tunniste: 13, joukkue: 'vast', rooli: 'pelaaja', tarkkuus_m: 3.5, polku: linja(30, -30, 31, -30, 0, 2.5, 25) }
  ],
  pallo: pallo,
  tapahtumat: [
    { t: 0.0, tyyppi: 'syotto', tekija: 1, kohde: 2, lahde: 'valmentaja' },
    { t: 0.94, tyyppi: 'laukaus', tekija: 2, kohde: null, lahde: 'valmentaja' }
  ]
};
