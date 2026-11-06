// UrlParserPage 컴포넌트 스토리
import UrlParserPage from './UrlParserPage';

export default {
  title: 'Pages/UrlParserPage',
  component: UrlParserPage,
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {
  args: {
    onNavigate: (path) => console.log('Navigate to:', path),
  },
};
