(function () {
  const A = window.AstroLib;
  const form = document.getElementById('eclipse-form');
  const result = document.getElementById('eclipse-result');
  if (!A || !form || !result) return;

  const place = A.attachPlaceSearch({
    inputId: 'eclipse-place-search',
    resultsId: 'eclipse-place-results',
    latId: 'eclipse-place-lat',
    lonId: 'eclipse-place-lon',
    statusId: 'eclipse-place-status',
  });

  const INDIA_UTC_OFFSET = 5.5;

  // Peak times from the blog post above, both UTC.
  const ECLIPSES = [
    { label: 'the Aug 12, 2026 total solar eclipse', jd: A.julianDayUT(2026, 8, 12, 17 + 47 / 60), body: 'sun' },
    { label: 'the Aug 27–28, 2026 lunar eclipse', jd: A.julianDayUT(2026, 8, 28, 4 + 12 / 60), body: 'moon' },
  ];

  const CLOSE_DEG = 8; // within roughly a quarter of a sign counts as "close enough to matter"

  function eclipseSiderealLongitude(eclipse) {
    const T = (eclipse.jd - A.J2000) / 36525;
    const tropical = eclipse.body === 'sun' ? A.sunLongitude(T) : A.moonLongitude(T);
    const ayanamsa = A.lahiriAyanamsa(eclipse.jd);
    return A.norm360(tropical - ayanamsa);
  }

  function angularSeparation(a, b) {
    const d = Math.abs(A.norm360(a) - A.norm360(b));
    return Math.min(d, 360 - d);
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    const nameVal = (document.getElementById('eclipse-name').value || '').trim();
    const dateVal = document.getElementById('eclipse-date').value;
    const timeVal = document.getElementById('eclipse-time').value;
    if (!dateVal || !timeVal) return;

    const lat = place ? place.getLat() : NaN;
    const lon = place ? place.getLon() : NaN;
    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      result.hidden = false;
      result.innerHTML = '<p class="chart-finder-error">Pick a birth place from the search results before calculating.</p>';
      return;
    }

    const [year, month, day] = dateVal.split('-').map(Number);
    const [hour, minute] = timeVal.split(':').map(Number);
    const utHour = hour + minute / 60 - INDIA_UTC_OFFSET;
    const birthJD = A.julianDayUT(year, month, day, utHour);
    const T = (birthJD - A.J2000) / 36525;

    const ayanamsa = A.lahiriAyanamsa(birthJD);
    const natalSun = A.signOf(A.sunLongitude(T) - ayanamsa, 1.5);
    const natalMoon = A.signOf(A.moonLongitude(T) - ayanamsa, 4);
    const natalSunLon = A.norm360(A.sunLongitude(T) - ayanamsa);
    const natalMoonLon = A.norm360(A.moonLongitude(T) - ayanamsa);

    const greeting = nameVal ? `${nameVal}, ` : '';

    const hits = [];
    ECLIPSES.forEach((eclipse) => {
      const eclipseLon = eclipseSiderealLongitude(eclipse);
      const sunSep = angularSeparation(eclipseLon, natalSunLon);
      const moonSep = angularSeparation(eclipseLon, natalMoonLon);
      const closest = sunSep <= moonSep ? { body: 'sun sign', sep: sunSep, sign: natalSun } : { body: 'moon sign', sep: moonSep, sign: natalMoon };
      if (closest.sep <= CLOSE_DEG) {
        hits.push({ eclipse, closest });
      }
    });

    result.hidden = false;
    if (hits.length === 0) {
      result.innerHTML =
        `<div class="chart-result-card"><p class="chart-card-label">Chart check</p><h3>neither eclipse is close to ur sun or moon</h3></div>` +
        `<p class="chart-finder-note">${greeting}ur sun is in ${natalSun.name} and ur moon is in ${natalMoon.name}. neither August 2026 eclipse falls near either placement — this is more cosmic weather than a personal trigger for u.</p>` +
        '<a class="text-link" target="_blank" rel="noopener" href="https://play.google.com/store/apps/details?id=app.asktota">Get the full chart with Ask Tota →</a>';
      return;
    }

    const cards = hits
      .map(
        (h) =>
          `<div class="chart-result-card"><p class="chart-card-label">${h.eclipse.label}</p><h3>activates ur ${h.closest.body} <span>(${h.closest.sign.name}, ~${h.closest.sep.toFixed(1)}° away)</span></h3></div>`
      )
      .join('');

    result.innerHTML =
      `<div class="chart-result-grid">${cards}</div>` +
      `<p class="chart-finder-note">${greeting}ur sun is in ${natalSun.name} and ur moon is in ${natalMoon.name}. this checks proximity to ur sun and moon only — a full chart also checks your other six placements.</p>` +
      '<a class="text-link" target="_blank" rel="noopener" href="https://play.google.com/store/apps/details?id=app.asktota">Get the full chart with Ask Tota →</a>';
  });
})();
