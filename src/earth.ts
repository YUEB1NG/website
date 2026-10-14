/** Night globe composited into the existing prism pass, preserving the starfield.
 * Texture: NASA Earth Observatory / Black Marble 2016 (see SOURCES.md).
 */
export const earthUniforms = `
uniform sampler2D u_night;
uniform float u_earthMix;
uniform float u_rotation;
`;
export const earthComposite = `
vec4 nightEarth(vec2 fragCoord) {
  vec2 q = (fragCoord - u_center) / u_radius;
  float dist = length(q);
  vec3 background = sampleSource(fragCoord / u_resolution).rgb;
  // A narrow, restrained atmosphere fades into the surrounding black.
  float halo = exp(-max(dist - 1.0, 0.0) * 32.0) * 0.075;
  vec3 outside = background + vec3(0.13, 0.35, 0.72) * halo;
  if (dist > 1.015) return vec4(outside, 1.0);
  float z = sqrt(max(0.0, 1.0 - dot(q, q)));
  vec3 n = normalize(vec3(q.x, -q.y, z));
  // Slight axial tilt; genuine spherical projection, not a sliding flat disc.
  float tilt = 0.16;
  vec3 world = vec3(n.x*cos(tilt) - n.y*sin(tilt), n.x*sin(tilt) + n.y*cos(tilt), n.z);
  float longitude = atan(world.x, world.z) + 1.85 + u_rotation;
  float latitude = asin(clamp(world.y, -1.0, 1.0));
  vec2 uv = vec2(fract(longitude / 6.2831853 + 0.5), 0.5 - latitude / 3.14159265);
  vec3 night = texture2D(u_night, uv).rgb;
  float facing = 0.45 + 0.55 * pow(z, 0.38);
  vec3 surface = night * facing * 1.1 + vec3(0.006, 0.014, 0.029) * z;
  float rim = pow(1.0 - z, 3.5);
  float edgeLight = 0.4 + 0.6 * max(dot(n, normalize(vec3(-0.6, 0.5, 0.3))), 0.0);
  surface += vec3(0.15, 0.36, 0.65) * rim * edgeLight * 0.24;
  float coverage = 1.0 - smoothstep(0.99, 1.01, dist);
  return vec4(mix(outside, surface, coverage), 1.0);
}
void main() {
  vec2 coord = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y);
  vec4 glass = prism(coord);
  if (u_earthMix <= 0.0) { gl_FragColor = glass; return; }
  gl_FragColor = mix(glass, nightEarth(coord), u_earthMix);
}
`;
