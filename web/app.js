const SUMMARY_PATH = "../data/weekly_summary.json";

const SOURCE_ORDER = ["Reddit", "Reviews", "Web", "YouTube"];
const NETWORK_NODE_POSITION = {
  Reddit: { x: 20, y: 24 },
  Reviews: { x: 82, y: 24 },
  Web: { x: 22, y: 80 },
  YouTube: { x: 80, y: 80 },
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

  const sourceStats = deriveSourceStats(summary, totalMentions, negativeMentions);
  renderSignalNetwork(sourceStats, totalMentions, negativeMentions);
  renderIssueBars(summary.issue_category_counts);
  renderCriticalMentions(summary.top_critical_mentions);
  renderInsights(summary, sourceStats, totalMentions);
  renderActionList(summary.recommended_actions, summary, sourceStats);
  updateTimestamp();
}

function renderSignalNetwork(sourceStats, totalMentions, negativeMentions) {
  const host = document.getElementById("signal-network");
  host.innerHTML = "";

  const avgNegative = totalMentions > 0 ? Math.round((negativeMentions / totalMentions) * 100) : 0;
  const centralNode = createNode({
    title: "Pulsetto",
    mentions: totalMentions,
    negativePct: avgNegative,
    urgencyLabel: resolveUrgencyLabel(negativeMentions, totalMentions),
  }, true);

  centralNode.style.left = "50%";
  centralNode.style.top = "50%";
  host.appendChild(centralNode);

  const svg = createNetworkLines(sourceStats);
  host.appendChild(svg);

  sourceStats.forEach((source) => {
    const node = createNode(source, false);
    const position = NETWORK_NODE_POSITION[source.name] ?? { x: 50, y: 50 };
    node.style.left = `${position.x}%`;
    node.style.top = `${position.y}%`;
    host.appendChild(node);
  });
}

function createNetworkLines(sourceStats) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.classList.add("network-lines");

  sourceStats.forEach((source) => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const position = NETWORK_NODE_POSITION[source.name] ?? { x: 50, y: 50 };
    const controlX = (50 + position.x) / 2;
    const controlY = (50 + position.y) / 2 - (position.y > 50 ? 5 : -5);
    path.setAttribute("d", `M 50 50 Q ${controlX} ${controlY}, ${position.x} ${position.y}`);
    path.classList.add("network-line");
    path.style.stroke = getSignalColor(source.negativePct);
    svg.appendChild(path);
  });

  return svg;
}

function createNode(source, isCenter = false) {
  const node = document.createElement("article");
  node.className = `network-node ${isCenter ? "center" : ""}`;
  const statusClass = getSignalStatusClass(source.negativePct);

  node.innerHTML = `
    <p class="node-title">${source.title ?? source.name}</p>
    <div class="node-meta">
      <span>${numberFmt.format(source.mentions)} mentions</span>
      <span>${source.negativePct}% negative</span>
      <span>Urgency: ${source.urgencyLabel}</span>
    </div>
    <span class="node-sentiment ${statusClass}">${getSentimentLabel(source.negativePct)}</span>
  `;

  return node;
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
    return {
      name,
      mentions,
      negativePct,
      urgent,
      urgencyLabel: resolveUrgencyLabel(urgent, mentions),
    };
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

function renderInsights(summary, sourceStats, totalMentions) {
  const host = document.getElementById("insights-list");
  host.innerHTML = "";

  const topIssue = getTopKey(summary.issue_category_counts) ?? "No dominant issue yet";
  const fastestGrowing = getTopKey(summary.week_over_week_growth_by_issue) ?? "Awaiting week-over-week growth input";
  const trustRisk = deriveTrustRiskLevel(sourceStats);
  const unanswered = asNumber(summary.unanswered_mentions);
  const supportFailure = totalMentions > 0 && unanswered / totalMentions >= 0.25
    ? `⚠️ Elevated (${numberFmt.format(unanswered)} unanswered mentions)`
    : `Stable (${numberFmt.format(unanswered)} unanswered mentions)`;

  const insights = [
    `Top issue: ${topIssue}`,
    `Fastest growing issue: ${fastestGrowing}`,
    `Trust risk level: ${trustRisk}`,
    `Support failure indicator: ${supportFailure}`,
  ];

  insights.forEach((insight) => {
    const li = document.createElement("li");
    li.textContent = insight;
    host.appendChild(li);
  });
}

function renderActionList(actions = [], summary = {}, sourceStats = []) {
  const host = document.getElementById("action-list");
  host.innerHTML = "";

  const fallbackActions = buildFallbackActions(summary, sourceStats);
  const chosenActions = Array.isArray(actions) && actions.length
    ? actions.slice(0, 3)
    : fallbackActions;

  while (chosenActions.length < 3) {
    chosenActions.push(fallbackActions[chosenActions.length] ?? "Continue weekly pulse checks and monitor escalation velocity.");
  }

  chosenActions.slice(0, 3).forEach((action) => {
    const li = document.createElement("li");
    li.textContent = action;
    host.appendChild(li);
  });
}

function buildFallbackActions(summary = {}, sourceStats = []) {
  const topIssue = getTopKey(summary.issue_category_counts) ?? "highest-frequency issue";
  const highestRiskChannel = [...sourceStats].sort((a, b) => b.negativePct - a.negativePct)[0]?.name ?? "priority channels";

  return [
    `Launch a 72-hour remediation sprint for ${topIssue} with daily progress reporting.`,
    `Deploy targeted response playbooks across ${highestRiskChannel} and close unanswered mentions within 12 hours.`,
    "Publish a trust-recovery update outlining fixes, timelines, and support ownership.",
  ];
}

function deriveTrustRiskLevel(sourceStats = []) {
  const highestNegative = Math.max(...sourceStats.map((item) => item.negativePct), 0);
  if (highestNegative >= 65) return "High";
  if (highestNegative >= 35) return "Moderate";
  return "Low";
}

function resolveUrgencyLabel(urgentMentions, mentions) {
  const urgent = asNumber(urgentMentions);
  const total = asNumber(mentions);
  const ratio = total > 0 ? urgent / total : 0;

  if (ratio >= 0.3 || urgent >= 25) return "High";
  if (ratio >= 0.15 || urgent >= 10) return "Medium";
  return "Low";
}

function getSentimentLabel(negativePct) {
  if (negativePct >= 55) return "Negative";
  if (negativePct >= 30) return "Mixed";
  return "Positive";
}

function getSignalStatusClass(negativePct) {
  if (negativePct >= 55) return "status-negative";
  if (negativePct >= 30) return "status-mixed";
  return "status-positive";
}

function getSignalColor(negativePct) {
  if (negativePct >= 55) return "#ff5d6f";
  if (negativePct >= 30) return "#f4c95d";
  return "#31d78f";
}

function showFallback(error) {
  console.warn("Could not load weekly summary.", error);
  document.getElementById("fallback-message").classList.remove("hidden");
  updateTimestamp("Data unavailable");
  const emptyStats = deriveSourceStats({}, 0, 0);
  renderSignalNetwork(emptyStats, 0, 0);
  renderIssueBars({});
  renderCriticalMentions([]);
  renderInsights({}, emptyStats, 0);
  renderActionList([], {}, emptyStats);
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
