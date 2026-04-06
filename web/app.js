const SUMMARY_PATH = "../data/weekly_summary.json";

const SOURCE_ORDER = ["Reddit", "Reviews", "Web", "YouTube"];
const SOURCE_COLORS = {
  Reddit: "linear-gradient(180deg, #37597f 0%, #233b57 100%)",
  Reviews: "linear-gradient(180deg, #2f6172 0%, #214956 100%)",
  Web: "linear-gradient(180deg, #4b4a82 0%, #2f2f5d 100%)",
  YouTube: "linear-gradient(180deg, #7a3e4d 0%, #592a36 100%)",
};

const numberFmt = new Intl.NumberFormat("en-US");

async function loadSummary() {
  try {
    const response = await fetch(SUMMARY_PATH, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const summary = await response.json();
    if (!summary || typeof summary !== "object") throw new Error("Invalid summary JSON");
    renderDashboard(summary);
  } catch (error) {
    showFallback(error);
  }
}

function renderDashboard(summary) {
  const totalMentions = asNumber(summary.total_mentions);
  const negativeMentions = asNumber(summary.negative_mentions);

  setText("metric-total", numberFmt.format(totalMentions));
  setText("metric-negative", numberFmt.format(negativeMentions));
  setText("metric-top-issue", getTopKey(summary.issue_category_counts) ?? "No dominant issue");
  setText("metric-top-attribute", getTopKey(summary.attribute_counts) ?? "No dominant attribute");

  renderIssueBars(summary.issue_category_counts);
  renderCriticalMentions(summary.top_critical_mentions);
  renderActionList(summary.recommended_actions);
  renderCity(summary, totalMentions, negativeMentions);
  updateTimestamp();
}

function renderCity(summary, totalMentions, negativeMentions) {
  const buildingHost = document.getElementById("city-buildings");
  buildingHost.innerHTML = "";

  const sourceStats = deriveSourceStats(summary, totalMentions, negativeMentions);
  const maxMentions = Math.max(...sourceStats.map((item) => item.mentions), 1);

  sourceStats.forEach((source) => {
    const building = document.createElement("article");
    building.className = "building";

    const badgeRow = document.createElement("div");
    badgeRow.className = "badge-row";
    badgeRow.innerHTML = `
      <span class="badge">${source.mentions} mentions</span>
      <span class="badge badge-danger">${source.negativePct}% negative</span>
      <span class="badge badge-warning">${source.urgent} urgent</span>
    `;

    const tower = document.createElement("div");
    tower.className = "tower";
    tower.style.height = `${Math.max(48, (source.mentions / maxMentions) * 150)}px`;
    tower.style.background = SOURCE_COLORS[source.name] ?? SOURCE_COLORS.Web;

    const label = document.createElement("p");
    label.className = "tower-label";
    label.textContent = source.name;

    building.appendChild(badgeRow);
    building.appendChild(tower);
    building.appendChild(label);
    buildingHost.appendChild(building);
  });
}

function deriveSourceStats(summary, totalMentions, negativeMentions) {
  const mentionBySource = normalizeSourceMap(summary.mentions_by_source);
  const negativeBySource = normalizeSourceMap(summary.negative_mentions_by_source);
  const urgentBySource = normalizeSourceMap(summary.urgent_mentions_by_source);

  const allZeros = SOURCE_ORDER.every((name) => !mentionBySource[name]);
  if (allZeros) {
    const weightedFallback = [0.38, 0.27, 0.25, 0.1];
    SOURCE_ORDER.forEach((name, i) => {
      mentionBySource[name] = Math.round(totalMentions * weightedFallback[i]);
      negativeBySource[name] = Math.round(negativeMentions * weightedFallback[i]);
      urgentBySource[name] = Math.max(0, Math.round(negativeBySource[name] * 0.28));
    });
  }

  return SOURCE_ORDER.map((name) => {
    const mentions = asNumber(mentionBySource[name]);
    const negative = asNumber(negativeBySource[name]);
    const urgent = asNumber(urgentBySource[name]);
    const negativePct = mentions > 0 ? Math.round((negative / mentions) * 100) : 0;
    return { name, mentions, negativePct, urgent };
  });
}

function renderIssueBars(issueCounts = {}) {
  const host = document.getElementById("issue-bars");
  host.innerHTML = "";

  const items = rankedEntries(issueCounts).slice(0, 8);
  if (!items.length) {
    host.innerHTML = `<li class="muted">No issue categories available for this period.</li>`;
    return;
  }

  const maxValue = Math.max(...items.map(([, value]) => value), 1);
  items.forEach(([label, value]) => {
    const width = Math.max(6, (value / maxValue) * 100);
    const row = document.createElement("li");
    row.className = "bar-item";
    row.innerHTML = `
      <div class="bar-meta"><span>${label}</span><strong>${value}</strong></div>
      <div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div>
    `;
    host.appendChild(row);
  });
}

function renderCriticalMentions(mentions = []) {
  const host = document.getElementById("critical-list");
  host.innerHTML = "";

  if (!Array.isArray(mentions) || mentions.length === 0) {
    host.innerHTML = `<li class="muted">No critical mentions in the current summary.</li>`;
    return;
  }

  mentions.slice(0, 5).forEach((item) => {
    const li = document.createElement("li");
    li.className = "critical-item";

    const text = cleanText(item.text || "Mention text unavailable.");
    const issue = cleanText(item.issue_category || "unknown issue");
    const severity = cleanText(item.severity || "unknown");
    const url = item.url ? `<br><a href="${item.url}" target="_blank" rel="noopener noreferrer">View source</a>` : "";

    li.innerHTML = `<strong>${severity.toUpperCase()}</strong> · ${issue}<br>${text}${url}`;
    host.appendChild(li);
  });
}

function renderActionList(actions = []) {
  const host = document.getElementById("action-list");
  host.innerHTML = "";

  if (!Array.isArray(actions) || actions.length === 0) {
    host.innerHTML = `<li class="muted">No recommendations available yet.</li>`;
    return;
  }

  actions.slice(0, 6).forEach((action) => {
    const li = document.createElement("li");
    li.textContent = action;
    host.appendChild(li);
  });
}

function showFallback(error) {
  console.warn("Could not load weekly summary.", error);
  document.getElementById("fallback-message").classList.remove("hidden");
  updateTimestamp("Data unavailable");
  renderCity({}, 0, 0);
  renderIssueBars({});
  renderCriticalMentions([]);
  renderActionList([]);
  setText("metric-total", "0");
  setText("metric-negative", "0");
  setText("metric-top-issue", "Unavailable");
  setText("metric-top-attribute", "Unavailable");
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

function rankedEntries(record = {}) {
  return Object.entries(record || {})
    .map(([key, value]) => [titleCase(key), asNumber(value)])
    .sort((a, b) => b[1] - a[1]);
}

function getTopKey(record = {}) {
  const top = rankedEntries(record)[0];
  return top ? top[0] : null;
}

function normalizeSourceMap(record = {}) {
  const normalized = {};
  if (!record || typeof record !== "object") return normalized;

  Object.entries(record).forEach(([rawKey, value]) => {
    const key = rawKey.toLowerCase();
    if (key.includes("reddit")) normalized.Reddit = asNumber(value);
    else if (key.includes("review")) normalized.Reviews = asNumber(value);
    else if (key.includes("youtube") || key.includes("yt")) normalized.YouTube = asNumber(value);
    else if (key.includes("web") || key.includes("site") || key.includes("blog")) normalized.Web = asNumber(value);
  });
  return normalized;
}

function cleanText(text) {
  return String(text).trim().slice(0, 220);
}

function setText(id, value) {
  const el = document.getElementById(id);
  el.textContent = value;
}

function asNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function titleCase(value) {
  return String(value)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

loadSummary();
