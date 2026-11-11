/*
 * TypeScript port of selected ERFA functions (long-term precession and Earth
 * rotation angle). ERFA is derived, with permission, from the IAU SOFA library;
 * this is not SOFA. Source: https://github.com/liberfa/erfa (src/ltp*.c, era00.c,
 * gmst06.c). Coefficients copied verbatim; tests use ERFA's own reference values
 * from t_erfa_c.c.
 *
 * Copyright (C) 2013-2021, NumFOCUS Foundation. All rights reserved.
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted under the BSD 3-clause terms in THIRD_PARTY_NOTICES.md.
 *
 * Long-term precession model: Vondrák, J., Capitaine, N. and Wallace, P., 2011,
 * "New precession expressions, valid for long time intervals", A&A 534, A22
 * (with the 2012 erratum, A&A 541, C1). Valid for ±200,000 years from J2000.
 */

export type Vec3 = [number, number, number];
export type Mat3 = [Vec3, Vec3, Vec3];

const DAS2R = Math.PI / (180 * 3600);
const D2PI = 2 * Math.PI;
const DJ00 = 2451545.0;
const DJC = 36525.0;

/** Normalize an angle into [0, 2π). */
export function anp(a: number): number {
  const w = a % D2PI;
  return w < 0 ? w + D2PI : w;
}

function pxp(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function pn(v: Vec3): Vec3 {
  const m = Math.hypot(v[0], v[1], v[2]);
  return m === 0 ? [0, 0, 0] : [v[0] / m, v[1] / m, v[2] / m];
}

/** Long-term precession of the ecliptic pole (eraLtpecl). `epj` is a Julian epoch (TT). */
export function ltpecl(epj: number): Vec3 {
  const eps0 = 84381.406 * DAS2R;
  const pqpol = [
    [5851.607687, -0.1189, -0.00028913, 0.000000101],
    [-1600.8863, 1.1689818, -0.0000002, -0.000000437],
  ];
  const pqper = [
    [708.15, -5486.751211, -684.66156, 667.66673, -5523.863691],
    [2309.0, -17.127623, 2446.28388, -2354.886252, -549.74745],
    [1620.0, -617.517403, 399.671049, -428.152441, -310.998056],
    [492.2, 413.44294, -356.652376, 376.202861, 421.535876],
    [1183.0, 78.614193, -186.387003, 184.778874, -36.776172],
    [622.0, -180.732815, -316.80007, 335.321713, -145.278396],
    [882.0, -87.676083, 198.296701, -185.138669, -34.74445],
    [547.0, 46.140315, 101.135679, -120.97283, 22.885731],
  ];

  const t = (epj - 2000.0) / 100.0;
  let p = 0;
  let q = 0;
  let w = D2PI * t;
  for (const [period, pc, qc, ps, qs] of pqper) {
    const a = w / period;
    const s = Math.sin(a);
    const c = Math.cos(a);
    p += c * pc + s * ps;
    q += c * qc + s * qs;
  }
  w = 1;
  for (let i = 0; i < 4; i++) {
    p += pqpol[0][i] * w;
    q += pqpol[1][i] * w;
    w *= t;
  }
  p *= DAS2R;
  q *= DAS2R;

  w = 1 - p * p - q * q;
  w = w < 0 ? 0 : Math.sqrt(w);
  const s = Math.sin(eps0);
  const c = Math.cos(eps0);
  return [p, -q * c - w * s, -q * s + w * c];
}

/** Long-term precession of the equator pole (eraLtpequ). */
export function ltpequ(epj: number): Vec3 {
  const xypol = [
    [5453.282155, 0.4252841, -0.00037173, -0.000000152],
    [-73750.93035, -0.7675452, -0.00018725, 0.000000231],
  ];
  const xyper = [
    [256.75, -819.940624, 75004.344875, 81491.287984, 1558.515853],
    [708.15, -8444.676815, 624.033993, 787.163481, 7774.939698],
    [274.2, 2600.009459, 1251.136893, 1251.296102, -2219.534038],
    [241.45, 2755.17563, -1102.212834, -1257.950837, -2523.969396],
    [2309.0, -167.659835, -2660.66498, -2966.79973, 247.850422],
    [492.2, 871.855056, 699.291817, 639.744522, -846.485643],
    [396.1, 44.769698, 153.16722, 131.600209, -1393.124055],
    [288.9, -512.313065, -950.865637, -445.040117, 368.526116],
    [231.1, -819.415595, 499.754645, 584.522874, 749.045012],
    [1610.0, -538.071099, -145.18821, -89.756563, 444.704518],
    [620.0, -189.793622, 558.116553, 524.42963, 235.934465],
    [157.87, -402.922932, -23.923029, -13.549067, 374.049623],
    [220.3, 179.516345, -165.405086, -210.157124, -171.33018],
    [1200.0, -9.814756, 9.344131, -44.919798, -22.899655],
  ];

  const t = (epj - 2000.0) / 100.0;
  let x = 0;
  let y = 0;
  let w = D2PI * t;
  for (const [period, xc, yc, xs, ys] of xyper) {
    const a = w / period;
    const s = Math.sin(a);
    const c = Math.cos(a);
    x += c * xc + s * xs;
    y += c * yc + s * ys;
  }
  w = 1;
  for (let i = 0; i < 4; i++) {
    x += xypol[0][i] * w;
    y += xypol[1][i] * w;
    w *= t;
  }
  x *= DAS2R;
  y *= DAS2R;
  w = 1 - x * x - y * y;
  return [x, y, w < 0 ? 0 : Math.sqrt(w)];
}

/** Long-term precession matrix, J2000 mean equator/equinox to mean of date (eraLtp). */
export function ltp(epj: number): Mat3 {
  const peqr = ltpequ(epj);
  const pecl = ltpecl(epj);
  const eqx = pn(pxp(peqr, pecl));
  const mid = pxp(peqr, eqx);
  return [eqx, mid, peqr];
}

/** Long-term precession matrix including the GCRS frame bias (eraLtpb). */
export function ltpb(epj: number): Mat3 {
  const dx = -0.016617 * DAS2R;
  const de = -0.0068192 * DAS2R;
  const dr = -0.0146 * DAS2R;
  const rp = ltp(epj);
  return rp.map((r) => [
    r[0] - r[1] * dr + r[2] * dx,
    r[0] * dr + r[1] + r[2] * de,
    -r[0] * dx - r[1] * de + r[2],
  ]) as Mat3;
}

/** Earth rotation angle (IAU 2000), UT1 as a two-part Julian date (eraEra00). */
export function era00(dj1: number, dj2: number): number {
  const [d1, d2] = dj1 < dj2 ? [dj1, dj2] : [dj2, dj1];
  const t = d1 + (d2 - DJ00);
  const f = (d1 % 1) + (d2 % 1);
  return anp(D2PI * (f + 0.779057273264 + 0.00273781191135448 * t));
}

/**
 * Greenwich mean sidereal time, IAU 2006 (eraGmst06). The polynomial is only
 * valid within a few centuries of J2000; ancient skies use solar time instead
 * (see `sky.ts`).
 */
export function gmst06(uta: number, utb: number, tta: number, ttb: number): number {
  const t = (tta - DJ00 + ttb) / DJC;
  return anp(
    era00(uta, utb) +
      (0.014506 +
        (4612.156534 +
          (1.3915817 + (-0.00000044 + (-0.000029956 + -0.0000000368 * t) * t) * t) * t) *
          t) *
        DAS2R
  );
}

export function mxv(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
    m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
    m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
  ];
}
