import { AUTH_MODES, DEFAULT_SITE, SITE_TYPES, STATUS_TYPES } from './types.js';
import { exportSites, importSites, loadSites, saveSites } from './storage.js';
import { buildSiteView, buildSummary } from './status.js';

const app = document.getElementById('app');
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

let sites = loadSites();
let editingId = null;
let filters = {
  keyword: '',
  status: 'all',
  type: 'all',
};

function uid() {
  return `site-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function render() {
  const items = sites.map(buildSiteView);
  const filtered = items.filter((item) => {
    const keyword = filters.keyword.trim().toLowerCase();
    const keywordPass =
      keyword === '' ||
      [item.name, item.group_name, item.base_url, item.account_label]
        .join(' ')
        .toLowerCase()
        .includes(keyword);
    const statusPass = filters.status === 'all' || item.computed.status === filters.status;
    const typePass = filters.type === 'all' || item.type === filters.type;
    return keywordPass && statusPass && typePass;
  });
  const summary = buildSummary(items);
  const editing = sites.find((site) => site.id === editingId) || { ...DEFAULT_SITE };

  app.innerHTML = `
    <div class="app">
      <section class="hero">
        <div>
          <h1>上游账号池监控工具</h1>
          <p>第一阶段急用版。先统一维护某某 new api、某某 sub2api 站点，用最少配置集中看余额、状态、待核查项，并保留后续自动采集接入口。</p>
        </div>
        <div class="toolbar">
          <button class="btn-secondary" id="import-sites">导入站点</button>
          <button class="btn-secondary" id="export-sites">导出站点</button>
          <button class="btn-primary" id="new-site">新增站点</button>
        </div>
      </section>

      <section class="stats">
        ${statCard('总站点', summary.total)}
        ${statCard('正常', summary.normal)}
        ${statCard('低余额', summary.low_balance)}
        ${statCard('查询失败', summary.query_failed)}
        ${statCard('待核查', summary.manual_review + summary.not_configured)}
      </section>

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
              <button class="btn-ghost" id="mark-example">加载示例</button>
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
                    ? `<tr><td colspan="8"><div class="empty">当前没有匹配的站点。先新增站点，或点击“加载示例”。</div></td></tr>`
                    : filtered
                        .map(
                          (item) => `
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
                                  <button class="btn-ghost open-login" data-url="${escapeHtml(item.login_url || item.base_url || '')}">打开站点</button>
                                  <button class="btn-ghost clone-site" data-id="${item.id}">复制</button>
                                  <button class="btn-ghost delete-site" data-id="${item.id}">删除</button>
                                </div>
                              </td>
                            </tr>
                          `
                        )
                        .join('')
                }
              </tbody>
            </table>
          </div>
        </div>

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
              ${inputField('user_id', 'User ID（仅 new api 某些接口需要）', editing.user_id)}
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
          <div class="hint">
            第一版先把站点统一收拢。自动采集器后续接入时，优先支持 `sub2api` 的 Bearer token，以及 `new api` 的 token / token + user id 模式；打不通时仍然可以靠人工余额继续使用。
          </div>
        </aside>
      </section>
    </div>
  `;

  bindEvents();
}

function statCard(label, value) {
  return `
    <div class="panel stat-card">
      <div class="stat-label">${label}</div>
      <div class="stat-value">${value}</div>
    </div>
  `;
}

function inputField(name, label, value, placeholder = '', type = 'text') {
  return `
    <div class="field">
      <label for="${name}">${label}</label>
      <input id="${name}" name="${name}" type="${type}" value="${escapeHtml(value ?? '')}" placeholder="${escapeHtml(placeholder)}" />
    </div>
  `;
}

function textAreaField(name, label, value, placeholder = '') {
  return `
    <div class="field full">
      <label for="${name}">${label}</label>
      <textarea id="${name}" name="${name}" placeholder="${escapeHtml(placeholder)}">${escapeHtml(value ?? '')}</textarea>
    </div>
  `;
}

function selectField(name, label, options, selected) {
  return `
    <div class="field">
      <label for="${name}">${label}</label>
      <select id="${name}" name="${name}">
        ${options.map((item) => `<option value="${item.value}" ${item.value === selected ? 'selected' : ''}>${item.label}</option>`).join('')}
      </select>
    </div>
  `;
}

function typeLabel(type) {
  return SITE_TYPES.find((item) => item.value === type)?.label || type;
}

function statusLabel(status) {
  return STATUS_TYPES.find((item) => item.value === status)?.label || status;
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

function bindEvents() {
  document.getElementById('new-site').addEventListener('click', () => {
    editingId = null;
    render();
  });

  document.getElementById('reset-form').addEventListener('click', () => {
    editingId = null;
    render();
  });

  document.getElementById('clear-filters').addEventListener('click', () => {
    filters = { keyword: '', status: 'all', type: 'all' };
    render();
  });

  document.getElementById('filter-keyword').addEventListener('input', (event) => {
    filters.keyword = event.target.value;
    render();
  });

  document.getElementById('filter-status').addEventListener('change', (event) => {
    filters.status = event.target.value;
    render();
  });

  document.getElementById('filter-type').addEventListener('change', (event) => {
    filters.type = event.target.value;
    render();
  });

  document.getElementById('export-sites').addEventListener('click', () => exportSites(sites));

  document.getElementById('import-sites').addEventListener('click', async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        sites = await importSites(file);
        saveSites(sites);
        editingId = null;
        render();
      } catch (error) {
        alert(error.message || '导入失败');
      }
    };
    input.click();
  });

  document.getElementById('mark-example').addEventListener('click', () => {
    sites = structuredClone(EXAMPLE_SITES);
    saveSites(sites);
    editingId = null;
    render();
  });

  document.getElementById('site-form').addEventListener('submit', (event) => {
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
      sites = [payload, ...sites];
    }

    saveSites(sites);
    editingId = payload.id;
    render();
  });

  document.querySelectorAll('.edit-site').forEach((button) => {
    button.addEventListener('click', () => {
      editingId = button.dataset.id;
      render();
    });
  });

  document.querySelectorAll('.clone-site').forEach((button) => {
    button.addEventListener('click', () => {
      const source = sites.find((site) => site.id === button.dataset.id);
      if (!source) return;
      const copy = {
        ...source,
        id: uid(),
        name: `${source.name}-copy`,
      };
      sites = [copy, ...sites];
      saveSites(sites);
      editingId = copy.id;
      render();
    });
  });

  document.querySelectorAll('.delete-site').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.id;
      const target = sites.find((site) => site.id === id);
      if (!target) return;
      if (!confirm(`确定删除站点“${target.name}”吗？`)) return;
      sites = sites.filter((site) => site.id !== id);
      if (editingId === id) {
        editingId = null;
      }
      saveSites(sites);
      render();
    });
  });

  document.querySelectorAll('.open-login').forEach((button) => {
    button.addEventListener('click', () => {
      const url = button.dataset.url;
      if (!url) {
        alert('当前站点没有可打开的地址');
        return;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    });
  });
}

render();
