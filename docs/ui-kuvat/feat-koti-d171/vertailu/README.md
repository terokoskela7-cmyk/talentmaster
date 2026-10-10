# Vertailu: mockup | toteutus (D171, Koti)

Rinnakkaiskuvat samalla leveydellä (1280 ja 390, tumma ja vaalea). Vasen = mockup (`docs/design/idp-v2/32_*`, `33_*`), oikea = toteutus (VP_v25, fixture-data).
Pareja: `pilotti_vs_m33_kaynnistys` (Käynnistys, mockup 33), `kypsa_vs_m32_kypsa` (Rytmi, joukkuekortit, mockup 32), `kypsa_vs_m33_rytmi` (Rytmi, mockup 33). Tyhjä ja kuormitus eivät ole mockupeissa: vain toteutuskuvat (`../koti_tyhja_*`, `../koti_kuormitus_*`).

## Poikkeamat mockupista ja syyt
1. **Johtolauseen pääte "15:sta" (mockup "15:stä").** Elatiivin pääte noudattaa lausuttua lukua (viidestätoista → -sta); apuri `johtolause`/`elatiivi` käsittelee kaikki luvut. Brief antoi esimerkin "15:stä" — vaihdettavissa yhdestä funktiosta.
2. **Mockup 33 Rytmi (huomiokortit + rivit) ei päde** — D171 korvaa D166:n (brief voittaa): kaikki jaksolliset joukkueet ovat kortteja ikävaiheittain, kuten mockup 32.
3. **Kortti: huomiokortin pelaajamäärä** on tunnisteen alla ("12 pel."), koska oikea yläkulma on "▲ huomio" (mockup 32 näyttää kummankin eri kortissa).
4. **Jaksottoman kortin "Aloita jakso →" on tekstinä, ei nappina** (brief: ei nappeja kortin sisällä, D147); koko kortti avaa joukkueen. Mockupissa se on linkkinappi.
5. **Taukoviikko-laatikko ei lupaa "Tavoitteet ja signaalit tauolla"** (mockup lupaa) — käyttäytymistä ei ole toteutettu; näytetään vain nimi, viikot ja päivät. Taukoviikoille ei vielä ole datalähdettä (syöte `env.tauot` / kalenteritapahtuma tyyppiä tauko/loma; kuvissa fixturen kalenteritapahtuma `loma`).
6. **Rail: testijakso ja jaksopalaveri vain kun osuvat 14 päivän sisään** (brief). Pilotissa (testijakso +24 pv, palaveri +20 pv) niitä ei näytetä; kypsässä ne näkyvät ("6/9 varannut päivän", "7/9 valmiina").
7. **Leveä näkymä 1280: 3 korttia rivissä** pääsarakkeessa (kapeampi kuin mockupin 770 px, joten kortit ovat ~190 px); mockup näyttää 3 korttia 210–240 px:llä, koska sen rail on kapeampi osuus.
8. **Pilotin Jaksolla nyt -rivillä "perheitä mukana 3/10"** (mockup: Katsaus/Käyttö-luvut) — kattavuusportti (D125, suostumus < 70 %); tuotannon sisältö säilytetty (D139).
9. **Käynnistyksen askeleen 1 ja 2 tekstit**: askeleen 1 teksti tuotannosta (ei lupausta valmentajan vahvistuksesta); askeleesta 2 poistettu "Tilanne viikolta N." (D150). Mockupin tekstit eroavat tästä.
10. **Datan sisältö** (viestit, joukkuenimet, signaalit) on fixturen, ei mockupin.
