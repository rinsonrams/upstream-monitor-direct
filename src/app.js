(function () {
  const SITE_TYPES = [
    { value: 'new_api', label: 'new api' },
    { value: 'sub2api', label: 'sub2api' },
  ];

  const AUTH_MODES = [
    { value: 'manual', label: '手工维护' },
    { value: 'token', label: 'Token' },
    { value: 'token_with_user_id', label: 'Token + User ID' },
    { value: 'cookie', label: 'Cookie' },
  ];

  const STATUS_TYPES = [
    { value: 'normal', label: '正常' },
    { value: 'low_balance', label: '低余额' },
    { value: 'query_failed', label: '查询失败' },
    { value: 'manual_review', label: '待核查' },
    { value: 'not_configured', label: '未配置' },
  ];

  const HELPER_RESULT_PANEL_SCRIPT = [
    '  const showResultPanel = (title, value, extra) => {',
    '    const old = document.getElementById("__upstream_monitor_helper_result");',
    '    if (old) old.remove();',
    '    const box = document.createElement("div");',
    '    box.id = "__upstream_monitor_helper_result";',
    '    box.style.cssText = "position:fixed;right:18px;bottom:18px;z-index:2147483647;width:min(560px,calc(100vw - 36px));background:#fffdf9;border:1px solid #0e6b56;border-radius:14px;box-shadow:0 18px 50px rgba(0,0,0,.2);padding:14px;font:14px/1.5 sans-serif;color:#111;";',
    '    box.innerHTML = "<div data-title style=\\"font-weight:700;margin-bottom:6px;\\"></div><textarea data-value readonly style=\\"width:100%;height:160px;box-sizing:border-box;border:1px solid #ccc;border-radius:10px;padding:10px;font-family:Consolas,monospace;font-size:12px;line-height:1.45;\\"></textarea><div style=\\"display:flex;gap:8px;margin-top:10px;\\"><button data-copy type=\\"button\\">复制内容</button><button data-close type=\\"button\\">关闭</button></div><div data-extra style=\\"margin-top:8px;color:#666;font-size:12px;\\"></div>";',
    '    box.querySelector("[data-title]").textContent = title;',
    '    box.querySelector("[data-extra]").textContent = extra || "复制后填回监控工具。";',
    '    const textarea = box.querySelector("[data-value]");',
    '    textarea.value = value;',
    '    box.querySelector("[data-copy]").onclick = async () => {',
    '      textarea.focus();',
    '      textarea.select();',
    '      try {',
    '        if (navigator.clipboard) await navigator.clipboard.writeText(textarea.value);',
    '        else document.execCommand("copy");',
    '        box.querySelector("[data-copy]").textContent = "已复制";',
    '      } catch {',
    '        box.querySelector("[data-copy]").textContent = "已选中，请 Ctrl+C";',
    '      }',
    '    };',
    '    box.querySelector("[data-close]").onclick = () => box.remove();',
    '    document.body.appendChild(box);',
    '    textarea.focus();',
    '    textarea.select();',
    '  };',
  ].join('\n');

  const NEW_API_HELPER_SCRIPT = [
    '(async () => {',
    HELPER_RESULT_PANEL_SCRIPT,
    '  const idCandidates = [];',
    '  const addId = (value, source) => {',
    '    if (value === null || value === undefined || value === "") return;',
    '    const text = String(value);',
    '    if (/^\\d+$/.test(text) && !idCandidates.some((x) => x.value === text)) {',
    '      idCandidates.push({ value: text, source });',
    '    }',
    '  };',
    '  const walk = (value, source, depth = 0) => {',
    '    if (!value || depth > 4) return;',
    '    if (Array.isArray(value)) {',
    '      value.forEach((item, index) => walk(item, source + "[" + index + "]", depth + 1));',
    '      return;',
    '    }',
    '    if (typeof value === "object") {',
    '      for (const [key, child] of Object.entries(value)) {',
    '        if (/^(id|user_id|userId)$/i.test(key)) addId(child, source + "." + key);',
    '        if (/user|account|profile|self|auth|login/i.test(key)) walk(child, source + "." + key, depth + 1);',
    '      }',
    '    }',
    '  };',
    '  for (const store of [localStorage, sessionStorage]) {',
    '    for (let i = 0; i < store.length; i += 1) {',
    '      const key = store.key(i);',
    '      const raw = store.getItem(key);',
    '      if (!raw) continue;',
    '      if (/user.?id|uid/i.test(key)) addId(raw, key);',
    '      try { walk(JSON.parse(raw), key); } catch {}',
    '    }',
    '  }',
    '  let userId = idCandidates[0]?.value || "";',
    '  if (!userId) userId = prompt("没有自动找到 User ID，请输入当前 new api 用户 ID");',
    '  if (!userId) { alert("没有 User ID，已停止。"); return; }',
    '  const getJson = async (url) => {',
    '    const response = await fetch(url, {',
    '      method: "GET",',
    '      credentials: "include",',
    '      headers: { "New-Api-User": String(userId), "Accept": "application/json" }',
    '    });',
    '    const text = await response.text();',
    '    try { return JSON.parse(text); } catch { return { success: false, status: response.status, raw: text }; }',
    '  };',
    '  const self = await getJson("/api/user/self");',
    '  const tokenResponse = await getJson("/api/user/token");',
    '  const token = tokenResponse?.data || tokenResponse?.token || "";',
    '  console.log("new api helper result", { userId, idCandidates, self, tokenResponse });',
    '  if (!token) {',
    '    alert("没有拿到 token，请看控制台 new api helper result。常见原因：未登录、User ID 不匹配、站点开启了额外验证。");',
    '    return;',
    '  }',
    '  showResultPanel("new api 获取结果", "User ID:\\n" + userId + "\\n\\nAccess Token:\\n" + token, "填回监控工具：鉴权方式 Token + User ID。");',
    '})();',
  ].join('\n');

  const SUB2API_HELPER_SCRIPT = [
    '(async () => {',
    HELPER_RESULT_PANEL_SCRIPT,
    '  const hits = [];',
    '  const addToken = (key, value, source) => {',
    '    if (!value || typeof value !== "string") return;',
    '    const text = value.trim();',
    '    const looksLikeJwt = /^eyJ[a-zA-Z0-9_-]+\\.[a-zA-Z0-9_-]+\\./.test(text);',
    '    const looksUseful = /access.?token|auth.?token|jwt|token/i.test(key) && text.length > 20;',
    '    if ((looksLikeJwt || looksUseful) && !hits.some((x) => x.value === text)) {',
    '      hits.push({ key, value: text, source });',
    '    }',
    '  };',
    '  const walk = (value, source, depth = 0) => {',
    '    if (!value || depth > 5) return;',
    '    if (typeof value === "string") { addToken(source, value, source); return; }',
    '    if (Array.isArray(value)) { value.forEach((item, index) => walk(item, source + "[" + index + "]", depth + 1)); return; }',
    '    if (typeof value === "object") {',
    '      for (const [key, child] of Object.entries(value)) {',
    '        if (/access.?token|auth.?token|jwt|token/i.test(key) && typeof child === "string") addToken(key, child, source + "." + key);',
    '        walk(child, source + "." + key, depth + 1);',
    '      }',
    '    }',
    '  };',
    '  for (const store of [localStorage, sessionStorage]) {',
    '    for (let i = 0; i < store.length; i += 1) {',
    '      const key = store.key(i);',
    '      const raw = store.getItem(key);',
    '      if (!raw) continue;',
    '      addToken(key, raw, key);',
    '      try { walk(JSON.parse(raw), key); } catch {}',
    '    }',
    '  }',
    '  let best = hits.find((x) => /access.?token/i.test(x.key)) || hits.find((x) => /^eyJ/.test(x.value)) || hits[0];',
    '  if (!best && confirm("没有在浏览器存储里找到 token。是否尝试用邮箱密码请求 /api/v1/auth/login？密码只会发给当前站点；但浏览器 prompt 不是密码框，介意请取消。")) {',
    '    const email = prompt("sub2api 登录邮箱");',
    '    const password = prompt("sub2api 登录密码");',
    '    if (email && password) {',
    '      const response = await fetch("/api/v1/auth/login", {',
    '        method: "POST",',
    '        credentials: "include",',
    '        headers: { "Content-Type": "application/json", "Accept": "application/json" },',
    '        body: JSON.stringify({ email, password, turnstile_token: "" })',
    '      });',
    '      const payload = await response.json().catch(() => ({}));',
    '      const data = payload?.data || payload;',
    '      const token = data?.access_token || data?.accessToken || "";',
    '      if (token) best = { key: "access_token", value: token, source: "/api/v1/auth/login" };',
    '      console.log("sub2api login response", payload);',
    '    }',
    '  }',
    '  console.table(hits.map((x) => ({ key: x.key, source: x.source, preview: x.value.slice(0, 80) + (x.value.length > 80 ? "..." : "") })));',
    '  if (!best) { alert("没有找到 access_token。请看控制台输出，或在 Network 里查看 /api/v1/auth/login 响应。"); return; }',
    '  let profile = null;',
    '  try {',
    '    const response = await fetch("/api/v1/user/profile", { headers: { "Authorization": "Bearer " + best.value, "Accept": "application/json" } });',
    '    profile = await response.json();',
    '  } catch (error) { profile = { error: String(error) }; }',
    '  console.log("sub2api helper result", { token: best, profile });',
    '  showResultPanel("sub2api access_token", best.value, "填回监控工具：站点类型 sub2api，鉴权方式 Token，User ID 留空。");',
    '})();',
  ].join('\n');

  const DEFAULT_SITE = {
    id: '',
    name: '',
    type: 'new_api',
    base_url: '',
    login_url: '',
    group_name: '',
    account_label: '',
    auth_mode: 'manual',
    auth_payload: '',
    user_id: '',
    balance_threshold: 20,
    manual_balance: '',
    manual_checked_at: '',
    manual_note: '',
    notes: '',
    enabled: true,
  };

  const EXAMPLE_SITES = [
    {
      id: 'site-newapi-demo',
      name: 'demo-newapi',
      type: 'new_api',
      base_url: 'https://example-newapi.com',
      login_url: 'https://example-newapi.com/login',
      group_name: '主力池',
      account_label: 'operator@example.com',
      auth_mode: 'manual',
      auth_payload: '',
      user_id: '',
      balance_threshold: 20,
      manual_balance: 0,
      manual_checked_at: '',
      manual_note: '',
      notes: '示例站点',
      enabled: true,
    },
    {
      id: 'site-sub2api-demo',
      name: 'demo-sub2api',
      type: 'sub2api',
      base_url: 'https://example-sub2api.com',
      login_url: 'https://example-sub2api.com/login',
      group_name: '备用池',
      account_label: 'reseller-01',
      auth_mode: 'manual',
      auth_payload: '',
      user_id: '',
      balance_threshold: 20,
      manual_balance: 0,
      manual_checked_at: '',
      manual_note: '',
      notes: '示例站点',
      enabled: true,
    },
  ];

  const STORAGE_KEY = 'upstream-monitor-sites-v1';
  const RESULT_STORAGE_KEY = 'upstream-monitor-results-v1';
  const LOCAL_HISTORY_STORAGE_KEY = 'upstream-monitor-local-history-v1';
  const DIRECT_MODE_STORAGE_KEY = 'upstream-monitor-direct-mode-v1';
  const AUTO_REFRESH_STORAGE_KEY = 'upstream-monitor-auto-refresh-seconds-v1';
  const COLLECTOR_SERVER_URL = getCollectorServerUrl();
  const app = document.getElementById('app');

  let sites = loadSites();
  let autoResults = loadAutoResults();
  let localHistory = loadLocalHistory();
  let serverStatus = null;
  let historySummary = null;
  let selectedHistory = null;
  let editingId = null;
  let editingDraft = null;
  let directMode = loadDirectMode();
  let autoRefreshSeconds = loadAutoRefreshSeconds();
  let autoRefreshTimer = null;
  let collectionState = {
    running: false,
    message: '',
  };
  let filters = {
    keyword: '',
    status: 'all',
    type: 'all',
  };

  function loadSites() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveSites() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sites));
    saveSitesToServer();
  }

  function loadAutoResults() {
    try {
      const raw = localStorage.getItem(RESULT_STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  function saveAutoResults() {
    localStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(autoResults));
  }

  function loadLocalHistory() {
    try {
      const raw = localStorage.getItem(LOCAL_HISTORY_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveLocalHistory() {
    localStorage.setItem(LOCAL_HISTORY_STORAGE_KEY, JSON.stringify(localHistory.slice(0, 1000)));
  }

  function loadDirectMode() {
    try {
      const raw = localStorage.getItem(DIRECT_MODE_STORAGE_KEY);
      if (raw === null) {
        return /github\.io$/i.test(window.location.hostname);
      }
      return raw === 'direct';
    } catch {
      return /github\.io$/i.test(window.location.hostname);
    }
  }

  function saveDirectMode() {
    localStorage.setItem(DIRECT_MODE_STORAGE_KEY, directMode ? 'direct' : 'server');
  }

  function loadAutoRefreshSeconds() {
    try {
      const raw = localStorage.getItem(AUTO_REFRESH_STORAGE_KEY);
      const parsed = Number(raw || 0);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    } catch {
      return 0;
    }
  }

  function saveAutoRefreshSeconds() {
    localStorage.setItem(AUTO_REFRESH_STORAGE_KEY, String(autoRefreshSeconds));
  }

  function restartAutoRefreshTimer() {
    if (autoRefreshTimer) {
      window.clearInterval(autoRefreshTimer);
      autoRefreshTimer = null;
    }
    if (autoRefreshSeconds <= 0) return;
    autoRefreshTimer = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      if (collectionState.running) return;
      if (sites.length === 0) return;
      collectAllSites();
    }, autoRefreshSeconds * 1000);
  }

  function appendLocalHistory(result) {
    if (!result || !result.site_id) return;
    localHistory = [buildLocalHistoryItem(result)].concat(localHistory).slice(0, 1000);
    saveLocalHistory();
  }

  function buildLocalHistoryItem(result) {
    const now = new Date().toISOString();
    return {
      recorded_at: now,
      collection_generated_at: result.last_checked_at || now,
      site_id: result.site_id || '',
      site_name: result.site_name || '',
      site_type: result.site_type || '',
      status: result.status || '',
      balance: result.balance ?? null,
      balance_source: result.balance_source || 'unknown',
      quota_summary: result.quota_summary || '',
      monitor_summary: result.monitor_summary || '',
      last_checked_at: result.last_checked_at || now,
      last_error: result.last_error || '',
      capabilities: Array.isArray(result.capabilities) ? result.capabilities : [],
    };
  }

  function downloadJson(payload, filename) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function redactSite(site) {
    return {
      ...site,
      auth_payload: '',
      auth_payload_redacted: String(site.auth_payload || '').trim() !== '',
    };
  }

  function exportSites() {
    const date = new Date().toISOString().slice(0, 10);
    downloadJson(
      {
        exported_at: new Date().toISOString(),
        export_type: 'redacted_sites',
        warning: 'auth_payload has been removed. Use full backup only for private storage.',
        sites: sites.map(redactSite),
      },
      `upstream-monitor-sites-redacted-${date}.json`,
    );
  }

  function exportFullBackup() {
    const date = new Date().toISOString().slice(0, 10);
    const confirmed = window.confirm('完整备份会包含 token / cookie 等敏感信息，只适合自己私密保存。确定继续导出吗？');
    if (!confirmed) return;
    downloadJson(
      {
        exported_at: new Date().toISOString(),
        export_type: 'full_backup',
        warning: 'This file may contain upstream tokens or cookies. Keep it private.',
        sites,
        results: autoResults,
      },
      `upstream-monitor-full-backup-${date}.json`,
    );
  }

  function importSites(file) {
    return file.text().then((text) => {
      const parsed = JSON.parse(text);
      if (!parsed || !Array.isArray(parsed.sites)) {
        throw new Error('文件格式错误，缺少 sites 数组');
      }
      return {
        sites: parsed.sites,
        results: parsed.results && typeof parsed.results === 'object' && !Array.isArray(parsed.results) ? parsed.results : null,
      };
    });
  }

  function uid() {
    return `site-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function buildSiteView(site) {
    const auto = autoResults[site.id];
    const hasBase = String(site.base_url || '').trim() !== '';
    const requiresAuth = site.auth_mode !== 'manual';
    const hasAuth = String(site.auth_payload || '').trim() !== '';
    const requiresUserId = site.auth_mode === 'token_with_user_id';
    const hasUserId = String(site.user_id || '').trim() !== '';
    const manualBalance =
      site.manual_balance === '' || site.manual_balance === null || site.manual_balance === undefined
        ? null
        : Number(site.manual_balance);

    let status = 'manual_review';
    let balance = manualBalance;
    let balanceSource = manualBalance === null ? 'unknown' : 'manual';
    let quotaSummary = '待接入';
    let monitorSummary = '待接入';
    let lastError = '';
    let lastCheckedAt = site.manual_checked_at || '';

    if (!site.enabled) {
      status = 'manual_review';
      quotaSummary = '已停用';
      monitorSummary = '已停用';
    } else if (!site.name || !site.type || !hasBase || (requiresAuth && !hasAuth) || (requiresUserId && !hasUserId)) {
      status = 'not_configured';
      lastError = '配置不完整';
      quotaSummary = '配置不完整';
      monitorSummary = '配置不完整';
    } else if (manualBalance === null) {
      status = 'manual_review';
      quotaSummary = '等待自动接入或人工补录';
      monitorSummary = '等待自动接入';
    } else if (manualBalance <= Number(site.balance_threshold || 0)) {
      status = 'low_balance';
      quotaSummary = `余额阈值 ${site.balance_threshold}`;
      monitorSummary = '人工维护';
    } else {
      status = 'normal';
      quotaSummary = '人工维护';
      monitorSummary = '人工维护';
    }

    if (auto && typeof auto === 'object') {
      const autoBalance =
        auto.balance === '' || auto.balance === null || auto.balance === undefined
          ? null
          : Number(auto.balance);
      status = auto.status || status;
      balance = autoBalance === null ? balance : autoBalance;
      balanceSource = auto.balance_source || (autoBalance === null ? balanceSource : 'auto');
      quotaSummary = auto.quota_summary || quotaSummary;
      monitorSummary = auto.monitor_summary || monitorSummary;
      lastError = auto.last_error || '';
      lastCheckedAt = auto.last_checked_at || lastCheckedAt;
    }

    return {
      ...site,
      computed: {
        status,
        balance,
        balanceSource,
        quotaSummary,
        monitorSummary,
        lastError,
        lastCheckedAt,
      },
    };
  }

  function buildSummary(items) {
    const summary = {
      total: items.length,
      normal: 0,
      low_balance: 0,
      query_failed: 0,
      manual_review: 0,
      not_configured: 0,
    };

    for (let i = 0; i < items.length; i += 1) {
      const key = items[i].computed.status;
      if (summary[key] !== undefined) {
        summary[key] += 1;
      }
    }
    return summary;
  }

  function statCard(label, value) {
    return `
      <div class="panel stat-card">
        <div class="stat-label">${label}</div>
        <div class="stat-value">${value}</div>
      </div>
    `;
  }

  function buildServerStatusPanel() {
    if (!isServerMode()) return '';

    const status = serverStatus;
    const sites = status?.sites || {};
    const latestResults = status?.latest_results || {};
    const history = status?.history || {};
    const backups = status?.backups || {};
    const statusText = status
      ? `运行中 · ${status.scheduled_collection_enabled ? `定时 ${status.interval_seconds}s` : '未开启定时'} · Basic Auth ${status.basic_auth_enabled ? '已开启' : '未开启'}`
      : '尚未加载服务器状态';

    return `
      <section class="panel server-status-panel">
        <div class="section-title">
          <div>
            <h2>服务器数据状态</h2>
            <div class="row-subtitle">${escapeHtml(statusText)}</div>
          </div>
          <div class="actions">
            <button class="btn-ghost" id="refresh-server-status">刷新状态</button>
          </div>
        </div>
        ${
          status
            ? `<div class="server-status-grid">
                ${serverStatusItem('数据目录', status.data_dir || '未知')}
                ${serverStatusItem('站点配置', `${sites.total || 0} 个，启用 ${sites.enabled || 0} 个，已填鉴权 ${sites.with_auth || 0} 个`)}
                ${serverStatusItem('最近结果', `${latestResults.total || 0} 条 · ${formatTime(latestResults.generated_at)}`)}
                ${serverStatusItem('历史记录', `${history.record_count || 0} 条，文件 ${history.file_count || 0} 份`)}
                ${serverStatusItem('备份文件', `${backups.file_count || 0} 份`)}
                ${serverStatusItem('运行时长', `${status.uptime_seconds || 0} 秒`)}
              </div>
              <div class="server-status-hint">${escapeHtml(buildServerStatusHint(status))}</div>`
            : '<div class="history-empty">点击“刷新状态”查看服务器数据目录、最近结果和历史文件是否正常。</div>'
        }
      </section>
    `;
  }

  function serverStatusItem(label, value) {
    return `
      <div class="server-status-item">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </div>
    `;
  }

  function buildServerStatusHint(status) {
    if (!status) return '';
    if ((status.sites?.total || 0) === 0) {
      return '服务器还没有站点配置。请先保存站点，或从页面同步本地站点到服务器。';
    }
    if ((status.latest_results?.total || 0) === 0) {
      return '服务器还没有最近采集结果。请点击“自动更新全部”采集一次。';
    }
    if ((status.history?.record_count || 0) === 0) {
      return '服务器有最近采集结果，但没有历史记录。请点击“回填最近结果”。';
    }
    return '服务器数据链路正常：已有站点、最近结果和历史记录。';
  }

  function inputField(name, label, value, placeholder, type) {
    return `
      <div class="field">
        <label for="${name}">${label}</label>
        <input id="${name}" name="${name}" type="${type || 'text'}" value="${escapeHtml(value || '')}" placeholder="${escapeHtml(placeholder || '')}" />
      </div>
    `;
  }

  function textAreaField(name, label, value, placeholder) {
    const isSecret = name === 'auth_payload';
    return `
      <div class="field full">
        <label for="${name}">${label}</label>
        <textarea id="${name}" name="${name}" class="${isSecret ? 'secret-textarea is-masked' : ''}" autocomplete="off" spellcheck="false" placeholder="${escapeHtml(placeholder || '')}">${escapeHtml(value || '')}</textarea>
        ${
          isSecret
            ? '<div class="secret-tools"><button type="button" class="btn-ghost" id="toggle-auth-payload">显示鉴权内容</button><span>默认隐藏，避免旁人看到 token / cookie。</span></div>'
            : ''
        }
      </div>
    `;
  }

  function selectField(name, label, options, selected) {
    return `
      <div class="field">
        <label for="${name}">${label}</label>
        <select id="${name}" name="${name}">
          ${options
            .map((item) => `<option value="${item.value}" ${item.value === selected ? 'selected' : ''}>${item.label}</option>`)
            .join('')}
        </select>
      </div>
    `;
  }

  function helpList(items) {
    return `<ul class="help-list">${items.map((item) => `<li>${item}</li>`).join('')}</ul>`;
  }

  function buildStaticHostingNotice() {
    if (!/github\.io$/i.test(window.location.hostname)) return '';
    return `
      <section class="collection-message hosting-notice">
        当前页面运行在 GitHub Pages 静态托管环境。若上游允许跨域，可切到“浏览器直连模式”直接更新余额；若不允许跨域，再使用服务器采集模式。
      </section>
    `;
  }

  function buildModePanel() {
    const isGitHub = /github\.io$/i.test(window.location.hostname);
    if (!isHttpHosted() && !isGitHub) return '';

    const modeLabel = directMode ? '浏览器直连上游' : '服务器采集';
    const hint = directMode
      ? '当前页面会直接请求你填入的上游站点。前提是上游允许跨域，并接受浏览器带上的 token / User ID。'
      : `当前页面会请求采集服务：${COLLECTOR_SERVER_URL}`;

    return `
      <section class="panel mode-panel">
        <div class="section-title">
          <div>
            <h2>运行模式</h2>
            <div class="row-subtitle">${escapeHtml(modeLabel)}</div>
          </div>
        </div>
        <div class="mode-panel-grid">
          <div class="field">
            <label for="runtime-mode">采集方式</label>
            <select id="runtime-mode">
              <option value="direct" ${directMode ? 'selected' : ''}>浏览器直连</option>
              <option value="server" ${!directMode ? 'selected' : ''}>服务器采集</option>
            </select>
          </div>
          <div class="field">
            <label for="auto-refresh-seconds">自动刷新</label>
            <select id="auto-refresh-seconds">
              <option value="0" ${autoRefreshSeconds === 0 ? 'selected' : ''}>关闭</option>
              <option value="60" ${autoRefreshSeconds === 60 ? 'selected' : ''}>1 分钟</option>
              <option value="300" ${autoRefreshSeconds === 300 ? 'selected' : ''}>5 分钟</option>
              <option value="900" ${autoRefreshSeconds === 900 ? 'selected' : ''}>15 分钟</option>
            </select>
          </div>
        </div>
        <div class="mode-panel-hint">${escapeHtml(hint)}</div>
      </section>
    `;
  }

  function buildHistorySummaryPanel() {
    const effectiveSummary = isServerMode() ? historySummary : buildLocalHistorySummary();
    const title = isServerMode() ? '服务器历史摘要' : '浏览器本地历史摘要';
    const emptyHint = buildHistoryEmptyHint(effectiveSummary);

    if (!effectiveSummary) {
      return `
        <section class="panel history-panel">
          <div class="section-title">
            <h2>${title}</h2>
            <div class="actions">
              <button class="btn-ghost" id="refresh-history-summary">刷新历史</button>
              ${isServerMode() ? '<button class="btn-ghost" id="backfill-history">回填最近结果</button>' : ''}
            </div>
          </div>
          <div class="history-empty">${emptyHint}</div>
        </section>
      `;
    }

    const rows = Array.isArray(effectiveSummary.sites) ? effectiveSummary.sites.slice(0, 8) : [];
    return `
      <section class="panel history-panel">
        <div class="section-title">
          <h2>${title}</h2>
          <div class="actions">
            <button class="btn-ghost" id="refresh-history-summary">刷新历史</button>
            ${isServerMode() ? '<button class="btn-ghost" id="backfill-history">回填最近结果</button>' : ''}
          </div>
        </div>
        <div class="history-meta">
          最近 ${effectiveSummary.source_total || 0} 条历史，覆盖 ${effectiveSummary.total_sites || 0} 个站点。最近结果 ${effectiveSummary.latest_results_total || 0} 条，最多展示 8 个最近有记录的站点。
        </div>
        ${
          rows.length === 0
            ? `<div class="history-empty">${emptyHint}</div>`
            : `<div class="history-grid">
                ${rows.map((row) => buildHistorySummaryCard(row)).join('')}
              </div>`
        }
      </section>
    `;
  }

  function buildHistoryEmptyHint(summary) {
    if (!isServerMode()) {
      return '当前浏览器还没有本地历史。点击“更新”或“自动更新全部”后，这里会记录本机浏览器里的采集历史。';
    }

    if (!summary) {
      return '服务器历史还没加载。点击“刷新历史”；如果仍然为空，先点“自动更新全部”采集一次。';
    }

    if ((summary.source_total || 0) === 0 && (summary.latest_results_total || 0) > 0) {
      return '服务器已经有最近一次采集结果，但还没有历史记录。点击“回填最近结果”，可以把最近结果补进历史。';
    }

    if ((summary.source_total || 0) === 0) {
      return '服务器还没有历史，也没有最近采集结果。请先保存站点，然后点击“自动更新全部”；采集完成后这里会自动出现历史。';
    }

    return '服务器历史暂时没有可展示的站点记录。';
  }

  function buildHistorySummaryCard(row) {
    const latest = row.latest || {};
    return `
      <div class="history-card">
        <div class="history-card-title">${escapeHtml(row.site_name || row.site_id || '未知站点')}</div>
        <div class="row-subtitle">${escapeHtml(typeLabel(row.site_type || ''))} · 最近：${formatTime(latest.recorded_at || latest.last_checked_at)}</div>
        <div class="history-card-status">
          <span class="status-pill status-${escapeHtml(latest.status || 'manual_review')}">${escapeHtml(statusLabel(latest.status || 'manual_review'))}</span>
        </div>
        <div class="history-card-grid">
          <div><strong>${row.total || 0}</strong><span>记录</span></div>
          <div><strong>${row.query_failed || 0}</strong><span>失败</span></div>
          <div><strong>${row.low_balance || 0}</strong><span>低余额</span></div>
          <div><strong>${row.consecutive_failures || 0}</strong><span>连续失败</span></div>
        </div>
        <div class="history-card-note">${escapeHtml(latest.last_error || latest.quota_summary || '暂无异常说明')}</div>
      </div>
    `;
  }

  function buildLocalHistorySummary() {
    const groups = {};
    for (let i = 0; i < localHistory.length; i += 1) {
      const item = localHistory[i];
      const siteId = item.site_id || 'unknown';
      if (!groups[siteId]) {
        groups[siteId] = {
          site_id: siteId,
          site_name: item.site_name || '',
          site_type: item.site_type || '',
          total: 0,
          normal: 0,
          low_balance: 0,
          query_failed: 0,
          manual_review: 0,
          not_configured: 0,
          latest: null,
          consecutive_failures: 0,
          consecutive_low_balance: 0,
        };
      }
      const group = groups[siteId];
      group.total += 1;
      if (group[item.status] !== undefined) group[item.status] += 1;
      if (!group.latest) group.latest = item;
    }

    const rows = Object.values(groups);
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const items = localHistory.filter((item) => (item.site_id || 'unknown') === row.site_id);
      for (let j = 0; j < items.length; j += 1) {
        if (items[j].status === 'query_failed') row.consecutive_failures += 1;
        else break;
      }
      for (let j = 0; j < items.length; j += 1) {
        if (items[j].status === 'low_balance') row.consecutive_low_balance += 1;
        else break;
      }
    }

    return {
      generated_at: new Date().toISOString(),
      source_total: localHistory.length,
      total_sites: rows.length,
      sites: rows,
    };
  }

  function buildSelectedHistoryPanel() {
    if (!selectedHistory) return '';
    const site = sites.filter((item) => item.id === selectedHistory.site_id)[0];
    const title = site?.name || selectedHistory.site_name || selectedHistory.site_id || '站点历史';
    const items = Array.isArray(selectedHistory.items) ? selectedHistory.items : [];
    return `
      <section class="panel selected-history-panel">
        <div class="section-title">
          <h2>${escapeHtml(title)} · 最近历史</h2>
          <div class="actions">
            <button class="btn-ghost" id="refresh-selected-history" data-id="${escapeHtml(selectedHistory.site_id || '')}">刷新</button>
            <button class="btn-ghost" id="close-selected-history">关闭</button>
          </div>
        </div>
        ${
          items.length === 0
            ? '<div class="history-empty">这个站点还没有服务器历史记录。请先在服务器模式下采集一次。</div>'
            : `<div class="table-scroll history-table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>时间</th>
                      <th>状态</th>
                      <th>余额</th>
                      <th>额度摘要</th>
                      <th>错误</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${items
                      .map((item) => `
                        <tr>
                          <td>${escapeHtml(formatTime(item.recorded_at || item.last_checked_at))}</td>
                          <td><span class="status-pill status-${escapeHtml(item.status || 'manual_review')}">${escapeHtml(statusLabel(item.status || 'manual_review'))}</span></td>
                          <td>${escapeHtml(formatBalance(item.balance))}</td>
                          <td>${escapeHtml(item.quota_summary || item.monitor_summary || '无')}</td>
                          <td>${escapeHtml(item.last_error || '无')}</td>
                        </tr>
                      `)
                      .join('')}
                  </tbody>
                </table>
              </div>`
        }
      </section>
    `;
  }

  function buildConfigGuide(site) {
    const type = site.type || 'new_api';
    const authMode = site.auth_mode || 'manual';
    const isSub2api = type === 'sub2api';
    const authAdvice = buildAuthModeAdvice(type, authMode);

    if (isSub2api) {
      return `
        <div class="guide-card">
          <div class="guide-title">推荐先这样填：sub2api</div>
          ${helpList([
            '<strong>根地址</strong> 填站点主页，例如 <code>https://demo.example.com</code>，不要带最后的斜杠。',
            '<strong>登录地址</strong> 一般填 <code>根地址/login</code>，主要方便你点进去人工核查。',
            '<strong>账号标识</strong> 建议填登录邮箱或 reseller 名称，后面排查最省事。',
            '<strong>鉴权方式</strong> 优先选 <code>Token</code>。',
            '<strong>鉴权内容</strong> 填登录后拿到的 <code>access_token</code>，可以直接粘纯 token，也可以粘 <code>Bearer token</code>。',
            '<strong>User ID</strong> 这个类型通常不用填。',
            '<strong>人工余额</strong> 如果暂时还没拿到 token，先手工填，工具也能先用起来。'
          ])}
          <div class="guide-subtitle">怎么拿 token</div>
          ${helpList([
            '源码显示登录接口是 <code>POST /api/v1/auth/login</code>。',
            '登录成功响应里会返回 <code>access_token</code>、<code>refresh_token</code>、<code>token_type</code>、<code>user</code>。',
            '你如果不想抓接口，也可以先在浏览器登录后台，再结合开发者工具看登录响应。'
          ])}
          <div class="guide-subtitle">当前采集器会尝试的接口</div>
          ${helpList([
            '<code>/api/v1/user/profile</code>：优先拿余额。',
            '<code>/api/v1/user/platform-quotas</code>：拿平台额度摘要。',
            '<code>/api/v1/channel-monitors</code>：拿渠道监控项数量。'
          ])}
          <div class="guide-subtitle">当前鉴权建议</div>
          ${authAdvice}
        </div>
      `;
    }

    return `
      <div class="guide-card">
        <div class="guide-title">推荐先这样填：new api</div>
        ${helpList([
          '<strong>根地址</strong> 填站点主页，例如 <code>https://demo.example.com</code>，不要带最后的斜杠。',
          '<strong>登录地址</strong> 一般填登录页地址，方便你后续人工打开检查余额。',
          '<strong>账号标识</strong> 建议填登录用户名或邮箱。',
          '<strong>鉴权方式</strong> 若只做手工维护可选 <code>manual</code>；若准备自动采集，优先尝试 <code>Token + User ID</code>。',
          '<strong>鉴权内容</strong> 填 access token，不必手动加 Bearer，工具会自动补。',
          '<strong>User ID</strong> 很关键。部分接口除了 token，还要求请求头里带 <code>New-Api-User</code>。',
          '<strong>人工余额</strong> 如果你暂时只想看余额，先人工填就行，后续再补自动采集。'
        ])}
        <div class="guide-subtitle">怎么拿 token 和 user id</div>
        ${helpList([
          '源码显示先登录 <code>POST /api/user/login</code>，这一步主要建立登录会话，并返回用户基本信息。',
          '登录后再请求 <code>GET /api/user/token</code> 才会生成 access token。',
          '用户信息接口 <code>/api/user/self</code> 可返回 <code>id</code>、<code>quota</code>、<code>used_quota</code> 等字段。'
        ])}
        <div class="guide-subtitle">当前采集器会尝试的接口</div>
        ${helpList([
          '<code>/api/user/self</code>：当前已接入，用于拿用户额度摘要。',
          '这类站点经常不是“只填 token 就一定通”，所以建议把 <code>user_id</code> 一起填上。'
        ])}
        <div class="guide-subtitle">当前鉴权建议</div>
        ${authAdvice}
      </div>
    `;
  }

  function buildAuthModeAdvice(type, authMode) {
    if (authMode === 'manual') {
      return `<div class="guide-note">当前是手工维护模式。你现在最少只需要填好站点名、类型、根地址，再手工记录余额即可。</div>`;
    }

    if (type === 'sub2api' && authMode !== 'token') {
      return `<div class="guide-note guide-warn">` +
        `对 <code>sub2api</code>，当前最稳的是 <code>Token</code>。如果你选了 <code>${escapeHtml(authMode)}</code>，建议先改回 <code>Token</code>。` +
      `</div>`;
    }

    if (type === 'new_api' && authMode === 'token') {
      return `<div class="guide-note guide-warn">` +
        `你现在选的是 <code>Token</code>。如果后面发现接口能登录但拿不到用户信息，通常要改成 <code>Token + User ID</code>。` +
      `</div>`;
    }

    if (type === 'new_api' && authMode === 'token_with_user_id') {
      return `<div class="guide-note">当前选择正确，适合大多数要自动采集的 <code>new api</code> 站点。</div>`;
    }

    if (authMode === 'cookie') {
      return `<div class="guide-note guide-warn">Cookie 方式可以保留，但第一阶段不建议作为主方案，因为更容易过期。</div>`;
    }

    return `<div class="guide-note">当前鉴权方式可用，后续若接口返回 401/403，再回到这里调整。</div>`;
  }

  function buildHelperScriptsPanel(site) {
    const isSub2api = site.type === 'sub2api';
    const primaryTitle = isSub2api ? 'sub2api 取 token 辅助脚本' : 'new api 取 User ID + token 辅助脚本';
    const primaryScript = isSub2api ? SUB2API_HELPER_SCRIPT : NEW_API_HELPER_SCRIPT;
    const secondaryTitle = isSub2api ? 'new api 辅助脚本' : 'sub2api 辅助脚本';
    const secondaryScript = isSub2api ? NEW_API_HELPER_SCRIPT : SUB2API_HELPER_SCRIPT;

    return `
      <div class="helper-card">
        <div class="helper-header">
          <div>
            <div class="guide-title">${primaryTitle}</div>
            <div class="helper-desc">先登录对应上游站点，在那个站点页面按 F12 打开 Console，粘贴脚本执行。脚本只请求当前站点自己的接口。</div>
          </div>
          <button type="button" class="btn-secondary copy-helper" data-target="primary-helper-script">复制脚本</button>
        </div>
        <textarea id="primary-helper-script" class="helper-script" readonly>${escapeHtml(primaryScript)}</textarea>
        <details class="helper-extra">
          <summary>也显示 ${secondaryTitle}</summary>
          <div class="helper-header helper-header-small">
            <div class="helper-desc">切换站点类型时偶尔会用到，放在这里备用。</div>
            <button type="button" class="btn-secondary copy-helper" data-target="secondary-helper-script">复制备用脚本</button>
          </div>
          <textarea id="secondary-helper-script" class="helper-script" readonly>${escapeHtml(secondaryScript)}</textarea>
        </details>
      </div>
    `;
  }

  function typeLabel(type) {
    for (let i = 0; i < SITE_TYPES.length; i += 1) {
      if (SITE_TYPES[i].value === type) return SITE_TYPES[i].label;
    }
    return type;
  }

  function statusLabel(status) {
    for (let i = 0; i < STATUS_TYPES.length; i += 1) {
      if (STATUS_TYPES[i].value === status) return STATUS_TYPES[i].label;
    }
    return status;
  }

  function balanceSourceLabel(source) {
    if (source === 'manual') return '人工维护';
    if (source === 'auto') return '自动获取';
    return '未知';
  }

  function formatBalance(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return '待补录';
    }
    return `$${Number(value).toFixed(2)}`;
  }

  function formatTime(value) {
    if (!value) return '未记录';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('zh-CN', { hour12: false });
  }

  function render() {
    const items = sites.map(buildSiteView);
    const filtered = items.filter((item) => {
      const keyword = filters.keyword.trim().toLowerCase();
      const keywordPass =
        !keyword ||
        [item.name, item.group_name, item.base_url, item.account_label]
          .join(' ')
          .toLowerCase()
          .indexOf(keyword) >= 0;
      const statusPass = filters.status === 'all' || item.computed.status === filters.status;
      const typePass = filters.type === 'all' || item.type === filters.type;
      return keywordPass && statusPass && typePass;
    });
    const summary = buildSummary(items);
    const editing =
      editingDraft ||
      sites.filter((site) => site.id === editingId)[0] ||
      clone(DEFAULT_SITE);
    const configGuide = buildConfigGuide(editing);
    const helperScriptsPanel = buildHelperScriptsPanel(editing);

    app.innerHTML = `
      <div class="app">
        <section class="hero">
          <div>
            <h1>上游账号池监控工具</h1>
            <p>第一阶段急用版。先统一维护某某 new api、某某 sub2api 站点，用最少配置集中看余额、状态、待核查项，并保留后续自动采集接入口。</p>
          </div>
          <div class="toolbar">
            <button class="btn-secondary" id="collect-all" ${collectionState.running ? 'disabled' : ''}>${collectionState.running ? '更新中...' : '自动更新全部'}</button>
            <button class="btn-secondary" id="copy-diagnostics">复制诊断</button>
            <button class="btn-secondary" id="copy-acceptance">复制验收步骤</button>
            <button class="btn-secondary" id="import-sites">导入站点</button>
            <button class="btn-secondary" id="export-sites">脱敏导出</button>
            <button class="btn-secondary" id="export-full-backup">完整备份</button>
            ${isServerMode() ? '<button class="btn-secondary" id="server-backup">服务器备份</button>' : ''}
            ${isServerMode() ? '<button class="btn-secondary" id="server-history">服务器历史</button>' : ''}
            ${isServerMode() ? '<button class="btn-secondary" id="server-restore">服务器恢复</button>' : ''}
            <button class="btn-primary" id="new-site">新增站点</button>
          </div>
        </section>

        ${
          collectionState.message
            ? `<section class="collection-message ${collectionState.running ? 'is-running' : ''}">${escapeHtml(collectionState.message)}</section>`
            : ''
        }
        ${buildStaticHostingNotice()}
        ${buildModePanel()}
        ${buildServerStatusPanel()}

        <section class="stats">
          ${statCard('总站点', summary.total)}
          ${statCard('正常', summary.normal)}
          ${statCard('低余额', summary.low_balance)}
          ${statCard('查询失败', summary.query_failed)}
          ${statCard('待核查', summary.manual_review + summary.not_configured)}
        </section>

        ${buildHistorySummaryPanel()}

        <section class="panel filters">
          <div class="field">
            <label>搜索</label>
            <input id="filter-keyword" value="${escapeHtml(filters.keyword)}" placeholder="搜索站点名 / 分组 / 地址 / 账号标识" />
          </div>
          <div class="field">
            <label>状态</label>
            <select id="filter-status">
              <option value="all">全部状态</option>
              ${STATUS_TYPES.map((item) => `<option value="${item.value}" ${filters.status === item.value ? 'selected' : ''}>${item.label}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label>类型</label>
            <select id="filter-type">
              <option value="all">全部类型</option>
              ${SITE_TYPES.map((item) => `<option value="${item.value}" ${filters.type === item.value ? 'selected' : ''}>${item.label}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label>操作</label>
            <button class="btn-ghost" id="clear-filters">清空筛选</button>
          </div>
        </section>

        <section class="content">
          <div class="panel table-panel">
            <div class="section-title">
              <h2>站点总览</h2>
              <div class="actions">
                <button class="btn-ghost" id="load-example">加载示例</button>
              </div>
            </div>
            <div class="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>站点</th>
                    <th>类型 / 分组</th>
                    <th>当前余额</th>
                    <th>平台额度</th>
                    <th>监控摘要</th>
                    <th>状态</th>
                    <th>最近检查</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  ${
                    filtered.length === 0
                      ? '<tr><td colspan="8"><div class="empty">当前没有匹配的站点。先新增站点，或点击“加载示例”。</div></td></tr>'
                      : filtered
                          .map((item) => {
                            return `
                              <tr>
                                <td>
                                  <div class="row-title">${escapeHtml(item.name || '未命名站点')}</div>
                                  <div class="row-subtitle">${escapeHtml(item.base_url || '未填写地址')}</div>
                                </td>
                                <td>
                                  <div>${escapeHtml(typeLabel(item.type))}</div>
                                  <div class="row-subtitle">${escapeHtml(item.group_name || '未分组')}</div>
                                </td>
                                <td>
                                  <div class="row-title">${formatBalance(item.computed.balance)}</div>
                                  <div class="row-subtitle">${balanceSourceLabel(item.computed.balanceSource)}</div>
                                </td>
                                <td>${escapeHtml(item.computed.quotaSummary)}</td>
                                <td>${escapeHtml(item.computed.monitorSummary)}</td>
                                <td><span class="status-pill status-${item.computed.status}">${statusLabel(item.computed.status)}</span></td>
                                <td>
                                  <div>${escapeHtml(formatTime(item.computed.lastCheckedAt))}</div>
                                  <div class="row-subtitle">${escapeHtml(item.computed.lastError || '无')}</div>
                                </td>
                                <td>
                                  <div class="actions">
                                    <button class="btn-ghost edit-site" data-id="${item.id}">编辑</button>
                                    <button class="btn-ghost collect-site" data-id="${item.id}" ${collectionState.running ? 'disabled' : ''}>更新</button>
                                    <button class="btn-ghost view-history" data-id="${item.id}">历史</button>
                                    <button class="btn-ghost open-login" data-url="${escapeHtml(item.login_url || item.base_url || '')}">打开站点</button>
                                    <button class="btn-ghost clone-site" data-id="${item.id}">复制</button>
                                    <button class="btn-ghost delete-site" data-id="${item.id}">删除</button>
                                  </div>
                                </td>
                              </tr>
                            `;
                          })
                          .join('')
                  }
                </tbody>
              </table>
            </div>
          </div>

          ${buildSelectedHistoryPanel()}

          <aside class="panel form-panel">
            <h2>${editingId ? '编辑站点' : '新增站点'}</h2>
            <form id="site-form">
              <div class="form-grid">
                ${inputField('name', '站点名称', editing.name, '例如：广州-newapi-01')}
                ${selectField('type', '站点类型', SITE_TYPES, editing.type)}
                ${inputField('base_url', '根地址', editing.base_url, 'https://example.com')}
                ${inputField('login_url', '登录地址', editing.login_url, 'https://example.com/login')}
                ${inputField('group_name', '分组', editing.group_name, '例如：主力池')}
                ${inputField('account_label', '账号标识', editing.account_label, '例如：admin@example.com')}
                ${selectField('auth_mode', '鉴权方式', AUTH_MODES, editing.auth_mode)}
                ${inputField('user_id', 'User ID（仅 new api 某些接口需要）', editing.user_id, '')}
                ${textAreaField('auth_payload', '鉴权内容', editing.auth_payload, 'Token / Cookie 文本')}
                ${inputField('balance_threshold', '余额阈值', editing.balance_threshold, '默认 20', 'number')}
                ${inputField('manual_balance', '人工余额', editing.manual_balance, '可留空', 'number')}
                ${inputField('manual_checked_at', '人工核查时间', editing.manual_checked_at, '', 'datetime-local')}
                ${textAreaField('manual_note', '人工核查备注', editing.manual_note, '记录来源与说明')}
                ${textAreaField('notes', '备注', editing.notes, '可写站点用途、负责人、提醒事项')}
                <div class="field full">
                  <label>
                    <input type="checkbox" id="enabled" ${editing.enabled ? 'checked' : ''} />
                    启用此站点
                  </label>
                </div>
              </div>
              <div class="actions" style="margin-top:16px;">
                <button type="submit" class="btn-primary">${editingId ? '保存修改' : '新增站点'}</button>
                <button type="button" class="btn-secondary" id="reset-form">清空表单</button>
              </div>
            </form>
            ${configGuide}
            ${helperScriptsPanel}
            <div class="hint">
              第一版先把站点统一收拢。自动采集器后续接入时，优先支持 sub2api 的 Bearer token，以及 new api 的 token / token + user id 模式；打不通时仍然可以靠人工余额继续使用。
            </div>
          </aside>
        </section>
      </div>
    `;

    bindEvents();
  }

  function bindEvents() {
    document.getElementById('new-site').onclick = function () {
      editingId = null;
      editingDraft = clone(DEFAULT_SITE);
      render();
    };

    document.getElementById('reset-form').onclick = function () {
      editingId = null;
      editingDraft = null;
      render();
    };

    document.getElementById('clear-filters').onclick = function () {
      filters = { keyword: '', status: 'all', type: 'all' };
      render();
    };

    document.getElementById('filter-keyword').oninput = function (event) {
      filters.keyword = event.target.value;
      render();
    };

    document.getElementById('filter-status').onchange = function (event) {
      filters.status = event.target.value;
      render();
    };

    document.getElementById('filter-type').onchange = function (event) {
      filters.type = event.target.value;
      render();
    };

    document.getElementById('collect-all').onclick = function () {
      collectAllSites();
    };

    const runtimeMode = document.getElementById('runtime-mode');
    if (runtimeMode) {
      runtimeMode.onchange = function (event) {
        directMode = event.target.value === 'direct';
        saveDirectMode();
        collectionState = {
          running: false,
          message: directMode ? '已切换到浏览器直连模式。页面会直接请求上游站点。' : `已切换到服务器采集模式：${COLLECTOR_SERVER_URL}`,
        };
        render();
        if (isServerMode()) {
          syncFromServer();
        }
      };
    }

    const autoRefreshSelect = document.getElementById('auto-refresh-seconds');
    if (autoRefreshSelect) {
      autoRefreshSelect.onchange = function (event) {
        autoRefreshSeconds = Number(event.target.value || 0);
        saveAutoRefreshSeconds();
        restartAutoRefreshTimer();
        collectionState = {
          running: false,
          message: autoRefreshSeconds > 0 ? `已开启自动刷新：每 ${Math.round(autoRefreshSeconds / 60)} 分钟。仅在当前页面打开时生效。` : '已关闭自动刷新。',
        };
        render();
      };
    }

    const refreshServerStatus = document.getElementById('refresh-server-status');
    if (refreshServerStatus) {
      refreshServerStatus.onclick = function () {
        loadServerStatus();
      };
    }

    document.getElementById('copy-acceptance').onclick = function () {
      copyText(buildAcceptanceChecklist())
        .then(() => {
          collectionState = { running: false, message: '验收步骤已复制。你可以按步骤亲自测试，也可以把测试结果发给我继续定位。' };
          render();
        })
        .catch(() => {
          collectionState = { running: false, message: '验收步骤复制失败，请手动查看 USER_TEST.md。' };
          render();
        });
    };

    const refreshHistorySummary = document.getElementById('refresh-history-summary');
    if (refreshHistorySummary) {
      refreshHistorySummary.onclick = function () {
        if (isServerMode()) {
          loadHistorySummary();
        } else {
          collectionState = { running: false, message: `浏览器本地历史已刷新：${localHistory.length} 条。` };
          render();
        }
      };
    }

    const backfillHistory = document.getElementById('backfill-history');
    if (backfillHistory) {
      backfillHistory.onclick = function () {
        backfillLatestResultsToHistory();
      };
    }

    document.getElementById('copy-diagnostics').onclick = function () {
      const payload = {
        generated_at: new Date().toISOString(),
        page: 'upstream-monitor-project',
        collection_state: collectionState,
        server_status: serverStatus,
        sites: sites.map((site) => ({
          id: site.id,
          name: site.name,
          type: site.type,
          base_url: site.base_url,
          auth_mode: site.auth_mode,
          has_auth_payload: String(site.auth_payload || '').trim() !== '',
          has_user_id: String(site.user_id || '').trim() !== '',
        })),
        results: autoResults,
      };
      copyText(JSON.stringify(payload, null, 2))
        .then(() => {
          collectionState = { running: false, message: '诊断信息已复制。可以直接粘贴给我继续分析。' };
          render();
        })
        .catch(() => {
          collectionState = { running: false, message: '自动复制诊断失败，请先点更新后把表格里的“最近检查”错误文字发给我。' };
          render();
        });
    };

    document.getElementById('type').onchange = function (event) {
      const current = collectDraftFromForm();
      current.type = event.target.value;
      if (current.type === 'sub2api' && current.auth_mode === 'token_with_user_id') {
        current.auth_mode = 'token';
      }
      if (current.type === 'new_api' && current.auth_mode === 'token') {
        current.auth_mode = 'token_with_user_id';
      }
      renderDraft(current);
    };

    document.getElementById('auth_mode').onchange = function () {
      const current = collectDraftFromForm();
      renderDraft(current);
    };

    const toggleAuthPayload = document.getElementById('toggle-auth-payload');
    if (toggleAuthPayload) {
      toggleAuthPayload.onclick = function () {
        const textarea = document.getElementById('auth_payload');
        if (!textarea) return;
        const masked = textarea.classList.toggle('is-masked');
        toggleAuthPayload.textContent = masked ? '显示鉴权内容' : '隐藏鉴权内容';
      };
    }

    document.getElementById('export-sites').onclick = exportSites;
    document.getElementById('export-full-backup').onclick = exportFullBackup;
    document.getElementById('server-backup').onclick = downloadServerBackup;
    document.getElementById('server-history').onclick = downloadServerHistory;
    document.getElementById('server-restore').onclick = restoreServerBackup;

    document.getElementById('import-sites').onclick = function () {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = function () {
        const file = input.files && input.files[0];
        if (!file) return;
        importSites(file)
          .then((imported) => {
            sites = imported.sites;
            if (imported.results) {
              autoResults = imported.results;
              saveAutoResults();
            }
            saveSites();
            editingId = null;
            editingDraft = null;
            render();
          })
          .catch((error) => {
            alert((error && error.message) || '导入失败');
          });
      };
      input.click();
    };

    document.getElementById('load-example').onclick = function () {
      sites = clone(EXAMPLE_SITES);
      saveSites();
      editingId = null;
      editingDraft = null;
      render();
    };

    document.getElementById('site-form').onsubmit = function (event) {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const payload = {
        id: editingId || uid(),
        name: String(form.get('name') || '').trim(),
        type: String(form.get('type') || 'new_api'),
        base_url: String(form.get('base_url') || '').trim(),
        login_url: String(form.get('login_url') || '').trim(),
        group_name: String(form.get('group_name') || '').trim(),
        account_label: String(form.get('account_label') || '').trim(),
        auth_mode: String(form.get('auth_mode') || 'manual'),
        auth_payload: String(form.get('auth_payload') || '').trim(),
        user_id: String(form.get('user_id') || '').trim(),
        balance_threshold: Number(form.get('balance_threshold') || 0),
        manual_balance: String(form.get('manual_balance') || '').trim(),
        manual_checked_at: String(form.get('manual_checked_at') || '').trim(),
        manual_note: String(form.get('manual_note') || '').trim(),
        notes: String(form.get('notes') || '').trim(),
        enabled: document.getElementById('enabled').checked,
      };

      if (editingId) {
        sites = sites.map((site) => (site.id === editingId ? payload : site));
      } else {
        sites = [payload].concat(sites);
      }

      saveSites();
      editingId = payload.id;
      editingDraft = clone(payload);
      render();
    };

    bindButtons('edit-site', function (button) {
      editingId = button.getAttribute('data-id');
       editingDraft = clone(sites.filter((site) => site.id === editingId)[0] || DEFAULT_SITE);
      render();
    });

    bindButtons('collect-site', function (button) {
      const id = button.getAttribute('data-id');
      collectOneSiteById(id);
    });

    bindButtons('view-history', function (button) {
      const id = button.getAttribute('data-id');
      loadSiteHistory(id);
    });

    const closeSelectedHistory = document.getElementById('close-selected-history');
    if (closeSelectedHistory) {
      closeSelectedHistory.onclick = function () {
        selectedHistory = null;
        render();
      };
    }

    const refreshSelectedHistory = document.getElementById('refresh-selected-history');
    if (refreshSelectedHistory) {
      refreshSelectedHistory.onclick = function () {
        loadSiteHistory(refreshSelectedHistory.getAttribute('data-id'));
      };
    }

    bindButtons('clone-site', function (button) {
      const id = button.getAttribute('data-id');
      const source = sites.filter((site) => site.id === id)[0];
      if (!source) return;
      const copy = clone(source);
      copy.id = uid();
      copy.name = `${source.name}-copy`;
      sites = [copy].concat(sites);
      saveSites();
      editingId = copy.id;
      editingDraft = clone(copy);
      render();
    });

    bindButtons('delete-site', function (button) {
      const id = button.getAttribute('data-id');
      const target = sites.filter((site) => site.id === id)[0];
      if (!target) return;
      if (!window.confirm(`确定删除站点“${target.name}”吗？`)) return;
      sites = sites.filter((site) => site.id !== id);
      if (editingId === id) {
        editingId = null;
        editingDraft = null;
      }
      saveSites();
      render();
    });

    bindButtons('open-login', function (button) {
      const url = button.getAttribute('data-url');
      if (!url) {
        alert('当前站点没有可打开的地址');
        return;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    });

    bindButtons('copy-helper', function (button) {
      const targetId = button.getAttribute('data-target');
      const textarea = document.getElementById(targetId);
      if (!textarea) return;
      copyText(textarea.value)
        .then(() => {
          button.textContent = '已复制';
          setTimeout(() => {
            button.textContent = targetId === 'primary-helper-script' ? '复制脚本' : '复制备用脚本';
          }, 1200);
        })
        .catch(() => {
          textarea.focus();
          textarea.select();
          alert('浏览器不允许自动复制。脚本已选中，请按 Ctrl+C 复制。');
        });
    });
  }

  function bindButtons(className, handler) {
    const buttons = document.querySelectorAll(`.${className}`);
    for (let i = 0; i < buttons.length; i += 1) {
      buttons[i].onclick = function () {
        handler(buttons[i]);
      };
    }
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise((resolve, reject) => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', 'readonly');
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      ok ? resolve() : reject(new Error('copy failed'));
    });
  }

  function buildAcceptanceChecklist() {
    const mode = isServerMode()
      ? '本地/服务器采集版'
      : isHttpHosted()
        ? 'GitHub Pages / 浏览器直连版'
        : '本地静态版';
    return [
      `Upstream Monitor 用户验收步骤`,
      `生成时间：${new Date().toLocaleString('zh-CN', { hour12: false })}`,
      `当前打开方式：${mode}`,
      `当前地址：${window.location.href}`,
      '',
      '1. 页面打开验收',
      '- 刷新页面，确认能看到“上游账号池监控工具”。',
      '- 如果是 GitHub Pages，确认页面出现静态托管安全提示。',
      '',
      '2. 站点录入验收',
      '- 点击“新增站点”。',
      '- 录入一个测试站点，鉴权方式先选“手工维护”。',
      '- 填写人工余额和备注，保存后确认表格出现该站点。',
      '',
      '3. 导出备份验收',
      '- 点击“脱敏导出”，确认能下载 JSON，且 auth_payload 为空。',
      '- 点击“完整备份”，确认会出现敏感信息确认提示。',
      '',
      '4. 采集验收',
      '- 如果是 file:// 本地静态版，点“自动更新全部”后若遇到 CORS，这是预期限制。',
      '- 如果是 GitHub Pages / 浏览器直连版，切到“浏览器直连”，点“自动更新全部”，确认页面给出成功或失败原因。',
      '- 如果是 http://127.0.0.1:8787 或服务器版，切到“服务器采集”，点“自动更新全部”，确认页面给出成功或失败原因。',
      '',
      '5. 历史验收',
      '- 如果是服务器版，先点“刷新历史”。',
      '- 如果提示服务器有最近结果但没有历史，点“回填最近结果”。',
      '- 如果历史和最近结果都是 0，点“自动更新全部”，再点“刷新历史”。',
      '- 如果是服务器版，点“刷新状态”，确认“服务器数据状态”显示站点、最近结果和历史记录统计。',
      '- 如果是 GitHub Pages / 浏览器直连版，可把自动刷新设置为 1 分钟或 5 分钟，确认页面打开期间会自动更新。',
      '- 确认“服务器历史摘要”出现记录。',
      '- 点击“服务器历史”，确认能下载历史 JSON。',
      '',
      '6. 反馈给我',
      '- 点击“复制诊断”。',
      '- 把诊断信息和你在哪一步遇到的问题发给我。',
    ].join('\n');
  }

  async function downloadServerBackup() {
    if (!isServerMode()) {
      alert('服务器备份需要通过 http:// 或 https:// 打开本工具。file:// 静态页面请使用“完整备份”。');
      return;
    }
    const confirmed = window.confirm('服务器备份会下载服务端保存的站点配置和最近结果，可能包含 token / cookie。确定继续吗？');
    if (!confirmed) return;
    try {
      const response = await fetch(`${COLLECTOR_SERVER_URL}/api/backup`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || `HTTP ${response.status}`);
      }
      const date = new Date().toISOString().slice(0, 10);
      downloadJson(payload, `upstream-monitor-server-backup-${date}.json`);
      collectionState = { running: false, message: '服务器备份已下载。请妥善保存，文件可能包含 token / cookie。' };
      render();
    } catch (error) {
      collectionState = { running: false, message: `服务器备份失败：${error && error.message ? error.message : String(error)}` };
      render();
    }
  }

  async function downloadServerHistory() {
    if (!isServerMode()) {
      alert('服务器历史需要通过 http:// 或 https:// 打开本工具。file:// 静态页面没有服务器历史。');
      return;
    }
    try {
      const response = await fetch(`${COLLECTOR_SERVER_URL}/api/history?limit=500`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || `HTTP ${response.status}`);
      }
      const date = new Date().toISOString().slice(0, 10);
      downloadJson(payload, `upstream-monitor-history-${date}.json`);
      collectionState = { running: false, message: `服务器历史已下载：${payload.total || 0} 条记录。` };
      render();
    } catch (error) {
      collectionState = { running: false, message: `服务器历史下载失败：${error && error.message ? error.message : String(error)}` };
      render();
    }
  }

  async function loadHistorySummary(options = {}) {
    if (!isServerMode()) return;
    try {
      const response = await fetch(`${COLLECTOR_SERVER_URL}/api/history-summary?limit=1000`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || `HTTP ${response.status}`);
      }
      historySummary = payload;
      if (!options.silent) {
        collectionState = { running: false, message: `历史摘要已刷新：${payload.total_sites || 0} 个站点，最近结果 ${payload.latest_results_total || 0} 条。` };
      }
      if (!options.skipRender) render();
    } catch (error) {
      if (!options.silent) {
        collectionState = { running: false, message: `历史摘要刷新失败：${error && error.message ? error.message : String(error)}` };
        render();
      }
    }
  }

  async function loadServerStatus(options = {}) {
    if (!isHttpHosted()) return;
    try {
      const response = await fetch(`${COLLECTOR_SERVER_URL}/api/server-status`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || `HTTP ${response.status}`);
      }
      serverStatus = payload;
      if (!options.silent) {
        collectionState = {
          running: false,
          message: `服务器状态已刷新：站点 ${payload.sites?.total || 0} 个，最近结果 ${payload.latest_results?.total || 0} 条，历史 ${payload.history?.record_count || 0} 条。`,
        };
      }
      if (!options.skipRender) render();
    } catch (error) {
      if (!options.silent) {
        collectionState = { running: false, message: `服务器状态刷新失败：${error && error.message ? error.message : String(error)}` };
        render();
      }
    }
  }

  async function backfillLatestResultsToHistory() {
    if (!isServerMode()) {
      collectionState = { running: false, message: '回填历史需要服务器模式。当前静态页面只使用浏览器本地历史。' };
      render();
      return;
    }

    try {
      const response = await fetch(`${COLLECTOR_SERVER_URL}/api/history/backfill-latest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || `HTTP ${response.status}`);
      }
      if (payload.history) {
        historySummary = payload.history;
      } else {
        await loadHistorySummary({ silent: true, skipRender: true });
      }
      await loadServerStatus({ silent: true, skipRender: true });
      collectionState = {
        running: false,
        message: buildBackfillMessage(payload),
      };
      render();
    } catch (error) {
      collectionState = { running: false, message: `回填历史失败：${error && error.message ? error.message : String(error)}` };
      render();
    }
  }

  function buildBackfillMessage(payload) {
    if (payload.appended > 0) {
      return `已从最近结果回填 ${payload.appended} 条历史。`;
    }

    if (payload.message === 'latest results already exist in history') {
      return '最近结果已经在历史里了，不需要重复回填。';
    }

    const latestTotal = payload.history?.latest_results_total || 0;
    if (latestTotal > 0) {
      return '服务器有最近结果，但没有新增可回填记录。可以点“刷新历史”确认。';
    }

    return '服务器没有可回填的最近结果。请先点“自动更新全部”采集一次。';
  }

  async function loadSiteHistory(siteId) {
    if (!siteId) return;
    if (!isServerMode()) {
      const site = sites.filter((item) => item.id === siteId)[0];
      const items = localHistory.filter((item) => item.site_id === siteId).slice(0, 20);
      selectedHistory = {
        site_id: siteId,
        site_name: site?.name || '',
        items,
      };
      collectionState = { running: false, message: `已加载浏览器本地站点历史：${items.length} 条。` };
      render();
      return;
    }

    try {
      const response = await fetch(`${COLLECTOR_SERVER_URL}/api/history?site_id=${encodeURIComponent(siteId)}&limit=20`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || `HTTP ${response.status}`);
      }
      const site = sites.filter((item) => item.id === siteId)[0];
      selectedHistory = {
        site_id: siteId,
        site_name: site?.name || '',
        items: Array.isArray(payload.items) ? payload.items : [],
      };
      collectionState = { running: false, message: `已加载站点历史：${selectedHistory.items.length} 条。` };
      render();
    } catch (error) {
      collectionState = { running: false, message: `站点历史加载失败：${error && error.message ? error.message : String(error)}` };
      render();
    }
  }

  function restoreServerBackup() {
    if (!isServerMode()) {
      alert('服务器恢复需要通过 http:// 或 https:// 打开本工具。file:// 静态页面请使用“导入站点”。');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async function () {
      const file = input.files && input.files[0];
      if (!file) return;
      const confirmed = window.confirm('服务器恢复会覆盖服务端保存的站点配置，并在备份含 results 时覆盖最近结果。确定继续吗？');
      if (!confirmed) return;
      try {
        const payload = JSON.parse(await file.text());
        const response = await fetch(`${COLLECTOR_SERVER_URL}/api/restore`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const output = await response.json();
        if (!response.ok) {
          throw new Error(output.error || `HTTP ${response.status}`);
        }
        await syncFromServer();
        collectionState = { running: false, message: `服务器恢复完成：${output.total || 0} 个站点。` };
        render();
      } catch (error) {
        collectionState = { running: false, message: `服务器恢复失败：${error && error.message ? error.message : String(error)}` };
        render();
      }
    };
    input.click();
  }

  async function collectAllSites() {
    if (sites.length === 0) {
      collectionState = { running: false, message: '还没有站点。请先新增站点并保存。' };
      render();
      return;
    }

    if (isServerMode()) {
      collectionState = { running: true, message: `正在通过服务器采集 ${sites.length} 个站点...` };
      render();
      const serverResult = await collectAllViaServer();
      if (serverResult.ok) {
        applyResultsOutput(serverResult.output);
        await loadHistorySummary({ silent: true, skipRender: true });
        await loadServerStatus({ silent: true, skipRender: true });
        collectionState = {
          running: false,
          message: `服务器采集完成：${serverResult.output.total || 0} 个站点。`,
        };
      } else {
        collectionState = {
          running: false,
          message: `服务器采集失败：${serverResult.error}`,
        };
      }
      render();
      return;
    }

    collectionState = { running: true, message: `开始自动更新 ${sites.length} 个站点...` };
    render();

    let successCount = 0;
    for (let i = 0; i < sites.length; i += 1) {
      const site = sites[i];
      collectionState = { running: true, message: `正在更新 ${i + 1}/${sites.length}：${site.name || site.base_url || site.id}` };
      render();
      const result = await collectSiteWithFallback(site);
      autoResults[site.id] = result;
      appendLocalHistory(result);
      if (result.status !== 'query_failed' && result.status !== 'not_configured') {
        successCount += 1;
      }
      saveAutoResults();
    }

    collectionState = {
      running: false,
      message: `自动更新完成：${successCount}/${sites.length} 个站点成功或部分成功。若失败原因包含“跨域/CORS/Failed to fetch”，需要改用本地采集器。`,
    };
    render();
  }

  async function collectOneSiteById(id) {
    const site = sites.filter((item) => item.id === id)[0];
    if (!site) return;

    collectionState = { running: true, message: `正在更新：${site.name || site.base_url || site.id}` };
    render();

    const result = await collectSiteWithFallback(site);
    autoResults[site.id] = result;
    appendLocalHistory(result);
    saveAutoResults();
    if (isServerMode()) {
      await loadHistorySummary({ silent: true, skipRender: true });
    }

    collectionState = {
      running: false,
      message:
        result.status === 'query_failed'
          ? `更新失败：${result.last_error || '未知错误'}`
          : `更新完成：${site.name || site.base_url || site.id}`,
    };
    render();
  }

  async function collectAllViaServer() {
    try {
      await saveSitesToServer();
      const response = await fetch(`${COLLECTOR_SERVER_URL}/api/collect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sites }),
      });
      const output = await response.json();
      if (!response.ok) {
        return { ok: false, error: output.error || `HTTP ${response.status}` };
      }
      return { ok: true, output };
    } catch (error) {
      return {
        ok: false,
        error: error && error.message ? error.message : String(error),
      };
    }
  }

  function applyResultsOutput(output) {
    const results = Array.isArray(output?.results) ? output.results : [];
    for (let i = 0; i < results.length; i += 1) {
      const result = results[i];
      if (result && result.site_id) {
        autoResults[result.site_id] = result;
      }
    }
    saveAutoResults();
  }

  async function collectSiteWithFallback(site) {
    const browserResult = await collectSiteInBrowser(site);
    if (!isCorsLikeFailure(browserResult) || isDirectMode()) {
      return browserResult;
    }

    const localResult = await collectOneViaLocalServer(site);
    if (localResult.ok) {
      return {
        ...localResult.result,
        last_error: localResult.result.last_error || '',
      };
    }

    return {
      ...browserResult,
        last_error:
          `${browserResult.last_error} 本地采集服务也未连上：${localResult.error}。` +
        `请运行 app\\start-local-server.bat，或把工具部署到服务器后从 http(s) 地址打开。当前采集服务地址：${COLLECTOR_SERVER_URL}`,
      };
    }

  function isCorsLikeFailure(result) {
    return (
      result &&
      result.status === 'query_failed' &&
      /Failed to fetch|CORS|跨域/i.test(String(result.last_error || ''))
    );
  }

  async function collectOneViaLocalServer(site) {
    try {
      const response = await fetch(`${COLLECTOR_SERVER_URL}/api/collect-one`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site }),
      });
      const payload = await response.json();
      if (!response.ok) {
        return { ok: false, error: payload.error || `HTTP ${response.status}` };
      }
      return { ok: true, result: payload.result };
    } catch (error) {
      return {
        ok: false,
        error: error && error.message ? error.message : String(error),
      };
    }
  }

  async function saveSitesToServer() {
    if (!isServerMode()) return;
    try {
      await fetch(`${COLLECTOR_SERVER_URL}/api/sites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sites }),
      });
    } catch {
      // Keep localStorage as the fallback; the UI will surface collection failures separately.
    }
  }

  async function syncFromServer() {
    if (!isServerMode()) return;
    try {
      const sitesResponse = await fetch(`${COLLECTOR_SERVER_URL}/api/sites`);
      const sitesPayload = await sitesResponse.json();
      const serverSites = Array.isArray(sitesPayload?.sites) ? sitesPayload.sites : [];

      if (serverSites.length > 0) {
        sites = serverSites;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sites));
      } else if (sites.length > 0) {
        await saveSitesToServer();
      }

      const resultsResponse = await fetch(`${COLLECTOR_SERVER_URL}/api/results`);
      const resultsPayload = await resultsResponse.json();
      applyResultsOutput(resultsPayload);
      await loadHistorySummary({ silent: true, skipRender: true });
      await loadServerStatus({ silent: true, skipRender: true });

      collectionState = {
        running: false,
        message: serverSites.length > 0 ? '已从服务器同步站点配置和最近采集结果。' : '',
      };
      render();
    } catch {
      collectionState = {
        running: false,
        message: '服务器同步失败。页面会继续使用浏览器本地数据。',
      };
      render();
    }
  }

  function isHttpHosted() {
    return window.location.protocol === 'http:' || window.location.protocol === 'https:';
  }

  function isDirectMode() {
    return directMode;
  }

  function isServerMode() {
    return isHttpHosted() && !directMode;
  }

  function getCollectorServerUrl() {
    if (isServerMode()) {
      return window.location.origin;
    }
    return 'http://127.0.0.1:8787';
  }

  async function collectSiteInBrowser(site) {
    if (site.type === 'sub2api') {
      return collectSub2apiInBrowser(site);
    }
    if (site.type === 'new_api') {
      return collectNewApiInBrowser(site);
    }
    return buildBrowserResult(site, {
      status: 'query_failed',
      last_error: `未知站点类型: ${site.type}`,
    });
  }

  async function collectSub2apiInBrowser(site) {
    const baseUrl = normalizeBaseUrl(site.base_url);
    const headers = buildBearerHeaders(site.auth_payload);
    const result = buildBrowserResult(site, {
      status: 'manual_review',
      quota_summary: '等待 sub2api 自动采集',
      monitor_summary: '等待 sub2api 自动采集',
    });

    if (!baseUrl) {
      result.status = 'not_configured';
      result.last_error = '缺少根地址';
      return result;
    }
    if (!headers.Authorization) {
      result.status = 'not_configured';
      result.last_error = '缺少 access_token';
      return result;
    }

    const profile = await safeGetJson(`${baseUrl}/api/v1/user/profile`, headers);
    if (profile.ok && profile.data) {
      const balance = pickFirstNumber(profile.data, ['balance', 'remaining_balance', 'remain_balance', 'credit', 'credits']);
      result.capabilities.push('profile');
      result.monitor_summary = '用户资料接口已接入';
      if (balance !== null) {
        result.balance = balance;
        result.balance_source = 'auto';
        result.capabilities.push('balance');
      } else {
        result.quota_summary = 'profile 成功，但未发现余额字段';
      }
    }

    const quotas = await safeGetJson(`${baseUrl}/api/v1/user/platform-quotas`, headers);
    if (quotas.ok) {
      const items = Array.isArray(quotas.data?.platform_quotas) ? quotas.data.platform_quotas : [];
      result.quota_summary = items.length > 0 ? `${items.length} 个平台额度窗口` : '无平台额度记录';
      result.capabilities.push('quota');
    }

    const monitors = await safeGetJson(`${baseUrl}/api/v1/channel-monitors`, headers);
    if (monitors.ok) {
      const items = Array.isArray(monitors.data?.items) ? monitors.data.items : [];
      result.monitor_summary = items.length > 0 ? `${items.length} 个渠道监控项` : '无监控项';
      result.capabilities.push('monitor');
    }

    return finishBrowserResult(site, result, [profile, quotas, monitors]);
  }

  async function collectNewApiInBrowser(site) {
    const baseUrl = normalizeBaseUrl(site.base_url);
    const headers = buildBearerHeaders(site.auth_payload);
    const userId = String(site.user_id || '').trim();
    const result = buildBrowserResult(site, {
      status: 'manual_review',
      quota_summary: '等待 new api 自动采集',
      monitor_summary: '等待 new api 自动采集',
    });

    if (!baseUrl) {
      result.status = 'not_configured';
      result.last_error = '缺少根地址';
      return result;
    }
    if (!headers.Authorization) {
      result.status = 'not_configured';
      result.last_error = '缺少 access token';
      return result;
    }
    if (userId) {
      headers['New-Api-User'] = userId;
    }

    const self = await safeGetJson(`${baseUrl}/api/user/self`, headers);
    if (self.ok && self.data) {
      const quota = numberOrNull(self.data.quota);
      const usedQuota = numberOrNull(self.data.used_quota);
      result.capabilities.push('quota');
      result.quota_summary = buildQuotaSummary(quota, usedQuota);
      result.monitor_summary = '用户侧接口已接入';
    }

    return finishBrowserResult(site, result, [self]);
  }

  function finishBrowserResult(site, result, attempts) {
    if (result.capabilities.length === 0) {
      const firstError = attempts.map((item) => item.error).filter(Boolean)[0];
      result.status = 'query_failed';
      result.last_error = firstError || '没有成功获取任何信息';
      return result;
    }

    if (typeof result.balance === 'number') {
      result.status = result.balance <= Number(site.balance_threshold || 0) ? 'low_balance' : 'normal';
    } else {
      result.status = 'manual_review';
    }
    result.last_error = '';
    return result;
  }

  function buildBrowserResult(site, overrides) {
    const manualBalance =
      site.manual_balance === '' || site.manual_balance === null || site.manual_balance === undefined
        ? null
        : Number(site.manual_balance);

    return {
      site_id: site.id,
      site_name: site.name,
      site_type: site.type,
      status: 'manual_review',
      balance: manualBalance,
      balance_source: manualBalance === null ? 'unknown' : 'manual',
      quota_summary: '待接入',
      monitor_summary: '待接入',
      last_checked_at: new Date().toISOString(),
      last_error: '',
      capabilities: [],
      ...(overrides || {}),
    };
  }

  function normalizeBaseUrl(value) {
    return String(value || '').trim().replace(/\/+$/, '');
  }

  function buildBearerHeaders(tokenValue) {
    const token = String(tokenValue || '').trim();
    const headers = { Accept: 'application/json' };
    if (token) {
      headers.Authorization = /^Bearer\s+/i.test(token) ? token : `Bearer ${token}`;
    }
    return headers;
  }

  function buildQuotaSummary(quota, usedQuota) {
    if (quota === null && usedQuota === null) return '未返回 quota 字段';
    if (quota !== null && usedQuota !== null) return `额度 ${quota} / 已用 ${usedQuota}`;
    if (quota !== null) return `额度 ${quota}`;
    return `已用 ${usedQuota}`;
  }

  function numberOrNull(value) {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  function pickFirstNumber(source, keys) {
    if (!source || typeof source !== 'object') return null;

    for (let i = 0; i < keys.length; i += 1) {
      const direct = numberOrNull(source[keys[i]]);
      if (direct !== null) return direct;
    }

    const queue = [source];
    const seen = [];
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || typeof current !== 'object' || seen.indexOf(current) >= 0) continue;
      seen.push(current);

      const entries = Object.entries(current);
      for (let i = 0; i < entries.length; i += 1) {
        const key = entries[i][0];
        const value = entries[i][1];
        if (keys.indexOf(key) >= 0) {
          const parsed = numberOrNull(value);
          if (parsed !== null) return parsed;
        }
        if (value && typeof value === 'object') queue.push(value);
      }
    }

    return null;
  }

  async function safeGetJson(url, headers) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });
      const text = await response.text();
      let data = null;
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
      if (!response.ok) {
        return {
          ok: false,
          error: `HTTP ${response.status} ${response.statusText}: ${summarizeResponse(data, text)}`,
        };
      }
      if (data && data.success === false) {
        return {
          ok: false,
          error: `业务失败: ${data.message || data.error || summarizeResponse(data, text)}`,
          data: data.data !== undefined ? data.data : data,
        };
      }
      return {
        ok: true,
        data: data && data.data !== undefined ? data.data : data,
      };
    } catch (error) {
      const message = error && error.message ? error.message : String(error);
      return {
        ok: false,
        error: `${message}。如果这里显示 Failed to fetch，通常是浏览器跨域/CORS 限制，需要用本地采集器。`,
      };
    }
  }

  function summarizeResponse(data, text) {
    if (data && typeof data === 'object') {
      const message = data.message || data.error || data.detail;
      if (message) return String(message);
      try {
        return JSON.stringify(data).slice(0, 180);
      } catch {
        return '返回了 JSON，但无法摘要';
      }
    }
    return String(text || '').slice(0, 180) || '无响应正文';
  }

  function collectDraftFromForm() {
    const formElement = document.getElementById('site-form');
    const form = new FormData(formElement);
    const current = editingDraft || sites.filter((site) => site.id === editingId)[0] || clone(DEFAULT_SITE);

    return {
      ...current,
      id: editingId || current.id || '',
      name: String(form.get('name') || '').trim(),
      type: String(form.get('type') || current.type || 'new_api'),
      base_url: String(form.get('base_url') || '').trim(),
      login_url: String(form.get('login_url') || '').trim(),
      group_name: String(form.get('group_name') || '').trim(),
      account_label: String(form.get('account_label') || '').trim(),
      auth_mode: String(form.get('auth_mode') || current.auth_mode || 'manual'),
      auth_payload: String(form.get('auth_payload') || '').trim(),
      user_id: String(form.get('user_id') || '').trim(),
      balance_threshold: Number(form.get('balance_threshold') || 0),
      manual_balance: String(form.get('manual_balance') || '').trim(),
      manual_checked_at: String(form.get('manual_checked_at') || '').trim(),
      manual_note: String(form.get('manual_note') || '').trim(),
      notes: String(form.get('notes') || '').trim(),
      enabled: document.getElementById('enabled').checked,
    };
  }

  function renderDraft(draft) {
    if (!draft) return;
    editingDraft = clone(draft);
    render();
  }

  try {
    render();
    restartAutoRefreshTimer();
    syncFromServer();
  } catch (error) {
    app.innerHTML = `
      <div class="app">
        <div class="panel form-panel">
          <h2>页面加载失败</h2>
          <div class="hint">
            ${escapeHtml(error && (error.stack || error.message) ? error.stack || error.message : String(error))}
          </div>
        </div>
      </div>
    `;
  }
})();
