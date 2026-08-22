import {
  createForgeDiagnostic,
  type ForgeDesignDocument,
  type ForgeDesignNode,
  type ForgeExportBundle,
  type ForgeExportFile,
} from '../model';
import { findForgeComponent, type ForgePropertyDefinition } from '../registry';
import { normalizeComponentName, normalizeFileName, validateForgeExportBundle } from '../validation';

export interface ForgeGenerationOptions {
  readonly componentName?: string;
  readonly fileName?: string;
}

interface GenerationContext {
  readonly classes: Map<string, string>;
  readonly imports: Map<string, Set<string>>;
  readonly assetPaths: Map<string, string>;
  readonly diagnostics: ReturnType<typeof createForgeDiagnostic>[];
}

function hash(value: string): string {
  let result = 2_166_136_261;
  for (const character of value) {
    result ^= character.codePointAt(0) ?? 0;
    result = Math.imul(result, 16_777_619);
  }
  return (result >>> 0).toString(36);
}

function className(node: ForgeDesignNode): string {
  return `${normalizeFileName(node.name, 'layer')}-${hash(node.id)}`;
}

function quote(value: string): string {
  return JSON.stringify(value).replaceAll('<', String.raw`\u003c`);
}

function assetPath(fileName: string): string {
  return `assets/${fileName}`;
}

function cssNumber(value: number): string {
  return Number.isInteger(value) ? `${value}px` : `${value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}px`;
}

function cssValue(value: string | number): string {
  return typeof value === 'number' ? cssNumber(value) : value;
}

function tokenValue(node: ForgeDesignNode, key: string, fallback?: string | number): string | undefined {
  const token = node.style?.tokens?.[key];
  if (token) return `var(${token.cssVariable})`;
  return fallback === undefined ? undefined : cssValue(fallback);
}

function colorValue(node: ForgeDesignNode, key: string, index: number): string | undefined {
  const color = node.style?.fills?.[index];
  if (!color) return undefined;
  const token = node.style?.tokens?.[key];
  if (token) return `var(${token.cssVariable})`;
  if (color.kind === 'solid') return color.opacity === undefined ? color.color : `${color.color}`;
  return color.kind === 'gradient' ? color.value : undefined;
}

function direction(node: ForgeDesignNode): string | undefined {
  if (node.layout?.mode === 'horizontal') return 'row';
  if (node.layout?.mode === 'vertical') return 'column';
  return undefined;
}

function declarations(node: ForgeDesignNode): string[] {
  const layout = node.layout;
  const style = node.style;
  const lines: string[] = [];
  const layoutDirection = direction(node);
  if (layoutDirection) {
    lines.push('display: flex;', `flex-direction: ${layoutDirection};`);
  } else if (layout?.mode === 'grid') {
    lines.push('display: grid;');
  }
  if (layout?.gap !== undefined) lines.push(`gap: ${tokenValue(node, 'gap', layout.gap)};`);
  if (layout?.padding) {
    const padding = layout.padding;
    const token = tokenValue(node, 'padding');
    lines.push(
      token
        ? `padding: ${token};`
        : `padding: ${cssNumber(padding.top)} ${cssNumber(padding.right)} ${cssNumber(padding.bottom)} ${cssNumber(padding.left)};`,
    );
  }
  if (layout?.width !== undefined) lines.push(`width: ${tokenValue(node, 'width', layout.width)};`);
  if (layout?.height !== undefined) lines.push(`height: ${tokenValue(node, 'height', layout.height)};`);
  if (layout?.minWidth !== undefined) lines.push(`min-width: ${cssNumber(layout.minWidth)};`);
  if (layout?.maxWidth !== undefined) lines.push(`max-width: ${cssNumber(layout.maxWidth)};`);
  if (layout?.minHeight !== undefined) lines.push(`min-height: ${cssNumber(layout.minHeight)};`);
  if (layout?.maxHeight !== undefined) lines.push(`max-height: ${cssNumber(layout.maxHeight)};`);
  if (layout?.align) lines.push(`align-items: ${layout.align === 'baseline' ? 'baseline' : `flex-${layout.align}`};`);
  if (layout?.justify) {
    lines.push(`justify-content: ${layout.justify === 'space-between' ? 'space-between' : `flex-${layout.justify}`};`);
  }
  if (layout?.wrap) lines.push('flex-wrap: wrap;');
  if (layout?.position) {
    lines.push(
      'position: absolute;',
      `left: ${cssNumber(layout.position.x)};`,
      `top: ${cssNumber(layout.position.y)};`,
    );
  }
  const fill = colorValue(node, 'fill', 0);
  if (fill) lines.push(`background: ${fill};`);
  const stroke = style?.strokes?.[0];
  if (stroke?.color) {
    const strokeColor = style?.tokens?.stroke
      ? `var(${style.tokens.stroke.cssVariable})`
      : stroke.color.kind === 'solid'
        ? stroke.color.color
        : undefined;
    if (strokeColor) lines.push(`border: ${cssNumber(stroke.width ?? 1)} solid ${strokeColor};`);
  }
  if (style?.radius !== undefined) {
    if (typeof style.radius === 'number') lines.push(`border-radius: ${cssNumber(style.radius)};`);
    else {
      lines.push(
        `border-radius: ${cssNumber(style.radius.topLeft)} ${cssNumber(style.radius.topRight)} ${cssNumber(style.radius.bottomRight)} ${cssNumber(style.radius.bottomLeft)};`,
      );
    }
  }
  if (style?.opacity !== undefined && style.opacity !== 1) lines.push(`opacity: ${style.opacity};`);
  for (const effect of style?.effects ?? []) {
    switch (effect.kind) {
      case 'drop-shadow':
      case 'inner-shadow': {
        const inset = effect.kind === 'inner-shadow' ? 'inset ' : '';
        const offset = effect.offset ?? { x: 0, y: 0 };
        lines.push(
          `box-shadow: ${inset}${cssNumber(offset.x)} ${cssNumber(offset.y)} ${cssNumber(effect.radius ?? 0)} ${cssNumber(effect.spread ?? 0)} ${effect.color ?? 'currentColor'};`,
        );

        break;
      }
      case 'blur': {
        lines.push(`filter: blur(${cssNumber(effect.radius ?? 0)});`);
        break;
      }
      case 'background-blur': {
        {
          lines.push(`backdrop-filter: blur(${cssNumber(effect.radius ?? 0)});`);
          // No default
        }
        break;
      }
    }
  }
  return lines;
}

function propertyDefinition(
  name: string,
  definitions: readonly ForgePropertyDefinition[],
): ForgePropertyDefinition | undefined {
  return definitions.find((definition) => definition.name === name || definition.figmaNames?.includes(name));
}

function propertyValue(value: boolean | string, definition?: ForgePropertyDefinition): string {
  if (typeof value === 'boolean') return String(value);
  if (definition?.type === 'number' && /^-?\d+(?:\.\d+)?$/.test(value)) return value;
  return quote(value);
}

function nodeTag(node: ForgeDesignNode): string {
  const component = node.component && findForgeComponent(node.component.registryName);
  return component?.name ?? (node.type === 'text' ? 'span' : node.type === 'image' ? 'img' : 'div');
}

function collect(node: ForgeDesignNode, context: GenerationContext): void {
  context.classes.set(node.id, className(node));
  if (node.component) {
    const component = findForgeComponent(node.component.registryName);
    if (component) {
      const names = context.imports.get(component.importPath) ?? new Set<string>();
      names.add(component.name);
      context.imports.set(component.importPath, names);
    }
  }
  if (node.style?.effects?.some((effect) => effect.kind === 'unknown')) {
    context.diagnostics.push(
      createForgeDiagnostic({
        code: 'UNSUPPORTED_EFFECT',
        severity: 'warning',
        message: `Layer "${node.name}" contains an unsupported effect; generated styles are approximate.`,
        feature: 'effect',
        nodeId: node.id,
        nodeName: node.name,
        suggestion: 'Replace the effect with a supported shadow or blur effect.',
      }),
    );
  }
  for (const child of node.children ?? []) collect(child, context);
}

function attributes(node: ForgeDesignNode, context: GenerationContext): string[] {
  const attributes = [`className={styles[${quote(context.classes.get(node.id) ?? 'layer')}]}`];
  if (!node.component) attributes.push(`data-forge-layer=${quote(node.name)}`);
  if (node.type === 'image') {
    const path = node.assetId ? context.assetPaths.get(node.assetId) : undefined;
    attributes.push(`src={${quote(path ? `./${path}` : './assets/missing-image')}}`, `alt=${quote(node.name)}`);
  }
  const component = node.component && findForgeComponent(node.component.registryName);
  for (const property of node.component?.properties ?? []) {
    const definition = component && propertyDefinition(property.name, component.props);
    if (!definition) continue;
    attributes.push(`${property.name}={${propertyValue(property.value, definition)}}`);
  }
  return attributes;
}

function emitNode(node: ForgeDesignNode, context: GenerationContext, depth: number): string {
  const indent = '  '.repeat(depth);
  const tag = nodeTag(node);
  const attributes_ = attributes(node, context);
  const opening = `${indent}<${tag} ${attributes_.join(' ')}>`;
  const children = node.children?.map((child) => emitNode(child, context, depth + 1)) ?? [];
  if (node.text) children.unshift(`${'  '.repeat(depth + 1)}{${quote(node.text.characters)}}`);
  if (node.type === 'image' || (children.length === 0 && tag !== 'span' && tag !== 'button')) {
    return `${indent}<${tag} ${attributes_.join(' ')} />`;
  }
  return `${opening}\n${children.join('\n')}\n${indent}</${tag}>`;
}

function emitScss(document: ForgeDesignDocument, context: GenerationContext): string {
  const nodes: ForgeDesignNode[] = [];
  const walk = (node: ForgeDesignNode): void => {
    nodes.push(node);
    for (const child of node.children ?? []) walk(child);
  };
  walk(document.root);
  return `${nodes
    .map((node) => {
      const body = declarations(node);
      return `.${context.classes.get(node.id)} {\n${body.map((line) => `  ${line}`).join('\n')}\n}`;
    })
    .join('\n\n')}\n`;
}

export function generateForgeExportBundle(
  document: ForgeDesignDocument,
  options: ForgeGenerationOptions = {},
): ForgeExportBundle {
  const componentName = options.componentName ?? normalizeComponentName(document.root.name);
  const fileName = options.fileName ?? normalizeFileName(document.root.name);
  const context: GenerationContext = {
    classes: new Map(),
    imports: new Map(),
    assetPaths: new Map(document.assets.map((asset) => [asset.id, assetPath(asset.fileName)])),
    diagnostics: [],
  };
  collect(document.root, context);
  const imports = [...context.imports.entries()]
    .toSorted(([left], [right]) => left.localeCompare(right))
    .map(
      ([path, names]) =>
        `import { ${[...names].toSorted((left, right) => left.localeCompare(right)).join(', ')} } from ${quote(path)};`,
    )
    .join('\n');
  const source = `import styles from './${fileName}.module.scss';\n${imports ? `${imports}\n` : ''}\nexport interface ${componentName}Properties {\n  readonly className?: string;\n}\n\nexport function ${componentName}(properties: Readonly<${componentName}Properties> = {}): unknown {\n  return (\n${emitNode(document.root, context, 2)}\n  );\n}\n`;
  const files: ForgeExportFile[] = [
    { path: `${fileName}.tsx`, kind: 'tsx', content: source },
    { path: `${fileName}.module.scss`, kind: 'scss', content: emitScss(document, context) },
  ];
  for (const asset of document.assets.toSorted((left, right) => left.fileName.localeCompare(right.fileName))) {
    files.push({ path: assetPath(asset.fileName), kind: 'asset', content: asset.content });
  }
  const diagnostics = [...document.diagnostics, ...context.diagnostics, ...validateForgeExportBundle({ files })];
  return { componentName, files, diagnostics };
}
