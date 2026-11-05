import React from 'react';
import DutchPayPage from './DutchPayPage';

export default {
  title: 'Pages/DutchPayPage',
  component: DutchPayPage,
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = () => (
  <DutchPayPage onNavigate={(path) => console.log('Navigate to:', path)} />
);
