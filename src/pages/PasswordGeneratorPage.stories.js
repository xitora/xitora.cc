import React from 'react';
import PasswordGeneratorPage from './PasswordGeneratorPage';

export default {
  title: 'Pages/PasswordGeneratorPage',
  component: PasswordGeneratorPage,
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {
  render: () => (
    <div style={{ background: '#060606', minHeight: '100vh', color: '#f0f0f0' }}>
      <PasswordGeneratorPage onNavigate={(path) => console.log('Navigate to:', path)} />
    </div>
  ),
};
