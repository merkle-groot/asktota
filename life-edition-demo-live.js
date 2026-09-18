/* Replace the demo's sample copy with real Life Edition API responses in local isolation mode.
 * The demo HTML and life-edition-demo.css remain the source of truth for the visual treatment.
 */
(function () {
  'use strict';

  var localHost = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  var params = new URLSearchParams(location.search);
  var mode = params.get('isolate');
  if (!localHost || !['partial', 'full'].includes(mode)) return;

  var state = readJson('asktota_web_life_edition');
  if (!state.chartId || !state.token || state.isolationMode !== mode) return;
  var api = (params.get('api') || window.ASKTOTA_API_URL || 'http://127.0.0.1:8000/v1').replace(/\/$/, '');
  var deskMeta = {
    career: { id: 'career', tone: 'lime', name: 'Career Desk', art: 'assets/desks/app/highres/career-desk.png' },
    love: { id: 'love', tone: 'pink', name: 'Love Scandal', art: 'assets/desks/app/highres/love-scandal.png' },
    wealth: { id: 'money', tone: 'yellow', name: 'Money Beat', art: 'assets/desks/app/highres/money-beat.png' },
    health: { id: 'health', tone: 'paper', name: 'Health Watch', art: 'assets/desks/app/highres/health-watch.png' },
    family: { id: 'home', tone: 'pink', name: 'Home Front', art: 'assets/desks/app/highres/home-front.png' },
    mind: { id: 'mind', tone: 'lime', name: 'Inner Wire', art: 'assets/desks/app/highres/inner-wire.png' },
    timing: { id: 'timing', tone: 'yellow', name: 'The Timing File', art: 'assets/desks/generated/timing-file-planets.png' },
    placements: { id: 'power', tone: 'lime', name: 'Power Placements', art: 'assets/desks/generated/power-placements-planets.png' },
    patterns: { id: 'patterns', tone: 'pink', name: 'Pattern Breakers', art: 'assets/desks/generated/pattern-breakers-planets.png' },
    moves: { id: 'moves', tone: 'ink', name: "Tota's Next Moves", art: 'assets/desks/generated/tota-next-moves-planets.png' },
  };
  var deskOrder = ['career', 'love', 'wealth', 'health', 'family', 'mind', 'timing', 'placements', 'patterns', 'moves'];
  var threadLabels = {
    career: 'Work',
    love: 'Love',
    wealth: 'Money',
    health: 'Health',
    family: 'Home',
    mind: 'Mind',
    timing: 'Timing',
    placements: 'Strengths',
    patterns: 'Patterns',
    moves: 'Next moves',
  };

  function readJson(key) {
    try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch (error) { return {}; }
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
    });
  }

  function rich(value) {
    return escapeHtml(value)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/==([^=]+)==/g, '<mark>$1</mark>');
  }

  function threadLabel(key, fallback) {
    return threadLabels[key] || fallback || 'Your life';
  }

  function request(path) {
    return fetch(api + path, { headers: { Authorization: 'Bearer ' + state.token } }).then(function (response) {
      return response.text().then(function (raw) {
        var body = {};
        try { body = raw ? JSON.parse(raw) : {}; } catch (error) { body = { message: raw }; }
        if (!response.ok) throw new Error(body.message || ('Backend returned HTTP ' + response.status + '.'));
        return body;
      });
    });
  }

  function notice(text) {
    var node = document.querySelector('.isolation-notice');
    if (node) node.textContent = text;
  }

  function storyFor(facet) {
    if (Array.isArray(facet.story)) return facet.story.map(String).filter(Boolean);
    if (Array.isArray(facet.paragraphs)) return facet.paragraphs.map(String).filter(Boolean);
    return facet.takeaway || facet.body || facet.why ? [String(facet.takeaway || facet.body || facet.why)] : [];
  }

  function roughFor(reading) {
    var rough = reading.rough_notes || reading.roughNotes || reading.rough || {};
    if (Array.isArray(rough.paragraphs)) return rough.paragraphs.map(String).filter(Boolean);
    if (rough.summary || rough.preamble) return [String(rough.summary || rough.preamble)];
    return [];
  }

  function notesFor(reading, facets) {
    if (Array.isArray(reading.top_three) && reading.top_three.length) return reading.top_three.slice(0, 3);
    var byKey = {};
    facets.forEach(function (facet) { if (facet && facet.key) byKey[facet.key] = facet; });
    var previewFacets = [reading.career || byKey.career, reading.wealth || byKey.wealth, reading.health || byKey.health].filter(Boolean);
    if (previewFacets.length) {
      return previewFacets.slice(0, 3).map(function (facet) {
        var story = storyFor(facet);
        return {
          key: facet.key,
          title: facet.title || facet.key,
          headline: facet.headline || facet.title || facet.key,
          body: facet.takeaway || story[0] || facet.why || 'A theme worth keeping in mind.',
        };
      });
    }
    var rough = roughFor(reading);
    return [
      { key: 'notes', title: 'Opening Notes', headline: 'The file starts here.', body: rough[0] || 'The first signal is already in the room.' },
    ];
  }

  function renderTopThree(root, reading, facets) {
    var notes = notesFor(reading, facets);
    var name = String((reading.birth && reading.birth.name) || state.name || 'u');
    var view = root.closest('[data-reading-view]');
    var targetPrefix = view && view.dataset.readingView === 'partial' ? 'partial-' : 'desk-';
    root.innerHTML =
      '<div class="three-intro"><div class="three-intro-copy"><p class="section-kicker mono">FOR ' + escapeHtml(name.toUpperCase()) + '</p><h2>Three things<br><em>to keep in mind.</em></h2><p>Before the full reading, these are the themes that keep showing up in your life right now.</p><span class="three-intro-note">A starting point, not a verdict <b aria-hidden="true">↘</b></span></div><div class="three-portrait"><span class="three-portrait-label mono">A SHORT NOTE FROM TOTA</span><img src="assets/tota/tota-three-notes-trio.png" alt="Tota presenting three notes from the opening reading" loading="lazy"><span class="three-portrait-caption"><b>01—03</b><span>the short list</span></span></div></div>' +
      '<div class="three-list-head"><span>THE SHORT LIST</span><span>01—03 · READ ON</span></div>' +
      '<ol class="three-list">' + notes.map(function (note, index) {
        var meta = deskMeta[note.key] || { name: note.title || note.key || 'The thread' };
        var target = targetPrefix + (meta.id || note.key || 'desk');
        var label = threadLabel(note.key, note.title || meta.name).toUpperCase();
        return '<li class="three-note three-note-' + escapeHtml(meta.tone || 'green') + '"><a class="three-note-card" href="#' + escapeHtml(target) + '"><div class="three-note-head"><span class="three-folio" aria-hidden="true">0' + (index + 1) + '</span><span class="three-note-topic">' + escapeHtml(label) + '</span><span class="three-note-count">0' + (index + 1) + ' / 03</span></div><h3>' + rich(note.headline || meta.name) + '</h3><p>' + rich(note.body || note.takeaway || 'A theme worth keeping in mind.') + '</p><span class="three-note-action">read this desk <span aria-hidden="true">↗</span></span></a></li>';
      }).join('') + '</ol>';
  }

  function renderDesk(facet, index) {
    var meta = deskMeta[facet.key] || { id: facet.key || 'desk-' + index, tone: 'paper', name: facet.title || 'The Desk', art: 'assets/tota/tota-news-vendor.png' };
    var story = storyFor(facet);
    var headline = facet.headline || facet.title || meta.name;
    var receipt = facet.why || facet.receipt || (Array.isArray(facet.evidence) ? facet.evidence.join(' · ') : 'A reason this fits your life.');
    var number = String(index + 1).padStart(2, '0');
    var paragraphs = story.length ? story : [facet.takeaway || 'The file is still being inked.'];
    var html = '<article id="desk-' + escapeHtml(meta.id) + '" class="desk-file desk-file-' + escapeHtml(meta.id) + ' desk-file-' + escapeHtml(meta.tone) + '" data-reveal data-progress-step="' + index + '">';
    html += '<div class="desk-visual"><img src="' + escapeHtml(meta.art) + '" alt="' + escapeHtml(meta.name + ' illustration') + '" loading="lazy"><span class="desk-visual-label mono">' + number + ' / ' + escapeHtml(meta.name.toUpperCase()) + '</span></div>';
    html += '<div class="desk-copy"><span class="desk-number">' + number + '</span><h3>' + rich(headline) + '</h3><p class="narrator-byline">A personal letter from Tota · ' + Math.max(1, Math.round(paragraphs.join(' ').split(/\s+/).filter(Boolean).length / 180)) + ' min</p>';
    paragraphs.forEach(function (paragraph, paragraphIndex) {
      html += '<p class="reading-copy">' + rich(paragraph) + '</p>';
      if (facet.quote && facet.quote.text && paragraphIndex === 0) html += '<blockquote class="quote-block"><p class="q">&quot;' + escapeHtml(facet.quote.text) + '&quot;</p><p class="src">— ' + escapeHtml(facet.quote.source || 'the situation') + ', allegedly</p></blockquote>';
    });
    html += '<div class="desk-foot reflection"><span class="reflection-label mono">WHY TOTA LANDED HERE</span><span class="reflection-copy">' + rich(receipt) + '</span></div></div></article>';
    return html;
  }

  function updatePartial(reading) {
    var career = reading.career || {};
    var money = reading.wealth || reading.money || {};
    var health = reading.health || {};
    var previews = [
      { id: 'partial-career', facet: career, name: 'Career Desk' },
      { id: 'partial-money', facet: money, name: 'Money Beat' },
      { id: 'partial-health', facet: health, name: 'Health Watch' },
    ];
    previews.forEach(function (preview) {
      var node = document.getElementById(preview.id);
      if (!node) return;
      var facet = preview.facet;
      if (!facet.key) throw new Error('The preview did not return the ' + preview.name + '.');
      var story = storyFor(facet);
      var paragraphs = story.slice(0, 2);
      if (!paragraphs.length && facet.takeaway) paragraphs = [String(facet.takeaway)];
      var body = String(paragraphs[0] || '');
      var why = String(facet.why || facet.receipt || (Array.isArray(facet.evidence) ? facet.evidence.join(' · ') : ''));
      if (!body || !why) throw new Error('The preview returned an incomplete ' + preview.name + '.');
      var words = paragraphs.join(' ').split(/\s+/).filter(Boolean).length;
      var heading = node.querySelector('h3');
      var byline = node.querySelector('.narrator-byline');
      var copy = node.querySelector('.reading-copy');
      var copyRoot = node.querySelector('.partial-story-copy');
      var receipt = node.querySelector('.reflection-copy');
      if (heading) heading.innerHTML = rich(facet.headline || facet.title || preview.name);
      if (byline) byline.textContent = 'A first look at the ' + preview.name + ' · ' + Math.max(1, Math.round(words / 180)) + ' min';
      if (copyRoot) copyRoot.innerHTML = paragraphs.map(function (paragraph) { return '<p class="reading-copy">' + rich(paragraph) + '</p>'; }).join('');
      else if (copy) copy.innerHTML = rich(body);
      if (receipt) receipt.innerHTML = rich(why);
    });
    document.querySelectorAll('.life-three').forEach(function (root) { renderTopThree(root, reading, [career, money, health]); });
  }

  function updateFull(reading) {
    var facets = Array.isArray(reading.facets) ? reading.facets.slice() : [];
    facets.sort(function (a, b) { return deskOrder.indexOf(a.key) - deskOrder.indexOf(b.key); });
    var root = document.querySelector('#full-reading .full-reading-stack');
    if (root) root.innerHTML = facets.map(renderDesk).join('');
    document.querySelectorAll('.life-three').forEach(function (section) { renderTopThree(section, reading, facets); });
    var name = String((reading.birth && reading.birth.name) || state.name || 'Ravi');
    var prepared = document.querySelector('.header-center span:last-child');
    if (prepared) prepared.textContent = 'PREPARED FOR ' + name.toUpperCase();
    var dedication = document.querySelector('.cover-dedication');
    if (dedication) dedication.textContent = 'For ' + name + ', with curiosity.';
    var deck = document.querySelector('.hero-deck');
    if (deck && reading.essence) deck.textContent = reading.essence;
    var time = document.querySelector('[data-read-time]');
    if (time) time.textContent = '16';
    var fullButton = document.querySelector('[data-mode-button="full"]');
    if (fullButton) fullButton.click();
  }

  notice('REAL API · ' + mode.toUpperCase() + ' DEMO · 29 JAN 1999 · 06:00 · KOZHIKODE · LOADING');
  var partialPath = '/web/charts/' + encodeURIComponent(state.chartId) + '/partial';
  var structuredPath = '/web/charts/' + encodeURIComponent(state.chartId) + '/structured';
  var work = Promise.all([request(partialPath), request(structuredPath).catch(function () { return null; })]).then(function (results) {
    var partial = results[0];
    if (results[1]) partial.chart = results[1];
    updatePartial(partial);
    if (mode === 'full') return request('/web/charts/' + encodeURIComponent(state.chartId) + '/edition').then(function (edition) { updateFull(edition); });
    var partialButton = document.querySelector('[data-mode-button="partial"]');
    if (partialButton) partialButton.click();
  });
  work.then(function () {
    notice('REAL API · ' + mode.toUpperCase() + ' DEMO · 29 JAN 1999 · 06:00 · KOZHIKODE · NO MOCK RESPONSES');
  }).catch(function (error) {
    notice('REAL API ERROR · ' + (error.message || 'Could not load the story.') + ' · API ' + api);
  });
}());
