# Code-brief — i18n V5 · VP_v25 **alaerä V6: IDP-jono + idp_tila-statusnäyttö sv**

> **Konteksti:** V3·V4·V5 mainissa, **live-verifioitu tuotannossa** (coach-kortit sv, per-occurrence-gate todistettu).
> **Viisi vartijaa guardaa alusta:** per-occurrence-render-gate · staattinen-DOM · object-property · `.textContent`-luokka · resolves-scanner.
> V6 vie IDP-jonon loppuun. **Iso osa on jo tehty** (staattinen shell 0A:ssa, napit aiemmin) → V6 = pieni täydennys + idp_tila-statusluokka.

## Toteutus (Code - tehty 65fad6c:ssa)
- Vaihe 1: 2 toastia (IDP hyväksytty ✓ / IDP hylätty) vpT-reititetty.
- Vaihe 2: IDP_TILA_LBL (enum→fi-display) + vpT(...) 7893/6130/14475/14500.
- Bonus: [7885,7910] paljasti Kausifokus-kortin (5 lisävuotoa) → reititetty.
- Vartijat: render-gate RANGES += [3777,3865]+ [7885,7910]; MEMBER_DISPLAY += IDP_TILA_LBL[p.idp_tila].
- Portit: lint 0 · 5 vartijaa 0 · resolve 16/16 · C1 ∅ · sv-dup 0 · suite 1645 · ?v=17.

## ⚠ Live-vahvistettavat termit (eivät lukitussa glossaarissa)
idp_tila: Väntar/Godkänd/Avvisad/Saknas · Ehdotettu → Föreslagen (○ Ehdotettu→○ Föreslaget) · Kausifokus → Säsongsfokus/säsongsmål.

## Seuraava
V7 Raportointi (renderRaportointi 15885).