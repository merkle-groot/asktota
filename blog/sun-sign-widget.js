(function () {
  const form = document.getElementById('sun-sign-form');
  const input = document.getElementById('birth-date');
  const result = document.getElementById('sun-sign-result');
  if (!form || !input || !result) return;

  const months = [
    { month: 1, day: 14, name: 'Makara', english: 'Capricorn' },
    { month: 2, day: 13, name: 'Kumbha', english: 'Aquarius' },
    { month: 3, day: 15, name: 'Meena', english: 'Pisces' },
    { month: 4, day: 14, name: 'Mesha', english: 'Aries' },
    { month: 5, day: 15, name: 'Vrishabha', english: 'Taurus' },
    { month: 6, day: 15, name: 'Mithuna', english: 'Gemini' },
    { month: 7, day: 16, name: 'Karka', english: 'Cancer' },
    { month: 8, day: 17, name: 'Simha', english: 'Leo' },
    { month: 9, day: 17, name: 'Kanya', english: 'Virgo' },
    { month: 10, day: 17, name: 'Tula', english: 'Libra' },
    { month: 11, day: 16, name: 'Vrishchika', english: 'Scorpio' },
    { month: 12, day: 16, name: 'Dhanu', english: 'Sagittarius' },
  ];

  function dateAt(year, entry) { return new Date(year, entry.month - 1, entry.day); }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    const [year, month, day] = input.value.split('-').map(Number);
    if (!year || !month || !day) return;
    const birth = new Date(year, month - 1, day);
    let entry = months[0];
    for (const candidate of months) if (birth >= dateAt(year, candidate)) entry = candidate;
    if (birth < dateAt(year, months[0])) entry = months[months.length - 1];

    const boundary = dateAt(year, entry);
    const daysFromBoundary = Math.abs(Math.round((birth - boundary) / 86400000));
    const uncertain = daysFromBoundary <= 2;
    result.hidden = false;
    result.innerHTML = uncertain
      ? `<p class="sun-result-label">YOU'RE NEAR A SANKRANTI</p><h3>probably ${entry.name} <span>(${entry.english})</span></h3><p>Your birth date is within two days of a sidereal sign boundary. Use your birth time and place for the exact answer.</p><a class="text-link" href="../index.html#download">Get the full chart with Ask Tota →</a>`
      : `<p class="sun-result-label">YOUR APPROXIMATE VEDIC SUN SIGN</p><h3>${entry.name} <span>(${entry.english})</span></h3><p>Based on the usual Lahiri sidereal solar-month dates. Your moon sign and lagna still need your birth time and place.</p>`;
  });
})();
