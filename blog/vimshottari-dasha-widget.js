(function () {
  const A = window.AstroLib;
  const form = document.getElementById('dasha-form');
  const result = document.getElementById('dasha-result');
  if (!A || !form || !result) return;

  const place = A.attachPlaceSearch({
    inputId: 'dasha-place-search',
    resultsId: 'dasha-place-results',
    latId: 'dasha-place-lat',
    lonId: 'dasha-place-lon',
    statusId: 'dasha-place-status',
  });

  const INDIA_UTC_OFFSET = 5.5;
  const YEAR_DAYS = 365.2425;

  function addYears(jd, years) {
    return jd + years * YEAR_DAYS;
  }

  // Walk the fixed 9-planet sequence from a starting lord/jd, each getting
  // its own fixed year-length, until the segment containing targetJD is
  // found. Works for both the mahadasha level (full DASHA_YEARS) and the
  // antardasha level (each duration scaled to the parent period).
  function findSegment(startLord, startJD, targetJD, totalSpanYears) {
    const seq = A.DASHA_SEQUENCE;
    let idx = seq.indexOf(startLord);
    let jd = startJD;
    for (let i = 0; i < seq.length; i++) {
      const lord = seq[idx];
      const years = (A.DASHA_YEARS[lord] / A.DASHA_TOTAL_YEARS) * totalSpanYears;
      const endJD = addYears(jd, years);
      if (targetJD < endJD || i === seq.length - 1) {
        return { lord, startJD: jd, endJD, years };
      }
      jd = endJD;
      idx = (idx + 1) % seq.length;
    }
    return null;
  }

  function formatDate(jd) {
    const d = A.julianDayToDate(jd);
    return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    const nameVal = (document.getElementById('dasha-name').value || '').trim();
    const dateVal = document.getElementById('dasha-date').value;
    const timeVal = document.getElementById('dasha-time').value;
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
    const nakshatra = A.nakshatraOf(moonSidereal);

    // The birth moment falls partway through the first mahadasha; back-date
    // its notional start so the elapsed fraction lines up with the moon's
    // position inside the nakshatra.
    const firstLordYears = A.DASHA_YEARS[nakshatra.lord];
    const firstMahadashaStartJD = birthJD - nakshatra.fractionElapsed * firstLordYears * YEAR_DAYS;

    const now = new Date();
    const todayJD = A.julianDayUT(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(), now.getUTCHours());

    const mahadasha = findSegment(nakshatra.lord, firstMahadashaStartJD, todayJD, A.DASHA_TOTAL_YEARS);
    const antardasha = findSegment(mahadasha.lord, mahadasha.startJD, todayJD, mahadasha.years);

    const greeting = nameVal ? `${nameVal}, ` : '';
    result.hidden = false;
    result.innerHTML =
      '<div class="chart-result-grid">' +
      `<div class="chart-result-card"><p class="chart-card-label">Mahadasha</p><h3>${mahadasha.lord} <span>until ${formatDate(mahadasha.endJD)}</span></h3></div>` +
      `<div class="chart-result-card"><p class="chart-card-label">Antardasha</p><h3>${antardasha.lord} <span>until ${formatDate(antardasha.endJD)}</span></h3></div>` +
      `<div class="chart-result-card"><p class="chart-card-label">Natal nakshatra</p><h3>${nakshatra.name} <span>ruled by ${nakshatra.lord}</span></h3></div>` +
      '</div>' +
      `<p class="chart-finder-note">${greeting}ur ${mahadasha.lord} mahadasha runs ${formatDate(mahadasha.startJD)} to ${formatDate(mahadasha.endJD)}. within it, ur current ${antardasha.lord} antardasha runs ${formatDate(antardasha.startJD)} to ${formatDate(antardasha.endJD)}. this is a quick calculation, not a full reading — get the full chart for pratyantardasha-level detail.</p>` +
      '<a class="text-link" href="../index.html#download">Get the full chart with Ask Tota →</a>';
  });
})();
