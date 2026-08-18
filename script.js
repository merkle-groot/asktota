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

/* The masthead dates every issue by day of the year, same as the app.
   The wheels in the hero are authored in the HTML (houses and nakshatras)
   and deliberately left alone. */
(function masthead() {
  var line = document.getElementById('dateline');
  if (!line) return;

  var now = new Date();
  var start = new Date(now.getFullYear(), 0, 0);
  var edition = Math.floor((now - start) / 86400000);
  var day = now.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  var month = now.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();

  line.textContent =
    'VOL. YOU · NO. ' + edition + ' · ' + day + ', ' + month + ' ' + now.getDate();
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
