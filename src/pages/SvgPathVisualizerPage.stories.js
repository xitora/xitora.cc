// SvgPathVisualizerPage 컴포넌트 스토리
import SvgPathVisualizerPage from './SvgPathVisualizerPage';

export default {
  title: 'Pages/SvgPathVisualizerPage',
  component: SvgPathVisualizerPage,
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {
  args: {
    onNavigate: (path) => console.log('Navigate to:', path),
  },
};
