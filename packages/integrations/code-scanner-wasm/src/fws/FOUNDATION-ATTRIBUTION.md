# ZXing-derived Flint foundation

The foundation follows the behavioral boundaries of ZXing core's
`LuminanceSource`, `GlobalHistogramBinarizer`, `HybridBinarizer`, `BitArray`,
`BitMatrix`, perspective sampling, and Reed–Solomon/Galois-field
(`common.reedsolomon`) implementations.
Reference source: <https://github.com/zxing/zxing/tree/master/core/src/main/java/com/google/zxing>.

This package adapts those contracts to Flint. The implementation is
not a Java source translation: it uses bounded caller-owned arrays, explicit
status codes, fixed-width integer arithmetic, checked dimensions/pointers, and
static linking. Modified-source and redistribution terms are recorded in the
package-level `NOTICE` and `LICENSE-APACHE-2.0` files.

Foundation record layouts and limits are documented in `foundation.fws`; the
format reader ports must use these records rather than introducing competing
image or error-correction protocols.
