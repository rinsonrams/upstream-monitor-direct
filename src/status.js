export function buildSiteView(site) {
  const now = new Date().toISOString();
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
    lastCheckedAt = lastCheckedAt || now;
  } else {
    status = 'normal';
    quotaSummary = '人工维护';
    monitorSummary = '人工维护';
    lastCheckedAt = lastCheckedAt || now;
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

export function buildSummary(items) {
  const summary = {
    total: items.length,
    normal: 0,
    low_balance: 0,
    query_failed: 0,
    manual_review: 0,
    not_configured: 0,
  };

  for (const item of items) {
    const key = item.computed.status;
    if (summary[key] !== undefined) {
      summary[key] += 1;
    }
  }

  return summary;
}
