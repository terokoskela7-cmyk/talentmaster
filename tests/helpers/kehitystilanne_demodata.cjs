// Rakentaa Kehitystilanne-datan setup_demo_kehitys.js:n JONOsta (sama muoto kuin Seura.html lataa)
module.exports = function (ROOT) {   // Kehitystilanne-data setup_demo_kehitys.js:n jonosta (sama muoto kuin Seura.html:n _ktLataa)
  const D = require(ROOT + '/tm_admin/setup_demo_kehitys.js');
  const fix = (o) => JSON.parse(JSON.stringify(o, (k, v) => (v && v.__ts ? { seconds: Date.parse(v.__ts) / 1000 } : v && v.__serverTimestamp ? null : v)));
  const S = 'seurat/demo-fc', data = { pelaajat: [], bio: {}, kerrat: {}, idp: {}, kartoitus: {}, kirjaukset: {}, harjoitusarvioinnit: [], mentoroinnit: [], kalenteri: [], joukkueet: [], kausikuvat: [] };
  const kal = {}, omat = {};
  D.JONO.forEach(({ polku, data: d0 }) => {
    const d = fix(d0), o = polku.split('/'), id = o[o.length - 1];
    if (polku === S) data.seura = d;
    else if (o[2] === 'joukkueet') data.joukkueet.push(Object.assign({ id }, d));
    else if (o[2] === 'pelaajat' && o.length === 4) data.pelaajat.push(Object.assign({ id }, d));
    else if (o[4] === 'biologinen_ika') (data.bio[o[3]] = data.bio[o[3]] || []).push(d);
    else if (o[4] === 'arviointikerrat') (data.kerrat[o[3]] = data.kerrat[o[3]] || []).push(d);
    else if (o[4] === 'idp_kausi') data.idp[o[3]] = d;
    else if (o[4] === 'testitulokset' && d.protokolla === 'harjoitettavuus_u12') (data.kartoitus[o[3]] = data.kartoitus[o[3]] || []).push(d);
    else if (o[2] === 'pelaajat' && o[4] === 'kirjaukset') (data.kirjaukset[o[3]] = data.kirjaukset[o[3]] || []).push(d);
    else if (o[2] === 'harjoitusarvioinnit') data.harjoitusarvioinnit.push(d);
    else if (o[2] === 'mentoroinnit') data.mentoroinnit.push(d);
    else if (o[2] === 'kalenteri' && o.length === 4) kal[id] = Object.assign({ id, lasnaolijat: [] }, d);
    else if (o[2] === 'kalenteri' && o[4] === 'lasnaolijat') kal[o[3]].lasnaolijat.push(Object.assign({ id }, d));
    else if (o[2] === 'kehitysasetukset') data.asetukset = d;
    else if (o[2] === 'seuratuki') data.seuratuki = d;
    else if (o[2] === 'omat_tavoitteet' && o.length === 4) omat[id] = Object.assign({ id, kirjaukset: [] }, d, { kirjaukset: (omat[id] || {}).kirjaukset || [] });
    else if (o[2] === 'omat_tavoitteet' && o[4] === 'kirjaukset') (omat[o[3]] = omat[o[3]] || { id: o[3], kirjaukset: [] }).kirjaukset.push(Object.assign({ id }, d));
    else if (o[2] === 'kausikuvat') data.kausikuvat.push(Object.assign({}, d, { luotu: '2026-10-02' }));
  });
  data.kalenteri = Object.values(kal);
  data.omatTavoitteet = Object.values(omat);
  return data;
};
