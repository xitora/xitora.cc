import React from 'react';
import QrGeneratorPage from './QrGeneratorPage';

export default {
  title: 'Pages/QrGeneratorPage',
  component: QrGeneratorPage,
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {
  render: () => (
    <div style={{ background: '#060606', minHeight: '100vh', color: '#f0f0f0' }}>
      <QrGeneratorPage onNavigate={(path) => console.log('Navigate to:', path)} />
    </div>
  ),
};
