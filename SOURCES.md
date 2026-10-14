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
- Matched interaction values: 1px rounded word button, 0.8em trigger type, 6px closed blur, 0.8 closed opacity, 0.6s reveal, white active trigger. The requested revision replaces the original red hover accent with blueprint blue `#2E6FFF`.
- Pedro's original reveals extended paragraphs; this port keeps Wabi's three original lines and uses the same blur interaction within them.

## Personalized night globe and avatar

- `public/earth-night.jpg`: NASA Earth Observatory, Black Marble 2016, 3600 × 1800 color map, downloaded unchanged from https://assets.science.nasa.gov/content/dam/science/esd/eo/images/imagerecords/144000/144898/BlackMarble_2016_01deg.jpg . Source page: https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/ . Credit: NASA Earth Observatory / NASA's Goddard Space Flight Center.
- The WebGL shader projects that equirectangular map onto a sphere, rotates it at 0.09 radians/second (approximately 70 seconds per revolution), and applies restrained limb shading and a narrow blue atmosphere. The original 50px revealed radius and position are retained. The bottom 200px prism smoothly morphs into the Earth during ascent and returns on descent.
- `public/avatar.jpg` is an unchanged copy of the user-supplied square photo. Circular cropping and its thin, separated border are CSS only. No identity inference or image generation is involved.
- The original 8.8-second name cycle now alternates English and avatar + 悦饼, with the existing 0.7-second crossfade. Reduced-motion mode keeps the English state and stops Earth rotation.

## Browser implementation

- This is a browser implementation, not an Expo/React Native build. It uses WebGL 1 plus DOM text, Pointer Events, and requestAnimationFrame.
- Stars and particles are refracted. DOM text remains accessible and selectable by browser assistive technology; unlike the native Skia canvas, text is not refracted when the prism is dragged across it.
- Native haptics are omitted. Pointer movement subtly steers the particle cone; orientation events are used only when the browser already permits them. iOS motion permission is not requested automatically.
- Pixel ratio is capped at 1.5 to limit full-screen GPU cost. When WebGL is unavailable, the page remains operable with a simplified CSS prism. Reduced-motion mode skips the opening, snaps positions, and stops continuous decorative motion.
- No mobile-device or Safari hardware test has been performed. Chromium mobile viewport checks are not a physical-device test.
- Upstream README states MIT; the supplied quattro4maggi snapshot has no standalone LICENSE. Fonts and art retain their original ownership. This local reference build includes provenance; public redistribution has not been performed.
