export type ForgePropertyValueType = 'string' | 'boolean' | 'number' | 'enum' | 'node' | 'nodes' | 'unknown';

export interface ForgePropertyDefinition {
  readonly name: string;
  readonly figmaNames?: readonly string[];
  readonly type: ForgePropertyValueType;
  readonly required?: boolean;
  readonly values?: readonly string[];
}

export interface ForgeSlotDefinition {
  readonly name: string;
  readonly required?: boolean;
  readonly multiple?: boolean;
  readonly description?: string;
}

export interface ForgeComponentRegistryEntry {
  readonly name: string;
  readonly aliases: readonly string[];
  readonly importPath: string;
  readonly tokenContracts: readonly string[];
  readonly props: readonly ForgePropertyDefinition[];
  readonly slots: readonly ForgeSlotDefinition[];
  readonly variants: readonly string[];
  readonly states: readonly string[];
  readonly htmlFallback: string;
  readonly classification: 'visual' | 'inherited-visual';
}

export interface ForgeComponentMetadata {
  readonly registryName?: string;
  readonly componentName?: string;
  readonly forgeName?: string;
}
