import React from 'react';
import FloatingToolHeader from './FloatingToolHeader';

export default {
  title: 'Components/FloatingToolHeader',
  component: FloatingToolHeader,
  parameters: {
    layout: 'centered',
  },
};

export const Default = {
  render: () => (
    <div style={{ background: '#060606', minHeight: '300px', width: '100vw', padding: '40px', color: '#f0f0f0' }}>
      <FloatingToolHeader
        toolName="도구 이름 샘플"
        categoryName="도구"
        categoryPath="/tools"
        onNavigate={(path) => console.log('Navigate to:', path)}
        miniWidgetContent={<span style={{ color: '#38bdf8', fontSize: '0.85rem' }}>미니 위젯 활성화 상태</span>}
      />
    </div>
  ),
};
