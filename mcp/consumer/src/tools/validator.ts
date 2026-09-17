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

const ALL_CONDITIONS = Object.values(FRAMEWORK_CONDITIONS);

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

export function validateConsumerSetup(options: {
  framework: ConsumerFramework;
  viteConfig?: string;
  tsconfig?: string;
  packageJson?: string;
}): ValidationReport {
  const { framework, viteConfig, tsconfig, packageJson } = options;
  const checks: ValidationCheck[] = [];
  const expectedCondition = FRAMEWORK_CONDITIONS[framework];

  // 1. Vite Configuration Checks
  if (viteConfig !== undefined) {
    const hasCondition =
      viteConfig.includes(expectedCondition) ||
      viteConfig.includes(`frameworkResolveConditions("${framework}")`) ||
      viteConfig.includes(`frameworkResolveConditions('${framework}')`) ||
      viteConfig.includes(`framework: "${framework}"`) ||
      viteConfig.includes(`framework: '${framework}'`);

    if (hasCondition) {
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

    // Check for conflicting framework conditions
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

  // 2. TypeScript Configuration Checks
  if (tsconfig !== undefined) {
    const hasCustomConditions =
      tsconfig.includes(expectedCondition) ||
      tsconfig.includes(`framework-${framework}`) ||
      (framework === "web-components" &&
        tsconfig.includes("framework-web-component"));

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

    // Check moduleResolution
    if (
      tsconfig.includes('"moduleResolution": "node"') ||
      tsconfig.includes("'moduleResolution': 'node'")
    ) {
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

  // 3. Package Dependencies Checks
  if (packageJson !== undefined) {
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(packageJson) as Record<string, unknown>;
    } catch {
      checks.push({
        name: "package.json syntax",
        category: "dependencies",
        status: "fail",
        message: "package.json is not valid JSON.",
      });
    }

    const dependencies = {
      ...(parsed.dependencies as Record<string, string> | undefined),
      ...(parsed.devDependencies as Record<string, string> | undefined),
    };

    const rules = FRAMEWORK_DEPENDENCY_REQUIREMENTS[framework];

    for (const req of rules.required) {
      if (dependencies[req]) {
        checks.push({
          name: `Required dependency (${req})`,
          category: "dependencies",
          status: "pass",
          message: `Required framework runtime "${req}" is installed.`,
        });
      } else {
        checks.push({
          name: `Required dependency (${req})`,
          category: "dependencies",
          status: "fail",
          message: `Required framework dependency "${req}" is missing from package.json.`,
          suggestion: `Run: pnpm add ${req}`,
        });
      }
    }

    for (const rec of rules.recommended) {
      if (dependencies[rec]) {
        checks.push({
          name: `Recommended package (${rec})`,
          category: "dependencies",
          status: "pass",
          message: `Package "${rec}" is installed.`,
        });
      } else {
        checks.push({
          name: `Recommended package (${rec})`,
          category: "dependencies",
          status: "warn",
          message: `Recommended package "${rec}" is not in package.json.`,
          suggestion: `Consider adding: pnpm add ${rec}`,
        });
      }
    }
  }

  // If no files provided at all
  if (
    viteConfig === undefined &&
    tsconfig === undefined &&
    packageJson === undefined
  ) {
    checks.push({
      name: "No configuration files supplied",
      category: "general",
      status: "warn",
      message: "Provide viteConfig, tsconfig, or packageJson text to validate.",
      suggestion:
        "Pass file contents in viteConfig, tsconfig, and/or packageJson parameters.",
    });
  }

  const failedCount = checks.filter((c) => c.status === "fail").length;
  const warningCount = checks.filter((c) => c.status === "warn").length;
  const passedCount = checks.filter((c) => c.status === "pass").length;

  let overallStatus: "valid" | "warnings" | "errors" = "valid";
  if (failedCount > 0) overallStatus = "errors";
  else if (warningCount > 0) overallStatus = "warnings";

  let summary = "";
  if (overallStatus === "valid") {
    summary = `Setup verification for ${framework} passed (${passedCount} checks passed). Export conditions and dependencies are correctly configured.`;
  } else if (overallStatus === "warnings") {
    summary = `Setup verification for ${framework} passed with ${warningCount} warning(s). Recommended packages or settings can be improved.`;
  } else {
    summary = `Setup verification for ${framework} failed with ${failedCount} error(s). Missing export conditions or required peer dependencies will prevent components from resolving.`;
  }

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
