# 阿里云部署准备

这是独立于 Cloudflare R2 的 Node.js 适配层，复用原 Worker 和歌单抓取逻辑。前端不变，歌曲列表和已缓存封面保存在 `YUEB1NG_DATA_DIR`，抓取不完整时保留上一次成功的歌单。需要 Node.js 20 或更高版本。

在项目根目录执行 `npm ci`、`npm run build` 后，用 `YUEB1NG_DATA_DIR=/var/lib/yueb1ng node deploy/aliyun/server.mjs` 启动；默认监听 `127.0.0.1:3000`。由 HTTPS 反向代理处理域名、证书与 80/443。该服务不对外暴露写入接口，并在首页底部展示当前域名对应的ICP备案链接；迁移到其他域名时须相应调整备案号。

每天 00:00（Asia/Shanghai）在服务器上执行 `node deploy/aliyun/refresh.mjs`。本目录的 `systemd/` 包含服务和定时器模板：先按目标系统替换 `@HOME@`、`@RELEASE@`、`@DATA@`、`@NODE@` 和 `@CADDY@`，如果目标用户名不是 `admin`，也要修改各单元中的 `User`；检查目标单元是否存在，再运行 `systemd-analyze verify`；配置定时器后需要实际运行刷新并读取 API 确认持久化。

当前 `yueb1ng.com` 实例使用 Caddy 自动申请和续期 HTTPS 证书；备份或迁移时需同时保留数据目录和 Caddy 证书数据。

## Scheduling ownership

Production playlist updates run in yueb1ng-refresh.timer at 00:00 Asia/Shanghai. The update calls refresh.mjs locally; no Codex session, browser, workstation, AI task, or public write token is required. Persistent=true catches up after server downtime. Caddy manages certificate renewal. Disable the former Sites AI schedule after checking a successful server-side refresh.

The registration link belongs to the final scene and follows the social line using its shared animation curve. HTML uses revalidation (no-cache); hashed assets are immutable. Enable encode zstd gzip in Caddy to compress the small bootstrap and larger scene module on the wire.
