// TalentMaster — Super-admin custom claims
// Tämä skripti asettaa superAdmin: true claim talentmasterid@gmail.com tunnukselle

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const auth = admin.auth();
const db   = admin.firestore();

const SUPER_ADMIN_UID   = 'VERZxR7dQ9Qmnms1Aw1GV5nffcf1';
const SUPER_ADMIN_EMAIL = 'talentmasterid@gmail.com';

async function asetaSuperAdmin() {
  console.log('TalentMaster — Super-admin setup\n');

  // Aseta custom claims
  await auth.setCustomUserClaims(SUPER_ADMIN_UID, {
    superAdmin: true,
    rooli:      'super_admin',
    paketti:    'huipputaso'
  });
  console.log('✅ Super-admin custom claims asetettu:', SUPER_ADMIN_EMAIL);

  // Luo super-admin dokumentti Firestoreen
  await db.collection('admins').doc(SUPER_ADMIN_UID).set({
    email:      SUPER_ADMIN_EMAIL,
    rooli:      'super_admin',
    superAdmin: true,
    luotu:      admin.firestore.FieldValue.serverTimestamp()
  });
  console.log('✅ Admin-dokumentti luotu Firestoreen');

  console.log('\n✅ Super-admin setup valmis!');
  console.log('Kirjaudu sisään:', SUPER_ADMIN_EMAIL);
  process.exit(0);
}

asetaSuperAdmin().catch(function(e) {
  console.error('Virhe:', e);
  process.exit(1);
});
