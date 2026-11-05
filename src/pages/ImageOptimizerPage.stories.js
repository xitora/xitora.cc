import React from 'react';
import ImageOptimizerPage from './ImageOptimizerPage';

export default {
  title: 'Pages/ImageOptimizerPage',
  component: ImageOptimizerPage,
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {
  render: () => (
    <div style={{ background: '#060606', minHeight: '100vh', color: '#f0f0f0' }}>
      <ImageOptimizerPage onNavigate={(path) => console.log('Navigate to:', path)} />
    </div>
  ),
};
