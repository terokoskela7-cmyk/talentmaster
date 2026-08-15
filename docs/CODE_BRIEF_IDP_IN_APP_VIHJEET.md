# IDP in-app-vihjeet: kontekstuaaliset ⓘ-vihjeet IDP-flow'hun (Oura tap-behind) · Code-brief

> **Miksi (Teron pyyntö):** Tehtiin ihmisille erillinen HTML-ohje (IDP-kortti: näin se täydentyy). Nyt haluamme **samat vihjeet
> appiin** — kevyet kontekstuaaliset ohjeet suoraan IDP-flow'hun, jotta VP/valmentaja ei tarvitse erillistä opasta täyttääkseen
> kortin oikein. **Tyyli = Oura tap-behind:** ⓘ-affordanssi joka avaa lyhyen vihjeen napautuksesta — EI aina-näkyvää tekstiä,
> EI ruudun täyttämistä, EI teal-spämmiä. Sama rauhallinen periaate kuin nykyinen Arvioinnin `_jspArvSelit` (display:none → ⓘ auki)
> ja Viikon `_vpViikkoLahteetHTML` (mokknote ⓘ-tapin takana).
> **Yksi totuuslähde:** vihjetekstit **samassa rekisterissä**, jotta ne pysyvät linjassa HTML-ohjeen kanssa (ei kopioita hajallaan).
> **Koskee `TalentMaster_VP_v25.html`** (IDP-modaalin flow). **Ei uutta kokoelmaa. Ei `?v`.** Ei Firestore-kirjoituksia (pelkkä UI).

## CODE-SÄÄNNÖT (protokolla)
- **Poikkeama = ilmoita ENNEN.** Reuse yli reimplementoinnin: käytä olemassa olevaa tap-behind-reveal-kuviota (`_jspArvSelit` /
  `_vpViikkoLahteetHTML` -tyyli) ja `TM_TESTI_OHJEET`-tyylistä rekisteriä. **Älä koske:** tavoite-/jaksofokus-/viikko-logiikkaan,
  Firestore-kirjoituksiin, morfosykliin, ACWR:ään, arviointilaskentaan. **Vain lisätään ⓘ-vihjeitä olemassa olevien osioiden viereen.**
- **Brändi §5 (Oura):** teal vain hienovarainen aksentti · ⓘ neutraali (ink3) · vihjepaneeli himmeä surface · **0 pinkkiä** · ei uutta väriä.
- **§7.22/GDPR:** vihjeet eivät paljasta pelaajalle piilotettua (kuorma/ACWR/tasoluvut). Vihjeet ovat **valmentajan/VP:n** näkymässä.

---

## MUUTOS 1 — vihjerekisteri `TM_IDP_VIHJEET` (yksi totuuslähde)

Lisää moduulitason objekti (lähelle muita ohjeistuksia, esim. `TM_TESTI_OHJEET`:n viereen). Avain → lyhyt vihje:
```
const TM_IDP_VIHJEET = {
  aloitus:      { otsikko:'Aloitus = tarina, ei muokkaus', teksti:'Yhteenveto: kausitavoite, jaksofokus ja kaari yhtenä kertomuksena. Muokkaus tapahtuu Kehitys-välilehdellä — napit vievät sinne.' },
  arviointi_silta:{ otsikko:'Arvo ≤ 2 → IDP-silta', teksti:'Kun arvioit ominaisuuden 1–2, syttyy ＋ IDP-tavoite. Se ehdottaa jaksofokusta suoraan havainnosta. Kolme lähdettä (🟢 mitattu · 🔵 havaittu · 👁 pelihavainto) pidetään erillään.' },
  kausitavoite: { otsikko:'Kausitavoite — VP omistaa', teksti:'Yksi suunta kaudelle. Tyyppi: heikkous / vahvuus / pelipaikka. Tila: ○ Ehdotettu → ● Aktiivinen → ✓ Saavutettu. SMART-mittari on valinnainen — tavoite toimii ilmankin.' },
  jaksofokus:   { otsikko:'Jaksofokus näkyy pelaajalle', teksti:'Valitse domeeni (🏃/⚽/🧠/🤝) → konsepti → cue (kysymys, ei käsky) → kesto. Tämä kääntyy pelaajan appiin "Minä ja pallo" -fokukseksi lapsen kielellä. Domeenin vaihto arkistoi vanhan jakson.' },
  jf_tavoitteet:{ otsikko:'Pääfokus + tuki (max 4)', teksti:'Yksi pääfokus, loput tukea. Kullekin "✓ Opittu kun" = havaittava kriteeri. Mittaus joko 🔗 Arviointi (taso Arvioinnista) tai 📐 numeerinen.' },
  viikko_tayta: { otsikko:'Viikko kannetaan jaksofokuksesta', teksti:'✨ Täytä viikko ehdottaa viikon jaksofokuksesta + joukkueen aikataulusta. Päivät ovat ottelusuhteisia (MD, MD−1…). Ilman jaksofokusta viikko on tyhjä — aseta se ensin Kehityksessä.' },
  viikko_kuorma:{ otsikko:'Kuorma = valmentajan työkalu', teksti:'Päivän kuorma summautuu kaikista sessioista (joukkue + pelaajan oma app-kirjaus). ACWR kertyy ~4 vk. Pelaaja ei näe kuormaa/ACWR:ää (§7.22) — vain oman rasituksensa.' },
  oma_teema:    { otsikko:'Oma teema → kalenteriin', teksti:'Vie oma/muun domeenin teema kalenteriin (kohde 👤 pelaajalle tai 👥 joukkueelle). Näkyy heti pelaajan "Seuran aikataulu" -listalla + Viikossa. Läsnäolo kiinnittyy tapahtumaan.' }
};
```
- **Sisältö = tiivistys HTML-ohjeesta** (sama sanasto: "Opittu kun", "kannettu jaksofokuksesta", §7.22). Pidä ≤ ~240 merkkiä / vihje.
- **Ei linkkejä ulos** (ei URL:eja modaalissa). Halutessa myöhemmin: `linkki_tab`-kenttä joka kutsuu `_jspVaihda(n)` — **EI tässä** ellei triviaali.

## MUUTOS 2 — uudelleenkäytettävä ⓘ-affordanssi `_idpVihje(avain)`

Yksi pieni funktio joka tuottaa **napautuksesta avautuvan** vihjeen (tap-behind), reuse olemassa olevaa reveal-kuviota:
```
function _idpVihje(avain) {
  const v = TM_IDP_VIHJEET[avain]; if (!v) return '';
  const id = '_idpvih_' + avain;
  return '<span class="idp-vihje">'
    + '<button type="button" class="idp-vihje-nap" aria-label="Vihje" onclick="event.stopPropagation();_idpVihjeToggle(\'' + id + '\')">ⓘ</button>'
    + '<span id="' + id + '" class="idp-vihje-panel" style="display:none">'
    +   '<strong>' + _jsvEsc(v.otsikko) + '</strong> ' + _jsvEsc(v.teksti)
    + '</span></span>';
}
```
- **Toggle** `_idpVihjeToggle(id)`: näytä/piilota paneeli (sama logiikka kuin nykyiset reveal-togglet; ei uutta kirjastoa).
- **Tyyli (Oura):** ⓘ-nappi `var(--ink3)`, ei taustaa, ~13px. Paneeli: himmeä `surface`/`--ov-1`, hiusviivareuna, mono/sans-leipä `var(--ink2)`, terävät kulmat, **ei teal-täyttöä** (korkeintaan teal `strong`-otsikko hyvin hillittynä). Piiloon uudelleen­napautuksella. Mobiili: paneeli asettuu ⓘ:n alle, ei leikkaudu modaalin reunaan.
- **A11y:** `aria-label="Vihje"`, `aria-expanded` togglaa. Ei alert()/dialog (blokkaa laajennuksen).

## MUUTOS 3 — ankkuripisteet (ⓘ olemassa olevien otsikoiden viereen)

Lisää `_idpVihje('<avain>')` **osioiden eyebrow-/otsikkorivien perään** — ei uusia laatikoita, vain ⓘ olemassa olevan otsikon viereen:

| Sijainti (funktio) | Otsikko jonka viereen | Avain |
|---|---|---|
| `_vpIdpNarratiiviHTML` (Aloitus) | narratiivin yläotsikko | `aloitus` |
| `_vpArviointiHTML` (Arviointi) | "Arviointi · havainto-kehys" tai silta-paneeli "🎯 Ehdota jaksofokus" | `arviointi_silta` |
| `_vpKausitavoiteHTML` (TASO 1) | "🎯 Kausitavoite" -otsikko | `kausitavoite` |
| jaksofokus-domeenitoggle `_vpJfToggleHTML` | "Domeeni · mitä jakso kehittää" | `jaksofokus` |
| `_vpJfLinkitHTML` (A/B/C) | "Tavoitteet · pääfokus + tuki (max 4)…" | `jf_tavoitteet` |
| `_vpViikkoHTML` otsikkorivi | "Viikon rakenne · morfosykli" / ✨ Täytä viikko | `viikko_tayta` |
| `_vpViikkoKuormaHTML` | "KUORMA · VIIKKO + §28" -otsikko | `viikko_kuorma` |
| `_vpViikkoOmaTeemaHTML` | "＋ Oma teema / muu domeeni → kalenteriin" | `oma_teema` |

- **Vain ⓘ, ei aina-näkyvää tekstiä** → näkymä pysyy rauhallisena (KISS/Oura). Oletuksena kaikki paneelit kiinni.
- **Älä muuta** osioiden sisältöä/logiikkaa — vain lisää ⓘ otsikkomarkupin loppuun.

---

## INVARIANTIT + DoD
- **Yksi totuuslähde:** kaikki vihjetekstit `TM_IDP_VIHJEET`:ssä (helppo pitää linjassa HTML-ohjeen kanssa). Ei kopioitua tekstiä osiokohtaisesti.
- **Oura/brändi §5:** ⓘ neutraali (ink3), paneeli himmeä + hiusviiva + terävät kulmat, **0 pinkkiä**, ei uutta väriä, ei aina-näkyvää selitetekstiä. Molemmat teemat (dark/light) renderöityvät.
- **Ei sivuvaikutuksia:** pelkkä UI-toggle, **ei Firestore-kirjoituksia**, ei `luotu`/pikakenttä­muutoksia. §7.22/GDPR ennallaan (vihjeet valmentajan näkymässä, eivät paljasta pelaajalle piilotettua).
- **Ei regressiota:** IDP-modaalin välilehtien vaihto (`_jspVaihda`), tavoite/jaksofokus/viikko-toiminnot ennallaan. ⓘ ei sieppaa napautuksia päärivin editointiin (`event.stopPropagation`). Vitest + eslint vihreä. Ei `?v` (VP).
- **LIVE ennen valmista (molemmat teemat):**
  - Avaa IDP-modaali → jokaisen 8 ankkurin ⓘ näkyy otsikon vieressä, oletuksena kiinni.
  - Napauta ⓘ → lyhyt vihje aukeaa tap-behind; uudelleennapautus sulkee; ⓘ ei laukaise rivin editointia.
  - Mobiilileveys: paneeli ei leikkaudu modaalin reunaan.
  - Regressio: Aloitus/Arviointi/Kehitys/Viikko toimivat kuten ennen; 0 pinkkiä; teal vain hillitty aksentti.

## EI TÄSSÄ (mahdollinen jatko)
- **Kertaluontoinen coach-mark-kierros** (ensimmäisellä avauksella ohjattu 1-2-3-osoitin) — isompi UX, oma briiffi jos halutaan.
- **Pelaajan/perheen app-vihjeet** — pelaajan appi on jo lapsen kielellä; erilliset mikrо-vihjeet siihen erikseen jos tarve.
- **Linkki HTML-ohjeeseen modaalista** (esim. "📖 Koko ohje") — vaatii hostatun URL:n; päätetään erikseen.
