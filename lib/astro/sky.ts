import { AstroTime, Body, GeoMoon, GeoVector, MoonPhase } from 'astronomy-engine';

import { DEG, ofDate, raDecFromVec, toHorizontal, type Horizontal } from './coords';
import { anp, ltpb, type Mat3, type Vec3 } from './erfa';
import { J2000, jdFromDayOfYear, julianEpoch } from './time';

/** Where and when the sky is computed. `year` is astronomical (1 BCE = 0). */
export interface SkyInput {
  year: number;
  /** Day of the proleptic Gregorian year, 1-based. */
  dayOfYear: number;
  /** Local apparent solar time in hours: 12 = the Sun on the meridian. */
  solarHour: number;
  latDeg: number;
  lonDeg: number;
}

export interface SkyFrame {
  /** Julian date (UT taken equal to TT). */
  jd: number;
  epj: number;
  /** J2000 (GCRS) to mean equator and equinox of date. */
  precession: Mat3;
  /** Local sidereal time, radians. */
  lst: number;
  lat: number;
  sun: Horizontal & { vec: Vec3 };
  moon: Horizontal & { vec: Vec3; phaseDeg: number };
}

const AU_KM = 149_597_870.7;
const EARTH_RADIUS_KM = 6378.137;

function toVec3(v: { x: number; y: number; z: number }): Vec3 {
  return [v.x, v.y, v.z];
}

function unit(v: Vec3): Vec3 {
  const m = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / m, v[1] / m, v[2] / m];
}

/**
 * Solve the sky for a date and a local solar time.
 *
 * Setting the sky by solar time (not clock time) avoids ΔT and the long-term
 * sidereal-time polynomials, which are only valid near the present. Local
 * sidereal time follows from the Sun's right ascension of date plus its hour
 * angle, so stars stay correct relative to the Sun at any epoch.
 */
export function solveSky(input: SkyInput): SkyFrame {
  const lat = input.latDeg * DEG;
  const jd =
    jdFromDayOfYear(input.year, input.dayOfYear) + (input.solarHour - input.lonDeg / 15) / 24;
  const epj = julianEpoch(jd);
  const precession = ltpb(epj);
  const time = AstroTime.FromTerrestrialTime(jd - J2000);

  const sunVec = unit(ofDate(precession, toVec3(GeoVector(Body.Sun, time, true))));
  const sunRa = raDecFromVec(sunVec).ra;
  const lst = anp(sunRa + (input.solarHour - 12) * 15 * DEG);

  // Moon: geocentric, then topocentric with a spherical Earth (parallax up to ~1°).
  const moonGeo = ofDate(precession, toVec3(GeoMoon(time)));
  const rObs = EARTH_RADIUS_KM / AU_KM;
  const moonTopo = unit([
    moonGeo[0] - rObs * Math.cos(lat) * Math.cos(lst),
    moonGeo[1] - rObs * Math.cos(lat) * Math.sin(lst),
    moonGeo[2] - rObs * Math.sin(lat),
  ]);

  return {
    jd,
    epj,
    precession,
    lst,
    lat,
    sun: { vec: sunVec, ...toHorizontal(sunVec, lst, lat) },
    moon: { vec: moonTopo, phaseDeg: MoonPhase(time), ...toHorizontal(moonTopo, lst, lat) },
  };
}
