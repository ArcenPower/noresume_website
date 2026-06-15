(function () {
  "use strict";

  const API_BASE = window.NORESUME_API_BASE || "http://localhost:8077";
  const SITEKEY = window.NORESUME_TURNSTILE_SITEKEY || "";

  const form = document.getElementById("search-form");
  const submitBtn = document.getElementById("submit-btn");
  const formError = document.getElementById("form-error");

  const tabManual = document.getElementById("tab-manual");
  const tabUrl = document.getElementById("tab-url");
  const fieldsManual = document.getElementById("fields-manual");
  const fieldsUrl = document.getElementById("fields-url");

  const titleInput = document.getElementById("job-title");
  const locationInput = document.getElementById("job-location");
  const salaryInput = document.getElementById("job-salary");
  const urlInput = document.getElementById("job-url");

  const loading = document.getElementById("loading-state");
  const results = document.getElementById("results-state");
  const parsedSummary = document.getElementById("parsed-summary");
  const resultsSub = document.getElementById("results-sub");
  const grid = document.getElementById("candidate-grid");
  const emptyNote = document.getElementById("empty-note");

  const errorState = document.getElementById("error-state");
  const errorMessage = document.getElementById("error-message");
  const tryAgainBtn = document.getElementById("try-again-btn");

  document.getElementById("year").textContent = new Date().getFullYear();

  if (SITEKEY) {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    s.async = true; s.defer = true;
    s.onload = function () {
      try { turnstile.render("#captcha-slot", { sitekey: SITEKEY, theme: "light" }); } catch (e) {}
    };
    document.head.appendChild(s);
  }

  let mode = "manual";
  function show(el) { el.hidden = false; }
  function hide(el) { el.hidden = true; }
  function setMode(next) {
    if (next === mode) return;
    mode = next;
    tabManual.classList.toggle("active", mode === "manual");
    tabUrl.classList.toggle("active", mode === "url");
    fieldsManual.hidden = mode !== "manual";
    fieldsUrl.hidden = mode !== "url";
    formError.textContent = "";
  }
  tabManual.addEventListener("click", () => setMode("manual"));
  tabUrl.addEventListener("click", () => setMode("url"));

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  // ── staged loading messages (driven on the client; the request is one call) ──
  const STAGES = {
    url: ["Reading the job page", "Understanding the role", "Categorising the job", "Matching candidates"],
    manual: ["Understanding the role", "Categorising the job", "Matching candidates"],
  };
  const loadSteps = document.getElementById("load-steps");
  let stageTimer = null;
  function startStages() {
    const steps = STAGES[mode] || STAGES.manual;
    loadSteps.innerHTML = steps.map((s) => `<li><span class="dot"></span>${escapeHtml(s)}</li>`).join("");
    const lis = Array.prototype.slice.call(loadSteps.querySelectorAll("li"));
    let i = 0;
    const setActive = (idx) => lis.forEach((li, j) => {
      li.classList.toggle("done", j < idx);
      li.classList.toggle("active", j === idx);
    });
    setActive(0);
    stageTimer = setInterval(() => {
      if (i < lis.length - 1) { i++; setActive(i); }
      else { clearInterval(stageTimer); stageTimer = null; }
    }, 1600);
  }
  function stopStages() { if (stageTimer) { clearInterval(stageTimer); stageTimer = null; } }

  // ── card helpers (display only — values come straight from your record) ──
  const TIER = { exact: "Exact Match", close: "Close Match", related: "Related Match", broader: "Broader Field" };
  function tierLabel(t) { return TIER[t] || ""; }
  function activeLabel(days) {
    if (days === null || days === undefined) return "";
    const d = Number(days);
    if (!Number.isFinite(d)) return "";
    if (d <= 7) return "Active this week";
    if (d <= 31) return "Active this month";
    if (d <= 92) return "Active recently";
    return "";
  }
  function fmtYears(y) { const n = Number(y) || 0; return String(Math.round(n * 10) / 10).replace(/\.0$/, ""); }
  function avatarLetter(name) { const m = String(name || "?").match(/[A-Za-z]/); return (m ? m[0] : "?").toUpperCase(); }
  function distLabel(d) { const n = Number(d); return Number.isFinite(n) ? n.toFixed(1) + "mi" : ""; }

  function talentCard(c) {
    const name = c.anonymous_name || "Candidate";
    const sub = [c.city, distLabel(c.distance_miles)].filter(Boolean).join(" · ");
    const tier = tierLabel(c.tier);
    const active = activeLabel(c.active_days);
    const roles = (c.roles || []).slice(0, 3);
    const totalYears = Math.round(Number(c.total_years) || 0);
    const indName = c.industry_name;
    const indYears = Math.round(Number(c.industry_years) || 0);
    const summary = c.summary || "";

    const expLine = `${totalYears} years matching experience` + (indName ? ` · ${indYears}yr in ${escapeHtml(indName)}` : "");
    const roleRows = roles.map((r) =>
      `<div class="tc-role"><strong>${escapeHtml(r.title || "")}</strong>` +
      `${r.company ? " at " + escapeHtml(r.company) : ""}` +
      `${r.years ? " (" + fmtYears(r.years) + "yr)" : ""}</div>`
    ).join("");

    return `
      <article class="talent-card">
        <div class="tc-head">
          <div class="tc-avatar">${escapeHtml(avatarLetter(name))}</div>
          <div class="tc-id">
            <div class="tc-name">${escapeHtml(name)}</div>
            <div class="tc-sub">${escapeHtml(sub)}</div>
          </div>
        </div>
        <div class="tc-tags">
          ${tier ? `<span class="tc-tier">${escapeHtml(tier)}</span>` : ""}
          ${active ? `<span class="tc-active">${escapeHtml(active)}</span>` : ""}
        </div>
        ${roleRows ? `<div class="tc-roles">${roleRows}</div>` : ""}
        <div class="tc-exp">${expLine}</div>
        ${summary ? `<div class="tc-summary">${escapeHtml(summary)}</div>` : ""}
      </article>`;
  }

  function renderResults(parsed, candidates) {
    const title = (parsed && parsed.title) || "candidates";
    const where = parsed && parsed.location ? ` near ${parsed.location}` : "";
    if (candidates.length) {
      const plural = /s$/i.test(title) ? title : title + "s";
      parsedSummary.textContent = `${candidates.length} ${plural} available${where}`;
      resultsSub.textContent = "A preview of your matches — full profiles and contact details unlock when you sign up.";
      emptyNote.hidden = true;
      grid.innerHTML = candidates.map(talentCard).join("");
    } else {
      parsedSummary.textContent = `No matches yet for ${title}${where}`;
      resultsSub.textContent = "";
      emptyNote.hidden = false;
      grid.innerHTML = "";
    }
  }

  function getTurnstileToken() {
    if (!SITEKEY) return "local-dev-bypass";
    try { return (typeof turnstile !== "undefined" && turnstile.getResponse()) || ""; } catch { return ""; }
  }

  function buildBody(token) {
    if (mode === "url") {
      const jobUrl = urlInput.value.trim();
      if (!jobUrl) throw new Error("Paste a job URL first.");
      return { input_mode: "url", job_url: jobUrl, turnstile_token: token };
    }
    const title = titleInput.value.trim();
    const location = locationInput.value.trim();
    const salary = salaryInput.value.trim();
    if (!title) throw new Error("Enter a job title.");
    if (!location) throw new Error("Enter a location.");
    return { input_mode: "manual", title, location, salary: salary || null, turnstile_token: token };
  }

  function readError(data, status) {
    const d = data && data.detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d) && d.length) return d[0].msg || "Please check your input.";
    return "Request failed (" + status + ")";
  }

  async function submitSearch(body) {
    const r = await fetch(API_BASE + "/search", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(readError(data, r.status));
    return data;
  }

  function resetTurnstile() { if (typeof turnstile !== "undefined") { try { turnstile.reset(); } catch {} } }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    formError.textContent = "";
    const token = getTurnstileToken();
    if (!token) { formError.textContent = "Complete the captcha to continue."; return; }

    let body;
    try { body = buildBody(token); } catch (err) { formError.textContent = err.message; return; }

    submitBtn.disabled = true;
    hide(results); hide(errorState); show(loading); startStages();
    loading.scrollIntoView({ behavior: "smooth", block: "start" });
    try {
      const data = await submitSearch(body);
      hide(loading);
      renderResults(data.parsed_job, data.candidates || []);
      show(results);
    } catch (err) {
      hide(loading);
      errorMessage.textContent = err.message || String(err);
      show(errorState);
    } finally {
      stopStages();
      submitBtn.disabled = false;
      resetTurnstile();
    }
  });

  tryAgainBtn.addEventListener("click", () => { hide(errorState); hide(loading); hide(results); formError.textContent = ""; });
})();
