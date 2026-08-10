(function () {
  const form = document.getElementById('chart-finder-form');
  const placeInput = document.getElementById('birth-place-search');
  const placeResults = document.getElementById('birth-place-results');
  const placeLatField = document.getElementById('birth-place-lat');
  const placeLonField = document.getElementById('birth-place-lon');
  const placeStatus = document.getElementById('birth-place-status');
  const result = document.getElementById('chart-finder-result');
  if (!form || !placeInput || !placeResults || !placeLatField || !placeLonField || !placeStatus || !result) return;

  // India has used a single fixed UTC+5:30 offset nationwide since 1945 — no DST to account for.
  const INDIA_UTC_OFFSET = 5.5;
  const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
  const MIN_QUERY_LENGTH = 3;
  const SEARCH_DEBOUNCE_MS = 450;

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

  // --- Birth place search (OpenStreetMap Nominatim, scoped to India) ---

  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  async function searchPlaces(query, signal) {
    const trimmed = query.trim();
    const isPin = /^\d{6}$/.test(trimmed);
    const params = new URLSearchParams({
      format: 'jsonv2',
      addressdetails: '1',
      limit: '8',
      'accept-language': 'en',
    });
    if (isPin) {
      params.set('country', 'India');
      params.set('postalcode', trimmed);
    } else {
      params.set('countrycodes', 'in');
      params.set('q', trimmed);
    }
    const res = await fetch(`${NOMINATIM_URL}?${params.toString()}`, { signal });
    if (!res.ok) throw new Error('Place search failed');
    return res.json();
  }

  function formatPlace(item) {
    const a = item.address || {};
    const primary =
      a.village || a.town || a.city || a.suburb || a.county || (item.display_name || '').split(',')[0];
    const secondary = [a.state_district, a.state].filter(Boolean).join(', ');
    return { primary, secondary };
  }

  let currentController = null;
  let currentItems = [];
  let activeIndex = -1;

  function hideResults() {
    placeResults.hidden = true;
    placeResults.innerHTML = '';
    activeIndex = -1;
  }

  function clearSelection() {
    placeLatField.value = '';
    placeLonField.value = '';
  }

  function updateActive(items) {
    items.forEach((el, i) => el.classList.toggle('is-active', i === activeIndex));
    if (activeIndex >= 0) items[activeIndex].scrollIntoView({ block: 'nearest' });
  }

  function selectItem(index) {
    const item = currentItems[index];
    if (!item) return;
    const { primary, secondary } = formatPlace(item);
    placeInput.value = secondary ? `${primary}, ${secondary}` : primary;
    placeLatField.value = item.lat;
    placeLonField.value = item.lon;
    placeStatus.textContent = '';
    hideResults();
  }

  function renderResults(items) {
    currentItems = items;
    activeIndex = -1;
    if (!items.length) {
      placeResults.hidden = false;
      placeResults.innerHTML =
        '<div class="chart-place-empty">No matches. Try the nearest town, or a 6-digit PIN code.</div>';
      return;
    }
    placeResults.innerHTML = items
      .map((item, i) => {
        const { primary, secondary } = formatPlace(item);
        return `<div class="chart-place-result" data-index="${i}" role="option"><span class="chart-place-result-name">${primary}</span><span class="chart-place-result-meta">${secondary}</span></div>`;
      })
      .join('');
    placeResults.hidden = false;
    placeResults.querySelectorAll('.chart-place-result').forEach((el) => {
      el.addEventListener('mousedown', (event) => {
        event.preventDefault();
        selectItem(Number(el.dataset.index));
      });
    });
  }

  const runSearch = debounce(async function (query) {
    clearSelection();
    if (query.trim().length < MIN_QUERY_LENGTH) {
      hideResults();
      placeStatus.textContent = '';
      return;
    }
    if (currentController) currentController.abort();
    currentController = new AbortController();
    placeStatus.textContent = 'Searching…';
    try {
      const items = await searchPlaces(query, currentController.signal);
      placeStatus.textContent = '';
      renderResults(items);
    } catch (err) {
      if (err.name === 'AbortError') return;
      placeStatus.textContent = "Couldn't reach place search. Check your connection and try again.";
      hideResults();
    }
  }, SEARCH_DEBOUNCE_MS);

  placeInput.addEventListener('input', function () {
    runSearch(placeInput.value);
  });

  placeInput.addEventListener('keydown', function (event) {
    if (placeResults.hidden) return;
    const items = placeResults.querySelectorAll('.chart-place-result');
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      activeIndex = Math.min(activeIndex + 1, items.length - 1);
      updateActive(items);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      updateActive(items);
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      selectItem(activeIndex);
    } else if (event.key === 'Escape') {
      hideResults();
    }
  });

  document.addEventListener('click', function (event) {
    if (!placeInput.contains(event.target) && !placeResults.contains(event.target)) hideResults();
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

    const lat = parseFloat(placeLatField.value);
    const lon = parseFloat(placeLonField.value);
    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      result.hidden = false;
      result.innerHTML = '<p class="chart-finder-error">Pick a birth place from the search results before calculating.</p>';
      return;
    }

    const [year, month, day] = dateVal.split('-').map(Number);
    const [hour, minute] = timeVal.split(':').map(Number);
    const utcOffset = INDIA_UTC_OFFSET;

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
