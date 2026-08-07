import type { CompactQrMatrix, QrErrorCorrection, QrMatrix } from '../types';
/**
 * Encode `text` into a QR Code matrix at the given error-correction level,
 * instantiating the WebAssembly encoder synchronously on first use.
 *
 * @throws {RangeError} if the text is too long to fit in the largest (version
 *   40) QR Code at the chosen error-correction level.
 */
export declare function encodeQr(text: string, errorCorrection?: QrErrorCorrection): QrMatrix;
/**
 * Encode `text` into a QR Code matrix at the given error-correction level,
 * instantiating the WebAssembly encoder asynchronously on first use.
 *
 * @throws {RangeError} if the text is too long to fit in the largest (version
 *   40) QR Code at the chosen error-correction level.
 */
export declare function encodeQrAsync(text: string, errorCorrection?: QrErrorCorrection): Promise<QrMatrix>;
/**
 * Encode `text` into a **Micro QR Code** matrix (ISO/IEC 18004), instantiating
 * the WebAssembly encoder synchronously on first use.
 *
 * The smallest fitting version (M1–M4, 11×11 to 17×17) is chosen automatically.
 * Micro QR supports only error-correction levels `L`, `M` and `Q`; requesting
 * `H` always throws (no Micro QR version provides it).
 *
 * @throws {RangeError} if the text is too long for any Micro QR version at the
 *   chosen level (including any request for level `H`).
 */
export declare function encodeMicroQr(text: string, errorCorrection?: QrErrorCorrection): CompactQrMatrix;
/**
 * Encode `text` into a **Micro QR Code** matrix, instantiating the WebAssembly
 * encoder asynchronously on first use. See {@link encodeMicroQr}.
 *
 * @throws {RangeError} if the text is too long for any Micro QR version at the
 *   chosen level (including any request for level `H`).
 */
export declare function encodeMicroQrAsync(text: string, errorCorrection?: QrErrorCorrection): Promise<CompactQrMatrix>;
/**
 * Encode `text` into a **Rectangular Micro QR (rMQR) Code** matrix
 * (ISO/IEC 23941), instantiating the WebAssembly encoder synchronously on first
 * use.
 *
 * The smallest fitting version (of the 32 sizes from R7×43 to R17×139) is chosen
 * automatically. rMQR supports only error-correction levels `M` and `H`, so
 * `L`/`M` map to `M` and `Q`/`H` map to `H`.
 *
 * @throws {RangeError} if the text is too long for any rMQR version at the
 *   chosen level.
 */
export declare function encodeRmqr(text: string, errorCorrection?: QrErrorCorrection): CompactQrMatrix;
/**
 * Encode `text` into a **Rectangular Micro QR (rMQR) Code** matrix,
 * instantiating the WebAssembly encoder asynchronously on first use. See
 * {@link encodeRmqr}.
 *
 * @throws {RangeError} if the text is too long for any rMQR version at the
 *   chosen level.
 */
export declare function encodeRmqrAsync(text: string, errorCorrection?: QrErrorCorrection): Promise<CompactQrMatrix>;
