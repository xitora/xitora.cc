import React from 'react';
import RegexTesterPage from './RegexTesterPage';

export default {
  title: 'Pages/RegexTesterPage',
  component: RegexTesterPage,
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {
  render: () => (
    <div style={{ background: '#060606', minHeight: '100vh', color: '#f0f0f0' }}>
      <RegexTesterPage onNavigate={(path) => console.log('Navigate to:', path)} />
    </div>
  ),
};
