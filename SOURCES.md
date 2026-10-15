# Reference and port notes

## Wabi & More

- Source: https://github.com/ImCitizen13/quattro4maggi
- Local skill snapshot: `C:/Users/fx142/.codex/skills/quattro4maggi`, revision recorded by that skill as `2aeaa62`.
- Main reference: `src/components/wabi-and-more/WabiTimerExperiment.tsx` and the supplied `assets/demos/wabi_demo.gif`.
- `src/prism.ts` ports `BShader.ts`: same six prism colors, refraction 0.5, dispersion 0.9, edge width 0.1, specular 1, white halo 0.15 / spread 0.2. SkSL types and texture sampling are translated to GLSL; reversed smoothsteps are replaced with the equivalent defined GLSL expression.
- `src/scene.ts` ports the hash, density, and twinkle formula from `src/components/common/StarsShader.tsx`. Source pixels and particle textures are rendered to a framebuffer, then refracted by the prism.
- The 46 original 256px particle PNGs are copied from `assets/Bubbles/256`. Original order, 200ms stagger, 600ms start delay, 70px image size, 45-degree cone, and 0.5–1.8 speed multiplier are retained.
- Original spatial constants: 200px resting radius; 50px revealed radius; resting Y = 100% height; revealed Y = 40%; greeting baseline approximately 55%; social footer bottom 10%. Follow and snap springs keep the original stiffness, damping, and mass values.
- The initial recreation kept the original author's name and account. The requested personalized revision uses YUEB1NG, the supplied avatar plus 悦饼 instead of Arabic, Learn / Build / Share everything, and https://x.com/yueb1ng.

## Blueprint opening

- Reference: https://imdaryl.com/ (browser observed 2026-10-14).
- Inspected public assets: `/assets/index-Dh3HYY9Y.js`, `/assets/index-aWq5jlSI.css`.
- Matched mechanics: measure the actual final layout, blue drafting sheet, grid, staggered outlines and hatched text blocks, text reveal, top-to-bottom wipe.
- Matched values: `#2E6FFF`, 20/100px grid, 560ms initial element delay, 110ms stagger, 340ms outline draw, 1200ms wipe with `p*p*(3-2*p)`, cyan/white/magenta wipe edge.
- The measured elements are Wabi's actual back button, start text, and prism. Daryl's portfolio sections are not added to Wabi. Intro holding time is adapted to this much smaller set of elements.

## Font and click-to-reveal

- Reference: https://ped.ro/ (browser observed 2026-10-14).
- Main font: the site's served Neue Montreal WOFF; drafting labels: its Geist Mono WOFF2. The personalized Chinese name uses the system Chinese sans-serif fallback.
- Matched interaction values: 1px rounded word button, 0.8em trigger type, 4px closed blur, full closed opacity, 1s reveal, white active trigger. The requested revision replaces the original red hover accent with blueprint blue `#2E6FFF`.
- Pedro's original reveals extended paragraphs; this port keeps Wabi's three original lines and uses the same blur interaction within them.

## Personalized night globe and avatar

- `public/earth-night.jpg`: NASA Earth Observatory, Black Marble 2016, 3600 × 1800 color map, downloaded unchanged from https://assets.science.nasa.gov/content/dam/science/esd/eo/images/imagerecords/144000/144898/BlackMarble_2016_01deg.jpg . Source page: https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/ . Credit: NASA Earth Observatory / NASA's Goddard Space Flight Center.
- The 2026-10-15 revision uses Three.js sphere geometry with physical lighting, a soft painted albedo treatment, night-light emission, a small face, and a restrained atmospheric rim. Rotation is 0.065 radians/second. The 50px revealed sphere and 200px resting prism keep the original spring path. Re-entry cycles Earth, Mars, Jupiter, Saturn, Uranus, Neptune, Mercury, Venus, then Earth. Other planet maps are original procedural bands/craters; these are stylized illustrations, not scientific surface maps.
- `public/avatar.jpg` is an unchanged copy of the user-supplied square photo. Circular cropping and its thin, separated border are CSS only. No identity inference or image generation is involved.
- The name remains still until clicked, then uses a 24-second English/avatar cycle and 1.6-second crossfades. Learn/Build/Share stays still until clicked, waits 8 seconds between changes, and fades whole words within a fixed-width container. Reduced-motion mode stops decorative rotation and automatic text changes.

## Browser implementation

- This is a browser implementation, not an Expo/React Native build. Original glass/starfield uses WebGL 1; the small planetary surface uses Three.js/WebGL 2. Accessible DOM text, Pointer Events, and requestAnimationFrame control the interaction.
- Stars and particles are refracted. DOM text remains accessible and selectable by browser assistive technology; unlike the native Skia canvas, text is not refracted when the prism is dragged across it.
- Native haptics are omitted. Pointer movement subtly steers the particle cone; orientation events are used only when the browser already permits them. iOS motion permission is not requested automatically.
- Pixel ratio is capped at 1.5 to limit full-screen GPU cost. When WebGL is unavailable, the page remains operable with a simplified CSS prism. Reduced-motion mode skips the opening, snaps positions, and stops continuous decorative motion.
- No mobile-device or Safari hardware test has been performed. Chromium mobile viewport checks are not a physical-device test.
- Upstream README states MIT; the supplied quattro4maggi snapshot has no standalone LICENSE. Fonts and art retain their original ownership. This reference build includes provenance and is published on the configured Sites origin.

## Three.js and theme revision, 2026-10-15

- Three.js: https://threejs.org/docs/ (MIT). Day Earth map is served locally, downloaded unchanged from https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg .
- Local day mode runs 07:00–18:59 and night mode 19:00–06:59 in the visitor device timezone. Theme refreshes on minute boundaries (within 60 seconds), page restore, and foreground return. No location request is made.
- Safari mitigation keeps html/body and a fixed top safe-area strip in the current theme, updates theme-color, and reapplies on intro completion/pageshow. Related WebKit documentation: https://webkit.org/blog/11989/new-webkit-features-in-safari-15/ . Actual iPhone status-bar behavior still requires hardware verification.
- X following-list access was unavailable without configured authorization. User explicitly deferred avatar replacement; existing source particles remain. No unverified accounts are represented as followed by YUEB1NG.
- Skills discovered through find-skills: CloudAI-X/threejs-skills, fundamentals and materials, installed and read locally. https://github.com/CloudAI-X/threejs-skills

## Pure planets, manual theme, and mooncake revision

This section supersedes the earlier Q-style face, procedural planet maps, automatic time-of-day switching, and flat 2D orbit.

- Planet surfaces: Solar System Scope / INOVE, CC BY 4.0, https://www.solarsystemscope.com/textures/ . The original download host returned a CAPTCHA page; no challenge was bypassed. Unchanged textures were obtained from the attributed public distribution https://github.com/elymas/solar-simulator/tree/main/public/textures . Attribution is included in the deployed `/credits.txt`.
- Earth normal/specular: https://github.com/mrdoob/three.js/tree/dev/examples/textures/planets . Cloud shell, hemisphere/directional lighting, faint atmosphere and night emission use Three.js. No cartoon face or pastel albedo tint remains. Planets and mooncake rotate at 0.035 radians/sec (about three minutes per revolution), disabled with reduced motion.
- Orbital portraits are billboard sprites in the same depth-tested Three.js scene as the sphere, in a tilted orbital plane. Far-side sprites are occluded by the globe; near-side sprites overlap its front. Rotation is 0.11 radians/sec. Existing particle images remain until the user supplies the deferred X following list.
- The spherical mooncake is original procedural geometry: shallow flutes, baked crust grain, and raised floral stamps. No emoji artwork is used. Clicking 悦饼 toggles back to the selected planet.
- Avatar and 悦饼 are separate keyboard-accessible buttons, shifted left by 0.375em. Name reveal exposes and retains these buttons. Avatar toggles day/night and persists `yueb1ng-theme` in localStorage; unavailable storage falls back to session state. Night preserves the Wabi starfield with slower 0.22-rad/sec twinkling.
- `user-select`, iOS touch callout, contextmenu, selection, dragstart, and copy are disabled as explicitly requested. This prevents ordinary accidental long-press UI, not screenshotting or source inspection.

## World Cup interaction revision, 2026-10-15

This section supersedes the earlier spherical mooncake, retained profile, eight-body list, and separate fading particle layers.

- Ten celestial surfaces now include Moon and Sun from the same attributed Solar System Scope distribution. Spin: 0.045 rad/s; orbital angular speed: 0.16 rad/s. Reduced-motion disables decorative motion.
- A full-viewport Three.js layer renders the same20 sprites along continuously blended free-flight/orbit paths. Alpha remains1; depth provides occlusion. The native ring material fades out before avatars occupy the ring. WebGL1 still renders the underlying starfield/prism; the new Three.js sprites are not refracted by the WebGL1 composite.
- Mooncake: original short scalloped cylinder, fluted edge, floral top relief. Trophy/crest: original simplified sculptures based on FIFA/AFA references below; no official CAD mesh or logo image was copied.
- Football:24 principal designs covering every men's tournament1930–2026 and both1930 final balls. Original procedural stylizations, not exact manufacturing patterns, and not every finals/knockout recolour. Classic Telstar uses12 pentagon /20 hexagon topology.
- Google reference visually inspected: https://doodles.google/doodle/2022-world-cup-finals/ . The user-supplied Xiaohongshu short link could not be read due to connection closure. No Xiaohongshu asset was copied or claimed as inspected.
- Additional charms and team-number keychains are original SVG code. Q-style real-player portrait generation was rejected by the image tool; the deployed fallback is explicitly team-number badges, not portraits. New background image has not been provided, so no photograph was substituted.
- Profile now shares the exact horizontal center; clicking 悦饼 schedules a sequential crossfade back to English after2.2 seconds. Learn first begins its change after1 second, subsequent intervals7.5 seconds, opacity fades0.3 seconds. Footer dimming begins with downward drag and also observes actual text clearance.

### Primary football and sculpture references

- FIFA ball history: https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/ball-balls-history
- adidas design history: https://www.adidas-group.com/en/magazine/innovation/how-adidas-has-shaped-the-history-of-world-cup-balls-from-1970-to-the-present-day
- adidas Trionda: https://news.adidas.com/world-cup-2026/adidas-unveils--trionda----the-official-match-ball-of-the-fifa-world-cup26-/s/27042e3a-12ba-482d-8839-8a96e056b33e
- FIFA trophy: https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/trophy-design-history-jules-rimet
- FIFA malachite base: https://inside.fifa.com/tournaments/mens/worldcup/2018russia/news/april-1--wc-countdown-74-days-to-go-2934121
- AFA brand manual (search indexed, large PDF not fully fetched): https://assets1.afa.com.ar/torneo/Lea/2025/ENERO/Boletin-Complementario-6624-01-Manual-de-Marca-de-AFA-%2806-02-2025%29.pdf

## Transition refinement, 2026-10-15

- Transparent prism and planet now share the exact projected radius and center throughout entry/exit. Only surface opacity changes; Earth shaders and textures are prepared before the opening finishes.
- Everything is plain text. The plane flyover and Argentina-mode entry were removed at the user's request; trophy, avatar charms, day/night, and other established interactions remain.
- Like samples 1500 points and texture colors from the outgoing object, disperses them, then reassembles the next historical ball over2.15 seconds. Rapid taps coalesce into one queued change; other mode changes cancel and dispose the transition. Reduced motion changes the ball immediately.

## Supplied sticker and level orbit revision (current behavior)

- Click celebrations use29 stickers from the user's Argentina sheet, extracted and rearranged with the built-in imagegen tool into a transparent PNG atlas. This is a generated extraction, not a claim of pixel-for-pixel lossless processing. Dark-background gallery inspection checks separation, internal white detail and clean contours. Sprite UV windows preserve each sticker's aspect ratio.
- There is now ordinary text; the rotating trophy-case interaction is removed. Like still uses its particle-reassembly transition.
- Mooncake top face stands upright (local X90 degrees), with no parent roll, and rotates around the vertical axis. Portrait orbit has zero image-plane roll; its horizontal elliptical projection retains real front/back occlusion.
