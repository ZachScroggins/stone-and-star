import { describe, expect, it } from 'vitest';

import { era00, gmst06, ltp, ltpb, ltpecl, ltpequ } from './erfa';

// Reference values from ERFA's own test suite (liberfa/erfa src/t_erfa_c.c),
// with ERFA's tolerances.
const close = (actual: number, expected: number, tol: number) =>
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tol);

describe('ERFA long-term precession port', () => {
  it('ltpecl matches t_ltpecl', () => {
    const v = ltpecl(-1500.0);
    close(v[0], 0.4768625676477096525e-3, 1e-14);
    close(v[1], -0.4052259533091875112, 1e-14);
    close(v[2], 0.9142164401096448012, 1e-14);
  });

  it('ltpequ matches t_ltpequ', () => {
    const v = ltpequ(-2500.0);
    close(v[0], -0.3586652560237326659, 1e-14);
    close(v[1], -0.1996978910771128475, 1e-14);
    close(v[2], 0.9118552442250819624, 1e-14);
  });

  it('ltp matches t_ltp', () => {
    const r = ltp(1666.666);
    const expected = [
      [0.9967044141159213819, 0.743780189319321084e-1, 0.3237624409345603401e-1],
      [-0.7437802731819618167e-1, 0.997229389445453307, -0.1205768842723593346e-2],
      [-0.3237622482766575399e-1, -0.1206286039697609008e-2, 0.9994750246704010914],
    ];
    expected.forEach((row, i) => row.forEach((e, j) => close(r[i][j], e, 1e-14)));
  });

  it('ltpb matches t_ltpb', () => {
    const r = ltpb(1666.666);
    const expected = [
      [0.9967044167723271851, 0.7437794731203340345e-1, 0.3237632684841625547e-1],
      [-0.7437795663437177152e-1, 0.9972293947500013666, -0.1205741865911243235e-2],
      [-0.3237630543224664992e-1, -0.1206316791076485295e-2, 0.9994750220222438819],
    ];
    expected.forEach((row, i) => row.forEach((e, j) => close(r[i][j], e, 1e-14)));
  });

  it('era00 matches t_era00', () => {
    close(era00(2400000.5, 54388.0), 0.4022837240028158102, 1e-12);
  });

  it('gmst06 matches t_gmst06', () => {
    close(gmst06(2400000.5, 53736.0, 2400000.5, 53736.0), 1.754174971870091203, 1e-12);
  });
});
