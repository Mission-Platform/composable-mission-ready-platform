/** End-to-end regressions for control-flow JSX helpers in the Svelte target. */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { forgeSvelteFramework } from '../../../../../compiler/plugins/forge-svelte/src';

import { compileComponentModule } from './compiler-test-helpers';

const SVELTE_FRAMEWORK = forgeSvelteFramework();
const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../../../');

function source(relativePath: string): string {
  return readFileSync(path.join(REPOSITORY_ROOT, relativePath), 'utf8');
}

const SWITCH_HELPER_SOURCE = `
import { h, type MpChild, type MpElement } from '@mission-platform/forge';
import { ForgeTabs } from '@mission-platform/components';

interface FixtureProperties {
  active: string;
}

export function PanelFixture(properties: Readonly<FixtureProperties>): MpElement {
  const renderPanel = (tabId: string): MpChild => {
    switch (tabId) {
      case 'steps': {
        return <section>Steps</section>;
      }
      case 'preview': {
        return <section>Preview</section>;
      }
      default: {
        return <section>{properties.active}</section>;
      }
    }
  };

  return (
    <ForgeTabs
      panel={(scope) => renderPanel(scope.tab.id)}
      tabs={[]}
    />
  );
}
`;

const FIELD_HELPER_SOURCE = `
import { h, type MpElement } from '@mission-platform/forge';

interface Field {
  key: string;
  type: 'text' | 'number' | 'fieldset';
  visible?: boolean;
  fields?: Field[];
}

interface FixtureProperties {
  fields: Field[];
}

export function FieldFixture(properties: Readonly<FixtureProperties>): MpElement {
  const renderField = (field: Field, path: string): MpElement | undefined => {
    if (field.visible === false) return undefined;

    const id = \`field-\${path}\`;

    if (field.type === 'text') {
      return <input id={id} />;
    }

    switch (field.type) {
      case 'number': {
        return <input id={id} type="number" />;
      }
      case 'fieldset': {
        return (
          <fieldset id={id}>
            {(field.fields ?? []).map((child) => renderField(child, \`\${path}.\${child.key}\`))}
          </fieldset>
        );
      }
      default: {
        return undefined;
      }
    }
  };

  return <form>{properties.fields.map((field) => renderField(field, field.key))}</form>;
}
`;

describe('Svelte control-flow render helper regression gate', () => {
  it('lowers a switch helper and passes its callback as an implicit snippet prop', () => {
    const compiled = compileComponentModule(SWITCH_HELPER_SOURCE, {
      framework: SVELTE_FRAMEWORK,
      componentName: 'PanelFixture',
    });

    expect(compiled.code).toContain('{#snippet renderPanel(tabId)}');
    expect(compiled.code).toContain("{#if tabId === 'steps'}");
    expect(compiled.code).toContain("{:else if tabId === 'preview'}");
    expect(compiled.code).toContain('{:else}');
    expect(compiled.code).toContain('{#snippet panel(scope)}{@render renderPanel(scope.tab.id)}{/snippet}');
    expect(compiled.code).not.toContain('panel={(scope) => renderPanel');
  });

  it('lowers early returns, local bindings, switch branches, and recursive helper calls', () => {
    const compiled = compileComponentModule(FIELD_HELPER_SOURCE, {
      framework: SVELTE_FRAMEWORK,
      componentName: 'FieldFixture',
    });

    expect(compiled.code).toContain('{#snippet renderField(field, path)}');
    expect(compiled.code).toContain('{@const id = `field-${path}`}');
    expect(compiled.code).toContain('{#if field.visible === false}');
    expect(compiled.code).toContain("{:else if field.type === 'text'}<input id={id} />");
    expect(compiled.code).toContain('{:else if field.type === \'number\'}<input id={id} type="number" />');
    expect(compiled.code).toContain('{@render renderField(child, `${path}.${child.key}`)}');
    expect(compiled.code).toContain('{@render renderField(field, field.key)}');
    expect(compiled.code).not.toMatch(/\{renderField\(/);
  });

  it('lowers the production FormBuilder renderPanel helper and callback prop', () => {
    const compiled = compileComponentModule(
      source('packages/ui/forms/src/components/organisms/forge-form-builder/forge-form-builder.tsx'),
      { framework: SVELTE_FRAMEWORK, componentName: 'ForgeFormBuilder' },
    );

    expect(compiled.code).toContain('{#snippet renderContainerChildren(list, step, parentId, index)}');
    expect(compiled.code).toContain('{@render renderRow(field, step)}');
    expect(compiled.code).not.toContain('const renderContainerChildren =');
    expect(compiled.code).toContain('{#snippet renderPanel(tabId)}');
    expect(compiled.code).toContain('{#snippet panel(scope)}{@render renderPanel(scope.tab.id)}{/snippet}');
    expect(compiled.code).not.toContain('panel={(scope) => renderPanel');
  });

  it('invokes the production ForgeTabs panel render prop as a scoped snippet', () => {
    const compiled = compileComponentModule(
      source('packages/ui/components/src/components/molecules/forge-tabs/forge-tabs.tsx'),
      { framework: SVELTE_FRAMEWORK, componentName: 'ForgeTabs' },
    );

    expect(compiled.code).toContain('{@render panel?.({ tab })}');
    expect(compiled.code).not.toContain('{panel?.({ tab })}');
  });

  it('lowers the production SchemaForm recursive renderField helper', () => {
    const compiled = compileComponentModule(
      source('packages/ui/forms/src/components/organisms/forge-schema-form/forge-schema-form.tsx'),
      { framework: SVELTE_FRAMEWORK, componentName: 'ForgeSchemaForm' },
    );

    expect(compiled.code).toContain('{#snippet renderField(field, path)}');
    expect(compiled.code).toContain('{@render renderField(field, field.key)}');
    expect(compiled.code).not.toMatch(/\{renderField\(/);
  });
});
