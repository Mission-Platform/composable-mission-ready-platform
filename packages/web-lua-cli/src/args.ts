import {
  WEB_LUA_CAPABILITIES,
  type WebLuaCapability,
} from "@mission-platform/web-lua/node";

export interface WebLuaCliOptions {
  readonly execute: readonly string[];
  readonly source: string;
  readonly args: readonly string[];
  readonly cwd: string | undefined;
  readonly suite: string | undefined;
  readonly exclude: readonly string[];
  readonly capabilities: readonly WebLuaCapability[];
}

export class WebLuaCliUsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebLuaCliUsageError";
  }
}

export const WEB_LUA_CLI_USAGE = `Usage: web-lua <file.lua|-> [options]

Options:
  -e, --execute <chunk>  Execute a prelude chunk (repeatable)
  --cwd <directory>      Resolve the source relative to this directory
  --suite <name>         Select a suite (reserved for the suite runner)
  --exclude <pattern>    Exclude a suite or test (repeatable)
  --capability <name>  Allow an explicit host capability (repeatable or comma-separated)
  --capabilities <name> Alias for --capability
  -h, --help             Show this help
`;

function valueFor(
  argv: readonly string[],
  index: number,
  description: string,
  allowLeadingDash = false,
): [string, number] {
  const value = argv[index + 1];
  if (value === undefined || (!allowLeadingDash && value.startsWith("-")))
    throw new WebLuaCliUsageError(`Missing ${description}.`);
  return [value, index + 1];
}

export function parseWebLuaCliArgs(argv: readonly string[]): WebLuaCliOptions {
  const execute: string[] = [];
  let source: string | undefined;
  const arguments_: string[] = [];
  let cwd: string | undefined;
  let suite: string | undefined;
  const exclude: string[] = [];
  const capabilities: WebLuaCapability[] = [];
  let endOfOptions = false;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === undefined) continue;
    if (endOfOptions) {
      if (source === undefined) source = argument;
      else arguments_.push(argument);
      continue;
    }
    if (argument === "--") {
      endOfOptions = true;
      continue;
    }
    if (argument === "--help" || argument === "-h")
      throw new WebLuaCliUsageError(WEB_LUA_CLI_USAGE);

    const option = argument.includes("=")
      ? argument.slice(0, argument.indexOf("="))
      : argument;
    const inlineValue = argument.includes("=")
      ? argument.slice(argument.indexOf("=") + 1)
      : undefined;
    const optionValue = (description: string): [string, number] => {
      if (inlineValue === undefined) return valueFor(argv, index, description);
      if (inlineValue.length === 0)
        throw new WebLuaCliUsageError(`Missing ${description}.`);
      return [inlineValue, index];
    };
    const executeValue = (): [string, number] =>
      inlineValue === undefined
        ? valueFor(argv, index, "execute chunk", true)
        : [inlineValue, index];

    if (option === "-e" || option === "--execute") {
      const [value, nextIndex] = executeValue();
      execute.push(value);
      index = nextIndex;
      continue;
    }
    if (option === "--cwd") {
      const [value, nextIndex] = optionValue("working directory");
      cwd = value;
      index = nextIndex;
      continue;
    }
    if (option === "--suite") {
      const [value, nextIndex] = optionValue("suite name");
      suite = value;
      index = nextIndex;
      continue;
    }
    if (option === "--exclude") {
      const [value, nextIndex] = optionValue("exclusion pattern");
      exclude.push(value);
      index = nextIndex;
      continue;
    }
    if (option === "--capability" || option === "--capabilities") {
      const [value, nextIndex] = optionValue("capability name");
      for (const capability of value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)) {
        if (!(WEB_LUA_CAPABILITIES as readonly string[]).includes(capability))
          throw new WebLuaCliUsageError(`Unknown capability '${capability}'.`);
        capabilities.push(capability as WebLuaCapability);
      }
      index = nextIndex;
      continue;
    }
    if (argument === "-") {
      if (source === undefined) source = argument;
      else arguments_.push(argument);
      continue;
    }
    if (argument.startsWith("-"))
      throw new WebLuaCliUsageError(`Unknown option '${argument}'.`);
    if (source === undefined) source = argument;
    else arguments_.push(argument);
  }
  if (source === undefined)
    throw new WebLuaCliUsageError(
      "Exactly one Lua source file or - is required.",
    );
  return {
    execute,
    source,
    args: arguments_,
    cwd,
    suite,
    exclude,
    capabilities: [...new Set(capabilities)],
  };
}
