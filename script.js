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

(function masthead() {
  var line = document.getElementById('dateline');
  if (!line) return;

  var now = new Date();
  var day = now.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  var month = now.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();

  line.textContent = day + ', ' + month + ' ' + now.getDate() + ' \u00b7 FRESH TODAY';
})();

/* The zodiac wheels at the edges turn as you scroll. Paper does not move, but
   the sky does.

   Two mobile-specific details here. iOS Safari fires `scroll` sparsely during a
   momentum flick, so a plain scroll handler leaves the dials frozen mid-throw;
   we pump rAF for a moment after each event instead. And we set `transform`
   directly rather than feeding a custom property, because a custom-property
   write on a child of a `position: fixed` layer does not reliably repaint that
   composited layer on iOS. */
(function zodiacWheels() {
  var rings = document.querySelectorAll('.zodiac-ring');
  if (!rings.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var pumping = false;
  var quietFrames = 0;
  var last = null;

  function scrollTop() {
    if (typeof window.scrollY === 'number') return window.scrollY;
    return document.documentElement.scrollTop || document.body.scrollTop || 0;
  }

  function paint() {
    var turn = scrollTop() * 0.035;
    if (turn === last) return false;
    last = turn;
    rings[0].style.transform = 'rotate(' + turn + 'deg)';
    if (rings[1]) rings[1].style.transform = 'rotate(' + -turn + 'deg)';
    return true;
  }

  function pump() {
    /* keep going for ~20 idle frames past the last real change so a flick that
       coasts without firing scroll events still turns the dials */
    quietFrames = paint() ? 0 : quietFrames + 1;
    if (quietFrames > 20) {
      pumping = false;
      return;
    }
    window.requestAnimationFrame(pump);
  }

  function nudge() {
    quietFrames = 0;
    if (pumping) return;
    pumping = true;
    window.requestAnimationFrame(pump);
  }

  paint();
  window.addEventListener('scroll', nudge, { passive: true });
  window.addEventListener('touchmove', nudge, { passive: true });
  window.addEventListener('resize', nudge, { passive: true });
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
