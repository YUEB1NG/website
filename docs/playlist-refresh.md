# Daily playlist cover refresh

Site: appgprj_6acf7c0a671481918912bc823c053aab
Playlist: https://music.163.com/playlist?id=7592316248

All tracks participate in the cover pool. A random twenty to twenty-five sprite slots per visit participate in the original floating animation; all unique artwork is randomly selected, excluding displayed and queued covers plus the last 55 selections. The recent list persists locally across reloads when browser storage is available. Free-flight covers change only at a new flight, using an eight-image decoded queue; orbit covers crossfade every 2.8 seconds. Motion remains unchanged and memory stays bounded. The profile portrait is unchanged.

## Cloud updater
1. Read the linked Site with Sites get_site. Use its current_live_url and existing siwc_bypass_bearer_token in memory. Never rotate, persist, print, or include the token in a URL.
2. POST to the Site's /api/playlist/refresh with OAI-Sites-Authorization: Bearer <token> and X-Playlist-Update-Token: <same token>. No request body is needed. PLAYLIST_UPDATER_TOKEN is configured as a runtime secret matching this existing service credential.
3. Require HTTP 200 and ok:true. Then GET /api/playlist with a cache-busting query and verify total, updatedAt, and songs.length match the write response. This reads the durable R2 snapshot.
4. Retry transient errors at most twice. Never replace existing data with an empty/incomplete playlist. The writer commits only complete validated data and preserves the last successful snapshot on failure. If authorization fails, report that the service credential and configured secret need to be resynchronized; do not rotate credentials or redeploy during routine runs.
5. Successful routine runs update persistent data only, with no build or publishing step. Remain quiet on success; report persistent failures requiring attention.

Source uses the public NetEase /api/v6/playlist/detail endpoint and batched /api/v3/song/detail requests. Cover proxy accepts only known song IDs and NetEase image hosts. These public endpoints may change or become unavailable; retain the last good data in that case.
