import React from 'react';
import {createRoot} from 'react-dom/client';
// Bare specifier import — the framework build is picked by this app's
// `resolve.conditions` (`mp:react`), never by the specifier itself.
import {ForgeButton} from '@mission-platform/components';
// Per-component subpath import — pulls in only this component's chunk (not the
// whole barrel), so heavy optional components (e.g. the Monaco editor and its
// web workers) never reach the client bundle. Note there is no framework
// segment: the same condition that resolves the bare entry also resolves this
// deep path to the selected framework's build.
import {ForgeBadge} from '@mission-platform/components/atoms/forge-badge/forge-badge';

function App() {
  return (
    <div>
      <h1>Mission Platform External Consumer</h1>
      <ForgeButton onClick={() => alert('Clicked!')}> Click Me </ForgeButton>
      <ForgeBadge>New</ForgeBadge>
    </div>
  );
}

const container = document.getElementById('app');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
