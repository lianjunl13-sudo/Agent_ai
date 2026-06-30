const HISTORY_KEY = "agent-ai-search-history";
const THEME_KEY = "agent-ai-theme";

const body = document.body;
const searchForm = document.querySelector("#search-form");
const submitButton = document.querySelector("#submit-button");
const historyList = document.querySelector("#history-list");
const pageTitle = document.querySelector("#page-title");
const contentArea = document.querySelector("#content-area");
const formView = document.querySelector("#form-view");
const progressView = document.querySelector("#progress-view");
const resultsView = document.querySelector("#results-view");
const resultsContainer = document.querySelector("#results-container");
const progressHint = document.querySelector("#progress-hint");
const connectionStatus = document.querySelector("#connection-status");
const sidebar = document.querySelector("#sidebar");
const sidebarOverlay = document.querySelector("#sidebar-overlay");
const themeIcon = document.querySelector("#theme-icon");
const themeLabel = document.querySelector("#theme-label");

const userId = localStorage.getItem("agent-ai-user") || crypto.randomUUID();
localStorage.setItem("agent-ai-user", userId);

let searchHistory = loadHistory();
let activeHistoryId = "";
let progressTimer = null;

configureMarkdown();
loadTheme();
renderHistory();
checkHealth();

document.querySelector("#new-search-button").addEventListener("click", newSearch);
document.querySelector("#theme-toggle").addEventListener("click", toggleTheme);
document.querySelector("#sidebar-toggle").addEventListener("click", toggleSidebar);
sidebarOverlay.addEventListener("click", closeSidebar);
searchForm.addEventListener("submit", submitSearch);

async function submitSearch(event) {
  event.preventDefault();

  const inputs = getInputs();
  if (!inputs.research_topic) {
    return;
  }

  pageTitle.textContent = inputs.research_topic;
  showView("progress");
  setLoading(true);
  setProgressStep("start");
  closeSidebar();

  const startedAt = Date.now();
  progressTimer = window.setInterval(() => {
    const seconds = Math.floor((Date.now() - startedAt) / 1000);
    progressHint.textContent = `Dify 工作流执行中，已等待 ${seconds} 秒...`;
    if (seconds > 4) setProgressStep("retrieve");
    if (seconds > 24) setProgressStep("synthesize");
  }, 1000);

  try {
    const response = await fetch("/api/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs,
        user: userId
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "请求失败，请稍后再试。");
    }

    const answer = data.answer || "Dify 已完成任务，但没有返回可展示文本。";
    setProgressStep("synthesize", true);

    const item = {
      id: crypto.randomUUID(),
      topic: inputs.research_topic,
      taskType: inputs.task_type,
      timestamp: Date.now(),
      result: answer,
      status: answer ? "succeeded" : "empty",
      elapsedTime: data.elapsedTime || null
    };
    searchHistory.unshift(item);
    activeHistoryId = item.id;
    saveHistory();
    renderHistory();
    showResults(item);
  } catch (error) {
    const item = {
      id: crypto.randomUUID(),
      topic: inputs.research_topic,
      taskType: inputs.task_type,
      timestamp: Date.now(),
      result: "",
      status: "failed",
      error: error.message
    };
    searchHistory.unshift(item);
    activeHistoryId = item.id;
    saveHistory();
    renderHistory();
    showError(item);
  } finally {
    window.clearInterval(progressTimer);
    setLoading(false);
  }
}

function getInputs() {
  const formData = new FormData(searchForm);
  return {
    research_topic: String(formData.get("research_topic") || "").trim(),
    task_type: String(formData.get("task_type") || "快速综述"),
    max_results: Number(formData.get("max_results") || 5),
    year_from: String(formData.get("year_from") || "").trim(),
    preferred_sources: String(formData.get("preferred_sources") || "arXiv only"),
    output_language: String(formData.get("output_language") || "中文"),
    custom_constraints: String(formData.get("custom_constraints") || "").trim()
  };
}

function showResults(item) {
  showView("results");
  pageTitle.textContent = item.topic;
  resultsContainer.innerHTML = `
    <article class="result-card">
      <header class="result-header">
        <div class="result-icon">📚</div>
        <div>
          <div class="result-title">${escapeHtml(item.topic)}</div>
          <div class="result-meta">${new Date(item.timestamp).toLocaleString()} · ${escapeHtml(item.taskType)}${item.elapsedTime ? ` · ${Math.round(item.elapsedTime)}s` : ""}</div>
        </div>
        <div class="result-actions">
          <button class="small-button" id="copy-result-button" type="button">复制</button>
        </div>
      </header>
      <div class="result-content">${renderMarkdown(item.result)}</div>
    </article>
  `;

  document.querySelector("#copy-result-button").addEventListener("click", async (event) => {
    await navigator.clipboard.writeText(item.result);
    event.currentTarget.textContent = "已复制";
    window.setTimeout(() => {
      event.currentTarget.textContent = "复制";
    }, 1200);
  });

  highlightCode();
  contentArea.scrollTop = 0;
}

function showError(item) {
  showView("results");
  pageTitle.textContent = item.topic;
  resultsContainer.innerHTML = `
    <article class="result-card">
      <header class="result-header">
        <div class="result-icon">!</div>
        <div>
          <div class="result-title">请求失败</div>
          <div class="result-meta">${new Date(item.timestamp).toLocaleString()}</div>
        </div>
      </header>
      <div class="result-content">
        <p style="color:var(--error-color);">${escapeHtml(item.error || "未知错误")}</p>
        <p>可以先切换为 <code>arXiv only</code>，减少外部检索源超时概率。</p>
      </div>
    </article>
  `;
}

function renderHistory() {
  if (!searchHistory.length) {
    historyList.innerHTML = '<div class="empty-state">暂无检索记录</div>';
    return;
  }

  historyList.innerHTML = "";
  for (const item of searchHistory) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `chat-item${item.id === activeHistoryId ? " active" : ""}`;
    button.innerHTML = `
      <span>${item.status === "failed" ? "×" : "✓"}</span>
      <span class="chat-item-title">${escapeHtml(item.topic)}</span>
    `;
    button.addEventListener("click", () => {
      activeHistoryId = item.id;
      renderHistory();
      if (item.status === "failed") {
        showError(item);
      } else {
        showResults(item);
      }
      closeSidebar();
    });
    historyList.append(button);
  }
}

function newSearch() {
  searchForm.reset();
  activeHistoryId = "";
  pageTitle.textContent = "论文检索";
  showView("form");
  renderHistory();
  closeSidebar();
  searchForm.elements.namedItem("research_topic").focus();
}

function showView(view) {
  formView.hidden = view !== "form";
  progressView.hidden = view !== "progress";
  resultsView.hidden = view !== "results";
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.innerHTML = isLoading
    ? '<div class="spinner"></div><span>检索中...</span>'
    : "<span>开始检索</span>";
}

function setProgressStep(step, completeAll = false) {
  const order = ["start", "retrieve", "synthesize"];
  for (const element of document.querySelectorAll(".progress-step")) {
    const current = element.dataset.step;
    const currentIndex = order.indexOf(current);
    const targetIndex = order.indexOf(step);
    element.classList.remove("active", "completed", "pending");
    if (completeAll || currentIndex < targetIndex) {
      element.classList.add("completed");
    } else if (current === step) {
      element.classList.add("active");
    } else {
      element.classList.add("pending");
    }
  }
}

async function checkHealth() {
  try {
    const response = await fetch("/api/health");
    const data = await response.json();
    connectionStatus.textContent = data.hasDifyKey ? "已连接 Dify 服务" : "服务器未配置 Dify Key";
  } catch {
    connectionStatus.textContent = "服务连接异常";
  }
}

function renderMarkdown(text) {
  const source = String(text || "").trim();
  if (!source) {
    return '<p style="color:var(--text-tertiary);">暂无输出内容。</p>';
  }

  if (window.marked) {
    return window.marked.parse(source);
  }

  return `<pre>${escapeHtml(source)}</pre>`;
}

function configureMarkdown() {
  if (!window.marked) {
    return;
  }

  window.marked.setOptions({
    breaks: true,
    gfm: true
  });
}

function highlightCode() {
  if (window.hljs) {
    window.hljs.highlightAll();
  }
}

function loadHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveHistory() {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(searchHistory.slice(0, 30)));
}

function toggleSidebar() {
  sidebar.classList.toggle("open");
  sidebarOverlay.classList.toggle("show");
}

function closeSidebar() {
  sidebar.classList.remove("open");
  sidebarOverlay.classList.remove("show");
}

function toggleTheme() {
  body.classList.toggle("dark");
  localStorage.setItem(THEME_KEY, body.classList.contains("dark") ? "dark" : "light");
  updateThemeUi();
}

function loadTheme() {
  const saved = localStorage.getItem(THEME_KEY) || "dark";
  body.classList.toggle("dark", saved === "dark");
  updateThemeUi();
}

function updateThemeUi() {
  const isDark = body.classList.contains("dark");
  themeIcon.textContent = isDark ? "☀" : "☾";
  themeLabel.textContent = isDark ? "浅色模式" : "深色模式";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
