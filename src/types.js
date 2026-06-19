export const SITE_TYPES = [
  { value: 'new_api', label: 'new api' },
  { value: 'sub2api', label: 'sub2api' },
];

export const AUTH_MODES = [
  { value: 'manual', label: '手工维护' },
  { value: 'token', label: 'Token' },
  { value: 'token_with_user_id', label: 'Token + User ID' },
  { value: 'cookie', label: 'Cookie' },
];

export const STATUS_TYPES = [
  { value: 'normal', label: '正常' },
  { value: 'low_balance', label: '低余额' },
  { value: 'query_failed', label: '查询失败' },
  { value: 'manual_review', label: '待核查' },
  { value: 'not_configured', label: '未配置' },
];

export const DEFAULT_SITE = {
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
