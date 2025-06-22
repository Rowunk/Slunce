import { calculate } from './solarCalc.js';
import {
  getJulianDate,
  getSolarDeclination,
  getEquationOfTime,
  getHourAngle
} from './solarMath.js';
import { getTimezoneFromCoordinates } from './timezone.js';

/* ---------- constants & small helpers ------------------------------ */
const MS_DAY = 86_400_000;
const rad    = (d) => (d * Math.PI) / 180;
const deg    = (r) => (r * 180) / Math.PI;
const PAD2   = (n) => n.toString().padStart(2, '0');

/* “HH:MM(:SS)” → seconds */
const hhmmToSec = (s) => {
  const m = s?.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  return m ? (+m[1] * 3600 + +m[2] * 60 + (+m[3] || 0)) : null;
};

/* ---------- pretty delta label ------------------------------------- */
export const deltaLabel = (sec) => {
  if (sec == null) return '—';
  const min = sec / 60;
  if (Math.abs(min) < 0.05) return '0 m';
  const v = Math.abs(min) < 1 ? min.toFixed(1) : Math.round(min);
  return min > 0 ? `↑ ${v} m` : `↓ ${v} m`;
};

/* ---------- daylight seconds (leap-second aware) ------------------- */
function solarDaySeconds(date, lat) {
  const secsPerDay = (Date.UTC(date.getUTCFullYear(),
                               date.getUTCMonth(),
                               date.getUTCDate() + 1) -
                      Date.UTC(date.getUTCFullYear(),
                               date.getUTCMonth(),
                               date.getUTCDate())) / 1000;

  const jd   = getJulianDate(date);
  const decl = getSolarDeclination(jd);
  const ha   = getHourAngle(lat, decl, -0.833);

  if (ha === null) {
    const noonAlt = 90 - Math.abs(lat - deg(decl));
    return noonAlt > -0.833 ? secsPerDay : 0;
  }
  return Math.round(2 * ha * 3600);
}

/* ---------- Δ helpers ---------------------------------------------- */
export const deltaDayLength = (date, lat, _lng, offset) =>
  solarDaySeconds(date, lat) -
  solarDaySeconds(new Date(+date + offset * MS_DAY), lat);

export const deltaRiseSet = (date, lat, lng, offset, which) => {
  const a = hhmmToSec(calculate(date,               lat, lng)[which]);
  const b = hhmmToSec(calculate(new Date(+date + offset * MS_DAY), lat, lng)[which]);
  return (a != null && b != null) ? a - b : null;
};

export const deltaWeek = (date, lat) =>
  solarDaySeconds(date, lat) -
  solarDaySeconds(new Date(+date - 7 * MS_DAY), lat);

/* ---------- solar geometry ---------------------------------------- */
export const solarNoonAltitude = (date, lat) => {
  const declDeg = deg(getSolarDeclination(getJulianDate(date)));
  return (90 - Math.abs(lat - declDeg)).toFixed(1);
};
export const equationOfTimeMinutes = (date) =>
  getEquationOfTime(getJulianDate(date)).toFixed(1);

export function sunriseAzimuth(lat, δ) {
  return azFromH(lat, δ, -getHourAngle(lat, δ, -0.833));
}
export function sunsetAzimuth(lat, δ) {
  return azFromH(lat, δ,  getHourAngle(lat, δ, -0.833));
}
function azFromH(lat, δ, Hh) {
  const H  = rad(Hh * 15);
  const φ  = rad(lat);
  const az = Math.atan2(
    Math.sin(H),
    Math.cos(H) * Math.sin(φ) - Math.tan(δ) * Math.cos(φ)
  );
  return ((deg(az) + 540) % 360).toFixed(1);
}

/* duration helper */
function spanMin(start, end) {
  const s = hhmmToSec(start);
  const e = hhmmToSec(end);
  return (s != null && e != null)
    ? Math.round(((e - s + 86_400) % 86_400) / 60)
    : null;
}

export const goldenDuration = (t) => ({
  morning: spanMin(t.sunrise,         t.goldenHourEnd),
  evening: spanMin(t.goldenHourStart, t.sunset)
});
export const blueDuration      = (t) => spanMin(t.blueHourStart, t.civilDusk);
export const civilDuration     = (t) => spanMin(t.civilDawn,     t.civilDusk);
export const nauticalDuration  = (t) => spanMin(t.nauticalDawn,  t.nauticalDusk);
export const astroDuration     = (t) => spanMin(t.astronomicalDawn,
                                                t.astronomicalDusk);

/* ---------- seasonal metrics -------------------------------------- */
function nextSolsticeUTC(date) {
  const y = date.getUTCFullYear();
  const june = Date.UTC(y, 5, 21);
  const dec  = Date.UTC(y,11,21);
  const ts   = +date;
  return ts < june ? june : ts < dec ? dec : Date.UTC(y + 1, 5, 21);
}
export const daysToSolstice = (date) =>
  Math.ceil( (nextSolsticeUTC(date) - +date) / MS_DAY );

export const seasonProgress = (date) => {
  const next = nextSolsticeUTC(date);
  const last = next - 182.625 * MS_DAY;                       // mean half-year
  const pct  = 100 * (+date - last) / (next - last);
  return +pct.toFixed(1);                                     // one decimal
};

export const daylightTrend = (sec) =>
  sec > 0 ? '↑ increasing' :
  sec < 0 ? '↓ shortening' : '• steady';

/* centred two-day slope for max change */
export function peakChangeDate(date, lat) {
  let best = 0, when = +date;
  for (let d = -183; d <= 183; d++) {
    const ahead = solarDaySeconds(new Date(+date + (d + 1) * MS_DAY), lat);
    const behind= solarDaySeconds(new Date(+date + (d - 1) * MS_DAY), lat);
    const slope = Math.abs(ahead - behind) / 2;
    if (slope > best) { best = slope; when = +date + d * MS_DAY; }
  }
  return new Date(when);
}

/* ---------- physical quantities ----------------------------------- */
export function trueSolarTime(date, lng, tz) {
  const mins = date.getUTCHours()*60 + date.getUTCMinutes();
  const offs = getEquationOfTime(getJulianDate(date)) + 4*lng - 60*tz;
  return (mins + offs + 1440) % 1440;
}
export const fmtClock = (m) => `${PAD2(Math.floor(m/60))}:${PAD2(Math.round(m%60))}`;

export const solarDeclinationDeg =
  (date) => deg(getSolarDeclination(getJulianDate(date))).toFixed(2);

export function sunDistanceKm(date) {
  const jd = getJulianDate(date);
  const T  = (jd - 2451545.0) / 36525;
  const M  = rad(357.52911 + 35999.05029 * T - 0.0001537 * T*T);
  const e  = 0.016708634 - 0.000042037 * T - 0.0000001267 * T*T;
  const ν  = M + 2*e*Math.sin(M) + 1.25*e*e*Math.sin(2*M);
  const rAU= (1 - e*e) / (1 + e*Math.cos(ν));
  return rAU * 149_597_870.7;
}
export const solarIntensity = (date) =>
  1361 / ((sunDistanceKm(date)/149_597_870.7) ** 2);

export const shadowLength = (altDeg, h=1) =>
  altDeg <= 0 ? null : (h/Math.tan(rad(altDeg))).toFixed(2);

/* ---------- photography heuristics -------------------------------- */
export function goldenElevation(t, lat, date) {
  const s = hhmmToSec(t.goldenHourStart);
  const e = hhmmToSec(t.goldenHourEnd);
  if (s == null || e == null) return null;

  const midH = ((s + e) / 2) / 3600;                 // mid-hour
  const jd   = getJulianDate(date);
  const δ    = getSolarDeclination(jd);              // rad
  const alt = Math.asin(
                Math.sin(rad(lat))*Math.sin(δ) +
                Math.cos(rad(lat))*Math.cos(δ)*Math.cos(rad((midH-12)*15))
              );
  return deg(alt).toFixed(1);
}

export const lightQuality = (altDeg) =>
  altDeg > 45  ? 'Harsh'   :
  altDeg > 20  ? 'Neutral' :
  altDeg >  6  ? 'Warm'    :
  altDeg > -4  ? 'Golden'  : 'Blue';

const midClock = (a,b) => {
  const sa=hhmmToSec(a), sb=hhmmToSec(b);
  return sa==null||sb==null ? null : fmtClock(((sa+sb+86_400)%86_400)/2);
};
export const portraitMid  = (t) => midClock(t.goldenHourStart, t.goldenHourEnd);
export const landscapeMid = (t) => midClock(t.blueHourStart,   t.civilDusk);
