## Environment

- **Always run `nvm use` before `pnpm`.** This repo pins its Node version via `.nvmrc`. Every new shell session must run `nvm use` before any `pnpm` command (install, build, test, dev, changeset, etc.) — otherwise commands may silently run under the wrong Node version and fail in confusing ways.
