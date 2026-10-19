/* Testiapu: pelitilanne-lib sivun globaaleina (window.tmPelitilanne*, window.TM_ADAR_PELITILANNE). Sivu kutsuu niitä window-etuliitteellä (lint no-undef),
   joten vm-hiekkalaatikon `window` tarvitsee OIKEAN libin (ei tynkää). Käyttö: window: { ...PT_WINDOW, ... } */
import { createRequire } from 'module';
const L = createRequire(import.meta.url)('../../lib/tm_adar_pelitilanne.js');
const NK = createRequire(import.meta.url)('../../lib/tm_nakyvyys_kytkin.js');   // 0b: yhtenäinen kytkin (Pikakortti käyttää window.TM_NAKYVYYS_KYTKIN)
export const PT_WINDOW = Object.assign({ TM_ADAR_PELITILANNE: L, TM_NAKYVYYS_KYTKIN: NK }, Object.fromEntries(Object.entries(L).filter(([k]) => k.indexOf('tm') === 0)));
