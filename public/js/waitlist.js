/**
 * NoResume Waitlist Modal
 * Intercepts clicks on .btn-app-badge buttons.
 * If visitor is in UK (GB/IM/JE/GG), click proceeds to App Store.
 * Otherwise, shows a waitlist modal to capture their email + country.
 */
(function () {
  'use strict';

  const COUNTRY_API  = '/api/country';
  const WAITLIST_API = '/api/waitlist';
  const UK_CODES     = ['GB', 'IM', 'JE', 'GG'];
  const BUTTON_SELECTOR = '.btn-app-badge';

  const COUNTRIES = [
    { code: 'AF', name: 'Afghanistan' },{ code: 'AL', name: 'Albania' },{ code: 'DZ', name: 'Algeria' },
    { code: 'AD', name: 'Andorra' },{ code: 'AO', name: 'Angola' },{ code: 'AR', name: 'Argentina' },
    { code: 'AM', name: 'Armenia' },{ code: 'AU', name: 'Australia' },{ code: 'AT', name: 'Austria' },
    { code: 'AZ', name: 'Azerbaijan' },{ code: 'BH', name: 'Bahrain' },{ code: 'BD', name: 'Bangladesh' },
    { code: 'BY', name: 'Belarus' },{ code: 'BE', name: 'Belgium' },{ code: 'BZ', name: 'Belize' },
    { code: 'BJ', name: 'Benin' },{ code: 'BT', name: 'Bhutan' },{ code: 'BO', name: 'Bolivia' },
    { code: 'BA', name: 'Bosnia and Herzegovina' },{ code: 'BW', name: 'Botswana' },{ code: 'BR', name: 'Brazil' },
    { code: 'BN', name: 'Brunei' },{ code: 'BG', name: 'Bulgaria' },{ code: 'BF', name: 'Burkina Faso' },
    { code: 'BI', name: 'Burundi' },{ code: 'KH', name: 'Cambodia' },{ code: 'CM', name: 'Cameroon' },
    { code: 'CA', name: 'Canada' },{ code: 'CV', name: 'Cape Verde' },{ code: 'CF', name: 'Central African Republic' },
    { code: 'TD', name: 'Chad' },{ code: 'CL', name: 'Chile' },{ code: 'CN', name: 'China' },
    { code: 'CO', name: 'Colombia' },{ code: 'KM', name: 'Comoros' },{ code: 'CG', name: 'Congo' },
    { code: 'CD', name: 'Congo (DRC)' },{ code: 'CR', name: 'Costa Rica' },{ code: 'HR', name: 'Croatia' },
    { code: 'CU', name: 'Cuba' },{ code: 'CY', name: 'Cyprus' },{ code: 'CZ', name: 'Czech Republic' },
    { code: 'DK', name: 'Denmark' },{ code: 'DJ', name: 'Djibouti' },{ code: 'DO', name: 'Dominican Republic' },
    { code: 'EC', name: 'Ecuador' },{ code: 'EG', name: 'Egypt' },{ code: 'SV', name: 'El Salvador' },
    { code: 'ER', name: 'Eritrea' },{ code: 'EE', name: 'Estonia' },{ code: 'ET', name: 'Ethiopia' },
    { code: 'FJ', name: 'Fiji' },{ code: 'FI', name: 'Finland' },{ code: 'FR', name: 'France' },
    { code: 'GA', name: 'Gabon' },{ code: 'GM', name: 'Gambia' },{ code: 'GE', name: 'Georgia' },
    { code: 'DE', name: 'Germany' },{ code: 'GH', name: 'Ghana' },{ code: 'GR', name: 'Greece' },
    { code: 'GT', name: 'Guatemala' },{ code: 'GN', name: 'Guinea' },{ code: 'GY', name: 'Guyana' },
    { code: 'HT', name: 'Haiti' },{ code: 'HN', name: 'Honduras' },{ code: 'HK', name: 'Hong Kong' },
    { code: 'HU', name: 'Hungary' },{ code: 'IS', name: 'Iceland' },{ code: 'IN', name: 'India' },
    { code: 'ID', name: 'Indonesia' },{ code: 'IR', name: 'Iran' },{ code: 'IQ', name: 'Iraq' },
    { code: 'IE', name: 'Ireland' },{ code: 'IL', name: 'Israel' },{ code: 'IT', name: 'Italy' },
    { code: 'JM', name: 'Jamaica' },{ code: 'JP', name: 'Japan' },{ code: 'JO', name: 'Jordan' },
    { code: 'KZ', name: 'Kazakhstan' },{ code: 'KE', name: 'Kenya' },{ code: 'KW', name: 'Kuwait' },
    { code: 'KG', name: 'Kyrgyzstan' },{ code: 'LA', name: 'Laos' },{ code: 'LV', name: 'Latvia' },
    { code: 'LB', name: 'Lebanon' },{ code: 'LS', name: 'Lesotho' },{ code: 'LR', name: 'Liberia' },
    { code: 'LY', name: 'Libya' },{ code: 'LI', name: 'Liechtenstein' },{ code: 'LT', name: 'Lithuania' },
    { code: 'LU', name: 'Luxembourg' },{ code: 'MO', name: 'Macao' },{ code: 'MK', name: 'North Macedonia' },
    { code: 'MG', name: 'Madagascar' },{ code: 'MW', name: 'Malawi' },{ code: 'MY', name: 'Malaysia' },
    { code: 'MV', name: 'Maldives' },{ code: 'ML', name: 'Mali' },{ code: 'MT', name: 'Malta' },
    { code: 'MR', name: 'Mauritania' },{ code: 'MU', name: 'Mauritius' },{ code: 'MX', name: 'Mexico' },
    { code: 'MD', name: 'Moldova' },{ code: 'MC', name: 'Monaco' },{ code: 'MN', name: 'Mongolia' },
    { code: 'ME', name: 'Montenegro' },{ code: 'MA', name: 'Morocco' },{ code: 'MZ', name: 'Mozambique' },
    { code: 'MM', name: 'Myanmar' },{ code: 'NA', name: 'Namibia' },{ code: 'NP', name: 'Nepal' },
    { code: 'NL', name: 'Netherlands' },{ code: 'NZ', name: 'New Zealand' },{ code: 'NI', name: 'Nicaragua' },
    { code: 'NE', name: 'Niger' },{ code: 'NG', name: 'Nigeria' },{ code: 'KP', name: 'North Korea' },
    { code: 'NO', name: 'Norway' },{ code: 'OM', name: 'Oman' },{ code: 'PK', name: 'Pakistan' },
    { code: 'PA', name: 'Panama' },{ code: 'PG', name: 'Papua New Guinea' },{ code: 'PY', name: 'Paraguay' },
    { code: 'PE', name: 'Peru' },{ code: 'PH', name: 'Philippines' },{ code: 'PL', name: 'Poland' },
    { code: 'PT', name: 'Portugal' },{ code: 'QA', name: 'Qatar' },{ code: 'RO', name: 'Romania' },
    { code: 'RU', name: 'Russia' },{ code: 'RW', name: 'Rwanda' },{ code: 'SA', name: 'Saudi Arabia' },
    { code: 'SN', name: 'Senegal' },{ code: 'RS', name: 'Serbia' },{ code: 'SC', name: 'Seychelles' },
    { code: 'SL', name: 'Sierra Leone' },{ code: 'SG', name: 'Singapore' },{ code: 'SK', name: 'Slovakia' },
    { code: 'SI', name: 'Slovenia' },{ code: 'SO', name: 'Somalia' },{ code: 'ZA', name: 'South Africa' },
    { code: 'KR', name: 'South Korea' },{ code: 'SS', name: 'South Sudan' },{ code: 'ES', name: 'Spain' },
    { code: 'LK', name: 'Sri Lanka' },{ code: 'SD', name: 'Sudan' },{ code: 'SR', name: 'Suriname' },
    { code: 'SE', name: 'Sweden' },{ code: 'CH', name: 'Switzerland' },{ code: 'SY', name: 'Syria' },
    { code: 'TW', name: 'Taiwan' },{ code: 'TJ', name: 'Tajikistan' },{ code: 'TZ', name: 'Tanzania' },
    { code: 'TH', name: 'Thailand' },{ code: 'TG', name: 'Togo' },{ code: 'TT', name: 'Trinidad and Tobago' },
    { code: 'TN', name: 'Tunisia' },{ code: 'TR', name: 'Turkey' },{ code: 'TM', name: 'Turkmenistan' },
    { code: 'UG', name: 'Uganda' },{ code: 'UA', name: 'Ukraine' },{ code: 'AE', name: 'United Arab Emirates' },
    { code: 'US', name: 'United States' },{ code: 'UY', name: 'Uruguay' },{ code: 'UZ', name: 'Uzbekistan' },
    { code: 'VE', name: 'Venezuela' },{ code: 'VN', name: 'Vietnam' },{ code: 'YE', name: 'Yemen' },
    { code: 'ZM', name: 'Zambia' },{ code: 'ZW', name: 'Zimbabwe' }
  ];

  // -------------------------------------------------------------
  // POSTHOG EVENT HELPER
  // -------------------------------------------------------------
  function trackEvent(name, props) {
    if (window.posthog && typeof window.posthog.capture === 'function') {
      window.posthog.capture(name, props || {});
    }
  }
  
  let detectedCountry = null;
  let pendingHref = null;

  // -------------------------------------------------------------
  // STYLES
  // -------------------------------------------------------------
  const CSS = `
    #nr-waitlist-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(26, 95, 95, 0.55);
      backdrop-filter: blur(6px);
      z-index: 99998;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
      opacity: 0;
      transition: opacity 0.2s ease;
    }
    #nr-waitlist-backdrop.nr-open { display: flex; opacity: 1; }

    #nr-waitlist-modal {
      background: white;
      border-radius: 20px;
      max-width: 460px;
      width: 100%;
      padding: 36px 32px 28px;
      box-shadow: 0 20px 60px rgba(6, 27, 64, 0.25);
      font-family: 'Poppins', sans-serif;
      position: relative;
      transform: scale(0.95);
      transition: transform 0.2s ease;
    }
    #nr-waitlist-backdrop.nr-open #nr-waitlist-modal { transform: scale(1); }

    .nr-wl-close {
      position: absolute;
      top: 14px;
      right: 14px;
      background: none;
      border: none;
      font-size: 22px;
      line-height: 1;
      cursor: pointer;
      color: #999;
      padding: 6px 10px;
      border-radius: 50%;
      transition: background 0.15s;
    }
    .nr-wl-close:hover { background: #f0f0f0; }

    .nr-wl-heading {
      font-size: 1.5rem;
      font-weight: 700;
      color: #000;
      margin-bottom: 10px;
      line-height: 1.25;
    }
    .nr-wl-heading span {
      background: linear-gradient(135deg, #1A5F5F 0%, #36C5C5 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .nr-wl-subtext {
      color: #555;
      font-size: 0.95rem;
      line-height: 1.6;
      margin-bottom: 22px;
    }

    .nr-wl-field { margin-bottom: 14px; }
    .nr-wl-label {
      display: block;
      font-size: 0.8rem;
      color: #666;
      margin-bottom: 6px;
      font-weight: 500;
    }
    .nr-wl-input, .nr-wl-select {
      width: 100%;
      padding: 12px 14px;
      border: 1.5px solid #e0e0e0;
      border-radius: 10px;
      font-family: 'Poppins', sans-serif;
      font-size: 0.95rem;
      color: #000;
      background: white;
      transition: border-color 0.15s;
    }
    .nr-wl-input:focus, .nr-wl-select:focus {
      outline: none;
      border-color: #36C5C5;
    }

    .nr-wl-error {
      color: #c0392b;
      font-size: 0.85rem;
      margin-top: 8px;
      display: none;
    }
    .nr-wl-error.nr-show { display: block; }

    .nr-wl-submit {
      width: 100%;
      background: linear-gradient(135deg, #1A5F5F 0%, #36C5C5 100%);
      color: white;
      padding: 14px;
      border-radius: 50px;
      border: none;
      font-family: 'Poppins', sans-serif;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      margin-top: 10px;
      transition: opacity 0.15s, transform 0.15s;
    }
    .nr-wl-submit:hover:not(:disabled) {
      opacity: 0.92;
      transform: translateY(-1px);
    }
    .nr-wl-submit:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .nr-wl-secondary {
      display: block;
      text-align: center;
      margin-top: 14px;
      color: #666;
      font-size: 0.85rem;
      text-decoration: none;
      transition: color 0.15s;
    }
    .nr-wl-secondary:hover { color: #1A5F5F; }

    /* Success state */
    .nr-wl-success {
      text-align: center;
      padding: 10px 0;
    }
    .nr-wl-success-icon {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, #1A5F5F 0%, #36C5C5 100%);
      color: white;
      font-size: 28px;
      line-height: 56px;
      margin: 0 auto 16px;
    }
    .nr-wl-success h3 {
      font-size: 1.3rem;
      font-weight: 700;
      color: #000;
      margin-bottom: 10px;
    }
    .nr-wl-success p {
      color: #555;
      font-size: 0.95rem;
      line-height: 1.6;
      margin-bottom: 22px;
    }
    .nr-wl-close-btn {
      background: #f5f5f5;
      color: #333;
      padding: 12px 32px;
      border-radius: 50px;
      border: none;
      font-family: 'Poppins', sans-serif;
      font-weight: 500;
      font-size: 0.95rem;
      cursor: pointer;
      transition: background 0.15s;
    }
    .nr-wl-close-btn:hover { background: #eaeaea; }

    @media (max-width: 480px) {
      #nr-waitlist-modal { padding: 28px 20px 24px; }
      .nr-wl-heading { font-size: 1.3rem; }
    }
  `;

  // -------------------------------------------------------------
  // MODAL HTML
  // -------------------------------------------------------------
  function buildModalHTML() {
    const options = COUNTRIES.map(c =>
      `<option value="${c.code}">${c.name}</option>`
    ).join('');

    return `
      <div id="nr-waitlist-modal" role="dialog" aria-modal="true">
        <button class="nr-wl-close" aria-label="Close">&times;</button>

        <div class="nr-wl-form-state">
          <h2 class="nr-wl-heading">Coming soon to <span>your country</span></h2>
          <p class="nr-wl-subtext">
                        We're UK-only right now, but expanding fast. Drop your email and we'll let you know the moment NoResume launches in your country.
          </p>

          <form id="nr-waitlist-form">
            <div class="nr-wl-field">
              <label class="nr-wl-label" for="nr-wl-country">Country</label>
              <select id="nr-wl-country" class="nr-wl-select" required>
                ${options}
              </select>
            </div>

            <div class="nr-wl-field">
              <label class="nr-wl-label" for="nr-wl-email">Email</label>
              <input id="nr-wl-email" class="nr-wl-input" type="email" placeholder="you@example.com" required>
            </div>

            <div id="nr-wl-error" class="nr-wl-error"></div>

            <button type="submit" class="nr-wl-submit">Add me to the list</button>
          </form>

          <a href="#" class="nr-wl-secondary" id="nr-wl-proceed">I have a UK App Store account →</a>
        </div>

        <div class="nr-wl-success-state" style="display:none;">
          <div class="nr-wl-success">
            <div class="nr-wl-success-icon">✓</div>
            <h3>You're on the list!</h3>
            <p>We'll be in touch as soon as NoResume launches in your country.</p>
            <button class="nr-wl-close-btn" type="button">Close</button>
          </div>
        </div>
      </div>
    `;
  }

  // -------------------------------------------------------------
  // INIT
  // -------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    injectStyles();
    injectModal();
    await detectCountry();
    attachDownloadHandlers();
    attachModalHandlers();
  }

  function injectStyles() {
    const style = document.createElement('style');
    style.id = 'nr-waitlist-styles';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function injectModal() {
    const backdrop = document.createElement('div');
    backdrop.id = 'nr-waitlist-backdrop';
    backdrop.innerHTML = buildModalHTML();
    document.body.appendChild(backdrop);
  }

  async function detectCountry() {
    try {
      const resp = await fetch(COUNTRY_API);
      const data = await resp.json();
      if (data && data.country_code) {
        detectedCountry = data.country_code;
      }
    } catch (err) {
      console.warn('[waitlist] country detection failed', err);
    }
  }

  function attachDownloadHandlers() {
    document.querySelectorAll(BUTTON_SELECTOR).forEach(btn => {
      btn.addEventListener('click', handleDownloadClick);
    });
  }

    function handleDownloadClick(e) {
    const href = this.getAttribute('href') || '';
    const store = href.includes('apps.apple.com') ? 'ios'
                : href.includes('play.google.com') ? 'android'
                : 'other';
    const isUk = !!(detectedCountry && UK_CODES.includes(detectedCountry));

    trackEvent('download_clicked', {
      store: store,
      detected_country: detectedCountry || 'unknown',
      is_uk: isUk,
      destination: isUk ? 'app_store' : 'waitlist_modal'
    });

    // UK or a UK-adjacent region → let the normal click proceed
    if (isUk) {
      return;
    }

    // Non-UK or unknown → intercept and show modal
    e.preventDefault();
    openModal(href);
  }

  function attachModalHandlers() {
    const backdrop = document.getElementById('nr-waitlist-backdrop');
    const modal    = document.getElementById('nr-waitlist-modal');
    const closeBtn = backdrop.querySelector('.nr-wl-close');
    const closeFinal = backdrop.querySelector('.nr-wl-close-btn');
    const proceed  = backdrop.querySelector('#nr-wl-proceed');
    const form     = backdrop.querySelector('#nr-waitlist-form');

    // Close on X button
    closeBtn.addEventListener('click', closeModal);

    // Close on final success button
    closeFinal.addEventListener('click', closeModal);

    // Close on backdrop click (but not modal click)
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal();
    });

    // ESC key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && backdrop.classList.contains('nr-open')) {
        closeModal();
      }
    });

    // Secondary link → proceed to original App Store URL
    proceed.addEventListener('click', (e) => {
      e.preventDefault();
      if (pendingHref) {
        window.location.href = pendingHref;
      }
    });

    // Form submit
    form.addEventListener('submit', handleSubmit);
  }

  function openModal(originalHref) {
    trackEvent('waitlist_modal_shown', {
      detected_country: detectedCountry || 'unknown'
    });
    pendingHref = originalHref;
    const backdrop = document.getElementById('nr-waitlist-backdrop');
    const countrySelect = backdrop.querySelector('#nr-wl-country');

    // Reset form to initial state
    backdrop.querySelector('.nr-wl-form-state').style.display = 'block';
    backdrop.querySelector('.nr-wl-success-state').style.display = 'none';
    backdrop.querySelector('#nr-waitlist-form').reset();
    backdrop.querySelector('#nr-wl-error').classList.remove('nr-show');

    // Pre-select detected country
    if (detectedCountry && countrySelect.querySelector(`option[value="${detectedCountry}"]`)) {
      countrySelect.value = detectedCountry;
    }

    backdrop.classList.add('nr-open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    const backdrop = document.getElementById('nr-waitlist-backdrop');
    backdrop.classList.remove('nr-open');
    document.body.style.overflow = '';
    pendingHref = null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const backdrop = document.getElementById('nr-waitlist-backdrop');
    const email    = backdrop.querySelector('#nr-wl-email').value.trim();
    const countryCode = backdrop.querySelector('#nr-wl-country').value;
    const countryName = COUNTRIES.find(c => c.code === countryCode)?.name || countryCode;
    const submitBtn = backdrop.querySelector('.nr-wl-submit');
    const errorEl   = backdrop.querySelector('#nr-wl-error');

    errorEl.classList.remove('nr-show');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try {
      const utms = getUTMs();
      const resp = await fetch(WAITLIST_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          country: countryName,
          country_code: countryCode,
          utm_source: utms.utm_source,
          utm_medium: utms.utm_medium,
          utm_campaign: utms.utm_campaign,
          referrer: document.referrer || null
        })
      });

      const data = await resp.json();

           if (data.success) {
        trackEvent('waitlist_submitted', {
          country_code: countryCode,
          country_name: countryName,
          detected_country: detectedCountry || 'unknown',
          already_registered: !!data.already_registered
        });
        showSuccess();
      } else {
        trackEvent('waitlist_submit_failed', {
          error: data.error || 'unknown',
          country_code: countryCode
        });
        errorEl.textContent = data.message || data.error || 'Something went wrong. Please try again.';
        errorEl.classList.add('nr-show');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Add me to the list';
      }
    } catch (err) {
      console.error('[waitlist] submit failed', err);
      errorEl.textContent = 'Connection error. Please try again.';
      errorEl.classList.add('nr-show');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Add me to the list';
    }
  }

  function showSuccess() {
    const backdrop = document.getElementById('nr-waitlist-backdrop');
    backdrop.querySelector('.nr-wl-form-state').style.display = 'none';
    backdrop.querySelector('.nr-wl-success-state').style.display = 'block';
  }

  function getUTMs() {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source:   params.get('utm_source'),
      utm_medium:   params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign')
    };
  }
})();
