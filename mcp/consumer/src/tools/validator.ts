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
 * Validate Vite configuration for framework resolve conditions.
 */
function validateViteConfig(
  viteConfig: string,
  framework: ConsumerFramework,
  expectedCondition: string,
  checks: ValidationCheck[],
): void {
  const matchers = [
    expectedCondition,
    `frameworkResolveConditions("${framework}")`,
    `frameworkResolveConditions('${framework}')`,
    `framework: "${framework}"`,
    `framework: '${framework}'`,
  ];
  const hasCondition = matchers.some((matcher) => viteConfig.includes(matcher));

  checks.push({
    name: "Vite resolve condition",
    category: "vite",
    status: hasCondition ? "pass" : "fail",
    message: hasCondition
      ? `Vite configuration specifies correct condition "${expectedCondition}".`
      : `Vite configuration is missing resolve condition "${expectedCondition}".`,
    suggestion: hasCondition
      ? undefined
      : `Update vite.config.ts:\nresolve: {\n  conditions: ['${expectedCondition}', 'import', 'module', 'browser', 'default'],\n}`,
  });

  for (const [otherFw, otherCond] of Object.entries(FRAMEWORK_CONDITIONS)) {
    if (otherFw !== framework && viteConfig.includes(otherCond)) {
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

  checks.push({
    name: "TypeScript customConditions",
    category: "typescript",
    status: hasCustomConditions ? "pass" : "fail",
    message: hasCustomConditions
      ? `tsconfig.json specifies correct custom condition "${expectedCondition}".`
      : `tsconfig.json is missing compilerOptions.customConditions with "${expectedCondition}".`,
    suggestion: hasCustomConditions
      ? undefined
      : `Add to tsconfig.json:\n"compilerOptions": {\n  "customConditions": ["${expectedCondition}"]\n}`,
  });

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
 * Check a list of package dependencies against requirement rules.
 */
function checkDependencyRules(
  dependencies: Record<string, string>,
  packageNames: readonly string[],
  level: "required" | "recommended",
  checks: ValidationCheck[],
): void {
  const isRequired = level === "required";
  for (const pkg of packageNames) {
    const isPresent = Boolean(dependencies[pkg]);
    checks.push({
      name: `${isRequired ? "Required dependency" : "Recommended package"} (${pkg})`,
      category: "dependencies",
      status: isPresent ? "pass" : isRequired ? "fail" : "warn",
      message: isPresent
        ? `${isRequired ? "Required framework runtime" : "Package"} "${pkg}" is installed.`
        : `${isRequired ? "Required framework dependency" : "Recommended package"} "${pkg}" is ${isRequired ? "missing from" : "not in"} package.json.`,
      suggestion: isPresent
        ? undefined
        : `${isRequired ? "Run:" : "Consider adding:"} pnpm add ${pkg}`,
    });
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
  checkDependencyRules(dependencies, rules.required, "required", checks);
  checkDependencyRules(dependencies, rules.recommended, "recommended", checks);
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

  const overallStatus: "valid" | "warnings" | "errors" =
    failedCount > 0 ? "errors" : warningCount > 0 ? "warnings" : "valid";

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
