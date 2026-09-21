// WGSL Shader: Instanced Rounded-Rectangle Nodes and Ports with Status Glow

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
  // Unit quad vertices [-0.5, 0.5] with padding for outer glow
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

// Signed Distance Function of a 2D rounded box
fn sdRoundedBox(p: vec2<f32>, b: vec2<f32>, r: f32) -> f32 {
  let q = abs(p) - b + vec2<f32>(r);
  return length(max(q, vec2<f32>(0.0))) + min(max(q.x, q.y), 0.0) - r;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
  let dist = sdRoundedBox(input.localPos, input.halfSize, input.radius);

  // Anti-aliasing factor based on screen-space derivatives
  let fw = length(vec2<f32>(dpdx(dist), dpdy(dist))) * 0.7071;

  // Outer glow if statusColor alpha > 0
  var glowColor = vec4<f32>(0.0);
  if (input.statusGlowColor.a > 0.0) {
    let glowDist = max(0.0, dist);
    let glowFactor = exp(-glowDist * 0.35) * input.statusGlowColor.a;
    glowColor = vec4<f32>(input.statusGlowColor.rgb, glowFactor);
  }

  // Inside node fill
  let fillAlpha = 1.0 - smoothstep(-fw, fw, dist);

  // Border stroke
  let borderOuter = 1.0 - smoothstep(-fw, fw, dist);
  let borderInner = 1.0 - smoothstep(-fw, fw, dist + input.borderWidth);
  let borderAlpha = max(0.0, borderOuter - borderInner);

  // Composite layers: Glow -> Fill -> Border
  var result = glowColor * (1.0 - fillAlpha);
  result = mix(result, input.fillColor, fillAlpha);
  result = mix(result, input.borderColor, borderAlpha * input.borderColor.a);

  if (result.a < 0.005) {
    discard;
  }

  return result;
}
