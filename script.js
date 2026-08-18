/* The Daily Tota — site behaviour.
   Everything here degrades to a working page if JS never runs. */

(function stickyNav() {
  var nav = document.querySelector('.nav');
  if (!nav) return;

  function sync() {
    nav.classList.toggle('is-stuck', window.scrollY > 8);
  }

  sync();
  window.addEventListener('scroll', sync, { passive: true });
})();

/* ---------------------------------------------------------------------------
   Where the moon actually is today.

   Meeus' abridged lunar series (Astronomical Algorithms, ch. 47) for the
   tropical longitude, minus the Lahiri ayanamsa, which is the same constant
   blog/astro-lib.js uses so the masthead and the calculators agree.
   Good to well under a tenth of a degree, which is far more than naming a
   sign needs.
   --------------------------------------------------------------------------- */
var RASHIS = ['mesha', 'vrishabha', 'mithuna', 'karka', 'simha', 'kanya',
              'tula', 'vrishchika', 'dhanu', 'makara', 'kumbha', 'meena'];

function moonRashi(date) {
  var RAD = Math.PI / 180;
  var jd = date.getTime() / 86400000 + 2440587.5;
  var T = (jd - 2451545) / 36525;

  function norm(d) { return ((d % 360) + 360) % 360; }
  function sin(d) { return Math.sin(d * RAD); }

  var L = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T;   // mean longitude
  var D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T * T;    // mean elongation
  var M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T * T;     // sun's mean anomaly
  var Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T;   // moon's mean anomaly
  var F = 93.2720950 + 483202.0175233 * T - 0.0036539 * T * T;     // argument of latitude

  var lon = L
    + 6.288774 * sin(Mp)
    + 1.274027 * sin(2 * D - Mp)
    + 0.658314 * sin(2 * D)
    + 0.213618 * sin(2 * Mp)
    - 0.185116 * sin(M)
    - 0.114332 * sin(2 * F)
    + 0.058793 * sin(2 * D - 2 * Mp)
    + 0.057066 * sin(2 * D - M - Mp)
    + 0.053322 * sin(2 * D + Mp)
    + 0.045758 * sin(2 * D - M)
    - 0.040923 * sin(M - Mp)
    - 0.034720 * sin(D)
    - 0.030383 * sin(M + Mp)
    + 0.015327 * sin(2 * D - 2 * F)
    - 0.012528 * sin(Mp + 2 * F)
    + 0.010980 * sin(Mp - 2 * F)
    + 0.010675 * sin(4 * D - Mp)
    + 0.010034 * sin(3 * Mp);

  var ayanamsa = 23.85 + ((jd - 2451545) / 365.25) * (50.2388475 / 3600);
  return RASHIS[Math.floor(norm(lon - ayanamsa) / 30) % 12];
}

(function masthead() {
  var line = document.getElementById('dateline');
  if (!line) return;

  var now = new Date();
  var day = now.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  var month = now.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();

  line.textContent = day + ', ' + month + ' ' + now.getDate() +
    ' \u00b7 MOON IN ' + moonRashi(now).toUpperCase();
})();

/* The zodiac wheels at the edges turn as you scroll. Paper does not move, but
   the sky does. */
(function zodiacWheels() {
  var rings = document.querySelectorAll('.zodiac-ring');
  if (!rings.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var queued = false;

  function spin() {
    queued = false;
    var turn = window.scrollY * 0.035;
    rings[0].style.setProperty('--spin', turn + 'deg');
    if (rings[1]) rings[1].style.setProperty('--spin', -turn + 'deg');
  }

  spin();
  window.addEventListener('scroll', function () {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(spin);
  }, { passive: true });
})();

/* No signup backend yet, so the form hands the address to the mail client
   with the subject already filled in. Honest about what it does. */
(function waitlist() {
  var form = document.getElementById('waitlist');
  if (!form) return;

  var input = form.querySelector('input[type="email"]');
  var note = document.getElementById('signup-note');
  var resting = note ? note.textContent : '';

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var value = input.value.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      setNote('that address is missing something. check it and try again.', 'is-err');
      input.focus();
      return;
    }

    var href =
      'mailto:hi@asktota.com' +
      '?subject=' + encodeURIComponent('ios waitlist') +
      '&body=' + encodeURIComponent('tell me when ask tota lands on ios: ' + value);

    window.location.href = href;
    setNote("ur mail app is opening. hit send and ur on the list.", 'is-ok');
    input.value = '';

    window.setTimeout(function () { setNote(resting, ''); }, 9000);
  });

  function setNote(text, state) {
    if (!note) return;
    note.textContent = text;
    note.className = 'fine signup-note ' + state;
  }
})();
