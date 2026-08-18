// One widget, several modes. Every Chart Desk post that needs a calculator
// drops in a <form id="chart-tool-form" data-mode="..."> and this file
// decides what to compute and how to print it. Modes:
//
//   kundli   full natal chart, all nine grahas placed in whole-sign houses
//   houses   the twelve houses of your chart, with signs, lords, occupants
//   grahas   where each of the nine grahas sits, with dignity and motion
//   rashi    the three signs people mix up: moon, sun, lagna
//   manglik  Mars counted from lagna, moon and Venus, plus the cancellations
//   career   the 10th house, its lord, and where that lord went
//   panchang the five limbs of the day, date only
//   lifepath numerology life path number, date only
//
// Requires astro-lib.js to be loaded first.
(function () {
  const A = window.AstroLib;
  const form = document.getElementById('chart-tool-form');
  const result = document.getElementById('chart-tool-result');
  if (!A || !form || !result) return;

  const mode = form.getAttribute('data-mode') || 'kundli';
  const INDIA_UTC_OFFSET = 5.5;

  const nameField = document.getElementById('chart-tool-name');
  const dateField = document.getElementById('chart-tool-date');
  const timeField = document.getElementById('chart-tool-time');
  const placeInput = document.getElementById('chart-tool-place-search');

  const place = placeInput
    ? A.attachPlaceSearch({
        inputId: 'chart-tool-place-search',
        resultsId: 'chart-tool-place-results',
        latId: 'chart-tool-place-lat',
        lonId: 'chart-tool-place-lon',
        statusId: 'chart-tool-place-status',
      })
    : null;

  // --- copy tables -------------------------------------------------------

  const HOUSE_MEANING = [
    'body, temperament, how u land in a room',
    'money u earn, family u came from, the way u speak',
    'nerve, siblings, short trips, ur own effort',
    'home, mother, land, the floor under everything',
    'creativity, romance, children, what u learn for fun',
    'work, routine, health, the problems u solve for a living',
    'marriage, business partners, anyone u face across a table',
    'inheritance, secrets, upheaval, other people’s money',
    'luck, belief, teachers, long journeys, the father',
    'career, public standing, the thing u are known for',
    'income, networks, older siblings, what u want next',
    'costs, sleep, foreign places, letting go',
  ];

  const GRAHA_JOB = {
    Sun: 'authority, spine, the father, whatever u take seriously',
    Moon: 'mood, memory, the mother, how u process the day',
    Mars: 'nerve, temper, competition, physical drive',
    Mercury: 'speech, analysis, commerce, the way u argue',
    Jupiter: 'belief, teachers, expansion, the benefit of the doubt',
    Venus: 'taste, romance, comfort, what u find beautiful',
    Saturn: 'time, restriction, discipline, the slow reward',
    Rahu: 'hunger, obsession, the thing u overdo',
    Ketu: 'detachment, old skill, the thing u drop without noticing',
  };

  const LORD_CAREER = {
    Sun: 'government, administration, medicine, anything with a chain of command',
    Moon: 'public-facing work, hospitality, care, food, the wider public',
    Mars: 'engineering, surgery, defence, sport, property, sharp tools',
    Mercury: 'writing, analysis, trade, software, teaching, anything with a spreadsheet',
    Jupiter: 'law, teaching, finance, advisory work, institutions',
    Venus: 'design, media, fashion, luxury, the arts, relationship-led work',
    Saturn: 'labour, systems, mining, logistics, long-horizon institutional work',
    Rahu: 'new categories, foreign work, media, anything unregulated and fast',
    Ketu: 'research, spiritual work, niche technical craft, behind the scenes',
  };

  const MANGLIK_HOUSES = [1, 2, 4, 7, 8, 12];

  const LIFE_PATH = {
    1: ['the starter', 'u would rather run something small than manage something large'],
    2: ['the diplomat', 'u read a room before u read a brief'],
    3: ['the communicator', 'u think out loud and it works'],
    4: ['the builder', 'u trust systems over inspiration'],
    5: ['the restless one', 'u renegotiate ur own routine every few months'],
    6: ['the caretaker', 'people bring u their problems, invited or not'],
    7: ['the analyst', 'u need to understand it before u can enjoy it'],
    8: ['the operator', 'u are comfortable with money, scale and consequences'],
    9: ['the finisher', 'u are good at endings other people avoid'],
    11: ['the master number 11', 'a 2 turned up loud: intuition with a bigger audience'],
    22: ['the master number 22', 'a 4 turned up loud: builds things meant to outlast the builder'],
    33: ['the master number 33', 'a 6 turned up loud: care at the scale of a community'],
  };

  // --- helpers -----------------------------------------------------------

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function fail(message) {
    result.hidden = false;
    result.innerHTML = '<p class="chart-finder-error">' + esc(message) + '</p>';
  }

  function card(label, value, sub, flag) {
    return (
      '<div class="chart-result-card"><p class="chart-card-label">' + esc(label) + '</p><h3>' +
      esc(value) + (sub ? ' <span>' + esc(sub) + '</span>' : '') + '</h3>' +
      (flag ? '<p class="chart-card-flag">' + esc(flag) + '</p>' : '') + '</div>'
    );
  }

  function grid(cards) {
    return '<div class="chart-result-grid">' + cards.join('') + '</div>';
  }

  function note(html) {
    return '<p class="chart-finder-note">' + html + '</p>';
  }

  const CTA = '<a class="text-link" href="../index.html#waitlist">Get the full chart with Ask Tota &rarr;</a>';

  function listJoin(arr) {
    if (arr.length <= 1) return arr.join('');
    return arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1];
  }

  function deg(x) {
    const d = Math.floor(x);
    const m = Math.round((x - d) * 60);
    return m === 60 ? d + 1 + '° 00′' : d + '° ' + String(m).padStart(2, '0') + '′';
  }

  function ordinal(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  function motionLabel(g) {
    if (g.name === 'Rahu' || g.name === 'Ketu') return 'always retrograde';
    return g.retrograde ? 'retrograde' : 'direct';
  }

  function stateOf(g) {
    const bits = [];
    if (g.dignity) bits.push(g.dignity);
    if (g.combust) bits.push('combust');
    if (g.retrograde && g.name !== 'Rahu' && g.name !== 'Ketu') bits.push('retrograde');
    return bits.length ? bits.join(', ') : '—';
  }

  function readBirthInputs() {
    const dateVal = dateField ? dateField.value : '';
    const timeVal = timeField ? timeField.value : '';
    if (!dateVal || !timeVal) return null;
    const lat = place ? place.getLat() : NaN;
    const lon = place ? place.getLon() : NaN;
    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      fail('Pick a birth place from the search results before calculating.');
      return null;
    }
    const [year, month, day] = dateVal.split('-').map(Number);
    const [hour, minute] = timeVal.split(':').map(Number);
    return {
      year: year, month: month, day: day, hour: hour, minute: minute,
      tzOffset: INDIA_UTC_OFFSET, lat: lat, lon: lon,
    };
  }

  function greeting() {
    const v = nameField ? (nameField.value || '').trim() : '';
    return v ? esc(v) + ', ' : '';
  }

  function grahaTable(chart) {
    let rows = '';
    chart.grahas.forEach(function (g) {
      rows +=
        '<tr><td data-label="Graha"><strong>' + esc(g.name) + '</strong></td>' +
        '<td data-label="Sign">' + esc(g.sign.name) + ' (' + esc(g.sign.english) + ')</td>' +
        '<td data-label="Degree">' + deg(g.degInSign) + '</td>' +
        '<td data-label="House">' + ordinal(g.house) + '</td>' +
        '<td data-label="Nakshatra">' + esc(g.nakshatra.name) + ' pada ' + g.nakshatra.pada + '</td>' +
        '<td data-label="State">' + esc(stateOf(g)) + '</td></tr>';
    });
    return (
      '<div class="blog-table-wrap"><table><thead><tr><th>Graha</th><th>Sign</th><th>Degree</th>' +
      '<th>House</th><th>Nakshatra</th><th>State</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
    );
  }

  // --- renderers ---------------------------------------------------------

  const RENDER = {
    kundli: function (chart) {
      const moonNak = chart.moonNakshatra;
      return (
        grid([
          card('Lagna (rising)', chart.lagna.name, '(' + chart.lagna.english + ') ' + deg(chart.lagna.degInSign)),
          card('Moon sign (rashi)', chart.moonSign.name, '(' + chart.moonSign.english + ')'),
          card('Birth nakshatra', moonNak.name, 'pada ' + moonNak.pada + ', ruled by ' + moonNak.lord),
        ]) +
        grahaTable(chart) +
        note(
          greeting() + 'this is ur chart in its plainest form: nine grahas, twelve whole-sign houses counted from ' +
          esc(chart.lagna.name) + ' as the 1st. ur lagna lord is <strong>' + esc(chart.lagnaLord) +
          '</strong>, which is the planet whose condition matters most in ur chart. ayanamsa used: Lahiri, ' +
          chart.ayanamsa.toFixed(2) + '°.'
        ) + CTA
      );
    },

    houses: function (chart) {
      let rows = '';
      chart.houses.forEach(function (h) {
        const occ = h.occupants.length
          ? h.occupants.map(function (g) { return esc(g.name) + (g.retrograde && g.name !== 'Rahu' && g.name !== 'Ketu' ? ' (R)' : ''); }).join(', ')
          : 'empty';
        rows +=
          '<tr><td data-label="House"><strong>' + ordinal(h.number) + '</strong></td>' +
          '<td data-label="Sign">' + esc(h.sign.name) + ' (' + esc(h.sign.english) + ')</td>' +
          '<td data-label="Lord">' + esc(h.lord) + '</td>' +
          '<td data-label="Planets here">' + occ + '</td>' +
          '<td data-label="Covers">' + HOUSE_MEANING[h.number - 1] + '</td></tr>';
      });
      const empties = chart.houses.filter(function (h) { return !h.occupants.length; }).length;
      return (
        grid([
          card('Lagna (1st house)', chart.lagna.name, '(' + chart.lagna.english + ')'),
          card('Lagna lord', chart.lagnaLord, 'in the ' + ordinal(chart.byName[chart.lagnaLord].house)),
          card('Empty houses', String(empties), 'of 12, which is normal'),
        ]) +
        '<div class="blog-table-wrap"><table><thead><tr><th>House</th><th>Sign</th><th>Lord</th>' +
        '<th>Planets here</th><th>Covers</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
        note(
          greeting() + 'nine planets cannot fill twelve houses, so most charts run ' + empties +
          ' or so empty. an empty house is not a dead area of life. it just means u read it through its lord instead, ' +
          'which is the row next to it.'
        ) + CTA
      );
    },

    grahas: function (chart) {
      let rows = '';
      chart.grahas.forEach(function (g) {
        rows +=
          '<tr><td data-label="Graha"><strong>' + esc(g.name) + '</strong></td>' +
          '<td data-label="Runs">' + GRAHA_JOB[g.name] + '</td>' +
          '<td data-label="Sitting in">' + esc(g.sign.name) + ', ' + ordinal(g.house) + ' house</td>' +
          '<td data-label="Motion">' + motionLabel(g) + '</td>' +
          '<td data-label="State">' + esc(stateOf(g)) + '</td></tr>';
      });
      const strong = chart.grahas.filter(function (g) { return g.dignity === 'exalted' || g.dignity === 'own sign'; });
      const weak = chart.grahas.filter(function (g) { return g.dignity === 'debilitated'; });
      return (
        grid([
          card('Comfortable', strong.length ? strong.map(function (g) { return g.name; }).join(', ') : 'none', strong.length ? 'exalted or in own sign' : 'no graha in its own sign'),
          card('Under pressure', weak.length ? weak.map(function (g) { return g.name; }).join(', ') : 'none', weak.length ? 'debilitated' : 'no debilitated graha'),
          card('Retrograde now', chart.grahas.filter(function (g) { return g.retrograde && g.name !== 'Rahu' && g.name !== 'Ketu'; }).length || '0', 'excluding the nodes'),
        ]) +
        '<div class="blog-table-wrap"><table><thead><tr><th>Graha</th><th>Runs</th><th>Sitting in</th>' +
        '<th>Motion</th><th>State</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
        note(
          greeting() + 'dignity is not a score. a debilitated planet is one working in conditions it does not like, ' +
          'which usually reads as effort rather than failure. the state column is the raw fact. what it means for u ' +
          'depends on which houses that planet rules, which is where a full reading starts.'
        ) + CTA
      );
    },

    rashi: function (chart) {
      const sun = chart.byName.Sun;
      return (
        grid([
          card('Moon sign (ur rashi)', chart.moonSign.name, '(' + chart.moonSign.english + ')'),
          card('Sun sign (Vedic)', sun.sign.name, '(' + sun.sign.english + ') ' + deg(sun.degInSign)),
          card('Rising sign (lagna)', chart.lagna.name, '(' + chart.lagna.english + ')'),
        ]) +
        note(
          greeting() + 'in India, "ur sign" almost always means the <strong>moon sign</strong>, the one on the left. ' +
          'the middle one is ur sidereal sun sign, which is usually one behind the western sun sign u already know. ' +
          'the third changes every couple of hours, which is why birth time matters. ' +
          'more on the difference in <a href="sun-moon-rising.html">sun vs moon vs rising</a>.'
        ) + CTA
      );
    },

    manglik: function (chart) {
      const mars = chart.byName.Mars;
      const venus = chart.byName.Venus;
      const fromLagna = mars.house;
      const fromMoon = mars.houseFromMoon;
      const fromVenus = A.houseFrom(venus.signIndex, mars.signIndex);
      const hits = [];
      if (MANGLIK_HOUSES.indexOf(fromLagna) !== -1) hits.push('lagna');
      if (MANGLIK_HOUSES.indexOf(fromMoon) !== -1) hits.push('moon');
      if (MANGLIK_HOUSES.indexOf(fromVenus) !== -1) hits.push('Venus');

      const cancellations = [];
      if (mars.sign.english === 'Aries' || mars.sign.english === 'Scorpio' || mars.sign.english === 'Capricorn') {
        cancellations.push('Mars is in ' + mars.sign.name + ', its own sign or its exaltation sign, which most traditions read as the dosha standing down');
      }
      if (mars.sign.english === 'Cancer' || mars.sign.english === 'Leo') {
        cancellations.push('Mars sits in ' + mars.sign.name + ', which several schools treat as neutralising');
      }
      if (chart.byName.Jupiter.house === 7 || chart.byName.Jupiter.house === 1) {
        cancellations.push('Jupiter is in the ' + ordinal(chart.byName.Jupiter.house) + ', a placement widely read as protective of the marriage house');
      }
      if (chart.byName.Saturn.house === fromLagna) {
        cancellations.push('Saturn shares the house with Mars, which classical sources treat as tempering it');
      }

      const verdict = hits.length === 0
        ? 'no manglik placement'
        : hits.length === 1
          ? 'partial, from the ' + hits[0] + ' only'
          : 'manglik from ' + listJoin(hits);

      return (
        grid([
          card('Verdict', verdict, hits.length ? 'Mars in a counted house' : 'Mars is outside 1, 2, 4, 7, 8 and 12'),
          card('Mars is in', mars.sign.name, deg(mars.degInSign) + ', ' + ordinal(fromLagna) + ' from lagna'),
          card('Counted from', ordinal(fromLagna) + ' / ' + ordinal(fromMoon) + ' / ' + ordinal(fromVenus), 'lagna / moon / Venus'),
        ]) +
        note(
          greeting() + (hits.length
            ? 'Mars lands in a counted house from the ' + listJoin(hits) + '. that is what the label means, and all it means. ' +
              (cancellations.length
                ? 'worth knowing before anyone starts negotiating: ' + listJoin(cancellations) + '.'
                : 'no standard cancellation applies here, which still does not make this a verdict on a marriage.')
            : 'Mars is not in the 1st, 2nd, 4th, 7th, 8th or 12th from ur lagna, moon or Venus, so the label does not apply on any of the three counts.') +
          ' different astrologers count from different reference points, which is exactly why two of them can give u opposite answers about the same chart. ' +
          'more on that in <a href="manglik-dosha.html">the manglik explainer</a>.'
        ) + CTA
      );
    },

    career: function (chart) {
      const tenth = chart.houses[9];
      const lord = chart.byName[tenth.lord];
      const occ = tenth.occupants;
      return (
        grid([
          card('10th house sign', tenth.sign.name, '(' + tenth.sign.english + ')'),
          card('10th lord', tenth.lord, 'sitting in the ' + ordinal(lord.house)),
          card('Planets in the 10th', occ.length ? occ.map(function (g) { return g.name; }).join(', ') : 'none', occ.length ? '' : 'read the lord instead'),
        ]) +
        note(
          greeting() + 'ur 10th house is ' + esc(tenth.sign.name) + ', ruled by <strong>' + esc(tenth.lord) +
          '</strong>. ' + esc(tenth.lord) + ' leans toward ' + LORD_CAREER[tenth.lord] + '. that lord is currently ' +
          'sitting in ur ' + ordinal(lord.house) + ' house (' + HOUSE_MEANING[lord.house - 1] + '), which is the ' +
          'part of life ur working life keeps getting routed through. ' +
          (occ.length
            ? 'u also have ' + listJoin(occ.map(function (g) { return esc(g.name); })) + ' sitting in the 10th itself, which colours the public-facing version of ur work.'
            : 'an empty 10th house is common and means nothing bad. nine planets, twelve houses.')
        ) + CTA
      );
    },

    panchang: function (chart, meta) {
      return (
        grid([
          card('Tithi', chart.tithi.name, chart.tithi.paksha + ' paksha, ' + chart.tithi.numberInPaksha + ' of 15'),
          card('Vara', chart.vara.name, chart.vara.english + ', ruled by ' + chart.vara.lord),
          card('Nakshatra', chart.moonNakshatra.name, 'pada ' + chart.moonNakshatra.pada + ', lord ' + chart.moonNakshatra.lord),
        ]) +
        grid([
          card('Yoga', chart.yoga.name, Math.round(chart.yoga.fractionElapsed * 100) + '% elapsed'),
          card('Karana', chart.karana.name, chart.karana.fixed ? 'a fixed karana' : 'a movable karana'),
          card('Moon sign', chart.moonSign.name, '(' + chart.moonSign.english + ')'),
        ]) +
        note(
          esc(meta.dateLabel) + ', calculated for sunrise-ish local time in India. these five limbs are the whole ' +
          'panchang: tithi, vara, nakshatra, yoga, karana. every muhurat u have ever been quoted is assembled from ' +
          'these five and nothing else. tithi, yoga and karana all move continuously, so a printed panchang gives u ' +
          'the one running at sunrise and the clock time it ends.'
        ) + CTA
      );
    },
  };

  // --- date-only modes ---------------------------------------------------

  function runPanchang() {
    const dateVal = dateField ? dateField.value : '';
    if (!dateVal) return;
    const [year, month, day] = dateVal.split('-').map(Number);
    const chart = A.computeChart({
      year: year, month: month, day: day, hour: 6, minute: 0,
      tzOffset: INDIA_UTC_OFFSET, lat: 28.6139, lon: 77.2090,
    });
    const dateLabel = new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
    });
    result.hidden = false;
    result.innerHTML = RENDER.panchang(chart, { dateLabel: dateLabel });
  }

  function digitSum(n) {
    let x = n;
    while (x > 9 && x !== 11 && x !== 22 && x !== 33) {
      x = String(x).split('').reduce(function (a, d) { return a + Number(d); }, 0);
    }
    return x;
  }

  function runLifePath() {
    const dateVal = dateField ? dateField.value : '';
    if (!dateVal) return;
    const [year, month, day] = dateVal.split('-').map(Number);
    const parts = [digitSum(day), digitSum(month), digitSum(year)];
    const total = digitSum(parts.reduce(function (a, b) { return a + b; }, 0));
    const meaning = LIFE_PATH[total] || ['', ''];
    result.hidden = false;
    result.innerHTML =
      grid([
        card('Life path number', String(total), meaning[0]),
        card('From the day', String(parts[0]), 'day ' + day + ' reduced'),
        card('From month and year', parts[1] + ' and ' + parts[2], 'reduced separately, then added'),
      ]) +
      note(
        greeting() + 'life path ' + total + ': ' + meaning[1] + '. this is arithmetic, not astronomy. ' +
        'numerology reduces ur birth date to a single digit, with 11, 22 and 33 traditionally left unreduced. ' +
        'it uses ur calendar date and nothing about where the planets actually were, which is the honest difference ' +
        'between this and a birth chart.'
      ) + CTA;
  }

  // --- submit ------------------------------------------------------------

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (mode === 'panchang') return runPanchang();
    if (mode === 'lifepath') return runLifePath();

    const input = readBirthInputs();
    if (!input) return;

    let chart;
    try {
      chart = A.computeChart(input);
    } catch (err) {
      fail('Could not calculate that chart. Check the date and time and try again.');
      throw err;
    }

    const render = RENDER[mode];
    if (!render) {
      fail('This calculator is misconfigured. Tell us at hello@asktota.com and we will fix it.');
      return;
    }
    result.hidden = false;
    result.innerHTML = render(chart, {});
  });
})();
