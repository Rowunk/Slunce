import en from '../i18n/en.js';
import cs from '../i18n/cs.js';
import { calculate } from '../core/solarCalc.js';
import {
  deltaDayLength, deltaRiseSet, deltaWeek, deltaLabel,
  daylightTrend, seasonProgress, daysToSolstice, peakChangeDate,
  solarNoonAltitude, equationOfTimeMinutes,
  sunriseAzimuth, sunsetAzimuth,
  goldenDuration, blueDuration,
  civilDuration, nauticalDuration, astroDuration,
  solarDeclinationDeg, sunDistanceKm,
  solarIntensity, shadowLength, trueSolarTime, fmtClock,
  goldenElevation, lightQuality,
  portraitMid, landscapeMid
} from '../core/solarExtras.js';
import { getJulianDate, getSolarDeclination } from '../core/solarMath.js';
import { getTimezoneFromCoordinates }          from '../core/timezone.js';

/* ---------- i18n --------------------------------------------------- */
const translations = { en, cs };

function detectLanguage() {
  const cached = localStorage.getItem('slunce-language');
  if (cached && translations[cached]) return cached;
  const br = navigator.language.split('-')[0];
  return translations[br] ? br : 'en';
}

let currentLanguage = detectLanguage();

export const getText = (k) =>
  translations[currentLanguage][k] ?? translations.en[k] ?? k;

window.getText = getText;   // for install/update modules

// Helper function to translate dynamic values
function translateValue(value) {
  if (!value || typeof value !== 'string') return value;
  
  // Light quality translations
  const lightMap = {
    'Harsh': getText('lightHarsh'),
    'Neutral': getText('lightNeutral'), 
    'Warm': getText('lightWarm'),
    'Golden': getText('lightGolden'),
    'Blue': getText('lightBlue')
  };
  
  // Trend translations
  const trendMap = {
    '↑ increasing': getText('trendIncreasing'),
    '↓ shortening': getText('trendShortening'), 
    '• steady': getText('trendSteady')
  };
  
  // Event state translations
  const stateMap = {
    'No event': getText('noEvent'),
    'All day': getText('allDay'),
    'All night': getText('allNight'),
    'Continuous': getText('continuous')
  };
  
  return lightMap[value] || trendMap[value] || stateMap[value] || value;
}

/* ---------- tooltip functionality --------------------------------- */
function initTooltips() {
  const isMobile = window.innerWidth <= 768 || 'ontouchstart' in window;
  
  document.querySelectorAll('.info-icon').forEach(icon => {
    if (isMobile) {
      // Mobile: tap to toggle
      icon.addEventListener('click', (e) => {
        e.stopPropagation();
        const tooltip = icon.closest('.info-tooltip');
        
        // Close all other tooltips
        document.querySelectorAll('.info-tooltip.active').forEach(t => {
          if (t !== tooltip) t.classList.remove('active');
        });
        
        // Toggle current tooltip
        tooltip.classList.toggle('active');
      });
    }
  });
  
  // Close mobile tooltips when clicking outside
  if (isMobile) {
    document.addEventListener('click', () => {
      document.querySelectorAll('.info-tooltip.active').forEach(t => {
        t.classList.remove('active');
      });
    });
  }
  
  // Handle window resize to switch between mobile/desktop modes
  window.addEventListener('resize', () => {
    // Close all active tooltips on resize
    document.querySelectorAll('.info-tooltip.active').forEach(t => {
      t.classList.remove('active');
    });
  });
}

function updateLanguage() {
  document.title = getText('title');
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (!key) return;
    if (el.tagName === 'INPUT') el.placeholder = getText(key);
    else el.textContent = getText(key);
  });
  document.querySelectorAll('.lang-btn').forEach((b)=>
    b.classList.remove('active'));
  document.getElementById(`lang-${currentLanguage}`)
    ?.classList.add('active');
  localStorage.setItem('slunce-language', currentLanguage);
  
  // Re-render to update dynamic translations
  calculateAndRender();
}

function switchLanguage(lang) {
  if (translations[lang]) {
    currentLanguage = lang;
    updateLanguage();
  }
}

/* ---------- helpers ------------------------------------------------ */
const todayISO = () => new Date().toLocaleDateString('en-CA');
const setDefaultDate = () =>
  (document.getElementById('date-picker').value = todayISO());

function set(id, val) {
  const el = document.getElementById(id);
  if (!el) return;
  
  // Translate dynamic values before setting
  const translatedVal = translateValue(val);
  el.textContent = translatedVal ?? '--';
  
  // Check for special states using original English values for consistency
  el.classList.toggle('no-event', /No event|All day|All night|Continuous/.test(val));
}

/* ---------- main renderer ----------------------------------------- */
function calculateAndRender() {
  const latInput = document.getElementById('latitude').value.trim();
  const lngInput = document.getElementById('longitude').value.trim();
  const dateStr = document.getElementById('date-picker').value;
  
  // Check if inputs are actually provided (not just empty strings that convert to 0)
  if (!latInput || !lngInput || !dateStr) return;
  
  const lat = +latInput;
  const lng = +lngInput;
  
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  if (lat < -90 || lat > 90)   return alert('Latitude must be –90…90°');
  if (lng < -180 || lng > 180) return alert('Longitude must be –180…180°');
  
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return alert('Invalid date');

  const t = calculate(date, lat, lng);
  
  /* ── main events ─────────────────────────────────────────────── */
  set('sunrise',           t.sunrise);
  set('solar-noon',        t.solarNoon);
  set('sunset',            t.sunset);
  set('astronomical-dawn', t.astronomicalDawn);
  set('nautical-dawn',     t.nauticalDawn);
  set('civil-dawn',        t.civilDawn);
  set('civil-dusk',        t.civilDusk);
  set('nautical-dusk',     t.nauticalDusk);
  set('astronomical-dusk', t.astronomicalDusk);
  set('golden-hour-start', t.goldenHourStart);
  set('golden-hour-end',   t.goldenHourEnd);
  set('blue-hour-start',   t.blueHourStart);
  set('day-length',        t.dayLength);
  set('solar-midnight',    t.solarMidnight);

  /* ── deltas ──────────────────────────────────────────────────── */
  const delta1 = deltaDayLength(date, lat, lng, -1);
  set('delta-day',  deltaLabel(delta1));
  set('delta-rise', deltaLabel(deltaRiseSet(date, lat, lng, -1, 'sunrise')));
  set('delta-set',  deltaLabel(deltaRiseSet(date, lat, lng, -1, 'sunset')));

  /* ── seasonal & trend metrics ───────────────────────────────── */
  set('weekly-delta',   deltaLabel(deltaWeek(date, lat)));
  set('daylight-trend', daylightTrend(delta1));
  set('season-progress', `${seasonProgress(date)} %`);
  set('days-to-solstice', daysToSolstice(date));
  set('peak-change', peakChangeDate(date, lat).toISOString().slice(0, 10));

  /* ── geometry & durations ------------------------------------ */
  set('solar-alt', `${solarNoonAltitude(date, lat)}°`);
  const eot = equationOfTimeMinutes(date);
  set('eot', isFinite(+eot) ? `${eot} min` : '—');
  const declRad = getSolarDeclination(getJulianDate(date));
  set('az-sunrise', `${sunriseAzimuth(lat, declRad)}°`);
  set('az-sunset',  `${sunsetAzimuth(lat, declRad)}°`);
  const { morning, evening } = goldenDuration(t);
  set('gold-dur',
      morning != null && evening != null ? `${morning}/${evening} min` : '—');
  const blue = blueDuration(t);
  set('blue-dur', blue != null ? `${blue} min` : '—');
  set('civil-duration',
      civilDuration(t)    !== null ? `${civilDuration(t)} min`    : '—');
  set('nautical-duration',
      nauticalDuration(t) !== null ? `${nauticalDuration(t)} min` : '—');
  set('astro-duration',
      astroDuration(t)    !== null ? `${astroDuration(t)} min`    : '—');

  /* ── physicals ------------------------------------------------- */
  set('solar-declination', `${solarDeclinationDeg(date)}°`);
  set('sun-distance',      `${(sunDistanceKm(date) / 1e6).toFixed(1)} M km`);
  set('solar-intensity',   `${solarIntensity(date).toFixed(0)} W/m²`);
  const altDeg = +solarNoonAltitude(date, lat);
  set('shadow-length', shadowLength(altDeg) ? `${shadowLength(altDeg)}×` : '—');
  const tz = getTimezoneFromCoordinates(lat, lng, date);
  set('true-solar-time', fmtClock(trueSolarTime(new Date(), lng, tz)));

  /* ── photography ---------------------------------------------- */
  const gElev = goldenElevation(t, lat, date);
  set('golden-elevation', gElev ? `${gElev}°` : '—');
  set('light-quality',    lightQuality(altDeg));
  set('portrait-time',    portraitMid(t)  ?? '--:--');
  set('landscape-time',   landscapeMid(t) ?? '--:--');

  /* visual flash */
  const res = document.getElementById('results');
  res.classList.remove('success');
  setTimeout(() => res.classList.add('success'), 10);
}

/* ---------- auto-refresh True Solar Time every minute ------------ */
let refreshTimer = null;

function startAutoRefresh() {
  if (refreshTimer) return;
  refreshTimer = setInterval(() => {
    if (!document.hidden) calculateAndRender();
  }, 60_000);
}

function stopAutoRefresh() {
  if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopAutoRefresh();
  else { calculateAndRender(); startAutoRefresh(); }
});

/* ---------- geolocation helper ----------------------------------- */
function getCurrentLocation() {
  if (!navigator.geolocation)
    return alert(getText('geoLocationNotSupported'));

  const btn       = document.getElementById('get-location');
  const original  = btn.textContent;
  btn.textContent = getText('gettingLocation');
  btn.disabled    = true;
  btn.classList.add('loading');

  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      document.getElementById('latitude').value  = coords.latitude .toFixed(4);
      document.getElementById('longitude').value = coords.longitude.toFixed(4);
      btn.textContent  = getText('useCurrentLocation');
      btn.disabled     = false;
      btn.classList.remove('loading');
      btn.style.background = 'var(--success)';
      setTimeout(() => (btn.style.background = ''), 800);
      calculateAndRender();
    },
    (err) => {
      console.error(err);
      const msg = {
        [err.PERMISSION_DENIED]   : 'Location access denied.',
        [err.POSITION_UNAVAILABLE]: 'Location unavailable.',
        [err.TIMEOUT]             : 'Location request timed out.'
      };
      alert(msg[err.code] || getText('geoLocationError'));
      btn.textContent  = original;
      btn.disabled     = false;
      btn.classList.remove('loading');
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
  );
}

/* ---------- init wiring ------------------------------------------ */
export function initUI() {
  updateLanguage();
  setDefaultDate();
  initTooltips();         // Initialize tooltip functionality

  document.getElementById('get-location')
    .addEventListener('click', getCurrentLocation);

  ['latitude', 'longitude'].forEach((id) =>
    document.getElementById(id).addEventListener('input', calculateAndRender)
  );

  document.getElementById('date-picker')
    .addEventListener('change', calculateAndRender);

  document.getElementById('lang-en')
    .addEventListener('click', () => switchLanguage('en'));
  document.getElementById('lang-cs')
    .addEventListener('click', () => switchLanguage('cs'));

  calculateAndRender();      // first paint
  startAutoRefresh();        // begin minute timer
}