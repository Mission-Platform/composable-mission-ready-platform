/**
 * Consumer configuration validator for external projects integrating Mission Platform packages.
 *
 * Inspects consumer Vite configurations, TypeScript tsconfig files, and package manifests
 * to verify correct export conditions, compiler options, and peer dependencies.
 */

export type ConsumerFramework =
  "vue" | "react" | "solid" | "svelte" | "web-components";

export type CheckStatus = "pass" | "warn" | "fail";

export interface ValidationCheck {
  readonly name: string;
  readonly category: "vite" | "typescript" | "dependencies" | "general";
  readonly status: CheckStatus;
  readonly message: string;
  readonly suggestion?: string;
}

export interface ValidationReport {
  readonly framework: ConsumerFramework;
  readonly status: "valid" | "warnings" | "errors";
  readonly passedChecks: number;
  readonly failedChecks: number;
  readonly warningChecks: number;
  readonly checks: readonly ValidationCheck[];
  readonly summary: string;
}

const FRAMEWORK_CONDITIONS: Record<ConsumerFramework, string> = {
  vue: "mp:vue",
  react: "mp:react",
  solid: "mp:solid",
  svelte: "mp:svelte",
  "web-components": "mp:web-component",
};

const FRAMEWORK_DEPENDENCY_REQUIREMENTS: Record<
  ConsumerFramework,
  { required: readonly string[]; recommended: readonly string[] }
> = {
  vue: {
    required: ["vue"],
    recommended: [
      "@vitejs/plugin-vue",
      "@mission-platform/components",
      "@mission-platform/tokens",
    ],
  },
  react: {
    required: ["react", "react-dom"],
    recommended: [
      "@vitejs/plugin-react",
      "@mission-platform/components",
      "@mission-platform/tokens",
    ],
  },
  solid: {
    required: ["solid-js"],
    recommended: [
      "vite-plugin-solid",
      "@mission-platform/components",
      "@mission-platform/tokens",
    ],
  },
  svelte: {
    required: ["svelte"],
    recommended: [
      "@sveltejs/vite-plugin-svelte",
      "@mission-platform/components",
      "@mission-platform/tokens",
    ],
  },
  "web-components": {
    required: [],
    recommended: [
      "lit",
      "@mission-platform/components",
      "@mission-platform/tokens",
    ],
  },
};

/**
 * Strip single-line and multi-line comments from JavaScript/TypeScript source.
 */
function stripJsComments(source: string): string {
  return source
    .replaceAll(/\/\/[^\n]*$/gm, "")
    .replaceAll(/\/\*[\s\S]*?\*\//g, "");
}

/**
 * Extract conditions and customConditions array entries from stripped Vite configuration.
 */
function extractConfiguredConditions(viteConfig: string): Set<string> {
  const stripped = stripJsComments(viteConfig);
  const conditions = new Set<string>();
  const conditionArrayRegex =
    /\b(?:conditions|customConditions)\s*:\s*\[([^\]]*)\]/g;
  let match: RegExpExecArray | null = conditionArrayRegex.exec(stripped);
  while (match !== null) {
    const arrayContent = match[1] || "";
    const stringLiterals = arrayContent.match(/['"]([^'"]+)['"]/g) ?? [];
    for (const lit of stringLiterals) {
      conditions.add(lit.slice(1, -1));
    }
    match = conditionArrayRegex.exec(stripped);
  }
  return conditions;
}

/**
 * Check whether a framework helper call is present in Vite configuration.
 */
function hasFrameworkHelper(
  stripped: string,
  framework: ConsumerFramework,
): boolean {
  const helperRegex = new RegExp(
    String.raw`\b(?:frameworkResolveConditions|forgeResolveConditions)\s*\(\s*['"]${framework}['"]\s*\)`,
  );
  return helperRegex.test(stripped);
}

/**
 * Check for conflicting framework conditions in vite.config.ts.
 */
function checkConflictingViteConditions(
  configuredConditions: ReadonlySet<string>,
  framework: ConsumerFramework,
  expectedCondition: string,
  checks: ValidationCheck[],
  stripped?: string,
): void {
  for (const [otherFw, otherCond] of Object.entries(FRAMEWORK_CONDITIONS)) {
    const hasHelperConflict = stripped
      ? hasFrameworkHelper(stripped, otherFw as ConsumerFramework)
      : false;
    if (
      otherFw !== framework &&
      (configuredConditions.has(otherCond) || hasHelperConflict)
    ) {
      checks.push({
        name: `Conflicting condition (${otherCond})`,
        category: "vite",
        status: "fail",
        message: `Found conflicting export condition "${otherCond}" when targeting "${framework}".`,
        suggestion: `Remove "${otherCond}" from vite.config.ts resolve.conditions and keep only "${expectedCondition}".`,
      });
    }
  }
}

/**
 * Validate Vite configuration for framework resolve conditions.
 */
function validateViteConfig(
  viteConfig: string,
  framework: ConsumerFramework,
  expectedCondition: string,
  checks: ValidationCheck[],
): void {
  const stripped = stripJsComments(viteConfig);
  const configuredConditions = extractConfiguredConditions(viteConfig);
  const hasExpectedCondition =
    configuredConditions.has(expectedCondition) ||
    hasFrameworkHelper(stripped, framework);

  if (hasExpectedCondition) {
    checks.push({
      name: "Vite resolve condition",
      category: "vite",
      status: "pass",
      message: `Vite configuration specifies correct condition "${expectedCondition}".`,
    });
  } else {
    checks.push({
      name: "Vite resolve condition",
      category: "vite",
      status: "fail",
      message: `Vite configuration is missing resolve condition "${expectedCondition}".`,
      suggestion: `Update vite.config.ts:\nresolve: {\n  conditions: ['${expectedCondition}', 'import', 'module', 'browser', 'default'],\n}`,
    });
  }

  checkConflictingViteConditions(
    configuredConditions,
    framework,
    expectedCondition,
    checks,
    stripped,
  );
}

/**
 * Check tsconfig.json for legacy module resolution.
 */
function checkTsconfigModuleResolution(
  tsconfig: string,
  checks: ValidationCheck[],
): void {
  if (/['"]moduleResolution['"]\s*:\s*['"]node['"]/.test(tsconfig)) {
    checks.push({
      name: "TypeScript moduleResolution",
      category: "typescript",
      status: "warn",
      message:
        'Legacy "node" module resolution does not support package exports conditions.',
      suggestion:
        'Set "compilerOptions": { "moduleResolution": "bundler" } in tsconfig.json.',
    });
  }
}

/**
 * Validate TypeScript configuration for customConditions and moduleResolution.
 */
function validateTsconfig(
  tsconfig: string,
  framework: ConsumerFramework,
  expectedCondition: string,
  checks: ValidationCheck[],
): void {
  const customConditionMatchers = [
    expectedCondition,
    `framework-${framework}`,
    ...(framework === "web-components" ? ["framework-web-component"] : []),
  ];
  const hasCustomConditions = customConditionMatchers.some((matcher) =>
    tsconfig.includes(matcher),
  );

  if (hasCustomConditions) {
    checks.push({
      name: "TypeScript customConditions",
      category: "typescript",
      status: "pass",
      message: `tsconfig.json specifies correct custom condition "${expectedCondition}".`,
    });
  } else {
    checks.push({
      name: "TypeScript customConditions",
      category: "typescript",
      status: "fail",
      message: `tsconfig.json is missing compilerOptions.customConditions with "${expectedCondition}".`,
      suggestion: `Add to tsconfig.json:\n"compilerOptions": {\n  "customConditions": ["${expectedCondition}"]\n}`,
    });
  }

  checkTsconfigModuleResolution(tsconfig, checks);
}

/**
 * Check required framework runtime dependencies.
 */
function checkRequiredDependencies(
  dependencies: Record<string, string>,
  required: readonly string[],
  checks: ValidationCheck[],
): void {
  for (const pkg of required) {
    if (dependencies[pkg]) {
      checks.push({
        name: `Required dependency (${pkg})`,
        category: "dependencies",
        status: "pass",
        message: `Required framework runtime "${pkg}" is installed.`,
      });
    } else {
      checks.push({
        name: `Required dependency (${pkg})`,
        category: "dependencies",
        status: "fail",
        message: `Required framework dependency "${pkg}" is missing from package.json.`,
        suggestion: `Run: pnpm add ${pkg}`,
      });
    }
  }
}

/**
 * Check recommended framework packages.
 */
function checkRecommendedDependencies(
  dependencies: Record<string, string>,
  recommended: readonly string[],
  checks: ValidationCheck[],
): void {
  for (const pkg of recommended) {
    if (dependencies[pkg]) {
      checks.push({
        name: `Recommended package (${pkg})`,
        category: "dependencies",
        status: "pass",
        message: `Package "${pkg}" is installed.`,
      });
    } else {
      checks.push({
        name: `Recommended package (${pkg})`,
        category: "dependencies",
        status: "warn",
        message: `Recommended package "${pkg}" is not in package.json.`,
        suggestion: `Consider adding: pnpm add ${pkg}`,
      });
    }
  }
}

/**
 * Validate package.json required and recommended dependencies for the target framework.
 */
function validatePackageDependencies(
  packageJson: string,
  framework: ConsumerFramework,
  checks: ValidationCheck[],
): void {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(packageJson) as Record<string, unknown>;
  } catch {
    checks.push({
      name: "package.json syntax",
      category: "dependencies",
      status: "fail",
      message: "package.json is not valid JSON.",
    });
    return;
  }

  const dependencies = {
    ...(parsed.dependencies as Record<string, string> | undefined),
    ...(parsed.devDependencies as Record<string, string> | undefined),
  };

  const rules = FRAMEWORK_DEPENDENCY_REQUIREMENTS[framework];
  checkRequiredDependencies(dependencies, rules.required, checks);
  checkRecommendedDependencies(dependencies, rules.recommended, checks);
}

/**
 * Check if no configuration files were provided to validate.
 */
function checkNoFilesSupplied(
  options: { viteConfig?: string; tsconfig?: string; packageJson?: string },
  checks: ValidationCheck[],
): void {
  if (!options.viteConfig && !options.tsconfig && !options.packageJson) {
    checks.push({
      name: "No configuration files supplied",
      category: "general",
      status: "warn",
      message: "Provide viteConfig, tsconfig, or packageJson text to validate.",
      suggestion:
        "Pass file contents in viteConfig, tsconfig, and/or packageJson parameters.",
    });
  }
}

/**
 * Compute overall status enum from failure and warning counts.
 */
function computeOverallStatus(
  failedCount: number,
  warningCount: number,
): "valid" | "warnings" | "errors" {
  if (failedCount > 0) return "errors";
  if (warningCount > 0) return "warnings";
  return "valid";
}

/**
 * Build human-readable summary text for validation results.
 */
function buildValidationSummary(
  framework: ConsumerFramework,
  status: "valid" | "warnings" | "errors",
  passedCount: number,
  warningCount: number,
  failedCount: number,
): string {
  if (status === "valid") {
    return `Setup verification for ${framework} passed (${passedCount} checks passed). Export conditions and dependencies are correctly configured.`;
  }
  if (status === "warnings") {
    return `Setup verification for ${framework} passed with ${warningCount} warning(s). Recommended packages or settings can be improved.`;
  }
  return `Setup verification for ${framework} failed with ${failedCount} error(s). Missing export conditions or required peer dependencies will prevent components from resolving.`;
}

/**
 * Validate consumer application configuration files (Vite, TypeScript, package.json)
 * to verify correct export conditions and peer dependencies.
 */
export function validateConsumerSetup(options: {
  framework: ConsumerFramework;
  viteConfig?: string;
  tsconfig?: string;
  packageJson?: string;
}): ValidationReport {
  const { framework, viteConfig, tsconfig, packageJson } = options;
  const checks: ValidationCheck[] = [];
  const expectedCondition = FRAMEWORK_CONDITIONS[framework];

  if (viteConfig !== undefined) {
    validateViteConfig(viteConfig, framework, expectedCondition, checks);
  }

  if (tsconfig !== undefined) {
    validateTsconfig(tsconfig, framework, expectedCondition, checks);
  }

  if (packageJson !== undefined) {
    validatePackageDependencies(packageJson, framework, checks);
  }

  checkNoFilesSupplied(options, checks);

  const failedCount = checks.filter((c) => c.status === "fail").length;
  const warningCount = checks.filter((c) => c.status === "warn").length;
  const passedCount = checks.filter((c) => c.status === "pass").length;

  const overallStatus = computeOverallStatus(failedCount, warningCount);

  const summary = buildValidationSummary(
    framework,
    overallStatus,
    passedCount,
    warningCount,
    failedCount,
  );

  return {
    framework,
    status: overallStatus,
    passedChecks: passedCount,
    failedChecks: failedCount,
    warningChecks: warningCount,
    checks,
    summary,
  };
}
