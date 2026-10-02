import { evaluateCubicBezier, getNodeBounds } from './camera';
import { computeGlNodeBorder, getCategoryRgba, getPortTypeRgba, parseColorToRgba } from './color';
import { NODE_HEADER_HEIGHT, NODE_WIDTH, PORT_ROW_HEIGHT } from './constants';

import type { FlintRenderWorkerWasmExports } from './types';
import type { RenderWorkerState } from './worker-state';
import type { FlintGraphGroup, FlintGraphNode } from '@mission-platform/flint';

/**
 * Appends line vertex coordinates and colors to the batch line buffer.
 */
export function pushLine(
  state: RenderWorkerState,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  red: number,
  green: number,
  blue: number,
  alpha: number,
): void {
  state.lineVertices.push(x1, y1, red, green, blue, alpha, x2, y2, red, green, blue, alpha);
}

/**
 * Appends a quadrilateral as two triangles to the batch triangle buffer.
 */
export function pushQuad(
  state: RenderWorkerState,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  red: number,
  green: number,
  blue: number,
  alpha: number,
): void {
  state.triVertices.push(
    x0,
    y0,
    red,
    green,
    blue,
    alpha,
    x1,
    y1,
    red,
    green,
    blue,
    alpha,
    x2,
    y2,
    red,
    green,
    blue,
    alpha,
    x0,
    y0,
    red,
    green,
    blue,
    alpha,
    x2,
    y2,
    red,
    green,
    blue,
    alpha,
    x3,
    y3,
    red,
    green,
    blue,
    alpha,
  );
}

/**
 * Appends solid triangle quad vertices and colors to the batch triangle buffer.
 */
export function pushRect(
  state: RenderWorkerState,
  x: number,
  y: number,
  width: number,
  height: number,
  red: number,
  green: number,
  blue: number,
  alpha: number,
): void {
  state.triVertices.push(
    x,
    y,
    red,
    green,
    blue,
    alpha,
    x + width,
    y,
    red,
    green,
    blue,
    alpha,
    x,
    y + height,
    red,
    green,
    blue,
    alpha,
    x,
    y + height,
    red,
    green,
    blue,
    alpha,
    x + width,
    y,
    red,
    green,
    blue,
    alpha,
    x + width,
    y + height,
    red,
    green,
    blue,
    alpha,
  );
}

/**
 * Appends a thick line segment as two triangles (quad ribbon) to the batch triangle buffer.
 */
export function pushThickLine(
  state: RenderWorkerState,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  thickness: number,
  red: number,
  green: number,
  blue: number,
  alpha: number,
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 0.0001) return;
  const nx = (-dy / len) * (thickness / 2);
  const ny = (dx / len) * (thickness / 2);
  pushQuad(state, x1 - nx, y1 - ny, x1 + nx, y1 + ny, x2 + nx, y2 + ny, x2 - nx, y2 - ny, red, green, blue, alpha);
}

/**
 * Appends outline line segments for a rectangle to the batch line buffer.
 */
export function pushRectBorder(
  state: RenderWorkerState,
  x: number,
  y: number,
  width: number,
  height: number,
  red: number,
  green: number,
  blue: number,
  alpha: number,
  thickness = 1.5,
): void {
  pushThickLine(state, x, y, x + width, y, thickness, red, green, blue, alpha);
  pushThickLine(state, x + width, y, x + width, y + height, thickness, red, green, blue, alpha);
  pushThickLine(state, x + width, y + height, x, y + height, thickness, red, green, blue, alpha);
  pushThickLine(state, x, y + height, x, y, thickness, red, green, blue, alpha);
}

/**
 * Appends triangle fan vertices for a solid circle to the batch triangle buffer.
 */
export function pushCircle(
  state: RenderWorkerState,
  cx: number,
  cy: number,
  radius: number,
  red: number,
  green: number,
  blue: number,
  alpha: number,
  segments = 12,
): void {
  for (let i = 0; i < segments; i++) {
    const a1 = (i / segments) * Math.PI * 2;
    const a2 = ((i + 1) / segments) * Math.PI * 2;
    state.triVertices.push(
      cx,
      cy,
      red,
      green,
      blue,
      alpha,
      cx + Math.cos(a1) * radius,
      cy + Math.sin(a1) * radius,
      red,
      green,
      blue,
      alpha,
      cx + Math.cos(a2) * radius,
      cy + Math.sin(a2) * radius,
      red,
      green,
      blue,
      alpha,
    );
  }
}

/**
 * Compiles WebGL shader from GLSL source string.
 */
export function compileGlShader(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader | undefined {
  const shader = gl.createShader(type);
  if (!shader) return undefined;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return undefined;
  return shader;
}

/**
 * Creates and links linked WebGL shader program.
 */
export function createGlProgram(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  vsSource: string,
  fsSource: string,
): WebGLProgram | undefined {
  const vs = compileGlShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = compileGlShader(gl, gl.FRAGMENT_SHADER, fsSource);
  if (!vs || !fs) return undefined;
  const program = gl.createProgram();
  if (!program) return undefined;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return undefined;
  return program;
}

/**
 * Initializes and binds glyph font texture in WebGL context.
 */
export function setupGlFontTexture(state: RenderWorkerState, gl: WebGLRenderingContext | WebGL2RenderingContext): void {
  const wasm = state.wasm;
  const atlasSize = wasm ? wasm.font_get_atlas_size() : 1024;
  const atlasPtr = wasm ? wasm.font_get_atlas_ptr() : 0;
  const rgbaData =
    wasm && atlasPtr > 0
      ? new Uint8Array(wasm.memory.buffer, atlasPtr, atlasSize * atlasSize * 4)
      : new Uint8Array(atlasSize * atlasSize * 4);
  const tex = gl.createTexture();
  if (!tex) return;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, atlasSize, atlasSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, rgbaData);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  state.glFontTexture = tex;
}

/**
 * Initializes WebGL SDF text shader program and vertex attribute bindings.
 */
export function setupGlTextProgram(state: RenderWorkerState, gl: WebGLRenderingContext | WebGL2RenderingContext): void {
  const vsTextSource = `
    attribute vec2 a_position;
    attribute vec2 a_uv;
    attribute vec4 a_color;
    uniform vec2 u_resolution;
    uniform vec2 u_camera;
    uniform float u_zoom;
    varying vec2 v_uv;
    varying vec4 v_color;
    void main() {
      vec2 screenPos = (a_position - u_camera) * u_zoom + (u_resolution * 0.5);
      vec2 clipSpace = (screenPos / u_resolution) * 2.0 - 1.0;
      gl_Position = vec4(clipSpace.x, -clipSpace.y, 0.0, 1.0);
      v_uv = a_uv;
      v_color = a_color;
    }
  `;
  const fsTextSource = `
    #extension GL_OES_standard_derivatives : enable
    precision mediump float;
    uniform sampler2D u_fontTexture;
    varying vec2 v_uv;
    varying vec4 v_color;
    float median(float r, float g, float b) {
      return max(min(r, g), min(max(r, g), b));
    }
    void main() {
      vec4 sampleCenter = texture2D(u_fontTexture, v_uv);
      if (v_color.a < 0.0) {
        if (sampleCenter.a < 0.01) discard;
        gl_FragColor = vec4(sampleCenter.rgb, sampleCenter.a * -v_color.a);
        return;
      }
      #ifdef GL_OES_standard_derivatives
        vec2 unitRange = vec2(4.0) / 1024.0;
        vec2 dUV = fwidth(v_uv);
        vec2 screenTexSize = vec2(1.0) / max(dUV, vec2(0.00001));
        float screenPxRange = max(0.5 * dot(unitRange, screenTexSize), 1.0);
        
        vec2 sub = dUV * 0.25;
        vec4 s0 = texture2D(u_fontTexture, v_uv + vec2(-sub.x, -sub.y));
        vec4 s1 = texture2D(u_fontTexture, v_uv + vec2( sub.x, -sub.y));
        vec4 s2 = texture2D(u_fontTexture, v_uv + vec2(-sub.x,  sub.y));
        vec4 s3 = texture2D(u_fontTexture, v_uv + vec2( sub.x,  sub.y));
        
        float a0 = clamp(screenPxRange * (median(s0.r, s0.g, s0.b) - 0.5) + 0.5, 0.0, 1.0);
        float a1 = clamp(screenPxRange * (median(s1.r, s1.g, s1.b) - 0.5) + 0.5, 0.0, 1.0);
        float a2 = clamp(screenPxRange * (median(s2.r, s2.g, s2.b) - 0.5) + 0.5, 0.0, 1.0);
        float a3 = clamp(screenPxRange * (median(s3.r, s3.g, s3.b) - 0.5) + 0.5, 0.0, 1.0);
        float alpha = (a0 + a1 + a2 + a3) * 0.25;
      #else
        float dist = median(sampleCenter.r, sampleCenter.g, sampleCenter.b);
        float alpha = smoothstep(0.46, 0.54, dist);
      #endif
      if (alpha < 0.01) discard;
      gl_FragColor = vec4(v_color.rgb, v_color.a * alpha);
    }
  `;

  const textProgram = createGlProgram(gl, vsTextSource, fsTextSource);
  if (!textProgram) return;

  state.glTextProgram = textProgram;
  state.glTexVertexBuffer = gl.createBuffer() ?? undefined;
  state.glTextUniformLocations = {
    u_resolution: gl.getUniformLocation(textProgram, 'u_resolution'),
    u_camera: gl.getUniformLocation(textProgram, 'u_camera'),
    u_zoom: gl.getUniformLocation(textProgram, 'u_zoom'),
    u_fontTexture: gl.getUniformLocation(textProgram, 'u_fontTexture'),
  };
  state.glTextAttribLocations = {
    a_position: gl.getAttribLocation(textProgram, 'a_position'),
    a_uv: gl.getAttribLocation(textProgram, 'a_uv'),
    a_color: gl.getAttribLocation(textProgram, 'a_color'),
  };

  setupGlFontTexture(state, gl);
}

const VS_SOURCE = `
  attribute vec2 a_position;
  attribute vec4 a_color;
  uniform vec2 u_resolution;
  uniform vec2 u_camera;
  uniform float u_zoom;
  varying vec4 v_color;
  void main() {
    vec2 screenPos = (a_position - u_camera) * u_zoom + (u_resolution * 0.5);
    vec2 clipSpace = (screenPos / u_resolution) * 2.0 - 1.0;
    gl_Position = vec4(clipSpace.x, -clipSpace.y, 0.0, 1.0);
    v_color = a_color;
  }
`;

const FS_SOURCE = `
  precision mediump float;
  varying vec4 v_color;
  void main() {
    gl_FragColor = v_color;
  }
`;

/**
 * Initializes WebGL 1.0 or 2.0 context, compiles vertex and fragment shaders, and configures vertex attributes.
 */
export function initWebGLBackend(state: RenderWorkerState, targetCanvas: OffscreenCanvas | HTMLCanvasElement): boolean {
  try {
    const gl = (targetCanvas.getContext('webgl2', { preserveDrawingBuffer: true, alpha: true }) ||
      targetCanvas.getContext('webgl', { preserveDrawingBuffer: true, alpha: true })) as
      WebGLRenderingContext | WebGL2RenderingContext | null;
    if (!gl) return false;
    state.glCtx = gl;

    const program = createGlProgram(gl, VS_SOURCE, FS_SOURCE);
    if (!program) return false;

    state.glProgram = program;
    state.glVertexBuffer = gl.createBuffer() ?? undefined;
    state.glUniformLocations = {
      u_resolution: gl.getUniformLocation(program, 'u_resolution'),
      u_camera: gl.getUniformLocation(program, 'u_camera'),
      u_zoom: gl.getUniformLocation(program, 'u_zoom'),
    };
    state.glAttribLocations = {
      a_position: gl.getAttribLocation(program, 'a_position'),
      a_color: gl.getAttribLocation(program, 'a_color'),
    };

    gl.getExtension('OES_standard_derivatives');
    setupGlTextProgram(state, gl);

    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves WebGL clear color RGB values based on theme.
 */
function getWebGLClearColor(isDark: boolean): [number, number, number] {
  return isDark ? [0.043, 0.071, 0.098] : [0.961, 0.965, 0.973];
}

/**
 * Configures WebGL viewport, clear color, and global uniform matrices.
 */
export function setupWebGLViewport(
  state: RenderWorkerState,
  w: number,
  h: number,
  dprVal: number,
  camX: number,
  camY: number,
  zoomVal: number,
): void {
  if (!state.glCtx || !state.glProgram) return;
  const gl = state.glCtx;
  const isDark = state.currentTheme !== 'light';
  const canvasW = state.canvas ? state.canvas.width : Math.round(w * dprVal);
  const canvasH = state.canvas ? state.canvas.height : Math.round(h * dprVal);
  gl.viewport(0, 0, canvasW, canvasH);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  const [clearR, clearG, clearB] = getWebGLClearColor(isDark);
  gl.clearColor(clearR, clearG, clearB, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(state.glProgram);
  if (state.glUniformLocations) {
    gl.uniform2f(state.glUniformLocations.u_resolution, w, h);
    gl.uniform2f(state.glUniformLocations.u_camera, camX, camY);
    gl.uniform1f(state.glUniformLocations.u_zoom, zoomVal);
  }
  state.triVertices = [];
  state.lineVertices = [];
}

/**
 * Appends minor WebGL grid line vertices to the line buffer.
 */
export function pushWebGlMinorGridLines(
  state: RenderWorkerState,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  color: readonly number[],
): void {
  for (let x = Math.floor(minX / 24) * 24; x <= Math.ceil(maxX / 24) * 24; x += 24) {
    if (x % 120 !== 0) {
      state.lineVertices.push(
        x,
        minY,
        color[0],
        color[1],
        color[2],
        color[3],
        x,
        maxY,
        color[0],
        color[1],
        color[2],
        color[3],
      );
    }
  }
  for (let y = Math.floor(minY / 24) * 24; y <= Math.ceil(maxY / 24) * 24; y += 24) {
    if (y % 120 !== 0) {
      state.lineVertices.push(
        minX,
        y,
        color[0],
        color[1],
        color[2],
        color[3],
        maxX,
        y,
        color[0],
        color[1],
        color[2],
        color[3],
      );
    }
  }
}

/**
 * Appends major WebGL grid line vertices to the line buffer.
 */
export function pushWebGlMajorGridLines(
  state: RenderWorkerState,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  color: readonly number[],
): void {
  for (let x = Math.floor(minX / 120) * 120; x <= Math.ceil(maxX / 120) * 120; x += 120) {
    state.lineVertices.push(
      x,
      minY,
      color[0],
      color[1],
      color[2],
      color[3],
      x,
      maxY,
      color[0],
      color[1],
      color[2],
      color[3],
    );
  }
  for (let y = Math.floor(minY / 120) * 120; y <= Math.ceil(maxY / 120) * 120; y += 120) {
    state.lineVertices.push(
      minX,
      y,
      color[0],
      color[1],
      color[2],
      color[3],
      maxX,
      y,
      color[0],
      color[1],
      color[2],
      color[3],
    );
  }
}

/**
 * Computes WebGL edge color RGBA tuple for selected or default states.
 */
export function getGlEdgeColor(isSelected: number, isDark: boolean): [number, number, number, number] {
  if (isSelected) {
    return isDark ? [0.35, 0.65, 1, 1] : [0.035, 0.412, 0.855, 1];
  }
  return isDark ? [0.47, 0.66, 1, 0.7] : [0.34, 0.38, 0.42, 0.65];
}

/**
 * Evaluates and appends WebGL bezier curve edge segments.
 */
export function pushWebGLBezierEdgeSegments(
  state: RenderWorkerState,
  p0x: number,
  p0y: number,
  p1x: number,
  p1y: number,
  p2x: number,
  p2y: number,
  p3x: number,
  p3y: number,
  color: readonly number[],
): void {
  let prevX = p0x;
  let prevY = p0y;
  for (let step = 1; step <= 20; step++) {
    const stepFactor = step / 20;
    const currX = evaluateCubicBezier(p0x, p1x, p2x, p3x, stepFactor);
    const currY = evaluateCubicBezier(p0y, p1y, p2y, p3y, stepFactor);
    state.lineVertices.push(
      prevX,
      prevY,
      color[0],
      color[1],
      color[2],
      color[3],
      currX,
      currY,
      color[0],
      color[1],
      color[2],
      color[3],
    );
    prevX = currX;
    prevY = currY;
  }
}

/**
 * Flushes batched triangles to WebGL framebuffer.
 */
function flushWebGLTriangles(gl: WebGLRenderingContext | WebGL2RenderingContext, state: RenderWorkerState): void {
  if (state.triVertices.length === 0 || !state.glVertexBuffer || !state.glAttribLocations) return;
  gl.bindBuffer(gl.ARRAY_BUFFER, state.glVertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(state.triVertices), gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(state.glAttribLocations.a_position);
  gl.vertexAttribPointer(state.glAttribLocations.a_position, 2, gl.FLOAT, false, 24, 0);
  gl.enableVertexAttribArray(state.glAttribLocations.a_color);
  gl.vertexAttribPointer(state.glAttribLocations.a_color, 4, gl.FLOAT, false, 24, 8);
  gl.drawArrays(gl.TRIANGLES, 0, state.triVertices.length / 6);
}

/**
 * Flushes batched line primitives to WebGL framebuffer.
 */
function flushWebGLLines(gl: WebGLRenderingContext | WebGL2RenderingContext, state: RenderWorkerState): void {
  if (state.lineVertices.length === 0 || !state.glVertexBuffer || !state.glAttribLocations) return;
  gl.bindBuffer(gl.ARRAY_BUFFER, state.glVertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(state.lineVertices), gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(state.glAttribLocations.a_position);
  gl.vertexAttribPointer(state.glAttribLocations.a_position, 2, gl.FLOAT, false, 24, 0);
  gl.enableVertexAttribArray(state.glAttribLocations.a_color);
  gl.vertexAttribPointer(state.glAttribLocations.a_color, 4, gl.FLOAT, false, 24, 8);
  gl.drawArrays(gl.LINES, 0, state.lineVertices.length / 6);
}

/**
 * Flushes batched triangles and line primitives to WebGL framebuffer.
 */
export function flushWebGLPrimitives(state: RenderWorkerState): void {
  const gl = state.glCtx;
  if (!gl) return;
  flushWebGLTriangles(gl, state);
  flushWebGLLines(gl, state);
}

/**
 * Cleans up WebGL buffers, textures, and shader programs.
 */
export function cleanupGlResources(state: RenderWorkerState, gl: WebGLRenderingContext | WebGL2RenderingContext): void {
  const buffers = [state.glVertexBuffer, state.glTexVertexBuffer];
  for (const buf of buffers) {
    if (buf) gl.deleteBuffer(buf);
  }
  if (state.glFontTexture) gl.deleteTexture(state.glFontTexture);
  const programs = [state.glProgram, state.glTextProgram];
  for (const prog of programs) {
    if (prog) gl.deleteProgram(prog);
  }
}

/**
 * Renders background grid lines into WebGL line vertex buffers.
 */
export function renderWebGLGridPass(
  state: RenderWorkerState,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  zoomVal: number,
  isDark: boolean,
): void {
  if (zoomVal > 0.4) {
    const minorColor = isDark ? [0.22, 0.25, 0.32, 0.25] : [0.55, 0.61, 0.69, 0.25];
    pushWebGlMinorGridLines(state, minX, minY, maxX, maxY, minorColor);
  }
  const majorColor = isDark ? [0.35, 0.4, 0.5, 0.35] : [0.39, 0.47, 0.57, 0.45];
  pushWebGlMajorGridLines(state, minX, minY, maxX, maxY, majorColor);
}

interface GroupBoundingBox {
  readonly gx: number;
  readonly gy: number;
  readonly gw: number;
  readonly gh: number;
}

/**
 * Computes bounding box enclosing all nodes within a group.
 */
function computeGroupBounds(groupNodes: readonly FlintGraphNode[]): GroupBoundingBox {
  let gMinX = Number.POSITIVE_INFINITY;
  let gMinY = Number.POSITIVE_INFINITY;
  let gMaxX = Number.NEGATIVE_INFINITY;
  let gMaxY = Number.NEGATIVE_INFINITY;
  for (const node of groupNodes) {
    const bounds = getNodeBounds(node);
    gMinX = Math.min(gMinX, bounds.minX);
    gMaxX = Math.max(gMaxX, bounds.maxX);
    gMinY = Math.min(gMinY, bounds.minY);
    gMaxY = Math.max(gMaxY, bounds.maxY);
  }
  const pad = 24;
  return {
    gx: gMinX - pad,
    gy: gMinY - pad - 22,
    gw: gMaxX - gMinX + pad * 2,
    gh: gMaxY - gMinY + pad * 2 + 22,
  };
}

/**
 * Renders an individual node group box, header pill, and label.
 */
function renderWebGLSingleGroup(
  state: RenderWorkerState,
  group: FlintGraphGroup,
  box: GroupBoundingBox,
  isDark: boolean,
  wasmEngine: FlintRenderWorkerWasmExports,
): void {
  const isSelectedGroup = state.selectedGroupId === group.id;
  const defaultBorder: [number, number, number, number] = isDark ? [0.35, 0.65, 1, 1] : [0.035, 0.412, 0.855, 1];
  const parsedColor = parseColorToRgba(group.color, defaultBorder);
  const fallbackBg: [number, number, number, number] = [
    parsedColor[0],
    parsedColor[1],
    parsedColor[2],
    isDark ? 0.12 : 0.08,
  ];
  const groupBg = parseColorToRgba(group.backgroundColor, fallbackBg);
  const groupBorder: [number, number, number, number] = isSelectedGroup
    ? [1, 1, 1, 1]
    : [parsedColor[0], parsedColor[1], parsedColor[2], isDark ? 0.7 : 0.6];

  pushRect(state, box.gx, box.gy, box.gw, box.gh, groupBg[0], groupBg[1], groupBg[2], groupBg[3]);
  pushRectBorder(state, box.gx, box.gy, box.gw, box.gh, groupBorder[0], groupBorder[1], groupBorder[2], groupBorder[3]);

  const titleW = wasmEngine.font_measure_text(group.title, 12);
  const pillW = titleW + 16;
  pushRect(state, box.gx + 10, box.gy + 4, pillW, 20, parsedColor[0], parsedColor[1], parsedColor[2], 0.9);
  if (isSelectedGroup) {
    pushRectBorder(state, box.gx + 10, box.gy + 4, pillW, 20, 1, 1, 1, 1);
  }
  wasmEngine.font_append_text_quads(group.title, box.gx + 18, box.gy + 18, 12, 1, 1, 1, 1, 0);
}

/**
 * Renders group boxes and labels into WebGL triangle/quad batches.
 */
export function renderWebGLGroupPass(
  state: RenderWorkerState,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  isDark: boolean,
  wasmEngine: FlintRenderWorkerWasmExports,
): void {
  for (const group of state.groups) {
    const groupNodes = state.nodes.filter((n) => group.nodeIds.includes(n.id));
    if (groupNodes.length === 0) continue;
    const box = computeGroupBounds(groupNodes);
    const outside = box.gx + box.gw < minX || box.gx > maxX || box.gy + box.gh < minY || box.gy > maxY;
    if (outside) continue;
    renderWebGLSingleGroup(state, group, box, isDark, wasmEngine);
  }
}

/**
 * Evaluates bezier segments for an edge and emits WebGL thick lines.
 */
export function pushWebGLBezierEdge(
  state: RenderWorkerState,
  p0x: number,
  p0y: number,
  p3x: number,
  p3y: number,
  edgeThickness: number,
  colorR: number,
  colorG: number,
  colorB: number,
  colorA: number,
  wasmEngine: FlintRenderWorkerWasmExports,
): void {
  const p1x = p0x + wasmEngine.bezier_control_dx(Math.round(p0x), Math.round(p3x));
  const p1y = p0y;
  const p2x = p3x - wasmEngine.bezier_control_dx(Math.round(p0x), Math.round(p3x));
  const p2y = p3y;
  const steps = 24;
  for (let s = 0; s < steps; s++) {
    const t1Permille = Math.round((s / steps) * 1000);
    const t2Permille = Math.round(((s + 1) / steps) * 1000);
    const sx1 = wasmEngine.bezier_point_1d(
      Math.round(p0x),
      Math.round(p1x),
      Math.round(p2x),
      Math.round(p3x),
      t1Permille,
    );
    const sy1 = wasmEngine.bezier_point_1d(
      Math.round(p0y),
      Math.round(p1y),
      Math.round(p2y),
      Math.round(p3y),
      t1Permille,
    );
    const sx2 = wasmEngine.bezier_point_1d(
      Math.round(p0x),
      Math.round(p1x),
      Math.round(p2x),
      Math.round(p3x),
      t2Permille,
    );
    const sy2 = wasmEngine.bezier_point_1d(
      Math.round(p0y),
      Math.round(p1y),
      Math.round(p2y),
      Math.round(p3y),
      t2Permille,
    );
    pushThickLine(state, sx1, sy1, sx2, sy2, edgeThickness, colorR, colorG, colorB, colorA);
  }
}

interface WebGLEdgeStyle {
  readonly colorR: number;
  readonly colorG: number;
  readonly colorB: number;
  readonly colorA: number;
  readonly edgeThickness: number;
}

/**
 * Computes endpoint coordinates for a graph edge connection.
 */
function computeEdgeCoordinates(
  fromNode: FlintGraphNode,
  toNode: FlintGraphNode,
  fromPortId: string,
  toPortId: string,
): { p0x: number; p0y: number; p3x: number; p3y: number } {
  const fromPortIndex = Math.max(
    0,
    (fromNode.outputs ?? []).findIndex((p) => p.id === fromPortId),
  );
  const toPortIndex = Math.max(
    0,
    (toNode.inputs ?? []).findIndex((p) => p.id === toPortId),
  );
  return {
    p0x: fromNode.position.x + NODE_WIDTH,
    p0y: fromNode.position.y + NODE_HEADER_HEIGHT + fromPortIndex * PORT_ROW_HEIGHT + 14,
    p3x: toNode.position.x,
    p3y: toNode.position.y + NODE_HEADER_HEIGHT + toPortIndex * PORT_ROW_HEIGHT + 14,
  };
}

const GL_EDGE_STYLE_SELECTED_DARK: WebGLEdgeStyle = {
  colorR: 0.35,
  colorG: 0.65,
  colorB: 1,
  colorA: 1,
  edgeThickness: 3,
};
const GL_EDGE_STYLE_SELECTED_LIGHT: WebGLEdgeStyle = {
  colorR: 0.035,
  colorG: 0.412,
  colorB: 0.855,
  colorA: 1,
  edgeThickness: 3,
};
const GL_EDGE_STYLE_ACTIVE_DARK: WebGLEdgeStyle = {
  colorR: 0.25,
  colorG: 0.73,
  colorB: 0.31,
  colorA: 1,
  edgeThickness: 2.5,
};
const GL_EDGE_STYLE_ACTIVE_LIGHT: WebGLEdgeStyle = {
  colorR: 0.1,
  colorG: 0.5,
  colorB: 0.22,
  colorA: 1,
  edgeThickness: 2.5,
};
const GL_EDGE_STYLE_DEFAULT_DARK: WebGLEdgeStyle = {
  colorR: 0.35,
  colorG: 0.4,
  colorB: 0.52,
  colorA: 0.8,
  edgeThickness: 2,
};
const GL_EDGE_STYLE_DEFAULT_LIGHT: WebGLEdgeStyle = {
  colorR: 0.34,
  colorG: 0.38,
  colorB: 0.42,
  colorA: 0.65,
  edgeThickness: 2,
};

/**
 * Resolves edge color and thickness attributes.
 */
function getWebGLEdgeStyle(isSelected: boolean, isActive: boolean, isDark: boolean): WebGLEdgeStyle {
  if (isSelected) return isDark ? GL_EDGE_STYLE_SELECTED_DARK : GL_EDGE_STYLE_SELECTED_LIGHT;
  if (isActive) return isDark ? GL_EDGE_STYLE_ACTIVE_DARK : GL_EDGE_STYLE_ACTIVE_LIGHT;
  return isDark ? GL_EDGE_STYLE_DEFAULT_DARK : GL_EDGE_STYLE_DEFAULT_LIGHT;
}

/**
 * Emits bezier segments and waypoint control handles for an edge.
 */
function renderWebGLEdgePath(
  state: RenderWorkerState,
  edge: FlintGraphNode extends never ? never : { id: string; points?: readonly { x: number; y: number }[] },
  p0x: number,
  p0y: number,
  p3x: number,
  p3y: number,
  isSelected: boolean,
  style: WebGLEdgeStyle,
  wasmEngine: FlintRenderWorkerWasmExports,
): void {
  const { colorR, colorG, colorB, colorA, edgeThickness } = style;
  if (edge.points && edge.points.length > 0) {
    let prevX = p0x;
    let prevY = p0y;
    for (const pt of edge.points) {
      pushWebGLBezierEdge(state, prevX, prevY, pt.x, pt.y, edgeThickness, colorR, colorG, colorB, colorA, wasmEngine);
      pushCircle(state, pt.x, pt.y, isSelected ? 6 : 4, colorR, colorG, colorB, colorA);
      prevX = pt.x;
      prevY = pt.y;
    }
    pushWebGLBezierEdge(state, prevX, prevY, p3x, p3y, edgeThickness, colorR, colorG, colorB, colorA, wasmEngine);
  } else {
    pushWebGLBezierEdge(state, p0x, p0y, p3x, p3y, edgeThickness, colorR, colorG, colorB, colorA, wasmEngine);
  }
}

/**
 * Emits execution flow pulse halo along an edge curve.
 */
function renderWebGLEdgePulse(
  state: RenderWorkerState,
  p0x: number,
  p0y: number,
  p3x: number,
  pulseOffset: number,
  isDark: boolean,
  wasmEngine: FlintRenderWorkerWasmExports,
): void {
  const pulseT = Math.round(pulseOffset * 1000);
  const p1x = p0x + wasmEngine.bezier_control_dx(Math.round(p0x), Math.round(p3x));
  const p2x = p3x - wasmEngine.bezier_control_dx(Math.round(p0x), Math.round(p3x));
  const px = wasmEngine.bezier_point_1d(Math.round(p0x), Math.round(p1x), Math.round(p2x), Math.round(p3x), pulseT);
  const py = wasmEngine.bezier_point_1d(Math.round(p0y), Math.round(p0y), Math.round(p0y), Math.round(p0y), pulseT);
  const pulseColor = isDark ? [0.47, 0.75, 1, 1] : [0.035, 0.412, 0.855, 1];
  pushCircle(state, px, py, 6, pulseColor[0], pulseColor[1], pulseColor[2], pulseColor[3]);
}

/**
 * Renders edge connections and waypoints into WebGL primitive buffers.
 */
export function renderWebGLEdgePass(
  state: RenderWorkerState,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  nodeMap: Map<string, FlintGraphNode>,
  isDark: boolean,
  wasmEngine: FlintRenderWorkerWasmExports,
): number {
  let visibleEdgesCount = 0;

  for (const edge of state.edges) {
    const fromNode = nodeMap.get(edge.fromNodeId);
    const toNode = nodeMap.get(edge.toNodeId);
    if (!fromNode || !toNode) continue;

    const { p0x, p0y, p3x, p3y } = computeEdgeCoordinates(fromNode, toNode, edge.fromPortId, edge.toPortId);

    if (
      Math.max(p0x, p3x) < minX ||
      Math.min(p0x, p3x) > maxX ||
      Math.max(p0y, p3y) < minY ||
      Math.min(p0y, p3y) > maxY
    ) {
      continue;
    }
    visibleEdgesCount++;

    const isSelected = state.selectedEdgeIds.has(edge.id);
    const pulseOffset = state.edgePulses.get(edge.id);
    const isActive = pulseOffset !== undefined;
    const style = getWebGLEdgeStyle(isSelected, isActive, isDark);

    renderWebGLEdgePath(state, edge, p0x, p0y, p3x, p3y, isSelected, style, wasmEngine);

    if (pulseOffset !== undefined) {
      renderWebGLEdgePulse(state, p0x, p0y, p3x, pulseOffset, isDark, wasmEngine);
    }
  }

  return visibleEdgesCount;
}

/**
 * Computes source pin origin for connecting edge wire drag.
 */
function computeConnectingEdgeSource(fromNode: FlintGraphNode, fromPortId?: string): { p0x: number; p0y: number } {
  const outIdx = (fromNode.outputs ?? []).findIndex((p) => p.id === fromPortId);
  const inIdx = (fromNode.inputs ?? []).findIndex((p) => p.id === fromPortId);
  if (outIdx !== -1) {
    return {
      p0x: fromNode.position.x + NODE_WIDTH,
      p0y: fromNode.position.y + NODE_HEADER_HEIGHT + outIdx * PORT_ROW_HEIGHT + 14,
    };
  }
  if (inIdx !== -1) {
    return {
      p0x: fromNode.position.x,
      p0y: fromNode.position.y + NODE_HEADER_HEIGHT + inIdx * PORT_ROW_HEIGHT + 14,
    };
  }
  return {
    p0x: fromNode.position.x + NODE_WIDTH,
    p0y: fromNode.position.y + NODE_HEADER_HEIGHT + 14,
  };
}

/**
 * Renders in-progress connecting wire drag in WebGL.
 */
export function renderWebGLConnectingEdgePass(
  state: RenderWorkerState,
  nodeMap: Map<string, FlintGraphNode>,
  isDark: boolean,
): void {
  if (!state.connectingEdge) return;
  const fromNode = nodeMap.get(state.connectingEdge.fromNodeId);
  if (!fromNode) return;

  const { p0x, p0y } = computeConnectingEdgeSource(fromNode, state.connectingEdge.fromPortId);
  const p3x = state.connectingEdge.cursorX;
  const p3y = state.connectingEdge.cursorY;

  const ctrlDist = Math.max(40, Math.abs(p3x - p0x) * 0.5);
  const p1x = p0x + ctrlDist;
  const p1y = p0y;
  const p2x = p3x - ctrlDist;
  const p2y = p3y;
  const connectColor = isDark ? [0.35, 0.65, 1, 0.9] : [0.035, 0.412, 0.855, 0.9];
  pushWebGLBezierEdgeSegments(state, p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, connectColor);
  pushCircle(state, p3x, p3y, 5, connectColor[0], connectColor[1], connectColor[2], connectColor[3]);
}

/**
 * Renders input port circles and labels for WebGL node.
 */
function renderWebGLInputPins(
  state: RenderWorkerState,
  node: FlintGraphNode,
  x: number,
  y: number,
  isDark: boolean,
  wasmEngine: FlintRenderWorkerWasmExports,
): number {
  let pinCount = 0;
  for (const [idx, port] of (node.inputs ?? []).entries()) {
    const py = y + NODE_HEADER_HEIGHT + idx * PORT_ROW_HEIGHT + 14;
    const isHovered = state.hoveredPort?.nodeId === node.id && state.hoveredPort?.portId === port.id;
    const pinRadius = isHovered ? 6 : 4;
    const portColor = getPortTypeRgba(port.type, isDark);
    pushCircle(state, x, py, pinRadius, portColor[0], portColor[1], portColor[2], portColor[3]);
    if (isHovered) pushCircle(state, x, py, 2.5, 1, 1, 1, 1);
    pinCount++;

    const portTextColor = isDark ? [0.788, 0.82, 0.851] : [0.141, 0.161, 0.184];
    wasmEngine.font_append_text_quads(
      port.name,
      x + 12,
      py + 4,
      11,
      portTextColor[0],
      portTextColor[1],
      portTextColor[2],
      1,
      0,
    );
  }
  return pinCount;
}

/**
 * Renders output port circles and labels for WebGL node.
 */
function renderWebGLOutputPins(
  state: RenderWorkerState,
  node: FlintGraphNode,
  x: number,
  y: number,
  nodeWidth: number,
  isDark: boolean,
  wasmEngine: FlintRenderWorkerWasmExports,
): number {
  let pinCount = 0;
  for (const [idx, port] of (node.outputs ?? []).entries()) {
    const py = y + NODE_HEADER_HEIGHT + idx * PORT_ROW_HEIGHT + 14;
    const isHovered = state.hoveredPort?.nodeId === node.id && state.hoveredPort?.portId === port.id;
    const pinRadius = isHovered ? 6 : 4;
    const portColor = getPortTypeRgba(port.type, isDark);
    pushCircle(state, x + nodeWidth, py, pinRadius, portColor[0], portColor[1], portColor[2], portColor[3]);
    if (isHovered) pushCircle(state, x + nodeWidth, py, 2.5, 1, 1, 1, 1);
    pinCount++;

    const portTextColor = isDark ? [0.788, 0.82, 0.851] : [0.141, 0.161, 0.184];
    wasmEngine.font_append_text_quads(
      port.name,
      x + nodeWidth - 12,
      py + 4,
      11,
      portTextColor[0],
      portTextColor[1],
      portTextColor[2],
      1,
      1,
    );
  }
  return pinCount;
}

/**
 * Renders port circles and labels for WebGL node.
 */
export function renderWebGLNodePins(
  state: RenderWorkerState,
  node: FlintGraphNode,
  x: number,
  y: number,
  nodeWidth: number,
  isDark: boolean,
  wasmEngine: FlintRenderWorkerWasmExports,
): number {
  const inPins = renderWebGLInputPins(state, node, x, y, isDark, wasmEngine);
  const outPins = renderWebGLOutputPins(state, node, x, y, nodeWidth, isDark, wasmEngine);
  return inPins + outPins;
}

const GL_HEADER_COLORS_DARK: Readonly<Record<string, readonly [number, number, number]>> = {
  trapped: [0.239, 0.078, 0.09],
  active: [0.078, 0.239, 0.133],
  meta: [0.051, 0.157, 0.278],
  default: [0.086, 0.106, 0.133],
};

const GL_HEADER_COLORS_LIGHT: Readonly<Record<string, readonly [number, number, number]>> = {
  trapped: [0.996, 0.886, 0.886],
  active: [0.863, 0.988, 0.906],
  meta: [0.882, 0.925, 0.969],
  default: [0.941, 0.949, 0.961],
};

/**
 * Computes WebGL node header background RGB color channels.
 */
function getGlHeaderColor(
  isTrapped: number,
  isActive: number,
  isMeta: boolean,
  isDark: boolean,
): readonly [number, number, number] {
  const table = isDark ? GL_HEADER_COLORS_DARK : GL_HEADER_COLORS_LIGHT;
  if (isTrapped) return table.trapped;
  if (isActive) return table.active;
  if (isMeta) return table.meta;
  return table.default;
}

/**
 * Resolves node card fill RGBA channels for WebGL background.
 */
function getGlNodeFill(isMeta: boolean, isDark: boolean): [number, number, number, number] {
  if (isDark) {
    return isMeta ? [0.051, 0.157, 0.278, 0.95] : [0.086, 0.106, 0.133, 0.95];
  }
  return isMeta ? [0.882, 0.925, 0.969, 0.98] : [1, 1, 1, 0.98];
}

/**
 * Renders node header card and category badge in WebGL.
 */
function renderWebGLNodeHeader(
  state: RenderWorkerState,
  node: FlintGraphNode,
  x: number,
  y: number,
  nodeWidth: number,
  isDark: boolean,
  isTrapped: number,
  isActive: number,
  isMeta: boolean,
  wasmEngine: FlintRenderWorkerWasmExports,
): void {
  const [headerR, headerG, headerB] = getGlHeaderColor(isTrapped, isActive, isMeta, isDark);
  pushRect(state, x + 1, y + 1, nodeWidth - 2, NODE_HEADER_HEIGHT - 1, headerR, headerG, headerB, 1);

  const catColor = getCategoryRgba(node.category, isMeta, isDark);
  pushRect(state, x + 1, y + 1, nodeWidth - 2, 4, catColor[0], catColor[1], catColor[2], 1);

  const sepColor = isDark ? [0.188, 0.212, 0.239, 0.8] : [0.816, 0.843, 0.871, 0.8];
  pushLine(
    state,
    x + 1,
    y + NODE_HEADER_HEIGHT,
    x + nodeWidth - 1,
    y + NODE_HEADER_HEIGHT,
    sepColor[0],
    sepColor[1],
    sepColor[2],
    sepColor[3],
  );

  const titleColor = isDark ? [0.941, 0.965, 0.988] : [0.122, 0.137, 0.157];
  wasmEngine.font_append_text_quads(node.title, x + 10, y + 17, 12, titleColor[0], titleColor[1], titleColor[2], 1, 0);

  const catText = isMeta
    ? `META (${node.metaSubgraph?.nodes.length ?? 0})`
    : (node.category || 'OPERATION').toUpperCase();
  const catTextColor = isMeta
    ? isDark
      ? [0.345, 0.651, 1, 1]
      : [0.035, 0.412, 0.855, 1]
    : isDark
      ? [0.545, 0.58, 0.62, 1]
      : [0.341, 0.376, 0.416, 1];
  wasmEngine.font_append_text_quads(
    catText,
    x + nodeWidth - 10,
    y + 17,
    10,
    catTextColor[0],
    catTextColor[1],
    catTextColor[2],
    1,
    1,
  );

  const subColor = isDark ? [0.545, 0.58, 0.62] : [0.341, 0.376, 0.416];
  wasmEngine.font_append_text_quads(node.operation, x + 10, y + 28, 9, subColor[0], subColor[1], subColor[2], 1, 0);
}

/**
 * Renders node property preview badge at the bottom of a WebGL node.
 */
function renderWebGLNodeProperties(
  node: FlintGraphNode,
  x: number,
  y: number,
  nodeHeight: number,
  isDark: boolean,
  wasmEngine: FlintRenderWorkerWasmExports,
): void {
  if (!node.properties || Object.keys(node.properties).length === 0) return;
  const firstVal = String(Object.values(node.properties)[0]);
  const propColor = isDark ? [0.345, 0.651, 1] : [0.035, 0.412, 0.855];
  wasmEngine.font_append_text_quads_mono(
    `= ${firstVal}`,
    x + 10,
    y + nodeHeight - 8,
    10,
    propColor[0],
    propColor[1],
    propColor[2],
    1,
    0,
  );
}

/**
 * Renders individual WebGL node body, header, pin, and text primitives.
 */
export function renderWebGLSingleNode(
  state: RenderWorkerState,
  node: FlintGraphNode,
  isDark: boolean,
  wasmEngine: FlintRenderWorkerWasmExports,
): number {
  const bounds = getNodeBounds(node);
  const nodeWidth = bounds.maxX - bounds.minX;
  const nodeHeight = bounds.maxY - bounds.minY;
  const x = bounds.minX;
  const y = bounds.minY;

  const isSelected = state.selectedNodeIds.has(node.id) ? 1 : 0;
  const isActive = state.activeNodeIds.has(node.id) ? 1 : 0;
  const isTrapped = state.trappedNodeId === node.id ? 1 : 0;
  const isMeta = node.metaSubgraph !== undefined || node.operation === 'meta';

  const [fillR, fillG, fillB, fillA] = getGlNodeFill(isMeta, isDark);
  pushRect(state, x, y, nodeWidth, nodeHeight, fillR, fillG, fillB, fillA);

  const { br, bg, bb } = computeGlNodeBorder(isSelected, isActive, isTrapped, isDark);
  const borderThickness = isTrapped || isActive ? 2.5 : isSelected ? 2 : 1.2;
  pushRectBorder(state, x, y, nodeWidth, nodeHeight, br, bg, bb, 1, borderThickness);

  renderWebGLNodeHeader(state, node, x, y, nodeWidth, isDark, isTrapped, isActive, isMeta, wasmEngine);
  const pinCount = renderWebGLNodePins(state, node, x, y, nodeWidth, isDark, wasmEngine);
  renderWebGLNodeProperties(node, x, y, nodeHeight, isDark, wasmEngine);

  return pinCount;
}

/**
 * Renders all visible nodes in WebGL.
 */
export function renderWebGLNodePass(
  state: RenderWorkerState,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  isDark: boolean,
  wasmEngine: FlintRenderWorkerWasmExports,
): { visibleNodesCount: number; visiblePinsCount: number } {
  let visibleNodesCount = 0;
  let visiblePinsCount = 0;

  for (const node of state.nodes) {
    const bounds = getNodeBounds(node);
    const nodeWidth = bounds.maxX - bounds.minX;
    const nodeHeight = bounds.maxY - bounds.minY;
    const x = bounds.minX;
    const y = bounds.minY;

    if (x + nodeWidth < minX || x > maxX || y + nodeHeight < minY || y > maxY) continue;
    visibleNodesCount++;
    visiblePinsCount += renderWebGLSingleNode(state, node, isDark, wasmEngine);
  }

  return { visibleNodesCount, visiblePinsCount };
}

/**
 * Flushes WebGL SDF text batch to screen.
 */
export function renderWebGLTextPass(
  state: RenderWorkerState,
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  wasmEngine: FlintRenderWorkerWasmExports,
): number {
  const glTextFloatCount = wasmEngine.font_get_vertex_float_count();
  const glTextBufPtr = wasmEngine.font_get_vertex_buffer_ptr();
  const glTextF64View = new Float64Array(wasmEngine.memory.buffer, glTextBufPtr, glTextFloatCount);
  state.textTriVertices = new Float32Array(glTextF64View);

  if (
    state.textTriVertices.length > 0 &&
    state.glTextProgram &&
    state.glTexVertexBuffer &&
    state.glFontTexture &&
    state.glTextUniformLocations &&
    state.glTextAttribLocations
  ) {
    gl.useProgram(state.glTextProgram);
    gl.uniform2f(state.glTextUniformLocations.u_resolution, state.width, state.height);
    gl.uniform2f(state.glTextUniformLocations.u_camera, wasmEngine.get_camera_x(), wasmEngine.get_camera_y());
    gl.uniform1f(state.glTextUniformLocations.u_zoom, wasmEngine.get_camera_zoom());

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, state.glFontTexture);
    gl.uniform1i(state.glTextUniformLocations.u_fontTexture, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, state.glTexVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, state.textTriVertices, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(state.glTextAttribLocations.a_position);
    gl.vertexAttribPointer(state.glTextAttribLocations.a_position, 2, gl.FLOAT, false, 32, 0);
    gl.enableVertexAttribArray(state.glTextAttribLocations.a_uv);
    gl.vertexAttribPointer(state.glTextAttribLocations.a_uv, 2, gl.FLOAT, false, 32, 8);
    gl.enableVertexAttribArray(state.glTextAttribLocations.a_color);
    gl.vertexAttribPointer(state.glTextAttribLocations.a_color, 4, gl.FLOAT, false, 32, 16);
    gl.drawArrays(gl.TRIANGLES, 0, state.textTriVertices.length / 8);
  }

  return glTextFloatCount;
}

/**
 * Renders the complete node graph using WebGL draw arrays and native Flint vertex batching.
 */
export function renderWebGLFrame(state: RenderWorkerState): void {
  const gl = state.glCtx;
  if (
    !gl ||
    !state.glProgram ||
    !state.glVertexBuffer ||
    !state.glUniformLocations ||
    !state.glAttribLocations ||
    !state.wasm
  )
    return;

  const isDark = state.currentTheme !== 'light';
  const t0 = typeof performance === 'undefined' ? 0 : performance.now();
  const canvasW = state.canvas ? state.canvas.width : Math.round(state.width * state.dpr);
  const canvasH = state.canvas ? state.canvas.height : Math.round(state.height * state.dpr);
  gl.viewport(0, 0, canvasW, canvasH);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  const [clearR, clearG, clearB] = getWebGLClearColor(isDark);
  gl.clearColor(clearR, clearG, clearB, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.useProgram(state.glProgram);
  gl.uniform2f(state.glUniformLocations.u_resolution, state.width, state.height);
  gl.uniform2f(state.glUniformLocations.u_camera, state.wasm.get_camera_x(), state.wasm.get_camera_y());
  gl.uniform1f(state.glUniformLocations.u_zoom, state.wasm.get_camera_zoom());

  state.lineVertices = [];
  state.triVertices = [];
  state.textTriVertices = new Float32Array(0);

  const wasm = state.wasm;
  wasm.font_clear_text_vertices();
  wasm.getViewportBounds(150);
  const minX = wasm.get_bounds_min_x();
  const minY = wasm.get_bounds_min_y();
  const maxX = wasm.get_bounds_max_x();
  const maxY = wasm.get_bounds_max_y();

  renderWebGLGridPass(state, minX, minY, maxX, maxY, wasm.get_camera_zoom(), isDark);
  renderWebGLGroupPass(state, minX, minY, maxX, maxY, isDark, wasm);

  const nodeMap = new Map<string, FlintGraphNode>(state.nodes.map((n) => [n.id, n]));
  const visibleEdgesCount = renderWebGLEdgePass(state, minX, minY, maxX, maxY, nodeMap, isDark, wasm);
  renderWebGLConnectingEdgePass(state, nodeMap, isDark);

  const { visibleNodesCount, visiblePinsCount } = renderWebGLNodePass(state, minX, minY, maxX, maxY, isDark, wasm);
  const glTextFloatCount = renderWebGLTextPass(state, gl, wasm);

  flushWebGLPrimitives(state);

  const tEnd = typeof performance === 'undefined' ? 0 : performance.now();
  const frameTime = t0 > 0 && tEnd > 0 ? tEnd - t0 : 1.2;
  state.performanceStats = {
    ...state.performanceStats,
    renderTimeMs: Math.round(frameTime * 100) / 100,
    totalFrameTimeMs: Math.round((frameTime + 0.4) * 100) / 100,
    visibleNodesCount,
    totalNodesCount: state.nodes.length,
    visibleEdgesCount,
    totalEdgesCount: state.edges.length,
    visiblePinsCount,
    totalPinsCount: state.nodes.length * 4,
    textQuadCount: glTextFloatCount / 8,
    backend: 'webgl',
    isFallback: false,
  };
}

const GL_PIN_COLORS_DARK: Readonly<Record<string, readonly [number, number, number, number]>> = {
  hovered: [0.47, 0.75, 1, 1],
  active: [0.25, 0.73, 0.31, 1],
  default: [0.55, 0.58, 0.62, 1],
};

const GL_PIN_COLORS_LIGHT: Readonly<Record<string, readonly [number, number, number, number]>> = {
  hovered: [0.035, 0.412, 0.855, 1],
  active: [0.1, 0.5, 0.22, 1],
  default: [0.34, 0.38, 0.42, 1],
};

/**
 * Computes pin color for WebGL host capabilities drawing.
 */
function getGlPinColor(
  isHovered: number,
  isActive: number,
  isDark: boolean,
): readonly [number, number, number, number] {
  const table = isDark ? GL_PIN_COLORS_DARK : GL_PIN_COLORS_LIGHT;
  const key = isHovered ? 'hovered' : isActive ? 'active' : 'default';
  return table[key] ?? table.default;
}

/**
 * Creates WebGL WebAssembly host capabilities object.
 */
export function createWebGLCapabilities(state: RenderWorkerState): WebAssembly.Imports {
  return {
    'webgl.render_begin': {
      gl_render_begin: (w: number, h: number, dprVal: number, camX: number, camY: number, zoomVal: number) => {
        setupWebGLViewport(state, w, h, dprVal, camX, camY, zoomVal);
      },
    },
    'webgl.render_grid': {
      gl_render_grid: (minX: number, minY: number, maxX: number, maxY: number) => {
        const isDark = state.currentTheme !== 'light';
        const minorColor = isDark ? [0.22, 0.25, 0.32, 0.3] : [0.55, 0.61, 0.69, 0.3];
        const majorColor = isDark ? [0.35, 0.4, 0.5, 0.5] : [0.39, 0.47, 0.57, 0.6];
        pushWebGlMinorGridLines(state, minX, minY, maxX, maxY, minorColor);
        pushWebGlMajorGridLines(state, minX, minY, maxX, maxY, majorColor);
      },
    },
    'webgl.draw_edge': {
      gl_draw_edge: (
        p0x: number,
        p0y: number,
        p1x: number,
        p1y: number,
        p2x: number,
        p2y: number,
        p3x: number,
        p3y: number,
        isSelected: number,
      ) => {
        const isDark = state.currentTheme !== 'light';
        const edgeColor = getGlEdgeColor(isSelected, isDark);
        pushWebGLBezierEdgeSegments(state, p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, edgeColor);
      },
    },
    'webgl.draw_node': {
      gl_draw_node: (
        x: number,
        y: number,
        w: number,
        h: number,
        isSelected: number,
        isActive: number,
        isTrapped: number,
      ) => {
        const isDark = state.currentTheme !== 'light';
        const fill = isDark ? [0.13, 0.15, 0.18, 0.95] : [1, 1, 1, 0.98];
        const { br, bg, bb } = computeGlNodeBorder(isSelected, isActive, isTrapped, isDark);
        pushRect(state, x, y, w, h, fill[0], fill[1], fill[2], fill[3]);
        pushRectBorder(state, x, y, w, h, br, bg, bb, 1);
      },
    },
    'webgl.draw_pin': {
      gl_draw_pin: (x: number, y: number, radius: number, isHovered: number, isActive: number) => {
        const isDark = state.currentTheme !== 'light';
        const col = getGlPinColor(isHovered, isActive, isDark);
        pushCircle(state, x, y, radius, col[0], col[1], col[2], col[3]);
      },
    },
    'webgl.render_end': {
      gl_render_end: () => {
        flushWebGLPrimitives(state);
      },
    },
    'webgl.render_frame': {
      webgl_render_frame: () => {
        renderWebGLFrame(state);
      },
    },
  };
}
