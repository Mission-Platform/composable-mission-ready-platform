# Forge Figma repository bridge

The bridge accepts a reviewed `ForgeRepositoryExportRequest` over authenticated `POST /export` and writes the bundle into one of its explicitly configured repository roots. Configure roots with the CLI's `--root <id>=<absolute-path>` option.

Each server process creates a fresh authentication token. The CLI prints the token when it starts; callers must send it as `Authorization: Bearer <token>` and send the default origin `https://www.figma.com`. The origin can be changed for an explicitly configured local integration with the `allowedOrigin` server option. Requests from other origins and requests without the token are rejected before the bundle is read or written.
