// MockDataGeneratorPage 컴포넌트 스토리
import MockDataGeneratorPage from './MockDataGeneratorPage';

export default {
  title: 'Pages/MockDataGeneratorPage',
  component: MockDataGeneratorPage,
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {
  args: {
    onNavigate: (path) => console.log('Navigate to:', path),
  },
};
