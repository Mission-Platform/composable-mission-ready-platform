# Barcode FWS migration slice

This directory contains the package-local FWS graphs for the barcode migration.
EAN-8, EAN-13, UPC-A, and GS1 DataBar/RSS-14 validation are exposed through
typed `load`/`loadSync` adapters, and native variable-length encoders cover
Code 39, extended Code 39, Code 93, extended Code 93, Codabar, ITF, ITF-14,
MSI, Pharmacode, Code 128, and GS1-128.

EAN-8, EAN-13, UPC-A, UPC-E, Code 39, extended Code 39, Code 93, extended Code
93, Codabar, ITF, ITF-14, MSI, Pharmacode, Code 128, and GS1-128 decoding is
also available through the direct string ABI. Decoders accept complete module
runs only (no quiet zones or noisy scans) and return an empty string for invalid
framing, patterns, or check digits.

The public FWS adapter preserves the established module and error behavior. Code
128 selects Code C for even-length digit payloads and Code B for other printable
ASCII payloads; GS1-128 adds the leading FNC1 symbol. DataBar currently exposes
GTIN validation only; RSS-14 symbol construction remains blocked by the current
FWS runtime's recursive table-heavy arithmetic boundary and is intentionally not
claimed as migrated here.

All package-local FWS string exports use the generated JavaScript `string` ABI,
so loaders own linear-memory allocation and result cleanup.
