(function () {
  'use strict';

  // Hardcoded sample letters: no chart calculation or personal data service.
  var letters = [
    ['career', 'Let your judgement have a byline.',
      'Ravi, I’d begin with the part of work you keep doing even when nobody asks: noticing what could be better. A sentence that needs cutting, a meeting that needs a decision, a promising idea that everyone has made too complicated. That attention is a skill. My concern is how often you give it away as a helpful extra, then describe your contribution as simply getting things done.',
      'Imagine a project where you deliver exactly what the brief requests, but quietly know that the brief missed the point. You can finish it beautifully and still feel strangely absent from the result. I’d like you to notice that feeling before you accept the next assignment. Ask where you’ll have room to make a decision, and whether the person asking for your taste is willing to trust it.',
      'There’s no need to turn your working life upside down this week. Choose one piece of work you’d happily put your name beside and explain the thinking behind it. Let someone see how you arrived there, including the choice you rejected. I’m leaving a little space in this margin for the kind of recognition that comes when people finally understand what you do.',
      'Before the next yes, ask: which part of this will actually be mine?'],
    ['love', 'Leave a little room to be looked after.',
      'I’m pulling my chair closer for this one. You can enjoy the spark of a person who keeps you guessing, especially when a conversation leaves you feeling more awake than you did before it. But I’d ask you to pay equal attention to the ordinary afternoon afterwards. Can you say what you mean without first making it charming? Can a small disappointment stay small?',
      'Suppose you’re tired and someone asks where you’d like to eat. You say anywhere, then spend the evening wishing they had known what you needed. It’s such a small scene, but it holds a useful question: how much of being understood have you left to the other person’s imagination? I’d rather hear you make an imperfect request than watch you perfect the art of needing nothing.',
      'The relationship I’d make room for in these pages has humour in it, and enough steadiness for an awkward conversation. You don’t have to explain every feeling immediately. Try offering one honest sentence while it’s still small: I’d love you to plan this one. Then give the other person a chance to meet you there. I’ll be here, keeping your seat warm.',
      'Name one thing you’d enjoy receiving, without apologising for wanting it.'],
    ['money', 'Give your future self some breathing room.',
      'When I open your money chapter, I want to talk about choice before I talk about numbers. The freedom to leave a poor fit, take a little time over a decision, or say yes to something that matters to you: those are useful things to put a price beside. A bigger number means very little if every increase brings an equal increase in pressure.',
      'You might recognise the temptation to make a purchase stand for a fresh start. A beautiful notebook can make Monday feel possible; it can’t decide what belongs in your week. I’d keep the pleasure of the notebook and separate it from the promise. Before a purchase, give yourself enough time to say what you want it to change. Sometimes the answer is simply that you like it, which is an honest answer.',
      'For this chapter, I’m setting a blank page beside the reading. Write down what comes in, what already has a claim on it, and what you want more room for. Use your actual circumstances, rather than anyone else’s milestones. We’re looking for a clearer picture you can return to, especially on the days when comparing yourself to somebody else becomes an expensive hobby.',
      'Write a plain sentence about what “enough” would let you do.'],
    ['health', 'An unhurried hour belongs in your life.',
      'I’m closing the other files for a moment. It’s easy for a reading about your future to become another list of things to improve, and I don’t want to hand you homework for every corner of your life. This page is an invitation to notice the pace of an ordinary day. Where do you hurry even when nobody is waiting?',
      'Picture the space between finishing work and arriving home, even if that only means shutting a laptop at the kitchen table. If you fill that space immediately with messages and errands, the day never quite gets an ending. You could try giving it a small one: put your things away, step outside if you can, or sit somewhere that doesn’t face the screen. Choose whatever fits your body and your circumstances.',
      'I can offer a prompt for reflection here, but a chart can’t assess your health. Bring health concerns to someone qualified to help. My smaller invitation is to stop treating every quiet moment as spare capacity. Leave a little of it unclaimed, and see whether you enjoy having part of the evening that nobody, including me, has planned for you.',
      'Pick one ordinary pause you’d like to protect this week.'],
    ['home', 'Make somewhere you don’t have to perform.',
      'Ravi, I’d love to see the corner you choose when nobody is coming over. That’s where I’d start this chapter: with the version of home that belongs to you before it becomes a place to host, impress, or keep in perfect order. A room can look finished and still leave no space for the person living in it.',
      'Perhaps your life shares its walls with family, flatmates, or work. You may not get to rearrange everything, and I won’t pretend a new lamp solves a difficult living arrangement. But there may be a smaller territory you can claim. A shelf for what you’re reading. A chair that doesn’t collect unfinished tasks. A time in the evening when being available stops being the default.',
      'The same thought follows us into family. Caring about someone doesn’t make every expectation manageable. If there’s a conversation you’ve postponed, start with the arrangement you can actually sustain. I can call on Sunday is kinder than a promise made through gritted teeth. I’m marking this page with a little folded corner: belonging should leave room for your present life, as well as the person everyone remembers.',
      'Choose one small part of home that can reflect who you are now.'],
    ['mind', 'Give the unfinished thought a place to land.',
      'I suspect you’ll want to read this chapter twice, once quickly and once with a pen. There’s a kind of pleasure in following an idea until it connects to something unexpected. The difficulty comes when every thought asks to become a decision, and a quiet evening starts to feel like a meeting you forgot to end.',
      'Imagine writing down the question that keeps returning, then putting two headings beneath it: what I know, and what I’m guessing. A delayed reply belongs under the first heading. The entire story you’ve built around why it was delayed belongs under the second. You don’t have to scold yourself for the story. Just give it the right address on the page.',
      'I’d also save some room for curiosity that never earns its keep. Read about a subject you won’t use at work. Make something you don’t intend to share. You’re allowed to have an interest without immediately becoming good at it. If I could tuck one extra sheet into this envelope, it would be blank, with no instructions in the corner and no expectation that you show me what you made.',
      'Write down a recurring question. Separate the evidence from the story.'],
    ['timing', 'Let the next six months have a rhythm.',
      'I’m spreading the calendar across the table, but I’m leaving the dates in pencil. This sample reading offers a way to think about your next six months; it can’t promise when an opportunity or a person will arrive. What we can shape is how much you ask of yourself at once, and how you decide when an experiment deserves more time.',
      'In the first two months, give one idea a small public life. That might mean showing a piece of work to someone whose judgement you trust, or having a conversation you’ve kept rehearsing alone. Keep the attempt modest enough that you can learn from it without needing it to change everything. I’d rather have something real to discuss with you than a perfect plan still folded in the envelope.',
      'Use the middle stretch to notice what happens when you repeat the effort. By months five and six, look back at what you enjoyed doing as well as what attracted attention. If the evidence points somewhere different, you can change the plan. I’ll happily cross out a beautiful sentence when it stops telling the truth; you can do the same with an old ambition.',
      'Put a review date in the calendar, alongside the date you intend to begin.'],
    ['power', 'Your judgement can be warm and exact.',
      'There’s a moment I want you to imagine: someone brings you something unfinished and asks what you think. You notice the weak part immediately, but you also see what they were trying to make. Holding both in view is a valuable way to work with people. You can tell the truth without making someone regret showing you an early version.',
      'Sometimes that care makes you edit yourself too far. You soften a useful observation until it sounds optional, then feel frustrated when nobody acts on it. I’d like you to try keeping the substance of what you mean while making the delivery considerate. This section is confusing because the decision arrives too late gives someone much more to work with than maybe we could polish it a bit.',
      'You don’t have to become louder to practise this. Prepare the sentence you actually want to say before the meeting starts. Offer it while the decision is still open. Your contribution may be a precise question rather than a speech, and that can be enough to change what happens next. I’m putting a small star here for the confidence that grows through use, long before it feels natural.',
      'Bring one clear observation into a conversation where you usually hold back.'],
    ['patterns', 'Notice the yes before it leaves your mouth.',
      'We met this thread near the beginning, Ravi: when things get complicated, you become useful. I’ve kept it beside me through the other desks because it can show up almost anywhere. At work it looks like taking the loose end. At home it looks like remembering for everyone. In love it can look like guessing a need before anyone has to ask.',
      'None of those gestures is a mistake on its own. The question is whether you still feel able to choose them. Suppose somebody asks for help during an evening you had saved for yourself. Before you reply, pause long enough to notice the answer you wish you could give. You may still decide to help, but at least you’ll know what you’re offering.',
      'A different pattern can begin with an ordinary sentence: let me check and come back to you. No grand explanation required. If you decide to decline, you can be kind without building a courtroom case for your exhaustion. I’m not asking you to become less generous. I want your generosity to have your permission, especially when the people around you have grown comfortable assuming it.',
      'Try “let me check” once before automatically agreeing.'],
    ['moves', 'Take one page of this into your week.',
      'We’ve reached the last desk, and I’m gathering the loose pages back into your envelope. Please don’t turn all of them into assignments. A reading earns its place in your life when one observation helps you make a more considered choice. You can leave the rest here until you want to return.',
      'Of the next six months, we only have to decide what to do with a small piece of this week. My first suggestion is to make one piece of your work visible, with a sentence about why you made it that way. My second is to contact someone whose company makes it easier to speak honestly. There doesn’t have to be a useful reason for meeting.',
      'The third move is quieter: keep a little time that you promised yourself. Put it where you’ll see it, and decide what would make it worth protecting. If the week changes, move the appointment rather than treating it as the first thing to disappear. When you come back to this reading, I’d love you to ask which page stayed with you. That’s where we’ll begin our next conversation.',
      'Choose your first move. Write when you’ll do it, and keep the promise small.']
  ];

  letters.forEach(function (letter) {
    var desk = document.getElementById('desk-' + letter[0]);
    var copy = desk.querySelector('.desk-copy');
    var original = copy.querySelector('.reading-copy');
    original.remove();
    var byline = document.createElement('p');
    byline.className = 'narrator-byline';
    byline.textContent = 'A personal letter from Tota · ' + Math.ceil(letter.slice(2, 5).join(' ').split(/\s+/).length / 180) + ' min';
    copy.querySelector('h3').after(byline);
    letter.slice(2, 5).forEach(function (paragraph) {
      var p = document.createElement('p');
      p.className = 'reading-copy';
      p.textContent = paragraph;
      copy.insertBefore(p, copy.querySelector('.desk-foot'));
    });
    var note = document.createElement('aside');
    note.className = 'tota-margin';
    var avatar = document.createElement('img');
    avatar.src = 'assets/tota/tota-editor-note.png';
    avatar.alt = 'Tota';
    avatar.loading = 'lazy';
    var quote = document.createElement('blockquote');
    quote.textContent = letter[1];
    var sign = document.createElement('span');
    sign.className = 'tota-sign';
    sign.textContent = 'A new note from the editor';
    note.append(avatar, quote, sign);
    copy.append(note);
    var foot = copy.querySelector('.desk-foot');
    foot.className = 'desk-foot reflection';
    foot.textContent = 'Take this with you / ' + letter[5];
  });

  document.querySelectorAll('[data-reading-view]').forEach(function (view) {
    var section = document.createElement('section');
    section.className = 'life-three';
    section.setAttribute('aria-label', 'Top 3 things in your life');
    section.innerHTML = '<div class="three-issue"><span class="mono">01 / OPENING NOTES</span><span>THE LIFE EDITION · RAVI</span></div><div class="three-intro"><img src="assets/tota/tota-three-notes-trio.png" alt="Tota presenting three blank notes for your opening reading" loading="lazy"><div class="three-intro-copy"><p class="section-kicker mono">RAVI, BEFORE WE BEGIN</p><h2>Top 3 things<br>in your life.</h2><p>Before we open the desks, Tota is keeping three threads in view: the choices, people, and possibility already shaping your next page.</p><span class="tota-sign">Notes from the editor <i aria-hidden="true">↗</i></span></div></div><div class="three-list-head"><span class="mono">THE THREADS I’D KEEP BESIDE US</span><span class="mono">01—03 · CONTINUE BELOW</span></div><ol class="three-list"><li><span>01 / YOUR VOICE</span><h3>You want your work to feel like yours.</h3><p>I’d start with the choices you want to own, especially where being helpful has taken the place of having a say.</p></li><li><span>02 / YOUR PEOPLE</span><h3>You deserve care you don’t have to earn.</h3><p>Notice who makes room for you when you arrive with nothing to fix. Let those relationships take up more of the page.</p></li><li><span>03 / YOUR NEXT CHAPTER</span><h3>Make a little room before you begin.</h3><p>You’ve been quick to carry the extra thing. I’d like the next six months to include a few commitments you choose for yourself.</p></li></ol>';
    var portrait = section.querySelector('.three-intro img');
    var portraitFrame = document.createElement('div');
    portraitFrame.className = 'three-portrait';
    portrait.before(portraitFrame);
    portraitFrame.append(portrait);
    portraitFrame.insertAdjacentHTML('afterbegin', '<span class="three-portrait-label mono">THREE NOTES / ONE READING</span>');
    portraitFrame.insertAdjacentHTML('beforeend', '<span class="three-portrait-caption"><b>01—03</b><span>held in view</span></span>');
    section.querySelector('.three-intro h2').innerHTML = 'Top 3 things<br><em>in your life.</em>';
    section.querySelectorAll('.three-list li').forEach(function (item, index) {
      var number = document.createElement('div');
      number.className = 'three-folio';
      number.setAttribute('aria-hidden', 'true');
      number.textContent = '0' + (index + 1);
      item.prepend(number);
      item.style.setProperty('--note-order', index);
    });
    view.querySelector('.reading-intro, .full-intro').after(section);
  });

  var drawer = document.querySelector('.report-drawer');
  var reportForm = document.getElementById('report-form');
  var invitation = '';
  var drawerTrigger;
  var closingDrawer = false;
  function closeDrawer() {
    if (closingDrawer) return;
    closingDrawer = true;
    drawer.classList.add('is-closing');
    window.setTimeout(function () {
      drawer.close();
      drawer.classList.remove('is-closing');
      closingDrawer = false;
      if (drawerTrigger) drawerTrigger.focus({ preventScroll: true });
    }, reducedMotion ? 0 : 420);
  }
  document.querySelectorAll('[data-open-report]').forEach(function (button) {
    button.addEventListener('click', function () {
      drawerTrigger = button;
      drawer.showModal();
      document.body.classList.add('drawer-open');
      document.getElementById('recipient-name').focus();
    });
  });
  drawer.querySelector('.drawer-close').addEventListener('click', closeDrawer);
  drawer.addEventListener('cancel', function (event) { event.preventDefault(); closeDrawer(); });
  drawer.addEventListener('close', function () { document.body.classList.remove('drawer-open'); });
  drawer.addEventListener('click', function (event) {
    var rect = drawer.getBoundingClientRect();
    if (event.target === drawer && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) closeDrawer();
  });
  reportForm.addEventListener('submit', function (event) {
    event.preventDefault();
    var input = document.getElementById('recipient-name');
    var name = input.value.trim();
    input.setCustomValidity(name ? '' : 'Please enter a name.');
    if (!reportForm.reportValidity()) return;
    document.getElementById('recipient-title').textContent = name;
    document.getElementById('recipient-note').textContent = 'A place at Tota’s table for my ' + document.getElementById('recipient-relation').value.toLowerCase() + '. Your own story, in your own time.';
    drawer.querySelector('.envelope-preview').hidden = false;
    invitation = name + ', I thought of you while reading my Life Edition. I’d love to explore your story with Tota, too. — Ask Tota';
    document.getElementById('copy-status').textContent = '';
    document.getElementById('copy-invitation').focus();
  });
  document.getElementById('recipient-name').addEventListener('input', function (event) { event.target.setCustomValidity(''); });
  document.getElementById('copy-invitation').addEventListener('click', async function () {
    try {
      await navigator.clipboard.writeText(invitation);
      document.getElementById('copy-status').textContent = 'Invitation copied. It’s ready to share.';
    } catch (error) {
      document.getElementById('copy-status').textContent = 'Copy this invitation: ' + invitation;
    }
  });

  var views = Array.prototype.slice.call(document.querySelectorAll('[data-reading-view]'));
  var modeButtons = Array.prototype.slice.call(document.querySelectorAll('[data-mode-button]'));
  var progressSteps = Array.prototype.slice.call(document.querySelectorAll('.rail-steps li'));
  var railFill = document.querySelector('.rail-fill');
  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var header = document.querySelector('.demo-header');
  var deskNav = document.querySelector('.desk-index');
  var deskList = document.querySelector('.desk-index-list');
  var previousScroll = window.scrollY;
  var scrollDirection = 0;
  var directionTravel = 0;
  var navigationUntil = 0;
  var activeDeskId = '';

  function measureNavigation() {
    document.documentElement.style.setProperty('--header-height', header.offsetHeight + 'px');
    document.documentElement.style.setProperty('--desk-nav-height', deskNav.offsetHeight + 'px');
    document.documentElement.style.setProperty('--viewport-width', document.documentElement.clientWidth + 'px');
  }
  function updateHeader() {
    var y = Math.max(0, window.scrollY);
    var delta = y - previousScroll;
    var direction = Math.sign(delta);
    if (direction && direction !== scrollDirection) directionTravel = 0;
    directionTravel += Math.abs(delta);
    if (direction) scrollDirection = direction;
    previousScroll = y;
    if (y < 80 || header.contains(document.activeElement)) {
      document.body.classList.remove('nav-hidden');
    } else if (performance.now() >= navigationUntil && directionTravel > 18) {
      document.body.classList.toggle('nav-hidden', direction > 0);
    }
  }
  header.addEventListener('focusin', function () { document.body.classList.remove('nav-hidden'); });

  var modeChanging = false;
  function showMode(mode) {
    if (modeChanging || document.body.dataset.mode === mode) return;
    modeChanging = true;
    document.body.classList.add('mode-changing');
    window.setTimeout(function () {
    views.forEach(function (view) {
      var on = view.dataset.readingView === mode;
      view.hidden = !on;
      view.classList.toggle('is-visible', on);
    });
    modeButtons.forEach(function (button) {
      var on = button.dataset.modeButton === mode;
      button.classList.toggle('is-active', on);
      button.setAttribute('aria-pressed', String(on));
    });
    document.body.dataset.mode = mode;
    document.body.classList.remove('nav-hidden');
    activeDeskId = '';
    measureNavigation();
    document.querySelector('.scroll-cue').href = '#' + mode + '-reading';
    document.querySelector('[data-read-time]').textContent = mode === 'full' ? '16' : '04';
    updateProgress();
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
    observeReveals();
    document.body.classList.remove('mode-changing');
    modeChanging = false;
    scheduleFrame();
    }, reducedMotion ? 0 : 240);
  }

  modeButtons.forEach(function (button) {
    button.addEventListener('click', function () { showMode(button.dataset.modeButton); });
  });
  document.querySelectorAll('[data-switch-mode]').forEach(function (button) {
    button.addEventListener('click', function () { showMode(button.dataset.switchMode); });
  });

  function scrollToTarget(id) {
    var target = document.getElementById(id);
    if (!target) return;
    var isDesk = target.classList.contains('desk-file');
    document.body.classList.remove('nav-hidden');
    navigationUntil = performance.now() + 1600;
    var offset = header.offsetHeight + (isDesk ? deskNav.offsetHeight : 60) + 16;
    window.scrollTo({ top: Math.max(0, window.scrollY + target.getBoundingClientRect().top - offset), behavior: reducedMotion ? 'auto' : 'smooth' });
  }

  document.querySelectorAll('[data-scroll-target]').forEach(function (button) {
    button.addEventListener('click', function () {
      scrollToTarget(button.dataset.scrollTarget);
    });
  });

  var revealObserver;
  function observeReveals() {
    if (revealObserver) revealObserver.disconnect();
    var activeView = document.querySelector('[data-reading-view]:not([hidden])');
    if (!activeView) return;
    var blocks = activeView.querySelectorAll('[data-reveal], .three-intro, .three-list li, .desk-copy > *, .partial-unlock');
    if (reducedMotion || !('IntersectionObserver' in window)) {
      blocks.forEach(function (block) { block.classList.add('is-revealed'); });
      return;
    }
    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
    blocks.forEach(function (block) { block.classList.add('motion-ready'); revealObserver.observe(block); });
  }

  function updateProgress() {
    var activeView = document.querySelector('[data-reading-view]:not([hidden])');
    if (!activeView) return;
    var full = activeView.dataset.readingView === 'full';
    var blocks = Array.prototype.slice.call(activeView.querySelectorAll(full ? '.desk-file' : '[data-progress-step]'));
    if (!blocks.length) return;
    var first = blocks[0].getBoundingClientRect();
    var last = blocks[blocks.length - 1].getBoundingClientRect();
    var fraction = Math.max(0, Math.min(1, (window.innerHeight * .45 - first.top) / Math.max(1, last.bottom - first.top - window.innerHeight * .45)));
    var current = 0;
    blocks.forEach(function (block, index) {
      var readingLine = full ? header.offsetHeight + deskNav.offsetHeight + 40 : window.innerHeight * .48;
      if (block.getBoundingClientRect().top <= readingLine) current = index;
    });
    progressSteps.forEach(function (step, index) { step.classList.toggle('is-current', index === Math.min(current, progressSteps.length - 1)); });
    if (railFill) {
      var mobile = window.matchMedia('(max-width: 800px)').matches;
      railFill.style.height = mobile ? '100%' : fraction * 100 + '%';
      railFill.style.width = mobile ? fraction * 100 + '%' : '100%';
    }
    if (activeView.dataset.readingView === 'full') {
      var currentId = blocks[current].id;
      document.querySelectorAll('.desk-index-list button').forEach(function (button) {
        var selected = button.dataset.scrollTarget === currentId;
        button.classList.toggle('is-active', selected);
        if (selected) button.setAttribute('aria-current', 'step');
        else button.removeAttribute('aria-current');
        if (selected && activeDeskId !== currentId) {
          var itemRect = button.getBoundingClientRect();
          var listRect = deskList.getBoundingClientRect();
          if (itemRect.left < listRect.left || itemRect.right > listRect.right) {
            deskList.scrollTo({ left: deskList.scrollLeft + itemRect.left - listRect.left - (listRect.width - itemRect.width) / 2, behavior: reducedMotion ? 'auto' : 'smooth' });
          }
        }
      });
      activeDeskId = currentId;
      document.querySelector('.desk-index').style.setProperty('--read-progress', fraction * 100 + '%');
    }
    document.documentElement.style.setProperty('--page-progress', fraction);
  }

  var framePending = false;
  var hero = document.querySelector('.demo-hero');
  var art = document.querySelector('.hero-art');
  var giftArt = document.querySelector('.gift-chapter > img');
  function scheduleFrame() {
    if (framePending) return;
    framePending = true;
    requestAnimationFrame(function () {
      framePending = false;
      updateHeader();
      updateProgress();
      if (reducedMotion) return;
      var rect = hero.getBoundingClientRect();
      var distance = Math.max(0, Math.min(1, -rect.top / rect.height));
      art.style.setProperty('--drift', (distance * 65).toFixed(2) + 'px');
      art.style.setProperty('--art-scale', (1 - distance * .055).toFixed(4));
      var giftRect = giftArt.getBoundingClientRect();
      if (giftRect.top < innerHeight && giftRect.bottom > 0) {
        giftArt.style.transform = 'translateY(' + ((giftRect.top / innerHeight - .4) * 24).toFixed(1) + 'px)';
      }
    });
  }
  document.body.dataset.mode = 'partial';
  document.body.classList.add('motion-enabled');
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', function (event) {
    reducedMotion = event.matches;
    art.style.removeProperty('--drift');
    art.style.removeProperty('--art-scale');
    giftArt.style.transform = '';
    observeReveals();
    scheduleFrame();
  });
  window.addEventListener('scroll', scheduleFrame, { passive: true });
  window.addEventListener('resize', function () { measureNavigation(); scheduleFrame(); });
  if ('ResizeObserver' in window) {
    var navigationObserver = new ResizeObserver(function () { measureNavigation(); scheduleFrame(); });
    navigationObserver.observe(header);
    navigationObserver.observe(deskNav);
  }
  measureNavigation();
  observeReveals();
  updateProgress();
})();
