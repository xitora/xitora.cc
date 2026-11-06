import React from 'react';
import JwtDebuggerPage from './JwtDebuggerPage';

export default {
  title: 'Pages/JwtDebuggerPage',
  component: JwtDebuggerPage,
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = () => (
  <JwtDebuggerPage onNavigate={(path) => console.log('Navigate to:', path)} />
);
