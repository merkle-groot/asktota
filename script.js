(function () {
  const nav = document.querySelector('.site-nav');
  if (!nav) return;

  function syncNav() {
    nav.classList.toggle('is-scrolled', window.scrollY > 12);
  }

  syncNav();
  window.addEventListener('scroll', syncNav, { passive: true });
})();

(function () {
  const heroDate = document.getElementById('hero-date');
  if (!heroDate) return;

  const now = new Date();
  const weekday = now.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase();
  const month = now.toLocaleDateString(undefined, { month: 'long' }).toUpperCase();
  const day = now.getDate();

  heroDate.textContent = `${weekday}, ${month} ${day}`;
})();

(function () {
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      io.unobserve(entry.target);
    });
  }, { threshold: 0.14 });

  items.forEach((item) => io.observe(item));
})();
