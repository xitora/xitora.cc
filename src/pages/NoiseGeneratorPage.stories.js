import React from 'react';
import NoiseGeneratorPage from './NoiseGeneratorPage';

export default {
  title: 'Pages/NoiseGeneratorPage',
  component: NoiseGeneratorPage,
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = () => (
  <NoiseGeneratorPage onNavigate={(path) => console.log('Navigate to:', path)} />
);
