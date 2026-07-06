#include <metal_stdlib>
#include <SwiftUI/SwiftUI_Metal.h>
using namespace metal;

// ---------------------------------------------------------------------------
// Utility noise
// ---------------------------------------------------------------------------

static float hash21(float2 p) {
    p = fract(p * float2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
}

static float noise2(float2 p) {
    float2 i = floor(p);
    float2 f = fract(p);
    float2 u = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + float2(1, 0));
    float c = hash21(i + float2(0, 1));
    float d = hash21(i + float2(1, 1));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

static float fbm(float2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) {
        v += a * noise2(p);
        p = p * 2.03 + float2(17.3, 9.1);
        a *= 0.5;
    }
    return v;
}

// ---------------------------------------------------------------------------
// Light sweep — a slow diagonal studio light gliding across a surface.
// colorEffect(size, time, intensity)
// ---------------------------------------------------------------------------

[[ stitchable ]] half4 lightSweep(float2 position, half4 color, float2 size, float time, float intensity) {
    if (color.a < 0.001) { return color; }
    float2 uv = position / size;
    // A soft band travelling diagonally, easing back and forth.
    float phase = sin(time * 0.22) * 0.5 + 0.5;          // 0…1 slow glide
    float band = uv.x * 0.75 + uv.y * 0.35;
    float d = band - mix(-0.35, 1.35, phase);
    float glow = exp(-d * d * 22.0);
    // Warm-tinted highlight, screen-ish blend. Colors are premultiplied,
    // so scale the additive term by coverage to avoid halo blowout.
    half3 warm = half3(1.0, 0.94, 0.82);
    half3 headroom = max(half3(color.a) - color.rgb * 0.5, half3(0.0));
    half3 lit = color.rgb + half3(glow * intensity) * warm * headroom * color.a;
    return half4(min(lit, half3(color.a)), color.a);
}

// ---------------------------------------------------------------------------
// Paper grain — barely-there texture so flat fields feel physical.
// colorEffect(amount)
// ---------------------------------------------------------------------------

[[ stitchable ]] half4 paperGrain(float2 position, half4 color, float amount) {
    if (color.a < 0.001) { return color; }
    float g = hash21(position) - 0.5;
    return half4(color.rgb + half3(g * amount), color.a);
}

// ---------------------------------------------------------------------------
// Soup ripple — gentle concentric distortion, as if the broth just settled.
// distortionEffect(size, time, strength)
// ---------------------------------------------------------------------------

[[ stitchable ]] float2 soupRipple(float2 position, float2 size, float time, float strength) {
    float2 center = size * 0.5;
    float2 d = position - center;
    float r = length(d) / max(size.x, size.y);
    float wave = sin(r * 34.0 - time * 2.1) * exp(-r * 3.4);
    float2 dir = r > 0.0001 ? normalize(d) : float2(0, 0);
    return position + dir * wave * strength;
}

// ---------------------------------------------------------------------------
// Liquid glass — samples the layer with a refracted offset + specular bloom.
// layerEffect(size, time)
// ---------------------------------------------------------------------------

[[ stitchable ]] half4 liquidGlass(float2 position, SwiftUI::Layer layer, float2 size, float time) {
    float2 uv = position / size;
    float n = fbm(uv * 3.0 + float2(time * 0.05, -time * 0.03));
    float2 offset = (float2(n, fbm(uv * 3.0 + 41.7)) - 0.5) * 6.0;
    half4 c = layer.sample(position + offset);
    // Soft top-edge specular.
    float spec = smoothstep(0.25, 0.0, uv.y) * 0.10;
    c.rgb += half3(spec);
    return c;
}

// ---------------------------------------------------------------------------
// Steam veil — animated volumetric-looking wisps rendered onto a clear layer.
// colorEffect(size, time, opacity) applied over a white fill.
// ---------------------------------------------------------------------------

[[ stitchable ]] half4 steamVeil(float2 position, half4 color, float2 size, float time, float opacity) {
    float2 uv = position / size;
    // Rise: sample noise that scrolls downward so wisps appear to climb.
    float2 p = float2(uv.x * 3.0, uv.y * 4.0 + time * 0.55);
    float n = fbm(p + fbm(p * 1.7 - time * 0.12));
    // Fade at the sides and strongly toward the top and bottom edges.
    float edge = smoothstep(0.0, 0.28, uv.x) * smoothstep(1.0, 0.72, uv.x);
    float vert = smoothstep(1.0, 0.55, uv.y) * smoothstep(0.0, 0.35, uv.y);
    // Premultiplied alpha: white wisps at coverage `a`.
    half a = half(smoothstep(0.42, 0.9, n) * edge * vert * opacity) * color.a;
    return half4(a, a, a, a);
}
