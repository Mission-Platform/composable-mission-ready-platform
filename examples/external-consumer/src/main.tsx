import React from 'react';
import {createRoot} from 'react-dom/client';
// Bare specifier import — relies on export conditions
import {ForgeButton} from '@mission-platform/components';

function App() {
  return (
    <div>
      <h1>Mission Platform External Consumer</h1>
      <ForgeButton onClick={() => alert('Clicked!')}> Click Me </ForgeButton>
    </div>
  );
}

const container = document.getElementById('app');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
