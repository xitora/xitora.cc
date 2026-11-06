import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ArrowRightLeft,
  Ruler,
  Layers,
  Scale,
  HardDrive,
  Coins,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import FloatingToolHeader from '../components/FloatingToolHeader';
import FloatingToast from '../components/FloatingToast';
import {
  UnitCategory,
  LENGTH_UNITS,
  AREA_UNITS,
  WEIGHT_UNITS,
  DATA_UNITS,
  CURRENCY_LIST,
  DEFAULT_CURRENCY_RATES,
  convertUnit,
  convertCurrency,
  formatUnitNumber,
  UNIT_SAMPLE_PRESETS,
  UnitDefinition,
} from '../utils/unitConverter';

interface UnitConverterPageProps {
  onNavigate: (path: string) => void;
}

export default function UnitConverterPage({ onNavigate }: UnitConverterPageProps) {
  // 선택된 카테고리
  const [currencyRates, setCurrencyRates] = useState({ ...DEFAULT_CURRENCY_RATES });
  const [category, setCategory] = useState<UnitCategory>('area');
  // 입력값 (프리셋 선택 전에는 비어있음)
  const [inputValue, setInputValue] = useState<string>('');
  // From / To 단위
  const [fromUnit, setFromUnit] = useState<string>('m2');
  const [toUnit, setToUnit] = useState<string>('pyeong');
  // 복사 알림 토스트
  const [copyToast, setCopyToast] = useState<string | null>(null);

  // 현재 카테고리의 단위 목록
  const currentUnits: UnitDefinition[] = useMemo(() => {
    switch (category) {
      case 'length':
        return LENGTH_UNITS;
      case 'area':
        return AREA_UNITS;
      case 'weight':
        return WEIGHT_UNITS;
      case 'data':
        return DATA_UNITS;
      default:
        return [];
    }
  }, [category]);

  // 카테고리 변경 시 기본 단위 설정
  const handleSelectCategory = useCallback((cat: UnitCategory) => {
    setCategory(cat);
    if (cat === 'length') {
      setFromUnit('m');
      setToUnit('cm');
    } else if (cat === 'area') {
      setFromUnit('m2');
      setToUnit('pyeong');
    } else if (cat === 'weight') {
      setFromUnit('kg');
      setToUnit('g');
    } else if (cat === 'data') {
      setFromUnit('GB');
      setToUnit('MB');
    } else if (cat === 'currency') {
      setFromUnit('USD');
      setToUnit('KRW');
    }
  }, []);

  // 주 변환 결과 계산
  const convertedResult = useMemo(() => {
    const num = parseFloat(inputValue);
    if (isNaN(num)) return 0;
    if (category === 'currency') {
      return convertCurrency(num, fromUnit, toUnit, currencyRates);
    }
    return convertUnit(num, fromUnit, toUnit, category);
  }, [inputValue, fromUnit, toUnit, category, currencyRates]);

  // 전체 단위 실시간 변환 맵
  const allConvertedList = useMemo(() => {
    const num = parseFloat(inputValue);
    if (isNaN(num)) return [];

    if (category === 'currency') {
      return CURRENCY_LIST.map((cur) => ({
        id: cur.id,
        name: cur.name,
        symbol: cur.symbol,
        value: convertCurrency(num, fromUnit, cur.id, currencyRates),
      }));
    }

    return currentUnits.map((u) => ({
      id: u.id,
      name: u.name,
      symbol: u.symbol,
      value: convertUnit(num, fromUnit, u.id, category),
    }));
  }, [inputValue, fromUnit, category, currentUnits, currencyRates]);

  // 단위 교환 (Swap)
  const handleSwapUnits = useCallback(() => {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
  }, [fromUnit, toUnit]);

  // 프리셋 로드
  const handleLoadPreset = useCallback((preset: (typeof UNIT_SAMPLE_PRESETS)[0]) => {
    setCategory(preset.category);
    setFromUnit(preset.fromUnit);
    setToUnit(preset.toUnit);
    setInputValue(String(preset.value));
  }, []);

  // 비우기
  const handleClear = useCallback(() => {
    setInputValue('');
  }, []);

  // 복사
  const handleCopy = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyToast(`${label}이(가) 복사되었습니다.`);
      setTimeout(() => setCopyToast(null), 2000);
    } catch (err) {
      console.error('클립보드 복사 실패:', err);
    }
  }, []);

  // 미니 위젯 내용
  const miniWidgetContent = useMemo(() => {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
        <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>
          {inputValue || '0'} {fromUnit}
        </span>
        <ArrowRightLeft size={12} color="#0395FC" />
        <span style={{ color: '#0395FC', fontWeight: 700 }}>
          {formatUnitNumber(convertedResult)} {toUnit}
        </span>
      </div>
    );
  }, [inputValue, fromUnit, toUnit, convertedResult]);

  return (
    <motion.div
      className="page-layout post-detail-layout"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <FloatingToolHeader
        toolName="단위 & 환율 변환기"
        categoryName="도구"
        categoryPath="/tools"
        onNavigate={onNavigate}
        miniWidgetContent={miniWidgetContent}
      />

      {/* 2. 복사 알림 토스트 (createPortal 기반 완벽한 CLS 0 방어) */}
      <FloatingToast message={copyToast} />

      <aside className="post-sidebar post-sidebar-left"></aside>

      <div className="post-detail-container" style={{ maxWidth: 1080, width: '100%', paddingBottom: 120 }}>
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
              <ArrowRightLeft size={24} stroke="url(#toolIconGradient)" />
            </div>
            <div>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0, letterSpacing: "-0.03em" }}>
                단위 & 환율 변환기
              </h1>
              <p style={{ fontSize: "0.92rem", color: "#888", margin: 0, marginTop: 4 }}>
                길이, 면적(평 ↔ ㎡), 무게, 데이터 단위 및 직접 입력한 환율로 통화 변환
              </p>
            </div>
          </div>
        </div>

        {/* 카테고리 탭 & 프리셋/비우기 바 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {/* 카테고리 선택 탭 */}
          <div
            style={{
              display: 'inline-flex',
              background: 'rgba(0,0,0,0.3)',
              padding: 4,
              borderRadius: 10,
              border: '1px solid var(--border)',
              gap: 4,
              width: 'max-content',
              maxWidth: '100%',
              overflowX: 'auto',
            }}
          >
            {[
              { id: 'area', label: '면적 (평/㎡)', icon: Layers },
              { id: 'length', label: '길이', icon: Ruler },
              { id: 'weight', label: '무게', icon: Scale },
              { id: 'data', label: '데이터', icon: HardDrive },
              { id: 'currency', label: '환율 (통화)', icon: Coins },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = category === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleSelectCategory(tab.id as UnitCategory)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 14px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    border: isActive ? '1px solid rgba(1, 74, 255, 0.45)' : '1px solid transparent',
                    cursor: 'pointer',
                    background: isActive ? 'rgba(1, 74, 255, 0.2)' : 'transparent',
                    color: isActive ? '#0395FC' : 'var(--text-muted)',
                    transition: 'all 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* 프리셋 바 & 비우기 버튼 우측 정렬 */}
          <div className="jwt-presets-bar">
            <span className="jwt-presets-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={14} style={{ color: '#0395FC' }} />
              자주 찾는 변환:
            </span>
            <div className="jwt-presets-list">
              {UNIT_SAMPLE_PRESETS.map((p) => (
                <button
                  key={p.title}
                  type="button"
                  onClick={() => handleLoadPreset(p)}
                  className="jwt-preset-chip"
                >
                  <span>{p.title}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="jwt-preset-chip jwt-chip-clear"
              style={{ marginLeft: 'auto' }}
              title="값 비우기"
            >
              <RotateCcw size={12} />
              <span>비우기</span>
            </button>
          </div>
        </div>

        {/* 메인 변환 카드 */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: 24,
            marginBottom: 24,
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, alignItems: 'center' }}>
            {/* From 입력 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>변환할 값</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="number"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="0"
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    fontSize: 20,
                    fontWeight: 700,
                    fontFamily: 'ui-monospace, monospace',
                    borderRadius: 10,
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-main)',
                    outline: 'none',
                  }}
                />
                <select
                  value={fromUnit}
                  onChange={(e) => setFromUnit(e.target.value)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-main)',
                    fontSize: 14,
                    fontWeight: 600,
                    outline: 'none',
                  }}
                >
                  {category === 'currency'
                    ? CURRENCY_LIST.map((c) => (
                        <option key={c.id} value={c.id} style={{ background: '#121212' }}>
                          {c.id} ({c.name})
                        </option>
                      ))
                    : currentUnits.map((u) => (
                        <option key={u.id} value={u.id} style={{ background: '#121212' }}>
                          {u.symbol} ({u.name})
                        </option>
                      ))}
                </select>
              </div>
            </div>

            {/* 가운데 스왑 버튼 */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={handleSwapUnits}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'rgba(1, 74, 255, 0.14)',
                  border: '1px solid rgba(1, 74, 255, 0.35)',
                  color: '#0395FC',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                title="단위 맞바꾸기"
              >
                <ArrowRightLeft size={18} />
              </button>
            </div>

            {/* To 결과 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>변환 결과</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <div
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    fontSize: 20,
                    fontWeight: 700,
                    fontFamily: 'ui-monospace, monospace',
                    borderRadius: 10,
                    background: 'rgba(1, 74, 255, 0.12)',
                    border: '1px solid rgba(1, 74, 255, 0.35)',
                    color: '#0395FC',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{formatUnitNumber(convertedResult)}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(String(convertedResult), '변환 결과')}
                    style={{ color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}
                    title="결과 복사"
                  >
                    <Copy size={14} />
                  </button>
                </div>

                <select
                  value={toUnit}
                  onChange={(e) => setToUnit(e.target.value)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-main)',
                    fontSize: 14,
                    fontWeight: 600,
                    outline: 'none',
                  }}
                >
                  {category === 'currency'
                    ? CURRENCY_LIST.map((c) => (
                        <option key={c.id} value={c.id} style={{ background: '#121212' }}>
                          {c.id} ({c.name})
                        </option>
                      ))
                    : currentUnits.map((u) => (
                        <option key={u.id} value={u.id} style={{ background: '#121212' }}>
                          {u.symbol} ({u.name})
                        </option>
                      ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {category === 'currency' && (
          <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 24 }}>
            <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>수동 환율 설정</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>초기값은 계산 예시입니다. 실시간 시세가 아니므로 1 USD당 환율을 직접 입력하세요.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
              {CURRENCY_LIST.filter(currency => currency.id !== 'USD').map(currency => (
                <label key={currency.id} style={{ display: 'grid', gap: 6, fontSize: 13 }}>
                  1 USD → {currency.id}
                  <input type="number" min="0.000001" step="any" value={currencyRates[currency.id]}
                    onChange={event => {
                      const value = Number(event.target.value);
                      if (Number.isFinite(value) && value > 0) setCurrencyRates(previous => ({ ...previous, [currency.id]: value }));
                    }} style={{ width: '100%', padding: 10, borderRadius: 8, background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border)' }} />
                </label>
              ))}
            </div>
          </section>
        )}

        {/* 전체 단위 실시간 환산표 그리드 */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)' }}>
              모든 단위 동시 환산표
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              기준값: {inputValue || '0'} {fromUnit}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12 }}>
            {allConvertedList.map((item) => (
              <div
                key={item.id}
                onClick={() => handleCopy(String(item.value), `${item.name} 값`)}
                style={{
                  background: item.id === toUnit ? 'rgba(1, 74, 255, 0.1)' : 'rgba(0,0,0,0.25)',
                  border: item.id === toUnit ? '1px solid rgba(1, 74, 255, 0.4)' : '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  transition: 'all 0.15s',
                }}
                title="클릭하여 복사"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.name}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#0395FC' }}>{item.symbol}</span>
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    fontFamily: 'ui-monospace, monospace',
                    color: item.id === toUnit ? '#0395FC' : 'var(--text-main)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {formatUnitNumber(item.value)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <aside className="post-sidebar post-sidebar-right"></aside>
    </motion.div>
  );
}
