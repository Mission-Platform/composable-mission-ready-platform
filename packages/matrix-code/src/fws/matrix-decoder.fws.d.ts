import type { ForgeWebScriptLoadOptions } from '@mission-platform/forge-web-script-runtime';

export type MatrixDecoderSymbologyId = 0 | 1 | 2 | 3;

export interface ForgeMatrixDecoderExports {
  readonly decode_matrix: (
    symbology: MatrixDecoderSymbologyId,
    width: number,
    height: number,
    modules: ArrayLike<number>,
    erasures: ArrayLike<number>,
  ) => string;
}

export declare const artifactPath: string;
export declare const moduleUrl: string;
export declare function load(options?: ForgeWebScriptLoadOptions): Promise<ForgeMatrixDecoderExports>;
export declare function loadSync(options?: ForgeWebScriptLoadOptions): ForgeMatrixDecoderExports;
export declare const manifest: {
  readonly moduleName: string;
  readonly linkMode: 'static';
  readonly linkedModules?: readonly string[];
};
