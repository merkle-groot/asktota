(function () {
  const form = document.getElementById('chart-finder-form');
  const placeSelect = document.getElementById('birth-place');
  const manualFields = document.getElementById('manual-place-fields');
  const result = document.getElementById('chart-finder-result');
  if (!form || !placeSelect || !manualFields || !result) return;

  // Preset cities: fixed offsets, no DST (India has used a single UTC+5:30 offset since 1945).
  const PLACES = {
    'new-delhi': { label: 'New Delhi', lat: 28.6139, lon: 77.2090, utc: 5.5 },
    mumbai: { label: 'Mumbai', lat: 19.0760, lon: 72.8777, utc: 5.5 },
    bengaluru: { label: 'Bengaluru', lat: 12.9716, lon: 77.5946, utc: 5.5 },
    kolkata: { label: 'Kolkata', lat: 22.5726, lon: 88.3639, utc: 5.5 },
    chennai: { label: 'Chennai', lat: 13.0827, lon: 80.2707, utc: 5.5 },
    hyderabad: { label: 'Hyderabad', lat: 17.3850, lon: 78.4867, utc: 5.5 },
    pune: { label: 'Pune', lat: 18.5204, lon: 73.8567, utc: 5.5 },
    ahmedabad: { label: 'Ahmedabad', lat: 23.0225, lon: 72.5714, utc: 5.5 },
    jaipur: { label: 'Jaipur', lat: 26.9124, lon: 75.7873, utc: 5.5 },
    lucknow: { label: 'Lucknow', lat: 26.8467, lon: 80.9462, utc: 5.5 },
    chandigarh: { label: 'Chandigarh', lat: 30.7333, lon: 76.7794, utc: 5.5 },
    other: null,
  };

  const RASHIS = [
    { name: 'Mesha', english: 'Aries' },
    { name: 'Vrishabha', english: 'Taurus' },
    { name: 'Mithuna', english: 'Gemini' },
    { name: 'Karka', english: 'Cancer' },
    { name: 'Simha', english: 'Leo' },
    { name: 'Kanya', english: 'Virgo' },
    { name: 'Tula', english: 'Libra' },
    { name: 'Vrishchika', english: 'Scorpio' },
    { name: 'Dhanu', english: 'Sagittarius' },
    { name: 'Makara', english: 'Capricorn' },
    { name: 'Kumbha', english: 'Aquarius' },
    { name: 'Meena', english: 'Pisces' },
  ];

  const DEG2RAD = Math.PI / 180;
  const RAD2DEG = 180 / Math.PI;

  function norm360(deg) {
    return ((deg % 360) + 360) % 360;
  }

  function frac(x) {
    return x - Math.floor(x);
  }

  function julianDayUT(year, month, day, hourUT) {
    let y = year;
    let m = month;
    if (m <= 2) {
      y -= 1;
      m += 12;
    }
    const A = Math.floor(y / 100);
    const B = 2 - A + Math.floor(A / 4);
    const jd0 = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + B - 1524.5;
    return jd0 + hourUT / 24;
  }

  // Meeus, Astronomical Algorithms ch.25 — geometric (true) ecliptic longitude of the Sun.
  function sunLongitude(T) {
    const L0 = norm360(280.46646 + T * (36000.76983 + T * 0.0003032));
    const M = norm360(357.52911 + T * (35999.05029 - 0.0001537 * T));
    const Mr = M * DEG2RAD;
    const C =
      (1.914602 - T * (0.004817 + 0.000014 * T)) * Math.sin(Mr) +
      (0.019993 - 0.000101 * T) * Math.sin(2 * Mr) +
      0.000289 * Math.sin(3 * Mr);
    return norm360(L0 + C);
  }

  // Montenbruck & Pfleger low-precision Moon longitude (main perturbation terms only, ~0.3-0.5 deg accuracy).
  function moonLongitude(T) {
    const L0 = frac(0.606433 + 1336.855225 * T);
    const l = 2 * Math.PI * frac(0.374897 + 1325.552410 * T);
    const ls = 2 * Math.PI * frac(0.993133 + 99.997361 * T);
    const D = 2 * Math.PI * frac(0.827361 + 1236.853086 * T);
    const F = 2 * Math.PI * frac(0.259086 + 1342.227825 * T);

    const dL =
      22640 * Math.sin(l) -
      4586 * Math.sin(l - 2 * D) +
      2370 * Math.sin(2 * D) +
      769 * Math.sin(2 * l) -
      668 * Math.sin(ls) -
      412 * Math.sin(2 * F) -
      212 * Math.sin(2 * l - 2 * D) -
      206 * Math.sin(l + ls - 2 * D) +
      192 * Math.sin(l + 2 * D) -
      165 * Math.sin(ls - 2 * D) -
      125 * Math.sin(D) -
      110 * Math.sin(l + ls) +
      148 * Math.sin(l - ls) -
      55 * Math.sin(2 * F - 2 * D);

    return norm360(360 * frac(L0 + dL / 1296000));
  }

  function obliquity(T) {
    return 23.439291 - 0.0130042 * T - 0.00000016 * T * T + 0.000000504 * T * T * T;
  }

  function gmst(jd) {
    const T = (jd - 2451545.0) / 36525;
    const g =
      280.46061837 +
      360.98564736629 * (jd - 2451545.0) +
      0.000387933 * T * T -
      (T * T * T) / 38710000;
    return norm360(g);
  }

  // Ascendant: derived from the ecliptic/equator/horizon spherical-trig relation.
  // Verified against known boundary cases (RAMC = 0 deg and 270 deg at the equator).
  function ascendant(ramcDeg, latDeg, epsDeg) {
    const ramc = ramcDeg * DEG2RAD;
    const eps = epsDeg * DEG2RAD;
    const lat = latDeg * DEG2RAD;
    const y = Math.cos(ramc);
    const x = -(Math.sin(ramc) * Math.cos(eps) + Math.tan(lat) * Math.sin(eps));
    return norm360(Math.atan2(y, x) * RAD2DEG);
  }

  function lahiriAyanamsa(jd) {
    const years = (jd - 2451545.0) / 365.25;
    return 23.85 + years * (50.2388475 / 3600);
  }

  function signOf(lonDeg, boundaryDeg) {
    const lon = norm360(lonDeg);
    const idx = Math.floor(lon / 30) % 12;
    const degInSign = lon - idx * 30;
    const nearBoundary = degInSign < boundaryDeg || degInSign > 30 - boundaryDeg;
    return { ...RASHIS[idx], degInSign, nearBoundary };
  }

  function computeChart({ year, month, day, hour, minute, utcOffset, lat, lon }) {
    const localHour = hour + minute / 60;
    const utHour = localHour - utcOffset;
    const jd = julianDayUT(year, month, day, utHour);
    const T = (jd - 2451545.0) / 36525;

    const sunTropical = sunLongitude(T);
    const moonTropical = moonLongitude(T);
    const eps = obliquity(T);
    const ramc = norm360(gmst(jd) + lon);
    const ascTropical = ascendant(ramc, lat, eps);

    const ayanamsa = lahiriAyanamsa(jd);

    return {
      ayanamsa,
      sun: signOf(sunTropical - ayanamsa, 1.5),
      moon: signOf(moonTropical - ayanamsa, 4),
      asc: signOf(ascTropical - ayanamsa, 1.5),
    };
  }

  placeSelect.addEventListener('change', function () {
    manualFields.hidden = placeSelect.value !== 'other';
  });

  function cardHtml(label, sign, note) {
    const boundary = sign.nearBoundary
      ? `<p class="chart-card-flag">Close to a sign boundary — ${note}</p>`
      : '';
    return `<div class="chart-result-card"><p class="chart-card-label">${label}</p><h3>${sign.name} <span>(${sign.english})</span></h3>${boundary}</div>`;
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    const dateVal = document.getElementById('birth-date-full').value;
    const timeVal = document.getElementById('birth-time').value;
    if (!dateVal || !timeVal) return;

    const [year, month, day] = dateVal.split('-').map(Number);
    const [hour, minute] = timeVal.split(':').map(Number);

    let lat, lon, utcOffset;
    const placeKey = placeSelect.value;
    if (placeKey === 'other') {
      lat = parseFloat(document.getElementById('manual-lat').value);
      lon = parseFloat(document.getElementById('manual-lon').value);
      utcOffset = parseFloat(document.getElementById('manual-utc').value);
      if (Number.isNaN(lat) || Number.isNaN(lon) || Number.isNaN(utcOffset)) {
        result.hidden = false;
        result.innerHTML =
          '<p class="chart-finder-error">Fill in latitude, longitude, and UTC offset, or pick a city from the list.</p>';
        return;
      }
    } else {
      const place = PLACES[placeKey];
      if (!place) return;
      lat = place.lat;
      lon = place.lon;
      utcOffset = place.utc;
    }

    const chart = computeChart({ year, month, day, hour, minute, utcOffset, lat, lon });

    result.hidden = false;
    result.innerHTML =
      '<div class="chart-result-grid">' +
      cardHtml('Sun sign', chart.sun, 'get the full chart for the exact call.') +
      cardHtml('Moon sign', chart.moon, 'the moon moves fast — get the full chart to confirm.') +
      cardHtml('Rising sign (lagna)', chart.asc, 'double-check with an exact birth time.') +
      '</div>' +
      `<p class="chart-finder-note">Sidereal positions, Lahiri ayanamsa (currently ${chart.ayanamsa.toFixed(2)}°). This runs in ur browser with no chart software behind it — accurate enough to be useful, not a substitute for a full reading.</p>` +
      '<a class="text-link" href="../index.html#download">Get the full chart with Ask Tota →</a>';
  });
})();
