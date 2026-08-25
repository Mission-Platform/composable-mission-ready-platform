#!/usr/bin/env python3
"""Bulk-migrate visual components to typed --forge-* property overrides."""
from __future__ import annotations

import re
from collections import Counter
from itertools import product
from pathlib import Path

ROOT = Path(".")
EXCLUDE_SLUGS = {
    "forge-breakpoint-debug",
    "forge-map-libre",
    "forge-monaco-editor",
    "forge-wysiwyg-editor",
    "forge-theme-composer",
    "forge-theme-provider",
}
EXCLUDE_PACKAGES = {"icons"}

# Existing prototype keys that must keep their public names (typography)
TYPOGRAPHY_SPECIAL = {
    "--mp-typography-base-font-family": ("font-family", "--forge-typography-font-family"),
    "--mp-typography-base-line-height": ("base-line-height", "--forge-typography-base-line-height"),
    "--mp-typography-variant-display-margin-bottom": (
        "display-margin-bottom",
        "--forge-typography-display-margin-bottom",
    ),
    "--mp-typography-variant-display-font-family": (
        "display-font-family",
        "--forge-typography-display-font-family",
    ),
    "--mp-typography-variant-display-font-size": (
        "display-font-size",
        "--forge-typography-display-font-size",
    ),
}

MARKER_START = "/* ── Visual property overrides (generated) ───────────────────────────── */"
MARKER_END = "/* ── End visual property overrides ─────────────────────────────────────── */"


def component_namespace(slug: str) -> str:
    return slug[6:] if slug.startswith("forge-") else slug


def pascal_from_slug(slug: str) -> str:
    parts = slug.split("-")
    if parts and parts[0] == "forge":
        parts = parts[1:]
    return "".join(p.capitalize() for p in parts)


def find_modules() -> list[Path]:
    mods: list[Path] = []
    for path in ROOT.glob("packages/*/src/components/**/*.module.scss"):
        package = path.parts[1]
        if package in EXCLUDE_PACKAGES:
            continue
        slug = path.name.replace(".module.scss", "")
        if slug in EXCLUDE_SLUGS:
            continue
        mods.append(path)
    return sorted(mods)


def parse_var_call(text: str, start: int) -> tuple[str, int] | None:
    if not text.startswith("var(", start):
        return None
    index = start + 4
    depth = 1
    while index < len(text) and depth:
        char = text[index]
        if char == "(":
            depth += 1
        elif char == ")":
            depth -= 1
        index += 1
    if depth != 0:
        return None
    return text[start:index], index


def extract_first_custom_prop(var_call: str) -> str | None:
    match = re.match(r"var\(\s*(--[a-z0-9#{}_$-]+)", var_call)
    return match.group(1) if match else None


def is_already_forge_wrapped(text: str, var_start: int) -> bool:
    before = text[:var_start]
    index = before.rfind("var(")
    if index < 0:
        return False
    window = text[index:var_start]
    return "--forge-" in window and "," in window


def expand_interpolation_token(token: str, scss: str) -> list[str]:
    if "#{" not in token:
        return [token]

    placeholders = re.findall(r"#\{\$([^}]+)\}", token)
    if not placeholders:
        return [token]

    values_by_var: dict[str, list[str]] = {}
    for var in placeholders:
        values: list[str] = []
        for match in re.finditer(rf"@each\s+\${var}\s+in\s+([^\n{{]+)", scss):
            for groups in re.findall(r"'([^']+)'|\"([^\"]+)\"", match.group(1)):
                value = next((item for item in groups if item), "")
                if value:
                    values.append(value)
        for match in re.finditer(
            rf"@each\s+\${var}\s*,\s*\$[a-zA-Z0-9_-]+\s+in\s*\((.*?)\)",
            scss,
            re.S,
        ):
            values.extend(re.findall(r"'([^']+)'\s*:", match.group(1)))
        if not values:
            for match in re.finditer(rf"@mixin\s+([a-zA-Z0-9_-]+)\s*\(\s*\${var}\b", scss):
                mixin = match.group(1)
                for include in re.finditer(
                    rf"@include\s+{re.escape(mixin)}\(\s*['\"]([^'\"]+)['\"]",
                    scss,
                ):
                    values.append(include.group(1))
        ordered: list[str] = []
        seen: set[str] = set()
        for value in values:
            if value and value not in seen:
                seen.add(value)
                ordered.append(value)
        if not ordered:
            ordered = list(dict.fromkeys(re.findall(r"&--([a-z0-9-]+)", scss)))
        values_by_var[var] = ordered or [f"__UNEXPANDED_{var}__"]

    keys = list(values_by_var.keys())
    out: list[str] = []
    for combo in product(*(values_by_var[key] for key in keys)):
        concrete = token
        for key, value in zip(keys, combo, strict=True):
            concrete = concrete.replace(f"#{{${key}}}", value)
        if "__UNEXPANDED_" not in concrete:
            out.append(concrete)
    return out or [token]


def mp_to_key_and_forge(mp_token: str, namespace: str, slug: str) -> tuple[str, str]:
    if slug == "forge-typography" and mp_token in TYPOGRAPHY_SPECIAL:
        return TYPOGRAPHY_SPECIAL[mp_token]

    rest = mp_token[5:] if mp_token.startswith("--mp-") else mp_token
    key = rest
    for prefix in (namespace, namespace.replace("-", ""), slug, slug.replace("forge-", "")):
        if prefix and rest.startswith(prefix + "-"):
            key = rest[len(prefix) + 1 :]
            break
    return key, f"--forge-{namespace}-{key}"


def wrap_scss(scss: str, namespace: str, slug: str) -> tuple[str, list[tuple[str, str, str]]]:
    mappings: dict[str, tuple[str, str, str]] = {}
    out: list[str] = []
    index = 0
    while index < len(scss):
        next_var = scss.find("var(", index)
        if next_var < 0:
            out.append(scss[index:])
            break
        out.append(scss[index:next_var])
        parsed = parse_var_call(scss, next_var)
        if not parsed:
            out.append(scss[next_var : next_var + 4])
            index = next_var + 4
            continue
        full, end = parsed
        first = extract_first_custom_prop(full)
        if not first or not first.startswith("--mp-") or is_already_forge_wrapped(scss, next_var):
            out.append(full)
            index = end
            continue

        if "#{" in first:
            rest = first[5:]
            key_template = rest
            for prefix in (namespace, slug.replace("forge-", "")):
                if prefix and rest.startswith(prefix + "-"):
                    key_template = rest[len(prefix) + 1 :]
                    break
            forge_template = f"--forge-{namespace}-{key_template}"
            out.append(f"var({forge_template}, {full})")
            for concrete_mp in expand_interpolation_token(first, scss):
                key, forge = mp_to_key_and_forge(concrete_mp, namespace, slug)
                mappings[key] = (key, forge, concrete_mp)
            index = end
            continue

        key, forge = mp_to_key_and_forge(first, namespace, slug)
        mappings[key] = (key, forge, first)
        out.append(f"var({forge}, {full})")
        index = end

    return "".join(out), sorted(mappings.values(), key=lambda item: item[0])


def generate_types_and_helper(pascal: str, mappings: list[tuple[str, str, str]]) -> str:
    props_lines = "\n".join(f"  readonly '{key}'?: string;" for key, _, _ in mappings)
    style_lines = "\n".join(f"  readonly '{forge}'?: string | undefined;" for _, forge, _ in mappings)
    assign_lines = "\n".join(f"    '{forge}': properties?.['{key}']," for key, forge, _ in mappings)
    return f"""
export interface {pascal}StyleProperties {{
{props_lines}
}}

export type {pascal}Style = CSSStyleProperties & {{
{style_lines}
}};

function create{pascal}Style(
  properties: Readonly<{pascal}StyleProperties> | undefined,
): {pascal}Style | undefined {{
  return createForgeStyle({{
{assign_lines}
  }}) as {pascal}Style | undefined;
}}
"""


def ensure_import(tsx: str, names: list[str]) -> str:
    match = re.search(r"import\s*\{([^}]+)\}\s*from\s*'@mission-platform/forge';", tsx)
    if not match:
        return "import { " + ", ".join(names) + " } from '@mission-platform/forge';\n" + tsx

    parts = [part.strip() for part in match.group(1).split(",") if part.strip()]
    have = {part.replace("type ", "").strip() for part in parts}
    for name in names:
        base = name.replace("type ", "").strip()
        if base in have:
            continue
        if name.startswith("type ") or base == "CSSStyleProperties":
            parts.append(f"type {base}")
        else:
            parts.append(base)
        have.add(base)

    values = []
    types = []
    seen: set[str] = set()
    for part in parts:
        if part in seen:
            continue
        seen.add(part)
        if part.startswith("type "):
            types.append(part)
        else:
            values.append(part)

    joined = values + types
    if "\n" not in match.group(0) and sum(len(item) for item in joined) < 90:
        new_import = "import { " + ", ".join(joined) + " } from '@mission-platform/forge';"
    else:
        new_import = "import {\n  " + ",\n  ".join(joined) + ",\n} from '@mission-platform/forge';"
    return tsx[: match.start()] + new_import + tsx[match.end() :]


def add_properties_to_interface(tsx: str, interface_name: str, pascal: str) -> str:
    match = re.search(rf"export interface {re.escape(interface_name)} \{{", tsx)
    if not match:
        return tsx
    start = match.end() - 1
    depth = 0
    index = start
    while index < len(tsx):
        if tsx[index] == "{":
            depth += 1
        elif tsx[index] == "}":
            depth -= 1
            if depth == 0:
                break
        index += 1
    body = tsx[start + 1 : index]
    if re.search(r"\bproperties\?\s*:", body):
        body = re.sub(
            r"properties\?\s*:\s*Readonly<[^>]+>",
            f"properties?: Readonly<{pascal}StyleProperties>",
            body,
            count=1,
        )
        return tsx[: start + 1] + body + tsx[index:]
    insertion = (
        f"\n  /** Component-owned CSS custom-property overrides. */\n"
        f"  properties?: Readonly<{pascal}StyleProperties>;\n"
    )
    return tsx[:index] + insertion + tsx[index:]


def inject_style_into_function(tsx: str, function_name: str, pascal: str) -> str:
    match = re.search(rf"export function {re.escape(function_name)}\(\s*properties\s*:", tsx)
    if not match:
        return tsx
    brace = tsx.find("{", match.end())
    if brace < 0:
        return tsx

    if f"create{pascal}Style" not in tsx[brace : brace + 200]:
        # Avoid double-insert when helper exists later in file but call is missing.
        call_present = f"create{pascal}Style(properties.properties)" in tsx
        if not call_present:
            insert = f"\n  const style = create{pascal}Style(properties.properties);\n"
            tsx = tsx[: brace + 1] + insert + tsx[brace + 1 :]

    roots = re.findall(r"styles\['(forge-[a-z0-9-]+)'\]", tsx)
    if not roots:
        roots = re.findall(r'styles\["(forge-[a-z0-9-]+)"\]', tsx)
    if not roots:
        return tsx
    root_class = roots[0]

    pattern = re.compile(
        rf"<([A-Za-z][\w.]*)([^>]*?styles\[\s*['\"]{re.escape(root_class)}['\"]\s*\])([^>]*?)(/?)>",
        re.S,
    )

    def replace(match: re.Match[str]) -> str:
        full = match.group(0)
        if re.search(r"\bstyle=\{style\}", full) or re.search(r"\bstyle=\{", full):
            return full
        self_close = match.group(4) == "/"
        if self_close:
            return f"<{match.group(1)}{match.group(2)}{match.group(3)} style={{style}} />"
        return f"<{match.group(1)}{match.group(2)}{match.group(3)} style={{style}}>"

    tsx = pattern.sub(replace, tsx)

    # h('div', { className: styles['root'], ... })
    h_pattern = re.compile(
        rf"(h\(\s*['\"][^'\"]+['\"]\s*,\s*\{{)([^}}]*styles\[\s*['\"]{re.escape(root_class)}['\"]\s*\])",
        re.S,
    )

    def replace_h(match: re.Match[str]) -> str:
        body = match.group(2)
        if re.search(r"\bstyle\b", body):
            return match.group(0)
        return match.group(1) + " style," + body

    return h_pattern.sub(replace_h, tsx)


def find_props_interface(tsx: str, pascal: str) -> str | None:
    match = re.search(r"export function Forge\w+\(\s*properties:\s*Readonly<(\w+)>", tsx)
    if match:
        return match.group(1)
    for candidate in (f"{pascal}Properties", f"{pascal}Props", f"Forge{pascal}Properties"):
        if re.search(rf"export interface {candidate} \{{", tsx):
            return candidate
    match = re.search(r"export interface (\w+Properties) \{", tsx)
    return match.group(1) if match else None


def insert_generated_block(tsx: str, block: str, interface_name: str) -> str:
    block_full = f"\n{MARKER_START}\n{block.strip()}\n{MARKER_END}\n"
    if MARKER_START in tsx:
        return re.sub(
            re.escape(MARKER_START) + r".*?" + re.escape(MARKER_END),
            MARKER_START + "\n" + block.strip() + "\n" + MARKER_END,
            tsx,
            count=1,
            flags=re.S,
        )
    match = re.search(rf"export interface {re.escape(interface_name)} \{{", tsx)
    if match:
        return tsx[: match.start()] + block_full + tsx[match.start() :]
    match = re.search(r"export function Forge", tsx)
    if match:
        return tsx[: match.start()] + block_full + tsx[match.start() :]
    return tsx + block_full


def migrate_typography_special(scss_path: Path, tsx_path: Path) -> dict[str, object]:
    scss = scss_path.read_text()
    namespace = "typography"
    slug = "forge-typography"
    new_scss, mappings = wrap_scss(scss, namespace, slug)
    scss_path.write_text(new_scss)

    pascal = "Typography"
    tsx = tsx_path.read_text()
    tsx = re.sub(
        r"/\*\* Component-owned CSS values inherited by typography descendants and popup content\. \*/\n"
        r"export interface TypographyStyleProperties \{.*?\n\}\n\n"
        r"/\*\* Neutral style map for the supported typography custom properties\. \*/\n"
        r"export type TypographyStyle = CSSStyleProperties & \{.*?\n\};\n\n"
        r"function createTypographyStyle\(.*?\n\}\n",
        "",
        tsx,
        count=1,
        flags=re.S,
    )
    tsx = re.sub(
        re.escape(MARKER_START) + r".*?" + re.escape(MARKER_END) + r"\n?",
        "",
        tsx,
        count=1,
        flags=re.S,
    )

    block = generate_types_and_helper(pascal, mappings)
    block = block.replace(
        f"export interface {pascal}StyleProperties {{",
        "/** Component-owned CSS values inherited by typography descendants and popup content. */\n"
        f"export interface {pascal}StyleProperties {{",
        1,
    )
    tsx = ensure_import(tsx, ["createForgeStyle", "type CSSStyleProperties"])
    interface_name = find_props_interface(tsx, pascal) or "TypographyProperties"
    tsx = insert_generated_block(tsx, block, interface_name)
    tsx = add_properties_to_interface(tsx, interface_name, pascal)

    tsx = re.sub(
        r"const \{\n(.*?)properties: styleProperties,\n  \} = properties;\n  const style = createTypographyStyle\(styleProperties\);",
        r"const {\n\1} = properties;\n  const style = createTypographyStyle(properties.properties);",
        tsx,
        count=1,
        flags=re.S,
    )
    tsx = tsx.replace("    properties: styleProperties,\n", "")
    tsx = tsx.replace(
        "createTypographyStyle(styleProperties)",
        "createTypographyStyle(properties.properties)",
    )
    tsx = tsx.replace("...(style === undefined ? {} : { style }),", "style,")
    tsx = tsx.replace("...(style === undefined ? {} : { style })", "style")
    tsx = inject_style_into_function(tsx, "ForgeTypography", pascal)
    tsx_path.write_text(tsx)
    return {"slug": slug, "status": "ok-typography", "n": len(mappings)}


def migrate_one(scss_path: Path) -> dict[str, object]:
    slug = scss_path.name.replace(".module.scss", "")
    tsx_path = scss_path.with_name(f"{slug}.tsx")
    if not tsx_path.exists():
        return {"slug": slug, "status": "no-tsx"}

    namespace = component_namespace(slug)
    pascal = pascal_from_slug(slug)

    if slug == "forge-typography":
        return migrate_typography_special(scss_path, tsx_path)

    scss = scss_path.read_text()
    if "--mp-" not in scss and "--forge-" not in scss:
        return {"slug": slug, "status": "skip-no-tokens"}

    new_scss, mappings = wrap_scss(scss, namespace, slug)
    scss_path.write_text(new_scss)
    if not mappings:
        return {"slug": slug, "status": "scss-only-no-keys"}

    tsx = tsx_path.read_text()
    tsx = re.sub(
        re.escape(MARKER_START) + r".*?" + re.escape(MARKER_END) + r"\n?",
        "\n",
        tsx,
        count=1,
        flags=re.S,
    )

    block = generate_types_and_helper(pascal, mappings)
    tsx = ensure_import(tsx, ["createForgeStyle", "type CSSStyleProperties"])
    interface_name = find_props_interface(tsx, pascal)
    if not interface_name:
        return {"slug": slug, "status": "no-iface", "n": len(mappings)}

    tsx = insert_generated_block(tsx, block, interface_name)
    tsx = add_properties_to_interface(tsx, interface_name, pascal)
    tsx = inject_style_into_function(tsx, f"Forge{pascal}", pascal)
    tsx_path.write_text(tsx)
    return {"slug": slug, "status": "ok", "n": len(mappings)}


def main() -> None:
    results = []
    for module in find_modules():
        try:
            results.append(migrate_one(module))
        except Exception as error:  # noqa: BLE001 - batch report
            results.append({"slug": module.name, "status": f"error:{error}"})

    summary = Counter(str(result["status"]).split(":")[0] for result in results)
    print("SUMMARY", dict(summary))
    print("total mapping keys", sum(int(result.get("n", 0)) for result in results))
    for result in results:
        status = str(result["status"])
        if status.startswith("error") or status == "no-iface":
            print(" ERR", result)
    print("ok", sum(1 for result in results if str(result["status"]).startswith("ok")))


if __name__ == "__main__":
    main()
