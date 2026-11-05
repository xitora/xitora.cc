import React, { useState, useEffect, useId, useMemo } from 'react';
import { Check, Copy, Download, Maximize2, Minimize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import python from 'highlight.js/lib/languages/python';
import markdown from 'highlight.js/lib/languages/markdown';
import 'highlight.js/styles/atom-one-dark.css';

// 자주 쓰이는 주요 프로그래밍 언어만 선별 등록하여 번들 크기 최적화 (190개 언어 전체 번들링 방지)
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('css', css);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('json', json);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sh', bash);
hljs.registerLanguage('shell', bash);
hljs.registerLanguage('python', python);
hljs.registerLanguage('py', python);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('md', markdown);

interface CodeBlockProps {
  language: string;
  code: string;
  extension?: string;
}

const extensionMap: Record<string, string> = {
  javascript: 'js',
  typescript: 'ts',
  css: 'css',
  html: 'html',
  python: 'py',
  json: 'json',
  bash: 'sh',
  shell: 'sh',
  react: 'tsx',
  vue: 'vue'
};

export function CodeBlock({ language, code, extension }: CodeBlockProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const id = useId();

  // Prevent background scroll and Lenis scroll when expanded
  useEffect(() => {
    if (isExpanded) {
      document.body.style.overflow = 'hidden';
      (window as any).__lenis?.stop();
    } else {
      document.body.style.overflow = '';
      (window as any).__lenis?.start();
    }
    return () => {
      document.body.style.overflow = '';
      (window as any).__lenis?.start();
    };
  }, [isExpanded]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  const handleDownload = () => {
    const ext = extension || extensionMap[language.toLowerCase()] || language.toLowerCase() || 'txt';
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const highlightedCode = useMemo(() => {
    try {
      const cleanLang = (language || '').toLowerCase().trim();
      if (cleanLang && hljs.getLanguage(cleanLang)) {
        return hljs.highlight(code, { language: cleanLang, ignoreIllegals: true }).value;
      }
      return hljs.highlightAuto(code).value;
    } catch (err) {
      console.error('Syntax highlighting error:', err);
      return code;
    }
  }, [code, language]);

  const renderContent = (expanded: boolean) => (
    <motion.div 
      layoutId={expanded ? `codeblock-${id}` : (isExpanded ? undefined : `codeblock-${id}`)}
      className={`code-block-wrapper ${expanded ? 'expanded' : ''}`}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={expanded ? { margin: 0, height: '100%', maxHeight: '90vh', minHeight: 0, boxShadow: '0 24px 48px rgba(0,0,0,0.5)', width: '100%', display: 'flex', flexDirection: 'column' } : {}}
    >
      <motion.div layout="position" className="code-block-header">
        <span className="code-language">{language.toUpperCase()}</span>
        <div className="code-actions">
          <button onClick={handleCopy} className="code-btn" title="복사">
            {isCopied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
          </button>
          <button onClick={handleDownload} className="code-btn" title="다운로드">
            <Download size={16} />
          </button>
          <button onClick={() => setIsExpanded(!isExpanded)} className="code-btn" title={expanded ? "축소" : "확장"}>
            {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </motion.div>
      <motion.div 
        layout="position" 
        className="code-block-body" 
        data-lenis-prevent={expanded ? "true" : undefined}
        onWheel={(e) => {
          if (expanded) e.stopPropagation();
        }}
        style={{ 
          flexGrow: expanded ? 1 : 0, 
          overflow: 'auto', 
          minHeight: 0,
          overscrollBehavior: expanded ? 'contain' : 'auto'
        }}
      >
        <pre><code className={`hljs language-${language}`} dangerouslySetInnerHTML={{ __html: highlightedCode }} /></pre>
      </motion.div>
    </motion.div>
  );

  return (
    <>
      <div style={{ visibility: isExpanded ? 'hidden' : 'visible' }}>
        {renderContent(false)}
      </div>
      
      <AnimatePresence>
        {isExpanded && (
          <div 
            className="code-block-overlay"
            data-lenis-prevent="true"
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            <motion.div 
              className="code-block-overlay-bg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              onClick={() => setIsExpanded(false)}
            />
            
            <div 
              className="code-block-expanded-container"
              data-lenis-prevent="true"
              onWheel={(e) => e.stopPropagation()}
            >
              {renderContent(true)}
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
