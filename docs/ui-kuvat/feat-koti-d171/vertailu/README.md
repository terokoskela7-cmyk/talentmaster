# Vertailu: mockup | toteutus (D171, Koti)

Rinnakkaiskuvat samalla leveydellä (1280 ja 390, tumma ja vaalea). Vasen = mockup (`docs/design/idp-v2/32_*`, `33_*`), oikea = toteutus (VP_v25, fixture-data).
Pareja: `pilotti_vs_m33_kaynnistys` (Käynnistys, mockup 33), `kypsa_vs_m32_kypsa` (Rytmi, joukkuekortit, mockup 32), `kypsa_vs_m33_rytmi` (Rytmi, mockup 33). Tyhjä ja kuormitus eivät ole mockupeissa: vain toteutuskuvat (`../koti_tyhja_*`, `../koti_kuormitus_*`).

## Poikkeamat mockupista ja syyt
1. **Johtolause "15:stä" kuten mockup** (elatiivi viimeisen sanan mukaan; 2/3/6/8 → -sta, koska kahdesta/kolmesta/kuudesta/kahdeksasta).
2. **Mockup 33 Rytmi (huomiokortit + rivit) ei päde** — D171 korvaa D166:n (brief voittaa): kaikki jaksolliset joukkueet ovat kortteja ikävaiheittain, kuten mockup 32.
3. **Kortti: huomiokortin pelaajamäärä** on tunnisteen alla ("12 pel."), koska oikea yläkulma on "▲ huomio" (mockup 32 näyttää kummankin eri kortissa).
4. **Jaksottoman kortin "Aloita jakso →" on tekstinä, ei nappina** (brief: ei nappeja kortin sisällä, D147); koko kortti avaa joukkueen. Mockupissa se on linkkinappi.
5. **Taukoviikko-laatikko ei lupaa "Tavoitteet ja signaalit tauolla"** (mockup lupaa) — käyttäytymistä ei ole toteutettu; näytetään vain nimi, viikot ja päivät. Taukoviikot tulevat kalenteritapahtumasta "Seuran tauko" (`seuran_tauko`); kuvissa fixturen tapahtuma.
6. **Rail: testijakso ja jaksopalaveri vain kun osuvat 14 päivän sisään** (brief). Pilotissa (testijakso +24 pv, palaveri +20 pv) niitä ei näytetä; kypsässä ne näkyvät ("6/9 varannut päivän", "7/9 valmiina").
7. **Ruudukko `repeat(auto-fill, minmax(220px,1fr))`**: pääsarakkeessa 1280 px:llä 2 korttia rivissä (mockupissa 3 kapeammalla kortilla); huomiokortin pelaajamäärä metarivillä.
8. **Pilotin Jaksolla nyt -rivillä "perheitä mukana 3/10"** (mockup: Katsaus/Käyttö-luvut) — kattavuusportti (D125, suostumus < 70 %); tuotannon sisältö säilytetty (D139).
9. **Käynnistyksen askeleen 1 ja 2 tekstit**: askeleen 1 teksti tuotannosta (ei lupausta valmentajan vahvistuksesta); askeleesta 2 poistettu "Tilanne viikolta N." (D150). Mockupin tekstit eroavat tästä.
10. **Datan sisältö** (viestit, joukkuenimet, signaalit) on fixturen, ei mockupin.
11. **Tällä viikolla -listassa ei Tekniikka/Fyysinen-rivejä** (D118 + D163).
12. **Otsikko sanalla** ("Neljä asiaa tällä viikolla.") kuten mockupin "Viisi asiaa".
