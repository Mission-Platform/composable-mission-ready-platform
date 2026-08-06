import React from 'react';
import {createRoot} from 'react-dom/client';
// Bare specifier import — relies on export conditions.
import {ForgeButton} from '@mission-platform/components';
// Per-component subpath import — pulls in only this component's chunk (not the
// whole React barrel), so heavy optional components (e.g. the Monaco editor and
// its web workers) never reach the client bundle.
import {ForgeBadge} from '@mission-platform/components/react/atoms/forge-badge/forge-badge';

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
