import { executeRegexAnalysis } from '../utils/regexTester';

self.onmessage = (event: MessageEvent<{ pattern: string; flags: string; text: string; replacement: string }>) => {
  const { pattern, flags, text, replacement } = event.data;
  self.postMessage(executeRegexAnalysis(pattern, flags, text, replacement));
};
