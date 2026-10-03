// WGSL Shader: Instanced Cubic Bezier Curve Connections with Execution Flow Pulses

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
  // Per-instance attributes
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

// Evaluates cubic Bezier point at parameter t in [0, 1]
fn bezierPoint(p0: vec2<f32>, p1: vec2<f32>, p2: vec2<f32>, p3: vec2<f32>, t: f32) -> vec2<f32> {
  let u = 1.0 - t;
  let tt = t * t;
  let uu = u * u;
  let uuu = uu * u;
  let ttt = tt * t;

  return uuu * p0 + 3.0 * uu * t * p1 + 3.0 * u * tt * p2 + ttt * p3;
}

// Evaluates first derivative (tangent) of cubic Bezier curve at t
fn bezierTangent(p0: vec2<f32>, p1: vec2<f32>, p2: vec2<f32>, p3: vec2<f32>, t: f32) -> vec2<f32> {
  let u = 1.0 - t;
  return 3.0 * u * u * (p1 - p0) + 6.0 * u * t * (p2 - p1) + 3.0 * t * t * (p3 - p2);
}

@vertex
fn vs_main(input: VertexInput) -> VertexOutput {
  // A curve strip of 32 segments (64 vertices)
  let segmentCount = 32.0;
  let stepIndex = f32(input.vertexIndex / 2u);
  let side = f32(input.vertexIndex % 2u) * 2.0 - 1.0; // -1.0 or 1.0

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
  // Anti-aliased edge boundary across line width
  let edgeAlpha = 1.0 - smoothstep(0.7, 1.0, abs(input.normalDist));

  var color = input.edgeColor;

  // Animated execution pulse along active trace edges
  if (input.pulseActive > 0.5) {
    let pulseWidth = 0.15;
    let distFromPulse = abs(input.curveT - input.pulseOffset);
    let pulseIntensity = smoothstep(pulseWidth, 0.0, distFromPulse);

    let pulseGlow = vec4<f32>(0.35, 0.75, 1.0, 1.0);
    color = mix(color, pulseGlow, pulseIntensity * 0.9);
  }

  return vec4<f32>(color.rgb, color.a * edgeAlpha);
}
