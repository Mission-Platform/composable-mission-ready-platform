/**
 * Profile definitions and resolution for @mission-platform/mcp-developer.
 *
 * Profiles allow MCP clients to scope down the advertised tool catalog to only
 * the tools needed for the task at hand, reducing token overhead in the context window.
 */

export type McpProfileName = 'full' | 'minimal' | 'core' | 'frontend' | 'coding' | 'lsp' | 'security' | 'git' | 'flint';

export interface McpProfileOptions {
  readonly profile?: string;
  readonly profiles?: readonly string[];
  readonly tools?: readonly string[];
}

/**
 * Tools included in each predefined profile.
 */
export const PROFILE_TOOLS: Record<Exclude<McpProfileName, 'full'>, readonly string[]> = {
  core: [
    'review_changes',
    'list_components',
    'get_component_usage',
    'security_scan_secrets',
    'lsp_get_diagnostics',
    'git_status',
    'git_changed_files',
    'git_diff',
    'get_guide',
    'repo_affected_packages',
  ],
  minimal: [
    'review_changes',
    'list_components',
    'get_component_usage',
    'security_scan_secrets',
    'lsp_get_diagnostics',
    'git_status',
    'git_changed_files',
    'git_diff',
    'get_guide',
    'repo_affected_packages',
  ],
  frontend: [
    'list_components',
    'get_component_usage',
    'get_tokens',
    'scaffold',
    'scaffold_component',
    'scaffold_composable',
    'scaffold_package',
    'scaffold_app',
    'scaffold_worker',
    'scaffold_crate',
    'scaffold_store',
    'scaffold_util',
    'test_accessibility',
    'i18n',
    'list_locales',
    'locale_coverage',
    'add_locale',
    'remove_locale',
    'update_translation',
    'list_stories',
    'get_guide',
    'read_doc',
    'list_docs',
    'repo_affected_packages',
    'repo_prime_dependencies',
  ],
  coding: [
    // LSP navigation and intelligence
    'lsp_capabilities',
    'lsp_status',
    'lsp_start',
    'lsp_restart',
    'lsp_shutdown',
    'lsp_detect_servers',
    'lsp_list_workspace_folders',
    'lsp_add_workspace_folder',
    'lsp_get_server_capabilities',
    'lsp_get_editing_context',
    'lsp_list_symbols',
    'lsp_find_symbol',
    'lsp_inspect_symbol',
    'lsp_go_to_definition',
    'lsp_get_symbol_documentation',
    'lsp_get_symbol_source',
    'lsp_get_document_highlights',
    'lsp_find_references',
    'lsp_find_callers',
    'lsp_find_implementations',
    'lsp_type_hierarchy',
    'lsp_get_cross_repo_references',
    'lsp_preview_edit',
    'lsp_simulate_chain',
    'lsp_apply_edit',
    'lsp_replace_symbol_body',
    'lsp_safe_delete_symbol',
    'lsp_rename',
    'lsp_suggest_fixes',
    'lsp_format_document',
    'lsp_format_range',
    'lsp_execute_command',
    'lsp_get_tests_for_file',
    'lsp_run_build',
    'lsp_run_tests',
    'lsp_debug_context',
    'lsp_review_structure',
    'lsp_open_document',
    'lsp_get_diagnostics',
    'lsp_config_view',
    'lsp_config_add',
    'lsp_config_edit',
    // Workspace task runners & review
    'review_changes',
    'run_test_file',
    'turbo_run',
    'repo_affected_packages',
    'repo_prime_dependencies',
  ],
  lsp: [
    'lsp_capabilities',
    'lsp_status',
    'lsp_start',
    'lsp_restart',
    'lsp_shutdown',
    'lsp_detect_servers',
    'lsp_list_workspace_folders',
    'lsp_add_workspace_folder',
    'lsp_get_server_capabilities',
    'lsp_get_editing_context',
    'lsp_list_symbols',
    'lsp_find_symbol',
    'lsp_inspect_symbol',
    'lsp_go_to_definition',
    'lsp_get_symbol_documentation',
    'lsp_get_symbol_source',
    'lsp_get_document_highlights',
    'lsp_find_references',
    'lsp_find_callers',
    'lsp_find_implementations',
    'lsp_type_hierarchy',
    'lsp_get_cross_repo_references',
    'lsp_preview_edit',
    'lsp_simulate_chain',
    'lsp_apply_edit',
    'lsp_replace_symbol_body',
    'lsp_safe_delete_symbol',
    'lsp_rename',
    'lsp_suggest_fixes',
    'lsp_format_document',
    'lsp_format_range',
    'lsp_execute_command',
    'lsp_get_tests_for_file',
    'lsp_run_build',
    'lsp_run_tests',
    'lsp_debug_context',
    'lsp_review_structure',
    'lsp_open_document',
    'lsp_get_diagnostics',
    'lsp_config_view',
    'lsp_config_add',
    'lsp_config_edit',
    'review_changes',
    'run_test_file',
    'turbo_run',
    'repo_affected_packages',
    'repo_prime_dependencies',
  ],
  security: [
    'security_scan_secrets',
    'security_analyze_code',
    'security_audit_dependencies',
    'security_audit_supply_chain',
    'security_collect_compliance_evidence',
    'security_audit_compliance',
    'review_changes',
  ],
  git: [
    'git_status',
    'git_changed_files',
    'git_diff',
    'git_log',
    'git_show',
    'git_branches',
    'git_grep',
    'git_blame',
    'git_ls_files',
    'git_tags',
    'git_remotes',
    'git_metadata',
    'git_commit_plan',
    'git_commit_apply',
  ],
  flint: [
    'flint_analyze_source',
    'flint_analyze_workspace',
    'flint_inspect_manifest',
    'flint_inspect_sonir',
    'flint_verify_artifact',
    'flint_run_trace',
  ],
};

const KNOWN_PROFILES = new Set<string>([
  'full',
  'minimal',
  'core',
  'frontend',
  'coding',
  'lsp',
  'security',
  'git',
  'flint',
  '*',
]);

/**
 * Validate requested profile names against known catalog.
 */
function validateRequestedProfiles(requestedProfiles: ReadonlySet<string>): void {
  for (const profile of requestedProfiles) {
    if (!KNOWN_PROFILES.has(profile)) {
      throw new Error(`Unknown MCP profile: "${profile}". Valid profiles are: ${[...KNOWN_PROFILES].join(', ')}.`);
    }
  }
}

/**
 * Extract normalized profile names from comma-separated string or array.
 */
function extractRequestedProfiles(options: McpProfileOptions): Set<string> {
  const requested = new Set<string>();
  const sources = [
    ...(options.profile ? options.profile.split(',') : []),
    ...(options.profiles ? options.profiles.flatMap((p) => p.split(',')) : []),
  ];
  for (const source of sources) {
    const trimmed = source.trim().toLowerCase();
    if (trimmed) requested.add(trimmed);
  }
  return requested;
}

/**
 * Collect tool names allowed by the requested profile names.
 */
function collectAllowedTools(requestedProfiles: ReadonlySet<string>): Set<string> {
  validateRequestedProfiles(requestedProfiles);
  const allowed = new Set<string>();
  for (const profile of requestedProfiles) {
    const tools = PROFILE_TOOLS[profile as Exclude<McpProfileName, 'full'>];
    if (tools) {
      for (const tool of tools) {
        allowed.add(tool);
      }
    }
  }
  return allowed;
}

/**
 * Check whether profile options explicitly specify a custom tool list.
 */
function extractExplicitTools(options: McpProfileOptions): Set<string> | undefined {
  if (!options.tools || options.tools.length === 0) {
    return undefined;
  }
  return new Set(options.tools);
}

/**
 * Determine if the requested profiles imply that all tools should be registered.
 */
function shouldRegisterAllTools(profiles: ReadonlySet<string>): boolean {
  if (profiles.size === 0) return true;
  return profiles.has('full') || profiles.has('*');
}

/**
 * Resolves a comma-separated or array profile configuration into an active tool set filter.
 * Returns undefined when all tools should be registered ('full' or omitted).
 */
export function resolveToolFilter(options: McpProfileOptions = {}): Set<string> | undefined {
  const explicit = extractExplicitTools(options);
  if (explicit) {
    return explicit;
  }

  const requestedProfiles = extractRequestedProfiles(options);
  if (shouldRegisterAllTools(requestedProfiles)) {
    return undefined;
  }

  const allowedTools = collectAllowedTools(requestedProfiles);
  return allowedTools;
}
