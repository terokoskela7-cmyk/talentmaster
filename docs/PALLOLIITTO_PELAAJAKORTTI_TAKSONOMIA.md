# Palloliiton Player Development Card — täysi taksonomia + TM-integraatio

> Lähde: Palloliiton virallinen "Player Development Card" (Tero toimitti slaidit 2026-07-03). **Kanoninen yksilöarvioinnin taksonomia** johon TM:n IDP + 5D-profiili + tavoitteet linjataan. Kytkeytyy: `IDP_KORTTI_MAAILMANLUOKKA.md`, `IDP_YDIN_SPEC.md`, `TalentMaster_Pelihavainto_Palloliitto.html`. **Standardoi tähän — älä keksi omaa arviointitaksonomiaa (§0 kansallinen).**

## 0. Ydin — kaksi kerrosta, sama 1–5-asteikko
Palloliiton kortti + TM ovat **sama rakenne, kaksi mittaustapaa**:
- **TM = mitattu kerros** (objektiiviset testit: Eerikkilä/MyE.Way/TKI → 1–5 ikäsuhteutettu).
- **Palloliiton kortti = havaittu kerros** (asiantuntija-arvio 1–5 otteluista + harjoituksista — "know player inside out"). Kattaa myös sen mitä ei voi testata: peliäly, psyyke, potentiaali.
- **Sama 1–5-asteikko + sama ikäryhmäsuhteutus** → kerrokset yhdistyvät yhdeksi profiiliksi. **IDP-tavoite voi tulla kummasta tahansa** (heikko mitattu testi TAI heikko havaittu ominaisuus).

## 1. Arviointiasteikko (1–5, ikäryhmäsuhteutettu — identtinen TM:n kanssa)
| | | |
|---|---|---|
| **5 · E** | Excellent | Erinomainen — ikäluokan parhaita |
| **4 · VG** | Very good | Vahvuus — parempi kuin useimmat |
| **3 · G** | Good | Osaa — ei erityinen vahvuus/heikkous |
| **2 · A** | Average | Vaatii työtä — keskitasoa muihin nähden |
| **1 · P** | Poor | Kehityskohde — alle ikäluokan keskitason |

## 2. Perustiedot
Nimi · syntymäaika · seura · **paras pelipaikka + vahvempi jalka** · toissijainen pelipaikka · pituus · pelipaikka kentällä (kaavio). → TM:llä jo (`positio`, `syntymaaika`, `pituus_cm`, joukkue); **lisää: vahvempi jalka + toissijainen pelipaikka.**

## 3. Arviointikategoriat + kohteet (kaikki 1–5) → TM 5D -mäppäys

### D1 Fyysinen
- **Movement with/without ball:** Acceleration · Speed · Balance · Mobility (agility, footwork, stops & starts)
- **Fitness & physical play:** Endurance · Power · Physical presence · Courage
- *TM mittaa:* Acceleration (5m/10m) · Speed (30m) · Mobility (ketteryys/kasirata) · Endurance (MAS) · Power (CMJ). *Havaittu (Palloliitto):* Balance · Physical presence · Courage.

### D2 Tekninen — Overall technical skill
- Ball control (first touch, receiving, turning) · Dribbling in tight areas · Running with the ball · Ball protection · Link-up play
- Short passing · Long passing · Passing variety · Ability to hide the pass
- Shooting: accuracy · power · quickness · efficiency · variety · Heading · **Weaker foot**
- *TM mittaa:* syöttö/pujottelu/ponnauttelu/kuljetus-laukaus (TKI). *Havaittu:* ball control, protection, link-up, passing variety, hide pass, shooting ×5, heading, weaker foot (pelikontekstissa).

### D4 Peliäly — Football sense + Defensive skills
- **Football sense:** Vision (sees the pass short/long) · Decision making · Anticipation · Positioning · Play under pressure · Timing · Versatility
- **Defensive skills:** 1v1 defending · Heading · Clearing crosses · Ability to tackle · Blocking shots · Defensive reliability · Defensive anticipation · Defensive positioning · Pressing · Resilience
- *Havaittu (Palloliitto pelihavainto + ADAR):* koko peliäly. Pelipaikkakohtaiset (keskuspuolustaja: boksi-periaate, tolpat, blokit…) → `Pelihavainto_Palloliitto.html`.

### D3 Psyykkinen — Competitiveness + Psychological + Training mentality
- **Competitiveness:** Scoring drive · Attitude · Work ethic · Consistency
- **Psychological factors:** Leadership · Communication · Confidence · Body language
- **Training mentality:** Ability to take on training load · Desire to be better by training · Inner motivation · Learning ability
- *Havaittu:* koko D3. TM: D3-kalibraatio + pelaajan itsearvio.

### D5 Sosiaalinen
- Leadership · Communication (jaettu D3:n kanssa) → joukkuerooli, vuorovaikutus. *Havaittu.*

## 4. Player Potential (katto — eteenpäin katsova, eri kuin nykytaso)
"Best years if stays healthy" — 1–5★ liigataso:
| ★ | Taso |
|---|---|
| 5★ | Top 5 -liigat (tai vastaava naisten) |
| 4★ | Muut huippuligat |
| 3★ | Pohjoismaiden huippuligat |
| 2★ | Suomen Veikkausliiga/Kansallinen Liiga |
| 1★ | Muu |
+ vapaat muistiinpanot + pelipaikka. → **Kytkös:** TM:n talentti/marketplace + maajoukkuepolku (§V6). Katto = pitkän polun (2–5 v, §5.5) määränpää; nykytaso vs. katto = kehityskaari.

## 5. Integraatio TM:ään (periaatteet)
1. **Sama 1–5, sama 5D** → Palloliiton kortti EI ole erillinen työkalu vaan TM:n **havaintokerros**. Renderöi TM:ssä samaan profiiliin.
2. **Mitattu + havaittu rinnakkain:** kun testi on (esim. nopeus 30m), näytä mitattu; kun ei (esim. Vision), näytä havaittu 1–5. Merkitse lähde (mitattu/havaittu).
3. **IDP-tavoite kummasta tahansa:** heikoin voi olla mitattu (syöttötesti) tai havaittu (Decision making) → sama tavoiterakenne (§IDP_YDIN).
4. **Pelipaikkakohtaisuus:** puolustustaidot + football sense linkittyvät pelipaikkaan (V5, pelihavainto-KPI:t).
5. **Potentiaali erikseen:** katto (1–5★) on oma eteenpäin katsova arvio, ei sekoiteta nykytasoon (§28-henki: nykytaso ≠ potentiaali).
6. **§7.22:** havaittu arvio on aikuisten työkalu (VP/valmentaja/scout) — pelaajalle/perheelle kehystetään turvallisesti (ei "Poor"-leimaa lapselle).

## 6. Toimenpiteet (kirjattu — vaiheistetaan myöhemmin)
- Laajenna TM:n arviointi Palloliiton kortin kategorioihin (havaittu 1–5 -syöttö niille kohteille joita ei mitata).
- Lisää perustietoihin: vahvempi jalka + toissijainen pelipaikka.
- Player Potential (1–5★ katto) omaksi kentäksi → maajoukkuepolku/marketplace.
- IDP-fokus + 5D lukevat sekä mitatun että havaitun → yksi profiili.
- Standardoi kansalliseen (V6): tämä taksonomia = yhteinen kieli seura ↔ Palloliitto.
