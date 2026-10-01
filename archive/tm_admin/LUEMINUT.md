# Arkistoidut tm_admin-skriptit (P2, 1.10.2026)

`setup_admin.js`, `setup_seurat.js` ja `setup_demo_fc.js` olivat käyttöönoton kertaluonteisia skriptejä
(kovakoodattuja uid:itä, palvelutiliavain). Niitä ei ajeta enää. SA-oikeudet = `admins`-kokoelma
(ks. `tm_admin/backfill_claims.js`), seurat luodaan Adminin "Lisää seura" -toiminnolla.
