// PostHog analytics, gated behind an analytics-consent banner.
// Essential cookies (login, security, Cloudflare) are exempt and NOT governed
// here — this file only controls the optional PostHog analytics, which does not
// run until the visitor clicks "Accept".

// PostHog stub loader — defines window.posthog but loads/sends NOTHING until init() is called.
!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug getPageViewId captureTraceFeedback captureTraceMetric".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);

(function () {
  if (window.__nrConsent) return;          // guard (analytics.js is included more than once)
  window.__nrConsent = true;
  var KEY = 'nr_analytics_consent';         // 'granted' | 'denied'

  function get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function set(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  function startAnalytics() {
    posthog.init('phc_CHFKrJKnxzyhbVXoSN5uzPYhVVHUHJNSStDzVgRL6ebm', {
      api_host: 'https://eu.i.posthog.com',
      persistence: 'localStorage',
      autocapture: true,
      capture_pageview: true,
      capture_pageleave: true,
      disable_session_recording: false,
      capture_exceptions: true
    });
  }

  function showBanner() {
    var css = '#nr-consent{position:fixed;left:16px;right:16px;bottom:16px;z-index:5000;max-width:560px;margin:0 auto;background:#F8F6E6;border:1px solid #d6d3c0;border-radius:16px;box-shadow:0 14px 44px rgba(6,27,64,.20);padding:16px 18px;font-family:Poppins,sans-serif;font-size:13px;line-height:1.5;}'
      + '#nr-consent p{margin:0 0 12px;color:#444;}'
      + '#nr-consent strong{color:#1A1A2E;}'
      + '#nr-consent a{color:#1A5F5F;text-decoration:underline;}'
      + '#nr-consent .nr-cb{display:flex;gap:10px;justify-content:flex-end;}'
      + '#nr-consent button{font-family:inherit;font-weight:600;font-size:13px;border-radius:12px;padding:9px 18px;cursor:pointer;}'
      + '#nr-consent-decline{background:transparent;color:#1A5F5F;border:1.5px solid #1A5F5F;}'
      + '#nr-consent-accept{background:linear-gradient(135deg,#1A5F5F 0%,#36C5C5 100%);color:#fff;border:none;}'
      + '#nr-consent button:hover{transform:translateY(-1px);}';
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var bar = document.createElement('div');
    bar.id = 'nr-consent';
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', 'Cookie and analytics consent');
    bar.innerHTML =
      '<p><strong>Cookies &amp; analytics.</strong> Essential cookies keep the site secure and sign-in working. '
      + 'With your OK we also use privacy-friendly analytics to see how NoResume is used and make it better. '
      + '<a href="/privacy-policy">Privacy&nbsp;Policy</a></p>'
      + '<div class="nr-cb">'
      + '<button id="nr-consent-decline" type="button">Decline</button>'
      + '<button id="nr-consent-accept" type="button">Accept</button>'
      + '</div>';
    document.body.appendChild(bar);

    bar.querySelector('#nr-consent-accept').addEventListener('click', function () {
      set('granted'); bar.remove(); startAnalytics();
    });
    bar.querySelector('#nr-consent-decline').addEventListener('click', function () {
      set('denied'); bar.remove();
    });
  }

  function init() {
    var c = get();
    if (c === 'granted') startAnalytics();
    else if (c === 'denied') { /* analytics stays off */ }
    else showBanner();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
