(function () {
  const A = window.AstroLib;
  const form = document.getElementById('birthtime-form');
  const result = document.getElementById('birthtime-result');
  if (!A || !form || !result) return;

  const place = A.attachPlaceSearch({
    inputId: 'birthtime-place-search',
    resultsId: 'birthtime-place-results',
    latId: 'birthtime-place-lat',
    lonId: 'birthtime-place-lon',
    statusId: 'birthtime-place-status',
  });

  const INDIA_UTC_OFFSET = 5.5;
  const SAMPLE_STEP_MIN = 4; // finer than the ~4 min/degree lagna speed, so no sign change is skipped

  function ascendantSignAt({ year, month, day, hour, minute, lat, lon }) {
    const utHour = hour + minute / 60 - INDIA_UTC_OFFSET;
    const jd = A.julianDayUT(year, month, day, utHour);
    const T = (jd - A.J2000) / 36525;
    const eps = A.obliquity(T);
    const ramc = A.norm360(A.gmst(jd) + lon);
    const ascTropical = A.ascendant(ramc, lat, eps);
    const ayanamsa = A.lahiriAyanamsa(jd);
    return A.signOf(ascTropical - ayanamsa, null);
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    const nameVal = (document.getElementById('birthtime-name').value || '').trim();
    const dateVal = document.getElementById('birthtime-date').value;
    const timeVal = document.getElementById('birthtime-time').value;
    const windowMin = parseInt(document.getElementById('birthtime-window').value, 10);
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
    const centerMin = hour * 60 + minute;

    const segments = [];
    let current = null;
    for (let offset = -windowMin; offset <= windowMin; offset += SAMPLE_STEP_MIN) {
      const totalMin = centerMin + offset;
      const h = Math.floor(((totalMin % 1440) + 1440) % 1440 / 60);
      const m = ((totalMin % 60) + 60) % 60;
      const sign = ascendantSignAt({ year, month, day, hour: h, minute: m, lat, lon });
      if (!current || current.sign.name !== sign.name) {
        current = { sign, startOffset: offset, endOffset: offset };
        segments.push(current);
      } else {
        current.endOffset = offset;
      }
    }

    function fmtOffset(offsetMin) {
      const totalMin = centerMin + offsetMin;
      const h = Math.floor(((totalMin % 1440) + 1440) % 1440 / 60);
      const m = Math.round(((totalMin % 60) + 60) % 60);
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    const greeting = nameVal ? `${nameVal}, ` : '';
    result.hidden = false;

    if (segments.length === 1) {
      result.innerHTML =
        `<div class="chart-result-card"><p class="chart-card-label">Rising sign is stable</p><h3>${segments[0].sign.name} <span>(${segments[0].sign.english})</span></h3></div>` +
        `<p class="chart-finder-note">${greeting}across ${windowMin} minutes either side of ${timeVal}, ur rising sign doesn't change. this placement isn't sensitive to how precise ur birth time is, within this window.</p>` +
        '<a class="text-link" href="../index.html#download">Get the full chart with Ask Tota →</a>';
      return;
    }

    const cards = segments
      .map((seg) => {
        const from = fmtOffset(seg.startOffset === -windowMin ? -windowMin : seg.startOffset);
        const to = fmtOffset(seg.endOffset === windowMin ? windowMin : seg.endOffset);
        return `<div class="chart-result-card"><p class="chart-card-label">${from}–${to}</p><h3>${seg.sign.name} <span>(${seg.sign.english})</span></h3></div>`;
      })
      .join('');

    result.innerHTML =
      `<div class="chart-result-grid">${cards}</div>` +
      `<p class="chart-finder-note">${greeting}within ${windowMin} minutes of ${timeVal}, ur rising sign could be any of these ${segments.length}, depending on the exact minute. this is exactly the kind of boundary case where a precise birth time matters — get the full chart once u have it.</p>` +
      '<a class="text-link" href="../index.html#download">Get the full chart with Ask Tota →</a>';
  });
})();
