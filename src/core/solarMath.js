/* ---------- Julian day ------------------------------------------------ */
/**
 * Convert a civil Date to Julian Day Number (0 h UT noon basis).
 * @param {Date} d
 * @returns {number}
 */
export function getJulianDate(d) {
  const a = Math.floor((14 - (d.getMonth() + 1)) / 12);
  const y = d.getFullYear() + 4800 - a;
  const m = d.getMonth() + 1 + 12 * a - 3;

  return (
    d.getDate() +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

/* ---------- Solar declination ---------------------------------------- */
/**
 * Solar declination (rad) for given Julian day.
 * Meeus, Astronomical Algorithms §16.
 */
export function getSolarDeclination(jd) {
  const n = jd - 2451545.0;                         // days since J2000.0
  const g = ((357.528 + 0.9856003 * n) % 360) * (Math.PI / 180);   // mean anomaly
  const L = (
    (280.46 + 0.9856474 * n + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) %
    360
  ) * (Math.PI / 180);                              // ecliptic longitude
  const obliq = 23.439 * (Math.PI / 180);           // mean obliquity (good ≤2100)
  return Math.asin(Math.sin(obliq) * Math.sin(L));
}

/* ---------- Equation of Time ----------------------------------------- */
/**
 * Equation of time (minutes).
 * Positive  → sundial is slow (solar noon after 12 : 00).
 * Implements the Meeus VSOP87-based series (Chap. 28) –
 * maximum error ≈ ±9 s between 1900-2100.
 */
export function getEquationOfTime(jd) {
  const rad = (deg) => (deg * Math.PI) / 180;
  const T   = (jd - 2451545.0) / 36525;             // Julian centuries since J2000

  /* Geometric mean longitude of the Sun (deg, 0–360) */
  const L0 =
    (280.46646 + 36000.76983 * T + 0.0003032 * T * T) % 360;

  /* Mean anomaly of the Sun (deg) */
  const M  =
    357.52911 + 35999.05029 * T - 0.0001537 * T * T;

  /* Eccentricity of Earth's orbit */
  const e  =
    0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;

  /* Mean obliquity of the ecliptic (arc-seconds) */
  const ε0 = 84381.448 -
             46.8150 * T -
              0.00059 * T * T +
              0.001813 * T * T * T;
  const ε  = rad(ε0 / 3600);                       // to radians

  /* Auxiliary */
  const y  = Math.tan(ε / 2) ** 2;

  /* Convert to radians once */
  const L0r = rad(L0);
  const Mr  = rad(M);

  /* Meeus 28.3 */
  const E = 4 * (180 / Math.PI) * (
      y * Math.sin(2 * L0r) -
      2 * e * Math.sin(Mr) +
      4 * e * y * Math.sin(Mr) * Math.cos(2 * L0r) -
      0.5 * y * y * Math.sin(4 * L0r) -
      1.25 * e * e * Math.sin(2 * Mr)
  );

  return E;                                         // minutes
}

/* ---------- Hour angle ------------------------------------------------ */
/**
 * Hour-angle for a given solar altitude angle.
 * @param {number} lat   latitude in ° (positive N)
 * @param {number} decl  solar declination (rad)
 * @param {number} angle solar altitude in ° (e.g. −6 = civil twilight)
 * @returns {number|null} hour angle in **hours**, or null for polar day/night
 */
export function getHourAngle(lat, decl, angle) {
  const rad = (deg) => (deg * Math.PI) / 180;
  const cosH =
    (Math.sin(rad(angle)) - Math.sin(rad(lat)) * Math.sin(decl)) /
    (Math.cos(rad(lat)) * Math.cos(decl));

  if (cosH < -1 || cosH > 1) return null;           // event does not occur
  return (Math.acos(cosH) * 12) / Math.PI;          // convert rad→hours
}
