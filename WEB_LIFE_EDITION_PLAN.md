# Ask Tota Web Life Edition — Implementation Plan

## Objective

Launch a mobile-first, Vercel-hosted web Life Edition that reuses the Ask Tota birth-chart pipeline, onboarding field contract, and visual language from the Android app.

The web experience is lead-first: the visitor enters their birth details immediately (no sign-in up front), gets a free partial reading — rough notes on the chart plus a career preview — and the full ten-desk edition is gated behind a Razorpay payment. To pay, they must leave a WhatsApp number or email, which becomes their recovery handle. WhatsApp contacts must verify a one-time code before checkout opens. After payment, the backend generates the full report as a PDF and sends it to the verified WhatsApp number. It must look and feel like the app, including Tota's animated loading state.

## Progress snapshot — 03 Sep 2026

### Completed

- Built the static web Life Edition flow: birth details, date/time pickers, city selection, anonymous chart session, free preview, payment gate, and newspaper-style reading page.
- Matched the reading page to the Ask Tota visual system, including the Daily Tota masthead, chart details, miniature South Indian chart, desk articles, desk artwork, contents, and payment callout.
- Added the Razorpay order, server-side checkout signature verification, entitlement check, refund-aware webhook route, and local payment stub.
- Added Razorpay test configuration fields to the backend environment contract: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET`.
- Added loader safeguards: explicit Razorpay checkout close after a successful payment, a single in-flight edition request in the browser, a retry state instead of an endless spinner, a model-provider request timeout, and backend deduplication for concurrent edition generation.
- Added a server-rendered, payment-gated A4 PDF endpoint with the birth record, chart, essence, all ten desks, receipts, quotes, and page numbering; the browser downloads it automatically after verified payment and exposes a retry button.
- Documented the required web OTP and WhatsApp PDF delivery design below. The existing app OTP path remains unchanged.

### Still open

- Add dedicated web OTP start and verify routes for the payment contact. The current web page still sends the WhatsApp number straight to order creation; the existing OTP route is used only for post-purchase account linking.
- Add WhatsApp document delivery using the existing Meta credentials, a separate approved report template, delivery status tracking, and retry handling.
- Add the delivery data model, background job or queue, status endpoint, and end-to-end tests for duplicate webhooks, failed sends, and recovery after refresh.

The next implementation slice is the web OTP gate. Payment must remain behind that verification; PDF creation and WhatsApp delivery must happen only after server-verified payment.

## Product flow

1. A visitor opens `life-edition.html` from the website. No account or sign-in is required to start.
2. The first screen collects their birth details using the same pickers as the Ask Tota app:
   - Name — text field, required.
   - Birthday — the app's custom three-column scroll picker (MONTH / DAY / YEAR bottom sheet, 44px rows, tap-to-select, "BIRTH RECORD · PRIVATE" masthead), required.
   - Birth time — the app's two-column HOUR:MINUTE picker, optional. If skipped, submit `hour: 12, minute: 0, accuracy: 'unknown'` exactly like the app.
   - Birth place — the app's debounced city autocomplete over `/v1/geocoding/search`, tap-to-lock suggestions (max 5, with the "tap ur city below to lock it in" nudge if the user types but does not tap), resolved through `/v1/geocoding/geocode` for lat/lon + IANA timezone, required.
3. The web client creates a chart for the visitor. The chart is owned by a web session token (anonymous) until payment, not by an app user account.
4. The user immediately sees the free partial reading:
   - **Rough Notes** — a short, chart-level preamble: notable placements, signs, and houses, in Tota's voice.
   - **Career Desk preview** — the career reading, clearly framed as one desk of ten.
5. The page previews all ten desks included in the edition and nudges the user to pay.
6. To unlock, the user must first enter a contact handle — WhatsApp number or email. A WhatsApp number must pass the web OTP step before checkout; email remains available only where the product intentionally supports an unverified recovery handle.
7. The web client sends the verified contact proof to the backend, which creates the Razorpay order. A Razorpay stub remains available for local development.
8. Razorpay's payment response must pass the server-side signature check before the purchase becomes paid.
9. Only after a verified payment does the client request the full ten-desk reading. The backend also queues one PDF generation and WhatsApp delivery attempt for that purchase.
10. Tota's animated loader runs while the reading is generated.
11. The full edition appears, ending with a CTA to download Ask Tota for daily free readings and to ask Tota, the in-house astrologer. The page shows whether the PDF is preparing, sent, or needs a retry. A post-purchase option links the purchase to an existing or new app account via the WhatsApp OTP flow, so the reading is recoverable on refresh or cross-device.

## Reading scope

The paid edition must feel materially more substantial than the app's standard six-facet life reading.

### Free partial reading (pre-payment)

Generated cheaply and never the full edition:

1. **Rough Notes** — general observations about the chart: standout planets, signs, houses, and any recurring signature, kept deliberately rough and teaser-shaped.
2. **Career Desk preview** — the career reading only.

The partial response must not contain any of the other eight desks, even in summary form.

### Core app desks (paid edition)

1. Career Desk (full)
2. Love Scandal
3. Money Beat
4. Health Watch
5. Home Front
6. Inner Wire

### Additional paid-edition desks

7. The Timing File — active dasha/transit context and the current chapter.
8. Power Placements — chart signatures recurring across several areas of life.
9. Pattern Breakers — useful friction points and how to interrupt them without doom or fatalism.
10. Tota's Next Moves — practical, time-aware closing memo.

Every major claim should name its astrological basis in a `THE RECEIPT` field. The voice remains specific, warm, tabloid-editorial, and non-deterministic.

## Architecture

### Vercel web frontend

- Hosts static HTML, CSS, JavaScript, and existing image assets.
- Contains no DeepSeek or Razorpay secrets.
- Uses `https://api.asktota.com/v1` by default, with a browser-safe API URL override for non-production environments.
- Uses the existing masthead, paper texture, palette, typography (Bricolage Grotesque scale), hard shadows, life-desk imagery, and Tota assets.
- Ports the app's pickers to the web as a faithful HTML/CSS/JS translation of `BirthPickerModal`:
  - Bottom-sheet modal with slide-in animation, translucent ink overlay, sheet radius, and 2px ink border.
  - Three (date) / two (time) scroll-snap columns of 44px rows; selected row highlighted with the paper-green token; `role="radio"` semantics and full keyboard operability.
  - Years counted down from the current year to 1900; 3-letter month names; day count clamped per month/year; zero-padded hours and minutes.
  - A "SELECTED" marigold summary card with hard shadow and Cancel / "Use this {mode} →" pill buttons.
  - Reduced-motion fallback that swaps scroll animation for plain select-style interaction.
- Ports the place autocomplete pattern: 400ms debounce, inline loader, 5-result bordered dropdown, tap-to-lock-only semantics.

### Existing Ask Tota backend

The web client reuses the current app endpoints and data model where possible, with additive web-specific routes:

| Web need | Backend contract |
| --- | --- |
| Birth-place search and resolution | existing `/v1/geocoding/search`, `/v1/geocoding/geocode` |
| Anonymous chart creation | new `POST /v1/web/charts` — session-token-owned, same onboarding field contract as the app (`name`, `date`, `hour`, `minute`, `accuracy`, `lat`, `lon`, `timezone`) |
| Free partial reading | new `GET /v1/web/charts/:id/partial` — returns only Rough Notes + Career preview |
| WhatsApp contact verification | new web OTP routes — reuse the existing Meta WhatsApp delivery service and OTP rules, but bind the challenge to the anonymous web session and chart; do not issue an app JWT |
| Contact capture + order creation | new `POST /v1/web/orders` — accepts a one-time web contact-verification proof plus `chartId`, then creates a Razorpay order |
| Payment verification + entitlement | new `POST /v1/web/orders/:id/verify` — server-side signature check, durable entitlement keyed to contact + chart |
| Full paid reading | new `GET /v1/web/charts/:id/edition` — 403 until a verified entitlement exists |
| PDF delivery status | new `GET /v1/web/orders/:id/delivery` — returns `preparing`, `sent`, or `failed` without exposing the PDF or provider credentials |
| Optional account linking | existing `POST /v1/auth/phone/start`, `POST /v1/auth/phone/verify`, then attach the chart + entitlement to the user record |

Web onboarding uses the same chart record shape as the app, so once a chart is linked to an account it is usable on either platform. Anonymous charts that never convert may be expired on a schedule.

## Implementation phases

### 1. Contracts and compatibility

- Confirm the existing app's onboarding, chart, geocoding, and life-reading request/response shapes.
- Preserve every existing mobile endpoint, field, error code, token behaviour, and cached reading shape.
- Keep backend changes additive. Do not change the current Android app experience or existing user records.
- Design the web session token (issued to the anonymous chart, retained in `localStorage`), the contact-handle validation, the one-time web contact-verification proof, and the entitlement record. A verified WhatsApp proof must be short-lived, single-use, bound to the web session and chart, and unusable for app login.
- Add tests for every new web-specific endpoint, including session ownership, contact validation, entitlement gating, and legacy/missing-field cases.

### 2. Web experience

- Complete `life-edition.html`, `life-edition.css`, and `life-edition.js`.
- Build the birth-details screen first: name field, ported date and time pickers, ported place autocomplete with tap-to-lock, and field validation matching the app's submit rules (name, date, and a tapped place required).
- Implement anonymous chart creation and the partial-reading render (Rough Notes + Career preview).
- Implement the payment gate screen: contact capture (WhatsApp or email, radio choice), then checkout.
- Keep the full reading out of the pre-payment flow; only request it after payment verification.
- Use the supplied `loader-parrot.png` and `loader-parrot-planted.png` as the app's two-frame walking Tota loader, including bobbing, notes, step captions, progress dashes, and a reduced-motion fallback.
- Test at narrow mobile widths first, then tablet and desktop.

### 3. Paid-edition backend

- Add the web partial-reading route returning only Rough Notes + Career preview; keep its generation cost well under the full edition.
- Add the web-edition reading route that returns the ten-desk paid shape, gated on entitlement.
- Build on the existing chart computation, prompt framework, field encryption, rate limiting, and life-facet rendering contracts.
- Store or cache a completed paid edition only after a verified purchase; never generate the full edition for preview users.
- Make retry behaviour idempotent so a user who refreshes after payment does not pay or generate twice; recovery keyed to the contact handle.
- Keep the standard `GET /v1/charts/:id/life` response unchanged for the mobile app.

### 4. DeepSeek runtime configuration

Set these backend runtime values in the secure backend environment, not in Vercel:

```text
LLM_PROVIDER=openai
LLM_MODEL=deepseek-v4-flash
LLM_DISABLE_THINKING=false
OPENAI_BASE_URL=<DeepSeek OpenAI-compatible endpoint>
OPENAI_API_KEY=<secret>
```

- `LLM_DISABLE_THINKING=false` preserves thinking mode.
- Keep the current configured provider fallback available for non-production and tests.
- Add safe logs/metrics for generation latency, failures, and token usage without recording private birth or reading content.

### 5. Razorpay integration

Until credentials are provided, retain a clearly labelled client stub that still requires contact capture before unlocking.

Once credentials and a product/price are supplied:

1. Client completes the WhatsApp OTP step when the selected contact type is WhatsApp. The email path remains a separate product decision and must not bypass a required WhatsApp verification step.
2. Client sends the verified contact proof to `POST /v1/web/orders`; the backend records the contact and creates a Razorpay order for the paid edition.
3. Open Razorpay Checkout from the web client using the returned order ID, with the verified phone pre-filled.
4. Verify Razorpay's payment signature server-side in `POST /v1/web/orders/:id/verify`.
5. Record a durable payment/entitlement keyed to the contact handle and chart.
6. Allow on-demand edition generation only after the verified entitlement exists.
7. Add a webhook handler for payment reconciliation, retries, refunds, and delayed payment states.

Never trust a browser-only success callback as proof of payment.

### 6. WhatsApp OTP and PDF delivery

This is the delivery path for a paid web edition. It uses the existing WhatsApp Cloud API credentials and `sendOtp` boundary, but the web flow needs its own routes and delivery record so it does not silently create or sign in an app account.

#### Web OTP

- Add `POST /v1/web/charts/:id/contact/otp/start`. Require the anonymous web-session token, accept only a normalized WhatsApp number, and create a challenge tied to the session, chart, and purpose `web_edition_contact`.
- Add `POST /v1/web/charts/:id/contact/otp/verify`. Check expiry, attempt count, resend limits, and session ownership. On success, return a short-lived, single-use contact-verification proof; do not return an access token or refresh token.
- Reuse the existing OTP HMAC and Meta delivery code, including the configured `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_API_VERSION`, OTP template, and rate limits. Keep the app's `/v1/auth/phone/start` and `/v1/auth/phone/verify` behaviour unchanged.
- `POST /v1/web/orders` must reject a WhatsApp contact unless it receives a valid proof issued for the same chart and web session. A proof cannot be replayed for another order, chart, or session.

#### PDF creation

- After server-side payment verification or a trusted paid webhook, create one delivery job for the purchase. The browser must never create, assemble, or send the paid PDF.
- Generate the PDF from the same completed ten-desk edition returned by the paid reading route. Include the user's name, date of birth, place, time accuracy, chart, all entitled desk articles, and the newspaper styling used on the reading page.
- Keep the PDF private. Store it under a purchase-scoped key with a short retention period, or upload it directly to Meta and remove the temporary file after a successful send. Never put a birth chart or report in a public, guessable URL.
- Make generation idempotent. A refresh, duplicate webhook, or worker retry must reuse the existing PDF and must not generate a second report unnecessarily.

#### WhatsApp document delivery

- Add a `sendDocument` method beside `sendOtp` in `src/services/whatsapp.ts`. It must use the existing system-user token and sender phone-number ID, then send the PDF as a WhatsApp document using a Meta media ID or a short-lived HTTPS document URL.
- Add a separate approved report-delivery template, for example `WHATSAPP_REPORT_TEMPLATE` and `WHATSAPP_REPORT_TEMPLATE_LANG`. Do not reuse the authentication OTP template for the report. Use the approved utility/document template when the business initiates delivery outside an open customer-service window.
- Add `WHATSAPP_REPORT_TEMPLATE_HAS_DOCUMENT` or an equivalent explicit config choice if Meta's selected template uses a document header. The implementation must match the approved template's component shape exactly.
- Record the provider message ID and delivery state. A successful API response means Meta accepted the message; the system should use WhatsApp status webhooks where available to distinguish accepted, delivered, read, and failed states.
- Add retry handling with a bounded attempt count, backoff, and a visible `failed` state. A retry must not send two PDFs for the same purchase when the first request already succeeded.

#### Data model and observability

- Add a `web_contact_verification` record or extend the OTP challenge model with a purpose and web-session ownership. Store only the OTP HMAC, never the code itself.
- Add an `edition_delivery` record with one row per purchase and fields for channel, status, PDF key or Meta media ID, provider message ID, attempt count, last error, created time, sent time, and updated time. Keep phone values encrypted or hashed according to the existing contact-storage rules.
- Log delivery state changes with purchase and order identifiers only. Do not log phone numbers, OTPs, birth data, PDF URLs, document contents, or provider tokens.
- The delivery status endpoint must return a safe user-facing state and retry guidance without returning internal errors or storage details.

### 7. Production and verification

- Add canonical website origins to the backend `CORS_ORIGINS` runtime variable:

  ```text
  https://www.asktota.com,https://asktota.com
  ```

- Keep preview origins explicitly allowlisted if preview deployment testing is required; do not permit arbitrary origins.
- Verify the lead-first flow: fresh visitor enters details with no sign-in, gets the partial reading, and cannot fetch the full edition before payment.
- Verify contact capture: both WhatsApp and email paths, invalid-contact rejection, and recovery of a purchased reading after refresh via the contact handle.
- Verify the WhatsApp gate: a valid number receives an OTP, an invalid or expired code blocks checkout, a correct code opens checkout, and a web verification proof cannot be reused or moved to another chart.
- Verify account linking: post-purchase OTP link to an existing app user with a chart, an app user without a chart, and a first-time web user.
- Verify no full edition request or generation occurs before a verified payment.
- Verify delivery: a paid purchase generates one PDF, sends one WhatsApp document, records the provider message ID, survives a duplicate payment webhook, and retries a failed send without duplicating a successful one.
- Run backend route tests, responsive browser tests, picker keyboard and screen-reader tests (`role="radio"`, focus management), reduced-motion checks, and a Vercel production build before release.

## Inputs still required

- Razorpay key ID, key secret, webhook secret, product ID, price, currency, and refund policy.
- A Meta-approved report-delivery template name and language, plus confirmation that the current WhatsApp system-user token has `whatsapp_business_messaging` permission and can send document media.
- A test WhatsApp recipient or Meta test-number allow-list for OTP and PDF delivery. Razorpay test mode does not make WhatsApp delivery simulated.
- A PDF storage choice: temporary server storage with Meta media upload, or private object storage that can issue short-lived HTTPS URLs.
- The approved DeepSeek endpoint/key and confirmation that `deepseek-v4-flash` is the production model identifier.
- Whether email contacts receive the reading by mail or web-only, and any transactional mail provider preference.
- Any desired custom domain or explicit Vercel preview URLs for CORS.
