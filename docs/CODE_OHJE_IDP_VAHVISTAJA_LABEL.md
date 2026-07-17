# CODE — IDP: vahvistaja-label — admin/superadmin → "VP vahvisti" (pikkukorjaus #210:een)

**Tyyppi:** Pikkukorjaus, näyttökerros (display-only). **Yksi PR** (tai lisää suoraan #210:een `fix/vahvistaja-rooli-resolve` ennen mergeä).
**Kohde:** `TalentMaster_VP_v25.html` — `_vpSitoumusHTML` labelmappaus (~rivi 4775).
**Tausta:** #210 (vahvistaja_rooli-resolveri). Live-tarkastus paljasti että resolveri tuottaa oikein ei-null-roolin, mutta osa rooliarvoista ei mappaudu näyttölabeliin.

## Miksi

#210:n resolveri toimii: se hakee roolin token-claimista (`claims.rooli`). Live-sessiossa (Tero, omistaja) claim = **`"superadmin"`** → resolveri palauttaa `"superadmin"` (ei enää null, hyvä). **Mutta** `_vpSitoumusHTML`-labelmappaus tuntee vain `'vp'` ja `'talenttivalmentaja'`; kaikki muu (ml. `superadmin`/`admin`) putoaa oletukseen **"valmentaja vahvisti"**. Eli superadmin/omistaja joka vahvistaa VP-oversightina näkyy "valmentaja vahvisti" — harhaanjohtava, ja nakertaa juuri sen tilin kokemusta joka ominaisuutta eniten testaa. Oikeat seuravalmentajat (`rooli:'valmentaja'/'vp'/'talenttivalmentaja'`) mappautuvat oikein; korjaus koskee admin/omistaja-tilejä.

## Mitä tehdään

### Labelmappaus: admin/superadmin = VP-taso
`_vpSitoumusHTML`:ssä (~rivi 4775) laajenna vahvistaja-labelin mappaus tunnistamaan pääkäyttäjä-/admin-roolit VP-tasoisiksi. Suositus: pieni jaettu apuri, jotta mappaus pysyy yhtenäisenä:

```js
function _vpVahvistajaLabel(rooli) {
  const r = (rooli || '').toLowerCase();
  if (r === 'vp' || r === 'superadmin' || r === 'sa' || r === 'admin' || r === 'paakayttaja') return 'VP vahvisti';
  if (r === 'talenttivalmentaja') return 'talenttivalmentaja vahvisti';
  return 'valmentaja vahvisti';   // 'valmentaja' + tuntematon/null → oletus (ei regressiota)
}
```
Käytä sitä nykyisen ternäärin tilalla: `const vahvTeksti = _vpVahvistajaLabel(s.vahvistaja_rooli);`

- **Raaka rooli + uid säilyvät tallennettuna** (`vahvistaja_rooli` / `vahvistaja_uid`) — audit pysyy totuudenmukaisena; vain **näyttö** normalisoi admin→VP.
- **Ei muutosta resolveriin** (#210) — se kirjaa edelleen todellisen roolin. Vain labelmappaus laajenee.

## Reunaehdot
- **Display-only:** ei kenttää/Rules/migraatiota/cache-bumppia. Vain `_vpSitoumusHTML`-label.
- **Ei regressiota:** `'vp'`/`'talenttivalmentaja'`/`'valmentaja'`/null käyttäytyvät kuten ennen; vain admin/superadmin/sa siirtyy oletuksesta "VP vahvisti":ksi.
- **Case-insensitive:** mappaus `.toLowerCase()`-normalisoi (claim voi olla "SuperAdmin"/"SUPERADMIN").
- **Pelaaja-appi ennallaan:** pelaajalle riittää yleinen "valmentaja vahvisti" (ei rooliero) — älä muuta `_p7…`-tekstiä.

## DoD
1. Superadmin/admin/sa (mistä tahansa casing) vahvistaa → label "**VP vahvisti**" (ei enää "valmentaja vahvisti"). `'vp'` myös → "VP vahvisti".
2. `'talenttivalmentaja'` → "talenttivalmentaja vahvisti"; `'valmentaja'`/tuntematon/null → "valmentaja vahvisti" (ennallaan).
3. Raaka `vahvistaja_rooli` + `vahvistaja_uid` tallentuvat edelleen muuttumattomina (audit); vain näyttö normalisoi.
4. Ei Rules/migraatio/cache-bumppia; ei regressiota (#207/#210-elinkaari ennallaan).
5. **Verifioi live (Topias):** superadmin-sessiossa vahvistus → "VP vahvisti"; 0 konsolivirhettä. Palauta Topias "odottaa"-tilaan testin jälkeen.
6. Pieni PR (tai osa #210:tä); kuvaus linkkaa #210 + tämä ohje.
