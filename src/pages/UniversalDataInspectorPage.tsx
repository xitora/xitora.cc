import React, { useState, useEffect, useMemo } from 'react';
import { formats, categories } from '../utils/converters';
import { Settings2, ArrowUpDown, Copy, Check, ChevronLeft, AlertCircle, Trash2 } from 'lucide-react';
import { utf8ToBytes } from '../utils/core';
import { motion } from 'framer-motion';
import FloatingToolHeader from '../components/FloatingToolHeader';
import './inspector-tailwind.css';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function UniversalDataInspectorPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [input, setInput] = useState('');
  const [inputFormatId, setInputFormatId] = useState<string>('utf8');
  const [outputFormatId, setOutputFormatId] = useState<string>('base64');

  const [delimiter, setDelimiter] = useState('Space');
  const [hexUpper, setHexUpper] = useState(false);

  const [outputText, setOutputText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);

  const debouncedInput = useDebounce(input, 150);

  useEffect(() => {
    const process = async () => {
      if (!debouncedInput) {
        setOutputText('');
        setError(null);
        return;
      }
      try {
        const inFormat = formats.find(f => f.id === inputFormatId);
        const outFormat = formats.find(f => f.id === outputFormatId);

        let plainText = debouncedInput;
        // 1. 입력 포맷 -> 평문 (utf8) 디코딩
        if (inFormat && inFormat.id !== 'utf8') {
          if (!inFormat.decode) throw new Error('선택한 입력 포맷은 디코딩을 지원하지 않습니다.');
          plainText = await inFormat.decode(debouncedInput, { delimiter, hexUpper });
        }

        let result = plainText;
        // 2. 평문 -> 출력 포맷 인코딩
        if (outFormat && outFormat.id !== 'utf8') {
          result = await outFormat.encode(plainText, { delimiter, hexUpper });
        }

        setOutputText(result);
        setError(null);
      } catch (err: any) {
        setOutputText('');
        setError(err.message || '변환 중 오류가 발생했습니다.');
      }
    };
    process();
  }, [debouncedInput, inputFormatId, outputFormatId, delimiter, hexUpper]);

  const handleSwap = () => {
    setInputFormatId(outputFormatId);
    setOutputFormatId(inputFormatId);
    setInput(outputText);
  };

  const handleCopy = () => {
    if (!outputText) return;
    navigator.clipboard.writeText(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const metrics = useMemo(() => {
    if (!debouncedInput) return { chars: 0, bytes: 0, words: 0, lines: 0 };
    return {
      chars: debouncedInput.length,
      bytes: utf8ToBytes(debouncedInput).length,
      words: debouncedInput.trim() ? debouncedInput.trim().split(/\s+/).length : 0,
      lines: debouncedInput.split('\n').length
    };
  }, [debouncedInput]);

  const fadeUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } }
  };

  const renderFormatOptions = () => {
    return categories.map(c => (
      <optgroup key={c} label={c}>
        {formats.filter(f => f.category === c).map(f => (
          <option key={f.id} value={f.id}>{f.name}</option>
        ))}
      </optgroup>
    ));
  };

  return (
    <motion.div className="page-layout post-detail-layout inspector-wrapper" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
      {/* 1. 상단 플로팅 헤더 알약 */}
      <FloatingToolHeader
        toolName="포맷 변환 도구"
        categoryName="도구"
        categoryPath="/tools"
        onNavigate={onNavigate}
        miniWidgetContent={
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem' }}>
            <span style={{ color: '#0395FC', fontWeight: 600 }}>{inputFormatId.toUpperCase()}</span>
            <span style={{ color: 'var(--text-muted)' }}>➔</span>
            <span style={{ color: '#0395FC', fontWeight: 600 }}>{outputFormatId.toUpperCase()}</span>
          </div>
        }
      />

      <aside className="post-sidebar post-sidebar-left"></aside>

      <div className="post-detail-container" style={{ maxWidth: '880px', paddingBottom: 120 }}>
        <button onClick={() => onNavigate('/tools')} className="back-btn" style={{ marginBottom: 20 }}>
          <ChevronLeft size={18} />
          <span>목록으로</span>
        </button>

        {/* SVG 그라데이션 정의 (좌상단 #014AFF > 우하단 #0395FC) */}
        <svg width="0" height="0" style={{ position: "absolute", pointerEvents: "none" }}>
          <linearGradient id="toolIconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#014AFF" />
            <stop offset="100%" stopColor="#0395FC" />
          </linearGradient>
        </svg>

        {/* 3. 헤더 타이틀 */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(1, 74, 255, 0.14) 0%, rgba(3, 149, 252, 0.14) 100%)',
                border: '1px solid rgba(1, 74, 255, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Settings2 size={24} stroke="url(#toolIconGradient)" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, letterSpacing: '-0.03em' }}>
                포맷 변환 도구
              </h1>
              <p style={{ fontSize: '0.92rem', color: '#888', margin: 0, marginTop: 4 }}>
                텍스트 포맷 변환 도구 (입력 → 출력)
              </p>
            </div>
          </div>
        </div>

        <motion.div variants={fadeUp} initial="initial" animate="animate">
          {/* 상단 공통 설정 바 */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 20px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings2 size={16} color="#0395FC" /> 세부 옵션
            </span>
            <div style={{ width: '1px', height: '20px', background: 'var(--border)' }}></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>구분자:</span>
              <select
                value={delimiter}
                onChange={(e) => setDelimiter(e.target.value)}
                style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 8px', color: 'var(--text-main)', outline: 'none' }}
              >
                <option value="None">구분자 없음</option>
                <option value="Space">공백 (Space)</option>
                <option value="Comma">쉼표 (Comma)</option>
                <option value="Colon">콜론 (Colon)</option>
                <option value="0x">0x 접두어</option>
                <option value="0b">0b 접두어</option>
              </select>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-main)', fontSize: '0.88rem' }}>
              <input
                type="checkbox"
                checked={hexUpper}
                onChange={(e) => setHexUpper(e.target.checked)}
                style={{ cursor: 'pointer', accentColor: '#014AFF' }}
              />
              대문자 헥스
            </label>
          </div>

          {/* 상/하단 변환 패널 컨테이너 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* 1. 상단: 입력 패널 */}
            <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>입력 포맷:</span>
                  <select
                    value={inputFormatId}
                    onChange={(e) => setInputFormatId(e.target.value)}
                    style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 10px', color: 'var(--text-main)', outline: 'none', fontSize: '0.88rem', fontWeight: 600, minWidth: 0, maxWidth: '240px' }}
                  >
                    {renderFormatOptions()}
                  </select>
                </div>
                <button onClick={() => setInput('')} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', flexShrink: 0 }} title="입력 데이터 지우기">
                  <Trash2 size={16} />
                  <span className="hidden sm:inline">지우기</span>
                </button>
              </div>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="변환할 데이터를 입력하세요..."
                style={{ width: '100%', minHeight: '180px', padding: '16px 20px', background: 'transparent', border: 'none', outline: 'none', resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: 1.6 }}
                spellCheck="false"
              />
              <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border)', background: 'rgba(255, 255, 255, 0.01)', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '20px' }}>
                <span>글자수: {metrics.chars}</span>
                <span>바이트: {metrics.bytes}</span>
                <span>단어: {metrics.words}</span>
                <span>줄: {metrics.lines}</span>
              </div>
            </div>

            {/* 2. 중앙: 전환(Swap) 버튼 - 좌/우 분리 구분선 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '8px 0', width: '100%' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              <button
                onClick={handleSwap}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 20px',
                  borderRadius: '24px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
                  flexShrink: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#014AFF';
                  e.currentTarget.style.color = '#0395FC';
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.background = 'var(--bg-card-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.color = 'var(--text-main)';
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.background = 'var(--bg-card)';
                }}
                title="입력/출력 전환"
              >
                <ArrowUpDown size={16} />
                <span>포맷 전환</span>
              </button>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            </div>

            {/* 3. 하단: 출력 패널 */}
            <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', border: `1px solid ${error ? '#ef4444' : 'var(--border)'}`, borderRadius: '16px', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>출력 포맷:</span>
                  <select
                    value={outputFormatId}
                    onChange={(e) => setOutputFormatId(e.target.value)}
                    style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 10px', color: 'var(--text-main)', outline: 'none', fontSize: '0.88rem', fontWeight: 600, minWidth: 0, maxWidth: '240px' }}
                  >
                    {renderFormatOptions()}
                  </select>
                </div>
                <button onClick={handleCopy} style={{ background: 'transparent', border: 'none', color: copied ? '#0395FC' : 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 500, flexShrink: 0 }} title="출력 결과 복사하기">
                  {copied ? <Check size={16} color="#0395FC" /> : <Copy size={16} />}
                  <span className="hidden sm:inline">{copied ? '복사됨!' : '복사하기'}</span>
                </button>
              </div>
              <div style={{ position: 'relative', minHeight: '180px' }}>
                <textarea
                  value={error ? '' : outputText}
                  readOnly
                  placeholder={error ? '' : '변환 결과가 여기에 표시됩니다...'}
                  style={{ width: '100%', height: '100%', minHeight: '180px', padding: '16px 20px', background: 'transparent', border: 'none', outline: 'none', resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: 1.6 }}
                  spellCheck="false"
                />
                {error && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center', gap: '10px', background: 'rgba(239, 68, 68, 0.05)' }}>
                    <AlertCircle size={36} color="#ef4444" opacity={0.9} />
                    <span style={{ color: '#ef4444', fontSize: '0.95rem', fontWeight: 500 }}>{error}</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </motion.div>
      </div>

      <aside className="post-sidebar post-sidebar-right"></aside>
    </motion.div>
  );
}
