import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Database,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Download,
  Plus,
  Trash2,
  Table,
  FileCode,
  FileSpreadsheet,
  RefreshCw,
} from 'lucide-react';
import FloatingToolHeader from '../components/FloatingToolHeader';
import FloatingToast from '../components/FloatingToast';
import {
  MockFieldSchema,
  MockFieldType,
  generateMockDataSet,
  convertToCsv,
  MOCK_SCHEMA_PRESETS,
} from '../utils/mockData';

interface MockDataGeneratorPageProps {
  onNavigate: (path: string) => void;
}

const FIELD_TYPE_LABELS: Record<MockFieldType, string> = {
  uuid: 'UUID (v4 고유식별자)',
  nameKo: '한국어 이름 (예: 김민준)',
  nameEn: '영어 이름 (예: James Smith)',
  email: '이메일 주소',
  phone: '휴대폰 번호 (010-XXXX-XXXX)',
  address: '도로명 주소',
  city: '도시/행정구역',
  number: '숫자 (범위 지정)',
  date: '날짜 (최근 1년, YYYY-MM-DD)',
  boolean: '불리언 (true / false)',
};

export default function MockDataGeneratorPage({ onNavigate }: MockDataGeneratorPageProps) {
  // 현재 스키마 필드 목록 (프리셋 선택 전에는 비어있음)
  const [schema, setSchema] = useState<MockFieldSchema[]>([]);

  // 생성 건수
  const [count, setCount] = useState<number>(10);

  // 출력 형식 ('json' | 'csv' | 'table')
  const [outputFormat, setOutputFormat] = useState<'json' | 'csv' | 'table'>('json');

  // 난수 시드 갱신용 카운터
  const [generationKey, setGenerationKey] = useState<number>(0);

  // 복사 알림 토스트 상태
  const [copyToast, setCopyToast] = useState<string | null>(null);

  // 더미 데이터 생성
  const mockDataSet = useMemo(() => {
    if (generationKey < 0 || schema.length === 0) return [];
    return generateMockDataSet(schema, count);
  }, [schema, count, generationKey]);

  // JSON 문자열
  const jsonOutput = useMemo(() => {
    return JSON.stringify(mockDataSet, null, 2);
  }, [mockDataSet]);

  // CSV 문자열
  const csvOutput = useMemo(() => {
    return convertToCsv(mockDataSet);
  }, [mockDataSet]);

  // 필드 추가
  const handleAddField = () => {
    const newId = String(Date.now());
    setSchema((prev) => [
      ...prev,
      { id: newId, key: `field_${prev.length + 1}`, type: 'nameKo' },
    ]);
  };

  // 필드 삭제
  const handleRemoveField = (id: string) => {
    setSchema((prev) => prev.filter((f) => f.id !== id));
  };

  // 필드 키 변경
  const handleKeyChange = (id: string, newKey: string) => {
    setSchema((prev) =>
      prev.map((f) => (f.id === id ? { ...f, key: newKey } : f))
    );
  };

  // 필드 타입 변경
  const handleTypeChange = (id: string, newType: MockFieldType) => {
    setSchema((prev) =>
      prev.map((f) => {
        if (f.id === id) {
          const updated: MockFieldSchema = { ...f, type: newType };
          if (newType === 'number') {
            updated.min = updated.min ?? 1;
            updated.max = updated.max ?? 100;
          }
          return updated;
        }
        return f;
      })
    );
  };

  // 숫자 범위 변경
  const handleNumberRangeChange = (id: string, min?: number, max?: number) => {
    setSchema((prev) =>
      prev.map((f) => (f.id === id ? { ...f, min, max } : f))
    );
  };

  // 프리셋 적용
  const handleApplyPreset = (presetSchema: MockFieldSchema[]) => {
    setSchema(JSON.parse(JSON.stringify(presetSchema)));
    setGenerationKey((k) => k + 1);
  };

  // 초기화 (완전 비우기)
  const handleReset = () => {
    setSchema([]);
    setCount(10);
    setGenerationKey((k) => k + 1);
  };

  // 데이터 다시 생성
  const handleRegenerate = () => {
    setGenerationKey((k) => k + 1);
  };

  // 클립보드 복사
  const handleCopy = useCallback(async () => {
    try {
      const textToCopy = outputFormat === 'csv' ? csvOutput : jsonOutput;
      await navigator.clipboard.writeText(textToCopy);
      setCopyToast(`${outputFormat.toUpperCase()} 데이터가 복사되었습니다.`);
      setTimeout(() => setCopyToast(null), 2000);
    } catch {
      setCopyToast('복사 권한이 없어 실패했습니다.');
      setTimeout(() => setCopyToast(null), 2000);
    }
  }, [outputFormat, csvOutput, jsonOutput]);

  // 파일 다운로드
  const handleDownload = () => {
    try {
      const isCsv = outputFormat === 'csv';
      const content = isCsv ? csvOutput : jsonOutput;
      const mime = isCsv ? 'text/csv;charset=utf-8;' : 'application/json;charset=utf-8;';
      const ext = isCsv ? 'csv' : 'json';

      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mock_data_${Date.now()}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('다운로드 오류:', err);
    }
  };

  // 미니 위젯 컨텐츠
  const miniWidgetContent = useMemo(() => {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
        <span style={{ color: '#0395FC', fontWeight: 700 }}>{schema.length}개 필드</span>
        <span style={{ color: 'var(--border)' }}>|</span>
        <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{count}개 행 생성</span>
      </div>
    );
  }, [schema.length, count]);

  return (
    <motion.div
      className="page-layout post-detail-layout"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* 1. 상단 플로팅 알약 (FloatingToolHeader) */}
      <FloatingToolHeader
        toolName="더미 데이터(Mock Data) 생성기"
        categoryName="도구"
        categoryPath="/tools"
        onNavigate={onNavigate}
        miniWidgetContent={miniWidgetContent}
      />

      {/* 2. 복사 알림 토스트 (createPortal 기반 완벽한 CLS 0 방어) */}
      <FloatingToast message={copyToast} />

      <aside className="post-sidebar post-sidebar-left"></aside>

      <div className="post-detail-container" style={{ maxWidth: 1120, width: '100%', paddingBottom: 120 }}>
        {/* 뒤로가기 버튼 */}
        <button
          className="back-btn"
          onClick={() => onNavigate('/tools')}
          style={{ marginBottom: 20 }}
          aria-label="도구 목록으로 돌아가기"
        >
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

        {/* 헤더 타이틀 */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "linear-gradient(135deg, rgba(1, 74, 255, 0.14) 0%, rgba(3, 149, 252, 0.14) 100%)",
                border: "1px solid rgba(1, 74, 255, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Database size={24} stroke="url(#toolIconGradient)" />
            </div>
            <div>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0, letterSpacing: "-0.03em" }}>
                더미 데이터(Mock Data) 생성기
              </h1>
              <p style={{ fontSize: "0.92rem", color: "#888", margin: 0, marginTop: 4 }}>
                이름, 이메일, 주소, UUID 등 스키마 정의에 따른 JSON/CSV 가상 데이터 대량 생성
              </p>
            </div>
          </div>
        </div>

        {/* 프리셋 바 */}
        <div className="jwt-presets-bar" style={{ marginBottom: 24 }}>
          <span className="jwt-presets-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={14} style={{ color: '#0395FC' }} />
            추천 프리셋:
          </span>
          <div className="jwt-presets-list">
            {MOCK_SCHEMA_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(preset.schema)}
                className="jwt-preset-chip"
                title={preset.description}
              >
                <span>{preset.title}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleRegenerate}
            className="jwt-preset-chip"
            style={{ marginLeft: 'auto', color: '#0395FC', borderColor: 'rgba(1, 74, 255, 0.35)' }}
            title="난수 새로고침"
          >
            <RefreshCw size={12} />
            <span>새로 생성</span>
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="jwt-preset-chip jwt-chip-clear"
            title="기본 설정으로 초기화"
          >
            <RotateCcw size={12} />
            <span>초기화</span>
          </button>
        </div>

        {/* 2단 구성: 좌측 스키마 빌더 / 우측 데이터 프리뷰 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, alignItems: 'start' }}>
          {/* 좌측: 스키마 정의 카드 */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: 22,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, paddingBottom: 14, borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
                <span>데이터 스키마 정의</span>
                <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: 6, background: 'rgba(1, 74, 255, 0.16)', color: '#0395FC', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                  {schema.length}개 필드
                </span>
              </h2>
              <button
                type="button"
                onClick={handleAddField}
                style={{
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  background: 'rgba(1, 74, 255, 0.2)',
                  border: '1px solid rgba(1, 74, 255, 0.45)',
                  color: '#0395FC',
                  fontWeight: 600,
                  borderRadius: 8,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                }}
              >
                <Plus size={14} />
                <span>필드 추가</span>
              </button>
            </div>

            {/* 필드 행 목록 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 440, overflowY: 'auto', paddingRight: 4 }}>
              {schema.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  필드가 없습니다. '필드 추가' 버튼을 눌러 스키마를 구성하세요.
                </div>
              ) : (
                schema.map((field) => (
                  <div
                    key={field.id}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      background: 'rgba(0, 0, 0, 0.25)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="text"
                        value={field.key}
                        onChange={(e) => handleKeyChange(field.id, e.target.value)}
                        placeholder="필드명 (예: email)"
                        style={{
                          flex: 1,
                          background: 'rgba(0, 0, 0, 0.4)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: 8,
                          padding: '6px 10px',
                          color: '#fff',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.82rem',
                          outline: 'none',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveField(field.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: 6,
                          borderRadius: 6,
                        }}
                        title="필드 삭제"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <select
                      value={field.type}
                      onChange={(e) => handleTypeChange(field.id, e.target.value as MockFieldType)}
                      style={{
                        width: '100%',
                        background: '#161b22',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 8,
                        padding: '6px 10px',
                        color: 'var(--text-main)',
                        fontSize: '0.82rem',
                        outline: 'none',
                      }}
                    >
                      {Object.entries(FIELD_TYPE_LABELS).map(([typeKey, label]) => (
                        <option key={typeKey} value={typeKey}>
                          {label}
                        </option>
                      ))}
                    </select>

                    {field.type === 'number' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <span>범위:</span>
                        <input
                          type="number"
                          value={field.min ?? 1}
                          onChange={(e) => handleNumberRangeChange(field.id, Number(e.target.value), field.max)}
                          style={{ width: 60, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '3px 6px', color: '#fff', textAlign: 'center' }}
                        />
                        <span>~</span>
                        <input
                          type="number"
                          value={field.max ?? 100}
                          onChange={(e) => handleNumberRangeChange(field.id, field.min, Number(e.target.value))}
                          style={{ width: 60, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '3px 6px', color: '#fff', textAlign: 'center' }}
                        />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* 행 수 선택 */}
            <div style={{ paddingTop: 12, borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500 }}>생성 행 수:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {[5, 10, 25, 50, 100].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setCount(num)}
                    style={{
                      padding: '4px 8px',
                      fontSize: '0.78rem',
                      fontFamily: 'var(--font-mono)',
                      background: count === num ? 'rgba(1, 74, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      border: count === num ? '1px solid rgba(1, 74, 255, 0.45)' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: count === num ? '#0395FC' : 'var(--text-muted)',
                      fontWeight: count === num ? 600 : 400,
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 우측: 결과 프리뷰 및 변환 카드 */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: 22,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            {/* 상단 탭 & 다운로드 액션 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, paddingBottom: 14, borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0, 0, 0, 0.3)', padding: 4, borderRadius: 10 }}>
                <button
                  type="button"
                  onClick={() => setOutputFormat('json')}
                  style={{
                    padding: '5px 12px',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: outputFormat === 'json' ? 'rgba(1, 74, 255, 0.2)' : 'transparent',
                    border: outputFormat === 'json' ? '1px solid rgba(1, 74, 255, 0.45)' : '1px solid transparent',
                    color: outputFormat === 'json' ? '#0395FC' : 'var(--text-muted)',
                    fontWeight: outputFormat === 'json' ? 600 : 500,
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  <FileCode size={14} />
                  <span>JSON</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOutputFormat('csv')}
                  style={{
                    padding: '5px 12px',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: outputFormat === 'csv' ? 'rgba(1, 74, 255, 0.2)' : 'transparent',
                    border: outputFormat === 'csv' ? '1px solid rgba(1, 74, 255, 0.45)' : '1px solid transparent',
                    color: outputFormat === 'csv' ? '#0395FC' : 'var(--text-muted)',
                    fontWeight: outputFormat === 'csv' ? 600 : 500,
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  <FileSpreadsheet size={14} />
                  <span>CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOutputFormat('table')}
                  style={{
                    padding: '5px 12px',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: outputFormat === 'table' ? 'rgba(1, 74, 255, 0.2)' : 'transparent',
                    border: outputFormat === 'table' ? '1px solid rgba(1, 74, 255, 0.45)' : '1px solid transparent',
                    color: outputFormat === 'table' ? '#0395FC' : 'var(--text-muted)',
                    fontWeight: outputFormat === 'table' ? 600 : 500,
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  <Table size={14} />
                  <span>테이블</span>
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="jwt-ghost-btn"
                  style={{
                    padding: '6px 14px',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Copy size={14} />
                  <span>복사</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  style={{
                    padding: '6px 14px',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'rgba(1, 74, 255, 0.22)',
                    border: '1px solid rgba(1, 74, 255, 0.45)',
                    borderRadius: 8,
                    color: '#0395FC',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Download size={14} />
                  <span>다운로드</span>
                </button>
              </div>
            </div>

            {/* 본문 뷰어 */}
            {outputFormat === 'table' ? (
              <div style={{ overflowX: 'auto', maxHeight: 460, borderRadius: 12, border: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(0, 0, 0, 0.4)' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.05)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'center', width: 40 }}>#</th>
                      {schema.map((f) => (
                        <th key={f.id} style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
                          {f.key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
                    {mockDataSet.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                        <td style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                          {idx + 1}
                        </td>
                        {schema.map((f) => (
                          <td key={f.id} style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                            {String(row[f.key] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <textarea
                readOnly
                rows={18}
                value={outputFormat === 'csv' ? csvOutput : jsonOutput}
                style={{
                  width: '100%',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 12,
                  padding: 16,
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.82rem',
                  color: 'var(--text-main)',
                  outline: 'none',
                  resize: 'none',
                  lineHeight: 1.6,
                }}
              />
            )}
          </div>
        </div>
      </div>

      <aside className="post-sidebar post-sidebar-right"></aside>
    </motion.div>
  );
}
