import React from 'react';
import {createRoot} from 'react-dom/client';
// Bare specifier import — relies on export conditions
import {BaseButton} from '@mission-platform/components';

function App() {
  return (
    <div>
      <h1>Mission Platform External Consumer</h1>
      <BaseButton onClick={() => alert('Clicked!')}> Click Me </BaseButton>
    </div>
  );
}

const container = document.getElementById('app');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
