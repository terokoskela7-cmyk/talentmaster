/**
 * src/lib/tm_lang.js — RE-EXPORT. Kanoninen tiedosto on lib/tm_lang.js (§33/A6: lib/ = deployattu+kanoninen,
 * src/lib/ = re-export). Selain lataa lib/tm_lang.js:n suoraan (kaikki apit); tämä palvelee vain node/require-
 * yhteensopivuutta, jotta vanha polku ei hajoa. ÄLÄ muokkaa tänne sisältöä — laajenna lib/tm_lang.js:ää.
 */
if (typeof module !== 'undefined' && module.exports) module.exports = require('../../lib/tm_lang.js');
