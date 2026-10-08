import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const { oobKoodi, tulkitse, onNimetty, tarkista } = createRequire(import.meta.url)('../scripts/testaa_linkin_voimassaolo.js');
describe('testaa_linkin_voimassaolo — apurit', () => {
  it('oobCode irti linkistä; puuttuva → null', () => {
    expect(oobKoodi('https://x.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=AbC-1_2%3D&apiKey=k&lang=fi')).toBe('AbC-1_2=');
    expect(oobKoodi('https://x/?mode=resetPassword')).toBeNull(); expect(oobKoodi(null)).toBeNull();
  });
  it('tulkinta: 200 → OK, EXPIRED → VANHENTUNUT, INVALID → INVALID, muu → VIRHE', () => {
    expect(tulkitse(200, { email: 'x' })).toBe('OK'); expect(tulkitse(400, { error: { message: 'EXPIRED_OOB_CODE' } })).toBe('VANHENTUNUT');
    expect(tulkitse(400, { error: { message: 'INVALID_OOB_CODE' } })).toBe('INVALID'); expect(tulkitse(500, null)).toBe('VIRHE'); expect(tulkitse(400, { error: { message: 'OPERATION_NOT_ALLOWED' } })).toBe('VIRHE');
  });
  it('vain nimetyt KPV-testipelaajat sallitaan', () => {
    for (const [e, s] of [['Topias', "O´Koskela"], ['Toppari', 'Testi'], ['Testi', 'Pelaaja'], ['Testi', 'Test'], ['Tero', 'Testaaja']]) expect(onNimetty(e, s), e).toBe(true);
    expect(onNimetty('Matti', 'Meikäläinen')).toBe(false); expect(onNimetty('', '')).toBe(false);
  });
  it('tarkista: kutsuu accounts:resetPassword ILMAN newPassword-kenttää (ei kuluta linkkiä, ei muuta salasanaa)', async () => {
    let body; const r = await tarkista('KOODI', async (url, o) => { body = JSON.parse(o.body); expect(url).toContain('accounts:resetPassword'); return { status: 200, json: async () => ({ email: 'a' }) }; });
    expect(r).toBe('OK'); expect(body).toEqual({ oobCode: 'KOODI' });
  });
});
