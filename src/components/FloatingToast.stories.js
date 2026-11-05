import React from 'react';
import FloatingToast from './FloatingToast';

export default {
  title: 'Components/FloatingToast',
  component: FloatingToast,
};

export const Default = () => (
  <div style={{ height: '300px', position: 'relative', background: '#09090b', padding: '40px' }}>
    <FloatingToast message="클립보드에 복사되었습니다." />
  </div>
);
