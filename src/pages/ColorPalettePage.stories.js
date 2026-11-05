import React from 'react';
import ColorPalettePage from './ColorPalettePage';

export default {
  title: 'Pages/ColorPalettePage',
  component: ColorPalettePage,
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {
  render: () => (
    <div style={{ background: '#060606', minHeight: '100vh', color: '#f0f0f0' }}>
      <ColorPalettePage onNavigate={(path) => console.log('Navigate to:', path)} />
    </div>
  ),
};
