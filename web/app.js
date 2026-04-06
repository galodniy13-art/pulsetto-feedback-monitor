const SUMMARY_PATH = new URL("../data/weekly_summary.json", window.location.href).toString();

const CATEGORY_META = {
  support_silence: { label: "Support Silence", icon: "◎", severity: "critical", stage: "Support / Aftercare" },
  poor_support_quality: { label: "Poor Support Quality", icon: "◉", severity: "high", stage: "Support / Aftercare" },
  no_results: { label: "No Results", icon: "◍", severity: "critical", stage: "First Use" },
  weak_results: { label: "Weak Results", icon: "◌", severity: "high", stage: "First Use" },
  onboarding_confusion: { label: "Onboarding Confusion", icon: "◈", severity: "high", stage: "Setup" },
  app_connectivity: { label: "App Connectivity", icon: "◐", severity: "high", stage: "Setup" },
  comfort_fit: { label: "Comfort & Fit", icon: "◑", severity: "medium", stage: "First Use" },
  price_value_mismatch: { label: "Price-Value Mismatch", icon: "◒", severity: "medium", stage: "Purchase" },
  trust_skepticism: { label: "Trust Skepticism", icon: "◓", severity: "high", stage: "Discovery" },
  scientific_credibility: { label: "Scientific Credibility", icon: "◔", severity: "high", stage: "Discovery" },
  delivery_logistics: { label: "Delivery Logistics", icon: "◕", severity: "medium", stage: "Purchase" },
  positive_advocacy: { label: "Positive Advocacy", icon: "✦", severity: "low", stage: "Support / Aftercare" },
  neutral_discussion: { label: "Neutral Discussion", icon: "·", severity: "low", stage: "Discovery" },
  competitor_comparison: { label: "Competitor Comparison", icon: "▣", severity: "medium", stage: "Discovery" },
};

const LEGACY_CATEGORY_MAP = {
  customer_support: "poor_support_quality",
  support: "poor_support_quality",
  unanswered_mentions: "support_silence",
  no_response: "support_silence",
  efficacy: "weak_results",
  effectiveness: "weak_results",
  no_effect: "no_results",
  no_improvement: "no_results",
  onboarding: "onboarding_confusion",
  setup: "onboarding_confusion",
  technical: "app_connectivity",
  connectivity: "app_connectivity",
  bluetooth: "app_connectivity",
  app_bug: "app_connectivity",
  comfort: "comfort_fit",
  fit: "comfort_fit",
  pricing: "price_value_mismatch",
  price: "price_value_mismatch",
  value: "price_value_mismatch",
  trust: "trust_skepticism",
  scam: "trust_skepticism",
  credibility: "scientific_credibility",
  science: "scientific_credibility",
  shipping: "delivery_logistics",
  delivery: "delivery_logistics",
  logistics: "delivery_logistics",
  positive: "positive_advocacy",
  praise: "positive_advocacy",
  neutral: "neutral_discussion",
  comparison: "competitor_comparison",
  competitor: "competitor_comparison",
};

const JOURNEY_STAGES = ["Discovery", "Purchase", "Setup", "First Use", "Support / Aftercare"];
const numberFmt = new Intl.NumberFormat("en-US");

async function loadSummary() {
  try {
    const response = await fetch(SUMMARY_PATH, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const summary = await response.json();
    renderDashboard(normalizeSummary(summary));
  } catch (error) {
    showFallback(error);
  }
}

function normalizeSummary(summary = {}) {
  const totalMentions = asNumber(summary.total_mentions);
  const negativeMentions = asNumber(summary.negative_mentions);
  const issueCounts = normalizeIssueCounts(summary.issue_category_counts || {});
  const growthByIssue = normalizeGrowthMap(summary.week_over_week_growth_by_issue || {});
  const mentions = normalizeMentions(summary.top_critical_mentions || [], issueCounts);

  return {
    raw: summary,
    totalMentions,
    negativeMentions,
    issueCounts,
    growthByIssue,
    mentions,
  };
}

function normalizeIssueCounts(rawCounts) {
  const normalized = {};

  Object.entries(rawCounts || {}).forEach(([rawKey, rawValue]) => {
    const value = asNumber(rawValue);
    if (value <= 0) return;

    const canonical = mapToCanonicalCategory(rawKey);
    normalized[canonical] = (normalized[canonical] || 0) + value;
  });

  if (!Object.keys(normalized).length) {
    return {
      support_silence: 0,
      onboarding_confusion: 0,
      weak_results: 0,
      trust_skepticism: 0,
      app_connectivity: 0,
    };
  }

  return normalized;
}

function normalizeGrowthMap(rawGrowth) {
  const normalized = {};
  Object.entries(rawGrowth || {}).forEach(([key, value]) => {
    normalized[mapToCanonicalCategory(key)] = Number(value);
  });
  return normalized;
}

function normalizeMentions(items, issueCounts) {
  if (!Array.isArray(items) || !items.length) return [];

  return items.map((item) => {
    const canonical = mapToCanonicalCategory(item.issue_category || item.category || "neutral_discussion", issueCounts);
    return {
      issueCategory: canonical,
      severity: normalizeSeverity(item.severity, canonical),
      source: cleanSource(item.source || item.channel || "Unknown"),
      text: cleanText(item.text || item.quote || "Mention text unavailable."),
      url: cleanUrl(item.url),
    };
  });
}

function renderDashboard(model) {
  renderHeroStrip(model);
  renderIssueLandscape(model);
  renderJourney(model);
  renderActions(model);
  renderVerbatim(model);
  updateTimestamp();
}

function renderHeroStrip(model) {
  const total = model.totalMentions;
  const negatives = model.negativeMentions;
  const shareNegative = pct(negatives, total);
  const trustRisk = scoreBand(shareNegative, [14, 26, 42], true);

  const supportIssueLoad = (model.issueCounts.support_silence || 0) + (model.issueCounts.poor_support_quality || 0);
  const resultsIssueLoad = (model.issueCounts.no_results || 0) + (model.issueCounts.weak_results || 0);
  const conversionLoad = (model.issueCounts.price_value_mismatch || 0) + (model.issueCounts.delivery_logistics || 0) + (model.issueCounts.competitor_comparison || 0);
  const retentionLoad = supportIssueLoad + resultsIssueLoad + (model.issueCounts.comfort_fit || 0);

  const healthValue = Math.max(0, 100 - Math.round(shareNegative * 0.9 + pct(supportIssueLoad, total) * 0.6));

  setMetricCard("hero-health", {
    label: "Reputation Health",
    value: `${healthValue}`,
    sub: `${sentimentWord(healthValue)} brand outlook`,
    severity: scoreBand(100 - healthValue, [25, 45, 62], true),
  });

  setMetricCard("hero-trust", {
    label: "Trust Risk",
    value: `${Math.round(shareNegative)}%`,
    sub: `${trendLabel(model.growthByIssue.trust_skepticism)} trust concerns`,
    severity: trustRisk,
  });

  setMetricCard("hero-support", {
    label: "Support Gap",
    value: `${Math.round(pct(supportIssueLoad, total))}%`,
    sub: `${numberFmt.format(supportIssueLoad)} mentions about slow or poor support`,
    severity: scoreBand(pct(supportIssueLoad, total), [10, 17, 30], true),
  });

  setMetricCard("hero-conversion", {
    label: "Purchase Friction",
    value: `${Math.round(pct(conversionLoad, total))}%`,
    sub: `${trendLabel(avg([model.growthByIssue.price_value_mismatch, model.growthByIssue.competitor_comparison]))} pressure at purchase`,
    severity: scoreBand(pct(conversionLoad, total), [10, 18, 28], true),
  });

  setMetricCard("hero-retention", {
    label: "Post-Purchase Friction",
    value: `${Math.round(pct(retentionLoad, total))}%`,
    sub: `${trendLabel(avg([model.growthByIssue.no_results, model.growthByIssue.support_silence]))} post-purchase customer struggles`,
    severity: scoreBand(pct(retentionLoad, total), [14, 26, 40], true),
  });

  setMetricCard("hero-mentions", {
    label: "Total Mentions",
    value: numberFmt.format(total),
    sub: total ? `${numberFmt.format(negatives)} mentions that may weaken trust` : "Waiting for this week’s mentions",
    severity: total >= 100 ? "low" : "medium",
  });
}

function setMetricCard(id, data) {
  const el = document.getElementById(id);
  el.dataset.severity = data.severity;
  el.innerHTML = `
    <p class="metric-label">${data.label}</p>
    <p class="metric-value">${data.value}</p>
    <p class="metric-sub">${data.sub}</p>
  `;
}

function renderIssueLandscape(model) {
  const host = document.getElementById("issue-landscape-list");
  host.innerHTML = "";

  const ranked = rankIssues(model.issueCounts).slice(0, 10);
  if (!ranked.length) {
    host.innerHTML = `<li class="empty-state">No issue categories were captured this week.</li>`;
    return;
  }

  const totalIssueSignals = ranked.reduce((sum, item) => sum + item.count, 0);
  const maxCount = Math.max(...ranked.map((item) => item.count), 1);

  ranked.forEach((item) => {
    const trend = trendLabel(model.growthByIssue[item.key]);
    const share = pct(item.count, totalIssueSignals);
    const width = Math.max(4, Math.round((item.count / maxCount) * 100));

    const row = document.createElement("li");
    row.className = "issue-row";
    row.innerHTML = `
      <div class="issue-head">
        <p class="issue-title"><span class="severity-dot" style="color:${severityColor(item.severity)}"></span>${item.icon} ${item.label}</p>
        <span class="issue-count">${numberFmt.format(item.count)} mentions · ${Math.round(share)}%</span>
      </div>
      <div class="issue-track"><div class="issue-fill" style="width:${width}%"></div></div>
      <div class="issue-foot">
        <span class="issue-trend">Trend: <strong>${trend}</strong></span>
        <span class="issue-source">Primary stage: ${item.stage}</span>
      </div>
    `;

    host.appendChild(row);
  });
}

function renderJourney(model) {
  const host = document.getElementById("journey-track");
  host.innerHTML = "";

  const stageMap = JOURNEY_STAGES.map((stage) => {
    const entries = rankIssues(model.issueCounts).filter((item) => item.stage === stage);
    const count = entries.reduce((sum, item) => sum + item.count, 0);
    const topIssue = entries[0];
    return { stage, count, topIssue };
  });

  const maxCount = Math.max(...stageMap.map((s) => s.count), 1);
  stageMap.forEach((item) => {
    const intensity = maxCount > 0 ? Math.round((item.count / maxCount) * 100) : 0;
    const step = document.createElement("article");
    step.className = "journey-step";
    step.innerHTML = `
      <p class="step-name">${item.stage}</p>
      <p class="step-intensity">${intensity}%</p>
      <p class="step-top-issue">Main pain point: ${item.topIssue ? item.topIssue.label : "No clear pain point"}</p>
      <p class="step-signals">${numberFmt.format(item.count)} related mentions</p>
    `;
    host.appendChild(step);
  });
}

function renderActions(model) {
  const host = document.getElementById("action-priorities");
  host.innerHTML = "";

  const provided = Array.isArray(model.raw.recommended_actions) ? model.raw.recommended_actions : [];
  const generated = buildActionPriorities(model);
  const actions = generated.map((item, index) => {
    const external = provided[index];
    if (!external) return item;
    return {
      ...item,
      title: cleanText(external, 120),
    };
  });

  actions.slice(0, 3).forEach((action) => {
    const li = document.createElement("li");
    li.className = "action-item";
    li.innerHTML = `
      <div class="action-head">
        <p class="action-title">${action.title}</p>
        <span class="impact-chip" data-impact="${action.impact.toLowerCase()}">${action.impact} impact</span>
      </div>
      <p class="action-rationale">${action.rationale}</p>
    `;
    host.appendChild(li);
  });
}

function buildActionPriorities(model) {
  const ranked = rankIssues(model.issueCounts);
  const top = ranked[0]?.label || "Support Silence";
  const second = ranked[1]?.label || "No Results";

  return [
    {
      title: `Resolve ${top} in a 7-day sprint`,
      impact: "High",
      rationale: "This is the largest issue cluster and likely the biggest drag on trust.",
    },
    {
      title: `Launch a guided fix flow for ${second.toLowerCase()}`,
      impact: "Medium",
      rationale: "Clear guidance and expectations can cut first-use frustration and repeat complaints.",
    },
    {
      title: "Create a clear escalation path in Support / Aftercare",
      impact: "High",
      rationale: "Assign owners for unresolved high-severity mentions and reduce response time.",
    },
  ];
}

function renderVerbatim(model) {
  const host = document.getElementById("verbatim-feed");
  host.innerHTML = "";

  if (!model.mentions.length) {
    host.innerHTML = `<li class="empty-state">No critical mentions were captured this week.</li>`;
    return;
  }

  model.mentions.slice(0, 5).forEach((mention) => {
    const meta = CATEGORY_META[mention.issueCategory] || CATEGORY_META.neutral_discussion;
    const li = document.createElement("li");
    li.className = mention.url ? "mention-item mention-item-link" : "mention-item";
    li.innerHTML = `
      <div class="mention-meta">
        <span class="meta-chip">${meta.label}</span>
        <span class="meta-chip">${mention.severity}</span>
        <span class="meta-chip">${mention.source}</span>
      </div>
      <p class="mention-quote">“${mention.text}”</p>
      ${mention.url ? `<a class="mention-link" href="${mention.url}" target="_blank" rel="noopener noreferrer" aria-label="Open source mention from ${mention.source}">Open source mention ↗</a>` : ""}
    `;

    if (mention.url) {
      li.tabIndex = 0;
      li.addEventListener("click", (event) => {
        if (event.target.closest("a")) return;
        window.open(mention.url, "_blank", "noopener,noreferrer");
      });
      li.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        window.open(mention.url, "_blank", "noopener,noreferrer");
      });
    }

    host.appendChild(li);
  });
}

function showFallback(error) {
  console.warn("Could not load weekly summary.", error);
  document.getElementById("fallback-message").classList.remove("hidden");
  const emptyModel = normalizeSummary({
    total_mentions: 0,
    negative_mentions: 0,
    issue_category_counts: {},
    top_critical_mentions: [],
    recommended_actions: [],
  });
  renderDashboard(emptyModel);
  updateTimestamp("Data unavailable");
}

function rankIssues(issueCounts) {
  return Object.entries(issueCounts || {})
    .filter(([, count]) => asNumber(count) >= 0)
    .map(([key, count]) => {
      const meta = CATEGORY_META[key] || CATEGORY_META.neutral_discussion;
      return {
        key,
        count: asNumber(count),
        label: meta.label,
        icon: meta.icon,
        severity: meta.severity,
        stage: meta.stage,
      };
    })
    .sort((a, b) => b.count - a.count)
    .filter((item, index) => index < 6 || item.count > 0);
}

function mapToCanonicalCategory(rawKey, existingCounts = {}) {
  const key = String(rawKey || "").trim().toLowerCase();

  if (!key || key === "other" || key === "misc" || key === "general") {
    const fallback = inferCategoryFromContext(key, existingCounts);
    return fallback || "neutral_discussion";
  }

  if (CATEGORY_META[key]) return key;

  const fromLegacy = Object.entries(LEGACY_CATEGORY_MAP).find(([token]) => key.includes(token));
  if (fromLegacy) return fromLegacy[1];

  return inferCategoryFromContext(key, existingCounts) || "neutral_discussion";
}

function inferCategoryFromContext(key, existingCounts = {}) {
  const ranked = Object.entries(existingCounts || {}).sort((a, b) => asNumber(b[1]) - asNumber(a[1]));
  const currentTop = ranked[0]?.[0];

  if (key.includes("ship") || key.includes("deliver")) return "delivery_logistics";
  if (key.includes("support") || key.includes("reply")) return "poor_support_quality";
  if (key.includes("result") || key.includes("effect")) return currentTop === "no_results" ? "no_results" : "weak_results";
  if (key.includes("price") || key.includes("cost")) return "price_value_mismatch";
  if (key.includes("trust") || key.includes("scam")) return "trust_skepticism";
  if (key.includes("setup") || key.includes("onboard")) return "onboarding_confusion";
  if (key.includes("connect") || key.includes("app") || key.includes("bluetooth")) return "app_connectivity";

  return null;
}

function normalizeSeverity(rawSeverity, categoryKey) {
  const sev = String(rawSeverity || "").toLowerCase();
  if (sev.includes("critical")) return "critical";
  if (sev.includes("high")) return "high";
  if (sev.includes("med")) return "medium";
  if (sev.includes("low")) return "low";
  return CATEGORY_META[categoryKey]?.severity || "medium";
}

function severityColor(severity) {
  if (severity === "critical") return "#ff5f73";
  if (severity === "high") return "#ff9b62";
  if (severity === "medium") return "#f2b24d";
  return "#6fe3bf";
}

function trendLabel(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "stable";
  if (n > 0.06) return `▲ up ${Math.round(n * 100)}%`;
  if (n < -0.06) return `▼ down ${Math.round(Math.abs(n) * 100)}%`;
  return "stable";
}

function sentimentWord(score) {
  if (score >= 78) return "strong";
  if (score >= 56) return "caution";
  return "at risk";
}

function scoreBand(value, thresholds = [20, 35, 50], inverse = false) {
  const [a, b, c] = thresholds;
  if (inverse) {
    if (value >= c) return "critical";
    if (value >= b) return "high";
    if (value >= a) return "medium";
    return "low";
  }
  if (value <= a) return "low";
  if (value <= b) return "medium";
  if (value <= c) return "high";
  return "critical";
}

function cleanSource(source) {
  const text = String(source).trim();
  if (!text) return "Unknown";
  return text.slice(0, 24);
}

function cleanText(text, max = 180) {
  return String(text).replace(/\s+/g, " ").trim().slice(0, max);
}

function cleanUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  return /^https?:\/\//i.test(raw) ? raw : "";
}

function updateTimestamp(prefix = "Updated") {
  const el = document.getElementById("last-updated");
  const stamp = new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  el.textContent = `${prefix}: ${stamp}`;
}

function pct(part, total) {
  const t = asNumber(total);
  if (t <= 0) return 0;
  return (asNumber(part) / t) * 100;
}

function avg(values = []) {
  const nums = values.map(Number).filter(Number.isFinite);
  if (!nums.length) return Number.NaN;
  return nums.reduce((sum, n) => sum + n, 0) / nums.length;
}

function asNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

loadSummary();
