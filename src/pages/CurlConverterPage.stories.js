import React from 'react';
import CurlConverterPage from './CurlConverterPage';

export default {
  title: 'Pages/CurlConverterPage',
  component: CurlConverterPage,
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = () => (
  <CurlConverterPage onNavigate={(path) => console.log('Navigate to:', path)} />
);
