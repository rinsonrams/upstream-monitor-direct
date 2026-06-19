# Upstream Monitor App

这是上游账号池监控工具的应用目录。

## 当前版本

- Version: `v0.4.7`
- Stage: GitHub direct edition

## 能力

- 本地静态页面。
- `start-static-page.bat` 一键打开静态页面。
- 本地/服务器 Node 采集服务。
- `new api` / `sub2api` 基础适配。
- `new api` token 辅助脚本。
- `sub2api` token 辅助脚本。
- 服务端保存站点配置。
- 服务端保存最近采集结果。
- 可配置定时采集。
- 可配置 Basic Auth 访问保护。
- 鉴权内容默认隐藏。
- 脱敏导出。
- 完整备份。
- 服务器备份和恢复。
- Docker Compose 部署文件。
- Linux 服务器启动脚本。
- GitHub Pages 演示版说明。
- `github.io` 静态托管安全提示。
- 服务端采集历史。
- 服务器历史下载。
- 服务器历史摘要面板。
- 最近结果回填到服务器历史。
- 服务器历史为空时的修复提示。
- 服务器数据状态面板。
- 浏览器直连模式。
- 页面打开期间自动刷新。
- 用户验收步骤复制。
- 站点级历史详情。

## 快速启动

Windows 本地：

```text
start-static-page.bat
```

Windows 本地采集：

```text
start-local-server.bat
```

服务器：

```bash
cp .env.example .env
docker compose up -d --build
```

## 入口文件

- `index.html`
- `src/app.js`
- `src/styles.css`
- `local-server.mjs`

## 文档

- `USAGE.md`
- `DEPLOY.md`
- `GITHUB_PAGES.md`
- `USER_TEST.md`
- `VERSION.md`
- `CHANGELOG.md`
- `../docs/2026-06-14-product-editions-and-deployment-matrix.md`
- `../docs/2026-06-14-stage-snapshot-v0.4.3.md`
- `../docs/2026-06-14-stage-snapshot-v0.4.1.md`
- `../docs/2026-06-14-stage-snapshot-v0.4.0.md`
- `../docs/2026-06-14-stage-snapshot-v0.3.5.md`
- `../docs/2026-06-14-stage-snapshot-v0.3.4.md`
- `../docs/2026-06-14-stage-snapshot-v0.3.3.md`
- `../docs/2026-06-14-stage-snapshot-v0.3.2.md`
- `../docs/2026-06-14-stage-snapshot-v0.3.1.md`
- `../docs/2026-06-14-commercial-roadmap.md`

## 迁移提醒

如果只复制 `app/` 目录，也能运行应用。

如果要保留完整项目文档，请复制整个目录：

```text
upstream-monitor-project/
```
