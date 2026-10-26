# Playlist refresh / 歌单更新

Source playlist: https://music.163.com/playlist?id=7592316248

The updater fetches the complete track list, resolves song details in batches and validates completeness before committing one R2 snapshot. Failed or incomplete upstream responses preserve the last successful data.

更新器取得完整歌曲列表，批量解析歌曲资料，验证完整性后一次写入 R2。不完整或失败的上游响应不会覆盖此前成功快照。

## Read and update / 读取与更新

- GET /api/playlist returns the saved public snapshot or initial bundled seed
- GET /api/covers/{songId} accepts known song IDs and allowlisted NetEase image origins
- POST /api/playlist/refresh requires the X-Playlist-Update-Token header matching the server's PLAYLIST_UPDATER_TOKEN secret

Use a server-side scheduler with credentials stored in platform secrets. Never send the updater key to the frontend, persist it in Git or include it in a URL.

调度器使用平台密钥存储。更新凭据不进入前端、Git 或 URL。现有站点的服务凭据不随公开源码提供。

After a successful update, read GET /api/playlist and verify updatedAt, total and songs.length against the write response. Keep the previous snapshot on failure. Retry transient failures only with a bounded policy; do not rotate credentials or redeploy as part of routine updates.

更新成功后再次读取，核对时间、总数和歌曲数量。失败时保留旧快照，瞬时故障仅有限重试。常规更新不应附带轮换凭据或重新部署。

## Cover selection / 封面选择

All tracks participate in the artwork pool. Each visit uses 20–25 visible slots, excluding currently displayed/prepared images and the recent 55 artwork identities when the pool permits. Recent selections persist locally when browser storage is available. Cover choice and refresh do not change the approved motion paths.

歌曲封面共同参与候选池，每次访问随机显示 20–25 张；候选足够时排除同屏、待显示和最近 55 种封面。浏览器允许存储时保存近期记录。选图与更新不改变现有运动路径。

## Schedule boundary / 调度边界

The source implements the writer; it does not enable a new deployment's daily schedule. Configure the external scheduler's timezone and time separately, then verify a durable write and read-back. Upstream APIs may change.

仓库提供写入实现，不自动启用新部署的每日任务。调度时区、执行时间和持久化写入应分别配置与验证。上游公开接口可能变化。

[Deployment / 部署](DEPLOY.md)
