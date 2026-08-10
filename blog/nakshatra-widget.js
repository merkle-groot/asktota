(function () {
  const A = window.AstroLib;
  const form = document.getElementById('nakshatra-form');
  const result = document.getElementById('nakshatra-result');
  if (!A || !form || !result) return;

  const place = A.attachPlaceSearch({
    inputId: 'nakshatra-place-search',
    resultsId: 'nakshatra-place-results',
    latId: 'nakshatra-place-lat',
    lonId: 'nakshatra-place-lon',
    statusId: 'nakshatra-place-status',
  });

  const INDIA_UTC_OFFSET = 5.5;

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    const nameVal = (document.getElementById('nakshatra-name').value || '').trim();
    const dateVal = document.getElementById('nakshatra-date').value;
    const timeVal = document.getElementById('nakshatra-time').value;
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
    const moonSidereal = A.norm360(A.moonLongitude(T) - ayanamsa);
    const moonSign = A.signOf(A.moonLongitude(T) - ayanamsa, 4);
    const nakshatra = A.nakshatraOf(moonSidereal);

    const nearBoundary = nakshatra.fractionElapsed < 0.05 || nakshatra.fractionElapsed > 0.95;
    const boundaryFlag = nearBoundary
      ? '<p class="chart-card-flag">Close to a nakshatra boundary — get the full chart to confirm.</p>'
      : '';

    const greeting = nameVal ? `${nameVal}, ` : '';
    result.hidden = false;
    result.innerHTML =
      '<div class="chart-result-grid">' +
      `<div class="chart-result-card"><p class="chart-card-label">Nakshatra</p><h3>${nakshatra.name} <span>ruled by ${nakshatra.lord}</span></h3>${boundaryFlag}</div>` +
      `<div class="chart-result-card"><p class="chart-card-label">Pada</p><h3>${nakshatra.pada} <span>of 4</span></h3></div>` +
      `<div class="chart-result-card"><p class="chart-card-label">Moon sign</p><h3>${moonSign.name} <span>(${moonSign.english})</span></h3></div>` +
      '</div>' +
      `<p class="chart-finder-note">${greeting}ur ${nakshatra.name} nakshatra lord is ${nakshatra.lord} — that's also the planet ur <a href="vimshottari-dasha.html">first dasha</a> runs on. this runs in ur browser with no chart software behind it — accurate enough to be useful, not a substitute for a full reading.</p>` +
      '<a class="text-link" href="../index.html#download">Get the full chart with Ask Tota →</a>';
  });
})();
