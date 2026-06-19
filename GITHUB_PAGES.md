# GitHub Pages 部署说明

当前版本：`v0.4.7`

## 1. 先说结论

现在的 GitHub Pages 版本不再只是演示页。

如果你的上游站点允许浏览器跨域访问，那么把 `app/` 部署到 GitHub Pages 后，可以直接：

- 录入 `new api` / `sub2api`
- 手动点击 `更新` 或 `自动更新全部`
- 在页面打开期间按 1 分钟 / 5 分钟 / 15 分钟自动刷新
- 在手机上打开并查看哪个账号该充值

但前提必须满足：

- 上游真的允许跨域
- 上游允许请求头：
  - `Authorization`
  - `New-Api-User`
  - `Content-Type`
- 你使用的是 `Token` 或 `Token + User ID`

如果上游不允许跨域，GitHub Pages 版仍然会失败，这不是页面本身的问题。

## 2. 适合什么场景

适合：

- 你想在手机上随时打开看看余额
- 你想手动点一下更新，知道当前余额
- 你想页面开着时每几分钟自动刷新一次
- 你不需要后台 24 小时持续采集

不适合：

- 上游不允许跨域
- 需要后台持续定时采集
- 需要服务器历史、服务器恢复、服务器备份

## 3. 运行模式

GitHub Pages 打开后，默认会走：

```text
浏览器直连
```

这个模式下：

- 页面直接请求你填写的上游地址
- 不依赖 `local-server.mjs`
- 不依赖你自己的采集服务器
- 历史使用浏览器本地历史

## 4. 部署方式 A：直接发布 `app/`

确认你发布的目录包含：

```text
index.html
src/
.nojekyll
```

如果你新建一个仓库，例如：

```text
upstream-monitor-direct
```

把 `upstream-monitor-project/app/` 里的这些静态文件放到仓库根目录，然后在 GitHub 的 `Pages` 里选择：

- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/root`

访问地址类似：

```text
https://你的用户名.github.io/upstream-monitor-direct/
```

## 5. 部署方式 B：GitHub Actions 发布 `app/`

如果你保留完整项目结构：

```text
upstream-monitor-project/
  app/
  docs/
  releases/
```

可以用 Actions 只发布 `app/`：

```yaml
name: Deploy GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: app
      - id: deployment
        uses: actions/deploy-pages@v4
```

## 6. 使用步骤

1. 打开 GitHub Pages 地址。
2. 保持运行模式为 `浏览器直连`。
3. 新增一个站点。
4. 对 `sub2api` 用 `Token`。
5. 对 `new api` 优先用 `Token + User ID`。
6. 点击单站 `更新`，或者点击 `自动更新全部`。
7. 如果你希望页面开着时自动刷新，选择 `1 分钟`、`5 分钟` 或 `15 分钟`。

## 7. 你会看到什么

成功时：

- 余额更新为真实值
- 状态变成 `正常` 或 `低余额`
- 浏览器本地历史会记录这次结果

失败时：

- 通常会看到 `Failed to fetch`
- 或跨域 / CORS 相关错误

这通常表示：

- 上游没放行跨域
- 请求头被拦截
- Token / User ID 填错

## 8. 安全提醒

GitHub Pages 是公开静态托管。

所以：

- 不建议把真实站点配置导出后公开分享
- 不建议把公共演示仓库直接拿来存真实账号池
- 真要长期用，最好专门建一个私人使用仓库

## 9. 什么时候切回服务器版

如果出现这些需求，就该用服务器版：

- 上游不允许跨域
- 你希望页面不打开也能定时采集
- 你需要服务器历史
- 你需要备份 / 恢复 / 服务器状态

入口文档：

```text
DEPLOY.md
```
