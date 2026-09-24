// WGSL Shader Sources exported as TypeScript string constants for bundling & worker loading

export const GRID_SHADER_WGSL = `
struct CameraUniform {
  viewProj: mat4x4<f32>,
  viewportSize: vec2<f32>,
  cameraPos: vec2<f32>,
  zoom: f32,
  gridOpacity: f32,
  isDark: f32,
  padding: f32,
};

@group(0) @binding(0) var<uniform> camera: CameraUniform;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) worldPos: vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var pos = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>( 1.0,  1.0)
  );

  let p = pos[vertexIndex];
  var output: VertexOutput;
  output.position = vec4<f32>(p, 0.0, 1.0);
  output.uv = p * 0.5 + vec2<f32>(0.5, 0.5);

  let screenOffset = p * (camera.viewportSize * 0.5);
  output.worldPos = camera.cameraPos + vec2<f32>(screenOffset.x, -screenOffset.y) / camera.zoom;
  return output;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
  let coord = input.worldPos;
  let minorSpacing = 24.0;
  let majorSpacing = 120.0;
  let dCoord = fwidth(coord);

  let minorGrid = abs(fract(coord / minorSpacing - 0.5) - 0.5) / (dCoord / minorSpacing);
  let minorLine = 1.0 - min(min(minorGrid.x, minorGrid.y), 1.0);

  let majorGrid = abs(fract(coord / majorSpacing - 0.5) - 0.5) / (dCoord / majorSpacing);
  let majorLine = 1.0 - min(min(majorGrid.x, majorGrid.y), 1.0);

  let minorFade = smoothstep(0.2, 0.8, camera.zoom);

  let isDarkMode = camera.isDark > 0.5;
  let bgDark = vec4<f32>(0.043, 0.071, 0.098, 1.0);
  let bgLight = vec4<f32>(0.961, 0.965, 0.973, 1.0);
  let bgColor = select(bgLight, bgDark, isDarkMode);

  let minorDark = vec4<f32>(0.22, 0.25, 0.32, 0.18 * minorFade);
  let minorLight = vec4<f32>(0.55, 0.61, 0.69, 0.25 * minorFade);
  let minorColor = select(minorLight, minorDark, isDarkMode);

  let majorDark = vec4<f32>(0.35, 0.40, 0.50, 0.35);
  let majorLight = vec4<f32>(0.39, 0.47, 0.57, 0.45);
  let majorColor = select(majorLight, majorDark, isDarkMode);

  var color = mix(bgColor, minorColor, minorLine * minorFade);
  color = mix(color, majorColor, majorLine);
  return color;
}
`;

export const NODES_SHADER_WGSL = `
struct CameraUniform {
  viewProj: mat4x4<f32>,
  viewportSize: vec2<f32>,
  cameraPos: vec2<f32>,
  zoom: f32,
  time: f32,
};

@group(0) @binding(0) var<uniform> camera: CameraUniform;

struct VertexInput {
  @builtin(vertex_index) vertexIndex: u32,
  @location(0) instPos: vec2<f32>,
  @location(1) instSize: vec2<f32>,
  @location(2) instRadius: f32,
  @location(3) instFillColor: vec4<f32>,
  @location(4) instBorderColor: vec4<f32>,
  @location(5) instBorderWidth: f32,
  @location(6) instStatusGlowColor: vec4<f32>,
};

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) localPos: vec2<f32>,
  @location(1) halfSize: vec2<f32>,
  @location(2) radius: f32,
  @location(3) fillColor: vec4<f32>,
  @location(4) borderColor: vec4<f32>,
  @location(5) borderWidth: f32,
  @location(6) statusGlowColor: vec4<f32>,
};

@vertex
fn vs_main(input: VertexInput) -> VertexOutput {
  var quad = array<vec2<f32>, 6>(
    vec2<f32>(-0.5, -0.5),
    vec2<f32>( 0.5, -0.5),
    vec2<f32>(-0.5,  0.5),
    vec2<f32>(-0.5,  0.5),
    vec2<f32>( 0.5, -0.5),
    vec2<f32>( 0.5,  0.5)
  );

  let glowPadding = 16.0;
  let expandedSize = input.instSize + vec2<f32>(glowPadding * 2.0);
  let localOffset = quad[input.vertexIndex] * expandedSize;
  let worldPos = input.instPos + localOffset;

  var output: VertexOutput;
  output.position = camera.viewProj * vec4<f32>(worldPos, 0.0, 1.0);
  output.localPos = localOffset;
  output.halfSize = input.instSize * 0.5;
  output.radius = input.instRadius;
  output.fillColor = input.instFillColor;
  output.borderColor = input.instBorderColor;
  output.borderWidth = input.instBorderWidth;
  output.statusGlowColor = input.instStatusGlowColor;
  return output;
}

fn sdRoundedBox(p: vec2<f32>, b: vec2<f32>, r: f32) -> f32 {
  let q = abs(p) - b + vec2<f32>(r);
  return length(max(q, vec2<f32>(0.0))) + min(max(q.x, q.y), 0.0) - r;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
  let dist = sdRoundedBox(input.localPos, input.halfSize, input.radius);
  let fw = length(vec2<f32>(dpdx(dist), dpdy(dist))) * 0.7071;

  var glowColor = vec4<f32>(0.0);
  if (input.statusGlowColor.a > 0.0) {
    let glowDist = max(0.0, dist);
    let glowFactor = exp(-glowDist * 0.35) * input.statusGlowColor.a;
    glowColor = vec4<f32>(input.statusGlowColor.rgb, glowFactor);
  }

  let fillAlpha = 1.0 - smoothstep(-fw, fw, dist);
  let borderOuter = 1.0 - smoothstep(-fw, fw, dist);
  let borderInner = 1.0 - smoothstep(-fw, fw, dist + input.borderWidth);
  let borderAlpha = max(0.0, borderOuter - borderInner);

  var result = glowColor * (1.0 - fillAlpha);
  result = mix(result, input.fillColor, fillAlpha);
  result = mix(result, input.borderColor, borderAlpha * input.borderColor.a);

  if (result.a < 0.005) {
    discard;
  }
  return result;
}
`;

export const EDGES_SHADER_WGSL = `
struct CameraUniform {
  viewProj: mat4x4<f32>,
  viewportSize: vec2<f32>,
  cameraPos: vec2<f32>,
  zoom: f32,
  time: f32,
};

@group(0) @binding(0) var<uniform> camera: CameraUniform;

struct VertexInput {
  @builtin(vertex_index) vertexIndex: u32,
  @location(0) p0: vec2<f32>,
  @location(1) p1: vec2<f32>,
  @location(2) p2: vec2<f32>,
  @location(3) p3: vec2<f32>,
  @location(4) edgeColor: vec4<f32>,
  @location(5) thickness: f32,
  @location(6) pulseOffset: f32,
  @location(7) pulseActive: f32,
};

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) curveT: f32,
  @location(1) edgeColor: vec4<f32>,
  @location(2) pulseOffset: f32,
  @location(3) pulseActive: f32,
  @location(4) normalDist: f32,
};

fn bezierPoint(p0: vec2<f32>, p1: vec2<f32>, p2: vec2<f32>, p3: vec2<f32>, t: f32) -> vec2<f32> {
  let u = 1.0 - t;
  let tt = t * t;
  let uu = u * u;
  let uuu = uu * u;
  let ttt = tt * t;
  return uuu * p0 + 3.0 * uu * t * p1 + 3.0 * u * tt * p2 + ttt * p3;
}

fn bezierTangent(p0: vec2<f32>, p1: vec2<f32>, p2: vec2<f32>, p3: vec2<f32>, t: f32) -> vec2<f32> {
  let u = 1.0 - t;
  return 3.0 * u * u * (p1 - p0) + 6.0 * u * t * (p2 - p1) + 3.0 * t * t * (p3 - p2);
}

@vertex
fn vs_main(input: VertexInput) -> VertexOutput {
  let segmentCount = 32.0;
  let stepIndex = f32(input.vertexIndex / 2u);
  let side = f32(input.vertexIndex % 2u) * 2.0 - 1.0;

  let t = clamp(stepIndex / segmentCount, 0.0, 1.0);
  let pos = bezierPoint(input.p0, input.p1, input.p2, input.p3, t);
  let tangent = normalize(bezierTangent(input.p0, input.p1, input.p2, input.p3, t));
  let normal = vec2<f32>(-tangent.y, tangent.x);

  let halfThickness = (input.thickness * 0.5) / camera.zoom;
  let offsetPos = pos + normal * (side * halfThickness);

  var output: VertexOutput;
  output.position = camera.viewProj * vec4<f32>(offsetPos, 0.0, 1.0);
  output.curveT = t;
  output.edgeColor = input.edgeColor;
  output.pulseOffset = input.pulseOffset;
  output.pulseActive = input.pulseActive;
  output.normalDist = side;
  return output;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
  let edgeAlpha = 1.0 - smoothstep(0.7, 1.0, abs(input.normalDist));
  var color = input.edgeColor;

  if (input.pulseActive > 0.5) {
    let pulseWidth = 0.15;
    let distFromPulse = abs(input.curveT - input.pulseOffset);
    let pulseIntensity = smoothstep(pulseWidth, 0.0, distFromPulse);
    let pulseGlow = vec4<f32>(0.35, 0.75, 1.0, 1.0);
    color = mix(color, pulseGlow, pulseIntensity * 0.9);
  }

  return vec4<f32>(color.rgb, color.a * edgeAlpha);
}
`;

export const TEXT_SHADER_WGSL = `
struct CameraUniform {
  viewProj: mat4x4<f32>,
  viewportSize: vec2<f32>,
  cameraPos: vec2<f32>,
  zoom: f32,
  time: f32,
};

@group(0) @binding(0) var<uniform> camera: CameraUniform;
@group(1) @binding(0) var fontTexture: texture_2d<f32>;
@group(1) @binding(1) var fontSampler: sampler;

struct VertexInput {
  @location(0) position: vec2<f32>,
  @location(1) uv: vec2<f32>,
  @location(2) color: vec4<f32>,
};

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) color: vec4<f32>,
};

@vertex
fn vs_main(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  output.position = camera.viewProj * vec4<f32>(input.position, 0.0, 1.0);
  output.uv = input.uv;
  output.color = input.color;
  return output;
}

fn median(r: f32, g: f32, b: f32) -> f32 {
  return max(min(r, g), min(max(r, g), b));
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
  let sample = textureSample(fontTexture, fontSampler, input.uv);
  let msdf = median(sample.r, sample.g, sample.b);
  let dist = msdf;
  let edge = 0.5;
  let smoothing = clamp(fwidth(dist) * 0.7071, 0.004, 0.12);
  let alpha = smoothstep(edge - smoothing, edge + smoothing, dist);

  if (input.color.a < 0.0) {
    if (sample.a < 0.01) {
      discard;
    }
    return vec4<f32>(sample.rgb, sample.a * -input.color.a);
  }

  if (alpha < 0.01) {
    discard;
  }
  return vec4<f32>(input.color.rgb, input.color.a * alpha);
}
`;

export {
  GRID_SHADER_WGSL as GRID_WGSL,
  NODES_SHADER_WGSL as NODES_WGSL,
  EDGES_SHADER_WGSL as EDGES_WGSL,
  TEXT_SHADER_WGSL as TEXT_WGSL,
};
