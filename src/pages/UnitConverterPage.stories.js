import React from 'react';
import UnitConverterPage from './UnitConverterPage';

export default {
  title: 'Pages/UnitConverterPage',
  component: UnitConverterPage,
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = () => (
  <UnitConverterPage onNavigate={(path) => console.log('Navigate to:', path)} />
);
