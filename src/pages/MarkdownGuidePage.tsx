import React, { useState, useRef } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, Save, Edit3, Eye,
  Bold, Italic, Strikethrough, Code, Heading1, Heading2, Heading3, Heading4,
  Quote, List, ListOrdered, CheckSquare, Minus,
  Link, Image, Table, FileDown, ExternalLink,
  Keyboard, ListCollapse
} from 'lucide-react';
import { CodeBlock } from '../components/CodeBlock';
import { FileWidget, LinkWidget, PostImage } from '../data/posts';

const initialMarkdown = `---
id: "markdown-guide"
title: "마크다운 전체 서식 가이드"
category: "Dev"
date: "${new Date().toISOString()}"
bannerImg: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=800"
---

# 대제목 (H1)
## 섹션 제목 (H2)
### 소제목 (H3)
#### 미니 제목 (H4)

---

## 1. 텍스트 강조 및 스타일
일반 텍스트에 **굵게 (Bold)**, *기울임 (Italic)*, ~~취소선 (Strikethrough)~~ 서식을 적용할 수 있습니다.
외부 링크는 [xitora.cc 바로가기](https://xitora.cc) 와 같이 하이퍼링크로 삽입할 수 있습니다.
키보드 단축키를 표현할 때는 <kbd>Ctrl</kbd> + <kbd>B</kbd> 와 같이 \`<kbd>\` 태그를 사용합니다.
문장 내에서 \`inline code\`를 사용할 수도 있습니다.

> 이것은 인용구(Blockquote)입니다.
> > 중첩된 인용구도 깔끔하게 표현됩니다.

---

## 2. 목록 및 체크리스트
- 순서 없는 글머리 기호 1
- 순서 없는 글머리 기호 2
  - 들여쓰기된 하위 항목

1. 첫 번째 순서
2. 두 번째 순서
3. 세 번째 순서

- [x] 완료된 작업
- [ ] 진행 예정인 작업

---

## 3. 코드 블록 (Syntax Highlighting & Fullscreen)
\`\`\`typescript extension="App.tsx"
// 상단 우측 버튼으로 코드 복사 및 전체화면 확대가 가능합니다
function greeting(name: string): string {
  console.log(\`Hello, \${name}!\`);
  return "Welcome to the blog!";
}
\`\`\`

---

## 4. 접기 / 펼치기 (Accordion)
<details>
<summary>클릭하여 상세 내용 펼치기</summary>
<div class="details-content">
여기에 숨겨진 설명이나 추가 정보를 작성할 수 있습니다.
마크다운 서식도 자유롭게 포함 가능합니다.
</div>
</details>

---

## 5. 테이블 (표)
| 항목 | 설명 | 상태 |
| :--- | :--- | :---: |
| 프론트엔드 | React + Vite + TypeScript | 완료 |
| 스타일링 | Tailwind CSS + Modern CSS | 완료 |
| 애니메이션 | Framer Motion + Lenis | 적용됨 |

---

## 6. 미디어 및 전용 위젯
![코딩 이미지](https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=800 "샘플 이미지 캡션")

[LinkWidget](https://spotify.com)
[LinkWidget](https://github.com)

[FileWidget: 첨부파일 다운로드](https://drive.google.com/file/... "구글 드라이브 다운로드 카드 위젯")
`;

export function MarkdownGuidePage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 파일 다운로드 저장
  const handleSave = () => {
    try {
      const idMatch = markdown.match(/^id:\s*"([^"]+)"/m);
      const filename = idMatch ? `${idMatch[1]}.md` : 'new-post.md';
      
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert(`'${filename}' 파일이 다운로드되었습니다. 프로젝트의 src/data/posts/ 폴더에 넣으면 자동으로 새 글이 등록됩니다!`);
    } catch (error) {
      console.error('파일 저장 실패:', error);
      alert('파일 저장 중 오류가 발생했습니다.');
    }
  };

  // 인라인 서식 토글 및 삽입
  const handleInlineFormat = (before: string, after: string = before) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    try {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      const selectedText = value.substring(start, end);

      // 1. 선택된 텍스트 자체가 이미 before/after로 감싸져 있는 경우: 토글 해제 (Unwrap)
      if (
        selectedText.length >= before.length + after.length &&
        selectedText.startsWith(before) &&
        selectedText.endsWith(after)
      ) {
        const unwrapped = selectedText.slice(before.length, selectedText.length - after.length);
        const newValue = value.substring(0, start) + unwrapped + value.substring(end);
        setMarkdown(newValue);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start, start + unwrapped.length);
        }, 0);
        return;
      }

      // 2. 커서/선택영역 바로 바깥쪽이 before/after로 감싸져 있는 경우: 토글 해제 (Unwrap)
      const hasSurroundingPrefix = start >= before.length && value.substring(start - before.length, start) === before;
      const hasSurroundingSuffix = end + after.length <= value.length && value.substring(end, end + after.length) === after;

      if (hasSurroundingPrefix && hasSurroundingSuffix) {
        const newValue = value.substring(0, start - before.length) + selectedText + value.substring(end + after.length);
        setMarkdown(newValue);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start - before.length, start - before.length + selectedText.length);
        }, 0);
        return;
      }

      // 3. 커서가 서식 내부(단어 내부)에 위치해 있을 때 동일 줄 내에서 감싸진 서식 탐색 후 해제
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      let lineEnd = value.indexOf('\n', end);
      if (lineEnd === -1) lineEnd = value.length;
      const lineText = value.substring(lineStart, lineEnd);
      const cursorOffset = start - lineStart;

      let foundPair: { open: number; close: number } | null = null;
      let searchIdx = lineText.lastIndexOf(before, cursorOffset - 1);
      while (searchIdx !== -1) {
        const closeIdx = lineText.indexOf(after, searchIdx + before.length);
        if (closeIdx !== -1 && cursorOffset >= searchIdx + before.length && cursorOffset <= closeIdx) {
          foundPair = { open: searchIdx, close: closeIdx };
          break;
        }
        searchIdx = lineText.lastIndexOf(before, searchIdx - 1);
      }

      if (foundPair) {
        const absOpen = lineStart + foundPair.open;
        const absClose = lineStart + foundPair.close;
        const innerText = value.substring(absOpen + before.length, absClose);
        const newValue = value.substring(0, absOpen) + innerText + value.substring(absClose + after.length);
        setMarkdown(newValue);
        setTimeout(() => {
          textarea.focus();
          const newPos = Math.max(absOpen, Math.min(start - before.length, absOpen + innerText.length));
          textarea.setSelectionRange(newPos, newPos);
        }, 0);
        return;
      }

      // 4. 서식 신규 적용
      if (selectedText.length > 0) {
        const replacement = `${before}${selectedText}${after}`;
        const newValue = value.substring(0, start) + replacement + value.substring(end);
        setMarkdown(newValue);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
        }, 0);
      } else {
        // 빈 곳일 때: 텍스트 없이 서식문만 생성 후 커서를 중앙에 배치
        const replacement = `${before}${after}`;
        const newValue = value.substring(0, start) + replacement + value.substring(end);
        setMarkdown(newValue);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + before.length, start + before.length);
        }, 0);
      }
    } catch (error) {
      console.error('인라인 서식 적용 실패:', error);
    }
  };

  // 블록(라인) 서식 토글 및 삽입
  const handleBlockFormat = (type: 'h1' | 'h2' | 'h3' | 'h4' | 'quote' | 'bullet' | 'ordered' | 'task' | 'codeblock' | 'details' | 'hr') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    try {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      const selectedText = value.substring(start, end);

      if (type === 'codeblock') {
        if (selectedText.startsWith('```') && selectedText.endsWith('```')) {
          const lines = selectedText.split('\n');
          const unwrapped = lines.slice(1, -1).join('\n');
          const newValue = value.substring(0, start) + unwrapped + value.substring(end);
          setMarkdown(newValue);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start, start + unwrapped.length);
          }, 0);
          return;
        }

        const beforeText = value.substring(0, start);
        const afterText = value.substring(end);
        const needsPre = start > 0 && !beforeText.endsWith('\n\n') ? (beforeText.endsWith('\n') ? '\n' : '\n\n') : '';
        const needsPost = afterText.length > 0 && !afterText.startsWith('\n\n') ? (afterText.startsWith('\n') ? '\n' : '\n\n') : '';

        if (selectedText.length > 0) {
          const replacement = `${needsPre}\`\`\`typescript\n${selectedText}\n\`\`\`${needsPost}`;
          const newValue = beforeText + replacement + afterText;
          setMarkdown(newValue);
          setTimeout(() => {
            textarea.focus();
            const cursorPos = start + needsPre.length + 14;
            textarea.setSelectionRange(cursorPos, cursorPos + selectedText.length);
          }, 0);
        } else {
          // 빈 곳일 때: 텍스트 없이 코드블록만 생성 후 커서를 빈 줄에 위치
          const replacement = `${needsPre}\`\`\`typescript\n\n\`\`\`${needsPost}`;
          const newValue = beforeText + replacement + afterText;
          setMarkdown(newValue);
          setTimeout(() => {
            textarea.focus();
            const cursorPos = start + needsPre.length + 14;
            textarea.setSelectionRange(cursorPos, cursorPos);
          }, 0);
        }
        return;
      }

      if (type === 'details') {
        const beforeText = value.substring(0, start);
        const afterText = value.substring(end);
        const needsPre = start > 0 && !beforeText.endsWith('\n\n') ? (beforeText.endsWith('\n') ? '\n' : '\n\n') : '';
        const needsPost = afterText.length > 0 && !afterText.startsWith('\n\n') ? (afterText.startsWith('\n') ? '\n' : '\n\n') : '';

        const titleText = selectedText || '접기/펼치기 제목';
        const detailsTemplate = `<details>\n<summary>${titleText}</summary>\n<div class="details-content">\n\n</div>\n</details>`;
        const replacement = `${needsPre}${detailsTemplate}${needsPost}`;
        const newValue = beforeText + replacement + afterText;
        setMarkdown(newValue);
        setTimeout(() => {
          textarea.focus();
          const offsetInside = replacement.indexOf('<div class="details-content">\n') + 30;
          const cursorPos = start + offsetInside;
          textarea.setSelectionRange(cursorPos, cursorPos);
        }, 0);
        return;
      }

      if (type === 'hr') {
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        let lineEnd = value.indexOf('\n', end);
        if (lineEnd === -1) lineEnd = value.length;
        const currentLine = value.substring(lineStart, lineEnd);

        if (currentLine.trim() === '---') {
          const newValue = value.substring(0, lineStart) + value.substring(lineEnd === value.length ? lineEnd : lineEnd + 1);
          setMarkdown(newValue);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(lineStart, lineStart);
          }, 0);
          return;
        }

        const beforeText = value.substring(0, start);
        const afterText = value.substring(end);
        const needsPre = start > 0 && !beforeText.endsWith('\n\n') ? (beforeText.endsWith('\n') ? '\n' : '\n\n') : '';
        const needsPost = afterText.length > 0 && !afterText.startsWith('\n\n') ? (afterText.startsWith('\n') ? '\n' : '\n\n') : '';
        const replacement = `${needsPre}---\n${needsPost}`;
        const newValue = beforeText + replacement + afterText;
        setMarkdown(newValue);
        setTimeout(() => {
          textarea.focus();
          const nextPos = start + replacement.length;
          textarea.setSelectionRange(nextPos, nextPos);
        }, 0);
        return;
      }

      // 라인 기반 서식 (제목, 인용구, 목록류)
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      let lineEnd = value.indexOf('\n', end);
      if (lineEnd === -1) lineEnd = value.length;
      const currentLine = value.substring(lineStart, lineEnd);

      const prefixMap: Record<string, string> = {
        h1: '# ',
        h2: '## ',
        h3: '### ',
        h4: '#### ',
        quote: '> ',
        bullet: '- ',
        ordered: '1. ',
        task: '- [ ] '
      };

      const targetPrefix = prefixMap[type];
      let newLine = '';

      if (['h1', 'h2', 'h3', 'h4'].includes(type)) {
        if (currentLine.startsWith(targetPrefix)) {
          newLine = currentLine.substring(targetPrefix.length);
        } else if (currentLine.match(/^#{1,4}\s/)) {
          const existing = currentLine.match(/^#{1,4}\s/)![0];
          newLine = targetPrefix + currentLine.substring(existing.length);
        } else {
          newLine = targetPrefix + currentLine;
        }
      } else if (type === 'quote') {
        if (currentLine.startsWith('> ')) {
          newLine = currentLine.substring(2);
        } else {
          newLine = '> ' + currentLine;
        }
      } else if (type === 'bullet') {
        if (currentLine.startsWith('- [ ] ')) {
          newLine = '- ' + currentLine.substring(6);
        } else if (currentLine.startsWith('- ')) {
          newLine = currentLine.substring(2);
        } else {
          newLine = '- ' + currentLine;
        }
      } else if (type === 'ordered') {
        if (currentLine.startsWith('1. ')) {
          newLine = currentLine.substring(3);
        } else {
          newLine = '1. ' + currentLine;
        }
      } else if (type === 'task') {
        if (currentLine.startsWith('- [ ] ')) {
          newLine = currentLine.substring(6);
        } else if (currentLine.startsWith('- ')) {
          newLine = '- [ ] ' + currentLine.substring(2);
        } else {
          newLine = '- [ ] ' + currentLine;
        }
      }

      const newValue = value.substring(0, lineStart) + newLine + value.substring(lineEnd);
      setMarkdown(newValue);
      setTimeout(() => {
        textarea.focus();
        const cursorShift = newLine.length - currentLine.length;
        const newCursor = Math.max(lineStart, Math.min(start + cursorShift, lineStart + newLine.length));
        textarea.setSelectionRange(newCursor, newCursor);
      }, 0);
    } catch (error) {
      console.error('블록 서식 적용 실패:', error);
    }
  };

  // 링크, 이미지, 위젯 삽입
  const handleInsertMedia = (type: 'link' | 'image' | 'table' | 'file-widget' | 'link-widget') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    try {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      const selectedText = value.substring(start, end);

      if (type === 'link') {
        if (selectedText.length > 0) {
          const replacement = `[${selectedText}](https://)`;
          const newValue = value.substring(0, start) + replacement + value.substring(end);
          setMarkdown(newValue);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + selectedText.length + 3, start + replacement.length - 1);
          }, 0);
        } else {
          const replacement = `[](https://)`;
          const newValue = value.substring(0, start) + replacement + value.substring(end);
          setMarkdown(newValue);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + 1, start + 1);
          }, 0);
        }
      } else if (type === 'image') {
        if (selectedText.length > 0) {
          const replacement = `![${selectedText}](https://)`;
          const newValue = value.substring(0, start) + replacement + value.substring(end);
          setMarkdown(newValue);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + selectedText.length + 4, start + replacement.length - 1);
          }, 0);
        } else {
          const replacement = `![](https://)`;
          const newValue = value.substring(0, start) + replacement + value.substring(end);
          setMarkdown(newValue);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + 2, start + 2);
          }, 0);
        }
      } else if (type === 'table') {
        const tableTemplate = `| 항목 | 설명 | 비고 |
| :--- | :--- | :--- |
|      |      |      |
|      |      |      |`;
        const beforeText = value.substring(0, start);
        const afterText = value.substring(end);
        const needsPre = start > 0 && !beforeText.endsWith('\n\n') ? (beforeText.endsWith('\n') ? '\n' : '\n\n') : '';
        const needsPost = afterText.length > 0 && !afterText.startsWith('\n\n') ? (afterText.startsWith('\n') ? '\n' : '\n\n') : '';
        const replacement = `${needsPre}${tableTemplate}\n${needsPost}`;
        const newValue = beforeText + replacement + afterText;
        setMarkdown(newValue);
        setTimeout(() => {
          textarea.focus();
          const targetPos = start + needsPre.length + tableTemplate.indexOf('|      |') + 2;
          textarea.setSelectionRange(targetPos, targetPos);
        }, 0);
      } else if (type === 'file-widget') {
        const replacement = selectedText ? `[FileWidget: ${selectedText}]()\n` : `[FileWidget]()\n`;
        const newValue = value.substring(0, start) + replacement + value.substring(end);
        setMarkdown(newValue);
        setTimeout(() => {
          textarea.focus();
          const cursorPos = selectedText ? start + replacement.length - 3 : start + 12;
          textarea.setSelectionRange(cursorPos, cursorPos);
        }, 0);
      } else if (type === 'link-widget') {
        const isUrl = selectedText.startsWith('http://') || selectedText.startsWith('https://');
        const replacement = isUrl ? `[LinkWidget](${selectedText})\n` : `[LinkWidget](https://)\n`;
        const newValue = value.substring(0, start) + replacement + value.substring(end);
        setMarkdown(newValue);
        setTimeout(() => {
          textarea.focus();
          const cursorPos = isUrl ? start + replacement.length : start + 20;
          textarea.setSelectionRange(cursorPos, cursorPos);
        }, 0);
      }
    } catch (error) {
      console.error('미디어/위젯 삽입 실패:', error);
    }
  };

  // Tab 키(들여쓰기/내어쓰기) 및 단축키 핸들러
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;

      if (!e.shiftKey && start === end) {
        // 단일 커서일 때: 2칸 공백 들여쓰기
        const indentStr = '  ';
        const newValue = value.substring(0, start) + indentStr + value.substring(end);
        setMarkdown(newValue);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + indentStr.length, start + indentStr.length);
        }, 0);
      } else {
        // 여러 줄 선택 또는 Shift+Tab(내어쓰기)
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        let lineEnd = value.indexOf('\n', end);
        if (lineEnd === -1) lineEnd = value.length;

        const lines = value.substring(lineStart, lineEnd).split('\n');

        if (e.shiftKey) {
          // Shift+Tab: 앞쪽 공백(최대 2칸) 제거
          const updatedLines = lines.map((line) => {
            if (line.startsWith('  ')) return line.substring(2);
            if (line.startsWith(' ') || line.startsWith('\t')) return line.substring(1);
            return line;
          });
          const replaced = updatedLines.join('\n');
          const newValue = value.substring(0, lineStart) + replaced + value.substring(lineEnd);
          setMarkdown(newValue);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(lineStart, lineStart + replaced.length);
          }, 0);
        } else {
          // Tab: 각 줄 앞에 2칸 공백 추가
          const updatedLines = lines.map((line) => '  ' + line);
          const replaced = updatedLines.join('\n');
          const newValue = value.substring(0, lineStart) + replaced + value.substring(lineEnd);
          setMarkdown(newValue);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(lineStart, lineStart + replaced.length);
          }, 0);
        }
      }
      return;
    }

    // Ctrl/Cmd 단축키 지원
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        handleInlineFormat('**');
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        handleInlineFormat('*');
      }
    }
  };

  // 헤더 메타데이터 파싱
  const titleMatch = markdown.match(/^title:\s*"([^"]+)"/m);
  const categoryMatch = markdown.match(/^category:\s*"([^"]+)"/m);
  const dateMatch = markdown.match(/^date:\s*"([^"]+)"/m);
  const bannerImgMatch = markdown.match(/^bannerImg:\s*"([^"]+)"/m);

  const title = titleMatch ? titleMatch[1] : '새로운 포스트 제목';
  const category = categoryMatch ? categoryMatch[1] : 'Dev';
  const dateStr = dateMatch ? dateMatch[1] : new Date().toISOString();
  const bannerImg = bannerImgMatch ? bannerImgMatch[1] : '';
  
  let formattedDate = '날짜 형식 오류';
  try {
    formattedDate = new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric',
      weekday: 'long', hour: '2-digit', minute: '2-digit'
    }).format(new Date(dateStr));
  } catch (e) {
    // fallback
  }

  // 프론트매터 제거 후 본문만 추출
  const displayContent = markdown.replace(/^---[\s\S]+?---/, '').trim();

  return (
    <motion.div 
      className="page-layout"
      style={{ maxWidth: '1800px', margin: '0 auto', padding: '40px 24px 120px' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
    >
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="back-btn" onClick={() => onNavigate('/posts')}>
          <ChevronLeft size={20} /> 포스트 목록으로
        </button>
      </div>

      <div className="markdown-guide-layout">
        
        {/* Editor (Sticky on Desktop, Height bounded within viewport) */}
        <div 
          className="markdown-editor-pane"
          data-lenis-prevent
          onWheel={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexShrink: 0 }}>
            <h2 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, color: 'var(--text-muted)' }}>
              <Edit3 size={18} /> 에디터 (Frontmatter 포함)
            </h2>
            <button onClick={handleSave} className="nav-button" style={{ padding: '6px 14px', background: 'var(--surface-light)', borderRadius: '8px', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', gap: '6px', alignItems: 'center', fontSize: '0.85rem' }}>
              <Save size={15} /> 저장하기
            </button>
          </div>
          <div 
            className="post-detail-card" 
            data-lenis-prevent
            style={{ flex: 1, minHeight: 0, padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          >
            {/* 서식 툴바 */}
            <div className="editor-toolbar" role="toolbar" aria-label="마크다운 서식 툴바">
              {/* 제목 서식 */}
              <div className="editor-tool-group">
                <button
                  type="button"
                  className="editor-tool-btn"
                  title="제목 1 (H1)"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleBlockFormat('h1')}
                >
                  <Heading1 size={16} />
                </button>
                <button
                  type="button"
                  className="editor-tool-btn"
                  title="제목 2 (H2)"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleBlockFormat('h2')}
                >
                  <Heading2 size={16} />
                </button>
                <button
                  type="button"
                  className="editor-tool-btn"
                  title="제목 3 (H3)"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleBlockFormat('h3')}
                >
                  <Heading3 size={16} />
                </button>
                <button
                  type="button"
                  className="editor-tool-btn"
                  title="소제목 4 (H4)"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleBlockFormat('h4')}
                >
                  <Heading4 size={16} />
                </button>
              </div>

              <div className="editor-tool-separator" />

              {/* 인라인 텍스트 스타일 */}
              <div className="editor-tool-group">
                <button
                  type="button"
                  className="editor-tool-btn"
                  title="굵게 (Ctrl+B)"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleInlineFormat('**')}
                >
                  <Bold size={16} />
                </button>
                <button
                  type="button"
                  className="editor-tool-btn"
                  title="기울임 (Ctrl+I)"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleInlineFormat('*')}
                >
                  <Italic size={16} />
                </button>
                <button
                  type="button"
                  className="editor-tool-btn"
                  title="취소선"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleInlineFormat('~~')}
                >
                  <Strikethrough size={16} />
                </button>
                <button
                  type="button"
                  className="editor-tool-btn"
                  title="인라인 코드"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleInlineFormat('`')}
                >
                  <Code size={16} />
                </button>
                <button
                  type="button"
                  className="editor-tool-btn"
                  title="키보드 키캡 서식 (<kbd>)"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleInlineFormat('<kbd>', '</kbd>')}
                >
                  <Keyboard size={16} />
                </button>
              </div>

              <div className="editor-tool-separator" />

              {/* 블록 서식 */}
              <div className="editor-tool-group">
                <button
                  type="button"
                  className="editor-tool-btn"
                  title="인용구"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleBlockFormat('quote')}
                >
                  <Quote size={16} />
                </button>
                <button
                  type="button"
                  className="editor-tool-btn"
                  title="글머리 기호 목록"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleBlockFormat('bullet')}
                >
                  <List size={16} />
                </button>
                <button
                  type="button"
                  className="editor-tool-btn"
                  title="순서 있는 목록"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleBlockFormat('ordered')}
                >
                  <ListOrdered size={16} />
                </button>
                <button
                  type="button"
                  className="editor-tool-btn"
                  title="체크리스트"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleBlockFormat('task')}
                >
                  <CheckSquare size={16} />
                </button>
                <button
                  type="button"
                  className="editor-tool-btn"
                  title="코드 블록"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleBlockFormat('codeblock')}
                >
                  <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>&lt;/&gt;</span>
                </button>
                <button
                  type="button"
                  className="editor-tool-btn"
                  title="접기/펼치기 아코디언 (<details>)"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleBlockFormat('details')}
                >
                  <ListCollapse size={16} />
                </button>
                <button
                  type="button"
                  className="editor-tool-btn"
                  title="구분선"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleBlockFormat('hr')}
                >
                  <Minus size={16} />
                </button>
              </div>

              <div className="editor-tool-separator" />

              {/* 미디어 및 삽입 서식 */}
              <div className="editor-tool-group">
                <button
                  type="button"
                  className="editor-tool-btn"
                  title="링크"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleInsertMedia('link')}
                >
                  <Link size={16} />
                </button>
                <button
                  type="button"
                  className="editor-tool-btn"
                  title="이미지"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleInsertMedia('image')}
                >
                  <Image size={16} />
                </button>
                <button
                  type="button"
                  className="editor-tool-btn"
                  title="표 (Table)"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleInsertMedia('table')}
                >
                  <Table size={16} />
                </button>
              </div>

              <div className="editor-tool-separator" />

              {/* 전용 위젯 서식 */}
              <div className="editor-tool-group">
                <button
                  type="button"
                  className="editor-tool-btn widget-btn"
                  title="파일 다운로드 위젯 추가"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleInsertMedia('file-widget')}
                >
                  <FileDown size={14} /> 파일
                </button>
                <button
                  type="button"
                  className="editor-tool-btn widget-btn"
                  title="외부 링크 위젯 추가"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleInsertMedia('link-widget')}
                >
                  <ExternalLink size={14} /> 링크
                </button>
              </div>
            </div>

            {/* 에디터 본문 텍스트 영역 */}
            <textarea
              ref={textareaRef}
              data-lenis-prevent
              className="markdown-editor-textarea"
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              onKeyDown={handleKeyDown}
              onWheel={(e) => e.stopPropagation()}
              placeholder="여기에 마크다운을 입력하세요..."
              style={{
                flex: 1,
                width: '100%',
                height: '100%',
                minHeight: 0,
                background: 'transparent',
                border: 'none',
                color: 'var(--text-main)',
                fontFamily: 'var(--font-mono)',
                fontSize: '15px',
                lineHeight: '1.7',
                resize: 'none',
                outline: 'none',
                overflowY: 'auto',
                overscrollBehavior: 'contain'
              }}
            />
          </div>
        </div>

        {/* Preview (실제 본문 카드와 100% 동일하게 내용에 따라 자연스럽게 늘어남) */}
        <div className="markdown-preview-pane">
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, color: 'var(--text-muted)' }}>
              <Eye size={18} /> 실시간 미리보기
            </h2>
          </div>
          <div className="post-detail-card" style={{ height: 'auto', minHeight: 'unset', overflowY: 'visible' }}>
            {bannerImg && (
              <div className="post-banner-container">
                <img src={bannerImg} alt={title} className="post-banner-img" />
              </div>
            )}
            <header className="post-detail-header">
              <span className="post-category-label">{category}</span>
              <h1 className="post-title">{title}</h1>
              <time className="post-date">{formattedDate}</time>
            </header>

            <article className="post-article-body post-content">
              <Markdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  p(props) {
                    const hasImg = (props as any).node?.children?.some((c: any) => c.tagName === 'img' || c.tagName === 'figure');
                    const children = React.Children.toArray(props.children);
                    const isWidget = children.some((child: any) => {
                      if (React.isValidElement(child)) {
                        if (child.type === 'img' || child.type === 'figure') return true;
                        const childText = String((child as any).props?.children || '');
                        return (
                          childText.startsWith('LinkWidget:') ||
                          childText.startsWith('FileWidget:') ||
                          childText === 'LinkWidget' ||
                          childText === 'FileWidget'
                        );
                      }
                      return false;
                    });
                    if (hasImg || isWidget) {
                      return <div className="post-widget-wrapper">{props.children}</div>;
                    }
                    return <p {...props}>{props.children}</p>;
                  },
                  code(props) {
                    const {children, className, node, ...rest} = props;
                    const match = /language-(\w+)/.exec(className || '');
                    const meta = node?.data?.meta || '';
                    const extMatch = meta.match(/extension="([^"]+)"/);
                    const extension = extMatch ? extMatch[1] : undefined;
                    return match ? (
                      <CodeBlock language={match[1]} extension={extension} code={String(children).replace(/\n$/, '')} />
                    ) : (
                      <code className={className} {...rest}>{children}</code>
                    );
                  },
                  img(props) {
                    return <PostImage src={props.src || ''} alt={props.alt || ''} caption={props.title || undefined} />;
                  },
                  a(props) {
                    const text = String(props.children);
                    if (text.startsWith('FileWidget:')) {
                      const title = text.replace('FileWidget:', '').trim();
                      return <FileWidget title={title || '첨부 파일'} url={props.href || ''} desc={props.title || undefined} />;
                    }
                    if (text.startsWith('LinkWidget:')) {
                      const title = text.replace('LinkWidget:', '').trim();
                      return <LinkWidget title={title || undefined} url={props.href || ''} desc={props.title || undefined} />;
                    }
                    if (text === 'FileWidget') {
                      return <FileWidget title={props.title || '첨부 파일'} url={props.href || ''} desc={props.title || undefined} />;
                    }
                    if (text === 'LinkWidget') {
                      return <LinkWidget title={props.title || undefined} url={props.href || ''} desc={undefined} />;
                    }
                    // 내부 앵커 링크인 경우 페이지 내 이동 유지
                    if (props.href?.startsWith('#')) {
                      return <a href={props.href || ''} title={props.title}>{props.children}</a>;
                    }
                    // 일반 하이퍼링크: 항상 새 탭으로 열기 및 우측 ExternalLink 아이콘 추가
                    return (
                      <a
                        href={props.href || ''}
                        title={props.title}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="post-inline-link"
                      >
                        <span className="post-inline-link__text">{props.children}</span>
                        <span className="post-inline-link__icon" aria-hidden="true">
                          <ExternalLink size={14} />
                        </span>
                      </a>
                    );
                  }
                }}
              >
                {displayContent}
              </Markdown>
            </article>
          </div>
        </div>

      </div>
    </motion.div>
  );
}

export default MarkdownGuidePage;
