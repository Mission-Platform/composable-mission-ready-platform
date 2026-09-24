export interface FlintRenderWorkerWasmExports {
  readonly abs_i32: (val: number) => number;
  readonly clamp_i32: (val: number, min_val: number, max_val: number) => number;
  readonly compute_center: (min_val: number, max_val: number) => number;
  readonly camera_pan_x: (cam_x: number, delta_x: number, zoom_percent: number) => number;
  readonly camera_pan_y: (cam_y: number, delta_y: number, zoom_percent: number) => number;
  readonly camera_zoom_percent: (
    current_zoom_percent: number,
    factor_permille: number,
    min_percent: number,
    max_percent: number,
  ) => number;
  readonly camera_zoom_anchor_x: (
    cam_x: number,
    cursor_x: number,
    viewport_w: number,
    old_zoom_percent: number,
    new_zoom_percent: number,
  ) => number;
  readonly camera_zoom_anchor_y: (
    cam_y: number,
    cursor_y: number,
    viewport_h: number,
    old_zoom_percent: number,
    new_zoom_percent: number,
  ) => number;
  readonly viewport_bounds_min_x: (cam_x: number, viewport_w: number, zoom_percent: number, padding: number) => number;
  readonly viewport_bounds_max_x: (cam_x: number, viewport_w: number, zoom_percent: number, padding: number) => number;
  readonly viewport_bounds_min_y: (cam_y: number, viewport_h: number, zoom_percent: number, padding: number) => number;
  readonly viewport_bounds_max_y: (cam_y: number, viewport_h: number, zoom_percent: number, padding: number) => number;
  readonly screen_to_world_x: (screen_x: number, camera_x: number, viewport_w: number, zoom_percent: number) => number;
  readonly screen_to_world_y: (screen_y: number, camera_y: number, viewport_h: number, zoom_percent: number) => number;
  readonly world_to_screen_x: (world_x: number, camera_x: number, viewport_w: number, zoom_percent: number) => number;
  readonly world_to_screen_y: (world_y: number, camera_y: number, viewport_h: number, zoom_percent: number) => number;
  readonly screen_to_world_f32: (
    screen_coord: number,
    camera_coord: number,
    center_coord: number,
    zoom: number,
  ) => number;
  readonly world_to_screen_f32: (
    world_coord: number,
    camera_coord: number,
    center_coord: number,
    zoom: number,
  ) => number;
  readonly node_bounds_height: (header_h: number, max_ports: number, row_h: number, pad: number) => number;
  readonly node_bounds_max_y: (
    node_y: number,
    header_h: number,
    max_ports: number,
    row_h: number,
    pad: number,
  ) => number;
  readonly port_y_position: (
    node_y: number,
    header_h: number,
    row_index: number,
    row_h: number,
    port_offset: number,
  ) => number;
  readonly point_in_rect: (px: number, py: number, rx: number, ry: number, rw: number, rh: number) => number;
  readonly point_in_circle: (px: number, py: number, cx: number, cy: number, radius: number) => number;
  readonly rect_intersects_box: (
    rx: number,
    ry: number,
    rw: number,
    rh: number,
    min_x: number,
    min_y: number,
    max_x: number,
    max_y: number,
  ) => number;
  readonly bezier_point_1d: (p0: number, p1: number, p2: number, p3: number, t_permille: number) => number;
  readonly bezier_control_dx: (p0x: number, p3x: number) => number;
  readonly spatial_init: () => number;
  readonly spatial_clear: () => void;
  readonly spatial_insert_node: (node_idx: number, min_x: number, min_y: number, max_x: number, max_y: number) => void;
  readonly spatial_insert_port: (node_idx: number, port_idx: number, dir: number, x: number, y: number) => void;
  readonly spatial_query_box: (min_x: number, min_y: number, max_x: number, max_y: number) => number;
  readonly spatial_get_query_result: (index: number) => number;
  readonly spatial_hit_test_point: (px: number, py: number) => number;
  readonly spatial_hit_test_port: (px: number, py: number, snap_radius: number) => number;
  readonly compute_node_instance: (
    min_x: number,
    min_y: number,
    max_x: number,
    max_y: number,
    is_selected: number,
    is_active: number,
    is_trapped: number,
  ) => void;
  readonly compute_edge_instance: (
    p0x: number,
    p0y: number,
    p3x: number,
    p3y: number,
    is_selected: number,
    is_active: number,
    pulse_offset_permille: number,
  ) => void;
  readonly compute_pin_instance: (
    px: number,
    py: number,
    is_hovered: number,
    is_active: number,
    is_output: number,
  ) => void;
  readonly edge_hit_test: (
    cursor_x: number,
    cursor_y: number,
    p0x: number,
    p0y: number,
    p3x: number,
    p3y: number,
    threshold: number,
  ) => number | boolean;
  readonly backend_select_tier: (has_webgpu: boolean, has_webgl: boolean, has_canvas2d: boolean) => number;
  readonly backend_fallback_next: (current_tier: number, has_webgl: boolean, has_canvas2d: boolean) => number;
  readonly camera_zoom_f32: (current_zoom: number, factor: number, min_zoom: number, max_zoom: number) => number;
  readonly renderer_execute_frame: (visible_nodes: number, visible_edges: number, visible_pins: number) => void;
  readonly renderer_render_webgpu_frame: (visible_nodes: number, visible_edges: number, visible_pins: number) => void;
  readonly compute_c2d_edge: (
    p0x: number,
    p0y: number,
    p3x: number,
    p3y: number,
    is_selected: number,
    is_active: number,
    pulse_offset_permille: number,
  ) => void;
  readonly compute_c2d_node: (
    min_x: number,
    min_y: number,
    max_x: number,
    max_y: number,
    is_selected: number,
    is_active: number,
    is_trapped: number,
    category_id: number,
  ) => void;
  readonly compute_c2d_pin: (px: number, py: number, is_hovered: number, is_active: number, is_output: number) => void;
  readonly compute_gl_edge: (
    p0x: number,
    p0y: number,
    p3x: number,
    p3y: number,
    is_selected: number,
    is_active: number,
  ) => void;
  readonly compute_gl_node: (
    min_x: number,
    min_y: number,
    max_x: number,
    max_y: number,
    is_selected: number,
    is_active: number,
    is_trapped: number,
  ) => void;
  readonly compute_gl_pin: (px: number, py: number, is_hovered: number, is_active: number, is_output: number) => void;
  readonly renderer_render_canvas2d_frame: (visible_nodes: number, visible_edges: number, visible_pins: number) => void;
  readonly renderer_render_webgl_frame: (visible_nodes: number, visible_edges: number, visible_pins: number) => void;

  readonly createCamera: (viewport_w: number, viewport_h: number, x: number, y: number, zoom: number) => void;
  readonly get_camera_x: () => number;
  readonly get_camera_y: () => number;
  readonly get_camera_zoom: () => number;
  readonly get_camera_viewport_width: () => number;
  readonly get_camera_viewport_height: () => number;

  readonly screenToWorld: (screen_x: number, screen_y: number) => void;
  readonly get_point_x: () => number;
  readonly get_point_y: () => number;

  readonly worldToScreen: (world_x: number, world_y: number) => void;

  readonly getViewportBounds: (padding: number) => void;
  readonly get_bounds_min_x: () => number;
  readonly get_bounds_min_y: () => number;
  readonly get_bounds_max_x: () => number;
  readonly get_bounds_max_y: () => number;

  readonly panCamera: (delta_x: number, delta_y: number) => void;
  readonly zoomCamera: (cursor_x: number, cursor_y: number, factor: number) => void;
  readonly createViewProjectionMatrix: (matrix_ptr: number) => void;

  readonly getNodeBounds: (node_x: number, node_y: number, max_ports: number) => void;
  readonly get_node_bounds_min_x: () => number;
  readonly get_node_bounds_min_y: () => number;
  readonly get_node_bounds_max_x: () => number;
  readonly get_node_bounds_max_y: () => number;

  readonly getCategoryRgb: (category_id: number) => number;
  readonly getPortTypeRgb: (type_id: number) => number;

  readonly engine_create: (viewport_w: number, viewport_h: number, dpr: number) => void;
  readonly engine_resize: (viewport_w: number, viewport_h: number, dpr: number) => void;
  readonly engine_pan: (delta_x: number, delta_y: number) => void;
  readonly engine_zoom: (cursor_x: number, cursor_y: number, factor: number) => void;
  readonly engine_set_backend: (tier: number) => void;
  readonly engine_get_backend: () => number;
  readonly engine_set_theme: (theme_mode: number) => void;
  readonly engine_get_theme: () => number;
  readonly engine_render_frame: (visible_nodes: number, visible_edges: number, visible_pins: number) => void;
  readonly engine_get_dpr: () => number;
  readonly engine_set_dpr: (dpr: number) => void;
  readonly engine_hit_test: (px: number, py: number) => number;

  readonly font_get_atlas_size: () => number;
  readonly font_get_base_font_size: () => number;
  readonly font_get_char_advance: (code: number) => number;
  readonly font_get_kerning: (c1: number, c2: number) => number;
  readonly font_set_char_spacing: (spacing: number) => void;
  readonly font_get_char_spacing: () => number;
  readonly font_set_line_height: (height: number) => void;
  readonly font_get_line_height: () => number;
  readonly font_measure_text: (text: string, fontSize: number) => number;
  readonly font_init_atlas_data: () => number;
  readonly font_get_atlas_ptr: () => number;
  readonly font_get_table_ptr: () => number;
  readonly font_clear_text_vertices: () => void;
  readonly font_get_vertex_buffer_ptr: () => number;
  readonly font_get_vertex_float_count: () => number;
  readonly font_append_text_quads: (
    text: string,
    originX: number,
    baselineY: number,
    fontSize: number,
    r: number,
    g: number,
    b: number,
    a: number,
    align: number,
  ) => number;
  readonly font_append_text_quads_styled: (
    text: string,
    originX: number,
    baselineY: number,
    fontSize: number,
    r: number,
    g: number,
    b: number,
    a: number,
    align: number,
    isItalic: boolean,
    isUnderline: boolean,
    isStrike: boolean,
    maxWidth: number,
  ) => number;
  readonly font_set_font_weight: (weight: number) => void;
  readonly font_get_font_weight: () => number;
  readonly font_set_font_slant: (slant: number) => void;
  readonly font_get_font_slant: () => number;
  readonly font_append_text_quads_perspective: (
    text: string,
    originX: number,
    baselineY: number,
    fontSize: number,
    r: number,
    g: number,
    b: number,
    a: number,
    align: number,
    m00: number,
    m01: number,
    m10: number,
    m11: number,
    tiltX: number,
    tiltY: number,
  ) => number;
  readonly font_measure_text_mono: (text: string, fontSize: number) => number;
  readonly font_append_text_quads_mono: (
    text: string,
    originX: number,
    baselineY: number,
    fontSize: number,
    r: number,
    g: number,
    b: number,
    a: number,
    align: number,
  ) => number;
  readonly font_char_code_to_idx: (code: number) => number;
  readonly font_unicode_to_idx: (code: number) => number;
  readonly char_code_to_idx?: (code: number) => number;
  readonly unicode_to_idx?: (code: number) => number;

  readonly memory: WebAssembly.Memory;
}

export const manifest: Readonly<Record<string, unknown>>;
export function load(imports?: WebAssembly.Imports): Promise<FlintRenderWorkerWasmExports>;
export function loadSync(imports?: WebAssembly.Imports): FlintRenderWorkerWasmExports;
export default loadSync;
