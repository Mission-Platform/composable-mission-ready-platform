import { Avatar, Badge, Button } from '@mission-platform/components/react';

import { Card, Stack } from './jsx-react';

/**
 * Minimal landing page for the React Storybook app. The real workbench is
 * Storybook (`pnpm storybook`); this page just renders a few of the
 * cross-framework `@mission-platform/components` React builds so
 * `pnpm dev` shows something useful.
 */
export default function App() {
  return (
    <main>
      <header className="app__header">
        <h1>Mission Platform — React</h1>
        <p>
          Write-once components from <code>@mission-platform/components/react</code>. Explore the full catalogue in
          Storybook.
        </p>
      </header>

      <Card
        padding="lg"
        shadow
        header={<strong>Components</strong>}
      >
        <Stack
          direction="horizontal"
          gap="md"
          align="center"
          wrap
        >
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button
            variant="tertiary"
            badge={3}
          >
            Tertiary
          </Button>
          <Badge variant="success">Success</Badge>
          <Badge
            variant="primary"
            pill
          >
            Pill
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
