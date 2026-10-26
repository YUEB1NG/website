# 后端与独立部署 / Backend and deployment

本项目包含静态前端和 Cloudflare Worker。现有公开网站为 [YUEB1NG](https://yueb1ng-wabi.quyue.chatgpt.site/)。从 GitHub 克隆源码不会取得该站的账号、密钥、存储或现有调度。

The repository contains a static frontend and Cloudflare Worker. Cloning it does not provide the hosted site's accounts, secrets, storage or existing schedule.

## 本机 / Local

```sh
npm ci
npm run dev
```

Vite 提供前端与 Worker 开发环境。R2 本机持久化由开发工具管理，真实云端绑定在开发配置中关闭。构建时执行类型检查并生成两个环境：

Vite provides frontend/Worker development with local storage simulation. Remote bindings are disabled in development. The build checks types and emits both environments:

```sh
npm run build
npm run preview
```

- `dist/client/`：静态页面、脚本、字体与素材 / Static client
- `dist/server/`：Worker 代码和 Wrangler 部署配置 / Worker and Wrangler config

## Cloudflare Worker

先为自己的 Cloudflare 账号创建 R2 存储，按账号实际情况修改 [vite.config.ts](../vite.config.ts) 中的 Worker 名称和 R2 bucket。代码使用的绑定名保持 `BUCKET`。R2 与 Worker 的额度、网络和平台服务状态单独管理。

Create an R2 bucket in your own account and adjust the Worker/bucket names in Vite config. Keep the binding named BUCKET. Quotas, connectivity and hosting status are managed separately.

构建后可用已有项目依赖中的 Wrangler 发布：

After building, deploy with the project-local Wrangler dependency:

```sh
npx wrangler deploy --config dist/server/wrangler.json
npx wrangler secret put PLAYLIST_UPDATER_TOKEN --config dist/server/wrangler.json
```

第二条命令交互输入服务端随机密钥，不把真实值写进脚本、聊天、Git 或命令行参数。未设置密钥时刷新端点会拒绝调用。现有 Sites 元数据只用于原站的发布集成，独立部署不需要桌面编辑应用运行。

Enter a server-side random secret interactively. Do not put its value in scripts, chat, Git or command-line arguments. Refresh is rejected until configured. Existing Sites metadata describes the original hosting integration; independent hosting does not require a desktop editor.

## API 与调度 / API and scheduling

| 请求 / Request | 行为 / Behaviour |
| --- | --- |
| GET /api/playlist | 读取完整快照；未存储时用种子 / Read complete snapshot or initial seed |
| GET /api/covers/{songId} | 仅已知歌曲和允许的图源 / Known songs and allowlisted image hosts |
| POST /api/playlist/refresh | 要求 X-Playlist-Update-Token；成功后持久化 / Require secret header and persist complete updates |

每日刷新由外部调度器调用 POST 并验证响应，再读 GET 核对 `updatedAt`、`total` 和歌曲数量。使用平台密钥存储向调度器提供凭据，不使用带密钥的 URL。执行时区和时间需明确配置；一个 enabled 状态或浏览器定时器不能证明每天 0 点写入已完成。

An external scheduler must call POST, validate its response and read back updatedAt, total and song count. Use platform secret storage rather than credential-bearing URLs. Configure timezone and time explicitly; an enabled flag or browser timer is not proof of a midnight durable write.

[刷新细节 / Refresh details](playlist-refresh.md)
