import {
  createForgeDiagnostic,
  findForgeComponent,
  resolveFigmaVariable,
  type ForgeColor,
  type ForgeComponentBinding,
  type ForgeComponentProperty,
  type ForgeConstraints,
  type ForgeDesignDocument,
  type ForgeDesignNode,
  type ForgeEffect,
  type ForgeInsets,
  type ForgeLayout,
  type ForgeStroke,
  type ForgeStyle,
} from '@mission-platform/forge-figma';

import type { FigmaColor, FigmaEffect, FigmaExtractionOptions, FigmaNode, FigmaPaint } from './types';

interface ExtractionContext {
  readonly options: FigmaExtractionOptions;
  readonly diagnostics: ReturnType<typeof createForgeDiagnostic>[];
  readonly assets: Map<string, ForgeDesignDocument['assets'][number]>;
}

function hex(color: FigmaColor): string {
  return `#${channel(color.r)}${channel(color.g)}${channel(color.b)}`;
}

function channel(value: number): string {
  return Math.round(Math.max(0, Math.min(1, value)) * 255)
    .toString(16)
    .padStart(2, '0');
}

function mapPaint(paint: FigmaPaint, assetId?: string): ForgeColor {
  const opacity = paint.opacity ?? paint.color?.a;
  if (paint.type === 'IMAGE') return { kind: 'image', assetId, opacity };
  if (paint.type.startsWith('GRADIENT_')) {
    const stops = paint.gradientStops ?? [];
    const value =
      stops.length > 0
        ? `linear-gradient(90deg, ${stops.map((stop) => `${hex(stop.color)} ${Math.round(stop.position * 100)}%`).join(', ')})`
        : 'linear-gradient(90deg, transparent, transparent)';
    return { kind: 'gradient', value, opacity };
  }
  return { kind: 'solid', color: paint.color ? hex(paint.color) : 'transparent', opacity };
}

function mapEffect(effect: FigmaEffect): ForgeEffect {
  const type = effect.type.toUpperCase();
  const kind =
    type === 'DROP_SHADOW'
      ? 'drop-shadow'
      : type === 'INNER_SHADOW'
        ? 'inner-shadow'
        : type === 'LAYER_BLUR'
          ? 'blur'
          : type === 'BACKGROUND_BLUR'
            ? 'background-blur'
            : 'unknown';
  return {
    kind,
    color: effect.color ? hex(effect.color) : undefined,
    offset: effect.offset,
    radius: effect.radius,
    spread: effect.spread,
    visible: effect.visible,
  };
}

function mapAlignment(value: string | undefined): 'start' | 'center' | 'end' | 'baseline' | 'stretch' | undefined {
  if (!value) return undefined;
  return value === 'MIN'
    ? 'start'
    : value === 'MAX'
      ? 'end'
      : value === 'CENTER'
        ? 'center'
        : value === 'BASELINE'
          ? 'baseline'
          : value === 'STRETCH'
            ? 'stretch'
            : undefined;
}

function mapConstraint(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const mapped = value.toLowerCase().replaceAll('_', '-');
  return mapped === 'left' ||
    mapped === 'right' ||
    mapped === 'center' ||
    mapped === 'left-right' ||
    mapped === 'top' ||
    mapped === 'bottom' ||
    mapped === 'top-bottom' ||
    mapped === 'scale'
    ? mapped
    : undefined;
}

function mapHorizontalConstraint(value: string | undefined): ForgeConstraints['horizontal'] | undefined {
  const mapped = mapConstraint(value);
  return mapped === 'left' || mapped === 'right' || mapped === 'center' || mapped === 'left-right' || mapped === 'scale'
    ? mapped
    : undefined;
}

function mapVerticalConstraint(value: string | undefined): ForgeConstraints['vertical'] | undefined {
  const mapped = mapConstraint(value);
  return mapped === 'top' || mapped === 'bottom' || mapped === 'center' || mapped === 'top-bottom' || mapped === 'scale'
    ? mapped
    : undefined;
}

function mapLayout(node: FigmaNode): ForgeLayout | undefined {
  const mode =
    node.layoutMode === 'HORIZONTAL'
      ? 'horizontal'
      : node.layoutMode === 'VERTICAL'
        ? 'vertical'
        : node.layoutMode === 'GRID'
          ? 'grid'
          : 'none';
  const box = node.absoluteBoundingBox;
  const width = node.width ?? box?.width;
  const height = node.height ?? box?.height;
  const padding: ForgeInsets | undefined =
    node.layoutMode && node.layoutMode !== 'NONE'
      ? {
          top: node.paddingTop ?? 0,
          right: node.paddingRight ?? 0,
          bottom: node.paddingBottom ?? 0,
          left: node.paddingLeft ?? 0,
        }
      : undefined;
  const position = node.relativeTransform
    ? { x: node.relativeTransform[0]?.[2] ?? 0, y: node.relativeTransform[1]?.[2] ?? 0 }
    : node.x !== undefined || node.y !== undefined
      ? { x: node.x ?? 0, y: node.y ?? 0 }
      : undefined;
  const sizing =
    node.layoutSizingHorizontal === 'FILL' || node.layoutSizingVertical === 'FILL'
      ? 'fill'
      : node.layoutSizingHorizontal === 'HUG' || node.layoutSizingVertical === 'HUG'
        ? 'hug'
        : mode === 'none'
          ? 'absolute'
          : 'fixed';
  return {
    mode,
    sizing,
    width,
    height,
    gap: node.itemSpacing,
    padding,
    align: mapAlignment(node.counterAxisAlignItems),
    justify:
      node.primaryAxisAlignItems === 'SPACE_BETWEEN' ? 'space-between' : mapAlignment(node.primaryAxisAlignItems),
    wrap: node.layoutWrap === 'WRAP',
    position,
  };
}

function variableFor(context: ExtractionContext, node: FigmaNode, key: string, index?: number) {
  const value = node.boundVariables?.[key];
  const binding = Array.isArray(value) ? value[index ?? 0] : value;
  if (!binding || !context.options.resolveVariable) return;
  const variable = context.options.resolveVariable(binding.id);
  if (!variable) {
    context.diagnostics.push(
      createForgeDiagnostic({
        code: 'MISSING_VARIABLE',
        severity: 'warning',
        message: `Variable "${binding.id}" could not be resolved for layer "${node.name}".`,
        feature: 'token',
        nodeId: node.id,
        nodeName: node.name,
        suggestion: 'Keep the generated raw value under review and restore the Figma variable binding.',
      }),
    );
    return;
  }
  const resolution = resolveFigmaVariable(variable);
  context.diagnostics.push(
    ...resolution.diagnostics.map((diagnostic) => ({ ...diagnostic, nodeId: node.id, nodeName: node.name })),
  );
  return resolution;
}

function hasBoundVariables(node: FigmaNode): boolean {
  if (!node.boundVariables) return false;
  return Object.values(node.boundVariables).some((binding) => {
    if (Array.isArray(binding)) return binding.length > 0;
    return Boolean(binding);
  });
}

async function resolveImageAsset(
  context: ExtractionContext,
  node: FigmaNode,
  paint: FigmaPaint,
): Promise<string | undefined> {
  const imageIdentifier = paint.imageHash ?? paint.imageReference;
  if (!imageIdentifier) return undefined;
  if (!context.options.loadImage) return imageIdentifier;
  const assetId = `image-${imageIdentifier}`;
  if (!context.assets.has(assetId)) {
    const bytes = await context.options.loadImage(imageIdentifier, node);
    if (bytes) {
      context.assets.set(assetId, {
        id: assetId,
        fileName: `${assetId}.png`,
        mimeType: bytes.mimeType ?? 'image/png',
        content: bytes.content,
        width: bytes.width,
        height: bytes.height,
      });
    } else {
      context.diagnostics.push(
        createForgeDiagnostic({
          code: 'MISSING_IMAGE_BYTES',
          severity: 'warning',
          message: `Image bytes for layer "${node.name}" were unavailable; the image reference was preserved.`,
          feature: 'image',
          nodeId: node.id,
          nodeName: node.name,
          suggestion: 'Re-export the image from Figma and retry conversion.',
        }),
      );
    }
  }
  return assetId;
}

function parseMetadata(node: FigmaNode): { readonly forgeName?: string; readonly explicit: boolean } {
  const values = [
    node.getPluginData?.('forge-component'),
    node.getPluginData?.('forgeName'),
    node.getSharedPluginData?.('forge', 'component'),
  ].filter(Boolean) as string[];
  for (const value of values) {
    try {
      const parsed: unknown = JSON.parse(value);
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'forgeName' in parsed &&
        typeof parsed.forgeName === 'string'
      )
        return { forgeName: parsed.forgeName, explicit: true };
    } catch {
      return { forgeName: value, explicit: true };
    }
  }
  return { explicit: false };
}

function mapPropertyType(type: string): ForgeComponentProperty['type'] {
  return type === 'BOOLEAN'
    ? 'boolean'
    : type === 'TEXT'
      ? 'text'
      : type === 'INSTANCE_SWAP'
        ? 'instance-swap'
        : type === 'VARIANT'
          ? 'variant'
          : 'unknown';
}

function mapComponent(context: ExtractionContext, node: FigmaNode): ForgeComponentBinding | undefined {
  if (node.type !== 'COMPONENT' && node.type !== 'INSTANCE') return undefined;
  const metadata = parseMetadata(node);
  const sourceName = node.mainComponent?.name ?? node.name;
  const registry = findForgeComponent(sourceName, { forgeName: metadata.forgeName });
  if (!registry) {
    context.diagnostics.push(
      createForgeDiagnostic({
        code: 'UNMAPPED_COMPONENT',
        severity: 'warning',
        message: `Component layer "${node.name}" has no approved Forge mapping and will use neutral output.`,
        feature: 'component mapping',
        nodeId: node.id,
        nodeName: node.name,
        suggestion: 'Rename the component to an approved Forge name or add forge-component plugin metadata.',
      }),
    );
    return undefined;
  }
  const properties = Object.entries(node.componentProperties ?? {}).map(([name, property]): ForgeComponentProperty => ({
    name: name.split('#')[0],
    type: mapPropertyType(property.type),
    value: property.value,
    defaultValue: property.defaultValue,
  }));
  return {
    registryName: registry.name,
    sourceName,
    properties,
    confidence: metadata.explicit ? 'metadata' : 'explicit',
  };
}

function mapStyle(
  context: ExtractionContext,
  node: FigmaNode,
  fillAssetIds: readonly (string | undefined)[],
): ForgeStyle | undefined {
  const visibleFills = node.fills?.filter((paint) => paint.visible !== false);
  const fills = visibleFills?.map((paint, index) => mapPaint(paint, fillAssetIds[index]));
  const strokes = node.strokes
    ?.filter((paint) => paint.visible !== false)
    .map((paint, index): ForgeStroke => ({
      color: mapPaint(paint),
      width: node.strokeWeight,
      align: node.strokeAlign?.toLowerCase() as ForgeStroke['align'],
      dashPattern: node.dashPattern,
      ...(variableFor(context, node, 'strokes', index)?.reference ? {} : {}),
    }));
  const tokens: Record<string, NonNullable<ForgeStyle['tokens']>[string]> = {};
  const tokenKeys = ['fill', 'stroke', 'opacity', 'cornerRadius', 'itemSpacing', 'padding'];
  for (const key of tokenKeys) {
    const resolution = variableFor(context, node, key);
    if (resolution?.reference) {
      tokens[key] = resolution.reference;
      if (key === 'itemSpacing') {
        tokens.gap = resolution.reference;
      }
    }
  }
  const radius =
    node.cornerRadius === undefined &&
    (node.topLeftRadius !== undefined ||
      node.topRightRadius !== undefined ||
      node.bottomRightRadius !== undefined ||
      node.bottomLeftRadius !== undefined)
      ? {
          topLeft: node.topLeftRadius ?? 0,
          topRight: node.topRightRadius ?? 0,
          bottomRight: node.bottomRightRadius ?? 0,
          bottomLeft: node.bottomLeftRadius ?? 0,
        }
      : node.cornerRadius;
  if (
    !fills?.length &&
    !strokes?.length &&
    radius === undefined &&
    !node.effects?.length &&
    node.opacity === undefined &&
    Object.keys(tokens).length === 0
  )
    return undefined;
  return {
    fills,
    strokes,
    radius,
    effects: node.effects?.map((effect) => mapEffect(effect)),
    opacity: node.opacity,
    blendMode: node.blendMode,
    tokens,
  };
}

function nodeType(type: string): ForgeDesignNode['type'] {
  const mapping: Record<string, ForgeDesignNode['type']> = {
    FRAME: 'frame',
    GROUP: 'group',
    COMPONENT: 'component',
    INSTANCE: 'instance',
    TEXT: 'text',
    RECTANGLE: 'rectangle',
    ELLIPSE: 'ellipse',
    LINE: 'line',
    VECTOR: 'vector',
    BOOLEAN_OPERATION: 'boolean-operation',
    IMAGE: 'image',
    SECTION: 'section',
  };
  return mapping[type] ?? 'unknown';
}

async function resolveFillAsset(
  context: ExtractionContext,
  node: FigmaNode,
  paint: FigmaPaint,
): Promise<string | undefined> {
  if (paint.type === 'IMAGE') {
    return resolveImageAsset(context, node, paint);
  }
}

async function extractNode(context: ExtractionContext, node: FigmaNode): Promise<ForgeDesignNode> {
  if (!context.options.resolveVariable && hasBoundVariables(node)) {
    context.diagnostics.push(
      createForgeDiagnostic({
        code: 'MISSING_VARIABLE_RESOLVER',
        severity: 'warning',
        message: `Layer "${node.name}" contains bound variables, but no variable resolver is available in the extraction context.`,
        feature: 'token',
        nodeId: node.id,
        nodeName: node.name,
        suggestion: 'Provide a resolveVariable option or run within an active Figma plugin host.',
      }),
    );
  }

  const visibleFills = node.fills?.filter((paint) => paint.visible !== false);
  const fillAssetIds = visibleFills
    ? await Promise.all(visibleFills.map((paint) => resolveFillAsset(context, node, paint)))
    : [];
  const primaryAssetId = fillAssetIds.find((id) => id && context.assets.has(id));

  const type = nodeType(node.type);
  if (type === 'unknown' || type === 'vector' || type === 'boolean-operation')
    context.diagnostics.push(
      createForgeDiagnostic({
        code: 'UNSUPPORTED_NODE',
        severity: 'warning',
        message: `Layer "${node.name}" uses ${node.type}, which is represented as a neutral fallback.`,
        feature: 'node type',
        nodeId: node.id,
        nodeName: node.name,
        suggestion: 'Use a supported frame, text, shape, or mapped Forge component when possible.',
      }),
    );
  const constraints = node.constraints
    ? {
        horizontal: mapHorizontalConstraint(node.constraints.horizontal) ?? 'left',
        vertical: mapVerticalConstraint(node.constraints.vertical) ?? 'top',
      }
    : undefined;
  return {
    id: node.id,
    name: node.name,
    type,
    visible: node.visible,
    layout: mapLayout(node),
    size:
      node.width !== undefined || node.height !== undefined
        ? { width: node.width ?? 0, height: node.height ?? 0 }
        : undefined,
    constraints,
    style: mapStyle(context, node, fillAssetIds),
    text:
      node.characters === undefined
        ? undefined
        : {
            characters: node.characters,
            style: node.textStyle,
            layout: node.textAlignHorizontal?.toLowerCase() as 'left' | 'center' | 'right' | 'justified' | undefined,
          },
    component: mapComponent(context, node),
    children: await Promise.all((node.children ?? []).map((child) => extractNode(context, child))),
    assetId: primaryAssetId,
  };
}

export async function extractFigmaDocument(
  root: FigmaNode,
  options: FigmaExtractionOptions = {},
): Promise<ForgeDesignDocument> {
  const context: ExtractionContext = { options, diagnostics: [], assets: new Map() };
  const extractedRoot = await extractNode(context, root);
  return {
    schemaVersion: 1,
    source: { fileKey: options.fileKey, nodeId: root.id, name: root.name },
    root: extractedRoot,
    assets: [...context.assets.values()].toSorted((left, right) => left.fileName.localeCompare(right.fileName)),
    diagnostics: context.diagnostics,
  };
}
