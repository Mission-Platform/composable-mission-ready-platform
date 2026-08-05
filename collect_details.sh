#!/bin/bash
for dir in "$@"; do
  if [ -d "$dir" ] && [ -f "$dir/package.json" ]; then
    echo "--- BEGIN $dir ---"
    jq '{
      name: .name,
      private: (.private // false),
      type: (.type // "commonjs"),
      main: .main,
      module: .module,
      types: .types,
      exports: .exports,
      scripts: (if .scripts then (.scripts | to_entries | map(select(.key | startswith("build") or .key == "dev")) | from_entries) else {} end),
      bundler_deps: (if .devDependencies then (.devDependencies | to_entries | map(select(.key | test("vite|tsc|wrangler|tsdown|svelte|forge|tokens|i18n|postcss|esbuild|rollup|vue-tsc|svelte2tsx"))) | from_entries) else {} end)
    }' "$dir/package.json"
    echo "--- END $dir ---"
  fi
done
