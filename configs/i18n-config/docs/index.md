# @mission-platform/i18n-config

Shared locale and extraction configuration for Mission Platform workspaces.

## Install and use

Add this package as a development dependency when configuring i18next or
translation extraction:

```bash
pnpm add --save-dev @mission-platform/i18n-config
```

Keep locale sources beside the workspace that owns them. Extraction writes
namespace bundles under the owning workspace's `locales/<locale>/` directory;
the repository-level command orchestrates all configured workspaces.

## Contribute

Run the package lint and format checks before publishing. Do not put package or
application translation content in this configuration package.
