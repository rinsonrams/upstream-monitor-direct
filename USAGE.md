# 使用说明

当前版本：`v0.4.7`

## 1. 先回答最关键的问题

有，当前项目仍然保留“第一版一样的本地打开就能用”的方式。

最简单入口：

```text
upstream-monitor-project\app\index.html
```

你也可以双击：

```text
upstream-monitor-project\app\start-static-page.bat
```

这就是 Lite Local Static，本地静态急用版。

## 2. 三种常用打开方式

### 2.1 只想马上用：本地静态版

适合：

- 临时记录上游站点。
- 手动维护余额。
- 导入导出站点。
- 给别人演示界面。

打开方式：

```text
双击 app\index.html
```

或：

```text
双击 app\start-static-page.bat
```

限制：

- 数据保存在当前浏览器本地存储里。
- 浏览器直接请求上游时，可能被 CORS 拦截。
- 不适合长期自动采集。

### 2.2 想在电脑上自动查：本地采集版

适合：

- 你自己的电脑开着。
- 想绕过浏览器 CORS。
- 想点“自动更新全部”获取余额。

打开方式：

```text
双击 app\start-local-server.bat
```

然后浏览器访问：

```text
http://127.0.0.1:8787
```

说明：

- 这个模式需要 Node.js，启动脚本会优先寻找项目里的 bundled Node。
- 站点配置会保存到 `app/data/sites.server.json`。
- 最近结果会保存到 `app/data/last-results.json`。

### 2.3 不想抱着电脑查：服务器标准版

适合：

- 手机随时查看。
- 服务器定时自动采集。
- 小团队内部使用。

服务器启动示例：

```bash
cd /path/to/upstream-monitor-project/app
UPSTREAM_MONITOR_USERNAME=admin \
UPSTREAM_MONITOR_PASSWORD='change-this-password' \
UPSTREAM_MONITOR_INTERVAL_SECONDS=300 \
node local-server.mjs
```

推荐再配：

- Nginx 反向代理。
- HTTPS。
- Basic Auth、IP 白名单或 VPN。

### 2.4 想放到 GitHub 给手机访问：GitHub Pages 演示版

适合：

- 手机打开页面。
- 给别人看界面。
- 手工记录和演示。
- 上游允许跨域时，直接更新真实余额。

不适合：

- 上游不允许跨域。
- 后台持续定时采集。
- 多人共享生产数据。

详细部署见：

```text
GITHUB_PAGES.md
```

## 3. 当前页面能做什么

- 添加 `new api` / `sub2api` 上游站点。
- 记录根地址、登录地址、账号标识、分组和备注。
- 选择鉴权方式。
- 保存 token / cookie。
- 默认遮罩显示鉴权内容。
- 手动记录余额和核查时间。
- 自动更新全部或单个站点。
- 复制诊断信息。
- 脱敏导出。
- 完整备份。
- 服务器备份。
- 服务器恢复。
- 服务器历史下载。
- 服务器历史摘要。
- 复制验收步骤。
- 单站点历史详情。
- GitHub / 在线页运行模式切换。
- 页面打开期间自动刷新。

## 4. 导出和备份怎么选

脱敏导出：

- 会清空 `auth_payload`。
- 适合发给别人排查。
- 适合做演示数据。

完整备份：

- 包含站点和最近结果。
- 可能包含 token / cookie。
- 只适合自己私密保存。

服务器备份：

- 只在 `http://` 或 `https://` 打开时可用。
- 下载服务端保存的数据。
- 可能包含 token / cookie。
- 包含最近历史记录。

服务器历史：

- 只在 `http://` 或 `https://` 打开时可用。
- 下载最近 500 条采集历史。
- 数据来自 `app/data/history/`。

服务器历史摘要：

- 只在 `http://` 或 `https://` 打开时显示。
- 页面会展示最近历史覆盖的站点数。
- 每个站点显示记录数、失败次数、低余额次数和连续失败次数。
- 可点击“刷新历史”手动更新。
- 如果服务器有最近结果但没有历史，可点击“回填最近结果”补一条历史。
- 如果服务器历史和最近结果都是 0，请先点击“自动更新全部”采集一次。

服务器数据状态：

- 只在 `http://` 或 `https://` 打开时显示。
- 显示服务器数据目录、站点配置数、最近结果数、历史记录数、备份文件数和运行时长。
- 点击“刷新状态”可以确认服务器是否真的读到了配置、结果和历史文件。
- 复制诊断时会包含服务器状态，方便继续排查。

单站点历史详情：

- 每行站点有 `历史` 按钮。
- 点击后显示最近 20 条采集记录。
- 本地静态 `file://` 模式显示浏览器本地历史。
- 服务器模式显示服务器历史。

服务器恢复：

- 只在 `http://` 或 `https://` 打开时可用。
- 会覆盖服务端站点配置。
- 恢复前会自动把旧文件备份到 `app/data/backups/`。

## 4.1 你亲自测试时怎么做

页面顶部有：

```text
复制验收步骤
```

点击后会复制一份当前打开方式对应的测试步骤。

如果测试中遇到问题，再点击：

```text
复制诊断
```

把诊断内容发给开发者继续排查。

## 5. `sub2api` 推荐填写方式

- 站点类型：`sub2api`
- 根地址：例如 `https://api.example.com`
- 登录地址：例如 `https://api.example.com/login`
- 鉴权方式：`Token`
- 鉴权内容：登录后得到的 `access_token`
- User ID：留空

当前会尝试采集：

- `GET /api/v1/user/profile`
- `GET /api/v1/user/platform-quotas`
- `GET /api/v1/channel-monitors`

## 6. `new api` 推荐填写方式

- 站点类型：`new api`
- 根地址：例如 `https://newapi.example.com`
- 登录地址：对应后台登录页
- 鉴权方式：`Token + User ID`
- 鉴权内容：access token
- User ID：该账号对应的用户 ID

当前会尝试采集：

- `GET /api/user/self`

注意：

- 部分 `new api` 接口除了 token，还要求请求头 `New-Api-User`。
- 所以 `new api` 优先使用 `Token + User ID`。

## 7. 如果拿不到 token

不要卡住。

可以先这样用：

- 鉴权方式选 `手工维护`。
- 录入站点名称、类型、根地址、登录地址。
- 每次人工登录上游后，把余额填到“人工余额”。
- 用“人工核查时间”和“备注”记录来源。

这样今天就能先把所有上游收拢到一个页面里。

## 8. 遇到查询失败怎么办

如果错误包含：

- `Failed to fetch`
- `CORS`
- `跨域`

通常不是 token 一定错，而是浏览器限制。

解决方式：

```text
双击 app\start-local-server.bat
打开 http://127.0.0.1:8787
再点 自动更新全部
```

如果服务器版已部署，就用服务器地址打开，不要用 `file://` 打开。
