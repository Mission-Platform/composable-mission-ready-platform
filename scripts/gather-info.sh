#!/bin/bash
dir=$1
if [ -d "$dir" ] && [ -f "$dir/package.json" ]; then
  echo "DIR: $dir"
  jq -r '{
    name: .name,
    private: (.private // false),
    type: (.type // "commonjs"),
    main: .main,
    module: .module,
    types: .types,
    exports: .exports,
    build_scripts: (if .scripts then (.scripts | with_entries(select(.key | startswith("build") or .key == "dev"))) else {} end),
    bundler_deps: (if .devDependencies then (.devDependencies | with_entries(select(.key | test("vite|tsc|wrangler|tsdown|svelte|forge|tokens|i18n|postcss|esbuild|rollup")))) else {} end)
  }' "$dir/package.json"
  for f in vite.config.ts tsconfig.build.json turbo.json; do
    if [ -f "$dir/$f" ]; then
      echo "FILE_FOUND: $f"
    fi
  done
  echo "---"
fi
