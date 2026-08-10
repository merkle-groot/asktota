(function () {
  const A = window.AstroLib;
  const form = document.getElementById('ashtakoota-form');
  const result = document.getElementById('ashtakoota-result');
  if (!A || !form || !result) return;

  const INDIA_UTC_OFFSET = 5.5;

  // --- Classical reference tables, cross-checked against multiple sources ---

  // Rashi index (0=Mesha..11=Meena) -> traditional (Parashari) ruling planet.
  const RASHI_LORD = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];

  const VARNA = ['Kshatriya', 'Vaishya', 'Shudra', 'Brahmin', 'Kshatriya', 'Vaishya', 'Shudra', 'Brahmin', 'Kshatriya', 'Vaishya', 'Shudra', 'Brahmin'];
  const VARNA_RANK = { Brahmin: 4, Kshatriya: 3, Vaishya: 2, Shudra: 1 };

  // Vashya groups per rashi. Dhanu and Makara are traditionally split by
  // half-sign; approximated here at the midpoint (15 degrees in).
  const VASHYA = ['Chatushpada', 'Chatushpada', 'Dwipada', 'Jalachara', 'Vanachara', 'Dwipada', 'Dwipada', 'Keeta', 'Dwipada', 'Jalachara', 'Dwipada', 'Jalachara'];
  const VASHYA_POINTS = {
    Chatushpada: { Chatushpada: 2, Jalachara: 0, Vanachara: 2, Keeta: 0, Dwipada: 0 },
    Jalachara: { Chatushpada: 1, Jalachara: 2, Vanachara: 0, Keeta: 1, Dwipada: 1 },
    Vanachara: { Chatushpada: 1, Jalachara: 0, Vanachara: 2, Keeta: 0, Dwipada: 0 },
    Keeta: { Chatushpada: 0, Jalachara: 1, Vanachara: 0, Keeta: 2, Dwipada: 1 },
    Dwipada: { Chatushpada: 1, Jalachara: 1, Vanachara: 1, Keeta: 0, Dwipada: 2 },
  };

  const TARA_MALEFIC_POSITIONS = [3, 5, 7]; // Vipat, Pratyari, Vadha

  // 27 nakshatras -> yoni animal (male/female pairing collapsed to the animal).
  const YONI = [
    'Horse', 'Elephant', 'Sheep', 'Snake', 'Snake', 'Dog', 'Cat', 'Sheep', 'Cat',
    'Rat', 'Rat', 'Cow', 'Buffalo', 'Tiger', 'Buffalo', 'Tiger', 'Deer', 'Deer',
    'Dog', 'Monkey', 'Mongoose', 'Monkey', 'Lion', 'Horse', 'Lion', 'Cow', 'Elephant',
  ];
  const YONI_ENEMIES = [
    ['Cow', 'Tiger'], ['Horse', 'Buffalo'], ['Elephant', 'Lion'], ['Dog', 'Deer'],
    ['Snake', 'Mongoose'], ['Cat', 'Rat'], ['Sheep', 'Monkey'],
  ];
  function yoniPoints(a, b) {
    if (a === b) return 4;
    const isEnemy = YONI_ENEMIES.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
    return isEnemy ? 0 : 2;
  }

  // Naisargika (natural) planetary friendship, standard Parashari table.
  const FRIENDS = {
    Sun: ['Moon', 'Mars', 'Jupiter'],
    Moon: ['Sun', 'Mercury'],
    Mars: ['Sun', 'Moon', 'Jupiter'],
    Mercury: ['Sun', 'Venus'],
    Jupiter: ['Sun', 'Moon', 'Mars'],
    Venus: ['Mercury', 'Saturn'],
    Saturn: ['Mercury', 'Venus'],
  };
  const ENEMIES = {
    Sun: ['Venus', 'Saturn'],
    Moon: ['Saturn'],
    Mars: ['Mercury'],
    Mercury: ['Moon'],
    Jupiter: ['Mercury', 'Venus'],
    Venus: ['Sun', 'Moon'],
    Saturn: ['Sun', 'Moon', 'Mars'],
  };
  function relation(from, to) {
    if (from === to) return 'friend';
    if (FRIENDS[from].includes(to)) return 'friend';
    if (ENEMIES[from].includes(to)) return 'enemy';
    return 'neutral';
  }
  // Combine both directions (A's lord toward B's lord, and vice versa) into 0-5.
  function grahaMaitriPoints(lordA, lordB) {
    const ab = relation(lordA, lordB);
    const ba = relation(lordB, lordA);
    const pair = [ab, ba].sort().join('-');
    const table = {
      'friend-friend': 5,
      'friend-neutral': 4,
      'neutral-neutral': 3,
      'enemy-friend': 1,
      'enemy-neutral': 0.5,
      'enemy-enemy': 0,
    };
    return table[pair];
  }

  const GANA = [
    'Deva', 'Manushya', 'Rakshasa', 'Manushya', 'Deva', 'Manushya', 'Deva', 'Deva', 'Rakshasa',
    'Rakshasa', 'Manushya', 'Manushya', 'Deva', 'Rakshasa', 'Deva', 'Rakshasa', 'Deva', 'Rakshasa',
    'Rakshasa', 'Manushya', 'Manushya', 'Deva', 'Rakshasa', 'Rakshasa', 'Manushya', 'Manushya', 'Deva',
  ];
  const GANA_POINTS = {
    Deva: { Deva: 6, Manushya: 5, Rakshasa: 1 },
    Manushya: { Deva: 5, Manushya: 6, Rakshasa: 0 },
    Rakshasa: { Deva: 1, Manushya: 0, Rakshasa: 6 },
  };

  const BHAKOOT_DOSHA_DISTANCES = [2, 12, 6, 8, 5, 9];

  const NADI = [
    'Aadi', 'Madhya', 'Antya', 'Antya', 'Madhya', 'Aadi', 'Aadi', 'Madhya', 'Antya',
    'Antya', 'Madhya', 'Aadi', 'Aadi', 'Madhya', 'Antya', 'Madhya', 'Aadi', 'Antya',
    'Aadi', 'Madhya', 'Antya', 'Antya', 'Madhya', 'Aadi', 'Aadi', 'Madhya', 'Antya',
  ];

  function computeMoonData({ year, month, day, hour, minute }) {
    const utHour = hour + minute / 60 - INDIA_UTC_OFFSET;
    const jd = A.julianDayUT(year, month, day, utHour);
    const T = (jd - A.J2000) / 36525;
    const ayanamsa = A.lahiriAyanamsa(jd);
    const moonSidereal = A.norm360(A.moonLongitude(T) - ayanamsa);
    const sign = A.signOf(moonSidereal, null);
    const nakshatra = A.nakshatraOf(moonSidereal);
    return { sign, nakshatra };
  }

  function ashtakoota(a, b) {
    const kootas = [];

    const varnaA = VARNA[a.sign.index];
    const varnaB = VARNA[b.sign.index];
    kootas.push({ name: 'Varna', max: 1, points: VARNA_RANK[varnaB] >= VARNA_RANK[varnaA] ? 1 : 0, detail: `${varnaA} / ${varnaB}` });

    const vashyaA = VASHYA[a.sign.index];
    const vashyaB = VASHYA[b.sign.index];
    kootas.push({ name: 'Vashya', max: 2, points: VASHYA_POINTS[vashyaA][vashyaB], detail: `${vashyaA} / ${vashyaB}` });

    const posAB = ((b.nakshatra.index - a.nakshatra.index + 27) % 27) + 1;
    const posBA = ((a.nakshatra.index - b.nakshatra.index + 27) % 27) + 1;
    const taraPos = (pos) => ((pos - 1) % 9) + 1;
    const isMalefic = (pos) => TARA_MALEFIC_POSITIONS.includes(taraPos(pos));
    const maleficAB = isMalefic(posAB);
    const maleficBA = isMalefic(posBA);
    const taraPoints = maleficAB && maleficBA ? 0 : !maleficAB && !maleficBA ? 3 : 1.5;
    kootas.push({ name: 'Tara', max: 3, points: taraPoints, detail: `positions ${taraPos(posAB)} / ${taraPos(posBA)}` });

    const yoniA = YONI[a.nakshatra.index];
    const yoniB = YONI[b.nakshatra.index];
    kootas.push({ name: 'Yoni', max: 4, points: yoniPoints(yoniA, yoniB), detail: `${yoniA} / ${yoniB}` });

    const lordA = RASHI_LORD[a.sign.index];
    const lordB = RASHI_LORD[b.sign.index];
    kootas.push({ name: 'Graha Maitri', max: 5, points: grahaMaitriPoints(lordA, lordB), detail: `${lordA} / ${lordB}` });

    const ganaA = GANA[a.nakshatra.index];
    const ganaB = GANA[b.nakshatra.index];
    kootas.push({ name: 'Gana', max: 6, points: GANA_POINTS[ganaA][ganaB], detail: `${ganaA} / ${ganaB}` });

    const rashiDist = ((b.sign.index - a.sign.index + 12) % 12) + 1;
    // BHAKOOT_DOSHA_DISTANCES already contains both members of each pair
    // (e.g. both 2 and 12), so checking rashiDist alone is complete —
    // also checking its complement would double-count and misfire on the
    // safe distances (1 and 7) whose complements (12 and 6) are dosha values.
    const bhakootDosha = BHAKOOT_DOSHA_DISTANCES.includes(rashiDist);
    kootas.push({ name: 'Bhakoot', max: 7, points: bhakootDosha ? 0 : 7, detail: bhakootDosha ? 'dosha pair' : 'clear' });

    const nadiA = NADI[a.nakshatra.index];
    const nadiB = NADI[b.nakshatra.index];
    kootas.push({ name: 'Nadi', max: 8, points: nadiA === nadiB ? 0 : 8, detail: `${nadiA} / ${nadiB}` });

    const total = kootas.reduce((sum, k) => sum + k.points, 0);
    return { kootas, total };
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    const nameA = (document.getElementById('ashtakoota-a-name').value || '').trim() || 'Person A';
    const nameB = (document.getElementById('ashtakoota-b-name').value || '').trim() || 'Person B';
    const dateA = document.getElementById('ashtakoota-a-date').value;
    const timeA = document.getElementById('ashtakoota-a-time').value;
    const dateB = document.getElementById('ashtakoota-b-date').value;
    const timeB = document.getElementById('ashtakoota-b-time').value;
    if (!dateA || !timeA || !dateB || !timeB) return;

    const [yA, mA, dA] = dateA.split('-').map(Number);
    const [hA, minA] = timeA.split(':').map(Number);
    const [yB, mB, dB] = dateB.split('-').map(Number);
    const [hB, minB] = timeB.split(':').map(Number);

    const moonA = computeMoonData({ year: yA, month: mA, day: dA, hour: hA, minute: minA });
    const moonB = computeMoonData({ year: yB, month: mB, day: dB, hour: hB, minute: minB });

    const { kootas, total } = ashtakoota(moonA, moonB);

    const rows = kootas
      .map(
        (k) =>
          `<tr><td data-label="Koota">${k.name}</td><td data-label="Score">${k.points} / ${k.max}</td><td data-label="Detail">${k.detail}</td></tr>`
      )
      .join('');

    result.hidden = false;
    result.innerHTML =
      `<div class="chart-result-card ashtakoota-total-card"><p class="chart-card-label">Total score</p><h3>${total} <span>out of 36</span></h3></div>` +
      `<div class="blog-table-wrap ashtakoota-table"><table><thead><tr><th>koota</th><th>score</th><th>detail</th></tr></thead><tbody>${rows}</tbody></table></div>` +
      `<p class="chart-finder-note">${nameA}'s moon is in ${moonA.sign.name} (${moonA.nakshatra.name}). ${nameB}'s moon is in ${moonB.sign.name} (${moonB.nakshatra.name}). this checks all 8 kootas from moon sign and nakshatra only — it's a quick check, not a full matching session.</p>` +
      '<a class="text-link" href="../index.html#download">Get the full chart with Ask Tota →</a>';
  });
})();
