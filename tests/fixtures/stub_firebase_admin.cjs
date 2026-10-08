'use strict';
/* Esiladattava korvike `firebase-admin`-moduulille (tests/scripts_ei_ajeta_requirella.test.js). Moduulin lataaminen on sallittu, mutta MIKÄ TAHANSA käyttö
   (initializeApp, firestore(), apps, auth …) kirjataan global.__fbKutsut:iin ja heitetään — eli tuotantoyhteyttä ei voi syntyä, vaikka skripti yrittäisi. */
const Module = require('module');
global.__fbKutsut = [];
const proxy = new Proxy(function () {}, {
  get(_t, prop) { if (prop === Symbol.toPrimitive || prop === 'then' || prop === 'inspect') return undefined; global.__fbKutsut.push(String(prop)); throw new Error('TUOTANTOYHTEYS: firebase-admin.' + String(prop)); },
  apply() { global.__fbKutsut.push('(kutsu)'); throw new Error('TUOTANTOYHTEYS: firebase-admin()'); },
});
const alku = Module._load;
Module._load = function (pyynto) { if (pyynto === 'firebase-admin' || /^firebase-admin\//.test(pyynto)) return proxy; return alku.apply(this, arguments); };
