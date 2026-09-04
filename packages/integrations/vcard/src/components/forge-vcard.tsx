import { ForgeCard, ForgeStack } from '@mission-platform/components';
import { ForgeTypography } from '@mission-platform/typography';

import { toVCardOptions, type VCard, type VCardOptions } from '../ast/vcard';

import type { MpElement } from '@mission-platform/forge-jsx';

export interface ForgeVCardProperties {
  card: VCard | VCardOptions;
  title?: string;
  showEmptyFields?: boolean;
}

function values(card: VCard | VCardOptions): VCardOptions {
  return 'properties' in card ? toVCardOptions(card) : card;
}

function field(label: string, value: string | string[] | undefined): [string, string | string[] | undefined] {
  return [label, value];
}

export function ForgeVCard(properties: Readonly<ForgeVCardProperties>): MpElement {
  const contact = values(properties.card);
  const fields = [
    field('Name', contact.formattedName ?? [contact.firstName, contact.lastName].filter(Boolean).join(' ')),
    field('Organization', contact.organization),
    field('Title', contact.title),
    field('Phone', contact.phone),
    field('Email', contact.email),
    field('Website', contact.url),
    field('Address', contact.address),
    field('Note', contact.note),
  ].filter(([, value]) => properties.showEmptyFields || (value !== undefined && value !== ''));
  return (
    <ForgeCard>
      <ForgeTypography
        as="h2"
        variant="h2"
      >
        {properties.title ?? 'Contact'}
      </ForgeTypography>
      <ForgeStack
        direction="vertical"
        gap="sm"
      >
        {fields.map((item) => (
          <ForgeStack
            key={item[0]}
            direction="vertical"
            gap="2xs"
          >
            <ForgeTypography variant="label">{item[0]}</ForgeTypography>
            <ForgeTypography>{Array.isArray(item[1]) ? item[1].join(', ') : (item[1] ?? '—')}</ForgeTypography>
          </ForgeStack>
        ))}
      </ForgeStack>
    </ForgeCard>
  );
}
