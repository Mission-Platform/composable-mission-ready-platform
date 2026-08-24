import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { createRunId } from "./report.ts";
import {
  renderScannerMarkdown,
  runScannerBenchmark,
} from "./scanner-benchmark.ts";
import { createScannerCases, type ScannerCase } from "./scanner-fixtures.ts";

export interface ScannerCliOptions {
  readonly warmupIterations?: number;
  readonly sampleIterations?: number;
  readonly output?: string;
  readonly caseId?: string;
  readonly smoke?: boolean;
}

const SMOKE_CASE_ID = "qr-640x480-full";

function numericArgument(value: string, name: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0)
    throw new RangeError(`${name} must be a non-negative integer.`);
  return parsed;
}

export function parseArguments(
  commandLineArguments: readonly string[],
): ScannerCliOptions {
  const result: {
    warmupIterations?: number;
    sampleIterations?: number;
    output?: string;
    caseId?: string;
    smoke?: boolean;
  } = {};
  for (let index = 0; index < commandLineArguments.length; index += 1) {
    const argument = commandLineArguments[index];
    switch (argument) {
      case "--warmup": {
        result.warmupIterations = numericArgument(
          commandLineArguments[++index]!,
          "--warmup",
        );
        break;
      }
      case "--samples": {
        result.sampleIterations = numericArgument(
          commandLineArguments[++index]!,
          "--samples",
        );
        break;
      }
      case "--output": {
        result.output = commandLineArguments[++index];
        break;
      }
      case "--case": {
        result.caseId = commandLineArguments[++index];
        if (!result.caseId)
          throw new Error("--case requires a scanner case id.");
        break;
      }
      case "--smoke": {
        result.smoke = true;
        break;
      }
      default: {
        throw new Error(`Unknown argument: ${argument}`);
      }
    }
  }
  if (result.sampleIterations === 0)
    throw new RangeError("--samples must be a positive integer.");
  return result;
}

export function selectScannerCases(
  options: Pick<ScannerCliOptions, "caseId" | "smoke">,
): readonly ScannerCase[] {
  const cases = createScannerCases();
  const selectedId =
    options.caseId ?? (options.smoke ? SMOKE_CASE_ID : undefined);
  if (selectedId === undefined) return cases;
  const selected = cases.find(({ id }) => id === selectedId);
  if (selected === undefined)
    throw new Error(`Unknown scanner case: ${selectedId}`);
  return [selected];
}

export async function runScannerCli(
  commandLineArguments: readonly string[] = process.argv.slice(2),
): Promise<string> {
  const options = parseArguments(commandLineArguments);
  const { caseId, smoke, ...benchmarkOptions } = options;
  const report = await runScannerBenchmark({
    ...benchmarkOptions,
    ...(caseId !== undefined || smoke !== undefined
      ? { cases: selectScannerCases({ caseId, smoke }) }
      : {}),
    ...(smoke ? { warmupIterations: 0, sampleIterations: 1 } : {}),
  });
  const output =
    options.output ?? path.resolve("benchmark/results/scanner", createRunId());
  await mkdir(output, { recursive: true });
  await Promise.all([
    writeFile(
      path.join(output, "report.json"),
      `${JSON.stringify(report, undefined, 2)}\n`,
      "utf8",
    ),
    writeFile(
      path.join(output, "report.md"),
      renderScannerMarkdown(report),
      "utf8",
    ),
  ]);
  process.stdout.write(`Scanner benchmark report written to ${output}\n`);
  process.stdout.write(
    `Comparison: adapted=${report.comparison.adapted}, raw-session=${report.comparison.rawSession}\n`,
  );
  return output;
}

if (import.meta.url === `file://${process.argv[1]}`) await runScannerCli();
