/* Local UI regression check. Requires Playwright; never contacts a payment service.
 * Start a static server, then run with NODE_PATH pointing to your Playwright install:
 * node tools/check-life-flow.cjs [http://127.0.0.1:8765] [screenshot-directory]
 */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.argv[2] || 'http://127.0.0.1:8765';
assert(['127.0.0.1', 'localhost'].includes(new URL(base).hostname), 'Use a local server only.');
const output = process.argv[3];
if (output) fs.mkdirSync(output, { recursive: true });
const keys = ['career', 'love', 'wealth', 'health', 'family', 'mind', 'timing', 'placements', 'patterns', 'moves'];
const fixture = {
  birth: { name: 'Ravi', date: '1994-06-15', time: '12:00', time_accuracy: 'unknown', place: 'Bengaluru, India' },
  chart: { lagna_sign_index: 0, houses: { 1: { occupants: ['Sun', 'Moon'] } } },
  rough_notes: { summary: 'A little room for the things you choose.', paragraphs: ['Your work and your people are part of the same story. Start by noticing where your own voice is strongest.'] },
  essence: 'The person you’ve become. The patterns you carry. The chapter you get to choose next.',
  top_three: ['career', 'love', 'wealth'].map(key => ({ key, title: key, headline: 'Make a little room for your own story', body: 'You deserve space to choose what comes next.' })),
  facets: keys.map(key => ({ key, headline: 'Make a little room for your own story', takeaway: 'You deserve space to choose what comes next.', strength: 3, story: ['You are quick to carry the extra thing. Notice the choices you want to own, especially where being helpful has taken the place of having a say.', 'Let the relationships that make room for you take up more of the page. Your next chapter begins with one small commitment you choose for yourself.'], receipt: 'A sample placement, used only for this local UI check.', evidence: ['Moon in the first house'], caption: 'A closer look at your story.' }))
};
fixture.career = fixture.facets[0];

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined });
  try {
    for (const width of [1440, 390, 320]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      const calls = [];
      let failOtp = true, failVerify = true, failEdition = true, failDelivery = true, failPdf = true;
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return route.continue();
        if (url.origin !== new URL(base).origin) return route.abort();
        if (!url.pathname.startsWith('/mock-api/')) return route.continue();
        const endpoint = url.pathname.slice('/mock-api'.length);
        calls.push(endpoint);
        let data = {}, status = 200;
        if (endpoint === '/geocoding/search') data = { results: [{ name: 'Bengaluru', country: 'India' }] };
        else if (endpoint === '/geocoding/geocode') data = { name: 'Bengaluru', country: 'India', latitude: 12.97, longitude: 77.59, timezone: 'Asia/Kolkata' };
        else if (endpoint === '/web/charts') data = { chartId: 'local-chart', sessionToken: 'local-session' };
        else if (endpoint.endsWith('/structured')) data = fixture.chart;
        else if (endpoint.endsWith('/partial')) data = fixture;
        else if (endpoint.endsWith('/otp/start')) data = { resendIn: 1 };
        else if (endpoint.endsWith('/otp/verify')) {
          if (failOtp) { status = 400; data = { code: 'invalid_code', message: 'Wrong code', attemptsRemaining: 2 }; failOtp = false; }
          else data = { contactProof: 'local-proof' };
        }
        else if (endpoint === '/web/orders') data = { orderId: 'local-order', keyId: 'local-key', amount: 9900, currency: 'INR' };
        else if (endpoint.endsWith('/verify')) {
          if (failVerify) { status = 503; data = { message: 'Try verification again' }; failVerify = false; }
          else data = { verified: true };
        }
        else if (endpoint.endsWith('/edition')) {
          if (failEdition) { status = 503; data = { message: 'Reading temporarily unavailable' }; failEdition = false; }
          else data = fixture;
        }
        else if (endpoint.endsWith('/edition.pdf')) {
          if (failPdf) { failPdf = false; return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Please try the download again.' }) }); }
          return route.fulfill({ contentType: 'application/pdf', body: '%PDF-1.4\n% Local test fixture only\n%%EOF' });
        }
        else if (endpoint.endsWith('/delivery/retry')) { failDelivery = false; data = { status: 'preparing' }; }
        else if (endpoint.endsWith('/delivery')) data = { status: failDelivery ? 'failed' : 'sent' };
        else throw new Error('Unexpected mock endpoint: ' + endpoint);
        return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
      });
      await page.addInitScript(({ base }) => {
        window.ASKTOTA_API_URL = base + '/mock-api';
        window.Razorpay = function (options) {
          window.testCheckout = options;
          this.open = () => { window.testCheckoutOpen = true; };
          this.close = () => { window.testCheckoutOpen = false; };
          this.on = (event, handler) => { if (event === 'payment.failed') window.testCheckoutFailed = handler; };
        };
        window.testRazorpay = window.Razorpay;
      }, { base });
      async function screen(name) { await page.locator('[data-screen="' + name + '"]').waitFor({ state: 'visible' }); }
      async function checkLayout(name) {
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
        assert.equal(overflow, false, name + ' overflows at ' + width);
        if (output) await page.screenshot({ path: path.join(output, width + '-' + name + '.png'), fullPage: true });
      }
      await page.goto(base + '/life-edition.html');
      await screen('details');
      await checkLayout('details');
      await page.locator('#details-submit').click();
      assert.equal(await page.locator('#name').getAttribute('aria-invalid'), 'true');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'name');
      await page.locator('#name').fill('Ravi');
      await page.locator('#date-trigger').click();
      await page.waitForFunction(() => document.activeElement.tagName === 'SELECT');
      assert.equal(await page.evaluate(() => document.activeElement.tagName), 'SELECT');
      await page.locator('#date-picker [data-unit="month"] select').selectOption('12');
      await page.locator('#date-picker [data-unit="day"] select').selectOption('31');
      await page.locator('#date-picker [data-unit="year"] select').selectOption(String(new Date().getFullYear()));
      // The date guard uses the browser's actual local date.
      if (new Date().getMonth() !== 11 || new Date().getDate() !== 31) {
        await page.locator('#date-use').click();
        await page.locator('#date-picker-error').filter({ hasText: 'future' }).waitFor();
      }
      await page.locator('#date-picker [data-unit="year"] select').selectOption('1994');
      await page.locator('#date-picker [data-unit="month"] select').selectOption('6');
      await page.locator('#date-picker [data-unit="day"] select').selectOption('15');
      await page.locator('#date-use').focus();
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.className), 'picker-close');
      await checkLayout('date-picker');
      await page.locator('#date-use').click();
      assert.equal(await page.evaluate(() => document.activeElement.id), 'date-trigger');
      await page.locator('#time-trigger').click();
      await page.keyboard.press('Escape');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'time-trigger');
      await page.locator('#birth-place').fill('Bengaluru');
      await page.locator('#place-option-0').waitFor();
      await page.keyboard.press('ArrowDown');
      assert.equal(await page.locator('#birth-place').getAttribute('aria-activedescendant'), 'place-option-0');
      if (width === 390) await page.locator('#place-option-0').click();
      else await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.getElementById('place-status').textContent.startsWith('City selected'));
      await page.locator('#details-submit').click();
      await screen('partial');
      await checkLayout('partial');
      await page.locator('#unlock-button').click();
      await screen('payment');
      await page.locator('#contact-submit').click();
      assert.equal(await page.locator('#whatsapp').getAttribute('aria-invalid'), 'true');
      await page.locator('#whatsapp').fill('9876543210');
      await checkLayout('payment');
      await page.locator('#contact-submit').click();
      await screen('otp');
      await checkLayout('otp');
      await page.locator('.otp-cell').first().pressSequentially('111111');
      await page.waitForFunction(() => document.getElementById('otp-status').textContent.includes('2 attempts'));
      await page.locator('.otp-cell').first().pressSequentially('123456');
      await page.waitForFunction(() => window.testCheckoutOpen);
      assert.equal(calls.filter(p => p === '/web/orders').length, 1, 'Order opens after OTP verification');
      // A dismissed checkout keeps the order and returns to the payment screen.
      await page.evaluate(() => window.testCheckout.modal.ondismiss());
      await page.locator('#payment-retry').waitFor({ state: 'visible' });
      await checkLayout('payment-canceled');
      await page.locator('#payment-retry').click();
      await page.waitForFunction(() => window.testCheckoutOpen);
      await page.evaluate(() => window.testCheckoutFailed({ error: { description: 'Payment declined. Please try again.' } }));
      await page.locator('#payment-retry').click();
      await page.waitForFunction(() => window.testCheckoutOpen);
      await page.evaluate(() => window.testCheckout.handler({ razorpay_payment_id: 'local-payment' }));
      await page.waitForFunction(() => document.getElementById('payment-retry').textContent.includes('verification'));
      assert.equal(calls.some(p => p.endsWith('/edition')), false, 'Paid content stays gated until verification');
      await page.locator('#payment-retry').click();
      await screen('loader');
      await page.locator('#loader-retry').waitFor({ state: 'visible' });
      await checkLayout('reading-error');
      await page.locator('#loader-retry').click();
      await screen('reading');
      assert.equal(await page.locator('#reading-desks .desk-file').count(), 10);
      assert.equal(await page.locator('#reading-desk-index button').count(), 10);
      assert.equal(await page.locator('.full-close').isVisible(), true);
      assert.equal(calls.filter(p => p === '/web/orders').length, 1, 'Retries reuse the existing order');
      await page.evaluate(async () => {
        await Promise.all([...document.querySelectorAll('#reading-desks img')].map(img => { img.loading = 'eager'; return img.decode(); }));
      });
      await checkLayout('reading');
      await page.locator('#delivery-retry-button').click();
      await page.waitForFunction(() => document.getElementById('delivery-note').textContent.includes('on its way'));
      await page.locator('#download-pdf-button').click();
      await page.waitForFunction(() => document.getElementById('pdf-note').textContent.includes('try the download'));
      const download = page.waitForEvent('download');
      await page.locator('#download-pdf-button').click();
      await download;
      await page.reload();
      await screen('reading');
      assert.equal(calls.filter(p => p === '/web/orders').length, 1);
      assert.equal(await page.locator('#name').inputValue(), 'Ravi');
      assert.deepEqual(errors, [], 'No browser JS errors');
      // Sample edition and homepage remain usable at the same breakpoints.
      await page.goto(base + '/life-edition-demo.html');
      await checkLayout('sample');
      await page.locator('[data-mode-button="full"]').click();
      await page.locator('[data-reading-view="full"]').waitFor({ state: 'visible' });
      await checkLayout('sample-full');
      await page.goto(base + '/');
      await checkLayout('home');
      assert.deepEqual(errors, [], 'No browser JS errors across entry points');
      console.log('PASS ' + width + 'px: form, picker focus, city keyboard selection, OTP error/re-entry, checkout, payment cancel/failure, verification retry, paid gate, edition recovery, delivery/PDF retry, refresh, sample, home');
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
