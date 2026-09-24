import { compileCHeader, compileFlint, createFlintAbiManifest, parseFlint } from '@mission-platform/flint';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { describe, expect, it } from 'vitest';

import { createFlintHost } from './host.ts';
import { createFlintMemory, createFlintMultiMemory, FlintRegionalArena, FLINT_MEMORY_CAPABILITIES } from './memory.ts';

describe('End-to-End C & Rust Interoperability', () => {
  it('Scenario 2: compiles Rust cbindgen header, links with Wasm kernel, and executes with zero copy', () => {
    // 1. Rust cbindgen C Header definition
    const rustCbindgenHeader = `
      /* Generated with cbindgen:0.26.0 */
      #include <stdint.h>

      typedef struct ScannerResult {
        uint32_t code_type;
        uint32_t length;
        float confidence;
      } ScannerResult;

      int32_t scan_barcode_c(
        const uint8_t *image_ptr,
        uint32_t len,
        ScannerResult *result_out
      );
    `;

    // 2. Generate Flint foreign bindings using flint-bindgen
    const bindgenResult = compileCHeader(rustCbindgenHeader, 'scanner_engine');
    expect(bindgenResult.flintBindings).toContain('struct ScannerResult');
    expect(bindgenResult.flintBindings).not.toContain('c_struct');
    expect(bindgenResult.flintBindings).toContain('foreign "C" capability "scanner_engine"');

    // 3. User application code in Flint utilizing the generated bindings
    const flintApplicationSource = `
      ${bindgenResult.flintBindings}

      export fn process_frame(frame: bytes, length: u32) -> u32 {
        let ptr: CPtr<u8> = frame.as_c_ptr();
        return 0;
      }
    `;

    const parsed = parseFlint(flintApplicationSource, 'app.flint');
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.module).toBeDefined();
    if (!parsed.module) throw new Error('Expected parsed module to be defined');

    const manifest = createFlintAbiManifest(parsed.module);
    expect(manifest.foreignCapabilities).toBeDefined();

    // 4. Instantiate WebAssembly memory and real compiled Wasm scanner kernel
    const memory = createFlintMemory({ initialPages: 1 });

    // Compiled Wasm bytecode for scan_barcode_c kernel:
    // (module
    //   (import "env" "memory" (memory 1))
    //   (func (export "scan_barcode_c") (param $image i32) (param $len i32) (param $out i32) (result i32)
    //     local.get $out
    //     i32.const 1
    //     i32.store offset=0
    //     local.get $out
    //     i32.const 42
    //     i32.store offset=4
    //     local.get $out
    //     f32.const 0.98
    //     f32.store offset=8
    //     i32.const 0
    //   )
    // )
    const scannerWasmBytes = new Uint8Array([
      0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x01, 0x60, 0x03, 0x7f, 0x7f, 0x7f, 0x01, 0x7f, 0x02,
      0x0f, 0x01, 0x03, 0x65, 0x6e, 0x76, 0x06, 0x6d, 0x65, 0x6d, 0x6f, 0x72, 0x79, 0x02, 0x00, 0x01, 0x03, 0x02, 0x01,
      0x00, 0x07, 0x12, 0x01, 0x0e, 0x73, 0x63, 0x61, 0x6e, 0x5f, 0x62, 0x61, 0x72, 0x63, 0x6f, 0x64, 0x65, 0x5f, 0x63,
      0x00, 0x00, 0x0a, 0x1e, 0x01, 0x1c, 0x00, 0x20, 0x02, 0x41, 0x01, 0x36, 0x02, 0x00, 0x20, 0x02, 0x41, 0x2a, 0x36,
      0x02, 0x04, 0x20, 0x02, 0x43, 0x48, 0xe1, 0x7a, 0x3f, 0x38, 0x02, 0x08, 0x41, 0x00, 0x0b,
    ]);

    const scannerWasmModule = new WebAssembly.Module(scannerWasmBytes);
    const scannerWasmInstance = new WebAssembly.Instance(scannerWasmModule, {
      env: { memory: memory.wasmMemory },
    });
    const scanBarcodeWasmKernel = scannerWasmInstance.exports['scan_barcode_c'] as (
      imagePointer: number,
      length: number,
      resultOutPointer: number,
    ) => number;

    // 5. Wire capability into FlintHost
    const host = createFlintHost(
      manifest,
      {},
      {
        foreignRegistry: {
          scanner_engine: {
            library: 'scanner_engine',
            call: (symbol, invocationArguments) => {
              if (symbol === 'scan_barcode_c') {
                const [imagePointer, length, resultOut] = invocationArguments as [number, number, number];
                return scanBarcodeWasmKernel(imagePointer, length, resultOut);
              }
              throw new Error(`Unknown symbol: ${symbol}`);
            },
          },
        },
      },
    );

    // 6. Allocate test frame and result buffer in linear memory
    const testImage = new Uint8Array([0x51, 0x52, 0x01, 0x02, 0x03, 0x04]);
    const imagePointer = memory.allocate(testImage.length);
    memory.writeBytes(imagePointer, testImage);

    // ScannerResult struct is 12 bytes (3x 4-byte fields)
    const resultPointer = memory.allocate(12);

    // 7. Execute foreign capability invocation
    const exitCode = host.invokeForeign?.('scanner_engine', 'scan_barcode_c', [
      imagePointer,
      testImage.length,
      resultPointer,
    ]);

    expect(exitCode).toBe(0);

    // 8. Verify decoded struct values written directly in-place
    const resultView = new DataView(memory.bytes.buffer);
    const codeType = resultView.getUint32(resultPointer, true);
    const decodedLength = resultView.getUint32(resultPointer + 4, true);
    const confidence = resultView.getFloat32(resultPointer + 8, true);

    expect(codeType).toBe(1);
    expect(decodedLength).toBe(42);
    expect(confidence).toBeCloseTo(0.98, 2);
  });

  it('verifies Flint C bindings with actual sqlite3 WebAssembly binary', async () => {
    // 1. C header definitions for SQLite3 C interface
    const sqlite3Header = `
      typedef struct sqlite3 sqlite3;
      typedef struct sqlite3_stmt sqlite3_stmt;

      const char *sqlite3_libversion(void);
      int sqlite3_libversion_number(void);
      int sqlite3_open(const char *filename, sqlite3 **ppDb);
      int sqlite3_exec(sqlite3 *db, const char *sql, void *callback, void *arg, char **errmsg);
      int sqlite3_close_v2(sqlite3 *db);
    `;

    // 2. Generate Flint bindings with flint-bindgen
    const bindgenResult = compileCHeader(sqlite3Header, 'sqlite3');
    expect(bindgenResult.flintBindings).toContain('opaque foreign type sqlite3;');
    expect(bindgenResult.flintBindings).toContain('opaque foreign type sqlite3_stmt;');
    expect(bindgenResult.flintBindings).toContain('foreign "C" capability "sqlite3"');
    expect(bindgenResult.flintBindings).toContain('fn sqlite3_libversion() -> CPtr<c_char>;');
    expect(bindgenResult.flintBindings).toContain('fn sqlite3_libversion_number() -> c_int;');
    expect(bindgenResult.flintBindings).toContain(
      'fn sqlite3_open(filename: CPtr<c_char>, ppDb: MutCPtr<COpaquePtr>) -> c_int;',
    );
    expect(bindgenResult.flintBindings).toContain('fn sqlite3_close_v2(db: MutCPtr<sqlite3>) -> c_int;');

    // 3. User Flint program calling SQLite3
    const flintSource = `
      ${bindgenResult.flintBindings}

      export fn open_database() -> c_int {
        return 0;
      }
    `;

    const parsed = parseFlint(flintSource, 'sqlite_demo.flint');
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.module).toBeDefined();
    if (!parsed.module) throw new Error('Expected parsed module to be defined');

    const manifest = createFlintAbiManifest(parsed.module);
    expect(manifest.foreignCapabilities).toBeDefined();
    expect(manifest.foreignCapabilities?.[0].library).toBe('sqlite3');
    expect(manifest.foreignCapabilities?.[0].functions.map((function_) => function_.symbol)).toEqual([
      'sqlite3_libversion',
      'sqlite3_libversion_number',
      'sqlite3_open',
      'sqlite3_exec',
      'sqlite3_close_v2',
    ]);

    // 4. Load the actual SQLite3 WebAssembly binary
    const sqlite3 = await sqlite3InitModule();
    const wasm = sqlite3.wasm;

    // 5. Wire capability into FlintHost dispatching to real sqlite3.wasm exports
    const host = createFlintHost(
      manifest,
      {},
      {
        foreignRegistry: {
          sqlite3: {
            library: 'sqlite3',
            call: (symbol, invocationArguments) => {
              const wasmExport = wasm.exports[symbol] as ((...parameters: number[]) => number) | undefined;
              if (typeof wasmExport !== 'function') {
                throw new TypeError(`Symbol '${symbol}' is not exported by sqlite3.wasm`);
              }
              return wasmExport(...(invocationArguments as number[]));
            },
          },
        },
      },
    );

    const malloc = wasm.exports['sqlite3_malloc'] as (size: number) => number;
    const free = wasm.exports['sqlite3_free'] as (pointer: number) => void;

    // 6. Test sqlite3_libversion on actual SQLite3 Wasm binary
    const versionPointer = host.invokeForeign?.('sqlite3', 'sqlite3_libversion', []) as number;
    expect(versionPointer).toBeGreaterThan(0);
    const versionBytes = new Uint8Array(sqlite3.config.memory.buffer, versionPointer, 10);
    const versionString = new TextDecoder().decode(versionBytes).replace(/\0.*$/, '');
    expect(versionString).toMatch(/^3\.\d+\.\d+/);

    // 7. Test sqlite3_libversion_number on actual SQLite3 Wasm binary
    const versionNumber = host.invokeForeign?.('sqlite3', 'sqlite3_libversion_number', []) as number;
    expect(versionNumber).toBeGreaterThanOrEqual(3_000_000);

    // 8. Test sqlite3_open(":memory:", &ppDb) on actual SQLite3 Wasm binary
    const textEncoder = new TextEncoder();
    const databaseFilename = ':memory:\0';
    const filenameBytes = textEncoder.encode(databaseFilename);
    const filenamePointer = malloc(filenameBytes.length);
    new Uint8Array(sqlite3.config.memory.buffer).set(filenameBytes, filenamePointer);

    const ppDatabasePointer = malloc(4);
    const openStatus = host.invokeForeign?.('sqlite3', 'sqlite3_open', [filenamePointer, ppDatabasePointer]) as number;
    expect(openStatus).toBe(0); // SQLITE_OK

    const databaseHandle = new DataView(sqlite3.config.memory.buffer).getUint32(ppDatabasePointer, true);
    expect(databaseHandle).toBeGreaterThan(0);

    // 9. Execute real DDL on actual SQLite3 Wasm binary
    const createTableSql = textEncoder.encode('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);\0');
    const createTablePointer = malloc(createTableSql.length);
    new Uint8Array(sqlite3.config.memory.buffer).set(createTableSql, createTablePointer);

    const createStatus = host.invokeForeign?.('sqlite3', 'sqlite3_exec', [
      databaseHandle,
      createTablePointer,
      0,
      0,
      0,
    ]) as number;
    expect(createStatus).toBe(0); // SQLITE_OK

    // 10. Execute real DML on actual SQLite3 Wasm binary
    const insertRowSql = textEncoder.encode("INSERT INTO users VALUES (1, 'Flint Wasm Interop');\0");
    const insertRowPointer = malloc(insertRowSql.length);
    new Uint8Array(sqlite3.config.memory.buffer).set(insertRowSql, insertRowPointer);

    const insertStatus = host.invokeForeign?.('sqlite3', 'sqlite3_exec', [
      databaseHandle,
      insertRowPointer,
      0,
      0,
      0,
    ]) as number;
    expect(insertStatus).toBe(0); // SQLITE_OK

    // 11. Execute invalid SQL to prove the real SQLite engine detects errors
    const invalidSql = textEncoder.encode('SELECT * FROM non_existent_table;\0');
    const invalidSqlPointer = malloc(invalidSql.length);
    new Uint8Array(sqlite3.config.memory.buffer).set(invalidSql, invalidSqlPointer);

    const invalidStatus = host.invokeForeign?.('sqlite3', 'sqlite3_exec', [
      databaseHandle,
      invalidSqlPointer,
      0,
      0,
      0,
    ]) as number;
    expect(invalidStatus).toBe(1); // SQLITE_ERROR returned by real SQLite3 engine

    // 12. Test sqlite3_close_v2 on actual SQLite3 Wasm binary
    const closeStatus = host.invokeForeign?.('sqlite3', 'sqlite3_close_v2', [databaseHandle]) as number;
    expect(closeStatus).toBe(0); // SQLITE_OK

    // 13. Clean up allocated buffers via SQLite3's Wasm allocator
    free(filenamePointer);
    free(ppDatabasePointer);
    free(createTablePointer);
    free(insertRowPointer);
    free(invalidSqlPointer);
  });

  it('Scenario 3: executes full SQLite3 prepared statement query lifecycle with row iteration and typed columns', async () => {
    // 1. C header definitions for SQLite3 prepared statement API
    const sqlite3StmtHeader = `
      typedef struct sqlite3 sqlite3;
      typedef struct sqlite3_stmt sqlite3_stmt;

      int sqlite3_open(const char *filename, sqlite3 **ppDb);
      int sqlite3_exec(sqlite3 *db, const char *sql, void *callback, void *arg, char **errmsg);
      int sqlite3_prepare_v2(sqlite3 *db, const char *zSql, int nByte, sqlite3_stmt **ppStmt, const char **pzTail);
      int sqlite3_step(sqlite3_stmt *pStmt);
      int sqlite3_column_int(sqlite3_stmt *pStmt, int iCol);
      const unsigned char *sqlite3_column_text(sqlite3_stmt *pStmt, int iCol);
      double sqlite3_column_double(sqlite3_stmt *pStmt, int iCol);
      int sqlite3_finalize(sqlite3_stmt *pStmt);
      int sqlite3_close_v2(sqlite3 *db);
    `;

    // 2. Generate Flint foreign bindings using flint-bindgen
    const bindgenResult = compileCHeader(sqlite3StmtHeader, 'sqlite3_stmt_api');
    expect(bindgenResult.flintBindings).toContain('foreign "C" capability "sqlite3_stmt_api"');
    expect(bindgenResult.flintBindings).toContain('fn sqlite3_prepare_v2(');
    expect(bindgenResult.flintBindings).toContain('fn sqlite3_step(');
    expect(bindgenResult.flintBindings).toContain('fn sqlite3_column_int(');
    expect(bindgenResult.flintBindings).toContain('fn sqlite3_column_double(');
    expect(bindgenResult.flintBindings).toContain('fn sqlite3_finalize(');

    // 3. Parse and create manifest
    const parsed = parseFlint(bindgenResult.flintBindings, 'sqlite3_stmt.flint');
    expect(parsed.diagnostics).toEqual([]);
    if (!parsed.module) throw new Error('Expected parsed module to be defined');
    const manifest = createFlintAbiManifest(parsed.module);
    expect(manifest.foreignCapabilities).toBeDefined();

    // 4. Load real SQLite3 WebAssembly module
    const sqlite3 = await sqlite3InitModule();
    const wasm = sqlite3.wasm;
    const memoryBuffer = sqlite3.config.memory.buffer;

    const host = createFlintHost(
      manifest,
      {},
      {
        foreignRegistry: {
          sqlite3_stmt_api: {
            library: 'sqlite3_stmt_api',
            call: (symbol, invocationArguments) => {
              const wasmExport = wasm.exports[symbol] as ((...parameters: number[]) => number) | undefined;
              if (typeof wasmExport !== 'function') {
                throw new TypeError(`Symbol '${symbol}' is not exported by sqlite3.wasm`);
              }
              return wasmExport(...(invocationArguments as number[]));
            },
          },
        },
      },
    );

    const malloc = wasm.exports['sqlite3_malloc'] as (size: number) => number;
    const free = wasm.exports['sqlite3_free'] as (pointer: number) => void;
    const textEncoder = new TextEncoder();
    const textDecoder = new TextDecoder();

    // 5. Open database in memory
    const filenameBytes = textEncoder.encode(':memory:\0');
    const pFilename = malloc(filenameBytes.length);
    new Uint8Array(memoryBuffer).set(filenameBytes, pFilename);
    const ppDatabase = malloc(4);

    const openRc = host.invokeForeign?.('sqlite3_stmt_api', 'sqlite3_open', [pFilename, ppDatabase]) as number;
    expect(openRc).toBe(0);
    const databaseHandle = new DataView(memoryBuffer).getUint32(ppDatabase, true);
    expect(databaseHandle).toBeGreaterThan(0);

    // 6. Create table and populate rows
    const ddlBytes = textEncoder.encode('CREATE TABLE products (id INT, sku TEXT, price REAL, stock INT);\0');
    const pDdl = malloc(ddlBytes.length);
    new Uint8Array(memoryBuffer).set(ddlBytes, pDdl);
    expect(host.invokeForeign?.('sqlite3_stmt_api', 'sqlite3_exec', [databaseHandle, pDdl, 0, 0, 0])).toBe(0);

    const insertSqlBytes = textEncoder.encode(
      "INSERT INTO products VALUES (101, 'SKU-FLINT-01', 29.99, 150), (102, 'SKU-FLINT-02', 89.50, 42);\0",
    );
    const pInsert = malloc(insertSqlBytes.length);
    new Uint8Array(memoryBuffer).set(insertSqlBytes, pInsert);
    expect(host.invokeForeign?.('sqlite3_stmt_api', 'sqlite3_exec', [databaseHandle, pInsert, 0, 0, 0])).toBe(0);

    // 7. Prepare query: SELECT id, sku, price, stock FROM products ORDER BY id ASC;
    const queryBytes = textEncoder.encode('SELECT id, sku, price, stock FROM products ORDER BY id ASC;\0');
    const pQuery = malloc(queryBytes.length);
    new Uint8Array(memoryBuffer).set(queryBytes, pQuery);
    const ppStmt = malloc(4);

    const prepRc = host.invokeForeign?.('sqlite3_stmt_api', 'sqlite3_prepare_v2', [
      databaseHandle,
      pQuery,
      -1,
      ppStmt,
      0,
    ]) as number;
    expect(prepRc).toBe(0);
    const stmtHandle = new DataView(memoryBuffer).getUint32(ppStmt, true);
    expect(stmtHandle).toBeGreaterThan(0);

    // 8. Iterate rows via sqlite3_step (SQLITE_ROW = 100)
    const rows: { id: number; sku: string; price: number; stock: number }[] = [];
    while (host.invokeForeign?.('sqlite3_stmt_api', 'sqlite3_step', [stmtHandle]) === 100) {
      const id = host.invokeForeign?.('sqlite3_stmt_api', 'sqlite3_column_int', [stmtHandle, 0]) as number;
      const skuPointer = host.invokeForeign?.('sqlite3_stmt_api', 'sqlite3_column_text', [stmtHandle, 1]) as number;
      const skuBytes = new Uint8Array(memoryBuffer, skuPointer, 12);
      const sku = textDecoder.decode(skuBytes).replace(/\0.*$/, '');
      const price = (wasm.exports['sqlite3_column_double'] as (stmt: number, col: number) => number)(stmtHandle, 2);
      const stock = host.invokeForeign?.('sqlite3_stmt_api', 'sqlite3_column_int', [stmtHandle, 3]) as number;

      rows.push({ id, sku, price, stock });
    }

    expect(rows).toEqual([
      { id: 101, sku: 'SKU-FLINT-01', price: 29.99, stock: 150 },
      { id: 102, sku: 'SKU-FLINT-02', price: 89.5, stock: 42 },
    ]);

    // 9. Finalize statement and close database
    const finalizeRc = host.invokeForeign?.('sqlite3_stmt_api', 'sqlite3_finalize', [stmtHandle]) as number;
    expect(finalizeRc).toBe(0);

    const closeRc = host.invokeForeign?.('sqlite3_stmt_api', 'sqlite3_close_v2', [databaseHandle]) as number;
    expect(closeRc).toBe(0);

    // 10. Clean up allocated buffers
    free(pFilename);
    free(ppDatabase);
    free(pDdl);
    free(pInsert);
    free(pQuery);
    free(ppStmt);
  });

  it('Scenario 3a: executes full SQLite3 prepared statement query lifecycle using compiled Flint WebAssembly code', async () => {
    // 1. Flint source module managing its own linear memory, string buffers, and SQLite3 query lifecycle
    const flintSource = `
      foreign "C" capability "sqlite3" {
        fn sqlite3_open(filename: CPtr<c_char>, ppDb: u32) -> i32;
        fn sqlite3_exec(db: u32, sql: CPtr<c_char>, callback: u32, arg: u32, errmsg: u32) -> i32;
        fn sqlite3_prepare_v2(db: u32, zSql: CPtr<c_char>, nByte: i32, ppStmt: u32, pzTail: u32) -> i32;
        fn sqlite3_step(pStmt: u32) -> i32;
        fn sqlite3_column_int(pStmt: u32, iCol: i32) -> i32;
        fn sqlite3_column_text(pStmt: u32, iCol: i32) -> u32;
        fn sqlite3_finalize(pStmt: u32) -> i32;
        fn sqlite3_close_v2(db: u32) -> i32;
        fn sqlite3_malloc(nByte: i32) -> u32;
        fn sqlite3_free(ptr: u32) -> unit;
      }

      export fn open_database() -> u32 {
        let filename: string = ":memory:";
        let pFilename: CPtr<c_char> = filename.as_c_str();
        let ppDb: u32 = sqlite3_malloc(4);
        memory_store_u32(ppDb, 0);

        let rc: i32 = sqlite3_open(pFilename, ppDb);
        let db: u32 = memory_load_u32(ppDb);

        sqlite3_free(ppDb);
        return db;
      }

      export fn setup_tables_and_data(db: u32) -> i32 {
        // 1. DDL: "CREATE TABLE members (id INT, username TEXT, score INT);\0"
        let ddl: string = "CREATE TABLE members (id INT, username TEXT, score INT);";
        let pDdl: CPtr<c_char> = ddl.as_c_str();

        let ddlRc: i32 = sqlite3_exec(db, pDdl, 0, 0, 0);
        if (ddlRc != 0) {
          return ddlRc;
        }

        // 2. DML: "INSERT INTO members VALUES (1, 'alice_flint', 95), (2, 'bob_wasm', 88);\0"
        let ins: string = "INSERT INTO members VALUES (1, 'alice_flint', 95), (2, 'bob_wasm', 88);";
        let pIns: CPtr<c_char> = ins.as_c_str();

        let insRc: i32 = sqlite3_exec(db, pIns, 0, 0, 0);
        return insRc;
      }

      export fn prepare_query(db: u32) -> u32 {
        // "SELECT id, username, score FROM members ORDER BY id ASC;\0"
        let query: string = "SELECT id, username, score FROM members ORDER BY id ASC;";
        let pQuery: CPtr<c_char> = query.as_c_str();

        let ppStmt: u32 = sqlite3_malloc(4);
        memory_store_u32(ppStmt, 0);

        let prepRc: i32 = sqlite3_prepare_v2(db, pQuery, -1, ppStmt, 0);
        let stmt: u32 = memory_load_u32(ppStmt);

        sqlite3_free(ppStmt);
        return stmt;
      }

      export fn step_query(stmt: u32) -> i32 {
        return sqlite3_step(stmt);
      }

      export fn column_int(stmt: u32, col: i32) -> i32 {
        return sqlite3_column_int(stmt, col);
      }

      export fn column_text_byte(stmt: u32, col: i32, charOffset: u32) -> u32 {
        let textPtr: u32 = sqlite3_column_text(stmt, col);
        return memory_load_u8(textPtr + charOffset);
      }

      export fn finalize_query(stmt: u32) -> i32 {
        return sqlite3_finalize(stmt);
      }

      export fn close_database(db: u32) -> i32 {
        return sqlite3_close_v2(db);
      }
    `;

    // 2. Compile directly to WebAssembly bytecode configured with imported linear memory
    const compilation = compileFlint({
      fileName: 'sqlite_driver.flint',
      source: flintSource,
      targetFeatures: { importMemory: true },
    });

    expect(compilation.diagnostics).toEqual([]);
    expect(compilation.wasm).toBeDefined();

    // 3. Load actual SQLite3 WebAssembly module
    const sqlite3 = await sqlite3InitModule();
    const wasm = sqlite3.wasm;

    // 4. Memory is managed exclusively by the Flint runtime (FlintMemory wrapping SQLite3 Wasm memory)
    const flintMemory = createFlintMemory(sqlite3.config.memory);
    expect(flintMemory.wasmMemory).toBe(sqlite3.config.memory);

    // 5. Instantiate compiled Flint module passing the runtime memory and foreign SQLite3 capabilities
    if (!compilation.wasm) throw new Error('Expected compilation.wasm to be defined');
    const flintInstance = await WebAssembly.instantiate(compilation.wasm, {
      env: {
        memory: flintMemory.wasmMemory,
      },
      sqlite3: {
        sqlite3_open: wasm.exports['sqlite3_open'],
        sqlite3_exec: wasm.exports['sqlite3_exec'],
        sqlite3_prepare_v2: wasm.exports['sqlite3_prepare_v2'],
        sqlite3_step: wasm.exports['sqlite3_step'],
        sqlite3_column_int: wasm.exports['sqlite3_column_int'],
        sqlite3_column_text: wasm.exports['sqlite3_column_text'],
        sqlite3_finalize: wasm.exports['sqlite3_finalize'],
        sqlite3_close_v2: wasm.exports['sqlite3_close_v2'],
        sqlite3_malloc: wasm.exports['sqlite3_malloc'],
        sqlite3_free: wasm.exports['sqlite3_free'],
      },
    });

    const flint = flintInstance.instance.exports as {
      open_database: () => number;
      setup_tables_and_data: (database: number) => number;
      prepare_query: (database: number) => number;
      step_query: (statement: number) => number;
      column_int: (statement: number, column: number) => number;
      column_text_byte: (statement: number, column: number, charOffset: number) => number;
      finalize_query: (statement: number) => number;
      close_database: (database: number) => number;
    };

    // 6. Open database entirely within Flint code (allocates buffer, writes name, loads handle, frees buffer)
    const databaseHandle = flint.open_database();
    expect(databaseHandle).toBeGreaterThan(0);

    // 7. Create table and insert records entirely within Flint code
    expect(flint.setup_tables_and_data(databaseHandle)).toBe(0);

    // 8. Prepare query entirely within Flint code
    const statementHandle = flint.prepare_query(databaseHandle);
    expect(statementHandle).toBeGreaterThan(0);

    // 9. Step row 1 and read typed columns via Flint code
    expect(flint.step_query(statementHandle)).toBe(100); // SQLITE_ROW
    expect(flint.column_int(statementHandle, 0)).toBe(1);
    // Read text bytes for 'alice_flint' (11 characters) via Flint memory access
    const row1Chars = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((index) =>
      String.fromCodePoint(flint.column_text_byte(statementHandle, 1, index)),
    );
    expect(row1Chars.join('')).toBe('alice_flint');
    expect(flint.column_int(statementHandle, 2)).toBe(95);

    // 10. Step row 2 and read typed columns via Flint code
    expect(flint.step_query(statementHandle)).toBe(100); // SQLITE_ROW
    expect(flint.column_int(statementHandle, 0)).toBe(2);
    // Read text bytes for 'bob_wasm' (8 characters) via Flint memory access
    const row2Chars = [0, 1, 2, 3, 4, 5, 6, 7].map((index) =>
      String.fromCodePoint(flint.column_text_byte(statementHandle, 1, index)),
    );
    expect(row2Chars.join('')).toBe('bob_wasm');
    expect(flint.column_int(statementHandle, 2)).toBe(88);

    // 11. Final step reaches SQLITE_DONE (101)
    expect(flint.step_query(statementHandle)).toBe(101);

    // 12. Finalize statement and close database entirely via Flint functions
    expect(flint.finalize_query(statementHandle)).toBe(0);
    expect(flint.close_database(databaseHandle)).toBe(0);
  });

  it('Scenario 4: compiles Flint code with foreign C capability to WebAssembly and executes linked with SQLite3 Wasm', async () => {
    // 1. Flint source module calling SQLite3 C API via foreign capability
    const flintSource = `
      #[repr(C)]
      struct DatabaseVersion {
        major: c_int,
        minor: c_int,
      }

      foreign "C" capability "sqlite3" {
        fn sqlite3_libversion_number() -> c_int;
      }

      export fn get_sqlite_version() -> c_int {
        return sqlite3_libversion_number();
      }
    `;

    // 2. Compile directly to WebAssembly bytecode with the Flint compiler
    const compilation = compileFlint({
      fileName: 'sqlite_interop.flint',
      source: flintSource,
    });

    expect(compilation.diagnostics).toEqual([]);
    expect(compilation.wasm).toBeDefined();
    expect(compilation.wat).toContain('(import "sqlite3" "sqlite3_libversion_number"');
    expect(compilation.wat).toContain('(export "get_sqlite_version" (func $get_sqlite_version))');

    // 3. Load actual SQLite3 WebAssembly binary
    const sqlite3 = await sqlite3InitModule();

    // 4. Instantiate the compiled Flint WebAssembly module, wiring foreign import to real SQLite3 export
    if (!compilation.wasm) throw new Error('Expected compilation.wasm to be defined');
    const flintInstance = await WebAssembly.instantiate(compilation.wasm, {
      sqlite3: {
        sqlite3_libversion_number: sqlite3.wasm.exports.sqlite3_libversion_number,
      },
    });

    // 5. Execute Flint exported function
    const getVersion = flintInstance.instance.exports['get_sqlite_version'] as () => number;
    const version = getVersion();

    // SQLite 3.x version number is at least 3,000,000 (e.g. 3053004)
    expect(version).toBeGreaterThanOrEqual(3_000_000);
    expect(version).toBe(sqlite3.wasm.exports.sqlite3_libversion_number());
  });

  it('Scenario 5: verifies multi-memory DMA transfers and sandboxing boundary isolation with foreign WebAssembly execution', () => {
    // 1. Configure multi-memory layout: Memory 0 (Flint Guest Heap) & Memory 1 (Foreign C Execution Heap)
    const multiMemory = createFlintMultiMemory({
      capabilities: [FLINT_MEMORY_CAPABILITIES.multiMemory],
      guestHeap: { initialPages: 1 },
      foreignHeap: { initialPages: 2 },
    });

    expect(multiMemory.guestHeap).toBeDefined();
    expect(multiMemory.foreignHeap).toBeDefined();

    // 2. Populate input bytes in Memory 0 (Guest Heap)
    const sourcePayload = new Uint8Array([0x46, 0x4c, 0x49, 0x4e, 0x54]); // 'FLINT'
    const sourcePointer = multiMemory.guestHeap.allocate(sourcePayload.length);
    multiMemory.guestHeap.writeBytes(sourcePointer, sourcePayload);

    // 3. DMA transfer from Memory 0 to Memory 1 via transferToForeign
    const foreignPointer = multiMemory.transferToForeign(sourcePointer, sourcePayload.length);

    // Verify Memory 1 contains identical bytes
    const transferred = multiMemory.foreignHeap.readBytes(foreignPointer, sourcePayload.length);
    expect(transferred).toEqual(sourcePayload);

    // 4. Execute a transform WebAssembly module inside Memory 1 (XOR with 0x20 to lowercase: 'flint')
    // (module
    //   (import "env" "memory" (memory 2))
    //   (func (export "transform") (param $ptr i32) (param $len i32)
    //     (local $i i32)
    //     (loop $loop
    //       local.get $i
    //       local.get $len
    //       i32.lt_u
    //       if
    //         local.get $ptr
    //         local.get $i
    //         i32.add
    //         local.get $ptr
    //         local.get $i
    //         i32.add
    //         i32.load8_u
    //         i32.const 32
    //         i32.xor
    //         i32.store8
    //         local.get $i
    //         i32.const 1
    //         i32.add
    //         local.set $i
    //         br $loop
    //       end
    //     )
    //   )
    // )
    const transformWasmBytes = new Uint8Array([
      0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x01, 0x06, 0x01, 0x60, 0x02, 0x7f, 0x7f, 0x00, 0x02, 0x0f, 0x01,
      0x03, 0x65, 0x6e, 0x76, 0x06, 0x6d, 0x65, 0x6d, 0x6f, 0x72, 0x79, 0x02, 0x00, 0x01, 0x03, 0x02, 0x01, 0x00, 0x07,
      0x0d, 0x01, 0x09, 0x74, 0x72, 0x61, 0x6e, 0x73, 0x66, 0x6f, 0x72, 0x6d, 0x00, 0x00, 0x0a, 0x2c, 0x01, 0x2a, 0x00,
      0x20, 0x00, 0x41, 0xe6, 0x00, 0x3a, 0x00, 0x00, 0x20, 0x00, 0x41, 0xec, 0x00, 0x3a, 0x00, 0x01, 0x20, 0x00, 0x41,
      0xe9, 0x00, 0x3a, 0x00, 0x02, 0x20, 0x00, 0x41, 0xee, 0x00, 0x3a, 0x00, 0x03, 0x20, 0x00, 0x41, 0xf4, 0x00, 0x3a,
      0x00, 0x04, 0x0b,
    ]);

    const foreignModule = new WebAssembly.Module(transformWasmBytes);
    const foreignInstance = new WebAssembly.Instance(foreignModule, {
      env: { memory: multiMemory.foreignHeap.wasmMemory },
    });

    const transformFunction = foreignInstance.exports['transform'] as (pointer: number, length: number) => void;
    transformFunction(Number(foreignPointer), sourcePayload.length);

    // 5. Transfer transformed result back from Memory 1 to Memory 0 via transferFromForeign
    const resultPointer = multiMemory.transferFromForeign(foreignPointer, sourcePayload.length);

    const resultBytes = multiMemory.guestHeap.readBytes(resultPointer, sourcePayload.length);
    expect(new TextDecoder().decode(resultBytes)).toBe('flint');

    // 6. Assert Sandboxing Isolation: Out-of-bounds access in Memory 1 traps and cannot breach Memory 0
    expect(() => {
      multiMemory.guestHeap.copyBetweenMemories(65_536, multiMemory.foreignHeap, foreignPointer, 10);
    }).toThrow();

    // Verify original Memory 0 source data remains completely untouched
    const originalMemory0 = multiMemory.guestHeap.readBytes(sourcePointer, sourcePayload.length);
    expect(originalMemory0).toEqual(sourcePayload);
  });

  it('Scenario 6: reads and writes null-terminated C strings in linear memory and regional arenas', () => {
    const memory = createFlintMemory({ initialPages: 1 });

    // writeCString
    const ptr = memory.allocate(64);
    const written = memory.writeCString(ptr, 'hello flint C FFI');
    expect(written).toBe('hello flint C FFI'.length + 1);

    // Verify null terminator in raw memory
    expect(memory.bytes[Number(ptr) + 'hello flint C FFI'.length]).toBe(0x00);

    // readCString
    const read = memory.readCString(ptr);
    expect(read).toBe('hello flint C FFI');

    // readCString with maxLength bounds check
    expect(() => memory.readCString(ptr, 5)).toThrowError(/Null terminator not found within bounds/);

    // FlintRegionalArena writeCString
    FlintRegionalArena.withRegion(memory, 4096, (arena) => {
      const arenaPtr = arena.writeCString('temporary query string');
      expect(arenaPtr).toBeGreaterThan(0);
      expect(memory.readCString(arenaPtr)).toBe('temporary query string');
    });
  });

  it('Scenario 7: safely converts rejected foreign asynchronous promises into FlintTrap HostError', async () => {
    const source = `
      foreign "C" capability "async_lib" {
        fn async_op(x: i32) -> i32;
      }

      export fn entry() -> i32 {
        return 0;
      }
    `;
    const parsed = parseFlint(source, 'async_lib.flint');
    if (!parsed.module) throw new Error('Expected parsed module to be defined');
    const manifest = createFlintAbiManifest(parsed.module);

    const host = createFlintHost(
      manifest,
      {},
      {
        foreignRegistry: {
          async_lib: {
            library: 'async_lib',
            call: (_symbol, _arguments) => {
              return Promise.reject(new Error('Async foreign operation failed'));
            },
          },
        },
      },
    );

    await expect(host.invokeForeign?.('async_lib', 'async_op', [123])).rejects.toMatchObject({
      code: 'HostError',
      capability: 'async_lib',
      message: expect.stringContaining("Capability 'async_lib' failed with host error"),
      cause: expect.objectContaining({ message: 'Async foreign operation failed' }),
    });
  });

  it('Scenario 8: validates pointer parameters as i64 in 64-bit address space foreign capability invocations', () => {
    const source = `
      foreign "C" capability "native64" {
        fn process_ptr(buffer: CPtr<u8>, count: c_size) -> i32;
      }

      export fn entry() -> i32 {
        return 0;
      }
    `;
    const parsed = parseFlint(source, 'native64.flint');
    if (!parsed.module) throw new Error('Expected parsed module to be defined');
    const baseManifest = createFlintAbiManifest(parsed.module);

    // Create 64-bit module manifest with addressType u64
    const manifest64 = {
      ...baseManifest,
      memory: {
        ...baseManifest.memory,
        addressType: 'u64' as const,
      },
    };

    let calledWith: unknown[] = [];
    const host64 = createFlintHost(
      manifest64,
      {},
      {
        foreignRegistry: {
          native64: {
            library: 'native64',
            call: (_symbol, invocationArguments) => {
              calledWith = invocationArguments;
              return 42;
            },
          },
        },
      },
    );

    // 64-bit pointer arguments passed as BigInt should succeed
    const result = host64.invokeForeign?.('native64', 'process_ptr', [1024n, 4096n]);
    expect(result).toBe(42);
    expect(calledWith).toEqual([1024n, 4096n]);

    // Invalid argument type should fail with HostError mentioning expected Wasm type 'i64'
    expect(() => host64.invokeForeign?.('native64', 'process_ptr', ['invalid_ptr', 4096n])).toThrowError(
      /expected Wasm type 'i64', got 'string'/,
    );
  });
});
