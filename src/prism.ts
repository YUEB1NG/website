// Port of quattro4maggi BShader.ts; see SOURCES.md.
export const prismFragment = `precision highp float;

    // ============================================================
    // UNIFORMS — values passed in from React Native
    // ============================================================
    uniform sampler2D u_source;          // source content (used by RuntimeShader)
    uniform vec2 u_resolution;   // canvas size in pixels (width, height)
    uniform vec2 u_center;       // bubble center in pixels (x, y)
    uniform float u_radius;        // bubble radius in pixels
    uniform float u_refraction;    // lens distortion strength (e.g. 0.15)
    uniform float u_edgeWidth;     // prismatic edge band width as fraction of radius (e.g. 0.15)
    uniform float u_dispersion;    // chromatic aberration strength at edge (e.g. 0.03)
    uniform vec3 u_bgColor;       // background color (RGB 0-1)
    uniform float u_specular;      // specular intensity (0-1)
    uniform vec3 u_shadowColor;   // shadow color (dark on light bg, light on dark bg)
    uniform float u_shadowOpacity; // shadow strength (0-1)
    uniform float u_shadowSpread;  // shadow spread as fraction of radius (e.g. 0.3)

    uniform float u_transparentBg; // 0 = fill outside with u_bgColor (opaque), 1 = transparent (keep source alpha)
    uniform vec3 u_bubbleColor;   // glass tint color inside the bubble (RGB 0-1)
    uniform float u_bubbleOpacity; // glass tint strength (0 = clear refraction, 1 = solid color)

    uniform float u_shape;         // bubble shape: 0 = circle, 1 = rounded rect
    uniform vec2 u_halfSize;     // rounded-rect half extents in px (used when u_shape = 1)
    uniform float u_cornerRadius;  // rounded-rect corner radius in px (used when u_shape = 1)

    // 6 rainbow color stops around the bubble edge (RGB 0-1)
    uniform vec3 u_prismColor0;   // 0°   (right)
    uniform vec3 u_prismColor1;   // 60°
    uniform vec3 u_prismColor2;   // 120°
    uniform vec3 u_prismColor3;   // 180° (left)
    uniform vec3 u_prismColor4;   // 240°
    uniform vec3 u_prismColor5;   // 300°

    // ============================================================
    // HELPER — clamp coordinates to canvas bounds
    // ============================================================
    vec2 clampCoord(vec2 coord) {
        return clamp(coord, vec2(0.0), u_resolution);
    }

    // ============================================================
    // HELPER — rounded-box SDF + its outward normal (for u_shape = 1)
    // ============================================================
    // Signed distance to a rounded rectangle centered at the origin.
    // p: point relative to center, b: half-size, r: corner radius (px).
    // Negative inside, 0 on the outline, positive outside.
    float sdRoundedBox(vec2 p, vec2 b, float r) {
        vec2 q = abs(p) - b + r;
        return min(max(q.x, q.y), 0.0) + length(max(q, vec2(0.0))) - r;
    }

    // Outward unit normal of the rounded box, via central differences of the
    // SDF (robust across the flat edges and rounded corners alike).
    vec2 sdRoundedBoxNormal(vec2 p, vec2 b, float r) {
        float e = 1.0;
        float dx = sdRoundedBox(p + vec2(e, 0.0), b, r)
                 - sdRoundedBox(p - vec2(e, 0.0), b, r);
        float dy = sdRoundedBox(p + vec2(0.0, e), b, r)
                 - sdRoundedBox(p - vec2(0.0, e), b, r);
        vec2 g = vec2(dx, dy);
        float l = length(g);
        return (l > 0.0001) ? g / l : vec2(0.0);
    }

    // ============================================================
    // HELPER — bilinear sampling (image.eval uses nearest-neighbor)
    // ============================================================
    vec4 sampleSmooth(vec2 coord) {
        vec2 adj = coord - 0.5;
        vec2 fl  = floor(adj) + 0.5;
        vec2 f   = adj - floor(adj);

        vec4 tl = texture2D(u_source, clampCoord(fl) / u_resolution);
        vec4 tr = texture2D(u_source, clampCoord(fl + vec2(1.0, 0.0)) / u_resolution);
        vec4 bl = texture2D(u_source, clampCoord(fl + vec2(0.0, 1.0)) / u_resolution);
        vec4 br = texture2D(u_source, clampCoord(fl + vec2(1.0, 1.0)) / u_resolution);

        vec4 top = mix(tl, tr, float(f.x));
        vec4 bot = mix(bl, br, float(f.x));
        return mix(top, bot, float(f.y));
    }

    vec4 prism(vec2 fragCoord) {
        // ============================================================
        // DISTANCE FROM BUBBLE CENTER
        // ============================================================

        // Unified bubble field so the circle and rounded-rect paths share the
        // downstream refraction / edge / shadow math:
        //   sd           signed distance to the boundary (px, < 0 inside)
        //   nrm          outward unit normal at this point
        //   norm         normalized center → edge factor in [0, 1]
        //   refractScale characteristic size (px) that scales refraction/chroma
        vec2 diff = fragCoord - u_center;
        float sd;
        vec2 nrm;
        float norm;
        float refractScale;
        if (u_shape < 0.5) {
            // Circle (original behavior, math-identical).
            float dist = length(diff);
            sd = dist - u_radius;
            norm = dist / u_radius;
            nrm = (dist > 0.001) ? diff / dist : vec2(0.0);
            refractScale = u_radius;
        } else {
            // Rounded rectangle — inherits the pill shape with padding.
            refractScale = min(u_halfSize.x, u_halfSize.y);
            sd = sdRoundedBox(diff, u_halfSize, u_cornerRadius);
            norm = clamp(1.0 + sd / max(refractScale, 0.001), 0.0, 1.0);
            nrm = sdRoundedBoxNormal(diff, u_halfSize, u_cornerRadius);
        }

        // ============================================================
        // OUTSIDE THE BUBBLE — pass through the source content unchanged
        // ============================================================

        // Anti-aliased edge: 1 inside, 0 outside, smooth over ~1.5px
        float mask = (1.0 - smoothstep(-1.5, 1.5, sd));

        vec4 src = sampleSmooth(fragCoord);
        // Use u_bgColor as base background, blend with any source content on top
        vec3 bg = mix(vec3(u_bgColor), src.rgb, src.a);

        // ============================================================
        // SHADOW — soft halo around the bubble
        // ============================================================
        // sd is 0 on the boundary and grows outward; the halo fades over a band
        // of u_shadowSpread × refractScale px just outside the shape.
        float shadowAlpha = (1.0 - smoothstep(0.0, refractScale * u_shadowSpread, sd)) * u_shadowOpacity;
        vec3 shadowed = mix(bg, vec3(u_shadowColor), shadowAlpha);

        if (mask <= 0.0) {
            if (u_transparentBg < 0.5) {
                // Opaque mode (wabi): fill with bg + shadow, fully opaque
                return vec4(shadowed, 1.0);
            }
            // Transparent mode: keep source coverage, shadow sits behind it.
            // Premultiplied output so canvas corners stay clear.
            float aOut = src.a + shadowAlpha * (1.0 - src.a);
            vec3 cOut = src.rgb * src.a
                       + vec3(u_shadowColor) * (shadowAlpha * (1.0 - src.a));
            return vec4(cOut, aOut);
        }

        // ============================================================
        // BARREL DISTORTION — magnify/refract inside the bubble
        // ============================================================

        float t = norm * norm;
        float distortionAmount = u_refraction * t;
        vec2 distortedCoord = clampCoord(fragCoord - nrm * distortionAmount * refractScale);

        vec4 distortedSrc = sampleSmooth(distortedCoord);

        // ============================================================
        // PRISMATIC EDGE — chromatic aberration at the rim
        // ============================================================

        float edgeStart = 1.0 - u_edgeWidth;
        float edgeFactor = smoothstep(edgeStart, 1.0, norm);

        float chromaOffset = u_dispersion * edgeFactor * refractScale;

        vec2 coordR = clampCoord(distortedCoord + nrm * chromaOffset);
        vec2 coordB = clampCoord(distortedCoord - nrm * chromaOffset);

        vec3 chromaSrc = vec3(
            sampleSmooth(coordR).r,
            distortedSrc.g,
            sampleSmooth(coordB).b
        );

        // Interior color. In opaque mode we composite over u_bgColor (keeps the
        // wabi look); in transparent mode we keep the raw refracted colors and
        // carry alpha separately at the end.
        vec3 interior;
        if (u_transparentBg < 0.5) {
            vec3 distortedBg = mix(vec3(u_bgColor), distortedSrc.rgb, distortedSrc.a);
            vec3 chromaBg = mix(vec3(u_bgColor), chromaSrc, distortedSrc.a);
            interior = mix(distortedBg, chromaBg, edgeFactor);
        } else {
            interior = mix(distortedSrc.rgb, chromaSrc, edgeFactor);
        }

        // Glass tint — colors the bubble. No-op when u_bubbleOpacity == 0.
        interior = mix(interior, vec3(u_bubbleColor), u_bubbleOpacity);

        // ============================================================
        // PRISMATIC TINT — configurable rainbow colors around the edge
        // ============================================================

        float angle = atan(diff.y, diff.x);
        float hue = fract(angle / 6.28318 + 0.5);  // 0 to 1 around the circle
        float segment = hue * 6.0;
        float idx = floor(segment);
        float f = segment - idx;

        // Interpolate between adjacent color stops
        vec3 rainbow;
        if (idx < 1.0)      rainbow = mix(u_prismColor0, u_prismColor1, float(f));
        else if (idx < 2.0) rainbow = mix(u_prismColor1, u_prismColor2, float(f));
        else if (idx < 3.0) rainbow = mix(u_prismColor2, u_prismColor3, float(f));
        else if (idx < 4.0) rainbow = mix(u_prismColor3, u_prismColor4, float(f));
        else if (idx < 5.0) rainbow = mix(u_prismColor4, u_prismColor5, float(f));
        else                rainbow = mix(u_prismColor5, u_prismColor0, float(f));

        // ============================================================
        // SPECULAR HIGHLIGHT — white glint on the bubble
        // ============================================================

        vec2 lightDir = vec2(-0.4, -0.6);
        float specDot = max(dot(nrm, lightDir), 0.0);
        // Sharp bright glint + softer broad glow
        float specular = (pow(specDot, 32.0) * 0.6 + pow(specDot, 8.0) * 0.15) * u_specular;

        // Rainbow edge: blend into interior + additive glow
        vec3 withRainbow = mix(interior, rainbow, edgeFactor * 0.15)
                          + rainbow * edgeFactor * 0.05;
        vec3 color = withRainbow + vec3(specular);

        // ============================================================
        // COMPOSITE — blend source content with bubble effects
        // ============================================================

        if (u_transparentBg < 0.5) {
            // Opaque mode (wabi): blend over the shadowed background, alpha 1
            vec3 finalColor = mix(shadowed, color, mask);
            return vec4(finalColor, 1.0);
        }

        // Transparent mode: carry alpha so the bubble sits on a clear canvas.
        float aOut = src.a + shadowAlpha * (1.0 - src.a);
        vec3 cOut = src.rgb * src.a
                   + vec3(u_shadowColor) * (shadowAlpha * (1.0 - src.a));
        float aIn = distortedSrc.a;
        float aFinal = mix(aOut, aIn, mask);
        vec3 cFinal = mix(cOut, color * aIn, mask); // premultiplied
        return vec4(cFinal, aFinal);
    }

void main() { gl_FragColor = prism(vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y)); }
`;
