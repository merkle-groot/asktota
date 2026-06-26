// Live clock in the phone mockup status bar
(function () {
  const clock = document.getElementById('clock');
  if (!clock) return;
  function tick() {
    const now = new Date();
    let h = now.getHours();
    const m = String(now.getMinutes()).padStart(2, '0');
    h = h % 12 || 12;
    clock.textContent = `${h}:${m}`;
  }
  tick();
  setInterval(tick, 10000);
})();

// Reveal sections on scroll
(function () {
  const items = document.querySelectorAll('.feature-card, .step, .review, .download-inner');
  items.forEach((el) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(18px)';
    el.style.transition = 'opacity .5s ease, transform .5s ease';
  });
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        const el = e.target;
        const delay = (Array.from(el.parentNode.children).indexOf(el) % 3) * 80;
        setTimeout(() => {
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
        }, delay);
        io.unobserve(el);
      }
    });
  }, { threshold: 0.12 });
  items.forEach((el) => io.observe(el));
})();
