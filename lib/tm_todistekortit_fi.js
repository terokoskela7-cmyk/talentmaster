/* ════════════════════════════════════════════════════════════════════════
   tm_todistekortit_fi.js — K4a: Profiilin todistekorttien FI-tekstit (avaimet tc_*). Erillään logiikasta (lib ≤ ~500 riviä). sv: Gemini-erä 79 → lib/tm_lib_i18n.js. Dual-export: module.exports || window.TM_TODISTEKORTIT_FI.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var FI = {
    tc_yhteenveto: 'Yhteenveto', tc_vahvuus: 'Vahvuus', tc_kehityskohde: 'Kehityskohde', tc_puuttuu: 'Puuttuu', tc_puuttuu_kasvumittaus: 'Kasvumittaus', tc_kokonaiskuva: 'Kokonaiskuva',
    tc_nauha_ohje: 'Palkki = taso oman asteikon maksimista · tyhjä = ei mitattu', tc_todisteet: 'Todisteet', tc_ei_mitattu: 'ei mitattu', tc_ei_tasoa: 'ei tasoa', tc_ei_normia: 'ei normia',
    tc_viimeisin_testi: 'Testattu {pvm} · {ika}',   /* K1e: lyhyt muoto, ei katkea 390 px:ssä */
    tc_ika_lyh_pv: '{n} pv', tc_ika_lyh_vk: '{n} vk', tc_ika_lyh_kk: '{n} kk', tc_ika_lyh_tanaan: 'tänään',
    tc_ika_pv: '{n} pv sitten', tc_ika_vk: '{n} vk sitten', tc_ika_kk: '{n} kk sitten', tc_ika_tanaan: 'tänään',
    tc_a_kasvu: 'Kasvu ja kypsyys', tc_a_kasvu_lyhyt: 'Kasvu', tc_a_fyysinen: 'Fyysinen', tc_a_tekninen: 'Tekninen', tc_a_peli: 'Peli', tc_a_keho: 'Kehon valmius',
    tc_n_testi: '{n} testi', tc_n_testia: '{n} testiä', tc_n_havainto: '{n} havainto', tc_n_havaintoa: '{n} havaintoa', tc_n_mittaus: '{n} mittaus', 
    tc_n_arvioija: '{n} arvioija', tc_n_arvioijaa: '{n} arvioijaa', tc_lisa_testeja: '+ {n} testiä kaikissa mittauksissa', tc_lisa_testi: '+ {n} testi kaikissa mittauksissa',
    /* testien nimet */
    tc_t_lin5m: '5 m', tc_t_lin10m: '10 m', tc_t_lin30m: '30 m', tc_t_cmj: 'Vauhditon hyppy (CMJ)', tc_t_sj: 'Staattinen hyppy (SJ)', tc_t_mas: 'Aerobinen nopeus (MAS)', tc_t_kasirata: 'Ketteryys',
    tc_t_sm_juoksu: 'Juoksurata', tc_t_sm_pallo: 'Pallorata', tc_t_sm_ero: 'Pallorata − juoksurata', tc_t_syotto: 'Syöttö', tc_t_pujottelu: 'Pujottelu', tc_t_ponnauttelu: 'Ponnauttelu',
    tc_t_kuljetus_laukaus: 'Kuljetus ja laukaus', tc_t_a: 'Havainnointi', tc_t_d: 'Päätöksenteko', tc_t_ac: 'Toteutus', tc_t_r: 'Reagointi', tc_t_d3: 'Valmennettavuus', tc_t_keho: 'Kehon valmius',
    tc_t_phv: 'Kasvupyrähdyksen tila', tc_t_phv_ika: 'Kasvupyrähdyksen ikä (arvio)', tc_t_kasvutahti: 'Kasvutahti',
    tc_phv_PRE: 'ennen pyrähdystä', tc_phv_LAH: 'pyrähdys lähestyy', tc_phv_PH: 'pyrähdyksessä', tc_phv_POST: 'pyrähdys ohi', tc_phv_AN: 'aikuisen mitoissa', tc_phv_tuntematon: 'ei mitattu',
    /* lähteet */
    tc_l_tk: 'Taitotestit', tc_l_hh: 'H-H-testit', tc_l_sm: 'Seuran testit', tc_l_adar: 'Pelihavainnot', tc_l_d3: 'Psyykkinen arvio', tc_l_flei: 'Kehon valmius -mittaus', tc_l_kasvu: 'Kasvumittaus', tc_l_fysiikka: 'Fysiikkatestit',
    tc_lahde_rivi: '{lahde} · {pvm} · taso testihetken iästä', tc_lahde_rivi_ilman_ikaa: '{lahde} · {pvm}', tc_lahde_rivi_ero: '{lahde} · {pvm}', tc_lahde_rivi_ei_pvm: '{lahde}. Päivä puuttuu',
    tc_ika_amber: 'mittaus yli 3 kk vanha', tc_ika_vanha: 'mittaus yli 6 kk vanha', tc_ika_hyvin_vanha: 'mitattu {vuosi} · päivitä',
    /* merkit */
    tc_m_fokus: 'Jakson fokus · {aihe}', tc_m_fokus_lyhyt: 'Jakson fokus', tc_m_ei_mitattu: 'Ei mitattu', tc_m_tekniikkanayte: 'Tekniikkanäyte', tc_m_huomio: 'Huomio', tc_m_n_osa_aluetta: '{n} osa-aluetta',
    /* toiminnot */
    tc_x_suunnittele_mittaus: 'Suunnittele mittaus', tc_x_suunnittele_kasvumittaus: 'Suunnittele kasvumittaus', tc_x_suunnittele_kierros: 'Suunnittele mittauskierros', tc_x_paivita: 'Päivitä mittaus',
    tc_x_testihistoria: 'Näytä testihistoria', tc_x_aloita_jakso: 'Aloita jakso', tc_x_aiheeksi: '{aihe} seuraavan jakson aiheeksi', tc_x_kehityskohde_jakso: 'Kehityskohde: {aihe}', tc_x_avaa_polku: 'Avaa jakso Polussa',
    tc_x_puheeksi: 'Ota {aihe} puheeksi · kysymykset pelaajalle', tc_x_havainto: 'Merkitse pelihavainto', tc_x_kuorma: 'Tarkista jakson kuorma', tc_x_pelaajaraportti: 'Pelaajaraportti ↗',
    
    /* koonti ja tyhjät */
    tc_koonti_otsikko: 'Mittauskierros puuttuu', tc_koonti_lause_n: 'Yksi mittauskierros täyttää {n} korttia kerralla.', tc_koonti_lause_3: 'Yksi mittauskierros täyttää kolme korttia kerralla.', tc_koonti_lause_4: 'Yksi mittauskierros täyttää neljä korttia kerralla.', tc_koonti_lause_nimet: '{nimet} puuttuvat.', tc_koonti_lause_nimi: '{nimet} puuttuu.', tc_koonti_aika_kasvu: '~3 min',
    tc_yht_tyhja: 'Pelaajasta ei ole vielä mittauksia.', tc_yht_tyhja_havainto: 'Yksi pelihavainto on kirjattu.', tc_yht_tyhja_havaintoja: '{n} pelihavaintoa on kirjattu.', tc_yht_tyhja_ohje: 'Vahvuus ja kehityskohde näkyvät, kun ensimmäinen mittauskierros on tehty.',
    tc_yht_ei_kohdetta: 'ei vielä', tc_yht_meta: '{alue} · taso {taso}/{max} · {pvm}',
    /* kasvu */
    tc_kasvu_tuntematon: 'Kasvua ei ole mitattu. Ennen mittausta heikointa osa-aluetta ei tulkita kehityskohteeksi.', tc_kasvu_tarvitaan: 'Tarvitaan pituus, istumapituus ja paino · noin 3 min/pelaaja',
    tc_kasvu_pre: 'Kasvupyrähdys ei ole alkanut.', tc_kasvu_lah: 'Kasvupyrähdys lähestyy.', tc_kasvu_ph: 'Kasvupyrähdys on käynnissä.', tc_kasvu_post: 'Kasvupyrähdys on ohi.',
    tc_kasvu_phv_ika: 'Arvio kasvupyrähdyksen iästä {ika} v.', tc_kasvu_tahti: 'Kasvutahti {x} cm/v.',
    tc_kasvu_pre_ohje: 'Heikointa fyysistä testiä (30 m, hyppy, kestävyysjuoksu) ei nimetä kehityskohteeksi.', tc_kasvu_lah_ohje: 'Seuraa kasvua 3 kk välein; fyysinen jakso odottaa.',
    tc_kasvu_ph_ohje: 'Kuormaa rajoitetaan: ei hyppy- eikä maksimisarjoja. Tekniikkatulokset voivat heitellä.', tc_kasvu_post_ohje: 'Fyysiset tulokset voidaan tulkita ikänormin mukaan; heikoin osa-alue käy kehityskohteeksi.',
    tc_kasvu_kiihtyy: 'Kasvu kiihtyy ({x} cm/v): seuraa kuormaa.', tc_kasvu_nopea: 'Kasvutahti {x} cm/v on nopea: loukkaantumisriski, kuorma tarkistetaan.',
    /* fyysinen */
    tc_fy_tyhja: 'Ei fysiikkatestejä. Ensimmäinen testikierros (juoksu, hyppy, kestävyys) antaa lähtötason.', tc_fy_taso: 'Taso on ikäisekseen {taso}.', tc_fy_yksi: '{testi}: taso on ikäisekseen {taso}.',
    tc_fy_vahvin_heikoin: 'Vahvin {vahvin}, heikoin {heikoin}.', tc_fy_raaka: 'Ei normia näille testeille: tulokset näytetään sellaisenaan.',
    tc_fy_tulk_voima: 'Hyppy ja sprintti ovat molemmat matalalla: voimantuotto rajoittaa nopeutta. Painota voima- ja hyppyharjoittelua.', tc_fy_tulk_juoksu: 'Voimaa on, mutta juoksu ei vielä hyödynnä sitä. Painota kiihdytystä ja juoksutekniikkaa.',
    tc_fy_tulk_suunnanmuutos: 'Suora nopeus on hyvä, suunnanmuutos jää jälkeen. Painota jarrutusta ja suunnanmuutostaitoa.', tc_fy_tulk_selite: 'Perustuu hyppytason ja sprinttitason eroon samanikäisiin verrattuna.',
    tc_fy_ph: 'Kasvupyrähdys käynnissä: tulokset vaihtelevat.', tc_fy_selite: 'Ennen kasvumittausta heikointa fyysistä testiä ei nimetä kehityskohteeksi, koska ero voi johtua kasvuvaiheesta.', tc_selite_aria: 'Miksi?',
    /* tekninen */
    tc_te_tyhja: 'Ei tekniikkatestejä. Ensimmäinen tekniikkakilpailu antaa lähtötason.', tc_te_yksi: 'Yhdestä testistä ei vielä tehdä tasoa. Tulos näytetään sellaisenaan.', tc_te_taso: 'Taso on ikäisekseen {taso}.',
    tc_te_vahvin_heikoin: 'Vahvin {vahvin}, heikoin {heikoin}.', tc_te_ph: 'Kasvupyrähdyksessä tekniikka voi notkahtaa tilapäisesti.', tc_te_tukee: 'Tukee kauden tavoitetta.',
    /* peli */
    tc_pe_tyhja: 'Ei pelihavaintoja. Peliäly rakentuu havainnoista: ensimmäinen havainto antaa tilannekuvan.', tc_pe_vahan: 'Vähän dataa. Yhdestä havainnosta ei vielä tehdä tulkintaa.', tc_pe_luotettava_ohje: 'Luotettava kuva syntyy noin 3 havainnosta kahdelta arvioijalta.',
    tc_pe_hallussa: 'Hallussa: {nimet}.', tc_pe_kehittyva: 'Kehittyvä: {nimet}.', tc_pe_harjoittelussa: 'Harjoittelussa: {nimet}.',
    
    tc_pe_luotettava: 'luotettava', tc_pe_alustava: 'alustava', 
    tc_d3_inner_drive: 'Sisäinen motivaatio', tc_d3_coachability: 'Valmennettavuus', tc_d3_resilience: 'Sinnikkyys', tc_d3_focus: 'Keskittyminen', tc_d3_emotional_control: 'Tunteiden hallinta',
    /* Kehon valmiuden alueet (K4a2, erä 81): avain = ketjun koodi pienellä (data SBL/SFL/LL/DIAG/DFL). {alue} lauseessa "Eniten tukea tarvitsee {alue}.", {missa} rivillä "Näkyy {missa}." — Teron vahvistamat sanat, YKSI paikka. */
    tc_alue_sbl: 'kehon takaosa', tc_alue_sfl: 'kehon etuosa', tc_alue_ll: 'kehon sivut', tc_alue_diag: 'vartalon kierto', tc_alue_dfl: 'keskivartalon tuki',
    tc_alue_sbl_missa: 'kiihdytyksissä ja hypyissä', tc_alue_sfl_missa: 'juoksuaskeleessa ja ryhdissä', tc_alue_ll_missa: 'sivuttaisliikkeissä ja tasapainossa', tc_alue_diag_missa: 'potkussa ja suunnanmuutoksissa', tc_alue_dfl_missa: 'kehonhallinnassa ja kaksinkamppailuissa',
    tc_ts_5: 'erinomainen', tc_ts_4: 'hyvä', tc_ts_3: 'kohtalainen', tc_ts_2: 'kehittyvä', tc_ts_1: 'alkuvaiheessa',
    tc_oma_otsikko: 'Pelaajan oma näkemys', tc_oma_vahvempi: '{nimi} arvioi {aihe} vahvemmaksi kuin valmentajat. Hyvä aihe seuraavaan keskusteluun.', tc_oma_varovaisempi: '{nimi} arvioi {aihe} varovaisemmin kuin valmentajat. Hyvä aihe seuraavaan keskusteluun.',
    tc_oma_aihe_jakso: 'jakson aiheen «{aihe}»', tc_oma_aihe_d3: 'ulottuvuuden «{aihe}»', tc_oma_aihe_oletus: 'oman tekemisensä',
    /* kehon valmius */
    tc_ke_tyhja: 'Kehon valmiutta ei ole mitattu. Lomake vie 10 minuuttia.', tc_ke_tuki: 'Eniten tukea tarvitsee {alue}.', tc_ke_nakyy: 'Näkyy {missa}.', tc_ke_matala: 'Valmius on matala: ohjaa pelaaja fysioterapeutille.',
    tc_ke_taso_hyva: 'Kehon valmius on hyvällä tasolla.', tc_ke_taso_kehittyva: 'Kehon valmius kehittyy.', tc_ke_taso_tuki: 'Kehon valmius tarvitsee tukea.',
    /* trendit */
    tc_kayra_ero: '{eka} → {nyt} · {n} mittausta', tc_kayra_lyhyt: 'Kehitysnopeutta ei arvioida: mittausten väli alle 2 kk', tc_kayra_vauhti: '{x} / kausi',
    tc_kayra_ero: '{eka} → {nyt} · {n} mittausta', tc_kayra_lyhyt: 'Kehitysnopeutta ei arvioida: mittausten väli alle 2 kk', tc_kayra_vauhti: '{x} / kausi', tc_tr_label_up: 'paranee', tc_tr_label_flat: 'ei muutosta', tc_tr_label_down: 'laskee', tc_tr_ei: 'ei trendiä'
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = FI; else root.TM_TODISTEKORTIT_FI = FI;
})(typeof window !== 'undefined' ? window : this);
