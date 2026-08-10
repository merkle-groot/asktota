(function () {
  const A = window.AstroLib;
  const form = document.getElementById('sadesati-form');
  const result = document.getElementById('sadesati-result');
  if (!A || !form || !result) return;

  const place = A.attachPlaceSearch({
    inputId: 'sadesati-place-search',
    resultsId: 'sadesati-place-results',
    latId: 'sadesati-place-lat',
    lonId: 'sadesati-place-lon',
    statusId: 'sadesati-place-status',
  });

  const INDIA_UTC_OFFSET = 5.5;
  const RASHIS = A.RASHIS;

  // Saturn transiting the 12th, 1st (natal), and 2nd sign from the moon.
  function targetSigns(moonIdx) {
    return [(moonIdx + 11) % 12, moonIdx, (moonIdx + 1) % 12];
  }

  function refineTransition(jdLo, jdHi, predFn) {
    const predAtLo = predFn(jdLo);
    let lo = jdLo;
    let hi = jdHi;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (predFn(mid) === predAtLo) lo = mid;
      else hi = mid;
    }
    return hi;
  }

  function computeSadeSati(moonIdx, referenceJD) {
    const targets = targetSigns(moonIdx);
    const stepDays = 3;
    const startJD = referenceJD - 10 * 365.25;
    const endJD = referenceJD + 40 * 365.25;

    const scan = [];
    for (let jd = startJD; jd <= endJD; jd += stepDays) {
      scan.push({ jd, sign: A.saturnSiderealSign(jd) });
    }

    const rawRuns = [];
    let runStart = null;
    for (let i = 0; i < scan.length; i++) {
      const inTarget = targets.includes(scan[i].sign);
      if (inTarget && runStart === null) runStart = i;
      if (!inTarget && runStart !== null) {
        rawRuns.push({ startIdx: runStart, endIdx: i - 1 });
        runStart = null;
      }
    }
    if (runStart !== null) rawRuns.push({ startIdx: runStart, endIdx: scan.length - 1 });

    // Saturn can retrograde back out of the target signs for a few weeks
    // near a boundary and re-enter later — that's still the same Sade Sati
    // window, not two separate ones. Merge runs separated by a short gap
    // (anything under ~1.5 years; genuinely separate windows are ~29.5
    // years apart, so this threshold can't accidentally merge two real
    // Sade Satis).
    const MERGE_GAP_DAYS = 550;
    const runs = [];
    for (const r of rawRuns) {
      const prev = runs[runs.length - 1];
      if (prev && scan[r.startIdx].jd - scan[prev.endIdx].jd <= MERGE_GAP_DAYS) {
        prev.endIdx = r.endIdx;
      } else {
        runs.push({ ...r });
      }
    }

    let chosen = runs.find((r) => scan[r.startIdx].jd <= referenceJD && referenceJD <= scan[r.endIdx].jd);
    let isCurrent = true;
    if (!chosen) {
      chosen = runs.find((r) => scan[r.startIdx].jd > referenceJD);
      isCurrent = false;
    }
    if (!chosen) return null;

    const inTargetPred = (jd) => targets.includes(A.saturnSiderealSign(jd));

    const windowStartJD =
      chosen.startIdx > 0 ? refineTransition(scan[chosen.startIdx - 1].jd, scan[chosen.startIdx].jd, inTargetPred) : scan[chosen.startIdx].jd;
    const windowEndJD =
      chosen.endIdx < scan.length - 1 ? refineTransition(scan[chosen.endIdx].jd, scan[chosen.endIdx + 1].jd, inTargetPred) : scan[chosen.endIdx].jd;

    let phase2StartJD = null;
    let phase3StartJD = null;
    for (let i = chosen.startIdx; i <= chosen.endIdx; i++) {
      if (phase2StartJD === null && scan[i].sign === moonIdx) {
        const predIsPhase2 = (jd) => A.saturnSiderealSign(jd) === moonIdx;
        phase2StartJD = i > chosen.startIdx ? refineTransition(scan[i - 1].jd, scan[i].jd, predIsPhase2) : windowStartJD;
      }
      if (phase3StartJD === null && scan[i].sign === targets[2]) {
        const predIsPhase3 = (jd) => A.saturnSiderealSign(jd) === targets[2];
        phase3StartJD = i > chosen.startIdx ? refineTransition(scan[i - 1].jd, scan[i].jd, predIsPhase3) : windowStartJD;
      }
    }

    let currentPhase = null;
    if (isCurrent) {
      if (phase3StartJD !== null && referenceJD >= phase3StartJD) currentPhase = 3;
      else if (phase2StartJD !== null && referenceJD >= phase2StartJD) currentPhase = 2;
      else currentPhase = 1;
    }

    return {
      isCurrent,
      currentPhase,
      windowStartJD,
      phase2StartJD,
      phase3StartJD,
      windowEndJD,
    };
  }

  function formatDate(jd) {
    const d = A.julianDayToDate(jd);
    return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    const nameVal = (document.getElementById('sadesati-name').value || '').trim();
    const dateVal = document.getElementById('sadesati-date').value;
    const timeVal = document.getElementById('sadesati-time').value;
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

    const moonTropical = A.moonLongitude(T);
    const ayanamsa = A.lahiriAyanamsa(birthJD);
    const moonSign = A.signOf(moonTropical - ayanamsa, 4);

    const now = new Date();
    const todayJD = A.julianDayUT(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(), now.getUTCHours());

    const sadeSati = computeSadeSati(moonSign.index, todayJD);

    result.hidden = false;
    if (!sadeSati) {
      result.innerHTML = '<p class="chart-finder-error">Could not find a Sade Sati window in the search range. Try the full app for an exact reading.</p>';
      return;
    }

    const greeting = nameVal ? `${nameVal}, ` : '';
    const targets = targetSigns(moonSign.index);
    const phaseNames = ['rising', 'peak', 'setting'];
    const phaseSigns = targets.map((idx) => RASHIS[idx]);

    let statusHtml;
    if (sadeSati.isCurrent) {
      const phaseIdx = sadeSati.currentPhase - 1;
      statusHtml = `<p class="chart-card-label">Currently in</p><h3>${phaseNames[phaseIdx]} phase <span>(Saturn in ${phaseSigns[phaseIdx].name})</span></h3>`;
    } else {
      statusHtml = `<p class="chart-card-label">Not in Sade Sati right now</p><h3>next window begins ${formatDate(sadeSati.windowStartJD)}</h3>`;
    }

    result.innerHTML =
      `<div class="chart-result-card sadesati-status-card">${statusHtml}</div>` +
      '<div class="sadesati-timeline">' +
      `<div class="sadesati-phase"><p class="chart-card-label">Rising phase</p><p>${RASHIS[targets[0]].name}</p><p class="sadesati-phase-date">from ${formatDate(sadeSati.windowStartJD)}</p></div>` +
      `<div class="sadesati-phase"><p class="chart-card-label">Peak phase</p><p>${RASHIS[targets[1]].name}</p><p class="sadesati-phase-date">from ${sadeSati.phase2StartJD ? formatDate(sadeSati.phase2StartJD) : '—'}</p></div>` +
      `<div class="sadesati-phase"><p class="chart-card-label">Setting phase</p><p>${RASHIS[targets[2]].name}</p><p class="sadesati-phase-date">from ${sadeSati.phase3StartJD ? formatDate(sadeSati.phase3StartJD) : '—'}</p></div>` +
      `<div class="sadesati-phase"><p class="chart-card-label">Ends</p><p>&nbsp;</p><p class="sadesati-phase-date">${formatDate(sadeSati.windowEndJD)}</p></div>` +
      '</div>' +
      `<p class="chart-finder-note">${greeting}ur natal moon is in ${moonSign.name} (${moonSign.english}). dates are approximate, accurate to within a few days — this runs on a simplified Saturn model, not a substitute for the full chart.</p>` +
      '<a class="text-link" href="../index.html#download">Get the full chart with Ask Tota →</a>';
  });
})();
