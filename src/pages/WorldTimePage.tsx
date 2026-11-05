import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe,
  ChevronLeft,
  Sliders,
  Clock,
  Share2,
  RotateCcw,
  Plus,
  Trash2,
  Sparkles,
  Search,
  Sun,
  Moon,
  Briefcase,
  Star,
  Check,
  ChevronUp,
  ChevronDown,
  Calendar,
  Layers,
} from 'lucide-react';
import FloatingToolHeader from '../components/FloatingToolHeader';
import {
  CityPreset,
  WORLD_CITIES,
  getZoneTimeInfo,
  calculateBusinessOverlap,
  encodeWorldTimeShare,
  decodeWorldTimeShare,
  getUtcOffsetString,
} from '../utils/worldTime';

type Navigate = (path: string) => void;

interface WorldTimePageProps {
  onNavigate: Navigate;
}

interface CountryFlagProps {
  countryCode: string;
  countryKo?: string;
  flag?: string;
  size?: 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
}

/**
 * 윈도우 OS 등에서 국가 이모지가 US, CN 등 영문 코드로 표시되는 문제를 해결하기 위해
 * 실제 고해상도 국기 이미지를 렌더링하고, 이미지 로드 실패 시 원본 이모지로 폴백하는 컴포넌트
 */
function CountryFlag({
  countryCode,
  countryKo,
  flag,
  size = 'md',
  style,
}: CountryFlagProps) {
  const [hasError, setHasError] = useState(false);
  const code = (countryCode || '').toLowerCase();

  const dimensions = {
    sm: { width: 16, height: 11, radius: 2 },
    md: { width: 20, height: 14, radius: 2.5 },
    lg: { width: 24, height: 17, radius: 3 },
  }[size];

  if (!code || hasError) {
    return <span style={{ display: 'inline-flex', alignItems: 'center', ...style }}>{flag || countryCode}</span>;
  }

  return (
    <img
      src={`https://flagcdn.com/w40/${code}.png`}
      srcSet={`https://flagcdn.com/w80/${code}.png 2x`}
      width={dimensions.width}
      height={dimensions.height}
      alt={countryKo || countryCode}
      loading="lazy"
      onError={() => setHasError(true)}
      style={{
        display: 'inline-block',
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        objectFit: 'cover',
        borderRadius: `${dimensions.radius}px`,
        boxShadow: '0 0 1px rgba(0, 0, 0, 0.5), 0 1px 2px rgba(0, 0, 0, 0.3)',
        verticalAlign: 'middle',
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

const DEFAULT_CITY_IDS = ['seoul', 'london', 'san-francisco'];

export default function WorldTimePage({ onNavigate }: WorldTimePageProps) {
  // 선택된 도시 목록
  const [selectedCities, setSelectedCities] = useState<CityPreset[]>(() => {
    const fromUrl = typeof window !== 'undefined' ? decodeWorldTimeShare(window.location.search) : { cityIds: [] };
    if (fromUrl.cityIds.length > 0) {
      const matched = fromUrl.cityIds
        .map((id) => WORLD_CITIES.find((c) => c.id === id))
        .filter((c): c is CityPreset => Boolean(c));
      if (matched.length > 0) return matched;
    }
    return WORLD_CITIES.filter((c) => DEFAULT_CITY_IDS.includes(c.id));
  });

  // 기준 시간 (Date 객체)
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const fromUrl = typeof window !== 'undefined' ? decodeWorldTimeShare(window.location.search) : { timestampMs: null };
    if (fromUrl.timestampMs) {
      return new Date(fromUrl.timestampMs);
    }
    return new Date();
  });

  // 실시간 틱 동기화 여부
  const [isLiveTicking, setIsLiveTicking] = useState<boolean>(true);

  // 세부 옵션 상태
  const [businessRange, setBusinessRange] = useState<{ start: number; end: number }>({ start: 9, end: 18 });
  const [is24Hour, setIs24Hour] = useState<boolean>(true);

  // 검색 팝업 상태
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  // 알림 토스트 상태
  const [notification, setNotification] = useState<string | null>(null);
  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 2500);
  };

  // 실시간 타이머 (isLiveTicking이 true일 때 1초마다 현재 시각 업데이트)
  useEffect(() => {
    if (!isLiveTicking) return;
    const interval = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, [isLiveTicking]);

  // 검색 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 마스터 슬라이더 조작 (0 ~ 23시간 + 분)
  const masterHour = currentDate.getHours();
  const masterMinute = currentDate.getMinutes();
  const masterMinuteRatio = (masterHour * 60 + masterMinute) / (24 * 60);

  const handleSliderChange = (newRatio: number) => {
    setIsLiveTicking(false); // 수동 조작 시 실시간 틱 일시 정지
    const totalMinutes = Math.floor(newRatio * 24 * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    const nextDate = new Date(currentDate);
    nextDate.setHours(h, m, 0, 0);
    setCurrentDate(nextDate);
  };

  // 실시간 현재 시각으로 복원 (Now)
  const handleResetToNow = () => {
    setCurrentDate(new Date());
    setIsLiveTicking(true);
    notify('실시간으로 동기화되었습니다.');
  };

  // 일정 링크 복사
  const handleCopyShareLink = () => {
    try {
      const cityIds = selectedCities.map((c) => c.id);
      const query = encodeWorldTimeShare(cityIds, currentDate.getTime());
      const shareUrl = `${window.location.origin}${window.location.pathname}?${query}`;
      navigator.clipboard.writeText(shareUrl);
      notify('일정 공유 링크가 클립보드에 복사되었습니다.');
    } catch {
      notify('링크 복사 중 오류가 발생했습니다.');
    }
  };

  // 도시 추가
  const handleAddCity = (city: CityPreset) => {
    if (selectedCities.some((c) => c.id === city.id)) {
      notify('이미 추가된 도시입니다.');
      return;
    }
    setSelectedCities((prev) => [...prev, city]);
    setSearchQuery('');
    setIsSearchOpen(false);
    notify(`${city.nameKo} (${city.nameEn}) 추가 완료`);
  };

  // 도시 삭제
  const handleRemoveCity = (cityId: string) => {
    if (selectedCities.length <= 1) {
      notify('최소 1개 이상의 도시는 유지되어야 합니다.');
      return;
    }
    setSelectedCities((prev) => prev.filter((c) => c.id !== cityId));
  };

  // 도시 순서 변경 (위로 이동)
  const handleMoveCityUp = (index: number) => {
    if (index <= 0) return;
    setSelectedCities((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  // 도시 순서 변경 (아래로 이동)
  const handleMoveCityDown = (index: number) => {
    if (index >= selectedCities.length - 1) return;
    setSelectedCities((prev) => {
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  // 기준 도시로 최상단 지정
  const handleSetAsPrimary = (index: number) => {
    if (index === 0) return;
    setSelectedCities((prev) => {
      const target = prev[index];
      const rest = prev.filter((_, i) => i !== index);
      return [target, ...rest];
    });
    notify(`${selectedCities[index].nameKo}가 기준 도시로 설정되었습니다.`);
  };

  // 검색 필터링된 도시 목록
  const filteredSearchCities = useMemo(() => {
    if (!searchQuery.trim()) return WORLD_CITIES;
    const q = searchQuery.toLowerCase().trim();
    return WORLD_CITIES.filter(
      (c) =>
        c.nameKo.toLowerCase().includes(q) ||
        c.nameEn.toLowerCase().includes(q) ||
        c.countryKo.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // 비즈니스 오버랩 (골든 타임) 계산
  const { hourlyOverlaps, goldenRanges } = useMemo(() => {
    return calculateBusinessOverlap(selectedCities, currentDate, businessRange.start, businessRange.end);
  }, [selectedCities, currentDate, businessRange]);

  // 모든 도시 골든 타임 요약 정보
  const goldenTimeSummary = useMemo(() => {
    const perfectOverlap = goldenRanges.find((r) => r.isAllOverlap);
    if (perfectOverlap) {
      const sStr = `${String(perfectOverlap.startHour).padStart(2, '0')}:00`;
      const eStr = `${String(perfectOverlap.endHour).padStart(2, '0')}:00`;
      return {
        hasAll: true,
        text: `모든 도시 동시 근무 가능 (골든 타임): ${sStr} ~ ${eStr} (${perfectOverlap.durationHours}시간)`,
      };
    }

    if (goldenRanges.length > 0 && goldenRanges[0].overlappingCitiesCount > 1) {
      const best = goldenRanges[0];
      const sStr = `${String(best.startHour).padStart(2, '0')}:00`;
      const eStr = `${String(best.endHour).padStart(2, '0')}:00`;
      return {
        hasAll: false,
        text: `전체 동시 겹침 없음 (최대 ${best.overlappingCitiesCount}개 도시 겹침: ${sStr} ~ ${eStr})`,
      };
    }

    return {
      hasAll: false,
      text: '모든 도시의 근무 시간이 일치하는 구간이 없습니다.',
    };
  }, [goldenRanges]);

  // 플로팅 알약 미니 위젯 슬롯 컨텐츠
  const miniWidgetContent = useMemo(() => {
    if (selectedCities.length === 0) return null;

    const firstThree = selectedCities.slice(0, 3);
    const perfectOverlap = goldenRanges.find((r) => r.isAllOverlap);

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', whiteSpace: 'nowrap' }}>
          {firstThree.map((city) => {
            const info = getZoneTimeInfo(currentDate, city.timeZone, currentDate, is24Hour);
            return (
              <div
                key={city.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.8rem',
                  color: 'var(--text-main)',
                }}
              >
                <CountryFlag countryCode={city.countryCode} countryKo={city.countryKo} flag={city.flag} size="sm" />
                <span style={{ color: 'var(--text-muted)' }}>{city.nameKo}</span>
                <strong style={{ fontFamily: 'var(--font-mono)' }}>{info.formattedTime}</strong>
                {info.dayOffset !== 0 && (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      color: info.dayOffset > 0 ? '#34d399' : '#f87171',
                      fontWeight: 600,
                    }}
                  >
                    {info.dayOffset > 0 ? `+${info.dayOffset}d` : `${info.dayOffset}d`}
                  </span>
                )}
                <span style={{ color: 'rgba(255, 255, 255, 0.15)', margin: '0 2px' }}>|</span>
              </div>
            );
          })}
        </div>

        {perfectOverlap && (
          <span
            style={{
              fontSize: '0.75rem',
              color: '#34d399',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
            }}
          >
            ✨ {perfectOverlap.startHour}:00~{perfectOverlap.endHour}:00
          </span>
        )}
      </div>
    );
  }, [selectedCities, currentDate, goldenRanges, is24Hour]);

  return (
    <motion.div
      className="page-layout post-detail-layout"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* 상단 모핑 플로팅 알약 (FloatingToolHeader) */}
      <FloatingToolHeader
        toolName="세계 시간 조율 도구"
        categoryName="도구"
        categoryPath="/tools"
        onNavigate={onNavigate}
        miniWidgetContent={miniWidgetContent}
      />

      <aside className="post-sidebar post-sidebar-left"></aside>

      <div className="post-detail-container" style={{ maxWidth: '980px', width: '100%', paddingBottom: '120px' }}>
        <button
          type="button"
          onClick={() => onNavigate('/tools')}
          className="back-btn"
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
                justifyContent: 'center',
              }}
            >
              <Globe size={24} stroke="url(#toolIconGradient)" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, letterSpacing: '-0.03em' }}>
                세계 시간 조율 도구
              </h1>
              <p style={{ fontSize: '0.92rem', color: '#888', margin: 0, marginTop: 4 }}>
                다국가 협업을 위한 24시간 인터랙티브 시차 비교 및 근무 시간 조율 도구
              </p>
            </div>
          </div>
        </div>

        {/* 세계 시간 조율 도구 전용 완벽 반응형 스타일 */}
        <style>{`
          .wt-options-card {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 14px;
            padding: 12px 18px;
            margin-bottom: 16px;
            gap: 12px;
          }
          .wt-options-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.9rem;
            font-weight: 600;
            color: var(--text-main);
            white-space: nowrap;
          }
          .wt-options-selectors {
            display: flex;
            align-items: center;
            gap: 14px;
          }
          .wt-select-group {
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .wt-select-label {
            color: var(--text-muted);
            white-space: nowrap;
            font-size: 0.85rem;
          }
          .wt-select {
            background: var(--bg-card-hover);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 5px 10px;
            color: var(--text-main);
            font-size: 0.85rem;
            outline: none;
            cursor: pointer;
          }
          @media (max-width: 640px) {
            .wt-options-card {
              flex-direction: column;
              align-items: stretch;
              padding: 12px 14px;
              gap: 10px;
            }
            .wt-options-selectors {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px;
              width: 100%;
            }
            .wt-select-group {
              width: 100%;
              gap: 6px;
            }
            .wt-select {
              width: 100%;
              padding: 6px 8px;
              font-size: 0.82rem;
            }
          }

          .wt-action-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 20px;
          }
          .wt-search-container {
            flex: 1;
            position: relative;
          }
          .wt-search-input-box {
            display: flex;
            align-items: center;
            gap: 10px;
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 0 14px;
            height: 42px;
          }
          .wt-search-input {
            background: transparent;
            border: none;
            outline: none;
            color: var(--text-main);
            font-size: 0.88rem;
            width: 100%;
          }
          .wt-search-dropdown {
            position: absolute;
            top: calc(100% + 6px);
            left: 0;
            right: 0;
            max-height: 280px;
            overflow-y: auto;
            background: rgba(15, 15, 15, 0.96);
            border: 1px solid var(--border);
            border-radius: 12px;
            box-shadow: 0 12px 36px rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(16px);
            z-index: 80;
            padding: 6px;
          }
          .wt-action-buttons {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-shrink: 0;
            position: relative;
          }
          .wt-button-toast {
            position: absolute;
            bottom: calc(100% + 8px);
            right: 0;
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 7px 14px;
            background: rgba(18, 20, 26, 0.96);
            border: 1px solid rgba(1, 74, 255, 0.4);
            border-radius: 9px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6), 0 0 14px rgba(1, 74, 255, 0.2);
            backdrop-filter: blur(12px);
            color: var(--text-main);
            font-size: 0.8rem;
            font-weight: 500;
            white-space: nowrap;
            pointer-events: none;
            z-index: 90;
          }
          .wt-btn {
            height: 42px;
            padding: 0 16px;
            border-radius: 10px;
            font-size: 0.85rem;
            font-weight: 500;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            transition: all 0.2s;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid var(--border);
            color: var(--text-main);
            white-space: nowrap;
          }
          .wt-btn:hover {
            background: rgba(255, 255, 255, 0.09);
            border-color: var(--border-hover);
          }
          .wt-btn-active {
            background: rgba(1, 74, 255, 0.15) !important;
            border: 1px solid rgba(1, 74, 255, 0.45) !important;
            color: #0395FC !important;
            font-weight: 600;
          }
          @media (max-width: 640px) {
            .wt-action-bar {
              flex-direction: column;
              align-items: stretch;
              gap: 10px;
            }
            .wt-action-buttons {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px;
              width: 100%;
            }
            .wt-btn {
              width: 100%;
              padding: 0 8px;
              font-size: 0.82rem;
            }
          }

          .wt-timeline-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 20px;
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .wt-timeline-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 10px;
          }
          .wt-timeline-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.92rem;
            font-weight: 600;
            color: var(--text-main);
          }
          .wt-golden-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 12px;
            border-radius: 999px;
            font-size: 0.78rem;
            font-weight: 600;
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid var(--border);
            color: var(--text-muted);
            max-width: 100%;
            line-height: 1.4;
          }
          .wt-golden-badge.has-all {
            background: rgba(52, 211, 153, 0.15);
            border: 1px solid rgba(52, 211, 153, 0.35);
            color: #34d399;
          }
          .wt-timeline-track-wrapper {
            position: relative;
            width: 100%;
            padding: 4px 0 8px;
          }
          .wt-ruler-labels {
            display: flex;
            justify-content: space-between;
            font-size: 0.75rem;
            font-family: var(--font-mono);
            color: var(--text-muted);
            margin-bottom: 8px;
            user-select: none;
          }
          @media (max-width: 640px) {
            .wt-ruler-minor {
              display: none !important;
            }
          }
          .wt-track-container {
            position: relative;
            width: 100%;
            height: 36px;
          }
          .wt-track-bg {
            position: absolute;
            inset: 0;
            border-radius: 8px;
            background: rgba(0, 0, 0, 0.45);
            border: 1px solid var(--border);
            overflow: hidden;
            display: flex;
          }
          .wt-track-cursor {
            position: absolute;
            top: 0;
            bottom: 0;
            width: 2px;
            background: #0395FC;
            box-shadow: 0 0 10px #0395FC;
            pointer-events: none;
          }
          .wt-range-slider {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            opacity: 0;
            cursor: ew-resize;
            margin: 0;
            z-index: 10;
          }
          .wt-timeline-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            padding-top: 10px;
            font-size: 0.78rem;
            color: var(--text-muted);
          }
          .wt-footer-tip {
            line-height: 1.4;
          }
          .wt-footer-legends {
            display: flex;
            align-items: center;
            gap: 12px;
            flex-shrink: 0;
          }
          .wt-legend-item {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            white-space: nowrap;
          }
          .wt-legend-color {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 2px;
          }
          .wt-color-golden {
            background: rgba(52, 211, 153, 0.7);
          }
          .wt-color-partial {
            background: rgba(251, 191, 36, 0.7);
          }
          @media (max-width: 768px) {
            .wt-timeline-footer {
              flex-direction: column;
              align-items: flex-start;
              gap: 8px;
            }
          }

          .wt-city-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 18px 20px;
            display: flex;
            flex-direction: column;
            gap: 14px;
            position: relative;
            transition: border-color 0.2s, box-shadow 0.2s;
          }
          .wt-city-card.primary {
            border-color: rgba(1, 74, 255, 0.35);
            box-shadow: 0 8px 24px rgba(1, 74, 255, 0.06);
          }
          .wt-city-card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
          }
          .wt-city-primary-col {
            display: flex;
            align-items: center;
            gap: 12px;
            min-width: 0;
            flex: 1;
          }
          .wt-city-flag {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 38px;
            height: 28px;
            padding: 0 6px;
            border-radius: 6px;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.14);
            font-size: 0.92rem;
            font-weight: 700;
            font-family: var(--font-mono);
            line-height: 1;
            flex-shrink: 0;
          }
          .wt-city-titles {
            display: flex;
            flex-direction: column;
            gap: 4px;
            min-width: 0;
          }
          .wt-city-names {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
          }
          .wt-city-name-ko {
            font-size: 1.15rem;
            font-weight: 600;
            color: var(--text-main);
            letter-spacing: -0.01em;
          }
          .wt-city-name-en {
            font-size: 0.85rem;
            color: var(--text-muted);
          }
          .wt-city-primary-badge {
            font-size: 0.7rem;
            font-weight: 600;
            background: rgba(1, 74, 255, 0.2);
            color: #0395FC;
            border: 1px solid rgba(1, 74, 255, 0.4);
            border-radius: 4px;
            padding: 1px 6px;
          }
          .wt-city-meta {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.8rem;
            color: var(--text-muted);
            flex-wrap: wrap;
          }
          .wt-city-time-mobile {
            display: none;
            font-size: 1.45rem;
            font-weight: 700;
            color: var(--text-main);
            letter-spacing: -0.02em;
            text-align: right;
            flex-shrink: 0;
            font-family: var(--font-mono);
          }
          .wt-city-controls-col {
            display: flex;
            align-items: center;
            gap: 16px;
            flex-shrink: 0;
          }
          .wt-city-time-desktop {
            font-size: 1.6rem;
            font-weight: 700;
            color: var(--text-main);
            letter-spacing: -0.02em;
            min-width: 95px;
            text-align: right;
          }
          .wt-status-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 0.8rem;
            font-weight: 500;
            white-space: nowrap;
          }
          .wt-status-business {
            background: rgba(52, 211, 153, 0.15);
            color: #34d399;
            border: 1px solid rgba(52, 211, 153, 0.3);
          }
          .wt-status-awake {
            background: rgba(251, 191, 36, 0.12);
            color: #fbbf24;
            border: 1px solid rgba(251, 191, 36, 0.3);
          }
          .wt-status-sleep {
            background: rgba(3, 149, 252, 0.14);
            color: #38bdf8;
            border: 1px solid rgba(3, 149, 252, 0.3);
          }
          .wt-city-actions {
            display: flex;
            align-items: center;
            gap: 4px;
          }
          .wt-action-btn {
            background: transparent;
            border: 1px solid var(--border);
            border-radius: 6px;
            width: 28px;
            height: 28px;
            color: var(--text-muted);
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            transition: all 0.15s;
          }
          .wt-action-btn:hover {
            background: rgba(255, 255, 255, 0.08);
            color: var(--text-main);
          }
          .wt-action-btn-delete {
            color: #f87171 !important;
          }
          .wt-action-btn-delete:hover {
            background: rgba(248, 113, 113, 0.12) !important;
            border-color: rgba(248, 113, 113, 0.3) !important;
          }
          @media (max-width: 768px) {
            .wt-city-card {
              padding: 14px 16px;
              gap: 12px;
            }
            .wt-city-card-header {
              flex-direction: column;
              align-items: stretch;
              gap: 10px;
            }
            .wt-city-primary-col {
              justify-content: space-between;
              width: 100%;
            }
            .wt-city-time-mobile {
              display: block !important;
            }
            .wt-city-time-desktop {
              display: none !important;
            }
            .wt-city-controls-col {
              justify-content: space-between;
              width: 100%;
              border-top: 1px solid rgba(255, 255, 255, 0.05);
              padding-top: 10px;
            }
          }
        `}</style>

        {/* 세부 옵션 바 */}
        <div className="wt-options-card">
          <div className="wt-options-title">
            <Sliders size={15} style={{ color: '#0395FC' }} />
            <span>세부 옵션</span>
          </div>

          <div className="wt-options-selectors">
            {/* 근무 기준 시간 설정 */}
            <div className="wt-select-group">
              <span className="wt-select-label">근무:</span>
              <select
                value={`${businessRange.start}-${businessRange.end}`}
                onChange={(e) => {
                  const [start, end] = e.target.value.split('-').map(Number);
                  setBusinessRange({ start, end });
                }}
                className="wt-select"
              >
                <option value="9-18">09:00 ~ 18:00 (표준)</option>
                <option value="8-17">08:00 ~ 17:00 (얼리버드)</option>
                <option value="10-19">10:00 ~ 19:00 (탄력근무)</option>
              </select>
            </div>

            {/* 시간 표기 형식 */}
            <div className="wt-select-group">
              <span className="wt-select-label">표기:</span>
              <select
                value={is24Hour ? '24' : '12'}
                onChange={(e) => setIs24Hour(e.target.value === '24')}
                className="wt-select"
              >
                <option value="24">24시간제 (16:30)</option>
                <option value="12">12시간제 (04:30 PM)</option>
              </select>
            </div>
          </div>
        </div>

        {/* 상단 액션 바: 도시 검색 및 조작 액션 */}
        <div className="wt-action-bar">
          {/* 도시 검색 추가 팝업 드롭다운 */}
          <div ref={searchContainerRef} className="wt-search-container">
            <div className="wt-search-input-box">
              <Search size={16} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="전 세계 도시 또는 국가 검색 (예: 런던, Tokyo, 미국)..."
                value={searchQuery}
                onFocus={() => setIsSearchOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                className="wt-search-input"
              />
            </div>

            {/* 검색 결과 드롭다운 */}
            {isSearchOpen && (
              <div className="wt-search-dropdown custom-scrollbar" data-lenis-prevent>
                {filteredSearchCities.length === 0 ? (
                  <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    일치하는 도시를 찾을 수 없습니다.
                  </div>
                ) : (
                  filteredSearchCities.map((city) => {
                    const isAdded = selectedCities.some((c) => c.id === city.id);
                    return (
                      <button
                        key={city.id}
                        type="button"
                        onClick={() => handleAddCity(city)}
                        disabled={isAdded}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          background: 'transparent',
                          border: 'none',
                          borderRadius: '8px',
                          color: isAdded ? 'var(--text-muted)' : 'var(--text-main)',
                          cursor: isAdded ? 'default' : 'pointer',
                          opacity: isAdded ? 0.45 : 1,
                          fontSize: '0.88rem',
                          textAlign: 'left',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          if (!isAdded) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <CountryFlag countryCode={city.countryCode} countryKo={city.countryKo} flag={city.flag} size="md" />
                          <span style={{ fontWeight: 600 }}>{city.nameKo}</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{city.nameEn} ({city.countryKo})</span>
                        </div>
                        <span style={{ fontSize: '0.78rem', color: '#0395FC', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                          {getUtcOffsetString(city.timeZone, currentDate)}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* 우측 퀵 액션 버튼군 */}
          <div className="wt-action-buttons">
            <AnimatePresence>
              {notification && (
                <motion.div
                  className="wt-button-toast"
                  initial={{ opacity: 0, y: 5, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 5, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                >
                  <Sparkles size={13} color="#0395FC" />
                  <span>{notification}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="button"
              onClick={handleResetToNow}
              className={`wt-btn ${isLiveTicking ? 'wt-btn-active' : ''}`}
              title="실시간 현재 시각으로 동기화"
            >
              <RotateCcw size={14} />
              <span>실시간 동기화</span>
            </button>

            <button
              type="button"
              onClick={handleCopyShareLink}
              className="wt-btn"
              title="현재 설정된 도시와 시간대를 URL 링크로 복사"
            >
              <Share2 size={14} />
              <span>일정 링크 복사</span>
            </button>
          </div>
        </div>

        {/* 24시간 마스터 스크러버 타임라인 카드 */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* 타임라인 헤더 & 골든 타임 상태 */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} style={{ color: '#0395FC' }} />
              <span style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-main)' }}>
                24시간 마스터 스케줄 타임라인
              </span>
            </div>

            {/* 골든 타임 오버랩 뱃지 */}
            <div className={`wt-golden-badge ${goldenTimeSummary.hasAll ? 'has-all' : ''}`}>
              {goldenTimeSummary.hasAll && <Sparkles size={13} color="#34d399" />}
              <span>{goldenTimeSummary.text}</span>
            </div>
          </div>

          {/* 24시간 눈금 및 인터랙티브 슬라이더 바 */}
          <div className="wt-timeline-track-wrapper">
            {/* 눈금자 라벨 */}
            <div className="wt-ruler-labels">
              {[0, 3, 6, 9, 12, 15, 18, 21, 24].map((h) => (
                <span
                  key={h}
                  className={h % 6 !== 0 ? 'wt-ruler-minor' : ''}
                >
                  {String(h).padStart(2, '0')}:00
                </span>
              ))}
            </div>

            {/* 슬라이더 트랙 컨테이너 & 레인지 슬라이더 (100% 동일 영역 오버레이) */}
            <div className="wt-track-container">
              <div className="wt-track-bg">
                {/* 24시간 블록 렌더링 */}
                {hourlyOverlaps.map((slot) => {
                  let bg = 'transparent';
                  if (slot.isAll) {
                    bg = 'rgba(52, 211, 153, 0.25)'; // 골든 타임 에메랄드
                  } else if (slot.count > 0 && selectedCities.length > 1 && slot.count === Math.max(...hourlyOverlaps.map(o => o.count))) {
                    bg = 'rgba(251, 191, 36, 0.15)'; // 부분 겹침 앰버
                  }

                  return (
                    <div
                      key={slot.hour}
                      onClick={() => {
                        setIsLiveTicking(false);
                        const next = new Date(currentDate);
                        next.setHours(slot.hour, 0, 0, 0);
                        setCurrentDate(next);
                      }}
                      style={{
                        flex: 1,
                        height: '100%',
                        background: bg,
                        borderRight: '1px solid rgba(255, 255, 255, 0.05)',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                        position: 'relative',
                      }}
                      title={`${slot.hour}:00 - ${slot.count}/${selectedCities.length}개 도시 근무 중`}
                    />
                  );
                })}

                {/* 현재 슬라이더 인디케이터 커서 */}
                <div
                  className="wt-track-cursor"
                  style={{ left: `${masterMinuteRatio * 100}%` }}
                />
              </div>

              {/* 인터랙티브 마스터 레인지 슬라이더 */}
              <input
                type="range"
                min="0"
                max="1"
                step="0.001"
                value={masterMinuteRatio}
                onChange={(e) => handleSliderChange(parseFloat(e.target.value))}
                className="wt-range-slider"
                title="마스터 타임 슬라이더를 드래그하여 시차를 탐색하세요"
              />
            </div>
          </div>

          <div className="wt-timeline-footer">
            <span className="wt-footer-tip">
              💡 슬라이더를 드래그하거나 특정 시간 블록을 클릭하여 전 세계 현지 시간을 동기화하세요.
            </span>
            <div className="wt-footer-legends">
              <span className="wt-legend-item">
                <span className="wt-legend-color wt-color-golden" /> 골든 타임 (전체 일치)
              </span>
              <span className="wt-legend-item">
                <span className="wt-legend-color wt-color-partial" /> 부분 겹침
              </span>
            </div>
          </div>
        </div>

        {/* 도시별 타임존 카드 목록 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {selectedCities.map((city, idx) => {
            const isPrimary = idx === 0;
            const primaryCity = selectedCities[0];
            const info = getZoneTimeInfo(currentDate, city.timeZone, currentDate, is24Hour, businessRange.start, businessRange.end);

            // 기준 도시 대비 시차 계산
            const primaryInfo = getZoneTimeInfo(currentDate, primaryCity.timeZone, currentDate, is24Hour);
            const hourDiff = (info.hours + (info.dayOffset * 24)) - primaryInfo.hours;
            const diffStr = isPrimary
              ? '기준 도시'
              : hourDiff >= 0
              ? `+${hourDiff}시간`
              : `${hourDiff}시간`;

            return (
              <motion.div
                key={city.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25 }}
                className={`wt-city-card ${isPrimary ? 'primary' : ''}`}
              >
                {/* 상단 정보 행: 모바일에서는 2단 분리, 태블릿/데스크톱에서는 1행 좌우 배치 */}
                <div className="wt-city-card-header">
                  {/* 도시명, 국기, 시차 정보 및 모바일용 디지털 시계 */}
                  <div className="wt-city-primary-col">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      <span className="wt-city-flag">
                        <CountryFlag countryCode={city.countryCode} countryKo={city.countryKo} flag={city.flag} size="lg" />
                      </span>
                      <div className="wt-city-titles">
                        <div className="wt-city-names">
                          <span className="wt-city-name-ko">
                            {city.nameKo}
                          </span>
                          <span className="wt-city-name-en">
                            {city.nameEn}
                          </span>
                          {isPrimary && (
                            <span className="wt-city-primary-badge">
                              기준
                            </span>
                          )}
                        </div>

                        <div className="wt-city-meta">
                          <span style={{ fontFamily: 'var(--font-mono)' }}>{info.gmtOffsetString}</span>
                          <span>•</span>
                          <span>{diffStr}</span>
                          <span>•</span>
                          <span style={{ color: 'var(--text-main)' }}>{info.formattedDate}</span>
                          {info.dayOffset !== 0 && (
                            <span
                              style={{
                                fontWeight: 600,
                                color: info.dayOffset > 0 ? '#34d399' : '#f87171',
                              }}
                            >
                              ({info.dayOffset > 0 ? `+${info.dayOffset}일` : `${info.dayOffset}일`})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 모바일 전용 디지털 시간 (768px 이하에서만 표시) */}
                    <div className="wt-city-time-mobile">
                      {info.formattedTime}
                    </div>
                  </div>

                  {/* 컨트롤 컬럼: 상태 뱃지, 데스크톱 디지털 시간(768px 초과), 액션 버튼 */}
                  <div className="wt-city-controls-col">
                    {/* 상태 뱃지 (근무 / 활동 / 취침) */}
                    <div
                      className={`wt-status-badge ${
                        info.timeState === 'business'
                          ? 'wt-status-business'
                          : info.timeState === 'awake'
                          ? 'wt-status-awake'
                          : 'wt-status-sleep'
                      }`}
                    >
                      {info.timeState === 'business' && <Briefcase size={12} />}
                      {info.timeState === 'awake' && <Sun size={12} />}
                      {info.timeState === 'sleep' && <Moon size={12} />}
                      <span>
                        {info.timeState === 'business' ? '근무 중' : info.timeState === 'awake' ? '활동 중' : '취침 중'}
                      </span>
                    </div>

                    {/* 데스크톱 전용 디지털 시간 (768px 초과에서만 표시) */}
                    <div className="wt-city-time-desktop">
                      {info.formattedTime}
                    </div>

                    {/* 액션 버튼군 */}
                    <div className="wt-city-actions">
                      {!isPrimary && (
                        <button
                          type="button"
                          onClick={() => handleSetAsPrimary(idx)}
                          className="wt-action-btn"
                          title="이 도시를 기준 도시로 설정"
                        >
                          <Star size={13} />
                        </button>
                      )}

                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => handleMoveCityUp(idx)}
                          className="wt-action-btn"
                          title="위로 이동"
                        >
                          <ChevronUp size={14} />
                        </button>
                      )}

                      {idx < selectedCities.length - 1 && (
                        <button
                          type="button"
                          onClick={() => handleMoveCityDown(idx)}
                          className="wt-action-btn"
                          title="아래로 이동"
                        >
                          <ChevronDown size={14} />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoveCity(city.id)}
                        className="wt-action-btn wt-action-btn-delete"
                        title="도시 제거"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 하단 24시간 게이지 바: 각 시간별 근무/활동/취침 컬러 시각화 */}
                <div
                  style={{
                    display: 'flex',
                    height: '24px',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {Array.from({ length: 24 }).map((_, h) => {
                    const testDate = new Date(currentDate);
                    testDate.setHours(h, 0, 0, 0);
                    const slotInfo = getZoneTimeInfo(testDate, city.timeZone, currentDate, true, businessRange.start, businessRange.end);

                    let bg = 'rgba(3, 149, 252, 0.16)'; // 취침
                    if (slotInfo.timeState === 'business') {
                      bg = 'rgba(52, 211, 153, 0.45)'; // 근무
                    } else if (slotInfo.timeState === 'awake') {
                      bg = 'rgba(251, 191, 36, 0.3)'; // 활동
                    }

                    const isCurrentSlot = h === masterHour;

                    return (
                      <div
                        key={h}
                        onClick={() => {
                          setIsLiveTicking(false);
                          const next = new Date(currentDate);
                          next.setHours(h, 0, 0, 0);
                          setCurrentDate(next);
                        }}
                        style={{
                          flex: 1,
                          height: '100%',
                          background: bg,
                          borderRight: '1px solid rgba(255, 255, 255, 0.05)',
                          cursor: 'pointer',
                          position: 'relative',
                          outline: isCurrentSlot ? '2px solid #0395FC' : 'none',
                          zIndex: isCurrentSlot ? 2 : 1,
                        }}
                        title={`${city.nameKo} 현지 시각: ${slotInfo.formattedTime} (${slotInfo.timeState === 'business' ? '근무' : slotInfo.timeState === 'awake' ? '활동' : '취침'})`}
                      />
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <aside className="post-sidebar post-sidebar-right"></aside>
    </motion.div>
  );
}
