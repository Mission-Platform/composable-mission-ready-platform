export interface FlintSdfFontWasmExports {
  readonly isqrt_u32: (val: number) => number;
  readonly dist_to_segment_u32: (px: number, py: number, ax: number, ay: number, bx: number, by: number) => number;
  readonly sdf_get_atlas_size: () => number;
  readonly sdf_get_base_font_size: () => number;
  readonly char_code_to_idx: (code: number) => number;
  readonly unicode_to_idx: (code: number) => number;
  readonly utf8_codepoint_length: (byte_val: number) => number;
  readonly utf8_decode_codepoint: (text: string, i: number, len: number) => number;
  readonly sdf_get_char_advance_u32: (code: number) => number;
  readonly sdf_get_char_advance: (code: number) => number;
  readonly sdf_get_kerning: (c1: number, c2: number) => number;
  readonly sdf_set_char_spacing: (spacing: number) => void;
  readonly sdf_get_char_spacing: () => number;
  readonly sdf_set_line_height: (height: number) => void;
  readonly sdf_get_line_height: () => number;
  readonly sdf_measure_text: (text: string, fontSize: number) => number;
  readonly write_seg: (segPtr: number, segIdx: number, x1: number, y1: number, x2: number, y2: number) => void;
  readonly sdf_load_char_segments: (idx: number, segPtr: number) => number;
  readonly sdf_render_char_cell: (idx: number, atlasPtr: number, col: number, row: number, tempSegPtr: number) => void;
  readonly sdf_init_atlas_data: () => number;
  readonly sdf_get_atlas_ptr: () => number;
  readonly sdf_get_table_ptr: () => number;
  readonly sdf_get_metrics_table_ptr: () => number;
  readonly get_glyph_hori_advance_u32?: (idx: number) => number;
  readonly get_glyph_width_u32?: (idx: number) => number;
  readonly get_glyph_height_u32?: (idx: number) => number;
  readonly get_glyph_hori_bearing_x_i32?: (idx: number) => number;
  readonly get_glyph_hori_bearing_y_i32?: (idx: number) => number;
  readonly get_glyph_vert_advance_u32?: (idx: number) => number;
  readonly get_glyph_vert_bearing_x_i32?: (idx: number) => number;
  readonly get_glyph_vert_bearing_y_i32?: (idx: number) => number;
  readonly get_glyph_bbox_min_x_i32?: (idx: number) => number;
  readonly get_glyph_bbox_max_x_i32?: (idx: number) => number;
  readonly get_glyph_bbox_min_y_i32?: (idx: number) => number;
  readonly get_glyph_bbox_max_y_i32?: (idx: number) => number;
  readonly sdf_get_glyph_metrics?: (idx: number, outPtr: number) => void;
  readonly sdf_clear_text_vertices: () => void;
  readonly sdf_get_vertex_buffer_ptr: () => number;
  readonly sdf_get_vertex_float_count: () => number;
  readonly sdf_append_text_quads: (
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
  readonly sdf_append_text_quads_styled: (
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
  readonly sdf_set_font_weight: (weight: number) => void;
  readonly sdf_get_font_weight: () => number;
  readonly sdf_set_font_slant: (slant: number) => void;
  readonly sdf_get_font_slant: () => number;
  readonly sdf_append_text_quads_perspective: (
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
  readonly get_glyph_cell_w_u32?: (idx: number) => number;
  readonly get_glyph_cell_h_u32?: (idx: number) => number;
  readonly get_glyph_min_x_u32?: (idx: number) => number;
  readonly get_glyph_advance_u32?: (idx: number) => number;
  readonly sdf_measure_text_mono: (text: string, fontSize: number) => number;
  readonly sdf_append_text_quads_mono: (
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
  readonly memory: WebAssembly.Memory;
}

export declare function load(capabilities?: Record<string, Record<string, unknown>>): Promise<FlintSdfFontWasmExports>;
export declare function loadSync(capabilities?: Record<string, Record<string, unknown>>): FlintSdfFontWasmExports;
