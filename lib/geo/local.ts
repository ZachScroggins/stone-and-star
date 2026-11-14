// Local tangent plane around a site origin, in metres. Scene axes follow three.js:
// +x east, +y up, −z north (so true north is −z and the sky lines up with it).
// Spherical-Earth curvature is ignored inside the scene; across a few kilometres
// the WGS84 radii of curvature keep horizontal error well under a metre.

const A = 6378137.0;
const F = 1 / 298.257223563;
const E2 = F * (2 - F);
const DEG = Math.PI / 180;

export interface GeoOrigin {
  lat: number;
  lon: number;
  /** Metres above mean sea level that maps to scene y = 0. */
  elevationM: number;
}

function radii(latDeg: number) {
  const s = Math.sin(latDeg * DEG);
  const w = Math.sqrt(1 - E2 * s * s);
  return { meridional: (A * (1 - E2)) / (w * w * w), primeVertical: A / w };
}

export function toLocal(
  origin: GeoOrigin,
  lat: number,
  lon: number,
  elevationM = origin.elevationM
) {
  const { meridional, primeVertical } = radii(origin.lat);
  const east = (lon - origin.lon) * DEG * primeVertical * Math.cos(origin.lat * DEG);
  const north = (lat - origin.lat) * DEG * meridional;
  return { x: east, y: elevationM - origin.elevationM, z: -north };
}

export function fromLocal(origin: GeoOrigin, x: number, z: number) {
  const { meridional, primeVertical } = radii(origin.lat);
  return {
    lat: origin.lat + -z / meridional / DEG,
    lon: origin.lon + x / (primeVertical * Math.cos(origin.lat * DEG)) / DEG,
  };
}
