import {
  getJulianDate,
  getSolarDeclination,
  getEquationOfTime,
  getHourAngle
} from './solarMath.js';

import { getTimezoneFromCoordinates } from './timezone.js';

/* ---------- internal helpers -------------------------------------- */
const PAD2 = (n) => n.toString().padStart(2, '0');

function clampEvent(h) {
  return h == null || h < 0 || h >= 24 ? null : h;
}

/* Rollsafe formatter that never outputs HH:60 */
function formatTime(hours) {
  if (hours == null || Number.isNaN(hours)) return '--:--';

  const hNorm        = ((hours % 24) + 24) % 24;
  const totalMinutes = Math.round(hNorm * 60);

  const hh = Math.floor(totalMinutes / 60) % 24;
  const mm = totalMinutes % 60;

  return `${PAD2(hh)}:${PAD2(mm)}`;
}

function formatDuration(hours) {
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  return `${h}h ${m}m`;
}

function safeFmt(h) {
  return clampEvent(h) == null ? 'No event' : formatTime(h);
}

/* ------------------------------------------------------------------ */
/**
 * Core public API: compute all solar events for a given date & site.
 * @param {Date}   date
 * @param {number} lat  latitude  in °
 * @param {number} lng  longitude in °
 * @returns {Record<string,string>} formatted strings ready for UI
 */
export function calculate(date, lat, lng) {
  const jd   = getJulianDate(date);
  const decl = getSolarDeclination(jd);              // rad
  const declDeg = (decl * 180) / Math.PI;            // °

  const eot  = getEquationOfTime(jd);                // minutes
  const tz   = getTimezoneFromCoordinates(lat, lng, date);

  const solarNoon = 12 - lng / 15 - eot / 60 + tz;   // hours

  const events = {
    sunrise    : -0.833,
    civil      : -6,
    nautical   : -12,
    astronomical: -18,
    goldenHour :  6,    // “nice warm” when Sun ≤ +6°
    blueHour   : -2     // begins when Sun dips 2° below horizon
  };

  const out = {
    solarNoon    : formatTime(solarNoon),
    solarMidnight: formatTime(solarNoon - 12)
  };

  for (const [key, angle] of Object.entries(events)) {
    const ha = getHourAngle(lat, decl, angle);       // hours or null

    /* ---- Polar / continuous cases -------------------------------- */
    if (ha === null) {
      if (key === 'sunrise') {
        const noonAlt = 90 - Math.abs(lat - declDeg);
        const day24h  = noonAlt > -0.833;
        out.sunrise = day24h ? 'All day' : 'No event';
        out.sunset  = out.sunrise;
        out.dayLength = day24h ? '24h 0m' : '0h 0m';
      } else if (key === 'astronomical') {
        /* Sun never below −18 ° (continuous twilight) */
        out.astronomicalDawn = 'Continuous';
        out.astronomicalDusk = 'Continuous';
      } else if (key === 'blueHour') {
        out.blueHourStart = '—';
      } else {
        out[`${key}Dawn`] = 'No event';
        out[`${key}Dusk`] = 'No event';
      }
      continue;
    }

    const morning = solarNoon - ha;
    const evening = solarNoon + ha;

    switch (key) {
      case 'sunrise':
        out.sunrise = safeFmt(morning);
        out.sunset  = safeFmt(evening);
        out.dayLength =
          clampEvent(morning) != null && clampEvent(evening) != null
            ? formatDuration(evening - morning)
            : '0h 0m';
        break;

      case 'civil':
        out.civilDawn = safeFmt(morning);
        out.civilDusk = safeFmt(evening);
        break;

      case 'nautical':
        out.nauticalDawn = safeFmt(morning);
        out.nauticalDusk = safeFmt(evening);
        break;

      case 'astronomical':
        out.astronomicalDawn = safeFmt(morning);
        out.astronomicalDusk = safeFmt(evening);
        break;

      case 'goldenHour':
        /* Morning golden follows sunrise; evening precedes sunset */
        out.goldenHourStart = safeFmt(evening);
        out.goldenHourEnd   = safeFmt(morning);
        break;

      case 'blueHour':
        /* Only evening blue hour for now (−2 ° start, −6 ° end via civilDusk) */
        out.blueHourStart = safeFmt(evening);
        break;
    }
  }

  return out;
}
