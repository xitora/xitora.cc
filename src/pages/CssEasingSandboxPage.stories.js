// CssEasingSandboxPage 컴포넌트 스토리
import CssEasingSandboxPage from './CssEasingSandboxPage';

export default {
  title: 'Pages/CssEasingSandboxPage',
  component: CssEasingSandboxPage,
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {
  args: {
    onNavigate: (path) => console.log('Navigate to:', path),
  },
};
