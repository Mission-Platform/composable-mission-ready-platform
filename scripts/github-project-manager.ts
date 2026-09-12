/**
 * GitHub Projects v2 and Milestone Management Utility.
 * Manages "The Board" (UI Component Platform Improvements) and
 * "Forge Web Script Architecture & Modernization" project boards,
 * custom fields (Track, Priority, Complexity, Status), and issue associations.
 *
 * Usage:
 *   node --experimental-strip-types scripts/github-project-manager.ts plan [components|fws|all]
 *   node --experimental-strip-types scripts/github-project-manager.ts status [components|fws|all]
 *   node --experimental-strip-types scripts/github-project-manager.ts setup [components|fws]
 *   node --experimental-strip-types scripts/github-project-manager.ts board [boardName]
 */
import { execFile as execFileCallback } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);

export interface ProjectIssueMapping {
  readonly issueNumber: number;
  readonly title: string;
  readonly track: string;
  readonly priority: 'P0 - Critical' | 'P1 - High' | 'P2 - Medium' | 'P3 - Low';
  readonly complexity: 'S' | 'M' | 'L' | 'XL';
  readonly initialStatus: 'Backlog' | 'Ready' | 'In Progress' | 'In Review' | 'Done' | 'Todo' | 'Review';
  readonly pullRequest?: number;
}

export interface ProjectConfig {
  readonly title: string;
  readonly projectTitle: string;
  readonly description: string;
  readonly organization: string;
  readonly repository: string;
  readonly milestoneTitle: string;
  readonly milestoneNumber: number;
  readonly planPath: string;
  readonly fields: {
    readonly status: readonly string[];
    readonly priority: readonly string[];
    readonly track: readonly string[];
    readonly complexity: readonly string[];
  };
  readonly issues: readonly ProjectIssueMapping[];
}

export const FWS_PROJECT_CONFIG: ProjectConfig = {
  title: 'Forge Web Script Architecture & Modernization',
  projectTitle: 'Forge Web Script Architecture & Modernization',
  description:
    'End-to-end modernization of the Forge Web Script (FWS) compiler, Sea-of-Nodes IR (SonIR 2.0), standard library, linear regex engine, and capability security runtime.',
  organization: 'Mission-Platform',
  repository: 'Mission-Platform/composable-mission-ready-platform',
  milestoneTitle: 'FWS Architecture & Runtime Enhancements',
  milestoneNumber: 1,
  planPath: 'docs/fws-project-plan.json',
  fields: {
    status: ['Todo', 'In Progress', 'Review', 'Done'],
    priority: ['P0 - Critical', 'P1 - High', 'P2 - Medium', 'P3 - Low'],
    track: [
      'Compiler Core',
      'Security & Bounds',
      'SonIR & Optimization',
      'Memory & Runtime',
      'Wasm & SIMD',
      'Standard Library',
      'Tooling & LSP',
      'Documentation',
    ],
    complexity: ['S', 'M', 'L', 'XL'],
  },
  issues: [
    {
      issueNumber: 41,
      title: 'feat(fws-types): Structural Type Algebra & Generic Monomorphization',
      track: 'Compiler Core',
      priority: 'P0 - Critical',
      complexity: 'XL',
      initialStatus: 'Todo',
    },
    {
      issueNumber: 42,
      title: 'feat(fws-lsp): Incremental LSP Architecture, Query Caching & Request Cancellation',
      track: 'Tooling & LSP',
      priority: 'P0 - Critical',
      complexity: 'L',
      initialStatus: 'Todo',
    },
    {
      issueNumber: 43,
      title: 'feat(fws-stdlib): Swiss Table Hash Map & Set with SIMD Acceleration',
      track: 'Standard Library',
      priority: 'P1 - High',
      complexity: 'L',
      initialStatus: 'In Progress',
    },
    {
      issueNumber: 44,
      title: 'feat(fws-wasm): WebAssembly v128 SIMD Vectorization & Bulk Memory Operations',
      track: 'Wasm & SIMD',
      priority: 'P1 - High',
      complexity: 'L',
      initialStatus: 'Todo',
    },
    {
      issueNumber: 45,
      title: 'feat(fws-sonir): Formal Sea-of-Nodes Schema, Memory SSA, GVN & SCCP',
      track: 'SonIR & Optimization',
      priority: 'P2 - Medium',
      complexity: 'XL',
      initialStatus: 'In Progress',
    },
    {
      issueNumber: 46,
      title: 'feat(fws-interop): Native Web IDL Parser & Zero-Copy Host Binding Generator',
      track: 'Compiler Core',
      priority: 'P2 - Medium',
      complexity: 'L',
      initialStatus: 'Todo',
    },
    {
      issueNumber: 47,
      title: 'docs(fws): Formal EBNF Language Specification, SonIR Manual & Interactive Docs',
      track: 'Documentation',
      priority: 'P3 - Low',
      complexity: 'M',
      initialStatus: 'In Progress',
    },
    {
      issueNumber: 48,
      title: 'feat(fws-regex): Linear-Time PikeVM/DFA Regex Engine & Polyhedral Bounds Analysis',
      track: 'Security & Bounds',
      priority: 'P0 - Critical',
      complexity: 'L',
      initialStatus: 'In Progress',
    },
    {
      issueNumber: 49,
      title: 'feat(fws-runtime): Multi-Memory Segregation & O(1) TLSF Dynamic Allocator',
      track: 'Memory & Runtime',
      priority: 'P1 - High',
      complexity: 'XL',
      initialStatus: 'Todo',
    },
    {
      issueNumber: 50,
      title: 'feat(fws-concurrency): JSPI Async Stack-Switching & Wasm Threads with Send/Sync',
      track: 'Memory & Runtime',
      priority: 'P2 - Medium',
      complexity: 'XL',
      initialStatus: 'Todo',
    },
  ],
};

export const UI_COMPONENTS_PROJECT_CONFIG: ProjectConfig = {
  title: 'The Board',
  projectTitle: 'UI Component Platform Improvements & Polish',
  description:
    'End-to-end accessibility compliance, interaction polish, and missing feature parity across Mission Platform Forge UI components.',
  organization: 'Mission-Platform',
  repository: 'Mission-Platform/composable-mission-ready-platform',
  milestoneTitle: 'UI Component Platform Improvements & Polish',
  milestoneNumber: 2,
  planPath: 'docs/ui-components-project-plan.json',
  fields: {
    status: ['Backlog', 'Ready', 'In Progress', 'In Review', 'Done'],
    priority: ['P0 - Critical', 'P1 - High', 'P2 - Medium', 'P3 - Low'],
    track: [
      'Accessibility',
      'Interaction & Polish',
      'Data Display Parity',
      'Overlay & Float',
      'Forms & Validation',
      'Selection & Combobox',
      'Content & Editor',
    ],
    complexity: ['S', 'M', 'L', 'XL'],
  },
  issues: [
    {
      issueNumber: 51,
      title: 'fix(table): Sortable header keyboard accessibility and sort activation',
      track: 'Accessibility',
      priority: 'P0 - Critical',
      complexity: 'S',
      initialStatus: 'In Review',
      pullRequest: 63,
    },
    {
      issueNumber: 52,
      title: 'fix(tabs): Correct ARIA tab semantics by removing role="tab" from close button',
      track: 'Accessibility',
      priority: 'P0 - Critical',
      complexity: 'S',
      initialStatus: 'In Review',
      pullRequest: 63,
    },
    {
      issueNumber: 53,
      title: 'fix(tree-view): Implement full WAI-ARIA keyboard navigation (ArrowUp, ArrowDown, Home, End)',
      track: 'Accessibility',
      priority: 'P0 - Critical',
      complexity: 'M',
      initialStatus: 'In Review',
      pullRequest: 63,
    },
    {
      issueNumber: 54,
      title: 'fix(split-pane): Fix onKeyDown prop casing and add pointer drag resizing',
      track: 'Interaction & Polish',
      priority: 'P1 - High',
      complexity: 'M',
      initialStatus: 'In Review',
      pullRequest: 63,
    },
    {
      issueNumber: 55,
      title: 'feat(table): Scoped slot cell rendering parity with ForgeVirtualTable',
      track: 'Data Display Parity',
      priority: 'P1 - High',
      complexity: 'M',
      initialStatus: 'In Review',
      pullRequest: 63,
    },
    {
      issueNumber: 56,
      title: 'feat(multiselect): Support tag truncation and collapsed badge (+N more)',
      track: 'Interaction & Polish',
      priority: 'P1 - High',
      complexity: 'M',
      initialStatus: 'In Review',
      pullRequest: 63,
    },
    {
      issueNumber: 57,
      title: 'feat(float): Add fallback positioning when CSS Anchor Positioning is unsupported',
      track: 'Overlay & Float',
      priority: 'P2 - Medium',
      complexity: 'L',
      initialStatus: 'Ready',
    },
    {
      issueNumber: 58,
      title: 'feat(forms): Context-driven ForgeForm component with schema validation',
      track: 'Forms & Validation',
      priority: 'P2 - Medium',
      complexity: 'XL',
      initialStatus: 'Ready',
    },
    {
      issueNumber: 59,
      title: 'feat(select): Async search query callback and loading state for ForgeSelect / ForgeCombobox',
      track: 'Selection & Combobox',
      priority: 'P2 - Medium',
      complexity: 'L',
      initialStatus: 'Ready',
    },
    {
      issueNumber: 60,
      title: 'feat(table): Row selection, row expansion, and column pinning in ForgeTable',
      track: 'Data Display Parity',
      priority: 'P2 - Medium',
      complexity: 'XL',
      initialStatus: 'Ready',
    },
    {
      issueNumber: 61,
      title: 'refactor(float): Unify ForgeDialog and ForgeModal into consolidated overlay primitive',
      track: 'Overlay & Float',
      priority: 'P2 - Medium',
      complexity: 'L',
      initialStatus: 'Ready',
    },
    {
      issueNumber: 62,
      title: 'refactor(content): Modernize ForgeWysiwygEditor to eliminate deprecated document.execCommand',
      track: 'Content & Editor',
      priority: 'P2 - Medium',
      complexity: 'XL',
      initialStatus: 'Ready',
    },
  ],
};

export const PROJECT_CONFIG = UI_COMPONENTS_PROJECT_CONFIG;

export const BOARD_STAGES = ['Backlog', 'Ready', 'In Progress', 'In Review', 'Done'] as const;
export type BoardStage = (typeof BOARD_STAGES)[number];

export const CURRENT_BOARD_STATE: Record<number, BoardStage> = {
  // Milestone 1 (FWS)
  41: 'Ready',
  42: 'Ready',
  43: 'In Progress',
  44: 'Ready',
  45: 'In Progress',
  46: 'Backlog',
  47: 'In Review',
  48: 'In Review',
  49: 'Backlog',
  50: 'Backlog',

  // Milestone 2 (The Board / UI Components)
  51: 'In Review',
  52: 'In Review',
  53: 'In Review',
  54: 'In Review',
  55: 'In Review',
  56: 'In Review',
  57: 'Ready',
  58: 'Ready',
  59: 'Ready',
  60: 'Ready',
  61: 'Ready',
  62: 'Ready',
};

async function runGh(args: readonly string[]): Promise<string> {
  const { stdout } = await execFile('gh', [...args], {
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout.trim();
}

export async function checkProjectAuthScopes(): Promise<{
  readonly hasProjectScope: boolean;
  readonly scopes: readonly string[];
}> {
  try {
    const { stdout, stderr } = await execFile('gh', ['auth', 'status']);
    const combined = `${stdout}\n${stderr}`;
    const scopeMatch = /Token scopes:.*?\n/i.exec(combined);
    const scopeLine = scopeMatch ? scopeMatch[0] : '';
    const scopes = scopeLine
      .replace(/Token scopes:\s*/i, '')
      .split(',')
      .map((s) => s.trim().replaceAll("'", ''))
      .filter((s) => s.length > 0);

    const hasProjectScope = scopes.includes('project') || scopes.includes('read:project');
    return { hasProjectScope, scopes };
  } catch (error) {
    const errorString = String(error);
    const hasProjectScope = errorString.includes('project');
    return { hasProjectScope, scopes: [] };
  }
}

export async function exportProjectPlan(which: 'components' | 'fws' | 'all' = 'all'): Promise<void> {
  const configs: ProjectConfig[] = [];
  if (which === 'all' || which === 'components') {
    configs.push(UI_COMPONENTS_PROJECT_CONFIG);
  }
  if (which === 'all' || which === 'fws') {
    configs.push(FWS_PROJECT_CONFIG);
  }

  for (const config of configs) {
    const targetPath = resolve(process.cwd(), config.planPath);
    const planJson = JSON.stringify(config, undefined, 2);
    await writeFile(targetPath, planJson, 'utf-8');
    console.log(`[github-project-manager] Project plan exported to: ${targetPath}`);
  }
}

export async function showProjectStatus(which: 'components' | 'fws' | 'all' = 'all'): Promise<void> {
  const configs: ProjectConfig[] = [];
  if (which === 'all' || which === 'components') {
    configs.push(UI_COMPONENTS_PROJECT_CONFIG);
  }
  if (which === 'all' || which === 'fws') {
    configs.push(FWS_PROJECT_CONFIG);
  }

  for (const config of configs) {
    console.log(`\n================================================================================`);
    console.log(`=== Project: ${config.title} (${config.projectTitle}) ===`);
    console.log(`Milestone: ${config.milestoneTitle} (#${config.milestoneNumber})`);
    console.log(`Repository: ${config.repository}`);
    console.log(`================================================================================\n`);

    console.log('Issue | Priority      | Complexity | Track               | Board Stage | Title');
    console.log(
      '------+---------------+------------+---------------------+-------------+----------------------------------------------------',
    );

    for (const item of config.issues) {
      const issueStr = `#${item.issueNumber}`.padEnd(5);
      const priorityStr = item.priority.padEnd(13);
      const complexityStr = item.complexity.padEnd(10);
      const trackStr = item.track.padEnd(19);
      const stage = CURRENT_BOARD_STATE[item.issueNumber] ?? item.initialStatus;
      const stageStr = stage.padEnd(11);
      const prSuffix = item.pullRequest ? ` [PR #${item.pullRequest}]` : '';
      console.log(`${issueStr} | ${priorityStr} | ${complexityStr} | ${trackStr} | ${stageStr} | ${item.title}${prSuffix}`);
    }

    console.log('\nSummary by Priority:');
    const p0 = config.issues.filter((i) => i.priority.startsWith('P0')).length;
    const p1 = config.issues.filter((i) => i.priority.startsWith('P1')).length;
    const p2 = config.issues.filter((i) => i.priority.startsWith('P2')).length;
    const p3 = config.issues.filter((i) => i.priority.startsWith('P3')).length;
    console.log(`- P0 (Critical): ${p0} issues`);
    console.log(`- P1 (High):     ${p1} issues`);
    console.log(`- P2 (Medium):   ${p2} issues`);
    console.log(`- P3 (Low):      ${p3} issues`);

    console.log('\nSummary by Board Stage:');
    for (const stage of BOARD_STAGES) {
      const count = config.issues.filter((i) => (CURRENT_BOARD_STATE[i.issueNumber] ?? i.initialStatus) === stage).length;
      console.log(`- ${stage.padEnd(11)}: ${count} issues`);
    }
  }
}

export async function syncBoard(boardName = 'The Board'): Promise<void> {
  console.log(`\n=== Synchronizing Items on Project '${boardName}' ===`);
  const auth = await checkProjectAuthScopes();

  const config =
    boardName.toLowerCase().includes('forge') || boardName.toLowerCase().includes('fws')
      ? FWS_PROJECT_CONFIG
      : UI_COMPONENTS_PROJECT_CONFIG;

  if (!auth.hasProjectScope) {
    console.warn(`\n================================================================================`);
    console.warn(`[NOTICE] GitHub Project Permissions Required to Update '${boardName}'`);
    console.warn(`================================================================================`);
    console.warn(`The currently authenticated GitHub credentials do not include the 'project' scope.`);
    console.warn(`To grant project permissions via GitHub CLI, execute in your terminal:\n`);
    console.warn(`  gh auth refresh -s project,read:project\n`);
    console.warn(`Or export a personal access token with 'project' scope:`);
    console.warn(`  export GITHUB_TOKEN="ghp_..."\n`);
    console.warn(`Once granted, re-run this command to immediately apply all column transitions on '${boardName}'.`);
    console.warn(`================================================================================\n`);
  }

  console.log(`Current Planned Board Column Transitions:`);
  console.log('--------------------------------------------------------------------------------');
  for (const item of config.issues) {
    const stage = CURRENT_BOARD_STATE[item.issueNumber] ?? 'Backlog';
    const prStr = item.pullRequest ? ` -> PR #${item.pullRequest}` : '';
    console.log(`* #${item.issueNumber} -> [${stage.padEnd(11)}] : ${item.title}${prStr}`);
  }
  console.log('--------------------------------------------------------------------------------\n');

  if (!auth.hasProjectScope) {
    return;
  }

  console.log(`Locating project '${boardName}'...`);
  try {
    let projectNumber: number | undefined;
    let projectOwner = config.organization;

    for (const owner of [config.organization, '@me']) {
      try {
        const listRaw = await runGh(['project', 'list', '--owner', owner, '--format', 'json']);
        const list = JSON.parse(listRaw);
        const match = list.projects?.find((p: { title: string }) => p.title.toLowerCase() === boardName.toLowerCase());
        if (match) {
          projectNumber = match.number;
          projectOwner = owner;
          break;
        }
      } catch {
        // ignore owner search error
      }
    }

    if (!projectNumber) {
      console.warn(`Could not find project '${boardName}' under ${config.organization} or @me.`);
      return;
    }

    console.log(`Found '${boardName}' (#${projectNumber}) under ${projectOwner}. Updating item statuses...`);
    for (const item of config.issues) {
      const stage = CURRENT_BOARD_STATE[item.issueNumber] ?? 'Backlog';
      const issueUrl = `https://github.com/${config.repository}/issues/${item.issueNumber}`;

      try {
        await runGh(['project', 'item-add', String(projectNumber), '--owner', projectOwner, '--url', issueUrl]);
      } catch {
        // Item may already exist in project
      }

      try {
        await runGh([
          'project',
          'item-edit',
          String(projectNumber),
          '--owner',
          projectOwner,
          '--url',
          issueUrl,
          '--field',
          'Status',
          '--value',
          stage,
        ]);
        console.log(`Updated #${item.issueNumber} to column '${stage}'`);
      } catch (error) {
        console.warn(`Could not set column for #${item.issueNumber}: ${String(error)}`);
      }
    }
  } catch (error) {
    console.error(`Error syncing board: ${String(error)}`);
  }
}

export async function setupProject(target: 'components' | 'fws' = 'components'): Promise<void> {
  const config = target === 'fws' ? FWS_PROJECT_CONFIG : UI_COMPONENTS_PROJECT_CONFIG;
  console.log(`[github-project-manager] Initiating project setup for '${config.title}'...`);

  await exportProjectPlan(target);

  const auth = await checkProjectAuthScopes();
  console.log(`[github-project-manager] Detected OAuth scopes: [${auth.scopes.join(', ')}]`);

  if (!auth.hasProjectScope) {
    console.warn(`\n================================================================================`);
    console.warn(`[NOTICE] GitHub Project Permissions Required`);
    console.warn(`================================================================================`);
    console.warn(`The currently authenticated GitHub credentials do not include the 'project' scope.`);
    console.warn(`GitHub Projects v2 API requires the 'project' or 'read:project' OAuth permission.\n`);
    console.warn(`To grant project permissions via GitHub CLI, run:`);
    console.warn(`  gh auth refresh -s project,read:project\n`);
    console.warn(`Or set a personal access token with project permissions in your environment:`);
    console.warn(`  export GITHUB_TOKEN="ghp_..."\n`);
    console.warn(`All issues and Milestone ${config.milestoneNumber} are active in the repository.`);
    console.warn(`The project board structure has been persisted to '${config.planPath}'.`);
    console.warn(`================================================================================\n`);
    await showProjectStatus(target);
    return;
  }

  console.log(`[github-project-manager] Project scopes confirmed. Querying GitHub GraphQL API...`);
  try {
    const ownerQuery = `
      query {
        organization(login: "${config.organization}") {
          id
        }
        viewer {
          id
          login
        }
      }
    `;
    const ownerResponseRaw = await runGh(['api', 'graphql', '-f', `query=${ownerQuery}`]);
    const ownerResponse = JSON.parse(ownerResponseRaw);
    const ownerId = ownerResponse.data?.organization?.id ?? ownerResponse.data?.viewer?.id;

    if (!ownerId) {
      throw new Error(`Could not determine owner ID for ${config.organization}`);
    }

    const createProjectMutation = `
      mutation {
        createProjectV2(input: {
          ownerId: "${ownerId}",
          title: "${config.title}"
        }) {
          projectV2 {
            id
            url
            number
          }
        }
      }
    `;

    const createRespRaw = await runGh(['api', 'graphql', '-f', `query=${createProjectMutation}`]);
    const createResp = JSON.parse(createRespRaw);
    const project = createResp.data?.createProjectV2?.projectV2;

    if (project) {
      console.log(`[github-project-manager] Successfully created GitHub Project v2!`);
      console.log(`Project URL: ${project.url}`);
      console.log(`Project ID:  ${project.id}`);
    }
  } catch (error) {
    console.error(`[github-project-manager] Failed to provision ProjectV2 via GraphQL: ${String(error)}`);
    console.warn(`Falling back to local project plan tracking.`);
    await showProjectStatus(target);
  }
}

async function main(): Promise<void> {
  const command = process.argv[2] ?? 'status';
  const target = (process.argv[3] ?? 'all') as 'components' | 'fws' | 'all';

  switch (command) {
    case 'plan': {
      await exportProjectPlan(target);
      break;
    }
    case 'status': {
      await showProjectStatus(target);
      break;
    }
    case 'setup': {
      const proj = (process.argv[3] ?? 'components') as 'components' | 'fws';
      await setupProject(proj);
      break;
    }
    case 'sync-board':
    case 'board': {
      const boardName = process.argv[3] ?? 'The Board';
      await syncBoard(boardName);
      break;
    }
    default: {
      console.log(
        'Usage: node --experimental-strip-types scripts/github-project-manager.ts [plan|status|setup|board]',
      );
      break;
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  try {
    await main();
  } catch (error) {
    console.error(`[github-project-manager] Fatal error:`, error);
    process.exit(1);
  }
}
