(function () {
  const A = window.AstroLib;
  const form = document.getElementById('tithi-form');
  const result = document.getElementById('tithi-result');
  if (!A || !form || !result) return;

  const INDIA_UTC_OFFSET = 5.5;
  const NOON_LOCAL_HOUR = 12;

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    const dateVal = document.getElementById('tithi-date').value;
    if (!dateVal) return;

    const [year, month, day] = dateVal.split('-').map(Number);
    const utHour = NOON_LOCAL_HOUR - INDIA_UTC_OFFSET;
    const jd = A.julianDayUT(year, month, day, utHour);
    const T = (jd - A.J2000) / 36525;

    const sunLon = A.sunLongitude(T);
    const moonLon = A.moonLongitude(T);
    const tithi = A.tithiOf(sunLon, moonLon);

    const dateLabel = new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    });

    result.hidden = false;
    result.innerHTML =
      '<div class="chart-result-grid">' +
      `<div class="chart-result-card"><p class="chart-card-label">Tithi</p><h3>${tithi.name} <span>(${tithi.numberInPaksha} of 15)</span></h3></div>` +
      `<div class="chart-result-card"><p class="chart-card-label">Paksha</p><h3>${tithi.paksha} <span>${tithi.paksha === 'Shukla' ? 'waxing' : 'waning'}</span></h3></div>` +
      `<div class="chart-result-card"><p class="chart-card-label">Into this tithi</p><h3>${tithi.degIntoTithi.toFixed(1)}° <span>of 12°</span></h3></div>` +
      '</div>' +
      `<p class="chart-finder-note">${dateLabel}, noon IST: ${tithi.paksha} Paksha ${tithi.name}. this is the same tithi everyone in the world is on right now, regardless of ayanamsa — tithi doesn't depend on sidereal vs tropical.</p>`;
  });
})();
