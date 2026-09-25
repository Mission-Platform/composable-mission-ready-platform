// WGSL Shader: Infinite Anti-Aliased Procedural Grid

struct CameraUniform {
  viewProj: mat4x4<f32>,
  viewportSize: vec2<f32>,
  cameraPos: vec2<f32>,
  zoom: f32,
  gridOpacity: f32,
};

@group(0) @binding(0) var<uniform> camera: CameraUniform;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) worldPos: vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  // Full-screen triangle covering [-1, 1]
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

  // Compute world position at this vertex
  let screenOffset = p * (camera.viewportSize * 0.5);
  output.worldPos = camera.cameraPos + vec2<f32>(screenOffset.x, -screenOffset.y) / camera.zoom;

  return output;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
  let coord = input.worldPos;
  let minorSpacing = 24.0;
  let majorSpacing = 120.0;

  // Grid line anti-aliasing via derivatives
  let dCoord = fwidth(coord);

  // Minor grid
  let minorGrid = abs(fract(coord / minorSpacing - 0.5) - 0.5) / (dCoord / minorSpacing);
  let minorLine = 1.0 - min(min(minorGrid.x, minorGrid.y), 1.0);

  // Major grid
  let majorGrid = abs(fract(coord / majorSpacing - 0.5) - 0.5) / (dCoord / majorSpacing);
  let majorLine = 1.0 - min(min(majorGrid.x, majorGrid.y), 1.0);

  // Fade minor lines when zooming out to prevent moiré patterns
  let minorFade = smoothstep(0.2, 0.8, camera.zoom);

  let minorColor = vec4<f32>(0.22, 0.25, 0.32, 0.18 * minorFade);
  let majorColor = vec4<f32>(0.35, 0.40, 0.50, 0.35);

  var color = mix(vec4<f32>(0.08, 0.09, 0.12, 1.0), minorColor, minorLine * minorFade);
  color = mix(color, majorColor, majorLine);

  return color;
}
