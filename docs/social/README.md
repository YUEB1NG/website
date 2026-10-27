# Link previews

The initial HTML carries Open Graph and X/Twitter metadata without JavaScript.
Both images are served by the same origin, without authentication. The wide
1200 x 630 card is primary; the 480 x 480 portrait is an additional OG image,
image_src fallback and touch icon. Their versioned names support future cache
refreshes. These images are share artwork, not screenshots of the interactive site.

Edit card.html, serve the repository root locally, wait for document.fonts.ready
and the portrait's decode(), and capture the viewport with agent-browser:
1200 x 630 -> public/social/yueb1ng-card-v1.png
480 x 480 -> public/social/yueb1ng-square-v1.png
The artwork uses the site's existing font and user-supplied avatar.

Keep the website title YUEB1NG. When updating the image version, update every
matching initial-HTML tag and the smoke check.

WeChat: these static tags and the existing profile image supply crawlable
metadata, but are not a replacement for the authorized WeChat JS-SDK share
interfaces. There is currently no WeChat official-account AppID/signature
service configured. Do not claim custom WeChat chat/Moments cards are verified.
A real WeChat share is needed to confirm that client's fallback behavior.
Already-shared URLs may retain platform-controlled cached previews.

Run: python tests/social-preview-smoke.py https://yueb1ng.com
This checks raw HTML, image formats/dimensions, crawler access and robots.txt;
it does not publish a post or assert a platform has refreshed its cache.
