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
  readonly renderer_execute_frame: (visible_nodes: number, visible_edges: number, visible_pins: number) => void;
  readonly renderer_render_webgpu_frame: (visible_nodes: number, visible_edges: number, visible_pins: number) => void;
  readonly memory: WebAssembly.Memory;
}

export const manifest: Readonly<Record<string, unknown>>;
export function load(imports?: WebAssembly.Imports): Promise<FlintRenderWorkerWasmExports>;
export function loadSync(imports?: WebAssembly.Imports): FlintRenderWorkerWasmExports;
export default loadSync;
