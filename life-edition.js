/* Ask Tota Life Edition web client.
 *
 * The web client is deliberately lead-first: the browser keeps only an opaque web session token
 * in localStorage. It can request the partial reading before payment, but it cannot request the
 * ten-desk edition until /v1/web/orders/:id/verify has returned verified=true.
 */
(function () {
  'use strict';

  var API = (window.ASKTOTA_API_URL || 'https://api.asktota.com/v1').replace(/\/$/, '');
  var STORAGE_KEY = 'asktota_web_life_edition';
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var EDITION_REQUEST_TIMEOUT_MS = 150000;
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var RASHI_ABBR = ['Me', 'Vr', 'Mi', 'Ka', 'Si', 'Kn', 'Tu', 'Vk', 'Dh', 'Mk', 'Ku', 'Mn'];
  var PLANET_ABBR = { Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me', Jupiter: 'Ju', Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke' };
  var SOUTH_CELL = { 11: [0, 0], 0: [0, 1], 1: [0, 2], 2: [0, 3], 10: [1, 0], 3: [1, 3], 9: [2, 0], 4: [2, 3], 8: [3, 0], 7: [3, 1], 6: [3, 2], 5: [3, 3] };
  var DESKS = [
    { key: 'career', name: 'Career Desk', tone: 'green', art: 'assets/desks/app/career-desk.png' },
    { key: 'love', name: 'Love Scandal', tone: 'pink', art: 'assets/desks/app/love-scandal.png' },
    { key: 'wealth', name: 'Money Beat', tone: 'marigold', art: 'assets/desks/app/money-beat.png' },
    { key: 'health', name: 'Health Watch', tone: 'green', art: 'assets/desks/app/health-watch.png' },
    { key: 'family', name: 'Home Front', tone: 'ink', art: 'assets/desks/app/home-front.png' },
    { key: 'mind', name: 'Inner Wire', tone: 'green', art: 'assets/desks/app/inner-wire.png' },
    { key: 'timing', name: 'The Timing File', tone: 'marigold', art: 'assets/desks/generated/timing-file.webp' },
    { key: 'placements', name: 'Power Placements', tone: 'green', art: 'assets/desks/generated/power-placements.webp' },
    { key: 'patterns', name: 'Pattern Breakers', tone: 'pink', art: 'assets/desks/generated/pattern-breakers.webp' },
    { key: 'moves', name: "Tota's Next Moves", tone: 'ink', art: 'assets/desks/generated/tota-next-moves.webp' },
  ];

  function readStored() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch (e) { return {}; }
  }
  var stored = readStored();
  var state = {
    token: stored.token || '',
    chartId: stored.chartId || '',
    name: stored.name || '',
    date: stored.date || '',
    hour: Number.isInteger(stored.hour) ? stored.hour : 12,
    minute: Number.isInteger(stored.minute) ? stored.minute : 0,
    accuracy: stored.accuracy || 'unknown',
    place: stored.place || null,
    contactType: 'whatsapp',
    contactValue: stored.contactValue || '',
    orderId: stored.orderId || '',
    verified: stored.verified === true,
    linked: stored.linked === true,
    accountToken: stored.accountToken || '',
  };
  var partialReading = null;
  var webContactProof = '';
  var verifiedContactPhone = '';


  var screens = {};
  document.querySelectorAll('[data-screen]').forEach(function (node) { screens[node.dataset.screen] = node; });
  var save = function () {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  };
  var reducedScroll = REDUCED ? 'auto' : 'smooth';
  function show(name) {
    Object.keys(screens).forEach(function (key) { screens[key].hidden = key !== name; });
    document.body.classList.toggle('is-reading-screen', name === 'partial' || name === 'reading');
    window.scrollTo({ top: 0, behavior: reducedScroll });
  }
  function text(id, value) { var node = document.getElementById(id); if (node) node.textContent = value || ''; }
  function clearMessage(id) { text(id, ''); }
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
    });
  }
  function request(path, options) {
    options = options || {};
    var authToken = options.authToken === undefined ? state.token : options.authToken;
    var headers = Object.assign({}, options.headers || {});
    if (options.body !== undefined && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    if (authToken) headers.Authorization = 'Bearer ' + authToken;
    var fetchOptions = Object.assign({}, options, { headers: headers });
    delete fetchOptions.authToken;
    return fetch(API + path, fetchOptions).then(function (response) {
      return response.text().then(function (raw) {
        var body = {};
        try { body = raw ? JSON.parse(raw) : {}; } catch (e) { body = { message: raw }; }
        if (!response.ok) {
          var error = new Error(body.message || 'something went sideways. try again.');
          error.status = response.status; error.code = body.code || body.error;
          error.attemptsRemaining = body.attemptsRemaining ?? body.attempts_remaining ?? body.attemptsLeft ?? body.attempts_left;
          throw error;
        }
        return body;
      });
    });
  }
  function requestWithTimeout(path, options, timeoutMs) {
    if (!window.AbortController) return request(path, options);
    var controller = new AbortController();
    var timer = window.setTimeout(function () { controller.abort(); }, timeoutMs);
    return request(path, Object.assign({}, options || {}, { signal: controller.signal })).catch(function (error) {
      if (error && error.name === 'AbortError') {
        var timeoutError = new Error('the reading took too long. try it again in a moment.');
        timeoutError.code = 'request_timeout';
        timeoutError.status = 504;
        throw timeoutError;
      }
      throw error;
    }).finally(function () { window.clearTimeout(timer); });
  }
  function setBusy(button, on, idleLabel) {
    if (!button) return;
    button.disabled = on;
    button.classList.toggle('is-busy', on);
    button.textContent = on ? 'one sec…' : idleLabel;
  }

  /* ── Date and time picker sheets ─────────────────────────────────────────── */
  var datePicker = document.getElementById('date-picker');
  var timePicker = document.getElementById('time-picker');
  var pickerFocus = null;
  var pickerCandidate = { month: 1, day: 1, year: new Date().getFullYear(), hour: 12, minute: 0 };

  function daysInMonth(year, month) { return new Date(year, month, 0).getDate(); }
  function dateParts(iso) {
    var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    return match ? { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) } : null;
  }
  function dateLabel(parts) { return parts ? String(parts.day).padStart(2, '0') + ' ' + MONTHS[parts.month - 1] + ' ' + parts.year : 'choose ur date'; }
  function selectedDateParts() { return dateParts(state.date); }
  function clampCandidateDay() {
    pickerCandidate.day = Math.min(pickerCandidate.day, daysInMonth(pickerCandidate.year, pickerCandidate.month));
  }
  function valuesFor(unit) {
    if (unit === 'month') return MONTHS.map(function (_, i) { return i + 1; });
    if (unit === 'day') return Array.from({ length: daysInMonth(pickerCandidate.year, pickerCandidate.month) }, function (_, i) { return i + 1; });
    if (unit === 'year') return Array.from({ length: new Date().getFullYear() - 1899 }, function (_, i) { return new Date().getFullYear() - i; });
    if (unit === 'hour') return Array.from({ length: 24 }, function (_, i) { return i; });
    return Array.from({ length: 60 }, function (_, i) { return i; });
  }
  function displayValue(unit, value) {
    if (unit === 'month') return MONTHS[value - 1];
    if (unit === 'day' || unit === 'hour' || unit === 'minute') return String(value).padStart(2, '0');
    return String(value);
  }
  function choosePickerValue(unit, value, focus) {
    pickerCandidate[unit] = Number(value);
    if (unit === 'month' || unit === 'year') {
      clampCandidateDay();
      renderPickerColumn('date', 'day');
    }
    renderPickerColumn(unit === 'hour' || unit === 'minute' ? 'time' : 'date', unit);
    updatePickerSummary(unit === 'hour' || unit === 'minute' ? 'time' : 'date');
    if (focus && !REDUCED) focus.scrollIntoView({ block: 'center', behavior: reducedScroll });
  }
  function renderPickerColumn(mode, unit) {
    var root = document.querySelector('#' + mode + '-picker [data-unit="' + unit + '"]');
    if (!root) return;
    var values = valuesFor(unit);
    var rows = root.querySelector('.picker-rows');
    var select = root.querySelector('.picker-select');
    var selected = pickerCandidate[unit];
    rows.innerHTML = values.map(function (value) {
      var on = value === selected;
      return '<button type="button" class="picker-row' + (on ? ' is-selected' : '') + '" role="radio" aria-checked="' + on + '" tabindex="' + (on ? '0' : '-1') + '" data-value="' + value + '">' + escapeHtml(displayValue(unit, value)) + '</button>';
    }).join('');
    rows.querySelectorAll('.picker-row').forEach(function (row) {
      row.addEventListener('click', function () { choosePickerValue(unit, row.dataset.value, row); });
      row.addEventListener('keydown', function (event) {
        var index = values.indexOf(Number(row.dataset.value));
        var next = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? index + 1 : event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? index - 1 : event.key === 'Home' ? 0 : event.key === 'End' ? values.length - 1 : -1;
        if (next < 0) return;
        event.preventDefault();
        next = Math.max(0, Math.min(values.length - 1, next));
        choosePickerValue(unit, values[next], rows.querySelector('[data-value="' + values[next] + '"]'));
        rows.querySelector('[data-value="' + values[next] + '"]').focus();
      });
    });
    select.innerHTML = values.map(function (value) { return '<option value="' + value + '">' + escapeHtml(displayValue(unit, value)) + '</option>'; }).join('');
    select.value = String(selected);
    select.onchange = function () { choosePickerValue(unit, select.value, null); };
    if (root.closest('.picker-backdrop') && !REDUCED) {
      var selectedRow = rows.querySelector('.is-selected');
      if (selectedRow) selectedRow.scrollIntoView({ block: 'center', behavior: 'auto' });
    }
  }
  function renderAllPickerColumns(mode) {
    (mode === 'date' ? ['month', 'day', 'year'] : ['hour', 'minute']).forEach(function (unit) { renderPickerColumn(mode, unit); });
    updatePickerSummary(mode);
  }
  function updatePickerSummary(mode) {
    if (mode === 'date') text('date-summary', 'SELECTED\n' + dateLabel(pickerCandidate));
    else text('time-summary', 'SELECTED\n' + String(pickerCandidate.hour).padStart(2, '0') + ':' + String(pickerCandidate.minute).padStart(2, '0') + ' · exact');
    var summary = document.getElementById(mode + '-summary');
    if (summary) {
      summary.innerHTML = '<span class="summary-label">SELECTED</span><strong>' + escapeHtml(mode === 'date' ? dateLabel(pickerCandidate) : String(pickerCandidate.hour).padStart(2, '0') + ':' + String(pickerCandidate.minute).padStart(2, '0') + ' · exact') + '</strong>';
    }
  }
  function openPicker(mode) {
    pickerFocus = document.activeElement;
    if (mode === 'date') {
      var parts = selectedDateParts() || { month: 1, day: 1, year: new Date().getFullYear() };
      pickerCandidate.month = parts.month; pickerCandidate.day = parts.day; pickerCandidate.year = parts.year;
    } else { pickerCandidate.hour = state.hour; pickerCandidate.minute = state.minute; }
    var backdrop = mode === 'date' ? datePicker : timePicker;
    renderAllPickerColumns(mode);
    backdrop.hidden = false;
    document.body.classList.add('picker-open');
    var first = backdrop.querySelector('.picker-row.is-selected, .picker-select');
    if (first) window.setTimeout(function () { first.focus(); }, 0);
  }
  function closePicker(mode, commit) {
    var backdrop = mode === 'date' ? datePicker : timePicker;
    if (commit && mode === 'date') {
      state.date = String(pickerCandidate.year).padStart(4, '0') + '-' + String(pickerCandidate.month).padStart(2, '0') + '-' + String(pickerCandidate.day).padStart(2, '0');
      text('date-label', dateLabel(pickerCandidate));
      setDateError(false);
    }
    if (commit && mode === 'time') {
      state.hour = pickerCandidate.hour; state.minute = pickerCandidate.minute; state.accuracy = 'exact';
      text('time-label', String(state.hour).padStart(2, '0') + ':' + String(state.minute).padStart(2, '0') + ' · exact');
      document.getElementById('time-skip').setAttribute('aria-pressed', 'false');
    }
    backdrop.hidden = true;
    document.body.classList.remove('picker-open');
    if (pickerFocus && pickerFocus.focus) pickerFocus.focus();
    pickerFocus = null;
    save();
  }
  function cancelPicker(mode) { closePicker(mode, false); }
  document.getElementById('date-trigger').addEventListener('click', function () { openPicker('date'); });
  document.getElementById('time-trigger').addEventListener('click', function () { openPicker('time'); });
  document.getElementById('date-use').addEventListener('click', function () { closePicker('date', true); });
  document.getElementById('time-use').addEventListener('click', function () { closePicker('time', true); });
  document.querySelectorAll('[data-picker-cancel]').forEach(function (button) { button.addEventListener('click', function () { cancelPicker(button.dataset.pickerCancel); }); });
  [datePicker, timePicker].forEach(function (backdrop) {
    backdrop.addEventListener('click', function (event) { if (event.target === backdrop) cancelPicker(backdrop.id === 'date-picker' ? 'date' : 'time'); });
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') { if (!datePicker.hidden) cancelPicker('date'); else if (!timePicker.hidden) cancelPicker('time'); }
  });
  document.getElementById('time-skip').addEventListener('click', function () {
    state.hour = 12; state.minute = 0; state.accuracy = 'unknown';
    this.setAttribute('aria-pressed', 'true'); text('time-label', 'not sure · use noon'); save();
  });
  if (state.date) text('date-label', dateLabel(selectedDateParts()));
  if (state.accuracy === 'exact') {
    text('time-label', String(state.hour).padStart(2, '0') + ':' + String(state.minute).padStart(2, '0') + ' · exact');
    document.getElementById('time-skip').setAttribute('aria-pressed', 'false');
  }

  /* ── Place search: 400ms debounce and tap-to-lock-only semantics ──────────── */
  var placeInput = document.getElementById('birth-place');
  var placeResults = document.getElementById('place-results');
  var placeTimer = null, nudgeTimer = null, placeRequest = 0;
  function placeName(place) { return [place.name, place.country].filter(Boolean).join(', '); }
  function clearPlaces() {
    placeResults.innerHTML = ''; placeInput.setAttribute('aria-expanded', 'false');
  }
  placeInput.addEventListener('input', function () {
    state.place = null; setPlaceError(false); clearPlaces(); clearMessage('details-error');
    window.clearTimeout(placeTimer); window.clearTimeout(nudgeTimer);
    var query = placeInput.value.trim();
    if (query.length < 2) { save(); return; }
    nudgeTimer = window.setTimeout(function () {
      if (placeResults.children.length && !state.place) {
        setPlaceError(true);
        placeError.textContent = '☝️ tap ur city below to lock it in';
      }
    }, 1500);
    var requestNumber = ++placeRequest;
    placeTimer = window.setTimeout(function () {
      placeResults.innerHTML = '<p class="suggestions-loading">searching the map…</p>';
      placeInput.setAttribute('aria-expanded', 'true');
      request('/geocoding/search?q=' + encodeURIComponent(query) + '&limit=5', { authToken: '' }).then(function (data) {
        if (requestNumber !== placeRequest) return;
        clearPlaces();
        (data.results || []).slice(0, 5).forEach(function (place, index) {
          var button = document.createElement('button');
          button.type = 'button'; button.role = 'option'; button.setAttribute('aria-selected', 'false'); button.dataset.index = index;
          var name = document.createElement('span'); name.className = 's-name'; name.textContent = place.name || place.display_name || 'unknown city';
          var detail = document.createElement('span'); detail.className = 's-detail'; detail.textContent = [place.admin1 || place.state, place.country].filter(Boolean).join(', ');
          button.appendChild(name); button.appendChild(detail);
          button.addEventListener('click', function () {
            clearPlaces(); setPlaceError(false);
            var old = button.innerHTML; button.innerHTML = '<span class="suggestion-spinner">pinning this city…</span>'; button.disabled = true;
            request('/geocoding/geocode', { method: 'POST', authToken: '', body: JSON.stringify(place) }).then(function (full) {
              state.place = full; placeInput.value = placeName(full); setPlaceError(false); save();
            }).catch(function () { button.innerHTML = old; button.disabled = false; text('details-error', '⚠  couldn’t pin that city. try another result.'); });
          });
          placeResults.appendChild(button);
        });
        if (!placeResults.children.length) { setPlaceError(true); placeError.textContent = '⚠  no city found. try a nearby one.'; }
      }).catch(function () { if (requestNumber === placeRequest) { clearPlaces(); text('details-error', '⚠  city search is unavailable right now.'); } });
    }, 400);
  });

  /* ── Anonymous chart + partial reading ───────────────────────────────────── */
  function chartPayload() {
    return {
      name: document.getElementById('name').value.trim(),
      date: state.date,
      hour: state.accuracy === 'unknown' ? 12 : state.hour,
      minute: state.accuracy === 'unknown' ? 0 : state.minute,
      accuracy: state.accuracy,
      lat: state.place.latitude,
      lon: state.place.longitude,
      timezone: state.place.timezone,
      placeName: placeName(state.place),
    };
  }
  function loadPartial() {
    show('loader'); startLoader('partial');
    var chartPath = '/web/charts/' + encodeURIComponent(state.chartId) + '/structured';
    return Promise.all([
      request('/web/charts/' + encodeURIComponent(state.chartId) + '/partial'),
      request(chartPath).catch(function () { return null; }),
    ]).then(function (results) {
      var partial = results[0];
      if (results[1]) partial.chart = results[1];
      partialReading = partial;
      renderPartial(partial); show('partial');
    }).catch(function (error) {
      show('details'); text('details-error', '⚠  ' + error.message); throw error;
    });
  }
  var nameInput = document.getElementById('name');
  var nameError = document.getElementById('name-error');
  var dateTrigger = document.getElementById('date-trigger');
  var dateError = document.getElementById('date-error');
  var placeError = document.getElementById('place-error');
  function setNameError(on) {
    nameError.hidden = !on;
    nameInput.closest('.field').classList.toggle('has-error', on);
  }
  function setDateError(on) {
    dateError.hidden = !on;
    dateTrigger.classList.toggle('has-error', on);
  }
  function setPlaceError(on) {
    placeError.hidden = !on;
    placeInput.closest('.field').classList.toggle('has-error', on);
    placeError.textContent = placeInput.value.trim()
      ? '☝️ tap ur city below to lock it in'
      : '✋ still need ur city of birth';
  }
  nameInput.addEventListener('input', function () {
    if (nameInput.value.trim()) setNameError(false);
  });
  document.getElementById('details-form').addEventListener('submit', function (event) {
    event.preventDefault();
    var name = nameInput.value.trim();
    var needsName = !name;
    var needsDate = !state.date;
    var needsPlace = !state.place;
    var missing = [needsDate && 'ur birthday', needsPlace && 'ur city of birth (tap it in the list)'].filter(Boolean);
    setNameError(needsName);
    setDateError(needsDate);
    setPlaceError(needsPlace);
    if (needsName || needsDate || needsPlace) {
      clearMessage('details-error');
      if (needsName) nameInput.focus();
      else if (needsDate) dateTrigger.focus();
      else if (needsPlace) placeInput.focus();
      return;
    }
    clearMessage('details-error');
    var button = document.getElementById('details-submit'); setBusy(button, true, 'OPEN MY FREE READING →');
    state.name = name; var payload = chartPayload();
    request('/web/charts', { method: 'POST', authToken: '', body: JSON.stringify(payload) }).then(function (chart) {
      state.chartId = chart.chartId || chart.chart_id || chart.id;
      state.token = chart.sessionToken || chart.session_token || chart.token;
      if (!state.chartId || !state.token) throw new Error('the web session could not be opened. try again.');
      save(); return loadPartial();
    }).catch(function (error) { text('details-error', '⚠  ' + error.message); }).finally(function () { setBusy(button, false, 'OPEN MY FREE READING →'); });
  });

  /* ── Partial render ───────────────────────────────────────────────────────── */
  function renderRoughNotes(data) {
    var root = document.getElementById('rough-notes');
    var rough = data.rough_notes || data.roughNotes || data.rough || {};
    var summary = typeof rough === 'string' ? rough : rough.summary || rough.preamble || '';
    var paragraphs = Array.isArray(rough.paragraphs) ? rough.paragraphs : [];
    var observations = Array.isArray(rough.observations) ? rough.observations : Array.isArray(rough.notes) ? rough.notes : [];
    if (!paragraphs.length && observations.length) paragraphs = [observations.slice(0, 6).join(' ')];
    root.innerHTML = (summary ? '<p class="rough-summary">' + renderRich(summary) + '</p>' : '') + (paragraphs.length ? paragraphs.slice(0, 3).map(function (item) { return '<p>' + renderRich(item) + '</p>'; }).join('') : '<p>ur chart is ready. tota is keeping the first notes rough until the full issue opens.</p>');
  }
  function renderPreviewFacet(root, facet) {
    facet = facet || {};
    var story = Array.isArray(facet.story) ? facet.story : facet.story ? [facet.story] : [];
    var receipt = facet.why || facet.receipt || '';
    var strengthValue = Number(facet.strength);
    var strength = Number.isFinite(strengthValue) && strengthValue > 0 ? Math.max(0, Math.min(4, strengthValue)) : 2;
    var words = [facet.takeaway || ''].concat(story).join(' ').split(/\s+/).filter(Boolean).length;
    var caption = facet.caption || 'the first desk is already filing.';
    var captionNode = document.getElementById('career-preview-caption');
    var timeNode = document.getElementById('career-preview-time');
    var split = splitHeadline(facet.headline || 'the work story is taking shape');
    if (captionNode) captionNode.textContent = caption;
    if (timeNode) timeNode.textContent = Math.max(1, Math.round(words / 180)) + ' min read';
    root.innerHTML = '<h3 class="desk-headline">' + (split.lead ? escapeHtml(split.lead) + ' ' : '') + '<mark> ' + escapeHtml(split.highlight) + ' </mark></h3>' +
      '<div class="byline"><span>🦜</span><span class="who">filed by tota</span><span class="meta">the life edition</span></div>' +
      '<p class="preview-takeaway">' + renderRich(facet.takeaway || story[0] || '') + '</p>' +
      '<div class="strength-dots" aria-label="strength ' + strength + ' of 4">' + [0, 1, 2, 3].map(function (i) { return '<i class="' + (i < strength ? 'is-on' : '') + '"></i>'; }).join('') + '</div>' +
      story.slice(0, 2).map(function (para) { return '<p>' + renderRich(para) + '</p>'; }).join('') +
      (receipt ? '<div class="receipt-box"><span>THE RECEIPT</span><p>' + renderRich(receipt) + '</p></div>' : '');
  }
  function renderPartial(partial) {
    text('partial-name', state.name ? state.name + '' : '');
    renderRoughNotes(partial);
    renderReaderFile(partial, 'preview-reading');
    renderPreviewFacet(document.getElementById('career-preview'), partial.career || partial.career_preview || {});
    var list = document.getElementById('desk-preview-list');
    list.innerHTML = DESKS.map(function (desk, index) { return '<span class="desk-preview desk-tone-' + desk.tone + '"><b>' + String(index + 1).padStart(2, '0') + '</b>' + escapeHtml(desk.name) + '</span>'; }).join('');
  }

  /* ── Payment gate: screen 1 (phone) → screen 2 (OTP) → Razorpay ─────────── */
  var OTP_LENGTH = 6;
  var resendCooldown = 0;
  var resendTimer = null;

  var otpCells = Array.prototype.slice.call(document.querySelectorAll('.otp-cell'));
  var otpPhoneDisplay = document.getElementById('otp-phone-display');
  var otpStatus = document.getElementById('otp-status');
  var otpResend = document.getElementById('whatsapp-otp-resend');
  var otpVerify = document.getElementById('whatsapp-otp-verify');
  var whatsappInput = document.getElementById('whatsapp');
  var paymentRetry = document.getElementById('payment-retry');
  var activePaymentOrder = null;
  var lastPaymentResponse = null;

  function mmss(total) {
    return Math.floor(total / 60) + ':' + String(total % 60).padStart(2, '0');
  }
  function normalizeContact(type, value) {
    value = String(value || '').trim();
    var phone = value.replace(/\D/g, '');
    if (phone.indexOf('91') === 0 && phone.length === 12) phone = phone.slice(2);
    if (!/^[6-9]\d{9}$/.test(phone)) throw new Error('enter a valid 10-digit WhatsApp number.');
    return '+91' + phone;
  }
  function formatNational(value) {
    return String(value || '').replace(/(\d{5})(?=\d)/g, '$1 ').trim();
  }
  function otpCode() {
    return otpCells.map(function (cell) { return cell.value; }).join('');
  }
  function setOtpCode(value) {
    var digits = String(value || '').replace(/\D/g, '').slice(0, OTP_LENGTH);
    otpCells.forEach(function (cell, index) {
      cell.value = digits[index] || '';
      cell.classList.toggle('is-filled', Boolean(digits[index]));
    });
    otpVerify.disabled = digits.length !== OTP_LENGTH;
    return digits;
  }
  function setOtpError(message) {
    text('otp-status', message || '');
    document.querySelector('.otp-cells').classList.toggle('has-error', Boolean(message));
    otpStatus.classList.remove('is-success');
  }
  function otpErrorMessage(error) {
    var attempts = error && error.attemptsRemaining;
    if (error && /invalid_(?:code|otp)/.test(error.code || '') && attempts !== undefined && attempts !== null) {
      var count = Number(attempts);
      return 'That code is incorrect. ' + count + ' ' + (count === 1 ? 'attempt' : 'attempts') + ' left.';
    }
    return error && error.message ? error.message : 'that code did not work. try again.';
  }
  function focusCell(index) {
    var clamped = Math.max(0, Math.min(index, OTP_LENGTH - 1));
    otpCells[clamped].focus();
  }
  function startResendCooldown(seconds) {
    window.clearInterval(resendTimer);
    resendCooldown = Math.max(0, seconds || 30);
    otpResend.disabled = resendCooldown > 0;
    if (resendCooldown > 0) {
      otpResend.textContent = 'resend in ' + mmss(resendCooldown);
      resendTimer = window.setInterval(function () {
        resendCooldown -= 1;
        if (resendCooldown <= 0) {
          window.clearInterval(resendTimer);
          resendTimer = null;
          otpResend.disabled = false;
          otpResend.textContent = 'resend now';
        } else {
          otpResend.textContent = 'resend in ' + mmss(resendCooldown);
        }
      }, 1000);
    } else {
      otpResend.textContent = 'resend now';
    }
  }

  document.getElementById('unlock-button').addEventListener('click', function () { show('payment'); whatsappInput.focus(); });

  whatsappInput.addEventListener('input', function () {
    var digits = this.value.replace(/\D/g, '');
    if (digits.indexOf('91') === 0 && digits.length === 12) digits = digits.slice(2);
    digits = digits.slice(0, 10);
    this.value = formatNational(digits);
    clearMessage('contact-error');
  });

  document.getElementById('contact-form').addEventListener('submit', function (event) {
    event.preventDefault();
    clearMessage('contact-error');
    var button = document.getElementById('contact-submit');
    var phone;
    try { phone = normalizeContact('whatsapp', whatsappInput.value); } catch (error) {
      text('contact-error', '✋  ' + error.message);
      return;
    }
    webContactProof = '';
    verifiedContactPhone = '';
    activePaymentOrder = null;
    lastPaymentResponse = null;
    if (paymentRetry) { paymentRetry.hidden = true; paymentRetry.disabled = false; }
    state.contactValue = phone; save();
    setBusy(button, true, '✆  send my code →');
    request('/web/charts/' + encodeURIComponent(state.chartId) + '/contact/otp/start', {
      method: 'POST', body: JSON.stringify({ phone: phone }),
    }).then(function (result) {
      otpPhoneDisplay.textContent = '+91 ' + formatNational(phone.slice(3));
      setOtpCode('');
      setOtpError('');
      text('otp-status', result.devCode ? 'local dev code: ' + result.devCode : '');
      if (result.devCode) otpStatus.classList.remove('is-success');
      show('otp');
      startResendCooldown(result.resendIn || 30);
      focusCell(0);
    }).catch(function (error) {
      // A throttle still means the code is on its way — advance with the remaining wait.
      if (error.code === 'resend_too_soon') {
        otpPhoneDisplay.textContent = '+91 ' + formatNational(phone.slice(3));
        setOtpCode('');
        setOtpError('');
        show('otp');
        startResendCooldown(error.retryAfter || 30);
        focusCell(0);
        return;
      }
      text('contact-error', '⚠  ' + (error.message || 'we could not send a code yet. try again.'));
    }).finally(function () {
      setBusy(button, false, '✆  send my code →');
    });
  });

  otpCells.forEach(function (cell, index) {
    cell.addEventListener('input', function () {
      var digit = this.value.replace(/\D/g, '').slice(-1);
      this.value = digit;
      this.classList.toggle('is-filled', Boolean(digit));
      setOtpError('');
      if (digit && index < OTP_LENGTH - 1) focusCell(index + 1);
      var code = otpCode();
      otpVerify.disabled = code.length !== OTP_LENGTH;
      if (code.length === OTP_LENGTH) verifyWebContactOtp(code);
    });
    cell.addEventListener('keydown', function (event) {
      if (event.key === 'Backspace' && !this.value && index > 0) {
        event.preventDefault();
        focusCell(index - 1);
        otpCells[index - 1].value = '';
        otpCells[index - 1].classList.remove('is-filled');
        otpVerify.disabled = true;
      }
    });
    cell.addEventListener('paste', function (event) {
      event.preventDefault();
      var pasted = (event.clipboardData || window.clipboardData).getData('text');
      var digits = setOtpCode(pasted);
      setOtpError('');
      if (digits.length === OTP_LENGTH) verifyWebContactOtp(digits);
      else focusCell(digits.length);
    });
    cell.addEventListener('focus', function () { this.select(); });
  });

  var verifying = false;
  function verifyWebContactOtp(code) {
    if (verifying || code.length !== OTP_LENGTH) return;
    verifying = true;
    var phone = state.contactValue;
    if (!phone) { verifying = false; setOtpError('go back and enter ur number first.'); return; }
    otpVerify.disabled = true;
    otpVerify.textContent = 'checking…';
    setOtpError('');
    request('/web/charts/' + encodeURIComponent(state.chartId) + '/contact/otp/verify', {
      method: 'POST', body: JSON.stringify({ phone: phone, code: code }),
    }).then(function (result) {
      webContactProof = result.contactProof || result.contact_proof || '';
      if (!webContactProof) throw new Error('the number was verified, but checkout could not be opened. try again.');
      verifiedContactPhone = phone;
      save();
      otpStatus.textContent = '✓ number verified — opening checkout…';
      otpStatus.classList.add('is-success');
      otpCells.forEach(function (cell) { cell.disabled = true; });
      window.setTimeout(openCheckout, 450);
    }).catch(function (error) {
      verifying = false;
      var dead = error.code === 'code_expired' || error.code === 'no_pending_code' || error.code === 'too_many_attempts';
      if (dead) startResendCooldown(0);
      setOtpError(otpErrorMessage(error));
      setOtpCode('');
      otpCells.forEach(function (cell) { cell.disabled = false; });
      otpVerify.disabled = true;
      otpVerify.textContent = 'confirm & continue →';
      focusCell(0);
    });
  }

  document.getElementById('otp-form').addEventListener('submit', function (event) {
    event.preventDefault();
    verifyWebContactOtp(otpCode());
  });

  otpResend.addEventListener('click', function () {
    if (resendCooldown > 0) return;
    var phone = state.contactValue;
    if (!phone) { show('payment'); return; }
    verifying = false;
    setOtpError('');
    setOtpCode('');
    otpCells.forEach(function (cell) { cell.disabled = false; });
    otpVerify.disabled = true;
    request('/web/charts/' + encodeURIComponent(state.chartId) + '/contact/otp/start', {
      method: 'POST', body: JSON.stringify({ phone: phone }),
    }).then(function (result) {
      if (result.devCode) { text('otp-status', 'local dev code: ' + result.devCode); otpStatus.classList.remove('is-success'); }
      startResendCooldown(result.resendIn || 30);
      focusCell(0);
    }).catch(function (error) {
      if (error.code === 'resend_too_soon' || error.code === 'too_many_sends') startResendCooldown(error.retryAfter || 30);
      setOtpError(error.message || 'could not resend yet. wait a beat.');
    });
  });

  function openCheckout() {
    clearMessage('contact-error');
    var button = document.getElementById('contact-submit');
    var contactBody = { chartId: state.chartId, contact: { type: 'whatsapp', value: verifiedContactPhone }, contactProof: webContactProof };
    setBusy(button, true, '✆  send my code →');
    request('/web/orders', { method: 'POST', body: JSON.stringify(contactBody) }).then(function (order) {
      state.orderId = order.order_id || order.orderId || order.id; save();
      if (!state.orderId) throw new Error('the payment order could not be opened.');
      if (order.mode === 'stub' || order.stub === true) {
        activePaymentOrder = null; lastPaymentResponse = null;
        if (paymentRetry) paymentRetry.hidden = true;
        return verifyOrder(state.orderId, { stub: true });
      }
      activePaymentOrder = order;
      lastPaymentResponse = null;
      if (paymentRetry) paymentRetry.hidden = true;
      return openRazorpay(order);
    }).catch(function (error) {
      showPaymentError(error.code === 'billing_unavailable' ? 'payments are opening shortly. ur contact was not charged.' : error.message, Boolean(activePaymentOrder && state.orderId));
    }).finally(function () { setBusy(button, false, '✆  send my code →'); });
  }
  function loadCheckoutScript() {
    return new Promise(function (resolve, reject) {
      if (window.Razorpay) return resolve();
      var script = document.createElement('script'); script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = resolve; script.onerror = function () { reject(new Error('checkout could not load. check ur connection.')); };
      document.head.appendChild(script);
    });
  }
  function verifyOrder(orderId, payload) {
    return request('/web/orders/' + encodeURIComponent(orderId) + '/verify', { method: 'POST', body: JSON.stringify(payload) }).then(function (result) {
      if (result.verified !== true) throw new Error('payment is still being verified. try again in a moment.');
      state.verified = true; save();
      return fetchEdition().then(function () { return downloadEditionPdf().catch(function () { return null; }); }).then(function () { startDeliveryPolling(); });
    });
  }
  function showPaymentError(message, canRetry) {
    show('payment');
    text('contact-error', '⚠  ' + (message || 'the payment could not be completed.'));
    if (paymentRetry) {
      paymentRetry.hidden = !canRetry;
      paymentRetry.disabled = false;
      paymentRetry.innerHTML = (lastPaymentResponse ? 'try payment verification again' : 'try payment again') + ' <span class="arrow">↻</span>';
    }
    if (!canRetry) { activePaymentOrder = null; lastPaymentResponse = null; }
  }
  function paymentFailureMessage(response) {
    var error = response && response.error;
    return error && (error.description || error.reason) ? error.description || error.reason : 'payment was not completed. your order is still here — try again.';
  }
  function openRazorpay(order) {
    return loadCheckoutScript().then(function () {
      var paymentHandled = false;
      function failPayment(message) {
        if (paymentHandled) return;
        paymentHandled = true;
        try { checkout.close(); } catch (error) { /* Razorpay may have closed itself already. */ }
        activePaymentOrder = order;
        lastPaymentResponse = null;
        showPaymentError(message, true);
      }
      var checkout = new window.Razorpay({
        key: order.key_id || order.keyId,
        order_id: order.order_id || order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: 'Ask Tota', description: 'The Life Edition',
        prefill: { contact: state.contactValue.replace(/\D/g, '') },
        theme: { color: '#178a4c' },
        handler: function (response) {
          if (paymentHandled) return;
          paymentHandled = true;
          try { checkout.close(); } catch (error) { /* Razorpay may have closed itself already. */ }
          lastPaymentResponse = response;
          if (paymentRetry) paymentRetry.hidden = true;
          verifyOrder(state.orderId, response).catch(function (error) {
            if (!state.verified) showPaymentError('we could not confirm that payment yet. your order is safe — try again.', true);
          });
        },
        modal: { ondismiss: function () { failPayment('checkout closed. your order is still here — try payment again.'); } },
      });
      if (checkout.on) checkout.on('payment.failed', function (response) { failPayment(paymentFailureMessage(response)); });
      checkout.open();
    });
  }
  paymentRetry.addEventListener('click', function () {
    var button = this;
    if (!state.orderId || (!activePaymentOrder && !lastPaymentResponse)) return;
    button.disabled = true;
    var retry = lastPaymentResponse
      ? verifyOrder(state.orderId, lastPaymentResponse).catch(function () {
        if (!state.verified) showPaymentError('we could not confirm that payment yet. your order is safe — try again.', true);
      })
      : openRazorpay(activePaymentOrder).catch(function (error) { showPaymentError(error.message || 'checkout could not load. try again.', true); });
    retry.finally(function () { if (!state.verified) button.disabled = false; });
  });
  var editionRequest = null;
  var pdfRequest = null;
  function fetchEdition() {
    if (!state.verified) return Promise.reject(new Error('payment verification is required before the edition can be opened.'));
    if (editionRequest) return editionRequest;
    clearLoaderError();
    show('loader'); startLoader('edition');
    var path = state.linked ? '/charts/' + encodeURIComponent(state.chartId) + '/edition' : '/web/charts/' + encodeURIComponent(state.chartId) + '/edition';
    editionRequest = requestWithTimeout(path, { authToken: state.linked ? state.accountToken : state.token }, EDITION_REQUEST_TIMEOUT_MS).then(function (reading) {
      stopLoader(); renderReading(reading); show('reading'); startDeliveryPolling(); return reading;
    }).catch(function (error) {
      stopLoader(); showLoaderError(error); throw error;
    }).finally(function () { editionRequest = null; });
    return editionRequest;
  }
  function downloadEditionPdf() {
    if (!state.verified) return Promise.reject(new Error('payment verification is required before the PDF can be opened.'));
    if (pdfRequest) return pdfRequest;
    var path = state.linked ? '/charts/' + encodeURIComponent(state.chartId) + '/edition.pdf' : '/web/charts/' + encodeURIComponent(state.chartId) + '/edition.pdf';
    var authToken = state.linked ? state.accountToken : state.token;
    pdfRequest = fetch(API + path, { headers: { Authorization: 'Bearer ' + authToken } }).then(function (response) {
      if (!response.ok) {
        return response.text().then(function (raw) {
          var body = {}; try { body = raw ? JSON.parse(raw) : {}; } catch (e) {}
          throw new Error(body.message || 'the PDF could not be prepared. try again in a moment.');
        });
      }
      return response.blob();
    }).then(function (blob) {
      var url = URL.createObjectURL(blob);
      var link = document.createElement('a'); link.href = url; link.download = 'ask-tota-life-edition.pdf';
      document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      text('pdf-note', 'your printable issue is downloading now.');
      return true;
    }).catch(function (error) {
      text('pdf-note', error.message || 'the PDF is taking a beat. try the download again.');
      throw error;
    }).finally(function () { pdfRequest = null; });
    return pdfRequest;
  }
  document.getElementById('download-pdf-button').addEventListener('click', function () {
    var button = this; setBusy(button, true, 'download my full PDF ↓');
    downloadEditionPdf().catch(function () {}).finally(function () { setBusy(button, false, 'download my full PDF ↓'); });
  });
  var deliveryPollTimer = null;
  var deliveryPollCount = 0;
  function deliveryPath() {
    return '/web/charts/' + encodeURIComponent(state.chartId) + '/orders/' + encodeURIComponent(state.orderId) + '/delivery';
  }
  function updateDeliveryStatus(result) {
    var note = document.getElementById('delivery-note');
    var retry = document.getElementById('delivery-retry-button');
    if (!note) return;
    note.classList.remove('is-success', 'is-error');
    if (result.status === 'not_applicable') { note.textContent = ''; if (retry) retry.hidden = true; return; }
    if (result.status === 'sent') {
      note.textContent = 'Your full PDF is on its way to WhatsApp.';
      note.classList.add('is-success');
      if (retry) retry.hidden = true;
      return;
    }
    if (result.status === 'failed') {
      note.textContent = result.message || 'The PDF could not be sent yet.';
      note.classList.add('is-error');
      if (retry) retry.hidden = false;
      return;
    }
    note.textContent = 'Tota is preparing your WhatsApp delivery…';
    if (retry) retry.hidden = true;
  }
  function startDeliveryPolling() {
    if (state.linked || !state.verified || !state.chartId || !state.orderId) return;
    window.clearTimeout(deliveryPollTimer);
    deliveryPollCount = 0;
    function poll() {
      deliveryPollCount += 1;
      request(deliveryPath()).then(function (result) {
        updateDeliveryStatus(result);
        if (result.status === 'preparing' && deliveryPollCount < 20) deliveryPollTimer = window.setTimeout(poll, 3000);
      }).catch(function () {
        if (deliveryPollCount < 5) deliveryPollTimer = window.setTimeout(poll, 4000);
      });
    }
    poll();
  }
  document.getElementById('delivery-retry-button').addEventListener('click', function () {
    var button = this;
    button.disabled = true;
    request(deliveryPath() + '/retry', { method: 'POST' }).then(function () {
      text('delivery-note', 'Tota is preparing the PDF again…');
      startDeliveryPolling();
    }).catch(function (error) {
      var note = document.getElementById('delivery-note');
      if (note) { note.textContent = error.message || 'The delivery could not be restarted.'; note.classList.add('is-error'); }
    }).finally(function () { button.disabled = false; });
  });


  /* ── Loader ───────────────────────────────────────────────────────────────── */
  var loaderTimer = null;
  var partialMessages = ['warming up the cosmic newsroom…', 'filing the rough notes…', 'asking the chart to show its work…', 'okay, almost there…'];
  var editionMessages = ['warming up the cosmic newsroom…', 'shuffling ten desk files…', 'asking mercury to behave for once…', 'printing the receipts…'];
  function stopLoader() {
    window.clearInterval(loaderTimer); loaderTimer = null;
    var screen = document.querySelector('[data-screen="loader"]');
    if (screen) screen.setAttribute('aria-busy', 'false');
  }
  function clearLoaderError() {
    var screen = document.querySelector('[data-screen="loader"]');
    var error = document.getElementById('loader-error');
    if (screen) screen.setAttribute('aria-busy', 'true');
    if (error) { error.hidden = true; error.textContent = ''; }
  }
  function showLoaderError(error) {
    var message = error && error.message ? error.message : 'the newsroom could not finish the file.';
    text('loader-copy', 'the file hit a snag.');
    text('loader-error', '⚠  ' + message);
    var errorNode = document.getElementById('loader-error');
    var screen = document.querySelector('[data-screen="loader"]');
    if (errorNode) errorNode.hidden = false;
    if (screen) screen.setAttribute('aria-busy', 'false');
  }
  function startLoader(mode) {
    var messages = mode === 'edition' ? editionMessages : partialMessages;
    var index = 0; clearLoaderError(); text('loader-copy', messages[0]); stopLoader();
    var screen = document.querySelector('[data-screen="loader"]');
    if (screen) screen.setAttribute('aria-busy', 'true');
    if (!REDUCED) loaderTimer = window.setInterval(function () { index = (index + 1) % messages.length; text('loader-copy', messages[index]); }, 2600);
  }
  /* ── Full edition renderer ────────────────────────────────────────────────── */
  function renderRich(value) {
    return escapeHtml(value).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/==([^=]+)==/g, '<mark>$1</mark>');
  }
  function metaFor(key) { return DESKS.filter(function (desk) { return desk.key === key; })[0] || { key: key, name: key || 'The Desk', tone: 'green', art: 'assets/tota/tota-news-vendor.png' }; }
  function splitHeadline(value) {
    var words = String(value || '').replace(/[.]+$/, '').trim().split(/\s+/).filter(Boolean);
    if (words.length <= 2) return { lead: '', highlight: words.join(' ') || 'the file is open' };
    return { lead: words.slice(0, -2).join(' '), highlight: words.slice(-2).join(' ') };
  }
  function formatBirthDate(value) {
    var parts = dateParts(value || '');
    return parts ? String(parts.day).padStart(2, '0') + ' ' + MONTHS[parts.month - 1] + ' ' + parts.year : '—';
  }
  function formatBirthTime(value, accuracy) {
    if (!value) return '—';
    return value + (accuracy === 'unknown' ? ' · noon' : accuracy === 'approximate' ? ' · approx' : ' · exact');
  }
  function renderReaderFile(reading, prefix) {
    prefix = prefix || 'reading';
    var birth = reading.birth || {};
    var place = birth.place || (state.place ? placeName(state.place) : '');
    var accuracy = birth.time_accuracy || state.accuracy;
    text(prefix + '-dob', formatBirthDate(birth.date || state.date));
    text(prefix + '-place', place || '—');
    text(prefix + '-time', formatBirthTime(birth.time || (String(state.hour).padStart(2, '0') + ':' + String(state.minute).padStart(2, '0')), accuracy));

    var root = document.getElementById(prefix + '-mini-chart');
    var chart = reading.chart;
    if (!root || !chart || !chart.houses) {
      if (root) root.innerHTML = '<p class="mini-chart-empty">the tiny chart is still being inked.</p>';
      return;
    }
    var lagna = Number(chart.lagna_sign_index);
    var houses = chart.houses || {};
    var cells = Object.keys(SOUTH_CELL).map(function (signIndex) {
      var position = SOUTH_CELL[signIndex];
      var houseNumber = ((Number(signIndex) - lagna + 12) % 12) + 1;
      var house = houses[houseNumber] || houses[String(houseNumber)] || {};
      var occupants = Array.isArray(house.occupants) ? house.occupants : [];
      var isLagna = Number(signIndex) === lagna;
      var planets = occupants.map(function (name) { return PLANET_ABBR[name] || String(name).slice(0, 2); }).join(' ');
      return '<div class="mini-chart-cell' + (isLagna ? ' is-lagna' : '') + '" style="grid-column:' + (position[1] + 1) + ';grid-row:' + (position[0] + 1) + '">' +
        '<span class="mini-sign">' + escapeHtml(RASHI_ABBR[Number(signIndex)] || '') + '</span>' +
        '<span class="mini-house">' + houseNumber + '</span>' +
        (planets ? '<span class="mini-planets">' + escapeHtml(planets) + '</span>' : '') +
        (isLagna ? '<span class="mini-lagna">ASC</span>' : '') +
        '</div>';
    }).join('');
    root.innerHTML = '<div class="mini-chart-center"><strong>RASHI</strong><span>D-1</span></div>' + cells;
  }
  function storyFor(facet) {
    if (Array.isArray(facet.story)) return facet.story.map(String).filter(Boolean);
    if (Array.isArray(facet.paragraphs)) return facet.paragraphs.map(String).filter(Boolean);
    if (facet.body) return [String(facet.body)];
    return facet.takeaway ? [String(facet.takeaway)] : [];
  }
  function receiptFor(facet) {
    if (typeof facet.receipt === 'string' && facet.receipt) return facet.receipt;
    if (typeof facet.why === 'string' && facet.why) return facet.why;
    if (Array.isArray(facet.receipts)) return facet.receipts.join(' · ');
    return '';
  }
  function renderReading(reading) {
    if (partialReading && partialReading.rough_notes && !reading.rough_notes) reading.rough_notes = partialReading.rough_notes;
    window.clearInterval(loaderTimer);
    text('reading-name', state.name || 'u');
    text('reading-name-hero', state.name || 'u');
    text('reading-essence', reading.essence || reading.synthesis || '');
    renderReaderFile(reading, 'reading');
    var facets = Array.isArray(reading.facets) ? reading.facets : Array.isArray(reading.desks) ? reading.desks : [];
    facets.sort(function (a, b) { return DESKS.map(function (desk) { return desk.key; }).indexOf(a.key) - DESKS.map(function (desk) { return desk.key; }).indexOf(b.key); });
    document.getElementById('reading-desks').innerHTML = facets.map(renderDesk).join('');
  }
  function renderDesk(facet) {
    var meta = metaFor(facet.key); var tone = meta.tone; var story = storyFor(facet); var split = splitHeadline(facet.headline || facet.title || meta.name); var receipt = receiptFor(facet); var evidence = Array.isArray(facet.evidence) ? facet.evidence : [];
    var strength = Math.max(0, Math.min(4, Number(facet.strength) || 0));
    var deskNumber = String(DESKS.map(function (desk) { return desk.key; }).indexOf(meta.key) + 1).padStart(2, '0');
    var art = meta.art || 'assets/tota/tota-news-vendor.png';
    var html = '<article class="desk-story desk-story-' + escapeHtml(meta.key) + '"><div class="desk-story-card"><div class="desk-story-copy">';
    html += '<figure class="desk-visual desk-tone-' + tone + '"><img src="' + escapeHtml(art) + '" alt="' + escapeHtml(meta.name + ' illustration') + '" loading="lazy"><span class="desk-number">' + deskNumber + '</span>' + (facet.caption ? '<figcaption>' + escapeHtml(facet.caption) + '</figcaption>' : '') + '</figure>';
    html += '<div class="desk-kicker-row"><span class="kicker-pill desk-name kicker-' + tone + '">' + escapeHtml(meta.name) + '</span><span class="read-time">' + Math.max(1, Math.round(story.join(' ').split(/\s+/).filter(Boolean).length / 180)) + ' min read</span></div>';
    html += '<h3 class="desk-headline">' + (split.lead ? escapeHtml(split.lead) + ' ' : '') + '<mark' + (tone === 'pink' ? ' class="mark-pink"' : '') + '> ' + escapeHtml(split.highlight) + ' </mark></h3>';
    html += '<div class="byline"><span>🦜</span><span class="who">filed by tota</span><span class="meta">the life edition</span></div>';
    if (facet.takeaway) html += '<p class="desk-takeaway">' + renderRich(facet.takeaway) + '</p>';
    html += '<div class="strength-dots" aria-label="strength ' + strength + ' of 4">' + [0, 1, 2, 3].map(function (i) { return '<i class="' + (i < strength ? 'is-on' : '') + '"></i>'; }).join('') + '</div>';
    story.forEach(function (para, index) {
      html += '<p class="para">' + renderRich(para) + '</p>';
      if (facet.quote && facet.quote.text && index === 0) html += '<blockquote class="quote-block"><p class="q">&quot;' + escapeHtml(facet.quote.text) + '&quot;</p><p class="src">— ' + escapeHtml(facet.quote.source || 'the planets') + ', allegedly</p></blockquote>';
    });
    if (receipt) html += '<div class="receipt-box full-receipt"><p class="receipt-label">THE RECEIPT</p><p>' + renderRich(receipt) + '</p></div>';
    if (evidence.length) html += '<div class="evidence-block"><div class="evidence-rule"></div><p class="evidence-title">what this is based on</p><div class="chip-row">' + evidence.map(function (item) { return '<span class="chip">' + escapeHtml(item) + '</span>'; }).join('') + '</div></div>';
    return html + '</div></div></article>';
  }

  document.querySelectorAll('[data-back]').forEach(function (button) { button.addEventListener('click', function () { show(button.dataset.back); }); });

  /* ── Restore after refresh ────────────────────────────────────────────────── */
  if (state.token && state.chartId) {
    if (state.verified && (!state.linked || state.accountToken)) fetchEdition().catch(function () { state.verified = false; save(); if (state.linked) show('details'); else loadPartial().catch(function () {}); });
    else loadPartial().catch(function () {});
  }
}());
