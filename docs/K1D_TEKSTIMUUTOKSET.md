# K1d — muutetut tekstit (vanha → uusi)

Generoitu `tests/fixtures/k1d_fi_korvaukset.json` + `tests/fixtures/k1d_lib_muutokset.json` + erä 80 -tiedostosta (`docs/i18n/sv_kaannoserae_80_gemini.json`). Sisäiset kentät, funktiot ja avaimet eivät muutu — vain käyttäjälle näkyvät tekstit (fi). Ruotsi: erä 80 (Gemini); vanha sv säilyy koodissa (`sv_nyt`) kunnes erä viedään.

## 1. Suomenkieliset tekstit sovelluksissa (154 riviä)
Kuori / lib = tiedosto jossa teksti esiintyy (VP_v25, Master_v16, vp_koti, …). Samat tekstit ovat fi-avaimina vpT/masterT-kartoissa — avaimen muutos säilytti vanhan sv:n.

| Vanha | Uusi | Missä |
|---|---|---|
| = virallinen <strong>arviointikehys</strong> (D1–D5-taksonomia + havaittu-arvio 1–5).<br><strong>◆ TalentMaster Analytics</strong> = älykerros kortin päällä: <strong>mittaus</strong> (TM-testit 🟢), <strong>pelihavainto</strong> (👁 ADAR), IDP-kehityssuunnitelma, | = virallinen <strong>arviointikehys</strong> (D1–D5-taksonomia + havaittu-arvio 1–5).<br><strong>◆ TalentMaster Analytics</strong> = älykerros kortin päällä: <strong>mittaus</strong> (TM-testit 🟢), <strong>pelihavainto</strong> (👁 ADAR), kehityssuunnitelma, | VP_v25, tm_vp_i18n |
| {lista}: jakso päättyy vk {vk}. Katselmus vie noin 10 minuuttia: kolme kysymystä ja yksi lause. | {lista}: jakso päättyy vk {vk}. Jakson yhteenveto vie noin 10 minuuttia: kolme kysymystä ja yksi lause. | tm_vp_tilanne |
| Katselmus-cockpit · EPPP-rytmi ≥12 v 6 vk · 9–11 v 12 vk · avaa katselmus jakson sulkuun | Yhteenvedot ja keskustelut · EPPP-rytmi ≥12 v 6 vk · 9–11 v 12 vk · tee jakson yhteenveto | VP_v25, tm_vp_i18n |
| Kehityskaari näkyy kun tavoite on asetettu ja reviewejä kertyy (avaa cockpitissa). | Kehityskaari näkyy kun tavoite on asetettu ja kehityskeskusteluja kertyy (avaa pelaajakortissa). | VP_v25, tm_vp_i18n |
| tulee ensimmäisestä reviewistä — silta ehdottaa fokuksen testituloksista. | tulee ensimmäisestä yhteenvedosta — silta ehdottaa fokuksen testituloksista. | VP_v25, tm_vp_i18n |
| nostoehdokasta odottaa IDP-ehdotusta. Alla asiat joihin voit tarttua. | nostoehdokasta odottaa kehityssuunnitelman ehdotusta. Alla asiat joihin voit tarttua. | VP_v25, tm_vp_i18n |
| Historia täyttyy kun tavoitteita reviewataan ja jaksoja suljetaan. | Historia täyttyy kun kehityskeskusteluja pidetään ja jaksojen yhteenvetoja tehdään. | tm_vp_i18n |
| ei kliinistä dataa katselmukseen (GDPR Art. 9, terveys/ erillään) | ei kliinistä dataa jakson yhteenvetoon (GDPR Art. 9, terveys/ erillään) | VP_v25, tm_vp_i18n |
| Jakso antaa joukkueelle teeman, viikkotavoitteet ja katselmuksen. | Jakso antaa joukkueelle teeman, viikkotavoitteet ja jakson yhteenvedon. | tm_vp_koti |
| Päätös tai seurantamuistiinpano (tallentuu review-merkintään)... | Päätös tai seurantamuistiinpano (tallentuu kehityskeskustelun merkintään)... | VP_v25, tm_vp_i18n |
| IDP-hyväksyntäkriteerit, X-Factor- ja Hidden Gem -kynnysarvot. | Kehityssuunnitelman hyväksyntäkriteerit, X-Factor- ja Hidden Gem -kynnysarvot. | VP_v25, tm_vp_i18n |
| Kaari kertyy reviewistä — täysi kaari Kehitys-välilehdellä. | Kaari kertyy kehityskeskusteluista — täysi kaari Kehitys-välilehdellä. | VP_v25, tm_vp_i18n |
| Seuranta — katselmusrytmi + jakson sulku (EPPP-työnkulku) | Seuranta — yhteenvetorytmi + jakson yhteenveto (EPPP-työnkulku) | VP_v25, tm_vp_i18n |
| Hidden Gem · X-Factor · IDP-jono · Kehon valmius -jakauma | Hidden Gem · X-Factor · Kehityssuunnitelmajono · Kehon valmius -jakauma | VP_v25, tm_vp_i18n |
| Strateginen kauden tavoite (IDP-makro) sovitaan yhdessä | Strateginen kauden tavoite (kehityssuunnitelma) sovitaan yhdessä | VP_v25, tm_vp_i18n |
| Kevyt katselmus riittää: kolme kysymystä ja yksi lause. | Jakson yhteenveto riittää: kolme kysymystä ja yksi lause. | tm_vp_koti |
| Reviewit ajan tasalla — ei kiireellisiä toimenpiteitä. | Yhteenvedot ja keskustelut ajan tasalla — ei kiireellisiä toimenpiteitä. | VP_v25, tm_vp_i18n |
| Katselmusikkuna: 2 viikkoa jakson päättymispäivästä. | Yhteenvetoikkuna: 2 viikkoa jakson päättymispäivästä. | tm_joukkuejakso |
| Jaksopalaveriin {pvm} on vielä auki {n} katselmusta. | Jaksopalaveriin {pvm} on vielä auki {n} jakson yhteenvetoa. | tm_vp_tilanne |
| IDP ehdotettu — odottaa VP:n hyväksyntää (idp_jono) | Kehityssuunnitelma ehdotettu — odottaa VP:n hyväksyntää | VP_v25, tm_vp_i18n |
| Luo IDP-kehitystavoite tästä havainnosta (arvo ≤ 2) | Luo kehityssuunnitelman tavoite tästä havainnosta (arvo ≤ 2) | VP_v25, tm_vp_i18n |
| IDP-tavoite luotu havainnosta — tarkista ja hyväksy | Kehityssuunnitelman tavoite luotu havainnosta — tarkista ja hyväksy | VP_v25, tm_vp_i18n |
| Jaksopalaveriin {pvm} on vielä auki yksi katselmus. | Jaksopalaveriin {pvm} on vielä auki yksi jakson yhteenveto. | tm_vp_tilanne |
| 🟠 Jakso umpeutunut · Sulje jakso → seuraava fokus | 🟠 Jakso umpeutunut · Tee jakson yhteenveto → seuraava fokus | Master_v16, tm_master_i18n |
| Talentti — käynnistä talentti-IDP pelaajakortista | Talentti — käynnistä talentin kehityssuunnitelma pelaajakortista | VP_v25, tm_vp_i18n |
| oversight-signaali · vaikuttaa review-terveyteen | valvontasignaali · vaikuttaa yhteenvetojen ja keskustelujen ajantasaisuuteen | VP_v25, tm_vp_i18n |
| IDP aktiivinen — kehityssuunnitelma käynnissä | Kehityssuunnitelma aktiivinen — käynnissä | VP_v25, tm_vp_i18n |
| Vastauksesi näkyy valmentajan katselmuksessa. | Vastauksesi näkyy valmentajan jakson yhteenvedossa. | tm_viikkokatsaus |
| vaativat kehityskeskustelun (Review-cockpit) | vaativat kehityskeskustelun | VP_v25, tm_vp_i18n |
| Katselmusikkuna sulkeutuu {pv} päivän päästä | Yhteenvetoikkuna sulkeutuu {pv} päivän päästä | tm_vp_koti, tm_vp_koti_joukkueet |
| Vahvuuden jalostus (IDP-tavoite vahvuuteen) | Vahvuuden jalostus (kehityssuunnitelman tavoite vahvuuteen) | tm_kehitystilanne |
| omistaa oman joukkueensa pelaajien IDP:t — | omistaa oman joukkueensa pelaajien kehityssuunnitelmat — | VP_v25, tm_vp_i18n |
| Seuranta · katselmusrytmi ja jakson sulku | Seuranta · yhteenvetorytmi ja jakson yhteenveto | VP_v25, tm_vp_i18n |
| Kuka omistaa kehityssuunnitelman (IDP)? | Kuka omistaa kehityssuunnitelman? | VP_v25, tm_vp_i18n |
| Ei mitattavaa — kvalitatiivinen review | Ei mitattavaa — kvalitatiivinen kehityskeskustelu | VP_v25, Master_v16, tm_master_i18n, tm_vp_i18n |
| Seuraava IDP-katselmus: jakson lopussa | Seuraava yhteenveto tai kehityskeskustelu: jakson lopussa | VP_v25, tm_vp_i18n |
| {n} joukkueen katselmusikkuna on auki. | {n} joukkueen yhteenvetoikkuna on auki. | tm_vp_koti |
| jakso käynnissä, katselmukset ajallaan | jakso käynnissä, yhteenvedot ajallaan | tm_kt_komponentit |
| IDP-kattavuus (vähintään yksi tavoite) | Kehityssuunnitelmien kattavuus (vähintään yksi tavoite) | tm_kehitystilanne |
|  — voi jäädä tyhjäksi (fiilis-review) |  — voi jäädä tyhjäksi (pelkkä fiilis riittää) | tm_master_i18n |
| (VAI+ · hälytykset · IDP-aktivoinnit) | (VAI+ · hälytykset · kehityssuunnitelmien aktivoinnit) | VP_v25, tm_vp_i18n |
| IDP aktivoitu — DIAG-ketju fokukseen. | Kauden tavoite asetettu — DIAG-ketju fokukseen. | Pelaaja_v7 |
| {n} katselmusta auki ennen palaveria. | {n} jakson yhteenvetoa auki ennen palaveria. | tm_vp_tilanne |
| — voi jäädä tyhjäksi (fiilis-review) | — voi jäädä tyhjäksi (pelkkä fiilis riittää) | VP_v25, Master_v16, tm_master_i18n, tm_vp_i18n |
| Yksi katselmus auki ennen palaveria. | Yksi jakson yhteenveto auki ennen palaveria. | tm_vp_tilanne |
| Esityslistan liitteet · Raportointi | Esityslistan liitteet · Seuran tilannekuva | VP_v25, tm_vp_i18n |
| Odottaa hyväksyntää — avaa IDP-jono | Odottaa hyväksyntää — avaa kehityssuunnitelmajono | VP_v25, tm_vp_i18n |
| IDP-jono — avaa Pelaajat-välilehti | Kehityssuunnitelmajono — avaa Pelaajat-välilehti | VP_v25, tm_vp_i18n |
| Kaikki katselmukset ovat valmiina. | Kaikki jakson yhteenvedot ovat valmiina. | tm_vp_tilanne |
| jakso kesken tai katselmus odottaa | jakso kesken tai yhteenveto odottaa | tm_kt_komponentit |
| IDP-ehdotusta odottaa hyväksyntää | kehityssuunnitelmaehdotusta odottaa hyväksyntää | VP_v25, tm_vp_i18n |
| {n} pelaajan katselmus tekemättä. | {n} pelaajan jakson yhteenveto tekemättä. | tm_vp_koti |
| — omistat reviewin, VP kalibroi | — omistat kehityskeskustelun, VP kalibroi | VP_v25, tm_vp_i18n |
| IDP-jono — odottaa hyväksyntää | Kehityssuunnitelmajono — odottaa hyväksyntää | VP_v25, tm_vp_i18n |
| pelaajaa myöhässä reviewistä → | pelaajaa myöhässä yhteenvedosta tai keskustelusta → | VP_v25, tm_vp_i18n |
| Tavoitejakauma · sessiot → IDP | Tavoitejakauma · sessiot → Kehityssuunnitelma | VP_v25, tm_vp_i18n |
| oranssi ＋ IDP-tavoite -pilleri | oranssi ＋ Kehityssuunnitelman tavoite -pilleri | VP_v25, tm_vp_i18n |
| IDP · roolit (valmentaja / VP) | Kehityssuunnitelma · roolit (valmentaja / VP) | VP_v25, tm_vp_i18n |
| Sulje jakso ja tarjoa valinta | Tee jakson yhteenveto ja tarjoa valinta | tm_reitin_valinta |
| ja koostuu IDP-katselmukseen. | ja koostuu kehityskeskusteluun. | VP_v25, tm_vp_i18n |
| Käynnistä IDP pelaajakortista | Käynnistä kehityssuunnitelma pelaajakortista | VP_v25, tm_vp_i18n |
| Ovatko katselmukset ajallaan? | Ovatko jakson yhteenvedot ajallaan? | tm_vp_tilanne |
| Sulje jakso → seuraava fokus | Tee jakson yhteenveto → seuraava fokus | VP_v25, Master_v16, tm_master_i18n, tm_vp_i18n |
| Ei tuoreita IDP-aktivointeja | Ei tuoreita kehityssuunnitelmien aktivointeja | VP_v25, tm_vp_i18n |
| Ei vielä kirjattua reviewia. | Ei vielä kirjattua yhteenvetoa tai kehityskeskustelua. | VP_v25, tm_vp_i18n |
| Ei odottavia IDP-ehdotuksia | Ei odottavia kehityssuunnitelmaehdotuksia | VP_v25, tm_vp_i18n |
| Kehityskaari — review-sykli | Kehityskaari — kehityskeskustelujen sykli | Master_v16, tm_master_i18n, tm_vp_i18n |
| VP vahvisti IDP-näkemyksesi | VP vahvisti kehityssuunnitelmaa koskevan näkemyksesi | Master_v16, tm_master_i18n |
| ✓ Review merkitty tehdyksi | ✓ Kehityskeskustelu merkitty tehdyksi | VP_v25, tm_vp_i18n |
| ✓ Merkitse review tehdyksi | ✓ Merkitse kehityskeskustelu tehdyksi | VP_v25, tm_vp_i18n |
| Odottaako IDP vahvistusta? | Odottaako kehityssuunnitelma vahvistusta? | tm_vp_tilanne |
| 📅 Viikko · IDP:n toteutus | 📅 Viikko · Kehityssuunnitelman toteutus | tm_vp_i18n |
| Kaikki katselmukset tehty. | Kaikki jakson yhteenvedot tehty. | tm_vp_tilanne |
| <tr><td>IDP-kattavuus</td> | <tr><td>Kehityssuunnitelmien kattavuus</td> | tm_kehitystilanne |
| Syvennä (täysi katselmus) | Kehityskeskustelu | tm_aloita_jakso, tm_kevyt_katselmus, tm_kt_arviointi, tm_master_i18n |
| {n} katselmusta tekemättä | {n} jakson yhteenvetoa tekemättä | tm_vp_koti |
| lähtötaso katselmuksessa | lähtötaso kehityskeskustelussa | VP_v25, tm_vp_i18n |
| IDP-silta · ＋IDP-tavoite | Kehityssuunnitelma-silta · ＋Tavoite | VP_v25, tm_vp_i18n |
| Merkitse review tehdyksi | Merkitse kehityskeskustelu tehdyksi | VP_v25, tm_vp_i18n |
| Nelikulma · MDT-domeenit | Nelikulma · kehityskeskustelun alueet | VP_v25, tm_vp_i18n |
| Kevyt katselmus riittää. | Jakson yhteenveto riittää. | tm_vp_koti |
| Katselmusikkuna on auki | Yhteenvetoikkuna on auki | tm_vp_koti, tm_vp_koti_joukkueet |
| Jaksot ja katselmukset | Jaksot ja jakson yhteenvedot | tm_vp_tilanne |
| <th>IDP-kattavuus</th> | <th>Kehityssuunnitelmien kattavuus</th> | tm_kehitystilanne |
| Sulje jakso ja lähetä | Tee jakson yhteenveto ja lähetä | tm_kevyt_katselmus |
| Sulje jakso lauseella | Tee jakson yhteenveto lauseella | tm_vp_koti |
| Reviewit ajan tasalla | Yhteenvedot ja keskustelut ajan tasalla | tm_eerikkila_normit, tm_vp_i18n |
| arvio katselmuksessa | arvio kehityskeskustelussa | VP_v25, tm_vp_i18n |
| Seuraava katselmus ~ | Seuraava yhteenveto tai kehityskeskustelu ~ | VP_v25, tm_vp_i18n |
| päättyy. Katselmus = | päättyy. Jakson yhteenveto = | VP_v25, tm_vp_i18n |
| VP · IDP vahvistettu | VP · Kehityssuunnitelma vahvistettu | Master_v16, tm_master_i18n |
| VP · IDP kalibrointi | VP · Kehityssuunnitelman kalibrointi | Master_v16, tm_master_i18n |
| Katselmusikkuna auki | Yhteenvetoikkuna auki | tm_vp_koti |
| 📋 IDP-aktivoinnit  | 📋 Kehityssuunnitelmien aktivoinnit  | VP_v25, tm_vp_i18n |
| Review ajan tasalla | Yhteenveto ajan tasalla | VP_v25, tm_vp_i18n |
| Review erääntymässä | Yhteenveto erääntymässä | VP_v25, tm_vp_i18n |
| IDP-hyväksyntäjono | Kehityssuunnitelmien hyväksyntäjono | VP_v25, tm_vp_i18n |
| Hylkää IDP-ehdotus | Hylkää kehityssuunnitelmaehdotus | VP_v25, tm_vp_i18n |
| Seuraava katselmus | Seuraava yhteenveto tai kehityskeskustelu | VP_v25, tm_vp_i18n |
| Havainnoi → review | Havainnoi → kehityskeskustelu | Master_v16, tm_master_i18n |
| 📋 IDP-aktivoinnit | 📋 Kehityssuunnitelmien aktivoinnit | tm_vp_i18n |
| {n} katselmus auki | {n} jakson yhteenveto auki | tm_vp_tilanne |
| Katselmus erääntyy | Jakson yhteenveto tai kehityskeskustelu erääntyy | tm_vp_i18n |
| Katselmuksen aika | Kehityskeskustelun aika | VP_v25, tm_vp_i18n |
| ✓ Review merkitty | ✓ Kehityskeskustelu merkitty | VP_v25, tm_vp_i18n |
| Ei reviewia vielä | Ei yhteenvetoa vielä | VP_v25, tm_vp_i18n |
| ei vielä reviewia | ei vielä yhteenvetoa | VP_v25, tm_vp_i18n |
| ● IDP aktiivinen | ● Kehityssuunnitelma aktiivinen | VP_v25, tm_vp_i18n |
| IDP hyväksytty ✓ | Kehityssuunnitelma hyväksytty ✓ | VP_v25, tm_vp_i18n |
| IDP-blokit tehty | Kehityssuunnitelman osat tehty | VP_v25, tm_kehitystyopoyta, tm_vp_i18n |
| Seuraava review: | Seuraava yhteenveto tai kehityskeskustelu: | VP_v25, tm_vp_i18n |
| Avaa katselmus → | Tee jakson yhteenveto → | VP_v25, tm_vp_i18n |
| Edellinen review | Edellinen yhteenveto tai kehityskeskustelu | VP_v25, tm_vp_i18n |
| ◔ IDP ehdotettu | ◔ Kehityssuunnitelma ehdotettu | VP_v25, tm_vp_i18n |
| Tallenna review | Tallenna kehityskeskustelu | VP_v25, Master_v16, tm_master_i18n, tm_vp_i18n |
| Review kirjattu | Kehityskeskustelu kirjattu | VP_v25, Master_v16, tm_master_i18n, tm_vp_i18n |
| Seuraava review | Seuraava yhteenveto tai kehityskeskustelu | VP_v25, tm_vp_i18n |
| ＋ Kirjaa review | ＋ Kirjaa kehityskeskustelu | VP_v25, Master_v16, tm_master_i18n, tm_vp_i18n |
| Review myöhässä | Yhteenveto myöhässä | VP_v25, tm_vp_i18n |
| Katselmusikkuna | Yhteenvetoikkuna | tm_joukkuejakso |
| Sulje jakso ·  | Tee jakson yhteenveto ·  | Master_v16, tm_master_i18n |
| ○ IDP puuttuu | ○ Kehityssuunnitelma puuttuu | VP_v25, tm_vp_i18n |
| ＋ IDP-tavoite | ＋ Kehityssuunnitelman tavoite | VP_v25, tm_vp_i18n |
| ○ IDP luonnos | ○ Kehityssuunnitelma luonnos | VP_v25, tm_vp_i18n |
| IDP-kattavuus | Kehityssuunnitelmien kattavuus | VP_v25, tm_kehitystilanne, tm_vp_i18n |
| IDP-seuranta | Kehityssuunnitelman seuranta | VP_v25, tm_kalenteri_tyypit, tm_vp_i18n |
| Talentti-IDP | Talentin kehityssuunnitelma | VP_v25, tm_vp_i18n |
| Katselmus on | Jakson yhteenveto tai kehityskeskustelu on | tm_vp_i18n |
| <th>IDP</th> | <th>Kehityssuunnitelma</th> | VP_v25, tm_kehitystilanne |
| Raportointi | Seuran tilannekuva | VP_v25, tm_i18n_common, tm_vp_navi |
| IDP odottaa | Kehityssuunnitelma odottaa | VP_v25, tm_vp_i18n |
| IDP hylätty | Kehityssuunnitelma hylätty | VP_v25, tm_vp_i18n |
| IDP-tavoite | Kehityssuunnitelman tavoite | VP_v25, tm_vp_i18n |
| Sulje jakso | Tee jakson yhteenveto | VP_v25, Master_v16, tm_aloita_jakso, tm_kevyt_katselmus, tm_kt_arviointi, tm_kt_polku, tm_master_i18n, tm_vp_i18n |
| Ei reviewia | Ei yhteenvetoa | tm_vp_i18n |
| 1 katselmus | 1 jakson yhteenveto | tm_vp_i18n |
|  · review  |  · kehityskeskustelu  | VP_v25, Master_v16, tm_master_i18n, tm_vp_i18n |
| Ehdota IDP | Ehdota kehityssuunnitelmaa | VP_v25, tm_vp_i18n |
| · IDP-ydin | · kehityssuunnitelman ydin | Master_v16, tm_master_i18n, tm_vp_i18n |
| Review →  | Kehityskeskustelu →  | VP_v25, tm_vp_i18n |
|  · review |  · kehityskeskustelu | tm_master_i18n |
| Katselmus | Jakson yhteenveto | tm_vp_koti |
| Review → | Kehityskeskustelu → | Master_v16, tm_master_i18n, tm_vp_i18n |
| Reviewit | Yhteenvedot ja keskustelut | tm_vp_i18n |
| Syvennä | Kehityskeskustelu | VP_v25, Master_v16 |
| katselmus | jakson yhteenveto | vp_koti, vp_tilanne |
| kt_katselmus (FI-arvo) | katselmus → Jakson yhteenveto | kehitystyopoyta |
|  · IDP  |  · Kehityssuunnitelma  | VP_v25 |
| IDP:  | Kehityssuunnitelma:  | VP_v25 |
| 'IDP ' + x.idp | 'Kehityssuunnitelma ' + x.idp | kehitystilanne |
| kortti('IDP', …) | kortti('Kehityssuunnitelma', …) | kehitystilanne |
| tm_kehityssilmukka.js puuttuu — katselmusta ei kirjoitettu | tm_kehityssilmukka.js puuttuu — kehityskeskustelua ei kirjoitettu | VP_v25 |
| Päätös (ADAR D, henkilökunta) | Päätöksenteko | pelialy_yksilo, kehityskaari, naytto_lohkot, VP_v25 |
| Palautuminen (ADAR R) | Reagointi | pelialy_yksilo, kehityskaari, naytto_lohkot, VP_v25, Pelaaja_v7, tm_lang (pelaaja.adar_nimi_pelaaja_r) |

## 2. Libien FI-avaimet joiden teksti muuttui (15 riviä)
| Avain | Lib | Vanha | Uusi |
|---|---|---|---|
| `kt_osat` | tm_kehitystyopoyta | Osat | Ydinasiat |
| `kt_v_blokit` | tm_kehitystyopoyta | IDP-blokit tehty | Kehityssuunnitelman osat tehty |
| `kt_katselmus` | tm_kehitystyopoyta | katselmus | Jakson yhteenveto |
| `kk_otsikko` | tm_kevyt_katselmus | Sulje jakso | Tee jakson yhteenveto |
| `kk_sulje_laheta` | tm_kevyt_katselmus | Sulje jakso ja lähetä | Tee jakson yhteenveto ja lähetä |
| `kk_syvenna` | tm_kevyt_katselmus | Syvennä (täysi katselmus) | Kehityskeskustelu |
| `ktp_paattynyt` | tm_kt_polku | päättynyt · suljettava | päättynyt · yhteenveto tekemättä |
| `ktp_arviointi` | tm_kt_polku | arviointi {pvm} | Jakson yhteenveto {pvm} |
| `ktp_sulje_jakso` | tm_kt_polku | Sulje jakso | Tee jakson yhteenveto |
| `k3_sulje_tarjoa` | tm_reitin_valinta | Sulje jakso ja tarjoa valinta | Tee jakson yhteenveto ja tarjoa valinta |
| `sn_jakson_arviointi` | tm_sanasto | Jakson arviointi | Jakson yhteenveto |
| `ts_suljettava_myohassa` | tm_tanaan_signaali | katselmus myöhässä | yhteenveto myöhässä |
| `ts_sulje_nappi` | tm_tanaan_signaali | Sulje jakso · 3 kysymystä | Tee jakson yhteenveto · 3 kysymystä |
| `ts_askel_review_eraantymassa` | tm_tanaan_signaali | Katselmus erääntymässä | Jakson yhteenveto tai kehityskeskustelu erääntymässä |
| `k4_ohje` | tm_viikkokatsaus | Vastauksesi näkyy valmentajan katselmuksessa. | Vastauksesi näkyy valmentajan jakson yhteenvedossa. |

## 3. ADAR-nimikanoni (Tero 20.10.)
| Avain | Vanha | Uusi |
|---|---|---|
| `TM_ADAR_NIMET.valmentaja.d` · `adar_nimi_valmentaja_d` | Päätös | Päätöksenteko |
| `TM_ADAR_NIMET.valmentaja.r` · `.pelaaja.r` · `adar_nimi_pelaaja_r` (tm_lang fi/en) | Palautuminen (en Recovery) | Reagointi (en Reaction) |
| `adar_partitiivi_r` | palautumista | reagointia |
| `adar_R_tip2` | Sovi yhteinen palautumisele, esim. taputus ja seuraava tehtävä. | Sovi yhteinen reagointitapa, esim. taputus ja seuraava tehtävä. |
| tukitavoitteet ADAR_KUVAUS.R | Nopea palautuminen heti menetyksen jälkeen | Nopea reagointi heti menetyksen jälkeen |

## 4. Pelaajan Minä (`lib/tm_idp_pelaaja.js`, ennen kovakoodattua suomea `tm_idp.js`:ssä)
Kaikki pelaajalle näkyvät tekstit ovat nyt käännösavaimia (`ip_*`, fi-oletus libissä; sv erä 80). Muutetut lauseet:

| Avain | Vanha | Uusi |
|---|---|---|
| `ip_seuraava_teksti` | Yksi rohkea yritys joka harjoituksessa — {fokus}. | Muista tavoitteesi joka harjoituksessa: {fokus}. |
| `ip_lahto_valmentaja` (ilman pelaajan ääntä) | Asetitte tavoitteen yhdessä valmentajan kanssa. | Valmentaja asetti tavoitteen. |
| Minä, "Sinun matka" -otsikko | Kausitavoite & jaksofokus · Fokus: {X} | Kauden tavoite: {kausitavoite} · Nyt harjoittelet: {jakson aihe} |

Avaimet: `ip_aloitit` `ip_lahto_valmentaja` `ip_lahto_yhdessa` `ip_nyt` `ip_nyt_note` `ip_nyt_win` `ip_nyt_pysyt` `ip_askel` `ip_askel_note` `ip_askel_sujuu` `ip_jatkoit` `ip_jatkoit_note` `ip_jatkoit_pysyit` `ip_seuraava` `ip_seuraava_teksti` `ip_kehu` `ip_tavoitteesi` `ip_mika_oletus` `ip_miksi_oletus` `ip_mieti`

## 5. Uudet tekstit (ei vanhaa) — erä 80

### lib.tm_tanaan_signaali (24)
- `ts_rytmi_otsikko` — Jakson yhteenveto tai kehityskeskustelu viimeistään {pvm}
- `ts_rytmi_otsikko_myohassa` — Jakson yhteenveto tai kehityskeskustelu myöhässä {n} pv
- `ts_rytmi_selitys` — Edellisestä yhteenvedosta tai keskustelusta {n} pv. {ika}-vuotiaalle {vali} päivän välein.
- `ts_rytmi_selitys_ilman_ikaa` — Edellisestä yhteenvedosta tai keskustelusta {n} pv. {vali} päivän välein.
- `ts_rytmi_jakso` — Jakso päättyy {pvm}. Tee jakson yhteenveto tai pidä kehityskeskustelu ennen {pvm}.
- `ts_rytmi_yhteenveto_nappi` — Tee jakson yhteenveto
- `ts_rytmi_keskustelu_nappi` — Kirjaa kehityskeskustelu
- `ts_miksi_otsikko` — Miksi näen tämän?
- `ts_miksi_kuorma_tarkista` — Jakson ohjelma on raskas, eikä pelaajan kasvuvaihe (tai sen puuttuva mittaus) tue sitä.
- `ts_miksi_review_myohassa` — Edellisestä jakson yhteenvedosta tai kehityskeskustelusta on {n} pv, ja {ika}-vuotiaalle on sovittu {vali} päivän väli. Eräpäivä oli {pvm}.
- `ts_miksi_review_eraantymassa` — Edellisestä jakson yhteenvedosta tai kehityskeskustelusta on {n} pv, ja {ika}-vuotiaalle on sovittu {vali} päivän väli. Eräpäivä on {pvm}.
- `ts_miksi_valinta_odottaa` — {nimi} on valinnut reitin, ja jakso odottaa vahvistustasi.
- `ts_miksi_valinta_pelaajalla` — Pelaajalle on tarjottu reitti, ja jakso alkaa vasta kun hän on valinnut.
- `ts_miksi_ehdotus_odottaa` — Valmentajan tekemä kehityssuunnitelman ehdotus odottaa VP:n tarkistusta.
- `ts_miksi_sitoumus` — Pelaaja on sitoutunut tähän jaksoon, eikä sitoumusta ole vielä vahvistettu.
- `ts_miksi_sitoumus_odottaa` — Jakso on alkanut, mutta pelaaja ei ole vielä sitoutunut siihen.
- `ts_miksi_jakso_umpeutunut` — Jakson suunniteltu kesto on kulunut umpeen. Jakson yhteenveto päättää jakson ja valitsee seuraavan.
- `ts_miksi_ei_jaksofokusta` — Pelaajalle ei ole vielä valittu harjoiteltavaa asiaa tälle jaksolle.
- `ts_miksi_idp_jumissa` — Kauden tavoite on yli 8 viikkoa vanha, eikä siinä ole nähty merkittävää edistystä.
- `ts_miksi_valitavoite_valmis` — Jaksoon liitetty välitavoite on saavutettu, joten seuraava kannattaa valita.
- `ts_miksi_havainto` — Jakson viimeisimmästä havainnosta on {pv} pv, ja havaintorytmi on {rytmi} pv.
- `ts_miksi_yllapito` — Mikään sääntö ei nosta asiaa: jakso etenee ja havainnot ovat ajan tasalla.
- `ts_miksi_vk` — Pelaaja ei ole vielä vastannut tämän viikon viikkokatsaukseen.
- `ts_miksi_tauko` — Seuralla tai joukkueella on tauko, joten rytmin muistutukset pysähtyvät.

### lib.tm_kt_polku (5)
- `ktp_otsikko` — Kehityssuunnitelma
- `ktp_h_yhteenveto` — yhteenveto tehty
- `ktp_rytmi_ajan_tasalla` — Ajan tasalla · seuraava yhteenveto tai kehityskeskustelu viimeistään {pvm}
- `ktp_rytmi_seuraava` — Seuraava yhteenveto tai kehityskeskustelu viimeistään {pvm}
- `ktp_rytmi_myohassa` — Yhteenveto tai kehityskeskustelu myöhässä {n} pv (eräpäivä {pvm})

### lib.tm_tanaan_kentta (3)
- `k1_kauden_tavoite_rivi` — Kauden tavoite: {nimi}
- `k1_nyt_harjoittelet_rivi` — Nyt harjoittelet: {nimi}
- `k1_nyt_harjoittelet` — Nyt harjoittelet

### lib.tm_sanasto_info (30)
- `si_n_kehityssuunnitelma` — Kehityssuunnitelma
- `si_n_jakson_yhteenveto` — Jakson yhteenveto
- `si_n_kehityskeskustelu` — Kehityskeskustelu
- `si_n_pelaajaraportti` — Pelaajaraportti
- `si_n_tilannekuva` — Seuran tilannekuva
- `si_kehityssuunnitelma` — Pelaajan kauden tavoite ja sen alla etenevät 6 viikon jaksot.
- `si_jakson_yhteenveto` — Jakson lopussa: vastaat kolmeen kysymykseen, kirjoitat lauseen ja valitset seuraavan jakson. Kirjataan aina, ja se nollaa yhteenvetorytmin.
- `si_kehityskeskustelu` — Laajempi keskustelu pelaajan ja tarvittaessa huoltajan kanssa, yleensä VP:n kanssa.
- `si_pelaajaraportti` — Dokumentti, jonka voit näyttää tai antaa pelaajalle ja perheelle.
- `si_tilannekuva` — VP:n kooste siitä, onko yhteenvedot ja keskustelut ajan tasalla joukkueittain.
- `si_aria` — Mikä on {termi}?
- `si_lue_lisaa` — Lue lisää
- `si_sulje` — Sulje
- `ke_otsikko` — Miten kehitys etenee
- `ke_ingressi` — Pelaajan kehitys etenee kierroksena: kauden tavoite, 6 viikon jaksot ja jakson lopussa yhteenveto, josta seuraava jakso alkaa.
- `ke_d_suunnitelma` — Kehityssuunnitelma
- `ke_d_suunnitelma_alla` — kauden tavoite
- `ke_d_jakso` — Jakso · 6 vk
- `ke_d_jakso_alla` — aihe · ydinasiat · viikon fokus
- `ke_d_yhteenveto` — Jakson yhteenveto
- `ke_d_yhteenveto_alla` — jakson lopussa
- `ke_d_seuraava` — Seuraava jakso
- `ke_d_keskustelu` — Kehityskeskustelu
- `ke_d_keskustelu_alla` — tarvittaessa tai VP:n kanssa
- `ke_d_raportti` — Pelaajaraportti
- `ke_d_raportti_alla` — pelaajalle ja perheelle
- `ke_d_kaavio` — Kaavio: kehityssuunnitelma, jakso, jakson yhteenveto ja seuraava jakso
- `ke_rytmi` — Rytmi: jakson yhteenveto tai kehityskeskustelu viimeistään 42 päivän välein (12 vuotta täyttäneet) tai 84 päivän välein (9–11-vuotiaat). Kumpikin nollaa rytmin.
- `ke_jakso` — Jakso kestää yleensä 6 viikkoa. Sen aikana pelaaja harjoittelee yhtä aihetta, jonka ydinasioista yksi on viikon fokus.
- `ke_raportti` — Pelaajaraportti on dokumentti pelaajalle ja perheelle. Se kertoo, missä pelaaja on nyt ja mihin ollaan menossa.

### vp_kartta (1)
- `Kehityskeskustelun voi kirjata, kun pelaajalle on asetettu k` — Kehityskeskustelun voi kirjata, kun pelaajalle on asetettu kauden tavoite. Aseta se Polku-välilehdellä.

### master_kartta (1)
- `Kehityskeskustelun voi kirjata, kun pelaajalle on asetettu k` — Kehityskeskustelun voi kirjata, kun pelaajalle on asetettu kauden tavoite. Aseta se Polku-välilehdellä.
