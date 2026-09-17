/* Local-only real-API harness for the production Life Edition screens.
 *
 * Open:
 *   /life-edition-demo.html?isolate=partial&api=http://127.0.0.1:8000/v1
 *   /life-edition-demo.html?isolate=full&api=http://127.0.0.1:8001/v1
 *
 * This file is a no-op off localhost. It creates one real web chart with the fixed birth
 * details below, saves the real session token, and reloads the page so the demo renderer calls
 * the production partial or edition endpoints. Nothing is mocked here. Full mode still needs
 * the backend's local-only WEB_EDITION_DEV_UNLOCK=true flag (or an actual paid entitlement).
 */
(function () {
  'use strict';

  var localHost = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  var params = new URLSearchParams(location.search);
  var mode = params.get('isolate');
  if (!localHost || !['partial', 'full'].includes(mode)) return;

  // The approved visual treatment lives in life-edition-demo.html. Keep old isolation links
  // useful, but make them enter that exact page instead of rendering a second story shell.
  if (location.pathname.endsWith('/life-edition.html')) {
    var demoUrl = new URL('life-edition-demo.html', location.href);
    demoUrl.search = location.search;
    location.replace(demoUrl.toString());
    return;
  }

  var STORAGE_KEY = 'asktota_web_life_edition';
  var markerKey = 'asktota_life_isolation_' + mode;
  var ready = params.get('isolationReady') === '1';
  var api = (params.get('api') || window.ASKTOTA_API_URL || 'http://127.0.0.1:8000/v1').replace(/\/$/, '');
  var reader = {
    name: 'Ravi',
    date: '1999-01-29',
    hour: 6,
    minute: 0,
    accuracy: 'exact',
    place: {
      name: 'Kozhikode',
      country: 'India',
      latitude: 11.2588,
      longitude: 75.7804,
      timezone: 'Asia/Kolkata',
    },
  };

  window.ASKTOTA_API_URL = api;

  function noticeText(text) {
    var notice = document.querySelector('.isolation-notice');
    if (!notice) {
      notice = document.createElement('p');
      notice.className = 'flow-notice isolation-notice';
      var progress = document.querySelector('.flow-progress');
      var toolbar = document.querySelector('.demo-toolbar');
      if (progress) progress.after(notice);
      else if (toolbar) toolbar.after(notice);
      else document.body.prepend(notice);
    }
    notice.textContent = text;
    return notice;
  }

  function fixtureLabel() {
    return reader.date === '1999-01-29'
      ? '29 JAN 1999 · 06:00 · KOZHIKODE'
      : reader.date;
  }

  function readJson(key) {
    try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch (error) { return {}; }
  }

  function writeSession(chart, orderId) {
    var chartId = chart.chartId || chart.chart_id || chart.id;
    var token = chart.sessionToken || chart.session_token || chart.token;
    if (!chartId || !token) throw new Error('The backend did not return a web chart session.');
    var state = {
      token: token,
      chartId: chartId,
      name: reader.name,
      date: reader.date,
      hour: reader.hour,
      minute: reader.minute,
      accuracy: reader.accuracy,
      place: reader.place,
      contactValue: orderId ? 'reader@example.com' : '',
      orderId: orderId || '',
      verified: mode === 'full',
      linked: false,
      accountToken: '',
      isolationMode: mode,
      isolationDate: reader.date,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localStorage.setItem(markerKey, JSON.stringify({ chartId: chartId, token: token, date: reader.date }));
  }

  function apiRequest(path, options) {
    options = options || {};
    var headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    if (options.authToken) headers.Authorization = 'Bearer ' + options.authToken;
    var fetchOptions = Object.assign({}, options, { headers: headers });
    delete fetchOptions.authToken;
    return fetch(api + path, fetchOptions).then(function (response) {
      return response.text().then(function (raw) {
        var body = {};
        try { body = raw ? JSON.parse(raw) : {}; } catch (error) { body = { message: raw }; }
        if (!response.ok) throw new Error(body.message || ('Backend returned HTTP ' + response.status + '.'));
        return body;
      });
    });
  }

  function sameRealSession() {
    var state = readJson(STORAGE_KEY);
    var marker = readJson(markerKey);
    return ready && state.isolationMode === mode && state.isolationDate === reader.date &&
      marker.chartId === state.chartId && marker.token === state.token;
  }

  if (sameRealSession()) {
    noticeText('REAL API · ' + mode.toUpperCase() + ' STORY · ' + fixtureLabel() + ' · NO MOCK RESPONSES');
    return;
  }

  // Opening an isolation URL starts a fresh real session instead of reusing an older fixture or
  // normal-flow session in this browser. The request itself is the same public chart-creation API
  // used by the form; the form, OTP, checkout, and payment screens are simply not visited.
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(markerKey);
  } catch (error) {}

  var notice = noticeText('REAL API · ' + (mode === 'full' ? 'UNLOCKING FULL STORY · DEV STUB' : 'CREATING CHART') + ' · ' + fixtureLabel() + ' · ' + api);
  notice.setAttribute('aria-busy', 'true');
  document.querySelectorAll('[data-screen]').forEach(function (screen) { screen.hidden = true; });

  var chartPayload = {
    name: reader.name,
    date: reader.date,
    hour: reader.hour,
    minute: reader.minute,
    accuracy: reader.accuracy,
    lat: reader.place.latitude,
    lon: reader.place.longitude,
    timezone: reader.place.timezone,
    placeName: reader.place.name + ', ' + reader.place.country,
  };
  var preflight = mode === 'full'
    ? apiRequest('/web/isolation/status').then(function (status) {
      if (!status.enabled) throw new Error('Full isolation needs WEB_EDITION_DEV_UNLOCK=true on this local backend.');
    })
    : Promise.resolve();
  preflight.then(function () {
    return apiRequest('/web/charts', { method: 'POST', body: JSON.stringify(chartPayload) });
  }).then(function (chart) {
    if (mode !== 'full') {
      writeSession(chart);
      return;
    }
    var chartId = chart.chartId || chart.chart_id || chart.id;
    var token = chart.sessionToken || chart.session_token || chart.token;
    return apiRequest('/web/orders', {
      method: 'POST',
      authToken: token,
      body: JSON.stringify({ chartId: chartId, contact: { type: 'email', value: 'reader@example.com' } }),
    }).then(function (order) {
      return apiRequest('/web/orders/' + encodeURIComponent(order.order_id) + '/verify', {
        method: 'POST',
        authToken: token,
        body: JSON.stringify({ stub: true }),
      }).then(function () { writeSession(chart, order.order_id); });
    });
  }).then(function () {
    var next = new URL(location.href);
    next.searchParams.set('isolationReady', '1');
    location.replace(next.toString());
  }).catch(function (error) {
    notice.setAttribute('aria-busy', 'false');
    notice.setAttribute('role', 'alert');
    notice.textContent = 'REAL API ERROR · ' + (error.message || 'Could not create the chart.') + ' · API ' + api;
  });
}());
