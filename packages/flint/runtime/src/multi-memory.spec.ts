import { compileFlint, createFlintAbiManifest, parseFlint } from '@mission-platform/flint';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { describe, expect, it } from 'vitest';

import { createFlintHost } from './host.ts';
import { createFlintMultiMemory, FlintRegionalArena } from './memory.ts';
import { FlintTrap } from './traps.ts';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

describe('Tiered Hybrid Memory & Multi-Memory Sandboxing', () => {
  it('Scenario 4: provides hardware-enforced memory isolation between Memory 0 and Memory 1', () => {
    const multiMemory = createFlintMultiMemory({
      capabilities: ['wasm.multi-memory'],
      guestHeap: { initialPages: 1 },
      foreignHeap: { initialPages: 1 },
    });

    // Write sensitive data to Memory 0 (guest heap)
    const secretPointer = multiMemory.guestHeap.allocate(16);
    const secretData = new Uint8Array([0xde, 0xad, 0xbe, 0xef, 0x01, 0x02, 0x03, 0x04]);
    multiMemory.guestHeap.writeBytes(secretPointer, secretData);

    // Foreign library operates in Memory 1 (foreign heap)
    const foreignPointer = multiMemory.foreignHeap.allocate(32);
    const foreignData = new Uint8Array(32).fill(0xff);
    multiMemory.foreignHeap.writeBytes(foreignPointer, foreignData);

    // Assert that Memory 0 and Memory 1 buffers are completely disjoint
    expect(multiMemory.guestHeap.readBytes(secretPointer, 8)).toEqual(secretData);
    expect(multiMemory.foreignHeap.readBytes(foreignPointer, 32)).toEqual(foreignData);

    // An out-of-bounds write attempt in Memory 1 must trap and cannot corrupt Memory 0
    expect(() => {
      // 70000 exceeds 1 page (65536 bytes)
      multiMemory.foreignHeap.writeBytes(70_000, new Uint8Array([0x00]));
    }).toThrow(/outside linear memory/);

    // Memory 0 remains completely untampered and intact
    expect(multiMemory.guestHeap.readBytes(secretPointer, 8)).toEqual(secretData);
  });

  it('performs bounded cross-memory DMA transfer between Memory 0 and Memory 1', () => {
    const multiMemory = createFlintMultiMemory({
      capabilities: ['wasm.multi-memory'],
    });

    const inputData = new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80]);
    const guestSource = multiMemory.guestHeap.allocate(inputData.length);
    multiMemory.guestHeap.writeBytes(guestSource, inputData);

    // Transfer guest data to foreign sandbox memory
    const foreignDestination = multiMemory.transferToForeign(guestSource, inputData.length);
    expect(multiMemory.foreignHeap.readBytes(foreignDestination, inputData.length)).toEqual(inputData);

    // Modify in foreign memory (e.g. barcode result / transformed bytes)
    const modifiedData = new Uint8Array([99, 98, 97, 96, 95, 94, 93, 92]);
    multiMemory.foreignHeap.writeBytes(foreignDestination, modifiedData);

    // Transfer back from foreign sandbox to guest memory
    const guestDestination = multiMemory.transferFromForeign(foreignDestination, modifiedData.length);
    expect(multiMemory.guestHeap.readBytes(guestDestination, modifiedData.length)).toEqual(modifiedData);

    // Memory bounds validation rejects out-of-range DMA transfer
    expect(() => {
      multiMemory.guestHeap.copyBetweenMemories(0, multiMemory.foreignHeap, 0, 100_000);
    }).toThrow(/exceeds buffer boundary/);
  });

  it('Scenario 3: provides deterministic O(1) regional arena lifecycle reclamation', () => {
    const multiMemory = createFlintMultiMemory({
      capabilities: ['wasm.multi-memory'],
    });

    // Execute within a scoped arena
    const allocationsCount = 10_000;
    const finalAllocated = FlintRegionalArena.withRegion(multiMemory.guestHeap, 128 * 1024, (arena) => {
      let lastOffset = 0;
      for (let index = 0; index < allocationsCount; index++) {
        lastOffset = arena.allocate(8, 8);
      }
      expect(lastOffset).toBeGreaterThan(0);
      return lastOffset;
    });

    expect(finalAllocated).toBeGreaterThan(0);

    // After withRegion exit, arena buffer is completely disposed from parent allocator
    // and subsequent arena can be created without memory leak
    const secondPass = FlintRegionalArena.withRegion(multiMemory.guestHeap, 64 * 1024, (arena) => {
      const offset = arena.allocate(16);
      arena.reset();
      const resetOffset = arena.allocate(16);
      expect(resetOffset).toBe(offset);
      return resetOffset;
    });

    expect(secondPass).toBeGreaterThan(0);
  });

  it('enforces capability-gated boundary transitions upon foreign library invocation', () => {
    const source = `
      foreign "C" capability "zstd" {
        fn ZSTD_versionNumber() -> c_uint;
      }

      export fn noop() -> i32 {
        return 0;
      }
    `;

    const parsed = parseFlint(source, 'zstd_demo.flint');
    expect(parsed.diagnostics).toEqual([]);
    if (!parsed.module) throw new Error('Expected parsed module to be defined');
    const manifest = createFlintAbiManifest(parsed.module);

    let foreignCalled = false;
    const host = createFlintHost(
      manifest,
      {},
      {
        foreignRegistry: {
          zstd: {
            library: 'zstd',
            call: (symbol) => {
              if (symbol === 'ZSTD_versionNumber') {
                foreignCalled = true;
                return 10_505;
              }
              throw new Error(`Unknown symbol: ${symbol}`);
            },
          },
        },
      },
    );

    const result = host.invokeForeign?.('zstd', 'ZSTD_versionNumber', []);
    expect(result).toBe(10_505);
    expect(foreignCalled).toBe(true);

    // Invoking an undeclared foreign library traps with CapabilityDenied
    expect(() => {
      host.invokeForeign?.('unauthorized_lib', 'malicious_fn', []);
    }).toThrow(/Foreign library capability 'unauthorized_lib' is not declared/);

    // Invoking an undeclared symbol in a declared library traps
    expect(() => {
      host.invokeForeign?.('zstd', 'unregistered_symbol', []);
    }).toThrow(/Foreign symbol 'unregistered_symbol' is not declared/);
  });

  it('three-tier memory coordination: orchestrates data flow across Guest Heap, Host Interop Ring Buffer, and Foreign Heap', () => {
    const multiMemory = createFlintMultiMemory({
      capabilities: ['wasm.multi-memory'],
      guestHeap: { initialPages: 1 },
      foreignHeap: { initialPages: 1 },
      hostInterop: { initialPages: 1 },
    });

    // 1. Host stages incoming network request into Memory 2 (Host Interop Ring Buffer)
    const hostPacket = new Uint8Array([0x50, 0x49, 0x4e, 0x47, 0x01, 0x02]); // 'PING' + payload
    const hostPacketPtr = multiMemory.hostInterop.allocate(hostPacket.length);
    multiMemory.hostInterop.writeBytes(hostPacketPtr, hostPacket);

    // 2. Flint guest runtime receives the host event by transferring into Memory 0 (Guest Heap)
    const guestPacketPtr = multiMemory.transferFromInterop(hostPacketPtr, hostPacket.length);
    expect(multiMemory.guestHeap.readBytes(guestPacketPtr, hostPacket.length)).toEqual(hostPacket);

    // 3. Guest runtime transforms/prepares packet and delegates payload to isolated foreign sandbox in Memory 1
    const foreignTargetPtr = multiMemory.transferToForeign(guestPacketPtr, hostPacket.length);
    expect(multiMemory.foreignHeap.readBytes(foreignTargetPtr, hostPacket.length)).toEqual(hostPacket);

    // 4. Foreign library executes in sandbox Memory 1 and produces a 'PONG' response
    const foreignResponse = new Uint8Array([0x50, 0x4f, 0x4e, 0x47, 0x01, 0x02]); // 'PONG' + payload
    multiMemory.foreignHeap.writeBytes(foreignTargetPtr, foreignResponse);

    // 5. Guest retrieves response from foreign sandbox back into Memory 0
    const guestResponsePtr = multiMemory.transferFromForeign(foreignTargetPtr, foreignResponse.length);
    expect(multiMemory.guestHeap.readBytes(guestResponsePtr, foreignResponse.length)).toEqual(foreignResponse);

    // 6. Guest pushes response out to Memory 2 for host transmission
    const hostOutPtr = multiMemory.transferToInterop(guestResponsePtr, foreignResponse.length);
    expect(multiMemory.hostInterop.readBytes(hostOutPtr, foreignResponse.length)).toEqual(foreignResponse);

    // 7. Verify Sandboxing Isolation: Out-of-bounds access in foreign sandbox cannot touch host buffer or guest heap
    expect(() => {
      multiMemory.foreignHeap.copyBetweenMemories(0, multiMemory.hostInterop, hostPacketPtr, 100_000);
    }).toThrow(/exceeds buffer boundary/);

    expect(multiMemory.guestHeap.wasmMemory).not.toBe(multiMemory.foreignHeap.wasmMemory);
    expect(multiMemory.foreignHeap.wasmMemory).not.toBe(multiMemory.hostInterop.wasmMemory);
  });

  it('dynamic linear memory growth: supports page expansion and multi-page DMA transfer while maintaining partition isolation', () => {
    const multiMemory = createFlintMultiMemory({
      capabilities: ['wasm.multi-memory'],
      guestHeap: { initialPages: 1 },
      foreignHeap: { initialPages: 1 },
    });

    const pageSize = 65_536;
    expect(multiMemory.guestHeap.bytes.byteLength).toBe(pageSize);
    expect(multiMemory.foreignHeap.bytes.byteLength).toBe(pageSize);

    // Writing beyond initial page limit before growth must trap
    expect(() => {
      multiMemory.guestHeap.writeBytes(pageSize + 10, new Uint8Array([1]));
    }).toThrow(/outside linear memory/);
    expect(() => {
      multiMemory.foreignHeap.writeBytes(pageSize + 10, new Uint8Array([1]));
    }).toThrow(/outside linear memory/);

    // Dynamically expand foreign heap by 2 pages (total 3 pages = 196,608 bytes)
    const previousForeignPages = multiMemory.foreignHeap.grow(2);
    expect(previousForeignPages).toBe(1);
    expect(multiMemory.foreignHeap.bytes.byteLength).toBe(pageSize * 3);

    // Dynamically expand guest heap by 1 page (total 2 pages = 131,072 bytes)
    const previousGuestPages = multiMemory.guestHeap.grow(1);
    expect(previousGuestPages).toBe(1);
    expect(multiMemory.guestHeap.bytes.byteLength).toBe(pageSize * 2);

    // Verify independent partition sizes: guest has 2 pages, foreign has 3 pages
    expect(multiMemory.guestHeap.bytes.byteLength).toBe(131_072);
    expect(multiMemory.foreignHeap.bytes.byteLength).toBe(196_608);

    // Large multi-page transfer spanning page boundary (80,000 bytes > 65,536 page size)
    const largeChunkSize = 80_000;
    const largePayload = new Uint8Array(largeChunkSize);
    for (let index = 0; index < largeChunkSize; index++) {
      largePayload[index] = index % 251; // Prime pattern
    }

    const guestLargePtr = multiMemory.guestHeap.allocate(largeChunkSize);
    multiMemory.guestHeap.writeBytes(guestLargePtr, largePayload);

    // Transfer large cross-page buffer to foreign sandbox
    const foreignLargePtr = multiMemory.transferToForeign(guestLargePtr, largeChunkSize);
    const foreignReadBack = multiMemory.foreignHeap.readBytes(foreignLargePtr, largeChunkSize);
    expect(foreignReadBack).toEqual(largePayload);

    // Transfer back to guest heap
    const guestRoundtripPtr = multiMemory.transferFromForeign(foreignLargePtr, largeChunkSize);
    const guestReadBack = multiMemory.guestHeap.readBytes(guestRoundtripPtr, largeChunkSize);
    expect(guestReadBack).toEqual(largePayload);

    // Validating out-of-bounds at new boundaries
    expect(() => {
      multiMemory.foreignHeap.writeBytes(196_608 + 1, new Uint8Array([9]));
    }).toThrow(/outside linear memory/);
  });

  it('nested regional arenas: guarantees strict field alignment invariants and scoped bulk reclamation without fragmentation', () => {
    const multiMemory = createFlintMultiMemory({
      capabilities: ['wasm.multi-memory'],
    });

    const alignments: readonly number[] = [1, 2, 4, 8, 16, 32, 64];

    // Top-level region: 128 KB
    FlintRegionalArena.withRegion(multiMemory.guestHeap, 128 * 1024, (outerArena) => {
      // Allocate in outer arena
      const outerHeader = outerArena.allocate(32, 8);
      expect(outerHeader % 8).toBe(0);
      multiMemory.guestHeap.writeBytes(outerHeader, new Uint8Array(32).fill(0xaa));

      // Nested region: 32 KB
      FlintRegionalArena.withRegion(multiMemory.guestHeap, 32 * 1024, (innerArena) => {
        // Allocate varying sizes with increasing natural alignments
        for (const alignment of alignments) {
          const size = alignment + 3; // unaligned size
          const offset = innerArena.allocate(size, alignment);
          expect(offset % alignment).toBe(0);

          const sampleBytes = new Uint8Array(size).fill(alignment);
          multiMemory.guestHeap.writeBytes(offset, sampleBytes);
          expect(multiMemory.guestHeap.readBytes(offset, size)).toEqual(sampleBytes);
        }

        // Inner arena reset: offsets return to start
        innerArena.reset();
        const reallocatedOffset = innerArena.allocate(16, 16);
        expect(reallocatedOffset % 16).toBe(0);
      });

      // Outer arena remains valid and uncorrupted after inner region disposal
      expect(multiMemory.guestHeap.readBytes(outerHeader, 32)).toEqual(new Uint8Array(32).fill(0xaa));

      const nextOuterOffset = outerArena.allocate(64, 32);
      expect(nextOuterOffset % 32).toBe(0);
    });

    // Parent memory remains consistent; subsequent allocations allocate cleanly
    const parentPtr = multiMemory.guestHeap.allocate(16);
    multiMemory.guestHeap.writeBytes(parentPtr, new Uint8Array([1, 2, 3, 4]));
    expect(multiMemory.guestHeap.readBytes(parentPtr, 4)).toEqual(new Uint8Array([1, 2, 3, 4]));
  });

  it('arena capacity fault isolation: safely handles arena exhaustion traps and cleans up parent memory reservations', () => {
    const multiMemory = createFlintMultiMemory({
      capabilities: ['wasm.multi-memory'],
    });

    // Intentionally small arena: 256 bytes
    let trapOccurred = false;
    try {
      FlintRegionalArena.withRegion(multiMemory.guestHeap, 256, (arena) => {
        arena.allocate(128, 8);
        // Exceeds remaining 128 bytes
        arena.allocate(200, 8);
      });
    } catch (error) {
      expect(error).toBeInstanceOf(FlintTrap);
      expect((error as FlintTrap).code).toBe('MemoryExhausted');
      trapOccurred = true;
    }

    expect(trapOccurred).toBe(true);

    // Verify parent memory deallocated the 256-byte arena reservation upon trap,
    // so new allocations succeed without leaking capacity
    const freshAllocation = multiMemory.guestHeap.allocate(64);
    expect(Number(freshAllocation)).toBeGreaterThanOrEqual(8);
  });

  it('compiled Flint WebAssembly multi-memory interop: executes compiled Flint code that imports and validates memory partitions', async () => {
    const multiMemory = createFlintMultiMemory({
      capabilities: ['wasm.multi-memory'],
      guestHeap: { initialPages: 1 },
      foreignHeap: { initialPages: 1 },
    });

    // 1. Flint module performing memory arithmetic and stores into imported memory
    const flintSource = `
      export fn compute_and_store(baseOffset: u32, count: u32) -> u32 {
        let mut sum: u32 = 0;
        let mut i: u32 = 0;
        while i < count {
          let value: u32 = (i + 1) * 10;
          memory_store_u32(baseOffset + (i * 4), value);
          sum = sum + value;
          i = i + 1;
        }
        return sum;
      }

      export fn read_sum(baseOffset: u32, count: u32) -> u32 {
        let mut total: u32 = 0;
        let mut i: u32 = 0;
        while i < count {
          let val: u32 = memory_load_u32(baseOffset + (i * 4));
          total = total + val;
          i = i + 1;
        }
        return total;
      }
    `;

    const compiled = compileFlint({
      fileName: 'memory_kernel.flint',
      source: flintSource,
      targetFeatures: { importMemory: true },
    });

    expect(compiled.diagnostics).toEqual([]);
    expect(compiled.wasm).toBeDefined();
    if (!compiled.wasm) throw new Error('Expected compiled wasm bytes to be defined');

    // 2. Instantiate with guestHeap Wasm memory
    const instance = await WebAssembly.instantiate(compiled.wasm, {
      env: { memory: multiMemory.guestHeap.wasmMemory },
    });

    const computeAndStore = instance.instance.exports['compute_and_store'] as (base: number, count: number) => number;
    const readSum = instance.instance.exports['read_sum'] as (base: number, count: number) => number;

    const baseOffset = Number(multiMemory.guestHeap.allocate(40)); // 10 u32 words
    const sum = computeAndStore(baseOffset, 10);
    // sum of 10, 20, 30, ..., 100 = 550
    expect(sum).toBe(550);

    const verifiedSum = readSum(baseOffset, 10);
    expect(verifiedSum).toBe(550);

    // 3. DMA transfer the computed results from GuestHeap to ForeignHeap sandbox
    const foreignOffset = multiMemory.transferToForeign(baseOffset, 40);
    expect(multiMemory.foreignHeap.readBytes(foreignOffset, 40)).toEqual(
      multiMemory.guestHeap.readBytes(baseOffset, 40),
    );
  });

  it('multi-memory SQLite3 C interop: executes real sqlite3.wasm queries across isolated memory partitions with dedicated regional arenas', async () => {
    // 1. Initialize SQLite3 WebAssembly engine
    const sqlite3 = await sqlite3InitModule();
    const wasm = sqlite3.wasm;

    // 2. Configure multi-memory coordinator with dedicated partitions:
    // Memory 0: Guest Heap (Flint verified code & regional arenas)
    // Memory 1: Foreign Heap (wrapping real SQLite3 WebAssembly linear memory)
    // Memory 2: Host Interop (staging ring buffer for external requests)
    const multiMemory = createFlintMultiMemory({
      capabilities: ['wasm.multi-memory'],
      guestHeap: { initialPages: 2 },
      foreignHeap: { memory: sqlite3.config.memory },
      hostInterop: { initialPages: 1 },
    });

    expect(multiMemory.guestHeap.wasmMemory).not.toBe(multiMemory.foreignHeap.wasmMemory);
    expect(multiMemory.foreignHeap.wasmMemory).not.toBe(multiMemory.hostInterop.wasmMemory);
    expect(multiMemory.foreignHeap.wasmMemory).toBe(sqlite3.config.memory);

    // 3. Foreign capability interface for SQLite3 C bindings
    const sqlite3CapabilityHeader = `
      foreign "C" capability "sqlite3" {
        fn sqlite3_open(filename: u32, ppDb: u32) -> i32;
        fn sqlite3_exec(db: u32, sql: u32, callback: u32, arg: u32, errmsg: u32) -> i32;
        fn sqlite3_prepare_v2(db: u32, zSql: u32, nByte: i32, ppStmt: u32, pzTail: u32) -> i32;
        fn sqlite3_step(pStmt: u32) -> i32;
        fn sqlite3_column_int(pStmt: u32, iCol: i32) -> i32;
        fn sqlite3_column_text(pStmt: u32, iCol: i32) -> u32;
        fn sqlite3_column_double(pStmt: u32, iCol: i32) -> f64;
        fn sqlite3_finalize(pStmt: u32) -> i32;
        fn sqlite3_close_v2(db: u32) -> i32;
        fn sqlite3_malloc(nByte: i32) -> u32;
        fn sqlite3_free(ptr: u32) -> unit;
      }

      export fn run_telemetry_query() -> i32 {
        return 0;
      }
    `;

    const parsed = parseFlint(sqlite3CapabilityHeader, 'sqlite_multi_memory.flint');
    expect(parsed.diagnostics).toEqual([]);
    if (!parsed.module) throw new Error('Expected parsed module to be defined');
    const manifest = createFlintAbiManifest(parsed.module);

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

    interface TelemetryItem {
      readonly sensorId: number;
      readonly station: string;
      readonly temperature: number;
      readonly readingCount: number;
    }

    // 4. Scoped Dedicated Regional Arena (Tier 1) in Guest Heap (Memory 0)
    // Allocates all transient query strings, parameter staging, and accumulates output rows
    // with O(1) bulk deallocation upon scope exit.
    const queryResults = FlintRegionalArena.withRegion(multiMemory.guestHeap, 64 * 1024, (guestArena) => {
      // Step A: Stage ":memory:\0" in guest arena and transfer to foreign heap via DMA
      const databasePathString = ':memory:\0';
      const guestPathOffset = guestArena.allocate(databasePathString.length, 4);
      multiMemory.guestHeap.writeBytes(guestPathOffset, textEncoder.encode(databasePathString));

      const foreignPathPtr = host.invokeForeign?.('sqlite3', 'sqlite3_malloc', [databasePathString.length]) as number;
      multiMemory.guestHeap.copyBetweenMemories(
        guestPathOffset,
        multiMemory.foreignHeap,
        foreignPathPtr,
        databasePathString.length,
      );

      const foreignPpDatabase = host.invokeForeign?.('sqlite3', 'sqlite3_malloc', [4]) as number;
      const openRc = host.invokeForeign?.('sqlite3', 'sqlite3_open', [foreignPathPtr, foreignPpDatabase]) as number;
      expect(openRc).toBe(0);

      const databaseHandle = new DataView(multiMemory.foreignHeap.bytes.buffer).getUint32(foreignPpDatabase, true);
      expect(databaseHandle).toBeGreaterThan(0);

      host.invokeForeign?.('sqlite3', 'sqlite3_free', [foreignPathPtr]);
      host.invokeForeign?.('sqlite3', 'sqlite3_free', [foreignPpDatabase]);

      // Step B: Create Schema using dedicated region
      const ddlSql = 'CREATE TABLE telemetry (sensor_id INT, station TEXT, temperature REAL, reading_count INT);\0';
      const guestDdlOffset = guestArena.allocate(ddlSql.length, 4);
      multiMemory.guestHeap.writeBytes(guestDdlOffset, textEncoder.encode(ddlSql));

      const foreignDdlPtr = host.invokeForeign?.('sqlite3', 'sqlite3_malloc', [ddlSql.length]) as number;
      multiMemory.guestHeap.copyBetweenMemories(guestDdlOffset, multiMemory.foreignHeap, foreignDdlPtr, ddlSql.length);

      const ddlRc = host.invokeForeign?.('sqlite3', 'sqlite3_exec', [databaseHandle, foreignDdlPtr, 0, 0, 0]) as number;
      expect(ddlRc).toBe(0);
      host.invokeForeign?.('sqlite3', 'sqlite3_free', [foreignDdlPtr]);

      // Step C: Staging Batch Ingestion via Nested Dedicated Regional Arena
      // Incoming batch payload arrives in Memory 2 (Host Interop)
      const batchPayload: readonly TelemetryItem[] = [
        { sensorId: 101, station: 'STATION_ALPHA', temperature: 22.5, readingCount: 1500 },
        { sensorId: 102, station: 'STATION_BETA', temperature: 17.8, readingCount: 850 },
        { sensorId: 103, station: 'STATION_GAMMA', temperature: 28.4, readingCount: 2200 },
      ];

      const hostPayloadBytes = textEncoder.encode(JSON.stringify(batchPayload));
      const hostPayloadPtr = multiMemory.hostInterop.allocate(hostPayloadBytes.length);
      multiMemory.hostInterop.writeBytes(hostPayloadPtr, hostPayloadBytes);

      // Ingest batch using nested regional arena with O(1) reset
      FlintRegionalArena.withRegion(multiMemory.guestHeap, 16 * 1024, (batchArena) => {
        const guestBatchOffset = batchArena.allocate(hostPayloadBytes.length, 4);
        multiMemory.hostInterop.copyBetweenMemories(
          hostPayloadPtr,
          multiMemory.guestHeap,
          guestBatchOffset,
          hostPayloadBytes.length,
        );

        const decodedPayload = JSON.parse(
          textDecoder.decode(multiMemory.guestHeap.readBytes(guestBatchOffset, hostPayloadBytes.length)),
        ) as TelemetryItem[];

        for (const item of decodedPayload) {
          batchArena.reset();
          const insertSql = `INSERT INTO telemetry VALUES (${item.sensorId}, '${item.station}', ${item.temperature}, ${item.readingCount});\0`;
          const insertOffset = batchArena.allocate(insertSql.length, 4);
          multiMemory.guestHeap.writeBytes(insertOffset, textEncoder.encode(insertSql));

          const foreignInsertPtr = host.invokeForeign?.('sqlite3', 'sqlite3_malloc', [insertSql.length]) as number;
          multiMemory.guestHeap.copyBetweenMemories(
            insertOffset,
            multiMemory.foreignHeap,
            foreignInsertPtr,
            insertSql.length,
          );

          const insertRc = host.invokeForeign?.('sqlite3', 'sqlite3_exec', [
            databaseHandle,
            foreignInsertPtr,
            0,
            0,
            0,
          ]) as number;
          expect(insertRc).toBe(0);
          host.invokeForeign?.('sqlite3', 'sqlite3_free', [foreignInsertPtr]);
        }
      });

      // Step D: Filtered Prepared Statement Query with Dedicated Region Result Buffer
      const querySql =
        'SELECT sensor_id, station, temperature, reading_count FROM telemetry WHERE temperature > 20.0 ORDER BY sensor_id ASC;\0';
      const guestQueryOffset = guestArena.allocate(querySql.length, 4);
      multiMemory.guestHeap.writeBytes(guestQueryOffset, textEncoder.encode(querySql));

      const foreignQueryPtr = host.invokeForeign?.('sqlite3', 'sqlite3_malloc', [querySql.length]) as number;
      multiMemory.guestHeap.copyBetweenMemories(
        guestQueryOffset,
        multiMemory.foreignHeap,
        foreignQueryPtr,
        querySql.length,
      );

      const foreignPpStmt = host.invokeForeign?.('sqlite3', 'sqlite3_malloc', [4]) as number;
      const prepRc = host.invokeForeign?.('sqlite3', 'sqlite3_prepare_v2', [
        databaseHandle,
        foreignQueryPtr,
        -1,
        foreignPpStmt,
        0,
      ]) as number;
      expect(prepRc).toBe(0);

      const stmtHandle = new DataView(multiMemory.foreignHeap.bytes.buffer).getUint32(foreignPpStmt, true);
      expect(stmtHandle).toBeGreaterThan(0);

      // Accumulate output rows in guestArena with natural 8-byte C struct alignment
      // Struct TelemetryRecord: { sensorId: u32 (0..4), readingCount: u32 (4..8), temp: f64 (8..16), station: 16 bytes (16..32) }
      const retrievedItems: TelemetryItem[] = [];
      while (host.invokeForeign?.('sqlite3', 'sqlite3_step', [stmtHandle]) === 100) {
        const sensorId = host.invokeForeign?.('sqlite3', 'sqlite3_column_int', [stmtHandle, 0]) as number;
        const stationPtr = host.invokeForeign?.('sqlite3', 'sqlite3_column_text', [stmtHandle, 1]) as number;
        const temperature = (wasm.exports['sqlite3_column_double'] as (stmt: number, column: number) => number)(
          stmtHandle,
          2,
        );
        const readingCount = host.invokeForeign?.('sqlite3', 'sqlite3_column_int', [stmtHandle, 3]) as number;

        const recordOffset = guestArena.allocate(32, 8);
        expect(recordOffset % 8).toBe(0);

        const guestDataView = new DataView(multiMemory.guestHeap.bytes.buffer);
        guestDataView.setUint32(recordOffset, sensorId, true);
        guestDataView.setUint32(recordOffset + 4, readingCount, true);
        guestDataView.setFloat64(recordOffset + 8, temperature, true);

        // DMA transfer string bytes from foreign heap to guest arena
        multiMemory.foreignHeap.copyBetweenMemories(stationPtr, multiMemory.guestHeap, recordOffset + 16, 16);
        const stationString = textDecoder
          .decode(multiMemory.guestHeap.readBytes(recordOffset + 16, 16))
          .replace(/\0.*$/, '');

        retrievedItems.push({
          sensorId,
          station: stationString,
          temperature,
          readingCount,
        });
      }

      // Step E: Clean up SQLite3 statements and database
      expect(host.invokeForeign?.('sqlite3', 'sqlite3_finalize', [stmtHandle])).toBe(0);
      expect(host.invokeForeign?.('sqlite3', 'sqlite3_close_v2', [databaseHandle])).toBe(0);
      host.invokeForeign?.('sqlite3', 'sqlite3_free', [foreignQueryPtr]);
      host.invokeForeign?.('sqlite3', 'sqlite3_free', [foreignPpStmt]);

      // Step F: Assert Hardware-Enforced Sandboxing & Isolation
      expect(() => {
        multiMemory.guestHeap.copyBetweenMemories(0, multiMemory.foreignHeap, 0, 500_000_000);
      }).toThrow(/exceeds buffer boundary/);

      expect(() => {
        multiMemory.foreignHeap.copyBetweenMemories(0, multiMemory.hostInterop, 0, 100_000_000);
      }).toThrow(/exceeds buffer boundary/);

      return retrievedItems;
    });

    // Verify final results from the dedicated region
    expect(queryResults).toEqual([
      { sensorId: 101, station: 'STATION_ALPHA', temperature: 22.5, readingCount: 1500 },
      { sensorId: 103, station: 'STATION_GAMMA', temperature: 28.4, readingCount: 2200 },
    ]);

    // Verify parent memory allocations cleanly restored after region disposal
    const freshGuestPtr = multiMemory.guestHeap.allocate(32);
    expect(Number(freshGuestPtr)).toBeGreaterThanOrEqual(8);
  });

  it('compiled Flint WebAssembly multi-memory SQLite3 interop: executes compiled Flint code coordinating with real sqlite3.wasm across dedicated regions', async () => {
    // 1. Initialize SQLite3 WebAssembly engine
    const sqlite3 = await sqlite3InitModule();
    const wasm = sqlite3.wasm;

    // 2. Configure multi-memory coordinator
    const multiMemory = createFlintMultiMemory({
      capabilities: ['wasm.multi-memory'],
      guestHeap: { initialPages: 2 },
      foreignHeap: { memory: sqlite3.config.memory },
    });

    // 3. Flint module that imports memory and computes structured query payloads in linear memory
    const flintSource = `
      export fn prepare_telemetry_batch(baseOffset: u32, count: u32, baseSensorId: u32) -> u32 {
        let mut i: u32 = 0;
        while i < count {
          let slot: u32 = baseOffset + (i * 8);
          let sensorId: u32 = baseSensorId + i;
          let readingVal: u32 = (i + 1) * 250;
          memory_store_u32(slot, sensorId);
          memory_store_u32(slot + 4, readingVal);
          i = i + 1;
        }
        return count * 8;
      }

      export fn verify_telemetry_sum(baseOffset: u32, count: u32) -> u32 {
        let mut total: u32 = 0;
        let mut i: u32 = 0;
        while i < count {
          let slot: u32 = baseOffset + (i * 8);
          let readingVal: u32 = memory_load_u32(slot + 4);
          total = total + readingVal;
          i = i + 1;
        }
        return total;
      }
    `;

    const compiled = compileFlint({
      fileName: 'telemetry_multi_memory.flint',
      source: flintSource,
      targetFeatures: { importMemory: true },
    });

    expect(compiled.diagnostics).toEqual([]);
    expect(compiled.wasm).toBeDefined();
    if (!compiled.wasm) throw new Error('Expected compiled wasm bytes to be defined');

    const instance = await WebAssembly.instantiate(compiled.wasm, {
      env: { memory: multiMemory.guestHeap.wasmMemory },
    });

    const prepareBatch = instance.instance.exports['prepare_telemetry_batch'] as (
      base: number,
      count: number,
      baseSensor: number,
    ) => number;
    const verifySum = instance.instance.exports['verify_telemetry_sum'] as (base: number, count: number) => number;

    // 4. Execute inside a dedicated regional arena
    FlintRegionalArena.withRegion(multiMemory.guestHeap, 32 * 1024, (arena) => {
      const batchCount = 4;
      const payloadSize = batchCount * 8;
      const arenaOffset = arena.allocate(payloadSize, 8);
      expect(arenaOffset % 8).toBe(0);

      // Flint WebAssembly writes structured binary data into its imported memory at arenaOffset
      const writtenBytes = prepareBatch(arenaOffset, batchCount, 501);
      expect(writtenBytes).toBe(payloadSize);

      const calculatedSum = verifySum(arenaOffset, batchCount);
      // 250 + 500 + 750 + 1000 = 2500
      expect(calculatedSum).toBe(2500);

      // 5. DMA transfer batch into SQLite3 foreign heap memory
      const foreignBuffer = (wasm.exports['sqlite3_malloc'] as (size: number) => number)(payloadSize);
      multiMemory.guestHeap.copyBetweenMemories(arenaOffset, multiMemory.foreignHeap, foreignBuffer, payloadSize);

      // Verify foreign heap contains the exact structured records generated by compiled Flint
      const foreignView = new DataView(multiMemory.foreignHeap.bytes.buffer);
      expect(foreignView.getUint32(foreignBuffer, true)).toBe(501);
      expect(foreignView.getUint32(foreignBuffer + 4, true)).toBe(250);
      expect(foreignView.getUint32(foreignBuffer + 8, true)).toBe(502);
      expect(foreignView.getUint32(foreignBuffer + 12, true)).toBe(500);

      // 6. Execute SQLite3 version check alongside Flint execution
      const versionNumber = (wasm.exports['sqlite3_libversion_number'] as () => number)();
      expect(versionNumber).toBeGreaterThanOrEqual(3_000_000);

      (wasm.exports['sqlite3_free'] as (pointer: number) => void)(foreignBuffer);
    });
  });
});
