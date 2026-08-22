import { describe, expect, it } from 'vitest';

import { findForgeComponent, getForgeComponent } from './registry';

describe('Forge component registry', () => {
  it('maps an approved Figma button name to its neutral Forge import contract', () => {
    const button = getForgeComponent('forge-button');

    expect(button.name).toBe('ForgeButton');
    expect(button.importPath).toBe('@mission-platform/components');
    expect(button.variants).toContain('primary');
    expect(button.states).toContain('loading');
    expect(button.props.find((property) => property.name === 'variant')?.values).toContain('secondary');
    expect(button.slots.find((slot) => slot.name === 'default')?.required).toBe(true);
  });

  it('allows explicit plugin metadata to disambiguate a component name', () => {
    expect(findForgeComponent('Marketing CTA', { forgeName: 'ForgeButton' })?.name).toBe('ForgeButton');
    expect(findForgeComponent('unknown component')).toBeUndefined();
  });
});
