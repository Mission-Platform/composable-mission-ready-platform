import { Avatar, Badge, Button } from '@mission-platform/components/react';
import { useI18n } from '@mission-platform/i18n/react';

import { Card, Stack } from './jsx-react';

/**
 * Minimal landing page for the React Storybook app. The real workbench is
 * Storybook (`pnpm storybook`); this page just renders a few of the
 * cross-framework `@mission-platform/components` React builds so
 * `pnpm dev` shows something useful.
 */
export default function App() {
  const { t } = useI18n();
  return (
    <main>
      <header className="app__header">
        <h1>{t(($) => $.title, { ns: 'mp.storybook-react', defaultValue: 'Mission Platform Components' })}</h1>
        <p>
          {t(($) => $.description.before, { ns: 'mp.storybook-react', defaultValue: 'A React showcase for' })}{' '}
          <code>@mission-platform/components/react</code>.{' '}
          {t(($) => $.description.after, {
            ns: 'mp.storybook-react',
            defaultValue: 'Open Storybook to explore the full component library.',
          })}
        </p>
      </header>

      <Card
        padding="lg"
        shadow
        header={<strong>{t(($) => $.components, { ns: 'mp.storybook-react', defaultValue: 'Components' })}</strong>}
      >
        <Stack
          direction="horizontal"
          gap="md"
          align="center"
          wrap
        >
          <Button variant="primary">
            {t(($) => $.button.primary, { ns: 'mp.storybook-react', defaultValue: 'Primary' })}
          </Button>
          <Button variant="secondary">
            {t(($) => $.button.secondary, { ns: 'mp.storybook-react', defaultValue: 'Secondary' })}
          </Button>
          <Button
            variant="tertiary"
            badge={3}
          >
            {t(($) => $.button.tertiary, { ns: 'mp.storybook-react', defaultValue: 'Notifications' })}
          </Button>
          <Badge variant="success">
            {t(($) => $.badge.success, { ns: 'mp.storybook-react', defaultValue: 'Success' })}
          </Badge>
          <Badge
            variant="primary"
            pill
          >
            {t(($) => $.badge.pill, { ns: 'mp.storybook-react', defaultValue: 'Pill badge' })}
          </Badge>
          <Avatar
            initials="MP"
            status="online"
          />
        </Stack>
      </Card>
    </main>
  );
}
