import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Clock,
  Sparkles,
  CloudRain,
  Wind,
  Flame,
  Radio,
  RotateCcw,
} from 'lucide-react';
import FloatingToolHeader from '../components/FloatingToolHeader';
import {
  NoiseType,
  SoundTrackState,
  INITIAL_TRACKS,
  NOISE_PRESETS,
  NoiseEngine,
} from '../utils/noiseAudio';

interface NoiseGeneratorPageProps {
  onNavigate: (path: string) => void;
}

export default function NoiseGeneratorPage({ onNavigate }: NoiseGeneratorPageProps) {
  // 오디오 재생 중 여부
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  // 마스터 볼륨
  const [masterVolume, setMasterVolume] = useState<number>(0.8);
  // 각 트랙 상태
  const [tracks, setTracks] = useState<SoundTrackState[]>(INITIAL_TRACKS);
  // 타이머 (분 단위, null은 무제한)
  const [timerMinutes, setTimerMinutes] = useState<number | null>(null);
  // 남은 타이머 초
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  const engineRef = useRef<NoiseEngine | null>(null);

  // 엔진 초기화 및 언마운트 시 오디오 리소스 완전 해제
  useEffect(() => {
    engineRef.current = new NoiseEngine();
    return () => {
      engineRef.current?.dispose();
    };
  }, []);

  // 타이머 카운트다운
  useEffect(() => {
    if (!isPlaying || remainingSeconds === null) return;
    if (remainingSeconds <= 0) {
      handleStop();
      setRemainingSeconds(null);
      setTimerMinutes(null);
      return;
    }

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying, remainingSeconds]);

  // 마스터 볼륨 변경 적용
  const handleMasterVolumeChange = useCallback((vol: number) => {
    setMasterVolume(vol);
    engineRef.current?.setMasterVolume(vol);
  }, []);

  // 트랙 볼륨 변경
  const handleTrackVolumeChange = useCallback((trackId: NoiseType, vol: number) => {
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id !== trackId) return t;
        const nextVol = Math.max(0, Math.min(1, vol));
        engineRef.current?.setTrackVolume(trackId, nextVol, t.enabled);
        return { ...t, volume: nextVol };
      })
    );
  }, []);

  // 트랙 On/Off 토글
  const handleToggleTrack = useCallback((trackId: NoiseType) => {
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id !== trackId) return t;
        const nextEnabled = !t.enabled;
        engineRef.current?.setTrackVolume(trackId, t.volume, nextEnabled);
        return { ...t, enabled: nextEnabled };
      })
    );
  }, []);

  // 재생 시작
  const handlePlay = useCallback(async () => {
    if (!engineRef.current) return;
    await engineRef.current.start(tracks);
    engineRef.current.setMasterVolume(masterVolume);
    setIsPlaying(true);
  }, [tracks, masterVolume]);

  // 정지
  const handleStop = useCallback(() => {
    engineRef.current?.stop();
    setIsPlaying(false);
  }, []);

  // 타이머 설정
  const handleSetTimer = useCallback((minutes: number | null) => {
    setTimerMinutes(minutes);
    if (minutes === null) {
      setRemainingSeconds(null);
    } else {
      setRemainingSeconds(minutes * 60);
    }
  }, []);

  // 프리셋 로드
  const handleLoadPreset = useCallback((preset: (typeof NOISE_PRESETS)[0]) => {
    setTracks((prev) =>
      prev.map((t) => {
        const presetVol = preset.activeTracks[t.id];
        const isEnabled = presetVol !== undefined;
        const vol = presetVol !== undefined ? presetVol : t.volume;
        engineRef.current?.setTrackVolume(t.id, vol, isEnabled);
        return { ...t, enabled: isEnabled, volume: vol };
      })
    );
  }, []);

  // 모든 사운드 끄기 (비우기)
  const handleClear = useCallback(() => {
    handleStop();
    setTracks((prev) =>
      prev.map((t) => {
        engineRef.current?.setTrackVolume(t.id, t.volume, false);
        return { ...t, enabled: false };
      })
    );
    setRemainingSeconds(null);
    setTimerMinutes(null);
  }, [handleStop]);

  // 활성 트랙 수
  const activeCount = useMemo(() => tracks.filter((t) => t.enabled).length, [tracks]);

  // 미니 위젯 내용
  const miniWidgetContent = useMemo(() => {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
        <span style={{ color: isPlaying ? '#34d399' : 'var(--text-muted)', fontWeight: 600 }}>
          {isPlaying ? '● 재생 중' : '일시정지'}
        </span>
        <span style={{ color: 'var(--border)' }}>|</span>
        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{activeCount}개 사운드 믹스</span>
      </div>
    );
  }, [isPlaying, activeCount]);

  // 타이머 시간 포맷 (mm:ss)
  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const getTrackIcon = (id: NoiseType) => {
    switch (id) {
      case 'rain':
        return <CloudRain size={20} color="#38bdf8" />;
      case 'wind':
        return <Wind size={20} color="#a78bfa" />;
      case 'campfire':
        return <Flame size={20} color="#fb923c" />;
      case 'brown':
        return <Radio size={20} color="#f87171" />;
      case 'pink':
        return <Radio size={20} color="#f472b6" />;
      default:
        return <Radio size={20} color="#94a3b8" />;
    }
  };

  return (
    <motion.div
      className="page-layout post-detail-layout"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <FloatingToolHeader
        toolName="디지털 노이즈 사운드 생성기"
        categoryName="도구"
        categoryPath="/tools"
        onNavigate={onNavigate}
        miniWidgetContent={miniWidgetContent}
      />

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
              <Volume2 size={24} stroke="url(#toolIconGradient)" />
            </div>
            <div>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0, letterSpacing: "-0.03em" }}>
                디지털 노이즈 사운드 생성기
              </h1>
              <p style={{ fontSize: "0.92rem", color: "#888", margin: 0, marginTop: 4 }}>
                백색소음, 빗소리, 모닥불 등 웹 오디오 기반의 집중·수면용 앰비언스 사운드 믹서
              </p>
            </div>
          </div>
        </div>

        {/* 프리셋 및 비우기 바 */}
        <div className="jwt-presets-bar" style={{ marginBottom: 24 }}>
          <span className="jwt-presets-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={14} style={{ color: '#0395FC' }} />
            감성 프리셋:
          </span>
          <div className="jwt-presets-list">
            {NOISE_PRESETS.map((p) => (
              <button
                key={p.title}
                type="button"
                onClick={() => handleLoadPreset(p)}
                className="jwt-preset-chip"
                title={p.description}
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
            title="모든 사운드 끄기"
          >
            <RotateCcw size={12} />
            <span>모두 끄기</span>
          </button>
        </div>

        {/* 메인 컨트롤러 바 */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: 24,
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 20,
          }}
        >
          {/* 재생 / 일시정지 버튼 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              type="button"
              onClick={isPlaying ? handleStop : handlePlay}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 24px',
                borderRadius: 10,
                background: isPlaying ? 'rgba(239, 68, 68, 0.15)' : 'rgba(1, 74, 255, 0.22)',
                border: isPlaying ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(1, 74, 255, 0.45)',
                color: isPlaying ? '#f87171' : '#0395FC',
                fontWeight: 700,
                fontSize: 15,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              <span>{isPlaying ? '사운드 멈춤' : '사운드 재생'}</span>
            </button>

            {remainingSeconds !== null && (
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#0395FC',
                  background: 'rgba(1, 74, 255, 0.14)',
                  border: '1px solid rgba(1, 74, 255, 0.3)',
                  padding: '4px 10px',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Clock size={14} />
                <span>종료까지 {formatTimer(remainingSeconds)}</span>
              </span>
            )}
          </div>

          {/* 마스터 볼륨 & 타이머 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Volume2 size={16} color="var(--text-muted)" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={masterVolume}
                onChange={(e) => handleMasterVolumeChange(parseFloat(e.target.value))}
                style={{ width: 110, cursor: 'pointer', accentColor: '#014AFF' }}
                title="마스터 볼륨"
              />
              <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 34 }}>
                {Math.round(masterVolume * 100)}%
              </span>
            </div>

            {/* 타이머 버튼들 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={15} color="var(--text-muted)" style={{ marginRight: 4 }} />
              {[
                { label: '끄기', val: null },
                { label: '15분', val: 15 },
                { label: '30분', val: 30 },
                { label: '60분', val: 60 },
              ].map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => handleSetTimer(t.val)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 6,
                    fontSize: 11,
                    border: timerMinutes === t.val ? '1px solid rgba(1, 74, 255, 0.45)' : '1px solid var(--border)',
                    cursor: 'pointer',
                    background: timerMinutes === t.val ? 'rgba(1, 74, 255, 0.2)' : 'rgba(255,255,255,0.03)',
                    color: timerMinutes === t.val ? '#0395FC' : 'var(--text-muted)',
                    fontWeight: timerMinutes === t.val ? 700 : 400,
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 6개 사운드 트랙 믹서 카드 그리드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: 16 }}>
          {tracks.map((track) => (
            <div
              key={track.id}
              style={{
                background: track.enabled ? 'rgba(1, 74, 255, 0.06)' : 'var(--bg-card)',
                border: track.enabled ? '1px solid rgba(1, 74, 255, 0.35)' : '1px solid var(--border)',
                borderRadius: 14,
                padding: 18,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: 'rgba(255,255,255,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {getTrackIcon(track.id)}
                  </div>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)', display: 'block' }}>
                      {track.name}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{track.description}</span>
                  </div>
                </div>

                {/* 토글 스위치 버튼 */}
                <button
                  type="button"
                  onClick={() => handleToggleTrack(track.id)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: track.enabled ? 'rgba(1, 74, 255, 0.22)' : 'rgba(255,255,255,0.06)',
                    color: track.enabled ? '#0395FC' : 'var(--text-muted)',
                    border: track.enabled ? '1px solid rgba(1, 74, 255, 0.45)' : '1px solid var(--border)',
                  }}
                >
                  {track.enabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* 볼륨 슬라이더 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 28 }}>볼륨</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={track.volume}
                  onChange={(e) => handleTrackVolumeChange(track.id, parseFloat(e.target.value))}
                  style={{ flex: 1, cursor: 'pointer', accentColor: '#014AFF' }}
                />
                <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 28, textAlign: 'right' }}>
                  {Math.round(track.volume * 100)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <aside className="post-sidebar post-sidebar-right"></aside>
    </motion.div>
  );
}
