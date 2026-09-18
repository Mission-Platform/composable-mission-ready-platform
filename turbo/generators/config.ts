import type { PlopTypes } from '@turbo/gen';

export interface PackageGeneratorAnswers {
  readonly name: string;
  readonly classification: 'core' | 'ui' | 'edge' | 'compiler' | 'tooling';
  readonly description: string;
  readonly additionalCatalogs?: readonly string[];
}

export default function generator(plop: PlopTypes.NodePlopAPI): void {
  plop.setGenerator('package', {
    description: 'Scaffold a new standardized package for Mission Platform',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Package name (without scope, e.g. "audit-logger"):',
        validate: (input: string) => {
          if (!input || input.trim().length === 0) {
            return 'Package name is required';
          }
          const trimmed = input.trim();
          if (/[^a-z0-9-]/.test(trimmed)) {
            return 'Package name must be lowercase alphanumeric with hyphens only';
          }
          return true;
        },
      },
      {
        type: 'list',
        name: 'classification',
        message: 'Package classification (domain directory under packages/):',
        choices: [
          { name: 'core (foundational utilities, state, primitives)', value: 'core' },
          { name: 'ui (components, tokens, styling)', value: 'ui' },
          { name: 'edge (workers, edge security, routing)', value: 'edge' },
          { name: 'compiler (Forge compiler, plugins, adapters)', value: 'compiler' },
          { name: 'tooling (configs, vite plugins, generators)', value: 'tooling' },
        ],
        default: 'core',
      },
      {
        type: 'input',
        name: 'description',
        message: 'Package description:',
        default: 'Mission Platform workspace package',
      },
      {
        type: 'checkbox',
        name: 'additionalCatalogs',
        message: 'Select additional dependency catalogs to include (optional):',
        choices: [
          { name: 'rxjs (Reactive Extensions stream utilities)', value: 'rxjs' },
          { name: 'luxon (Date and time manipulation)', value: 'luxon' },
          { name: 'd3 (D3 visualization libraries)', value: 'd3' },
          { name: 'forge-jsx (Forge JSX compiler primitives)', value: 'forge-jsx' },
        ],
      },
    ],
    actions: (rawAnswers) => {
      const answers = (rawAnswers ?? {}) as PackageGeneratorAnswers;
      const deps: string[] = [];
      const devDeps: string[] = [];

      if (answers.additionalCatalogs?.includes('rxjs')) {
        deps.push('    "rxjs": "catalog:"');
      }
      if (answers.additionalCatalogs?.includes('luxon')) {
        deps.push('    "luxon": "catalog:"');
        devDeps.push('    "@types/luxon": "catalog:",');
      }
      if (answers.additionalCatalogs?.includes('d3')) {
        deps.push('    "d3": "catalog:d3"');
        devDeps.push('    "@types/d3": "catalog:d3",');
      }
      if (answers.additionalCatalogs?.includes('forge-jsx')) {
        deps.push('    "@mission-platform/forge-jsx": "workspace:*"');
      }

      const templateData = {
        dependenciesBlock: deps.length > 0 ? deps.join(',\n') : undefined,
        devDependenciesBlock: devDeps.length > 0 ? devDeps.join('\n') : undefined,
      };

      const basePath = '{{ turbo.paths.root }}/packages/{{ classification }}/{{ dashCase name }}';

      return [
        {
          type: 'add',
          path: `${basePath}/package.json`,
          templateFile: 'templates/package/package.json.hbs',
          data: templateData,
        },
        {
          type: 'add',
          path: `${basePath}/tsconfig.json`,
          templateFile: 'templates/package/tsconfig.json.hbs',
        },
        {
          type: 'add',
          path: `${basePath}/tsconfig.build.json`,
          templateFile: 'templates/package/tsconfig.build.json.hbs',
        },
        {
          type: 'add',
          path: `${basePath}/tsconfig.node.json`,
          templateFile: 'templates/package/tsconfig.node.json.hbs',
        },
        {
          type: 'add',
          path: `${basePath}/tsconfig.test.json`,
          templateFile: 'templates/package/tsconfig.test.json.hbs',
        },
        {
          type: 'add',
          path: `${basePath}/eslint.config.js`,
          templateFile: 'templates/package/eslint.config.js.hbs',
        },
        {
          type: 'add',
          path: `${basePath}/prettier.config.js`,
          templateFile: 'templates/package/prettier.config.js.hbs',
        },
        {
          type: 'add',
          path: `${basePath}/tsdown.config.ts`,
          templateFile: 'templates/package/tsdown.config.ts.hbs',
        },
        {
          type: 'add',
          path: `${basePath}/vitest.config.ts`,
          templateFile: 'templates/package/vitest.config.ts.hbs',
        },
        {
          type: 'add',
          path: `${basePath}/src/index.ts`,
          templateFile: 'templates/package/src/index.ts.hbs',
        },
        {
          type: 'add',
          path: `${basePath}/src/index.spec.ts`,
          templateFile: 'templates/package/src/index.spec.ts.hbs',
        },
        {
          type: 'add',
          path: `${basePath}/README.md`,
          templateFile: 'templates/package/README.md.hbs',
        },
      ];
    },
  });
}
