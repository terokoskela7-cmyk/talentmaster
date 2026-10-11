'use strict';
/**
 * korjaaJoukkueenTestipvm: yhden pelaajan päivitys. Käsin asetettu testipäivä on OIKEA päivä →
 * jokaisen asetettavan *_pvm-kentän vastinpari *_pvm_arvio poistetaan samassa kirjoituksessa
 * (muuten arviomerkintä jää jäljelle ja "päivä arvioitu kaudesta" näkyy oikean päivän vieressä).
 * Puhdas funktio: poistomerkki (admin.firestore.FieldValue.delete()) annetaan parametrina → testattava ilman Firebasea.
 */
function rakennaPaivitys(kentat, uusiPvm, poistoMerkki) {
  const upd = {};
  (kentat || []).forEach((k) => {
    upd[k] = uusiPvm;
    upd[k + '_arvio'] = poistoMerkki;
  });
  return upd;
}

module.exports = { rakennaPaivitys };
