/**
 * Stable capability names for the Mission Platform developer LSP contract.
 *
 * The contract is intentionally independent of an MCP provider namespace. The
 * implementation can therefore grow behind these names without coupling
 * clients to a provider-specific namespace.
 */

export type LspCapabilityStatus = 'planned' | 'available';

export interface LspCapability {
  readonly name: string;
  readonly status: LspCapabilityStatus;
  readonly mutatesWorkspace: boolean;
}

export interface LspCapabilityReport {
  readonly contractVersion: 1;
  readonly provider: 'mission-platform-developer';
  readonly status: 'planned' | 'partial' | 'available';
  readonly capabilities: readonly LspCapability[];
}

export const LSP_CAPABILITIES: readonly LspCapability[] = [
  {
    name: 'lsp_config_view',
    status: 'available',
    mutatesWorkspace: false,
  },
  {
    name: 'lsp_config_add',
    status: 'available',
    mutatesWorkspace: true,
  },
  {
    name: 'lsp_config_edit',
    status: 'available',
    mutatesWorkspace: true,
  },
  {
    name: 'lsp_start',
    status: 'available',
    mutatesWorkspace: false,
  },
  {
    name: 'lsp_restart',
    status: 'available',
    mutatesWorkspace: false,
  },
  {
    name: 'lsp_shutdown',
    status: 'available',
    mutatesWorkspace: false,
  },
  {
    name: 'lsp_status',
    status: 'available',
    mutatesWorkspace: false,
  },
  {
    name: 'lsp_detect_servers',
    status: 'available',
    mutatesWorkspace: false,
  },
  {
    name: 'lsp_list_workspace_folders',
    status: 'available',
    mutatesWorkspace: false,
  },
  {
    name: 'lsp_add_workspace_folder',
    status: 'available',
    mutatesWorkspace: false,
  },
  {
    name: 'lsp_open_document',
    status: 'available',
    mutatesWorkspace: false,
  },
  {
    name: 'lsp_get_diagnostics',
    status: 'available',
    mutatesWorkspace: false,
  },
  {
    name: 'lsp_get_server_capabilities',
    status: 'available',
    mutatesWorkspace: false,
  },
  {
    name: 'lsp_list_symbols',
    status: 'available',
    mutatesWorkspace: false,
  },
  {
    name: 'lsp_find_symbol',
    status: 'available',
    mutatesWorkspace: false,
  },
  {
    name: 'lsp_inspect_symbol',
    status: 'available',
    mutatesWorkspace: false,
  },
  {
    name: 'lsp_go_to_definition',
    status: 'available',
    mutatesWorkspace: false,
  },
  {
    name: 'lsp_get_symbol_documentation',
    status: 'available',
    mutatesWorkspace: false,
  },
  {
    name: 'lsp_get_symbol_source',
    status: 'available',
    mutatesWorkspace: false,
  },
  {
    name: 'lsp_get_document_highlights',
    status: 'available',
    mutatesWorkspace: false,
  },
  {
    name: 'lsp_find_references',
    status: 'available',
    mutatesWorkspace: false,
  },
  {
    name: 'lsp_find_callers',
    status: 'available',
    mutatesWorkspace: false,
  },
  {
    name: 'lsp_find_implementations',
    status: 'available',
    mutatesWorkspace: false,
  },
  {
    name: 'lsp_type_hierarchy',
    status: 'available',
    mutatesWorkspace: false,
  },
  {
    name: 'lsp_get_cross_repo_references',
    status: 'available',
    mutatesWorkspace: false,
  },
  {
    name: 'lsp_preview_edit',
    status: 'available',
    mutatesWorkspace: false,
  },
  {
    name: 'lsp_simulate_chain',
    status: 'available',
    mutatesWorkspace: false,
  },
  {
    name: 'lsp_apply_edit',
    status: 'available',
    mutatesWorkspace: true,
  },
  {
    name: 'lsp_replace_symbol_body',
    status: 'available',
    mutatesWorkspace: true,
  },
  {
    name: 'lsp_safe_delete_symbol',
    status: 'available',
    mutatesWorkspace: true,
  },
  {
    name: 'lsp_rename',
    status: 'available',
    mutatesWorkspace: true,
  },
  {
    name: 'lsp_suggest_fixes',
    status: 'available',
    mutatesWorkspace: true,
  },
  {
    name: 'lsp_format_document',
    status: 'available',
    mutatesWorkspace: true,
  },
  {
    name: 'lsp_format_range',
    status: 'available',
    mutatesWorkspace: true,
  },
  {
    name: 'lsp_execute_command',
    status: 'available',
    mutatesWorkspace: true,
  },
  {
    name: 'lsp_get_editing_context',
    status: 'available',
    mutatesWorkspace: false,
  },
  {
    name: 'lsp_get_tests_for_file',
    status: 'available',
    mutatesWorkspace: false,
  },
  {
    name: 'lsp_run_build',
    status: 'available',
    mutatesWorkspace: false,
  },
  {
    name: 'lsp_run_tests',
    status: 'available',
    mutatesWorkspace: false,
  },
  {
    name: 'lsp_debug_context',
    status: 'available',
    mutatesWorkspace: false,
  },
  {
    name: 'lsp_review_structure',
    status: 'available',
    mutatesWorkspace: false,
  },
] as const;

export function getLspCapabilityReport(): LspCapabilityReport {
  return {
    contractVersion: 1,
    provider: 'mission-platform-developer',
    status: LSP_CAPABILITIES.every((capability) => capability.status === 'available')
      ? 'available'
      : LSP_CAPABILITIES.some((capability) => capability.status === 'available')
        ? 'partial'
        : 'planned',
    capabilities: LSP_CAPABILITIES,
  };
}
