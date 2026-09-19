/**
 * ÄÄRIPALAUTE: Storage-näkyvyys PEILAA Firestorea. Valmentaja EI saa kuulla yksityistä.
 *
 * MIKSI: VP:n harjoitusarviointipalaute on kahta lajia, ja jako on jo olemassa
 * tekstille (tm_admin/firestore.rules):
 *   · palaute_jaettu      → valmentaja näkee   (onOmaSeura)
 *   · palaute_yksityinen  → vain johto/SA      ("KRIITTINEN: valmentaja ei saa lukea")
 *
 * Kun sama palaute voi olla ÄÄNTÄ, se menee Storageen — ja Storage-luku menee
 * POLUN kautta, ei Firestore-dokumentin. Jos polkujen säännöt eivät peilaa
 * Firestorea, syntyy vika joka on hiljainen ja pahempi kuin näkyvä: teksti on
 * suojattu, mutta sama arvio äänenä vuotaa valmentajalle. Mitään virhettä ei
 * tule — hän vain kuulee jotain jota ei pitänyt kuulla.
 *
 * ⚠ storage.rules EI ole CI-deployn piirissä (firebase.json:issa ei ole
 * `storage`-avainta — tietoinen päätös, deploy on erillinen tehtävä). Tämä portti
 * valvoo REPON sääntöä; live-ruleset liitetään Consolesta käsin.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (p) => readFileSync(join(juuri, p), 'utf8');
const RULES = lue('storage.rules');
const FS_RULES = lue('tm_admin/firestore.rules');
const VP = lue('TalentMaster_VP_v25.html');

const JAETTU = 'palaute_jaettu_audio';
const YKSITYINEN = 'palaute_yksityinen_audio';

/** Poimii match-lohkon sulkeita laskemalla — ei riipu seuraavan lohkon sisällöstä. */
function lohko(kansio) {
  const re = new RegExp('match /seurat/\\{sid\\}/harjoitusarvioinnit/\\{aid\\}/' + kansio + '/\\{[a-z]+\\}\\s*\\{');
  const otsikko = re.exec(RULES);
  expect(otsikko, kansio + '-lohkoa ei löytynyt storage.rulesista').not.toBeNull();
  let syvyys = 0, loppu = -1;
  const alku = otsikko.index;
  for (let j = alku + otsikko[0].length - 1; j < RULES.length; j++) {
    if (RULES[j] === '{') syvyys++;
    else if (RULES[j] === '}') { syvyys--; if (syvyys === 0) { loppu = j + 1; break; } }
  }
  expect(loppu, 'lohkon sulkeva } puuttuu').toBeGreaterThan(alku);
  return RULES.slice(alku, loppu);
}

/** Yhden allow-tyypin ehto lohkosta. */
function ehto(teksti, tyyppi) {
  const m = new RegExp('allow ' + tyyppi + ':\\s*if([\\s\\S]*?);').exec(teksti);
  expect(m, 'allow ' + tyyppi + ' puuttuu').not.toBeNull();
  return m[1];
}

/**
 * ALLOWLIST, ei denylist (#563:n opetus: denylist vaatii jokaisen vuototavan
 * ennakoimista, ja suora `token.rooli == 'vp'` meni silloin läpi vihreänä).
 * Poista ehdosta sallitut osalausekkeet ja operaattorit; jos jäljelle jää
 * tunnistemerkkejä, lohkossa on auktorisointitermi jota siellä ei kuulu olla.
 */
function jaannos(ehtoTeksti, sallitut) {
  let t = ehtoTeksti;
  for (const s of sallitut) t = t.replace(s, ' ');
  return t.replace(/[&|()[\]\s,']/g, '');
}

const YHTEISET = [
  /request\.auth != null/g,
  /onSuperAdmin\(\)/g,
  /request\.auth\.token\.seuraId == sid/g,
];
const JOHTO_ROOLIT = /request\.auth\.token\.rooli in \['vp', 'urheilutoimenjohtaja'\]/g;
const STAFF_ROOLIT = /request\.auth\.token\.rooli in \['valmentaja', 'vp', 'urheilutoimenjohtaja', 'talenttivalmentaja', 'fysiikkavalmentaja'\]/g;
const KOKO_JA_TYYPPI = [
  /request\.resource\.contentType\.matches\('audio\/\.\*'\)/g,
  /request\.resource\.size < \d+ \* 1024 \* 1024/g,
];

describe('Ääripalaute-audio · Storage peilaa Firestorea', () => {
  it('EI VACUOUS: molemmat lohkot ovat olemassa', () => {
    expect(lohko(JAETTU)).toContain('allow read');
    expect(lohko(YKSITYINEN)).toContain('allow read');
  });

  it('YKSITYINEN read: VAIN SA tai oman seuran johto — valmentaja EI (allowlist)', () => {
    /* Tämä on koko ominaisuuden yksityisyysydin. Yksikin ylimääräinen rooli- tai
       claim-termi tarkoittaisi että arvioitava kuulee mitä hänestä sanottiin
       luottamuksellisesti. */
    const j = jaannos(ehto(lohko(YKSITYINEN), 'read'), [...YHTEISET, JOHTO_ROOLIT]);
    expect(j, 'yksityisessä read-ehdossa ylimääräinen termi → ' + j).toBe('');
  });

  it('YKSITYINEN write: sama johto-ehto + audio/* + kokokatto', () => {
    const e = ehto(lohko(YKSITYINEN), 'write');
    expect(jaannos(e, [...YHTEISET, JOHTO_ROOLIT, ...KOKO_JA_TYYPPI]), 'ylimääräinen termi').toBe('');
    expect(e, 'contentType-rajaus puuttuu').toMatch(/contentType\.matches\('audio\/\.\*'\)/);
    expect(e, 'kokokatto puuttuu').toMatch(/request\.resource\.size < \d+ \* 1024 \* 1024/);
  });

  it('JAETTU read: SA tai oman seuran jäsen (valmentaja kuulee — kuten teksti)', () => {
    const j = jaannos(ehto(lohko(JAETTU), 'read'), YHTEISET);
    expect(j, 'jaetun read-ehdossa ylimääräinen termi → ' + j).toBe('');
  });

  it('JAETTU write: oman seuran staff + audio/* + kokokatto', () => {
    const e = ehto(lohko(JAETTU), 'write');
    expect(jaannos(e, [...YHTEISET, STAFF_ROOLIT, ...KOKO_JA_TYYPPI]), 'ylimääräinen termi').toBe('');
    expect(e, 'contentType-rajaus puuttuu').toMatch(/contentType\.matches\('audio\/\.\*'\)/);
    expect(e, 'kokokatto puuttuu').toMatch(/request\.resource\.size < \d+ \* 1024 \* 1024/);
  });

  it('EI VACUOUS: allowlist tunnistaa oikeat termit eikä hyväksy mitä tahansa', () => {
    /* Jos YHTEISET olisi liian väljä (osuisi kaikkeen), yllä olevat portit olisivat
       tyhjiä lupauksia. Keksitty valmentaja-ohitus EI saa siivoutua nollaan. */
    const keksitty = " request.auth != null && (onSuperAdmin() || request.auth.token.rooli == 'valmentaja')";
    expect(jaannos(keksitty, [...YHTEISET, JOHTO_ROOLIT])).not.toBe('');
  });

  it('PEILI: firestoren palaute_yksityinen sulkee valmentajan → Storage saa luvata saman', () => {
    /* Storage-sääntö väittää peilaavansa Firestorea. Jos Firestore-puoli löystyy,
       väite muuttuu vääräksi ilman että tätä tiedostoa kosketaan. Sidotaan ne. */
    const fs = FS_RULES.slice(
      FS_RULES.indexOf('match /palaute_yksityinen/'),
      FS_RULES.indexOf('match /palaute_yksityinen/') + 400,
    );
    expect(fs, 'EI VACUOUS: firestore-lohko löytyi').toContain('allow read');
    expect(fs, 'firestoren yksityinen ei enää vaadi johtoroolia').toMatch(/allow read:\s*if onSuperAdmin\(\) \|\| \(onOmaSeura\(seuraId\) && onJohtoRooli\(\)\)/);
  });

  it('KOODI: audio-kansio seuraa SAMAA valintaa kuin Firestore-kokoelma', () => {
    /* Hiljaisin mahdollinen vuoto: dokumentti menee palaute_yksityiseen mutta ääni
       jaettuun kansioon. Säännöt olisivat oikein, ja silti valmentaja kuulisi sen.
       Molempien on haarauduttava samasta `tyyppi`-muuttujasta. */
    expect(VP).toMatch(/var col = tyyppi === 'yksityinen' \? 'palaute_yksityinen' : 'palaute_jaettu';/);
    expect(VP).toMatch(/var kansioNimi = tyyppi === 'yksityinen' \? 'palaute_yksityinen_audio' : 'palaute_jaettu_audio';/);
  });

  it('KOODI: VP käyttää jaettua nauhoitinydintä, ei omaa toteutusta', () => {
    expect(VP, 'VP ei lataa tm_aania').toMatch(/<script src="lib\/tm_aani\.js\?v=\d+"><\/script>/);
    expect(VP, 'VP ei luo nauhoitinta libistä').toContain('tmAani.luo(');
  });
});
