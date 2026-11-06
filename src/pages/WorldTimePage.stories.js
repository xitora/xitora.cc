import React from 'react';
import WorldTimePage from './WorldTimePage';

export default {
  title: 'Pages/WorldTimePage',
  component: WorldTimePage,
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {
  render: () => (
    <div style={{ background: '#060606', minHeight: '100vh', color: '#f0f0f0' }}>
      <WorldTimePage onNavigate={(path) => console.log('Navigate to:', path)} />
    </div>
  ),
};
