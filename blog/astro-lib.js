// Shared sidereal astronomy helpers used across the Chart Desk calculator
// tools (sun-moon-rising, sade-sati, eclipse-sutak, birth-time-accuracy,
// vimshottari-dasha). Plain global namespace, no bundler: include this
// script before any widget script that references window.AstroLib.
(function () {
  const DEG2RAD = Math.PI / 180;
  const RAD2DEG = 180 / Math.PI;
  const J2000 = 2451545.0;

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

  // 27 nakshatras in zodiac order, each 13°20' wide, with vimshottari lord.
  const NAKSHATRAS = [
    { name: 'Ashwini', lord: 'Ketu' },
    { name: 'Bharani', lord: 'Venus' },
    { name: 'Krittika', lord: 'Sun' },
    { name: 'Rohini', lord: 'Moon' },
    { name: 'Mrigashira', lord: 'Mars' },
    { name: 'Ardra', lord: 'Rahu' },
    { name: 'Punarvasu', lord: 'Jupiter' },
    { name: 'Pushya', lord: 'Saturn' },
    { name: 'Ashlesha', lord: 'Mercury' },
    { name: 'Magha', lord: 'Ketu' },
    { name: 'Purva Phalguni', lord: 'Venus' },
    { name: 'Uttara Phalguni', lord: 'Sun' },
    { name: 'Hasta', lord: 'Moon' },
    { name: 'Chitra', lord: 'Mars' },
    { name: 'Swati', lord: 'Rahu' },
    { name: 'Vishakha', lord: 'Jupiter' },
    { name: 'Anuradha', lord: 'Saturn' },
    { name: 'Jyeshtha', lord: 'Mercury' },
    { name: 'Mula', lord: 'Ketu' },
    { name: 'Purva Ashadha', lord: 'Venus' },
    { name: 'Uttara Ashadha', lord: 'Sun' },
    { name: 'Shravana', lord: 'Moon' },
    { name: 'Dhanishta', lord: 'Mars' },
    { name: 'Shatabhisha', lord: 'Rahu' },
    { name: 'Purva Bhadrapada', lord: 'Jupiter' },
    { name: 'Uttara Bhadrapada', lord: 'Saturn' },
    { name: 'Revati', lord: 'Mercury' },
  ];

  // Vimshottari dasha years, in the fixed cyclical order.
  const DASHA_SEQUENCE = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
  const DASHA_YEARS = { Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17 };
  const DASHA_TOTAL_YEARS = 120;

  function norm360(deg) {
    return ((deg % 360) + 360) % 360;
  }

  function frac(x) {
    return x - Math.floor(x);
  }

  // Civil date/time (UT) -> Julian Day.
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

  // Julian Day -> civil UT date/time, for walking dasha/transit dates forward.
  function civilFromJD(jd) {
    const jdAdj = jd + 0.5;
    const Z = Math.floor(jdAdj);
    const F = jdAdj - Z;
    let A = Z;
    if (Z >= 2299161) {
      const alpha = Math.floor((Z - 1867216.25) / 36524.25);
      A = Z + 1 + alpha - Math.floor(alpha / 4);
    }
    const B = A + 1524;
    const C = Math.floor((B - 122.1) / 365.25);
    const D = Math.floor(365.25 * C);
    const E = Math.floor((B - D) / 30.6001);
    const day = B - D - Math.floor(30.6001 * E) + F;
    const month = E < 14 ? E - 1 : E - 13;
    const year = month > 2 ? C - 4716 : C - 4715;
    return { year, month, day: Math.floor(day), hourUT: (day - Math.floor(day)) * 24 };
  }

  function julianDayToDate(jd) {
    const c = civilFromJD(jd);
    // Construct as a UTC Date for simple, unambiguous calendar-date formatting.
    return new Date(Date.UTC(c.year, c.month - 1, c.day, Math.floor(c.hourUT), Math.round((c.hourUT % 1) * 60)));
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
    const T = (jd - J2000) / 36525;
    const g =
      280.46061837 +
      360.98564736629 * (jd - J2000) +
      0.000387933 * T * T -
      (T * T * T) / 38710000;
    return norm360(g);
  }

  // Ascendant: derived from the ecliptic/equator/horizon spherical-trig relation.
  function ascendant(ramcDeg, latDeg, epsDeg) {
    const ramc = ramcDeg * DEG2RAD;
    const eps = epsDeg * DEG2RAD;
    const lat = latDeg * DEG2RAD;
    const y = Math.cos(ramc);
    const x = -(Math.sin(ramc) * Math.cos(eps) + Math.tan(lat) * Math.sin(eps));
    return norm360(Math.atan2(y, x) * RAD2DEG);
  }

  function lahiriAyanamsa(jd) {
    const years = (jd - J2000) / 365.25;
    return 23.85 + years * (50.2388475 / 3600);
  }

  function signOf(lonDeg, boundaryDeg) {
    const lon = norm360(lonDeg);
    const idx = Math.floor(lon / 30) % 12;
    const degInSign = lon - idx * 30;
    const nearBoundary = boundaryDeg != null && (degInSign < boundaryDeg || degInSign > 30 - boundaryDeg);
    return { ...RASHIS[idx], index: idx, degInSign, nearBoundary };
  }

  function nakshatraOf(moonSiderealLon) {
    const lon = norm360(moonSiderealLon);
    const span = 360 / 27; // 13°20'
    const idx = Math.floor(lon / span) % 27;
    const degInNakshatra = lon - idx * span;
    const fractionElapsed = degInNakshatra / span;
    const padaSpan = span / 4; // 3°20'
    const pada = Math.min(4, Math.floor(degInNakshatra / padaSpan) + 1);
    return { ...NAKSHATRAS[idx], index: idx, fractionElapsed, pada };
  }

  const TITHI_NAMES = [
    'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi', 'Saptami', 'Ashtami',
    'Navami', 'Dashami', 'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi',
  ];

  // Tithi is the angle between Moon and Sun, divided into 12deg steps. It is
  // ayanamsa-independent by construction (both bodies shift by the same
  // amount), so this takes tropical longitudes directly.
  function tithiOf(sunTropicalLon, moonTropicalLon) {
    const diff = norm360(moonTropicalLon - sunTropicalLon);
    const index = Math.floor(diff / 12); // 0-29
    const paksha = index < 15 ? 'Shukla' : 'Krishna';
    const numberInPaksha = (index % 15) + 1; // 1-15
    const name = numberInPaksha === 15 ? (paksha === 'Shukla' ? 'Purnima' : 'Amavasya') : TITHI_NAMES[numberInPaksha - 1];
    const degIntoTithi = diff - index * 12;
    return { index, paksha, numberInPaksha, name, degIntoTithi };
  }

  // --- Two-body Keplerian planetary positions (JPL "Keplerian elements for
  // approximate positions of the major planets", J2000, valid ~1800-2050).
  // Good to a few arcminutes — more than enough to place a slow mover like
  // Saturn in the right sidereal sign and date its sign changes to within a
  // day or two, including retrograde loops (which fall out naturally from
  // the two-body geometry, no extra terms needed).

  const ELEMENTS = {
    earth: {
      a: [1.00000261, 0.00000562],
      e: [0.01671123, -0.00004392],
      i: [-0.00001531, -0.01294668],
      L: [100.46457166, 35999.37244981],
      lonPeri: [102.93768193, 0.32327364],
      lonNode: [0.0, 0.0],
    },
    saturn: {
      a: [9.53667594, -0.0125060],
      e: [0.05386179, -0.00050991],
      i: [2.48599187, 0.00193609],
      L: [49.95424423, 1222.49362201],
      lonPeri: [92.59887831, -0.41897216],
      lonNode: [113.66242448, -0.28867794],
    },
  };

  function keplerSolve(Mrad, e) {
    let E = Mrad;
    for (let i = 0; i < 8; i++) {
      E = E - (E - e * Math.sin(E) - Mrad) / (1 - e * Math.cos(E));
    }
    return E;
  }

  // Heliocentric ecliptic XYZ (AU) for a body's elements at Julian centuries T.
  function heliocentricXYZ(el, T) {
    const a = el.a[0] + el.a[1] * T;
    const e = el.e[0] + el.e[1] * T;
    const i = (el.i[0] + el.i[1] * T) * DEG2RAD;
    const L = el.L[0] + el.L[1] * T;
    const lonPeri = el.lonPeri[0] + el.lonPeri[1] * T;
    const lonNode = el.lonNode[0] + el.lonNode[1] * T;
    const omega = (lonPeri - lonNode) * DEG2RAD; // argument of perihelion
    const Omega = lonNode * DEG2RAD;

    let M = norm360(L - lonPeri);
    if (M > 180) M -= 360;
    const Mrad = M * DEG2RAD;
    const E = keplerSolve(Mrad, e);

    const xOrb = a * (Math.cos(E) - e);
    const yOrb = a * Math.sqrt(1 - e * e) * Math.sin(E);

    const cosO = Math.cos(omega), sinO = Math.sin(omega);
    const cosN = Math.cos(Omega), sinN = Math.sin(Omega);
    const cosI = Math.cos(i), sinI = Math.sin(i);

    const x = (cosO * cosN - sinO * sinN * cosI) * xOrb + (-sinO * cosN - cosO * sinN * cosI) * yOrb;
    const y = (cosO * sinN + sinO * cosN * cosI) * xOrb + (-sinO * sinN + cosO * cosN * cosI) * yOrb;
    const z = (sinO * sinI) * xOrb + (cosO * sinI) * yOrb;

    return { x, y, z };
  }

  // Geocentric tropical ecliptic longitude of Saturn at Julian Day jd.
  function saturnLongitude(jd) {
    const T = (jd - J2000) / 36525;
    const earth = heliocentricXYZ(ELEMENTS.earth, T);
    const saturn = heliocentricXYZ(ELEMENTS.saturn, T);
    const gx = saturn.x - earth.x;
    const gy = saturn.y - earth.y;
    return norm360(Math.atan2(gy, gx) * RAD2DEG);
  }

  function saturnSiderealSign(jd) {
    const ayanamsa = lahiriAyanamsa(jd);
    return signOf(saturnLongitude(jd) - ayanamsa, null).index;
  }

  // --- Reusable birth-place search (OpenStreetMap Nominatim, scoped to India) ---
  // Wires up an <input> + results dropdown + hidden lat/lon fields + status
  // line. Returns { getLat, getLon, clear } so a widget can read the
  // selected coordinates on submit.

  function attachPlaceSearch(ids) {
    const input = document.getElementById(ids.inputId);
    const results = document.getElementById(ids.resultsId);
    const latField = document.getElementById(ids.latId);
    const lonField = document.getElementById(ids.lonId);
    const status = document.getElementById(ids.statusId);
    if (!input || !results || !latField || !lonField || !status) return null;

    // Photon (komoot.io), not Nominatim directly: Nominatim's public instance
    // does not reliably send Access-Control-Allow-Origin, which silently
    // breaks this search for every visitor (confirmed missing even with a
    // proper Origin header). Photon is OSM-derived, built for direct browser
    // use, and consistently sends CORS headers.
    const SEARCH_URL = 'https://photon.komoot.io/api/';
    const MIN_QUERY_LENGTH = 3;
    const SEARCH_DEBOUNCE_MS = 450;
    // Rough geographic center of India, used only to bias ranking toward
    // Indian results — results are still filtered to India below.
    const INDIA_BIAS = { lat: '20.5937', lon: '78.9629', zoom: '5' };

    function debounce(fn, delay) {
      let timer;
      return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
      };
    }

    async function searchPlaces(query, signal) {
      const trimmed = query.trim();
      const params = new URLSearchParams({ q: trimmed, limit: '15', lang: 'en', ...INDIA_BIAS });
      const res = await fetch(`${SEARCH_URL}?${params.toString()}`, { signal });
      if (!res.ok) throw new Error('Place search failed');
      const data = await res.json();
      const features = (data.features || []).filter((f) => (f.properties || {}).countrycode === 'IN');
      // Settlements (osm_key "place") over railway stations, roads, and other POIs
      // that happen to share the same name.
      features.sort((a, b) => {
        const rank = (f) => ((f.properties || {}).osm_key === 'place' ? 0 : 1);
        return rank(a) - rank(b);
      });
      return features.slice(0, 8);
    }

    function formatPlace(feature) {
      const p = feature.properties || {};
      const primary = p.name || p.city || p.county || p.state || '';
      const secondary = [p.state, p.postcode].filter(Boolean).join(', ');
      return { primary, secondary };
    }

    let currentController = null;
    let currentItems = [];
    let activeIndex = -1;

    function hideResults() {
      results.hidden = true;
      results.innerHTML = '';
      activeIndex = -1;
    }

    function clearSelection() {
      latField.value = '';
      lonField.value = '';
    }

    function updateActive(items) {
      items.forEach((el, i) => el.classList.toggle('is-active', i === activeIndex));
      if (activeIndex >= 0) items[activeIndex].scrollIntoView({ block: 'nearest' });
    }

    function selectItem(index) {
      const item = currentItems[index];
      if (!item) return;
      const { primary, secondary } = formatPlace(item);
      const coords = (item.geometry || {}).coordinates || [];
      input.value = secondary ? `${primary}, ${secondary}` : primary;
      latField.value = coords[1];
      lonField.value = coords[0];
      status.textContent = '';
      hideResults();
    }

    function renderResults(items) {
      currentItems = items;
      activeIndex = -1;
      if (!items.length) {
        results.hidden = false;
        results.innerHTML = '<div class="chart-place-empty">No matches. Try the nearest town, or a 6-digit PIN code.</div>';
        return;
      }
      results.innerHTML = items
        .map((item, i) => {
          const { primary, secondary } = formatPlace(item);
          return `<div class="chart-place-result" data-index="${i}" role="option"><span class="chart-place-result-name">${primary}</span><span class="chart-place-result-meta">${secondary}</span></div>`;
        })
        .join('');
      results.hidden = false;
      results.querySelectorAll('.chart-place-result').forEach((el) => {
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
        status.textContent = '';
        return;
      }
      if (currentController) currentController.abort();
      currentController = new AbortController();
      status.textContent = 'Searching…';
      try {
        const items = await searchPlaces(query, currentController.signal);
        status.textContent = '';
        renderResults(items);
      } catch (err) {
        if (err.name === 'AbortError') return;
        status.textContent = "Couldn't reach place search. Check your connection and try again.";
        hideResults();
      }
    }, SEARCH_DEBOUNCE_MS);

    input.addEventListener('input', function () {
      runSearch(input.value);
    });

    input.addEventListener('keydown', function (event) {
      if (results.hidden) return;
      const items = results.querySelectorAll('.chart-place-result');
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
      if (!input.contains(event.target) && !results.contains(event.target)) hideResults();
    });

    return {
      getLat: () => parseFloat(latField.value),
      getLon: () => parseFloat(lonField.value),
    };
  }

  // --- The rest of the grahas -------------------------------------------
  // Same JPL Keplerian element set (Standish, "Keplerian elements for
  // approximate positions of the major planets", J2000 frame, valid
  // ~1800-2050) already used above for Saturn. Angles in degrees, second
  // entry of each pair is the rate per Julian century.

  ELEMENTS.mercury = {
    a: [0.38709927, 0.00000037],
    e: [0.20563593, 0.00001906],
    i: [7.00497902, -0.00594749],
    L: [252.25032350, 149472.67411175],
    lonPeri: [77.45779628, 0.16047689],
    lonNode: [48.33076593, -0.12534081],
  };
  ELEMENTS.venus = {
    a: [0.72333566, 0.00000390],
    e: [0.00677672, -0.00004107],
    i: [3.39467605, -0.00078890],
    L: [181.97909950, 58517.81538729],
    lonPeri: [131.60246718, 0.00268329],
    lonNode: [76.67984255, -0.27769418],
  };
  ELEMENTS.mars = {
    a: [1.52371034, 0.00001847],
    e: [0.09339410, 0.00007882],
    i: [1.84969142, -0.00813131],
    L: [-4.55343205, 19140.30268499],
    lonPeri: [-23.94362959, 0.44441088],
    lonNode: [49.55953891, -0.29257343],
  };
  ELEMENTS.jupiter = {
    a: [5.20288700, -0.00011607],
    e: [0.04838624, -0.00013253],
    i: [1.30439695, -0.00183714],
    L: [34.39644051, 3034.74612775],
    lonPeri: [14.72847983, 0.21252668],
    lonNode: [100.47390909, 0.20469106],
  };

  // Geocentric tropical ecliptic longitude of any of the five visible planets.
  function planetLongitude(body, jd) {
    const el = ELEMENTS[body];
    if (!el) return null;
    const T = (jd - J2000) / 36525;
    const earth = heliocentricXYZ(ELEMENTS.earth, T);
    const p = heliocentricXYZ(el, T);
    return norm360(Math.atan2(p.y - earth.y, p.x - earth.x) * RAD2DEG);
  }

  // Apparent daily motion in degrees. Negative means retrograde, which for
  // the outer planets falls straight out of the two-body geometry with no
  // extra terms: it is the Earth overtaking on the inside of the track.
  function planetSpeed(body, jd) {
    const step = 0.5;
    const before = planetLongitude(body, jd - step);
    const after = planetLongitude(body, jd + step);
    let delta = after - before;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    return delta / (2 * step);
  }

  // Mean lunar north node (Rahu). Meeus ch.47. Ketu sits exactly opposite.
  function rahuLongitude(jd) {
    const T = (jd - J2000) / 36525;
    return norm360(
      125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + (T * T * T) / 467441 - (T * T * T * T) / 60616000
    );
  }

  // --- Panchang limbs ----------------------------------------------------

  const YOGAS = [
    'Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana', 'Atiganda',
    'Sukarma', 'Dhriti', 'Shula', 'Ganda', 'Vriddhi', 'Dhruva', 'Vyaghata',
    'Harshana', 'Vajra', 'Siddhi', 'Vyatipata', 'Variyana', 'Parigha', 'Shiva',
    'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma', 'Indra', 'Vaidhriti',
  ];

  const MOVABLE_KARANAS = ['Bava', 'Balava', 'Kaulava', 'Taitila', 'Gara', 'Vanija', 'Vishti'];
  const VARAS = [
    { name: 'Ravivara', english: 'Sunday', lord: 'Sun' },
    { name: 'Somavara', english: 'Monday', lord: 'Moon' },
    { name: 'Mangalavara', english: 'Tuesday', lord: 'Mars' },
    { name: 'Budhavara', english: 'Wednesday', lord: 'Mercury' },
    { name: 'Guruvara', english: 'Thursday', lord: 'Jupiter' },
    { name: 'Shukravara', english: 'Friday', lord: 'Venus' },
    { name: 'Shanivara', english: 'Saturday', lord: 'Saturn' },
  ];

  // Yoga: sun longitude + moon longitude, cut into 27 arcs of 13 deg 20 min.
  // Sidereal and tropical give the same answer only if both are shifted by
  // the same ayanamsa, so pass sidereal longitudes for the classical value.
  function yogaOf(sunSidereal, moonSidereal) {
    const total = norm360(sunSidereal + moonSidereal);
    const span = 360 / 27;
    const index = Math.floor(total / span);
    return { index, name: YOGAS[index], fractionElapsed: (total - index * span) / span };
  }

  // Karana: half a tithi, 6 degrees of moon-minus-sun separation. Sixty in a
  // lunar month: four fixed ones bookend the cycle, seven movable ones repeat
  // eight times in between.
  function karanaOf(sunLon, moonLon) {
    const sep = norm360(moonLon - sunLon);
    const n = Math.floor(sep / 6); // 0..59
    let name;
    if (n === 0) name = 'Kimstughna';
    else if (n >= 57) name = ['Shakuni', 'Chatushpada', 'Naga'][n - 57];
    else name = MOVABLE_KARANAS[(n - 1) % 7];
    const fixed = n === 0 || n >= 57;
    return { index: n, name, fixed, degIntoKarana: sep - n * 6 };
  }

  // Vara: the Vedic day runs sunrise to sunrise, so a birth before dawn still
  // belongs to the previous weekday. Callers that care pass a sunrise-adjusted
  // Julian Day.
  function varaOf(jd) {
    const index = Math.floor(jd + 1.5) % 7; // JD 0 was a Monday
    return VARAS[(index + 6) % 7];
  }

  // --- Chart furniture ---------------------------------------------------

  const SIGN_LORDS = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];

  // Exaltation degree per graha, in absolute sidereal longitude. Debilitation
  // is 180 degrees away. Rahu and Ketu are disputed in the classical texts;
  // we use the Taurus/Scorpio convention and say so in the output.
  const EXALTATION = {
    Sun: 10, Moon: 33, Mars: 298, Mercury: 165, Jupiter: 95, Venus: 357, Saturn: 200, Rahu: 50, Ketu: 230,
  };

  // Combustion orbs in degrees from the Sun, the widely used Vedic set.
  const COMBUST_ORB = { Moon: 12, Mars: 17, Mercury: 14, Jupiter: 11, Venus: 10, Saturn: 15 };

  const GRAHA_ORDER = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];

  function angularGap(a, b) {
    const d = Math.abs(norm360(a - b));
    return d > 180 ? 360 - d : d;
  }

  function dignityOf(graha, siderealLon) {
    const exalt = EXALTATION[graha];
    if (exalt == null) return null;
    const fromExalt = angularGap(siderealLon, exalt);
    if (fromExalt <= 5) return 'exalted';
    if (fromExalt >= 175) return 'debilitated';
    const signIdx = Math.floor(norm360(siderealLon) / 30);
    if (SIGN_LORDS[signIdx] === graha) return 'own sign';
    return null;
  }

  // Whole-sign houses, the standard in Vedic practice: the lagna's whole sign
  // is the 1st house, the next sign the 2nd, and so on. No cusps, no split
  // houses, so a planet's house is decided by its sign alone.
  function houseFrom(referenceSignIndex, planetSignIndex) {
    return ((planetSignIndex - referenceSignIndex + 12) % 12) + 1;
  }

  // Full natal chart. Local clock time plus a UTC offset in hours; returns
  // every graha with its sidereal longitude, sign, nakshatra, whole-sign
  // house from both the lagna and the moon, dignity, retrogression and
  // combustion.
  function computeChart(opts) {
    const utHour = opts.hour + opts.minute / 60 - opts.tzOffset;
    const jd = julianDayUT(opts.year, opts.month, opts.day, utHour);
    const T = (jd - J2000) / 36525;
    const ayanamsa = lahiriAyanamsa(jd);

    const tropical = {
      Sun: sunLongitude(T),
      Moon: moonLongitude(T),
      Mars: planetLongitude('mars', jd),
      Mercury: planetLongitude('mercury', jd),
      Jupiter: planetLongitude('jupiter', jd),
      Venus: planetLongitude('venus', jd),
      Saturn: planetLongitude('saturn', jd),
      Rahu: rahuLongitude(jd),
    };
    tropical.Ketu = norm360(tropical.Rahu + 180);

    const ramc = norm360(gmst(jd) + opts.lon);
    const ascTropical = ascendant(ramc, opts.lat, obliquity(T));
    const lagna = signOf(ascTropical - ayanamsa, null);
    const lagnaSidereal = norm360(ascTropical - ayanamsa);

    const moonSidereal = norm360(tropical.Moon - ayanamsa);
    const moonSignIndex = Math.floor(moonSidereal / 30);

    const grahas = GRAHA_ORDER.map(function (name) {
      const sidereal = norm360(tropical[name] - ayanamsa);
      const sign = signOf(sidereal, null);
      const nak = nakshatraOf(sidereal);
      const isNode = name === 'Rahu' || name === 'Ketu';
      const speed = isNode ? -0.053 : name === 'Sun' || name === 'Moon' ? 1 : planetSpeed(name.toLowerCase(), jd);
      const orb = COMBUST_ORB[name];
      return {
        name: name,
        longitude: sidereal,
        degInSign: sidereal - Math.floor(sidereal / 30) * 30,
        sign: sign,
        signIndex: sign.index,
        nakshatra: nak,
        house: houseFrom(lagna.index, sign.index),
        houseFromMoon: houseFrom(moonSignIndex, sign.index),
        retrograde: speed < 0,
        dignity: dignityOf(name, sidereal),
        combust: orb != null && name !== 'Moon' && angularGap(sidereal, norm360(tropical.Sun - ayanamsa)) <= orb,
      };
    });

    const housesList = [];
    for (let h = 1; h <= 12; h++) {
      const signIndex = (lagna.index + h - 1) % 12;
      housesList.push({
        number: h,
        sign: RASHIS[signIndex],
        signIndex: signIndex,
        lord: SIGN_LORDS[signIndex],
        occupants: grahas.filter(function (g) { return g.house === h; }),
      });
    }

    return {
      jd: jd,
      ayanamsa: ayanamsa,
      lagna: lagna,
      lagnaLongitude: lagnaSidereal,
      lagnaNakshatra: nakshatraOf(lagnaSidereal),
      lagnaLord: SIGN_LORDS[lagna.index],
      moonSign: RASHIS[moonSignIndex],
      moonNakshatra: nakshatraOf(moonSidereal),
      grahas: grahas,
      byName: grahas.reduce(function (acc, g) { acc[g.name] = g; return acc; }, {}),
      houses: housesList,
      tithi: tithiOf(tropical.Sun, tropical.Moon),
      yoga: yogaOf(norm360(tropical.Sun - ayanamsa), moonSidereal),
      karana: karanaOf(tropical.Sun, tropical.Moon),
      vara: varaOf(jd + opts.tzOffset / 24 - 0.25),
    };
  }

  window.AstroLib = {
    DEG2RAD,
    RAD2DEG,
    J2000,
    RASHIS,
    NAKSHATRAS,
    DASHA_SEQUENCE,
    DASHA_YEARS,
    DASHA_TOTAL_YEARS,
    norm360,
    frac,
    julianDayUT,
    julianDayToDate,
    civilFromJD,
    sunLongitude,
    moonLongitude,
    obliquity,
    gmst,
    ascendant,
    lahiriAyanamsa,
    signOf,
    nakshatraOf,
    tithiOf,
    saturnLongitude,
    saturnSiderealSign,
    planetLongitude,
    planetSpeed,
    rahuLongitude,
    yogaOf,
    karanaOf,
    varaOf,
    houseFrom,
    dignityOf,
    computeChart,
    SIGN_LORDS,
    GRAHA_ORDER,
    attachPlaceSearch,
  };
})();
