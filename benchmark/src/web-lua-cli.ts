import { runWebLuaBenchmark } from "./web-lua.ts";

const report = await runWebLuaBenchmark();
process.stdout.write(
  JSON.stringify(
    {
      ...report,
      cases: report.cases.map((entry) => ({
        ...entry,
        averageMs:
          entry.samplesMs.reduce((sum, sample) => sum + sample, 0) /
          entry.samplesMs.length,
      })),
    },
    null,
    2,
  ) + "\n",
);
