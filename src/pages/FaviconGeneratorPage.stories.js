// FaviconGeneratorPage 컴포넌트 스토리
import FaviconGeneratorPage from './FaviconGeneratorPage';

export default {
  title: 'Pages/FaviconGeneratorPage',
  component: FaviconGeneratorPage,
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {
  args: {
    onNavigate: (path) => console.log('Navigate to:', path),
  },
};
