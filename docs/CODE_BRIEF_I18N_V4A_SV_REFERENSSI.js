/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TalentMaster™ — i18n V4-A · RUOTSINKÄÄNNÖS-REFERENSSI (harjoitesisältö)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * TARKOITUS: Claude tuotti nämä sv-käännökset valmiiksi Codelle referenssiksi
 * (Tero-pyyntö). Code pudottaa nämä V4-A-briiffin mukaiseen sv-content-kerrokseen
 * + kytkee kielitietoisen getterin (tmNykyinenKieli() → sv-override → fi-fallback).
 * Rakenne peilaa `harjoitelogiikka_v4.js`:n lähdemuotoa avain avaimelta.
 *
 * KÄÄNNÖSLINJAUS (V1): kaikki sv tuotantoon, ruotsiseurat hiovat käytössä.
 * Ei juristiporttia (ei lakitekstiä). §7.22-sävy säilytetty (ei tasolukuja/
 * vertailua/uhkaa; tarinat anonyymejä; positiivinen prosessikehu).
 *
 * ⚠ CODEN HUOMIOT ENNEN INTEGROINTIA:
 *  1. Rakenne täsmää lähteen TODELLISEEN muotoon (arrayt), EI briiffin vk1-4-
 *     havainnekaavaan. PANKKI.D = FLEI-ketjut arrayna; PANKKI.S = ketju→[{vk,
 *     stage_tasot:[...]}]; HARJOITEPANKKI = ketju→{D,S,P}; T_KOHDE_PANKKI = arrayt.
 *  2. `xp/kesto/yt/phv_xp/stage/pv/vk/viikot/intensiteetti/kehityskohde` EIVÄT ole
 *     käännöksiä — ne ovat rakenne-/logiikka-avaimia. Vain näkyvä teksti käännetty.
 *  3. `null`-ohjeet säilytetty null:ina (ikävaihe-fallback lähteessä).
 *  4. `phv`-kentät ON käännetty (näkyvät pelaajalle ⚠️-liitteenä lähdegeneraattorissa).
 *  5. TERMIVARAUS: `SM-pallo` esiintyy lähteessä epäjohdonmukaisesti — SL.S:ssä
 *     rotaatioheitto (→ "medicinboll"), SL.P.kuvaus:ssa suunnanvaihto-pallolla-testi
 *     (→ "tid för riktningsförändring med boll"). Code: yhtenäistä jos halutaan.
 *  6. Desimaalit ruotsalaisittain pilkulla (0,1 s) — Code voi normalisoida jos UI
 *     odottaa pisteitä; numerot/×/toistot muuten säilytetty täsmälleen.
 *  7. Anonymisointi koski `tarina`-kenttiä; `cue`-kentissä esiintyy pari nimeä
 *     (esim. "Ronaldinho", "Ronaldo"-objektiavain) kuten lähteessäkin — Code päättää.
 * ═══════════════════════════════════════════════════════════════════════════
 */

var HARJOITE_SV = {

  // ══ KETJUT (FLEI-ketjujen nimet + cue) ══════════════════════════════════
  KETJUT: {
    "sbl":  { nimi: "⚡ Fartkedja",      lyhyt: "Fartkedja",      cue_leikkija: "din snabbhet",               cue_showcase: "SBL ⭐⭐⭐ — bakre kedjans kraft (Wilke 2016)" },
    "sfl":  { nimi: "🦵 Startkedja",     lyhyt: "Startkedja",     cue_leikkija: "din explosivitet",           cue_showcase: "SFL — höften öppen → explosivitet och spark" },
    "ll":   { nimi: "↔️ Sidokedja",      lyhyt: "Sidokedja",      cue_leikkija: "din smidighet",              cue_showcase: "LL ⭐⭐ — lateral stabilitet, slalomdribbling +9%" },
    "diag": { nimi: "🔄⬡ Diagonalkedja", lyhyt: "Diagonalkedja",  cue_leikkija: "din passning och rotation",  cue_showcase: "DIAG ⭐⭐⭐ — SL+FL tillsammans: passning +13%, riktningsförändring med boll +8%" },
    "dfl":  { nimi: "🏗️ Kontrollkedja",  lyhyt: "Kontrollkedja",  cue_leikkija: "din balans",                 cue_showcase: "DFL ⭐⭐ — andning, hållning, grund för allt" }
  },

  PANKKI: {

    // ══ PANKKI.T (T-harjoitteet: vastaanotto → dribbling → 1v1 → syöttö) ══
    T: {
      "kaka": {
        teema: "Mottagning",
        kuvaus_leikkija: "Maestro — första touchen tar bollen i den riktning du ska",
        kuvaus_rakentaja: "Maestro — första touchen köper tid och yta",
        kuvaus_showcase: "Maestro — riktad mottagning under press",
        vk1: {
          nimi: "Maestro — Stopp med insidan",
          ohje_leikkija: "10 gånger: studsa bollen mot väggen och stoppa med insidan. Rikta bollen dit du vill springa härnäst.",
          ohje_rakentaja: "3×10, båda fötterna. Insidan tar emot — första touchen pekar ut nästa riktning innan försvararen hinner reagera.",
          ohje_showcase: "4×10, byt fot mellan seten. Automatik: insidan in under kroppen, foten mot den spelbara riktningen innan du rör bollen.",
          cue: "Maestros regel: första touchen är redan nästa rörelse.",
          tarina: "En ung talang spelade i akademin två åldersklasser över de andra redan som tonåring — inte på grund av storleken, utan för att hans första touch var så säker att han alltid fick mer tid än de andra.",
          viikkotavoite: "Mottagning med insidan — 8/10 går direkt i rätt riktning"
        },
        vk2: {
          nimi: "Maestro — Ta emot och vänd",
          ohje_leikkija: "12 gånger: ta bollen från väggen och vänd den genast i en ny riktning med insidan. Stanna den inte på stället — bollen är redan på väg framåt.",
          ohje_rakentaja: "3×12, växelvis fot. Öppna höften före touchen — första touchen vänder bollen bort från där den kom, så får du tid och yta.",
          ohje_showcase: "4×12, vänd åt båda hållen. Automatik: scanna över axeln före bollen, touchen med insidan öppnar direkt mot fri yta utan extra touch.",
          cue: "Mottagningen är redan ett anfall — vänd dit där det finns yta.",
          tarina: "En spelare som nådde toppen tränade redan som ung i månader med seniorlaget — bara för att på nära håll följa hur de bästa tar första touchen innan pressen hinner fram.",
          viikkotavoite: "Mottagning + vändning med en touch 20/24"
        },
        vk3: {
          nimi: "Maestro — Skydda och gör dig spelbar",
          ohje_leikkija: "Be en kompis stå bredvid (tar inte bollen). Ta bollen med insidan så att din kropp är mellan bollen och kompisen. 12 gånger.",
          ohje_rakentaja: "3×12 med en passiv försvarare. Ta emot med bakre foten, luta kroppen mellan försvararen och bollen — första touchen tar bollen i säkerhet bort från pressen.",
          ohje_showcase: "4×12, byt vilken axel som skyddar. Automatik: känn av pressen före bollen, skydda med kroppen och gör dig spelbar med insidan mot fri yta med en touch.",
          cue: "Kroppen mellan bollen och motståndaren — då är bollen alltid din.",
          tarina: "En ung spelare byttes in när laget låg under, och motståndarna undrade högt vad någon så ung gjorde där. På en halvtimme vände han matchen helt — en lugn första touch gav honom tid som ingen annan hade.",
          viikkotavoite: "Skyddad mottagning spelbar under press 15/20"
        },
        vk4: {
          nimi: "Maestro — Mät din första touch",
          ohje_leikkija: "Gör 20 mottagningar. Räkna hur många gånger bollen stannar inom en meter från din fot. Skriv ner ditt rekord och försök slå det.",
          ohje_rakentaja: "20 mottagningar: räkna hur många som går direkt till spelposition (bollen inom 1 m, kroppen redan i rätt riktning). Jämför med resultatet från vecka 1 — blev riktningen på första touchen bättre?",
          ohje_showcase: "20 mottagningar under press (passiv försvarare): räkna hur många som vänder direkt mot fri yta utan extra touch. Mål 16/20 — på den nivån är första touchen ett vapen.",
          cue: "Utan mätning vet du inte om din första touch blir bättre.",
          tarina: "En spelare blev sin klubbs yngsta ligaspelare genom tiderna som bara 16-åring och slog ett rekord som stått i årtionden — och han utsågs till bäste spelare redan i sin första match.",
          viikkotavoite: "Riktad första touch: hur många av 20 går i rätt riktning?"
        }
      },
      "affelay": {
        teema: "Dribblingens grund",
        kuvaus_leikkija: "För bollen med blicken uppe!",
        kuvaus_rakentaja: "4 grundfärdigheter — grunden för allt annat",
        kuvaus_showcase: "Shadowstep — dribbling + rörelse utan boll",
        vk1: {
          nimi: "Dribbling — blicken uppe",
          ohje_leikkija: "För bollen framåt 20 meter, titta UPPÅT! Titta inte på bollen. Byt riktning plötsligt 5 gånger. Gör 5 varv.",
          ohje_rakentaja: "4 grundfärdigheter i följd: 1) För bollen med blicken över den och sök yta. 2) Accelerera från långsamt till full fart på två steg — bollen får inte gå mer än 2 steg ifrån. 3) Små snabba riktningsförändringar utan stora bågar. 4) Kontrollera: titta framåt. 3 varv.",
          ohje_showcase: null,
          cue: "Shadowsteps grund: dessa 4 färdigheter är basen som allt annat byggs på.",
          tarina: "Många toppdribblare började på förortens gator, med bollen vid foten varje dag. Gatuspelet lärde ut att lyfta blicken och göra snabba riktningsförändringar långt innan någon akademi hann med.",
          viikkotavoite: "För bollen 20 m med blicken uppe utan att tappa bollen"
        },
        vk2: {
          nimi: "Dribbling — acceleration med boll",
          ohje_leikkija: "Stå still, bollen framför dig. Startskott — accelerera till max så snabbt du kan, med bollen! 10 gånger. Återhämtning gående.",
          ohje_rakentaja: "Accelerationsstege: 0–5 m långsam | 5–10 m medelfart | 10–15 m max — bollen med hela tiden. Mät: när lossnar bollen för mycket? 8 repetitioner.",
          ohje_showcase: "Acceleration + riktningsförändring 45° utan att bollen stannar. 6 repetitioner åt vardera hållet. Mät reaktionstiden: hur snabbt är du i full fart?",
          cue: "Explosivitet: det viktiga är inte vilken rörelse du gör, utan när och hur snabbt du accelererar efteråt.",
          tarina: "En talang upptäcktes till akademin som 10-åring. Han slipade sin dribblingsteknik på samma ställe i tio år, dag för dag — och skyndade sig inte vidare förrän färdigheten satt.",
          viikkotavoite: "0–15 m med bollen, under 3 s"
        },
        vk3: {
          nimi: "Dribbling — mot en kompis (passiv)",
          ohje_leikkija: "Kompisen står framför, rör sig inte. Passera honom till vänster eller höger! Accelerera förbi. 15 gånger från vardera hållet.",
          ohje_rakentaja: "Kompisen står som passiv försvarare. Gör en riktningsförändring förbi honom — använd en kort rörelse, ingen stor båge. Direkt acceleration efter passeringen. 20 repetitioner.",
          ohje_showcase: "Kombinera dribbling och rörelse: dribbla nära kompisen → byt riktning → kompisen följer passivt. Titta upp före rörelsen. 20 min spellikt.",
          cue: "Behärska rörelsen först ensam, sedan mot passiv, sedan i full 1v1.",
          tarina: "Som tonåring debuterade en spelare i seniorernas högsta liga och vågade genast föra bollen mot erfarna försvarare. Årens slipande syntes: tekniken höll för pressen, så modet var förtjänat.",
          viikkotavoite: "Passera en passiv försvarare 15/20 gånger"
        },
        vk4: {
          nimi: "Dribblingsmätning",
          ohje_leikkija: "Slalomdribbla mellan 5 koner så snabbt du kan — ta tid! Skriv ner tiden. Försök förbättra 3 gånger.",
          ohje_rakentaja: "Tidtagning: slalomdribbling 5 koner, 10 m. Gör 5 försök. Räkna ut din bästa tid. Jämför: är du snabbare än i början av oktober?",
          ohje_showcase: "4 grundfärdigheter: mät hur många som lyckas i full match (utvärdera efter matchen). Titta upp, accelerera, riktningsförändring, rytm.",
          cue: "Mät utvecklingen, träna inte bara — utan mätning vet du inte om du har utvecklats.",
          tarina: "En toppdribblare beskrevs som en spelare som \"förödmjukade försvarare med häpnadsväckande finter\". Den stilen föddes ur gatuspel och akademins otaliga repetitioner — inte på en natt.",
          viikkotavoite: "Slalomdribbling 10 m — förbättra tiden från början av oktober"
        }
      },
      "ronaldo": {
        teema: "1v1-rörelser",
        kuvaus_leikkija: "Lär dig passera en motståndare",
        kuvaus_rakentaja: "Shadowstep-rörelseserie — vändningar och saxrörelser",
        kuvaus_showcase: "Shadowstep — brett 1v1-register",
        vk1: {
          nimi: "U-vändning — lär in långsamt",
          ohje_leikkija: "Fotsulan på bollen, dra bakåt, vänd 180°. Långsamt först! 15 gånger med höger fot, 15 med vänster. Ingen brådska.",
          ohje_rakentaja: "U-vändning: fotsulan på → dra bakåt → vänd 180° → accelerera. Gör 20 gånger långsamt och rätt. Sedan: översteg (sax över bollen). 20 gånger. Ingen motståndare.",
          ohje_showcase: "Rörelseserie 1–4 långsamt: U-vändning | översteg | U + översteg kombinerat | dragvändning (foten över bollen och bakåt). 10 × vardera, teknisk kvalitet först.",
          cue: "Grundregel: hela serien måste behärskas utan motståndare innan man går över till att spela mot passiv.",
          tarina: "En talang tränade som barn ensam mot en vägg tills mörkret tvingade honom att sluta. När de andra barnen lekte upprepade han samma rörelse om och om igen.",
          viikkotavoite: "U-vändningen lyckas 10/10 med båda fötterna"
        },
        vk2: {
          nimi: "1v1-rörelse — snabbare",
          ohje_leikkija: "Nu snabbare! U-vändning + acceleration direkt. Gör rörelsen och spring snabbt förbi. 15 gånger med vardera foten.",
          ohje_rakentaja: "Vald rörelse i full fart utan motståndare: fint + rörelse + acceleration under 1 sekund. 25 repetitioner. Extra: saxrörelse — för foten över bollen 20 gånger.",
          ohje_showcase: "Rörelserna 1–7 i full fart ensam. Mät: hur snabbt gör du rörelsen + acceleration till 5 meter? Mål under 2 s.",
          cue: "Explosivitet: det viktiga är inte vilken rörelse — utan hur snabbt du accelererar efteråt.",
          tarina: "En ung spelare flyttade som 12-åring långt hemifrån till en akademi och var så hemsjuk att han övervägde att sluta. Han lade all sin energi på träningen och stannade alltid kvar sist på planen.",
          viikkotavoite: "Rörelse + 5 m acceleration under 2 sekunder"
        },
        vk3: {
          nimi: "1v1 — passiv försvarare",
          ohje_leikkija: "Kompisen står framför, rör sig inte. Använd U-vändning eller sax för att passera honom! 20 gånger. Överraska kompisen.",
          ohje_rakentaja: "Kompisen passiv: gör rörelsen → passera → accelerera. Kompisen får röra sig långsamt men tar inte bollen. 20 repetitioner med vald rörelse + 10 repetitioner med fritt val.",
          ohje_showcase: "Halvaktiv försvarare (får röra sig men inte tackla): passera med hjälp av de inlärda rörelserna. 25 repetitioner. Vilken rörelse fungerar bäst för dig?",
          cue: "Nivå 2: rörelsen måste fungera i full fart innan man går över till full 1v1.",
          tarina: "En tonåring ville träna så hårt att han smög sig in i gymmet som var förbjudet för unga — tills tränarna märkte det och låste dörren. Ivern var outsläcklig.",
          viikkotavoite: "Passera en passiv försvarare 15/20 gånger med vald rörelse"
        },
        vk4: {
          nimi: "1v1-mätning — fungerar det i match?",
          ohje_leikkija: "Spela 1v1 med en kompis i 10 min. Räkna: hur många gånger passerade du? Vilken rörelse använde du bäst?",
          ohje_rakentaja: "Full 1v1: 10 min spel. Räkna passeringarna. Utvärdera: vilken rörelse fungerade, vilken inte? Träna den svaga rörelsen 10 min till.",
          ohje_showcase: "Full 1v1-match 15 min + självutvärdering: av de inlärda rörelserna, vilka 3 finns redan i ditt register? Vilka behöver mer arbete?",
          cue: "Speltest: fungerar rörelsen i en riktig match? Om inte — gå tillbaka till vecka 1.",
          tarina: "En ung spelare imponerade så starkt i en träningsmatch — passerade den ena försvararen efter den andra — att motståndarlagets tränare vägrade gå därifrån utan att spelaren värvades till hans klubb.",
          viikkotavoite: "Minst 1 lyckad passering per spelsituation"
        }
      },
      "beckham": {
        teema: "Passning och skott",
        kuvaus_leikkija: "Skicka bollen precist",
        kuvaus_rakentaja: "Insidan + vristen — alla passningssätt",
        kuvaus_showcase: "Maestro — 11 passnings- och skottekniker",
        vk1: {
          nimi: "Insidepassning — precis och repeterbar",
          ohje_leikkija: "Skicka bollen mot väggen och försök träffa samma punkt 10 gånger i rad. Stödbenet bredvid bollen — inte bakom! Räkna ditt rekord.",
          ohje_rakentaja: "Insidepassning 20 repetitioner: stödbenet bredvid bollen | fotleden låst | träff mitt på bollen. Sedan vristen längs marken 20 repetitioner: hela vristens ovansida träffar bollen. Mät precisionen.",
          ohje_showcase: "Passningsserie form 1–3: insidan | vristen längs marken | rak luftpassning. 15 × vardera. Mät: träffpunkten på bollen (ska vara mitten).",
          cue: "Maestros regel: stödbenet avgör riktningen, vristen avgör farten.",
          tarina: "Pappan till en spelare som senare blev känd för sina passningar handledde honom i parken till sena kvällar och gav en liten belöning för varje träff i ribban. Pojken upprepade skotten hundratals gånger på en kväll — precisionen föddes ur de repetitionerna.",
          viikkotavoite: "10 insidepassningar i rad till samma punkt"
        },
        vk2: {
          nimi: "Passning — avstånden ökar",
          ohje_leikkija: "Passa på 5 meter, sedan 10 meter, sedan 15 meter. Samma rörelse, bollen följer med! Vilken fot är mer precis?",
          ohje_rakentaja: "Passningsprogression: 10 m | 15 m | 20 m — insidan och vristen. Mät precisionen på varje avstånd. Mål: 8/10 träffar målet.",
          ohje_showcase: "Lång passning (bågformad/skruvad, form 5) + utsidepassning längs marken (form 6). 15 repetitioner vardera. Mät bågen och precisionen.",
          cue: "Tekniskt skickliga spelare håller bollen i rörelse på varje avstånd.",
          tarina: "En spelare känd för sina passningar vann en stor tekniktävling som 11-åring och fick som pris åka på ett läger utomlands — där uppmärksammades han och lotsades mot en toppklubb. Framgången i tekniktävlingen öppnade dörren.",
          viikkotavoite: "20 m insidepassning 8/10 träffar målet"
        },
        vk3: {
          nimi: "Passning med en kompis — till ett rörligt mål",
          ohje_leikkija: "Kompisen springer — passa så att bollen kommer framför honom! Inte bakom. 15 gånger med vardera foten.",
          ohje_rakentaja: "Kompisen springer i kryss — passa framåt in i ytan, inte till spelaren själv. 20 passningar. Sedan: kort växelspel (1-2-kombination, form 10) — passa, spring, få tillbaka.",
          ohje_showcase: "Djupledspassning med utsidan (form 11) + inlägg mot mål (form 9). 10 × vardera. Precision: träffar du löpningskorridoren?",
          cue: "Passningen är kommunikation — bollen talar om för lagkamraten vart han ska.",
          tarina: "Som tonåring gick en spelare med i en toppklubb och tränade med en begåvad ungdomsgrupp, där många senare nådde världstoppen. Tillsammans vann de ett ungdomsmästerskap — att växa tillsammans lyfte alla.",
          viikkotavoite: "Passning till rörligt mål 12/20 rätt tajmade"
        },
        vk4: {
          nimi: "Passningsmätning",
          ohje_leikkija: "Räkna: hur många gånger skickar du bollen precist på 10 meter? Gör 20 passningar och räkna poängen.",
          ohje_rakentaja: "Passningsutmaning: 20 passningar, olika avstånd (10/15/20 m). Räkna poäng: precis träff = 1 p. Jämför: är du bättre än i början av december?",
          ohje_showcase: "Passningsserie 11 former — hur många behärskar du redan? Gå igenom och utvärdera dig själv. Träna de 2 svagaste 10 min.",
          cue: "Femte veckans princip — träna det där resultatet blev svagast.",
          tarina: "En tränare till en spelare känd för sina passningar rådde honom att titta på hur de bästa slår bollen: en mjuk rörelse med båda fötterna. Han tränade skottet med båda fötterna så länge att höger och vänster till slut var lika precisa.",
          viikkotavoite: "Passningsutmaning 15/20 poäng"
        }
      },
      "perus": {
        teema: "Daglig bollkontakt",
        vk1: {
          nimi: "Bollek — gör det du gillar",
          ohje_leikkija: "Ta bollen och gå ut. Studsa mot väggen, för bollen, lek! 15 minuter — inga regler.",
          ohje_rakentaja: "Välj en: väggpassning 100 × 1 touch | slalomdribbling med koner 15 min | jonglering med svaga foten 5 min.",
          ohje_showcase: "Krävande teknik: väggpassning med 1 touch + scanna samtidigt omgivningen — namnge 3 saker innan mottagningen. 20 min.",
          cue: "\"Daily touches\" — boll varje dag, även på vilodagar.",
          tarina: "I världens bästa akademier rör varje spelare bollen varje dag — även på vilodagar. Generation efter generation har toppspelarna börjat med samma regel: bollen vid foten varenda dag.",
          viikkotavoite: "Ta en bollkontakt varje dag"
        }
      }
    },

    // ══ PANKKI.D (FLEI-ketjujen päivittäiset harjoitteet — arrayt) ═══════
    D: {
      sbl: [
        { nimi: "Hopprep + tåhävningar",
          ohje_leikkija: "Hoppa rep i 15 sekunder — tårna i marken, inga hälar! Res dig sedan på tå på kanten av en stolpe, upp och ner 10 gånger. Du känner vaden.",
          ohje_rakentaja: "Repphopp 3×15 s med framfotskontakt. Sedan på kanten av en stolpe: upp på tå → hälen långsamt ner över kanten 3×10. Mjukt.",
          ohje_showcase: null,
          cue: "Vaden och hälsenan är din snabbhets fjäder. Daglig aktivering håller dem smidiga.",
          phv: "Repphopp 2×10 s lätt. Hoppa över det excentriska." },
        { nimi: "Repphopp + excentrisk vad",
          ohje_leikkija: "Hoppa rep eller låtsas att du har ett rep 2x15 sekunder — håll dig på tå! Ställ dig sedan på kanten av en trappa: res dig på tå och sänk hälarna långsamt ner. 8 gånger. Det här håller fotlederna starka.",
          ohje_rakentaja: "Repphopp 3×15 s med framfotskontakt (ingen häl i marken). På kanten av en stolpe: upp på tå → hälen långsamt ner under kanten. 3×10. Inte till smärta.",
          ohje_showcase: "Repphopp 3×15 s — följ rytmen, inte hastigheten. Excentrisk vad på kanten av en stolpe 3×10 kontrollerat. SBL: bakre kedjan aktiveras från fotsulan till ryggen.",
          cue: "Bakre kedjan börjar i fotsulan. Daglig aktivering förebygger spänningar innan de uppstår.",
          phv: "Repphopp 2×10 s lätt. Excentrisk vad bort — sen-benfästet är känsligt." }
      ],
      sfl: [
        { nimi: "Öppna höften + utfallsgång",
          ohje_leikkija: "Sätt knäet i marken, andra benet framåt. Luta bäckenet framåt tills du känner en stretch framtill. Håll i 30 sekunder, byt. Sedan stor utfallsgång 10 steg.",
          ohje_rakentaja: "Höftböjare 90/90: knäet i marken, framknäet 90°. Framåt tills stretch i höften. 2×30 s per sida. Sedan utfallsgång 2×10 m.",
          ohje_showcase: null,
          cue: "Höften styr frånskjutet. Om höften inte öppnas blir explosiviteten bara halv.",
          phv: "Enbart 90/90-stretch 3×30 s. Ingen knäböj — främre delen av knäet är känslig." },
        { nimi: "Höftböjare + utfallsgång",
          ohje_leikkija: "Gå ner på knä och skjut bäckenet framåt — du känner en stretch framtill på låret. 30 sekunder per sida. Gå sedan med stora steg 10 m: kliv långt och sänk knäet nära marken. 2 gånger.",
          ohje_rakentaja: "Höftböjare 90/90 2×45 s per sida: knäet i marken, framåt tills du känner en stretch. Sedan utfallsgång 2×10 m — stort steg, knäet nära golvet.",
          ohje_showcase: "Höftböjare 90/90 2×45 s per sida. Utfallsgång 2×10 m. SFL: höftböjare → quadriceps. Sparken startar i höften.",
          cue: "Höften styr frånskjutet. Om höften inte öppnas stannar starten på halva vägen — alltid.",
          phv: "Enbart 90/90-stretch 3×30 s per sida. Ingen knäböj." }
      ],
      ll: [
        { nimi: "Musselövning + sidoplanka",
          ohje_leikkija: "Ligg på sidan, knäna ihop. Öppna det övre knäet uppåt som en mussla — men håll bäckenet stilla! 12 gånger, byt sedan. Sedan sidoplanka på armbågen 20 sekunder per sida.",
          ohje_rakentaja: "Clamshell i sidoliggande 2×12 per sida: knäna ihop, öppna det övre knäet uppåt (bäckenet får inte falla). Sedan sidoplanka 2×20 s per sida.",
          ohje_showcase: null,
          cue: "De här musklerna håller knäet rakt i riktningsförändringar. Liten rörelse, stor effekt.",
          phv: "Normalt — isometriska övningar är säkra." },
        { nimi: "Clamshell + sidoplanka",
          ohje_leikkija: "Lägg dig på sidan, knäna böjda. Öppna det översta knäet uppåt som en mussla — bäckenet stilla! 10 gånger per sida. Sedan sidoplanka: luta dig mot armbågen och lyft bäckenet upp i luften 15 sekunder per sida.",
          ohje_rakentaja: "Clamshell 2×12 per sida: i sidoliggande, knäna ihop, öppna uppåt (bäckenet stilla). Sedan sidoplanka 2×20 s per sida: kroppen rak från sidan.",
          ohje_showcase: "Clamshell 2×12 med gluteus medius-aktivering. Sidoplanka 2×20 s. LL: gluteus medius förhindrar valguskollaps i riktningsförändringar.",
          cue: "Sidostabilitet håller knäet i linje. Det här är det bästa förebyggandet för ACL.",
          phv: "Normalt — isometriska övningar är säkra." }
      ],
      diag: [
        { nimi: "Väggpassning — båda fötterna",
          ohje_leikkija: "Skicka bollen till väggen med höger fot — ta emot med vänster. Sedan tvärtom. 20 gånger per fot. Håll bollen nära!",
          ohje_rakentaja: "Väggpassning med växelvis fot 3×20: passa med höger, ta emot med vänster, tillbaka. Bollen håller sig på marken. 1 touch per fot.",
          ohje_showcase: null,
          cue: "Bröstkorgen styr — foten följer automatiskt. DIAG: passning är en övning för både rotationskedjan och kombinationskedjan samtidigt.",
          pallo_yhteys: "Passning 🎯 DIAG huvudkedja — Liikanen 2025: +13% förutsägare för professionell nivå.",
          phv: "Normalt — teknikövningar med boll är alltid säkra." },
        { nimi: "Väggpassning + jonglering — DIAG dagligen",
          ohje_leikkija: "Passa bollen mot väggen med växelvis fot 2x20 gånger — tillbaka med en touch. Jonglera sedan bollen med fötterna 1 minut utan paus. Testa båda fötterna!",
          ohje_rakentaja: "Väggpassning med växelvis fot 3×20 (1 touch tillbaka). Sedan jonglering 3×1 min: båda fötterna växelvis, räkna högt. Mål 20+ per min.",
          ohje_showcase: "Väggpassning 3×20 med växelvis fot — 1 touch, ingen paus. Jonglering 3×1 min. SL: rotationskedjan startar i bröstkorgen. Mät jongleringar per min.",
          cue: "Forsman 2013: jonglering + passning särskilde talangfulla i alla åldersklasser. Båda är DIAG-övningar.",
          pallo_yhteys: "Jonglering 🎯 DIAG huvudkedja (DFL stödjande) — daglig integrationsövning.",
          phv: "Normalt — övningar med boll är alltid säkra." }
      ],
      dfl: [
        { nimi: "Andning + katt-ko",
          ohje_leikkija: "Ställ dig på alla fyra. Andas in djupt — svanka ryggen uppåt som en katt som fräser. Andas ut — svanka ryggen nedåt som en ko. Gör 8 gånger lugnt. Sedan flyg: en arm och motsatt ben rakt ut 8 gånger.",
          ohje_rakentaja: "Cat-cow på alla fyra 3×8: in → rygg upp (cat), ut → rygg ner (cow). Sedan dead bug 3×5 per sida: i ryggliggande, ländryggen mot golvet, sänk motsatt arm + ben långsamt.",
          ohje_showcase: null,
          cue: "Andningen är kroppens grund. När du andas rätt stärks ryggen automatiskt.",
          phv: "Särskilt viktig under PHV — en djup core stöder den växande ryggen." },
        { nimi: "360° andning + dead bug",
          ohje_leikkija: "Lägg dig på rygg. Andas in så att magen och sidorna buktar ut — som om du fyller en ballong! 5 gånger. Sedan: lyft armarna och benen upp, sträck ut motsatt arm och ben långsamt. 8 gånger per sida. Ryggen håller sig mot golvet!",
          ohje_rakentaja: "360° diafragmaandning 3×5: andas in så att magen, sidorna OCH ryggen vidgas. Dead bug 3×5 per sida: ländryggen mot marken hela tiden, sänk motsatt arm + ben långsamt.",
          ohje_showcase: "360° diafragmaandning 3×5. Dead bug 3×5 per sida — ländryggen hela tiden mot marken. DFL: diafragman är den enda muskeln som fungerar både som andningsmuskel och bäckenstabilisator.",
          cue: "DFL:s kärna är diafragman. Kolar 2012: en djup core är grunden för all annan rörelse.",
          phv: "Särskilt viktig under PHV — normalt eller öka antalet repetitioner." }
      ],
      pig: [
        { nimi: "Titta före — väggboll",
          ohje_leikkija: "Skicka bollen till väggen. INNAN bollen kommer tillbaka — titta dig omkring och nämn en sak du ser. Ta sedan emot bollen. 3 minuter. Kul? Testa att nämna saker snabbare!",
          ohje_rakentaja: "Väggpassning 3×2 min: passa, titta upp och nämn 1 sak före mottagningen. Gör det svårare: 3 saker, nämn sedan färg och form.",
          ohje_showcase: null,
          cue: "Blicken upp före touchen — det gör de bästa automatiskt. Vi lär oss det nu.",
          phv: "Kognitiva övningar är precis rätt val under PHV." },
        { nimi: "Scanningsrutin — titta först",
          ohje_leikkija: "Passa bollen mot väggen i 2 minuter. INNAN du tar emot bollen, titta snabbt bakåt och nämn högt något du ser. Passa sedan. Upprepa — försök titta varje gång!",
          ohje_rakentaja: "Väggpassning 3×2 min: passa, INNAN mottagningen titta upp och nämn 3 saker omkring dig. Öka hastigheten progressivt inom setet.",
          ohje_showcase: "Väggpassning 3×2 min — pre-scanning: titta upp och nämn 3 saker före mottagningen. Öka hastigheten. ADAR: Anticipation-fasen. Mät: hur många gånger blicken upp per 2 min.",
          cue: "Vaeyens 2007: pre-scanning särskiljer eliten från subeliten bättre än fysiken.",
          phv: "Kognitiva övningar är det BÄSTA valet under PHV." }
      ]
    },

    // ══ PANKKI.S (FLEI-ketjujen voimaharjoitteet — ketju→[{vk,stage_tasot}]) ══
    // (dedupattu: agentit 3+4 käänsivät saman S:n; tässä yksi kopio)
    S: {
      sbl: [
        { vk: 'parillinen', stage_tasot: [
          { nimi: "Reaktionsstart — bollen i marken",
            ohje_leikkija: "Kasta bollen i marken — när den studsar, spring för fullt 15 meter! Gör 5 gånger, vila sedan en stund och upprepa 3 gånger. Vem är snabbast?",
            ohje_rakentaja: "Kasta bollen i golvet, starta GENAST när den nuddar marken. 5×3 starter i full fart 15 m. Återhämtning genom att gå. Räkna din startreaktion.",
            ohje_showcase: null,
            cue: "Första steget avgör — reaktion är inte medfödd, den tränas fram.",
            phv: "3 starter per set på 70 % intensitet. Bakre kedjan växer — vi överbelastar inte." },
          { nimi: "Reaktionsstart + bollkontroll",
            ohje_leikkija: "Placera bollen 5 m framför dig. Kompisen ropar \"NU!\" och du springer till bollen för fullt, tar emot den och för bollen 15 m. 5 repetitioner. Byt den som ropar! Vem är snabbast?",
            ohje_rakentaja: "Bollen 5 m framför — explosiv start, ta emot och för bollen 15 m. 6 repetitioner med full återhämtning. Bollen utlöser starten — vi väntar inte.",
            ohje_showcase: "Bollen 5 m framför. Reaktiv sprint → mottagning → för bollen 15 m. 6 repetitioner / full återhämtning. Följ upp: förbättras reaktionstiden eller inte?",
            cue: "Starten i spelet börjar med en stimulus — boll, spelare, rop. Träna just det.",
            phv: "4 repetitioner på 70 % intensitet. Med boll — den tekniska delen är trygg." },
          { nimi: "Reaktionsstart + skott mot mål",
            ohje_leikkija: "Bollen framför dig, kompisen ropar — spring till bollen, för den och skjut mot mål! 5 repetitioner. Sikta mot hörnen!",
            ohje_rakentaja: null,
            ohje_showcase: "Bollen 5 m framför → sprint → mottagning → för bollen 15 m → skott mot mål. 6 repetitioner. Mät: träffpunkt i målet (hörn högt / hörn lågt / mitten). Skottprecisionen registreras.",
            cue: "Stage 5: inte bara snabbhet utan precision under press. Detta är en spelsituation.",
            phv: "4 repetitioner på 70 % intensitet." }
        ]},
        { vk: 'pariton', stage_tasot: [
          { nimi: "Femstegshopp — hur långt?",
            ohje_leikkija: "Hoppa fem gånger i rad så långt du kan! Ta sats med båda fötterna, landa på båda fötterna. Mät med handen eller leta efter ett märke i marken. Försök tre gånger — blir det längre?",
            ohje_rakentaja: "Femstegshopp från stående 3 gånger — mät eller uppskatta sträckan. Sedan 3×30 m sprint med full återhämtning (2 min). Registrera resultaten.",
            ohje_showcase: null,
            cue: "Liikanen & Törmä 2025: femstegshoppet särskilde dem som nådde proffsnivå. Mät var du står.",
            phv: "Bara hoppen 2×3 lätt. Utelämna sprinten." },
          { nimi: "Femstegshopp på tid + Nordic curl",
            ohje_leikkija: "Hoppa framåt med 5 långa språng — vem kommer längst? 3 gånger. Sedan: sätt dig på knä och fall långsamt framåt med händerna framför, tryck tillbaka dig själv med händerna. 5 gånger. Det känns i baksida lår!",
            ohje_rakentaja: "Femstegshopp 3× på max, mät sträckan. Sedan Nordic curl med stöd: en partner eller vägg håller hälarna, sänk dig LÅNGSAMT framåt 3×5. Kom tillbaka med händerna.",
            ohje_showcase: "Femstegshopp 3× — mät och jämför med föregående gång. Nordic curl excentrisk 3×5: sänk kontrollerat, kom tillbaka med händerna. SBL: hamstring excentriskt = skadeskydd.",
            cue: "Petersen 2011: Nordic hamstring-programmet minskade hamstringskador med 51 %.",
            phv: "Bara femstegshopp 2×3 lätt. Utan Nordic curl." },
          { nimi: "Femstegshopp + Nordic curl fullt",
            ohje_leikkija: "Hoppa med 5 långa språng — mät sträckan! 3 gånger. Sätt dig sedan på knä och fall långsamt framåt utan hjälp, tryck tillbaka med händerna. 5 gånger.",
            ohje_rakentaja: null,
            ohje_showcase: "Femstegshopp 3× — registrera sträckan, jämför med säsongsstarten. Nordic curl fullt 3×5 (utan handstöd). SBL excentriskt på toppnivå. Följ asymmetrin: höger vs vänster.",
            cue: "Stage 5: självständig kvalitetsbedömning. Asymmetri > 10 % = sidoskillnad som ska åtgärdas.",
            phv: "Bara hoppen 2×2. Ingen Nordic curl under PHV." }
        ]}
      ],
      ll: [
        { vk: 'parillinen', stage_tasot: [
          { nimi: "T-bana — ta tid",
            ohje_leikkija: "Placera 4 markörer i form av ett T. Spring framåt, sedan i sidled, sedan tillbaka. Ta tid med telefonen! Försök 4 gånger. Blev tiden bättre?",
            ohje_rakentaja: "T-bana med 4 koner: framåt 5 m, i sidled 2.5 m + 2.5 m, bakåt 5 m. Ta tid 4× med full återhämtning. Mål: förbättra 0.1 s per vecka.",
            ohje_showcase: null,
            cue: "Tre steg i inbromsningen — inte ett. Första steget i den nya riktningen avgör.",
            phv: "Normal — T-banan är trygg. Inga riktningsförändringar i maxfart ända till smärtgränsen." },
          { nimi: "T-bana med boll + reaktion",
            ohje_leikkija: "Gör en T-formad bana (10 m framåt, sedan 5 m åt höger och vänster). För bollen genom T:et 4 gånger — bollen håller sig nära foten! Ta tid och försök förbättra.",
            ohje_rakentaja: "T-bana med boll — bollen håller sig nära i vändningarna. 4 repetitioner, ta tid. Sedan reaktions-riktningsförändring: partnern pekar ut riktningen, starta genast. 6× per sida.",
            ohje_showcase: "T-bana med boll 4× — ta tid, jämför med utan boll. Reaktions-riktningsförändring 6× per sida. Skillnaden mellan med och utan boll berättar om den tekniska nivån.",
            cue: "Forsman 2013: slalomdribbling + reaktion särskilde de talangfulla. Boll + riktningsförändring = fotbollens kärna.",
            phv: "Normal — teknik med boll är alltid trygg." },
          { nimi: "T-bana + 1v1-fint",
            ohje_leikkija: "För bollen genom T-banan 3 gånger för fullt! Spela sedan 1 mot 1 på en liten yta — försök passera kompisen med en fint. 2 minuter åt gången.",
            ohje_rakentaja: null,
            ohje_showcase: "T-bana på maxintensitet 3×. Sedan 1v1-spel på en liten yta (5×5 m): passera motståndaren med en fint 3×2 min. Spelet avgör — inte övningsnumret.",
            cue: "Stage 5: teknik under press. Spelsituationen är den bästa läraren.",
            phv: "T-bana på 70 % intensitet. 1v1 normal — spelkontext är alltid ok." }
        ]},
        { vk: 'pariton', stage_tasot: [
          { nimi: "Sidohopp + skridskosteg",
            ohje_leikkija: "Hoppa i sidled på ett ben 8 gånger per ben — som en skridskoåkare! Glid sedan i sidled i knäböj 20 meter. Känner du vaderna och låren?",
            ohje_rakentaja: "Laterala hopp 3×8 per sida: hoppa i sidled, landa kontrollerat, stabilisera före nästa. Sedan skridskosteg 2×20 m: bred glidning i sidled i knäböj.",
            ohje_showcase: null,
            cue: "3 steg i inbromsningen — sidorörelsen är fotbollens mest undertränade egenskap.",
            phv: "2×5 per sida lätt." },
          { nimi: "Enbenslandning i sidled + håll",
            ohje_leikkija: "Hoppa i sidled på ett ben och landa kontrollerat — håll stilla i 2 sekunder! Knät pekar rakt framåt, inte inåt. 5 gånger per ben, 3 varv.",
            ohje_rakentaja: "Hoppa i sidled på ett ben → sänk kontrollerat till knäböj → håll 2 s. Knät rakt över foten — inte inåt! 5 repetitioner per ben × 3 set.",
            ohje_showcase: "Lateral enbenslandning 5× per ben × 3 set. Håll 2 s. Följ upp: knä inåt = svag gluteus medius. Valguskollaps = ACL-risk.",
            cue: "Valguskollaps vid landning är det mekaniska momentet för en ACL-skada. Gluteus medius förhindrar den.",
            phv: "Bara sidosteg med landning — inget hopp. 3×5 per ben." },
          { nimi: "Reaktivt enbenshopp — utan håll",
            ohje_leikkija: "Hoppa i sidled och genast tillbaka — snabbt som en pingisboll! 8 hopp per riktning, 3 varv. Håll balansen!",
            ohje_rakentaja: null,
            ohje_showcase: "Reaktivt sidohopp utan håll: hoppa i sidled → omedelbart tillbaka. 3×8 per riktning. Kontakttid, mål under 0.3 s. Balansbräda vid landning (Everton Stage 5).",
            cue: "Stage 5: reaktivt — kontakttiden avgör. Balansbrädan lägger till den proprioceptiva utmaningen.",
            phv: "Långsamt rytmiskt hopp 3×6. Ingen maxfart." }
        ]}
      ],
      dfl: [
        { vk: 'parillinen', stage_tasot: [
          { nimi: "Planka + \"flygande hund\"",
            ohje_leikkija: "Planka på armbågarna 20 sekunder — kroppen rak som en bräda, skinkorna ner! Sedan \"flygande hund\": stå på alla fyra, lyft motsatt arm + ben rakt ut. 8 gånger per sida.",
            ohje_rakentaja: "Planka 3×20 s + sidoplanka 3×15 s per sida. Sedan bird dog 3×8 per sida: stå på alla fyra, motsatt arm + ben långsamt rakt ut.",
            ohje_showcase: null,
            cue: "Kroppen är en kedja — en svag bål betyder att energi går förlorad i varje rörelse.",
            phv: "Normal — isometriska övningar är den bästa träningsgruppen under PHV." },
          { nimi: "Progressiv planka + balans",
            ohje_leikkija: "Planka: luta dig på armbågarna och håll kroppen rak i 30 sekunder. Sedan sidoplanka 20 sekunder per sida. Bird dog: i fyrfotastående sträck ut motsatt arm och ben 8 gånger per sida. Till sist, stå på ett ben med slutna ögon i 20 sekunder!",
            ohje_rakentaja: "Planka 3×30 s → ökar med 10 s varje vecka. Sidoplanka 3×20 s per sida. Bird dog 3×8. Sedan enbensstående med slutna ögon 3×20 s.",
            ohje_showcase: "Planka 3×35 s. Sidoplanka 3×25 s per sida. Bird dog 3×10. Enbensstående med slutna ögon 3×25 s. Följ plankans längd — mål 20 s → 60 s på 6 veckor.",
            cue: "McGill 2010: planka + sidoplanka + bird dog = kliniskt validerad grundrutin.",
            phv: "Normal eller fler repetitioner." },
          { nimi: "Björngång + pistolknäböj",
            ohje_leikkija: "Björngång: gå på alla fyra 10 m framåt — höften ska inte svaja! 2 gånger. Sedan enbensknäböj mot väggen: sänk dig långsamt ner och res dig upp. 5 gånger per ben.",
            ohje_rakentaja: null,
            ohje_showcase: "Björngång 2×10 m (Everton Stage 1→4: höften svajar inte). Sedan pistolknäböj utan vägg 3×5 per ben. Sedan balans på ett ben med boll 3×30 s. DFL-toppnivå.",
            cue: "Stage 5: dynamisk bål + unilateral styrka + balans med boll. Allt i ett.",
            phv: "Björngång normal. Pistolknäböj → pistolknäböj mot väggen." }
        ]},
        { vk: 'pariton', stage_tasot: [
          { nimi: "Balans + magknip i farten",
            ohje_leikkija: "Stå på ett ben så länge du kan! Byt sedan. Ligg sedan på rygg: sänk det ena benet långsamt mot golvet — men inte ända ner! Upprepa 8 gånger per ben.",
            ohje_rakentaja: "Enbensstående 3×30 s per ben. Sedan \"leg lowering\" 3×8 per ben: liggande på rygg, sänk benet långsamt mot golvet (ländryggen stannar mot golvet).",
            ohje_showcase: null,
            cue: "Balansen förbättras bara genom att utmana balansen. Ett ben är den nivå som behövs på planen.",
            phv: "Normal — balansövningar är trygga." },
          { nimi: "Enbensbalans med slutna ögon + pistolknäböj",
            ohje_leikkija: "Stå på ett ben och blunda — testa att hålla i 30 sekunder per ben! 3 gånger. Sedan enbensknäböj mot väggen långsamt 5 gånger per ben.",
            ohje_rakentaja: "Enbensstående med slutna ögon 3×30 s per ben. Sedan pistolknäböj mot väggen 3×5 per ben — långsamt och kontrollerat. Kvalitet före snabbhet.",
            ohje_showcase: "Enbensstående med slutna ögon 3×35 s. Pistolknäböj mot väggen → mål utan vägg 3×5. DFL: balans + unilateral styrka i ett.",
            cue: "Slutna ögon fördubblar utmaningen. DFL måste jobba — man kan inte fuska.",
            phv: "Normal." },
          { nimi: "Balansbräda + björngång + pistolknäböj",
            ohje_leikkija: "Stå på ett ben på en kudde 30 sekunder per ben. Sedan björngång 10 m (på alla fyra, höften stilla). Till sist enbensknäböj mot väggen 5 gånger per ben.",
            ohje_rakentaja: null,
            ohje_showcase: "Enbens balansbräda 3×30 s. Björngång 2×10 m (höften stilla). Pistolknäböj utan stöd 3×5. DFL Stage 5 — alla tre i samma pass.",
            cue: "Stage 5: autonom stabilitet. Kroppen korrigerar själv utan medveten kontroll.",
            phv: "Balansbräda → fast underlag. Pistolknäböj mot väggen." }
        ]}
      ],
      diag: [
        { vk: 'parillinen', stage_tasot: [
          { nimi: "Titta & namnge — väggboll",
            ohje_leikkija: "Skicka bollen mot väggen. Innan den kommer tillbaka — titta dig omkring och namnge TRE saker du ser. Ta sedan emot bollen. 5 minuter. Kul! Gör du det snabbare än din kompis?",
            ohje_rakentaja: "Väggboll 5 min: passa, titta upp och namnge 3 saker runt omkring FÖRE mottagningen. Öka farten progressivt.",
            ohje_showcase: null,
            cue: "Blicken upp före touchen — denna enda rutin skiljer en bra spelare från en utmärkt.",
            phv: "Kognitiva övningar är BÄST under PHV." },
          { nimi: "Beslutsfattande med siffror",
            ohje_leikkija: "Stå 10 m från väggen. Kompisen visar en siffra med fingrarna (1-4): 1=vänster, 2=höger, 3=upp, 4=ner. Passa genast dit siffran säger! 2 minuter, sedan byte. Vem reagerar snabbast?",
            ohje_rakentaja: "Stå 10 m från väggen. Ett papper i handen (1=vänster 2=höger 3=upp 4=ner). Lyft en siffra → passa GENAST i rätt riktning. 4×2 min. Öka farten progressivt.",
            ohje_showcase: "Reaktivt beslutsfattande 4×2 min: siffra → passning under 0.5 s. Följ upp: hur många rätta reaktioner per 2 min? Öka farten varje set.",
            cue: "Moran 2012: förmågan att fatta beslut under press går att lära ut. Detta tvingar fram ett reaktivt val.",
            phv: "Normal." },
          { nimi: "ADAR Honey Trap",
            ohje_leikkija: "Väggpassning — men ibland kastar kompisen en annan boll åt ett annat håll! Reagera genast på den nya bollen. 3 minuter åt gången, 3 varv. Hur många rätta reaktioner fick du?",
            ohje_rakentaja: null,
            ohje_showcase: "Väggpassning — ibland kastas en annan boll oväntat åt ett annat håll. Reagera omedelbart på den nya bollen. 3×3 min. Registrera: rätta reaktioner / 10 situationer. ADAR: alla 4 faser samtidigt.",
            cue: "Stage 5 ADAR: Anticipation → Decision → Action → Recovery. Spelsituation för fullt.",
            phv: "Normal." }
        ]},
        { vk: 'pariton', stage_tasot: [
          { nimi: "Fellek — reagera genast",
            ohje_leikkija: "Väggboll: försök MED FLIT göra en dålig passning — reagera sedan genast! Stanna inte upp efter ett misstag. 3 minuter. I spelet blir det misstag — vi tränar på att reagera på dem!",
            ohje_rakentaja: "Väggpassning 3×1 min: gör med flit en felaktig passning (för hård, fel riktning), reagera omedelbart. Stanna inte upp efter ett misstag.",
            ohje_showcase: null,
            cue: "Moran 2012: förmågan att ignorera störande stimuli är ett kännetecken för en toppspelare. Misstag → reagera → fortsätt.",
            phv: "Normal." },
          { nimi: "Spelförståelsevideo + skanning",
            ohje_leikkija: "Titta i 5 minuter på matchklipp av din favoritfotbollsspelare — lägg märke till vart hen tittar innan hen får bollen. Skriv ner 2 iakttagelser. Sedan väggpassning i 2 minuter och titta alltid upp före mottagningen!",
            ohje_rakentaja: "Titta 5 min på en toppspelares video (samma position). Registrera 2 iakttagelser om hur de använder blicken. Sedan väggpassning med skanning 3×2 min.",
            ohje_showcase: "Titta 5 min på video (egen match eller toppspelare). Registrera: hur ofta tittar spelaren upp per minut? Sedan ADAR-skanning 3×2 min. Jämför ditt eget med videon.",
            cue: "ADAR: Anticipation. Mental träning + fysisk träning = snabbast utveckling.",
            phv: "Normal." },
          { nimi: "Dual-task väggrondo",
            ohje_leikkija: "Passa bollen mot väggen med en touch och räkna samtidigt jämna tal högt (2, 4, 6, 8...). Om det blir rörigt — det gör inget, fortsätt! 3 minuter, 3 varv.",
            ohje_rakentaja: null,
            ohje_showcase: "Väggrondo + kognitiv uppgift: passa med 1 touch samtidigt som du räknar jämna tal högt (2,4,6...). 3×3 min. Misstag i det kognitiva eller tekniska → fortsätt ändå.",
            cue: "Dual-task: hjärnan måste dela sin uppmärksamhet. Detta är vad som händer i spelet hela tiden.",
            phv: "Normal." }
        ]}
      ],
      sfl: [
        { vk: 'parillinen', stage_tasot: [
          { nimi: "Höftböjarstretch + utfallsgång",
            ohje_leikkija: "Sätt ett knä i marken, andra benet framåt. Luta höften framåt tills du känner stretchen framtill. Håll i 30 sekunder! Sedan stora utfallssteg, 10 steg framåt.",
            ohje_rakentaja: "Höftböjare 90/90: knä i marken, främre knät 90°. Luta höften framåt 2×30 s per sida. Sedan gående utfall 2×10 m — stort steg, knät nära golvet.",
            ohje_showcase: null,
            cue: "Höftböjaren är spelarens broms. En spänd höftböjare = långsam start, minskad steglängd.",
            phv: "Normal — stretchövningar är alltid trygga. Knäböjens omfång kan begränsas." },
          { nimi: "Höftböjare 90/90 + utfall-acceleration",
            ohje_leikkija: "Sätt dig på knä och skjut höften framåt 30 sekunder per sida — du känner stretchen i låret. Gå sedan med stora steg 10 m (knät nära marken). Till sist spring 4x15 m acceleration — starta explosivt!",
            ohje_rakentaja: "Höftböjare 90/90 2×45 s per sida. Sedan: gående utfall 2×10 m, och till sist 4×15 m acceleration — första steget från höften, inte från knät. Räkna: hur snabbt är du i full fart?",
            ohje_showcase: "Höftböjare 90/90 2×45 s. Utfall 2×10 m. SFL-acceleration: 4×15 m — bedöm reaktiviteten på de första 5 m. Höften styr, knät följer.",
            cue: "En toppakademis mätning: de första 5 m förutspår spelsituationers snabbhet bättre än 30 m.",
            phv: "2×30 s stretch + 3×10 m utfallsgång. Utelämna accelerationerna." },
          { nimi: "Thomas-stretch + spelspecifika accelerationsset",
            ohje_leikkija: "Stretcha lårets framsida 30 sekunder per sida (sätt dig på knä, skjut höften). Sedan 4 gånger: kompisen kastar bollen och du springer ikapp den för fullt 10 m. Vem får bollen först?",
            ohje_rakentaja: null,
            ohje_showcase: "Thomas-stretch 2×45 s per sida + 90/90 2×45 s. Sedan spelspecifikt: 6×10 m acceleration från en reaktionsstimulus (boll, handsignal). Mät: förbättras tiden till de första 5 m under säsongen?",
            cue: "Stage 5: höftböjarens rörlighet + explosiv reaktivitet i spelet. Båda i samma pass.",
            phv: "3×30 s stretch + 3 reaktiva accelerationer på 70 % intensitet." }
        ]},
        { vk: 'pariton', stage_tasot: [
          { nimi: "Pistolknäböj-progression — enbens",
            ohje_leikkija: "Stå på ett ben, det andra rakt framför. Böj ner så långt du kan — håll ryggen rak. Res dig upp igen! 8 gånger per ben, 2 set.",
            ohje_rakentaja: "Pistolknäböj-utveckling: börja med stöd (stol eller vägg) 2×8 per ben. Räkna: hur djupt kommer du utan att hälen lyfter?",
            ohje_showcase: null,
            cue: "Pistolknäböj testar enbensstyrka och balans. I spelet är varje steg på ett ben.",
            phv: "2×6 per ben med stöd. Djupet begränsas — knäts framsida är känslig." },
          { nimi: "Pistolknäböj + Nordic curl-kombination",
            ohje_leikkija: "Enbensknäböj (med väggen som stöd) 8 gånger per ben, 3 varv. Sätt dig sedan på knä och fall långsamt framåt — händerna tar emot. 5 gånger. Du känner baksida lår jobba!",
            ohje_rakentaja: "Pistolknäböj 3×8 per ben (utan stöd eller lätt stöd). Sedan Nordic curl med stöd 3×5: en partner håller hälarna, sänk dig långsamt framåt, kom tillbaka med händerna.",
            ohje_showcase: "Pistolknäböj 3×8 (full rörelse). Nordic curl excentrisk 3×5: sänk kontrollerat, kom tillbaka med händerna. SFL-kombination: främre kedjans styrka + baksida lårs skydd = start + inbromsning.",
            cue: "Liikanen 2025: kombinationen pistolknäböj + Nordic curl minskade hamstringskador med 51 %. Detta är den viktigaste övningen.",
            phv: "Pistolknäböj 2×6 med stöd. Ingen Nordic curl — sen-benfästet är känsligt." }
        ]}
      ]
    }
  },

  // ══ HARJOITEPANKKI (FLEI-ketjut: D/S/P — kehonvalmius/liikehallinta) ═════
  HARJOITEPANKKI: {
    sbl: {
      D: [
        { nimi: 'Hopprep + excentriskt vadlyft',
          ohje: 'Hopprep 3×15s med kontakt på framfoten (ingen häl i marken). Sedan på kanten av ett trappsteg: excentriskt vadlyft 3×10 — res dig upp på tårna, sänk hälen långsamt ner under kanten.',
          cue: 'Bakre kedjan börjar i fotsulan. Daglig aktivering förebygger spänningar innan de uppstår.',
          fascia_cue: 'SBL: fotsula → vad → hamstring → rygg — hela kedjan aktiveras.',
          phv: 'Hopprep 2×10s lätt. Excentriskt vadlyft bort — senfästet är känsligt under tillväxtspurten.' },
        { nimi: 'Höftfällning med käpp + bäckenlyft',
          ohje: 'Höftfällning med käpp 3×10: käppen längs ryggraden, luta dig framåt från höften (inte från ländryggen), känn hamstring. Sedan bäckenlyft 3×15: håll översta läget 2s.',
          cue: 'Sparken och starten sker från höften — inte från knät. Höftfällningen lär dig det.',
          fascia_cue: 'SBL: hamstring → glutéer. Bäckenlyftet ökar aktiveringen av gluteus medius.',
          phv: 'Normalt — isometriska övningar och höftfällningar är trygga under tillväxtspurten.' },
        { nimi: 'Rörlighetsrutin för bakre kedjan',
          ohje: 'Liggande på rygg, sträck benet rakt upp (SLR) 3×30s per ben. Sedan good morning-rörelse med käpp 3×8. Långsamt och kontrollerat — inte till smärtgräns.',
          cue: 'Rörligheten avtar redan efter några dagars paus. Lördag är bakre kedjans vårddag.',
          fascia_cue: 'SBL hela linjen: fotsula → vad → hamstring → rygg → nacke.',
          phv: 'Stretcharna är trygga. Undvik aggressiv stretch — tillväxten pågår.' }
      ],
      S: [
        { vk: 'parillinen', nimi: 'Utveckling av bakre kedjan — hoppserier',
          ohje: 'Hoppserier 3×5 från stående (bilateralt): stöt upp till maxhöjd, landa mjukt. Vila 90s. Sedan höftfällning med käpp 3×10 med ökande fart.',
          cue: 'Liikanen & Törmä 2025: femstegshoppet som mäter hoppstyrka särskilde statistiskt de som nådde proffsnivå.',
          fascia_cue: 'SBL: elastisk energi uppstår i samspelet mellan hamstring och vad.',
          phv: 'Hopp 2×3 lätt. Höftfällning normalt. Elastiska övningar nedtonade vid PHV-toppen.' },
        { vk: 'pariton', nimi: 'Utveckling av bakre kedjan — Nordic curl-progression',
          ohje: 'Nordic curl med stöd (gummiband eller vägg vid hälen): 3×5 excentriska — sänk dig LÅNGSAMT framåt, tryck tillbaka med händerna. Om det inte går: bäckenlyft på ett ben 3×12.',
          cue: 'Petersen 2011: Nordic hamstring-programmet minskade hamstringskador med 51 %. Obligatoriskt för alla fotbollsspelare.',
          fascia_cue: 'SBL:s mest kritiska övning. Hamstring excentriskt = skadeskydd.',
          phv: 'Nordic curl bort — senfästet är känsligt. Bäckenlyft på ett ben 2×10 lätt.' }
      ],
      P: {
        nimi: 'Fartkedjans 6-veckorsprogression',
        kuvaus: 'Accelerationslöpningar → fotbollsspurter → snabbhetsträning (Nevanlinna 2014)',
        vaiheet: [
          { vaihe: 'Förberedande', viikot: '1–2', intensiteetti: '60–70%', nimi: 'Accelerationsträning',
            ohje: '6×30m löpning / 65 % / 60s vila. Hållning: framåtlutad 0–10m, upprätt därefter. Ingen tidspress — tekniken först.',
            mittari: 'Ta tid. Mål: alla under ditt eget rekord +0,5s.' },
          { vaihe: 'Utvecklande', viikot: '3–4', intensiteetti: '75–85%', nimi: 'Fotbollsspurter',
            ohje: '2×4×15m med boll: för bollen 15m i full fart, stanna, vänd, upprepa. Vila 30s / 3 min mellan seten.',
            mittari: 'Räkna misslyckade stopp (bollen rullar iväg). Mål: max 1 per set.' },
          { vaihe: 'Kulminerande', viikot: '5–6', intensiteetti: '90–100%', nimi: 'Maxfartsträning',
            ohje: '5×20m i maxfart med full vila (3+ min). Sedan reaktionsstarter: bollen kastas, starta så fort den nuddar marken.',
            mittari: 'Ta 20m-tid. Jämför med tiderna från vecka 1–2.',
            phv: 'PHV: maxspurter bort. Reaktionsstarter 4×10m på 70 % effekt.' }
        ]
      }
    },
    sfl: {
      D: [
        { nimi: '90/90 höftböjare + utfallsgång',
          ohje: '90/90 höftböjare: knä i marken, bakre benet rakt, luta dig framåt tills du känner stretchen i höftens framsida. 2×45s per sida. Sedan utfallsgång 2×10m.',
          cue: 'Höften styr frånskjutet. Om höften inte öppnar sig stannar explosiviteten vid hälften — alltid.',
          fascia_cue: 'SFL: höftböjare → quadriceps. Sparken kommer från höften, inte från knät.',
          phv: 'Enbart 90/90-stretch 3×30s per sida. Ingen knäböj — risk för Osgood-Schlatter i knäets framsida.' },
        { nimi: 'Overheadknäböj + knäböjssittande',
          ohje: 'Overheadknäböj med käpp 3×8: rak rygg, hälarna i marken, knäna i tårnas riktning. Sedan knäböjssittande 2×30s: håll ställningen avslappnad, andas lugnt.',
          cue: 'Overheadknäböjen är samtidigt ett test och en övning för hela främre kedjan. Om hälarna lyfter — fotledens rörlighet är begränsningen.',
          fascia_cue: 'SFL: fot → fotled → knä → höft. Hela främre kedjan öppen.',
          phv: 'Overheadknäböj normalt — fokus på rörelsekvalitet, inte antal repetitioner. Osgood: undvik knäsmärta.' },
        { nimi: 'Främre kedjans rörlighet',
          ohje: 'Knästående höftböjarstretch 3×45s per sida + Thomas-position (ligg på sängkanten, dra ena knät mot bröstet) 3×30s per sida.',
          cue: 'SFL blir spänd av sittande. Lördag är dagen för att öppna främre kedjan — även om det känns okej.',
          fascia_cue: 'SFL: höftböjare → quadriceps. Thomas-testet är rörelsekedjans rörlighetsmått.',
          phv: 'Särskilt viktig under tillväxtspurten — Osgood-Schlatter beror ofta på spänningar i SFL.' }
      ],
      S: [
        { vk: 'parillinen', nimi: 'Utveckling av startkedjan — grodhopp',
          ohje: 'Grodhopp från stående 3×5: knäböj ner, stöt upp och framåt maximalt. Mät sträckan. Sedan höftfällningsrutin 3×10 med ökande fart.',
          cue: 'Längdhopp utan ansats förutspår explosivitet. Mät och förbättra — varje centimeter berättar om utveckling.',
          fascia_cue: 'SFL: explosivt frånskjut från främre kedjan. Höftfällningen aktiverar motparten i bakre kedjan.',
          phv: 'Grodhopp 2×3 lätt. Höftfällning normalt.' },
        { vk: 'pariton', nimi: 'Utveckling av startkedjan — pistolknäböj-progression',
          ohje: 'Pistolknäböj mot vägg 3×5 per ben: håll ena benet rakt framför, sänk dig långsamt ner i enbensknäböj. Om det inte går: step-down från ett trappsteg 3×8 per ben.',
          cue: 'Ett ben bär vikten hela tiden i spelet. Pistolknäböjen är den rörelsen.',
          fascia_cue: 'SFL: enbensknäböj aktiverar hela främre kedjan + sidolinjens stabilisatorer.',
          phv: 'Step-down från ett trappsteg 3×6 per ben lätt. Knäets framsida är känslig — inte till smärtgräns.' }
      ],
      P: {
        nimi: 'Startkedjans 6-veckorsprogression',
        kuvaus: 'Progression med längdhopp utan ansats + knäböjssittande-set (Nevanlinna 2014)',
        vaiheet: [
          { vaihe: 'Förberedande', viikot: '1–2', intensiteetti: '60–70%', nimi: 'Teknik + grundstyrka',
            ohje: 'Längdhopp utan ansats 4×3: tekniken först (frånskjutsställning, armpendling, mjuk landning). Notera bästa sträckan. Knäböjssittande 2×45s.',
            mittari: 'Notera bästa hoppsträckan från början av vecka 1.' },
          { vaihe: 'Utvecklande', viikot: '3–4', intensiteetti: '75–85%', nimi: 'Explosivitet + reaktion',
            ohje: 'Längdhopp utan ansats 3×5 med maximala försök. Sedan knäböjshopp 3×5: snabbt ner, explosivt upp — elastisk energi. Vila 90s.',
            mittari: 'Jämför hoppsträckan med resultatet från vecka 1–2.' },
          { vaihe: 'Kulminerande', viikot: '5–6', intensiteetti: '90–100%', nimi: 'Fotbollsspecifik explosivitet',
            ohje: 'Femsteg 3×gång: femsteg utan ansats från stående, mät sträckan. Sedan explosiv start med boll: bollen 5m framåt, spurta till bollen, ta emot, för bollen.',
            mittari: 'Jämför femstegssträckan med mätningen från vecka 1. Liikanen & Törmä 2025: femsteget förutspådde proffskarriär.',
            phv: 'PHV: endast femsteg 2×2 lätt. Explosiva hopp nedtonade.' }
        ]
      }
    },
    ll: {
      D: [
        { nimi: 'Clamshell + sidoplanka',
          ohje: 'Clamshell 2×12 per sida: liggande på sidan, knäna ihop, öppna det övre knät som en mussla (håll höften stilla). Sedan sidoplanka 2×20s per sida: kroppen rak sett från sidan.',
          cue: 'Sidostabiliteten håller knät i linje vid riktningsförändringar. Clamshell aktiverar gluteus medius — IT-bandets viktigaste stödmuskel.',
          fascia_cue: 'LL: gluteus medius → TFL → IT-band → fibula → peroneusmusklerna. Hela sidolinjen.',
          phv: 'Normalt — isometriska övningar är trygga. Att hålla koll på IT-bandet är viktigt under PHV.' },
        { nimi: 'Sidohopp + skridskoåkare',
          ohje: 'Sidohopp 3×8 per sida: hoppa åt sidan på ett ben, landa kontrollerat, stabilisera innan nästa. Sedan skridskosteg 2×20m: brett glid åt sidan, knäböjsställning.',
          cue: '3 steg i inbromsningen — inte ett. Första steget i den nya riktningen är avgörande.',
          fascia_cue: 'LL: lateralt frånskjut och inbromsning. Skridskosteget = sidokedjans funktionella rörelse.',
          phv: '2×5 per sida lätt. Laterala rörelser är trygga — undvik maximala riktningsförändringar.' },
        { nimi: 'Sidokedjans rörlighet',
          ohje: 'IT-band-stretch stående 3×30s per sida: korsa benen, luta dig åt sidan mot en vägg. Sedan sidohoppsgång 2×20m: breda steg åt sidan i knäböj.',
          cue: 'IT-bandet går inte att stretcha — det är inte en muskel. Vi tar hand om TFL och gluteus medius som spänner det.',
          fascia_cue: 'LL: TFL → IT-band. Sidogången öppnar hela sidolinjen.',
          phv: 'Normalt. IT-bandssmärta under tillväxtspurten är ett varningstecken — träna inte till smärta.' }
      ],
      S: [
        { vk: 'parillinen', nimi: 'Utveckling av riktningskedjan — T-drill på egen tid',
          ohje: 'T-bana med koner: 4 koner i T-form (framåt 5m, sida 2,5m+2,5m, bakåt 5m). Framåt, åt sidan, tillbaka, åt sidan, bakåt. Ta tid. 4 repetitioner med full vila.',
          cue: 'Forsman 2013: snabbheten särskilde de talangfulla i alla åldersklasser. T-drill är en internationell standard.',
          fascia_cue: 'LL: lateral inbromsning → frånskjut. Varje vändning är sidokedjans maxprestation.',
          phv: 'Normalt — T-drill är trygg. Undvik maximala riktningsförändringar till smärtgräns.' },
        { vk: 'pariton', nimi: 'Utveckling av riktningskedjan — riktningsbana med boll',
          ohje: 'Samma T-bana med boll. Det går långsammare — det är okej. Bollen hålls nära i vändningarna. 4 repetitioner, ta tid, jämför med utan boll.',
          cue: 'Forsman 2013: slalomdribblingen särskilde de talangfulla i alla åldersklasser. Boll + riktningsförändring = fotbollens kärna.',
          fascia_cue: 'LL + SL: lateral rörelse och bollkontroll samtidigt. Detta är den integration som spelet kräver.',
          phv: 'Normalt — teknik med boll är alltid tryggt.' }
      ],
      P: {
        nimi: 'Riktningskedjans 6-veckorsprogression',
        kuvaus: 'T-drill med koner — målet förbättras 0,1–0,2s per period',
        vaiheet: [
          { vaihe: 'Förberedande', viikot: '1–2', intensiteetti: '60–70%', nimi: 'Teknik + grundrörlighet',
            ohje: 'T-drill utan bollpress 4× — fokus på teknik: 3 steg i inbromsningen, första steget i den nya riktningen. Ta tid. Sidohopp 3×6 per sida.',
            mittari: 'Notera T-drill-tiden från början av vecka 1.' },
          { vaihe: 'Utvecklande', viikot: '3–4', intensiteetti: '75–85%', nimi: 'Reaktivitet + boll',
            ohje: 'T-drill med boll 4×. Sedan reaktions-RF: partnern pekar ut riktningen, start direkt. 6×start per sida.',
            mittari: 'Jämför T-drill-tiden med boll mot utan boll. Skillnaden bör minska.' },
          { vaihe: 'Kulminerande', viikot: '5–6', intensiteetti: '90–100%', nimi: 'Spelspecifik snabbhet',
            ohje: 'T-drill på maxeffekt 3×. Sedan 1v1-snabbhetsspel: på en liten yta (5×5m) passera motståndaren med en fint. 3×2 min.',
            mittari: 'Jämför T-drill-tiden med resultatet från vecka 1. Mål: -0,2s.',
            phv: 'PHV: T-drill på 70 % effekt. 1v1 normalt — spelkontext är alltid okej.' }
        ]
      }
    },
    sl: {
      D: [
        { nimi: 'Väggpassning + jonglering — DIAG dagligen',
          ohje: 'Väggpassning 3×20 med växlande fötter (1-touch tillbaka). Sedan jonglering 3×1 min: båda fötterna växelvis, räkna högt. Bröstkorgen styr — foten följer.',
          cue: 'Forsman 2013: jongleringen och passningsskickligheten särskilde de talangfulla i alla åldersklasser. Denna övning mäter båda.',
          fascia_cue: 'SL: diagonallinjen korsvis över kroppen. Passningen = rotationskedjans fotbollsrörelse.',
          phv: 'Normalt och rekommenderat — teknikövningar med boll är alltid trygga under PHV.' },
        { nimi: 'Rotationsaktivering — bröstryggsrotation',
          ohje: 'Bröstryggsrotation på alla fyra 3×10 per sida: håll höften stilla, rotera bröstkorgen och armbågen uppåt. Sedan väggpassning med ökande fart 2×15.',
          cue: 'Bröstkorgen styr — foten följer. Rotationskedjan öppnar sig inte utan bröstryggens rörlighet.',
          fascia_cue: 'SL: bröstkorg → höft → fot. Diagonalen börjar i överkroppen.',
          phv: 'Normalt — bröstryggsrotation är trygg och särskilt nyttig under tillväxtspurten.' },
        { nimi: 'Rotationskedjans rörlighetsrutin',
          ohje: 'Windmill 3×8 per sida: stå med benen brett isär, böj dig snett framåt och sträck handen mot motsatt tå. Blicken följer den övre handen. Sedan väggpassning långsamt 2×10.',
          cue: 'Diagonallinjen är ofta i obalans — ofta finns ett DFL-stabilitetsproblem kopplat till det.',
          fascia_cue: 'SL: latissimus → motsatt höftböjare. Windmill öppnar hela diagonallinjen.',
          phv: 'Normal stretchintensitet. Rotationsrörelser är trygga.' }
      ],
      S: [
        { vk: 'parillinen', nimi: 'Utveckling av rotationskedjan — medicinboll mot vägg',
          ohje: 'Medicinboll mot vägg 3×3 min: rotationskast mot väggen från båda sidor. Bröstkorgen styr — armarna följer. Farten ökar progressivt inom setet.',
          cue: 'Liikanen & Törmä 2025: medicinbollsövningar korrelerade med den tekniska utvecklingspotentialen.',
          fascia_cue: 'SL: rotationskraft från diagonalen. Medicinbollen är rotationskedjans fotbollstillämpning.',
          phv: 'Normalt — rotationsövningar med boll är mycket trygga under PHV.' },
        { vk: 'pariton', nimi: 'Utveckling av rotationskedjan — skott + precisionsövning',
          ohje: 'För bollen 15m + skjut mot mål / mot en markering 5×per ben. Notera träffpunkten (hörna i luften/hörna längs marken/mitten/miss). Sedan passning + rörelse: passa, rör dig, ta emot 3×2 min.',
          cue: '5 skott per dag = 1825 skott per år. Skottprecisionen är rotationskedjans synliga mått i spelet.',
          fascia_cue: 'SL: skottet är en rotationsrörelse från fotsulan till nacken. Varje precist skott stärker diagonallinjen.',
          phv: 'Normalt.' }
      ],
      P: {
        nimi: 'Rotationskedjans 6-veckorsprogression',
        kuvaus: 'TSI-uppföljning: mät tiden för riktningsförändring med boll i början och slutet av perioden',
        vaiheet: [
          { vaihe: 'Förberedande', viikot: '1–2', intensiteetti: '60–70%', nimi: 'Teknik + grundrotation',
            ohje: 'Väggpassning med 1-touch 4×2 min — fokus på teknik, inte på fart. Notera misslyckade mottagningar. Bröstryggsrotation på alla fyra 3×10.',
            mittari: 'Räkna misslyckade mottagningar per 2 min. Mål: under 3.' },
          { vaihe: 'Utvecklande', viikot: '3–4', intensiteetti: '75–85%', nimi: 'Rotationseffekt + spel',
            ohje: 'Medicinboll mot vägg 3×3 min med ökande fart. Sedan rondo 3v1 (eller väggrondo): 1 touch, byt riktning efter varje passning.',
            mittari: 'Räkna misslyckade passningar i väggrondon. Jämför med vecka 1.' },
          { vaihe: 'Kulminerande', viikot: '5–6', intensiteetti: '90–100%', nimi: 'Spelspecifik rotationskraft',
            ohje: 'Skottövning 5×per ben + föra bollen före skottet. Notera träffpunkterna. Sedan 1v1-situation: fint + skott.',
            mittari: 'Jämför skottprecisionen med resultatet från vecka 1. Träffprocenten ska öka.',
            phv: 'Normalt — rotationsövningar är trygga under PHV.' }
        ]
      }
    },
    dfl: {
      D: [
        { nimi: '360° diafragmaandning + dead bug',
          ohje: '360° diafragmaandning 3×5: andas in så att magen, sidorna OCH ryggen vidgas (inte bara bröstkorgen upp). Sedan dead bug 3×5 per sida: liggande på rygg, ländryggen i marken, sänk motsatt arm+ben långsamt.',
          cue: 'DFL:s kärna är diafragman — det är kroppens enda muskel som fungerar både som andningsmuskel och som bäckenstabilisator. Kolar 2012.',
          fascia_cue: 'DFL: bäckenbotten → diafragma → nacke. 360°-andningen aktiverar hela den djupa främre linjen.',
          phv: 'Särskilt viktig under PHV — en djup bål är det bästa stödet för en växande rygg. Rekommenderas mer än normalt.' },
        { nimi: 'Planka + sidoplanka',
          ohje: 'Planka på armbågarna 3×20s: kroppen rak, sätet i samma linje — varken upp eller ner. Andas normalt. Sidoplanka 3×15s per sida: fötterna på varandra eller knäna i marken.',
          cue: 'McGill Big 3: planka + sidoplanka + bird dog — en kliniskt validerad grundrutin (McGill 2010).',
          fascia_cue: 'DFL: den djupa bålen stabiliserar alla andra kedjor. Utan denna belastar övriga övningar fel.',
          phv: 'Normalt och rekommenderat — isometriska övningar är helt trygga under PHV.' },
        { nimi: 'DFL-rörlighet + aktivering',
          ohje: 'Cat-cow 3×8: på alla fyra, andas in = runda ryggen (cat), andas ut = svanka ryggen (cow). Sedan bird dog 3×8 per sida: motsatt arm+ben rakt ut i luften.',
          cue: 'Din rygg är slutresultatet — dina andningsmuskler (DFL) aktiveras inte. Först lär vi oss andas rätt. Kolar 2012.',
          fascia_cue: 'DFL: bröstrygg + andningsmuskler + bäckenbotten. Cat-cow öppnar hela den djupa främre linjen.',
          phv: 'Normalt. DFL-övningarna är den viktigaste träningsgruppen under PHV.' }
      ],
      S: [
        { vk: 'parillinen', nimi: 'Utveckling av kontrollkedjan — progressiv bålträning',
          ohje: 'Planka 3×30s → 40s → 50s (öka varje vecka). Sidoplanka 3×20s per sida. Bird dog 3×8 per sida. Allt med kvalitet — inte i brådska.',
          cue: 'Plankans varaktighet ökar på 6 veckor: 20s → 60s. Detta är tecknet på kontrollkedjans grundprogression.',
          fascia_cue: 'DFL: hela den djupa kedjan. Isometriska övningar bygger djup styrka utan skaderisk.',
          phv: 'Normalt eller fler repetitioner — DFL är den BÄSTA träningsgruppen under tillväxtspurten.' },
        { vk: 'pariton', nimi: 'Utveckling av kontrollkedjan — balans + funktionalitet',
          ohje: 'Stå på ett ben med slutna ögon 3×30s per ben. Sedan pistolknäböj mot vägg 3×5 per ben — långsamt och kontrollerat. Sist käppgymnastik 3×8.',
          cue: 'Balansen förbättras endast genom att utmana balansen. Slutna ögon fördubblar utmaningen — DFL får jobba.',
          fascia_cue: 'DFL + LL: balans kräver samspel mellan både den djupa bålen och sidolinjen.',
          phv: 'Normalt — balansövningar är de tryggaste under PHV.' }
      ],
      P: {
        nimi: 'Kontrollkedjans 6-veckorsprogression',
        kuvaus: 'Ökning av plankans varaktighet: på 6 veckor 20s → 60s (McGill 2010 + DNS-protokoll)',
        vaiheet: [
          { vaihe: 'Förberedande', viikot: '1–2', intensiteetti: '60–70%', nimi: 'Teknik + andning',
            ohje: 'Planka 3×20s — fokus på andningen: andas normalt hela tiden. Dead bug 3×5 långsamt. 360° diafragmaandning 3×5. Notera plankans varaktighet.',
            mittari: 'Notera plankans maxvaraktighet under vecka 1.' },
          { vaihe: 'Utvecklande', viikot: '3–4', intensiteetti: '75–85%', nimi: 'Ökad varaktighet + funktionalitet',
            ohje: 'Planka 3×35s. Sidoplanka 3×25s per sida. Bird dog 3×10 per sida. Sedan balansövning med slutna ögon 3×20s.',
            mittari: 'Jämför plankans varaktighet med resultatet från vecka 1. Mål: +10s.' },
          { vaihe: 'Kulminerande', viikot: '5–6', intensiteetti: '90–100%', nimi: 'Maximal stabilitet + spelspecifik',
            ohje: 'Planka 3×50s. Pistolknäböj mot vägg 3×5 per ben. Sedan passning till en partner medan du står på en balansbräda eller på ett ben.',
            mittari: 'Plankans mål: 60s. Pistolknäböj utan vägg om möjligt.',
            phv: 'Allt normalt eller mer — DFL:s övningar är de bästa under PHV.' }
        ]
      }
    },
    pig: {
      D: [
        { nimi: 'Scanningrutin — titta först',
          ohje: 'Väggpassning 3×2 min: passa, INNAN bollen kommer tillbaka titta upp och namnge 3 saker du ser omkring dig. Ta sedan emot. Fuska inte — titta i förväg.',
          cue: 'Forskning (Vaeyens 2007): pre-scanning skiljer eliten från subeliten. På toppakademier tränas detta varje dag — blicken upp före touchen.',
          fascia_cue: 'Spelförståelsekedjan: öga → hjärna → fot. Information före bollen.',
          phv: 'Kognitiva övningar är exakt rätt val under PHV. Kroppen vilar — huvudet utvecklas.' },
        { nimi: 'Misstagsspel — reagera direkt',
          ohje: 'Väggpassning 3×1 min: gör MED AVSIKT en felaktig passning (för hård, fel riktning), reagera omedelbart på den nya situationen. Stanna inte efter misstaget.',
          cue: 'Moran 2012: förmågan att bortse från störande stimuli (misstag) är en särskiljande faktor hos toppspelare. Detta tränar just det.',
          fascia_cue: 'Spelförståelsekedjan: Error Recovery-protokoll. Misstag → reagera → fortsätt.',
          phv: 'Kognitiva övningar rekommenderas under PHV.' },
        { nimi: 'Spelförståelse-videoanalys',
          ohje: 'Titta på 5 min video om ditt eget spel (egen match, toppmatch eller träning). Notera 1 sak: \"Jag såg en spelare som tittade upp före mottagningen\" eller \"Jag såg ett anfall där jag förutsåg rätt\".',
          cue: 'ADAR: Anticipation. Spelförståelse utvecklas även med mental träning — inte bara på planen.',
          fascia_cue: 'Spelförståelsekedjan: visuell och kognitiv träning. Titta → analysera → tillämpa.',
          phv: 'Särskilt rekommenderad under PHV — spelifierad mental träning.' }
      ],
      S: [
        { vk: 'parillinen', nimi: 'Utveckling av spelförståelse — beslutsfattande under press',
          ohje: 'Stå 10m från väggen. Håll ett papper i handen med siffror (1=vänster 2=höger 3=upp 4=ner). Lyft en siffra → passa genast i rätt riktning. 4×2 min. Öka farten progressivt.',
          cue: 'Moran 2012: beslutsförmåga under press går att lära ut. Detta framtvingar ett reaktivt val — precis som i spelet.',
          fascia_cue: 'Spelförståelsekedjan: Decision + Action. Stimulus → beslut → utförande under 0,5s.',
          phv: 'Normalt eller fler repetitioner — kognitiva övningar är idealiska under PHV.' },
        { vk: 'pariton', nimi: 'Utveckling av spelförståelse — ADAR-spelövning',
          ohje: 'Honey Trap-övning: väggpassning, ibland \"stöter väggen bort\" bollen åt ett annat håll (kasta in en andra boll mitt i). Reagera omedelbart. 3×3 min. Notera sedan: hur många gånger reagerade du rätt av 10 situationer?',
          cue: 'ADAR-protokoll: Anticipation → Decision → Action → Recovery. Detta tränar alla fyra samtidigt.',
          fascia_cue: 'Hela ADAR-kedjan: förutse → besluta → agera → återhämta dig från misstaget.',
          phv: 'Normalt.' }
      ],
      P: {
        nimi: 'Spelförståelsens 6-veckorsprogression',
        kuvaus: 'ADAR-videosession + mätning av scanningfrekvens',
        vaiheet: [
          { vaihe: 'Förberedande', viikot: '1–2', intensiteetti: '60–70%', nimi: 'Medvetenhet + scanningträning',
            ohje: 'Titta på 3 klipp från din egen förenings match (eller din egen träningsvideo). Notera: hur många spelare tittade upp före mottagningen? Sedan scanningrutin 4×2 min.',
            mittari: 'Notera scanningobservationerna under vecka 1. Jämför med vecka 6.' },
          { vaihe: 'Utvecklande', viikot: '3–4', intensiteetti: '75–85%', nimi: 'Beslutsfattande + spel',
            ohje: 'Beslutsövning (siffror) 4×2 min med ökande fart. Sedan väggpassning med två bollar: byt boll slumpmässigt på din partners kommando.',
            mittari: 'Räkna felaktiga reaktioner. Mål: under 2 per 2 min.' },
          { vaihe: 'Kulminerande', viikot: '5–6', intensiteetti: '90–100%', nimi: 'Spelspecifik spelförståelse',
            ohje: 'ADAR Honey Trap 3×3 min. Titta sedan på 5 min video av en toppspelare (samma spelposition som du). Notera 3 observationer om deras scanning.',
            mittari: 'Jämför antalet rätta reaktioner med resultatet från vecka 1.',
            phv: 'Normalt eller mer — spelförståelse är det bästa utvecklingsområdet under PHV.' }
        ]
      }
    }
  },

  // ══ EVERTON_LISAYKSET (laskeutuminen/loikat/dynaaminen_core) ═════════════
  EVERTON_LISAYKSET: {
    laskeutuminen: {
      sbl: { S: [
        { vk: 'parillinen', nimi: 'Bakre kedjans landningsteknik',
          ohje: 'Kliv ner från en 20–30 cm förhöjning på ett ben. Sänk dig långsamt till knäböj — känn hur hamstring bromsar. Håll 2s. 5 repetitioner per ben × 3 set.',
          cue: 'Hamstring skyddar ACL vid landning. När den lär sig bromsa hålls knäet stabilt efter hoppet.',
          fascia_cue: 'SBL: bakre kedjan arbetar excentriskt. Fotsula → vad → hamstring bromsar som en hel kedja.',
          phv: 'PHV: enbart nedkliv utan förhöjning. Ingen ansats — bara en kontrollerad sänkning.' },
        { vk: 'pariton', nimi: 'Bakre kedjans reaktiva landning',
          ohje: 'Djupt fallhopp från 30cm förhöjning: kliv ner och sjunk direkt till knäböj utan paus. 5 repetitioner × 3 set. Mjuk landning — ingen duns.',
          cue: 'GRF (markreaktionskraft) är 3–5× kroppsvikten vid landning. Bakre kedjan får vara redo. Ingen duns = rätt.',
          fascia_cue: 'SBL excentriskt + DFL stabiliserar. Landningen är hela kedjans samspel.',
          phv: 'PHV: inget fallhopp. Mjuk landning med kroppsvikt 3×5 per ben.' }
      ]},
      sfl: { S: [
        { vk: 'parillinen', nimi: 'Främre kedjans landningsteknik — knäböjshopp',
          ohje: 'Knäböjshopp: sänk dig snabbt till halv knäböj → skjut ifrån uppåt → landa mjukt tillbaka i halv knäböj. 5 repetitioner × 3 set. Ingen paus — elastisk energi.',
          cue: 'Snabbt ner = snabbt upp. Den elastiska energin bevaras bara om landningen är mjuk — ingen bromsning.',
          fascia_cue: 'SFL: quadriceps + höftböjaren tar emot impulsen. Elasticitetsindexet förbättras av detta.',
          phv: 'PHV: 3 repetitioner × 3 set på 60% effekt. Främre knät är känsligt — inte till smärta.' },
        { vk: 'pariton', nimi: 'Främre kedjans landning med 90° vändning',
          ohje: 'Hoppa upp → landa vänd 90° åt vänster → nästa gång åt höger. 5 repetitioner per riktning × 3 set. Mjuka knän direkt vid landning.',
          cue: 'Vid rotationslandning belastas ACL som mest. Den här övningen lär in en trygg vändning tills den blir automatisk.',
          fascia_cue: 'SFL + SL: rotationslandning kräver samspel mellan främre kedjan och spiralkedjan.',
          phv: 'PHV: ingen rotation. Grundlandning rakt fram 3×5.' }
      ]},
      ll: { S: [
        { vk: 'parillinen', nimi: 'Sidokedjans enbenslandning + håll',
          ohje: 'Hoppa åt sidan på ett ben → sänk dig kontrollerat till knäböj → håll 2s. Knät rakt över foten — inte inåt. 5 repetitioner per ben × 3 set.',
          cue: 'Valguskollaps (knät inåt vid landning) är det mekaniska ögonblicket vid ACL-skada. Gluteus medius förhindrar det — och det är precis vad den här övningen tränar.',
          fascia_cue: 'LL: gluteus medius → IT-band → peroneus-musklerna. Sidolinjen hindrar knät från att falla inåt.',
          phv: 'PHV: enbart nedkliv åt sidan, inget hopp. 3×5 per ben.' },
        { vk: 'pariton', nimi: 'Sidokedjans reaktiva enbenslandning',
          ohje: 'Hoppa åt sidan på ett ben → direkt tillbaka → till andra sidan. Rytmiskt skutt utan paus. 3×8 per riktning. Mjuk kontakthastighet.',
          cue: 'Den reaktiva sidorörelsen härmar riktningsförändringar i matchen. Kontakthastigheten är avgörande.',
          fascia_cue: 'LL reaktivt: sidokedjan fungerar som en fjäder — samlar energi vid landning och släpper den vid ansatsen.',
          phv: 'PHV: långsamt rytmiskt skutt 3×5 per riktning. Ingen maxhastighet.' }
      ]}
    },
    loikat: {
      ll: { P_lisays: {
        nimi: 'Sidokedjans hoppprogression — 6 veckor',
        kuvaus: 'Enbens häckhopp framåt → åt sidan → balansbräda (Everton Stage 3→5)',
        vaiheet: [
          { vaihe: 'Förberedande', viikot: '1–2', intensiteetti: '60–70%', nimi: 'Enbens häckhopp framåt + håll',
            ohje: 'Skutta på ett ben över ett lågt hinder framåt → stanna → stabilisera. 5 repetitioner per ben × 2–3 set. Mjuk landning — ingen duns.',
            mittari: 'Räkna orena landningar (knä inåt / duns). Mål: 0 per set.',
            phv: 'PHV: enbart nedkliv åt sidan utan hopp. Tekniken först.' },
          { vaihe: 'Utvecklande', viikot: '3–4', intensiteetti: '75–85%', nimi: 'Enbens häckhopp åt sidan + håll',
            ohje: 'Samma men i sidled. 5 repetitioner per ben per riktning × 3 set. Håll 2s efter varje landning.',
            mittari: 'Jämför vänster och höger — symmetri är målet. Stor skillnad = lateral svaghet.',
            phv: 'PHV: långsamt nedkliv åt sidan 3×5. Inget hopp.' },
          { vaihe: 'Kulminerande', viikot: '5–6', intensiteetti: '90–100%', nimi: 'Reaktivt enbenshopp — utan håll',
            ohje: 'Skutta åt sidan utan håll — direkt tillbaka. 3×8 per riktning. Mål för kontakthastighet under 0.3s. Everton Stage 4–5.',
            mittari: 'Bedöm rytmens jämnhet. Ojämn rytm = ena sidan svagare.',
            phv: 'PHV: långsamt rytmiskt 3×6. Ingen maxhastighet.' }
        ]
      }}
    },
    dynaaminen_core: {
      dfl: { S_lisays: [
        { vk: 'parillinen', nimi: 'DFL dynamiska bålkrypningar',
          ohje: ['Björngång 2×10m: på alla fyra, knäna 2cm från golvet. Höften pendlar inte — långsamt och kontrollerat.',
                 'Spindelgång hög 2×10m: armar + ben åt samma håll samtidigt.',
                 'Maskgång på armbågarna 2×10m: på rygg, dra dig framåt med armbågarna.'].join(' / '),
          cue: 'Everton Stage 1→4: Björngång tränar de djupa stabilisatorerna under ett dynamiskt anti-rotationskrav. Magmusklerna arbetar hela tiden utan överbelastning.',
          fascia_cue: 'DFL + SBL: krypövningarna aktiverar transversus abdominis, multifidus och den djupa främre kedjan samtidigt.',
          phv: 'Normalt — det här hör till de tryggaste övningarna under PHV. Lägg gärna till repetitioner.' }
      ]}
    }
  },

  // ══ T_KOHDE_PANKKI (kohdekohtaiset T-harjoitteet — arrayt) ═══════════════
  T_KOHDE_PANKKI: {
    ponnauttelu: [
      { nimi: 'Studsräknaren', kehityskohde: 'ponnauttelu',
        ohje_leikkija: 'Studsa bollen på foten — hur många gånger i rad klarar du innan den trillar? Räkna och skriv upp ditt rekord. Försök slå gårdagens!',
        ohje_rakentaja: 'Jonglering med starka foten, mål 30 i rad. Håll bollen lågt (under knät), fotleden låst. När 30 lyckas, byt till svaga foten.',
        ohje_showcase: 'Jonglering växelvis med båda fötterna, bollen i knähöjd, mål 50 i rad. Lägg in lår- och axelkontakter utan att bryta rytmen.',
        cue: 'Ronaldinho: jonglering lär dig bollens språk — hur den svarar på varje kontakt.',
        viikkotavoite: 'Förbättra ditt rekord i antal jongleringar i rad' },
      { nimi: 'Lår–fot-rytm', kehityskohde: 'ponnauttelu',
        ohje_leikkija: 'Studsa så här: lår → fot → lår → fot. Håll rytmen som i en sång. Hur många varv orkar du utan att tappa bollen?',
        ohje_rakentaja: 'Kombinationsjonglering: lår–fot–lår med ena benet, sedan byte till det andra. 5 varv utan att tappa bollen. Kontroll före tempo.',
        ohje_showcase: 'Fri jongleringsserie: lår, insida, utsida, axel — växla kontaktyta utan att tappa rytmen. 2 min i sträck.',
        cue: 'Bollen lyder den som har känsla för varje yta.',
        viikkotavoite: 'Lår–fot 5 varv i rad' },
      { nimi: 'Väggjonglering', kehityskohde: 'ponnauttelu',
        ohje_leikkija: 'Sparka bollen i luften mot väggen och ta kontroll på den i luften innan den träffar marken. 10 lyckade!',
        ohje_rakentaja: 'Väggjonglering: passa upp i luften mot väggen, ta emot i luften med en mjuk kontakt, jonglera tillbaka. 15 kontakter utan att bollen når marken.',
        ohje_showcase: 'Väggjonglering med växlande fötter: första kontakten dämpar, andra passar. 20 repetitioner + skanna: namnge målet före varje passning.',
        cue: 'Att behärska bollen i luften utmärker spelaren som spelar med snabbhet.',
        viikkotavoite: 'Väggjonglering 15 kontakter utan att bollen når marken' }
    ],
    nopeus: [
      { nimi: 'Acceleration med boll', kehityskohde: 'nopeus',
        ohje_leikkija: 'För bollen så snabbt du kan 10 meter, stanna, och tillbaka. Bollen håller sig nära! 6 gånger för fullt, pusta emellan.',
        ohje_rakentaja: 'Accelerationsdrag med boll: 0–15 m i maxfart, bollen högst ett steg bort. 6 repetitioner, full återhämtning emellan. Håller du bollen under kontroll i full fart?',
        ohje_showcase: 'Acceleration med boll 20 m, sista 5 m utan blicken på bollen (skanna framåt). 8 repetitioner. Jämför: löpning utan boll vs. med boll (TSI-skillnad).',
        cue: 'Snabbhet med boll är en annan färdighet än snabbhet utan — den tränas separat.',
        viikkotavoite: 'Bollen under kontroll 15 m i full fart' },
      { nimi: 'Riktningsförändring med koner', kehityskohde: 'nopeus',
        ohje_leikkija: '3 markeringar på marken — en sten, ryggsäck eller tröja duger — med 5 meters mellanrum. För bollen, vänd skarpt vid varje, accelerera. 8 gånger.',
        ohje_rakentaja: 'Riktningsförändringsbana: koner med 5 m mellanrum, skarp 90° vändning vid varje + omedelbar acceleration ut. Bollen nära i vändningen. 8 genomkörningar, tidtagning.',
        ohje_showcase: 'Riktningsförändring i full fart: 180° vändning med stopp + explosiv start i motsatt riktning, båda fötterna. 10 repetitioner, mät återhämtningstiden.',
        cue: 'Spelets snabbhet är snabbhet i riktningsförändringar, inte rak löpning.',
        viikkotavoite: 'Skarp vändning utan att tappa bollen' },
      { nimi: 'Reaktionsstart', kehityskohde: 'nopeus',
        ohje_leikkija: 'En kompis ropar \"NU!\" — starta då med bollen för fullt 5 meter. Eller så studsar bollen du kastar som signal — iväg direkt! 8 gånger.',
        ohje_rakentaja: 'Reaktionsstart: vänta på signalen (en kompis rop eller handtecken), starta explosivt med bollen 5–10 m. 8 repetitioner. Hur snabbt reagerar du och är i full fart?',
        ohje_showcase: 'Reaktionsstart med val: en kompis pekar ut riktningen vid signalen, starta dit med bollen. 10 repetitioner. Kombinera perception + acceleration — det här är spelets start.',
        cue: 'Första steget avgör — reaktion + acceleration vinner metrarna.',
        viikkotavoite: 'Start på signal utan fördröjning' }
    ]
  },

  // ══ MIKSI-generointi (generoiMiksiteksti + MIKSI_LAUSE2 + KOHDE_NIMET) ═══
  // generoiMiksiteksti l1 (lähde-haarat) + l3 — merkkijonot sv, {kohdeNimi}/{s} = interpolaatiot
  MIKSI_GENEROITU: {
    l1: {
      tki:  'Din tekniktävling visade att {kohdeNimi} är ett tillfälle att växa.',
      tsi:  'Mätningen visar att bollen saktar ner dig {s} sekunder.',
      hh:   'Din fysiska profil visar var utveckling ger mest.',
      oletus_leikkija:  'Du är precis i rätt ålder för att lära dig det här.',
      oletus_rakentaja: 'Nu är stunden då den här färdigheten fastnar djupast.',
      oletus_showcase:  'Det här är området som skiljer en bra spelare från en enastående.'
    },
    l3: {
      leikkija: 'Gör det här varje dag så börjar bollen lyda.',
      muu:      'Gör det här i 14 dagar → testa igen → se skillnaden.'
    }
  },
  MIKSI_LAUSE2: {
    pallonhallinta: {
      leikkija:  'Varje touch gör bollen mer bekant.',
      rakentaja: 'När kontrollen blir automatisk frigör du tankarna till spelet.',
      showcase:  'Teknisk automatik är det som skiljer proffsnivå från hobbynivå.'
    },
    koordinaatio: {
      leikkija:  'Kroppen lär sig röra sig bättre i samspel.',
      rakentaja: 'Koordination är grunden för allt annat.',
      showcase:  'Rörelsekontroll i full fart är det som tekniken vilar på.'
    },
    nopeus: {
      leikkija:  'Snabba fötter gör spelet roligare.',
      rakentaja: 'Snabbhet med boll är en egen färdighet — den går att träna.',
      showcase:  'Neuromuskulär träning bygger explosivitet.'
    },
    syotto: {
      leikkija:  'En precis passning håller bollen hos kompisarna.',
      rakentaja: 'Passningen är lagets språk — precision öppnar spelet.',
      showcase:  'Passningens precision och vikt avgör anfallets tempo.'
    },
    ponnauttelu: {
      leikkija:  'Jonglering lär dig bollens rörelser.',
      rakentaja: 'Jonglering bygger touchprecision mot varje yta.',
      showcase:  'Att behärska bollen i luften är grunden för första touchen under press.'
    }
  },
  // KOHDE_NIMET sv (näkyvät miksi-lause1:ssä {kohdeNimi}-kohdassa)
  KOHDE_NIMET: {
    pallonhallinta: 'bollkontroll',
    koordinaatio:   'koordination',
    nopeus:         'snabbhet',
    syotto:         'passning',
    ponnauttelu:    'jonglering'
  }
};

if (typeof module !== 'undefined' && module.exports) module.exports = HARJOITE_SV;
