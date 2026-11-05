import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, AppWindow, Undo2 } from 'lucide-react';

export interface FloatingToolHeaderProps {
  /** 현재 도구명 (예: '오디오 편집 도구') */
  toolName: string;
  /** 카테고리명 (기본값: '도구') */
  categoryName?: string;
  /** 카테고리 경로 (기본값: '/tools') */
  categoryPath?: string;
  /** 경로 이동 콜백 */
  onNavigate: (path: string) => void;
  /** 미니 위젯 모드일 때 렌더링할 컴팩트 컨트롤러 노드 */
  miniWidgetContent?: React.ReactNode;
  /** 초기 미니 모드 활성화 여부 */
  isMiniDefault?: boolean;
  /** 모드 변경 시 콜백 */
  onModeChange?: (isMini: boolean) => void;
}

/**
 * 상단 브레드크럼 알약 ↔ 미니 위젯 모핑 플로팅 헤더 컴포넌트
 * - 테두리 없는 어두운 글래스모피즘 알약 디자인
 * - 알약 우측에 독립된 원형 전환 버튼 배치
 * - 미니 위젯 모드 시 넉넉하고 시원한 확장 레이아웃 제공
 */
export default function FloatingToolHeader({
  toolName,
  categoryName = '도구',
  categoryPath = '/tools',
  onNavigate,
  miniWidgetContent,
  isMiniDefault = false,
  onModeChange,
}: FloatingToolHeaderProps) {
  const [isMini, setIsMini] = useState(isMiniDefault);

  // Esc 키 입력 시 미니 모드 해제 및 기본 브레드크럼 복원
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMini) {
        handleToggleMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMini]);

  const handleToggleMode = (nextMode: boolean) => {
    setIsMini(nextMode);
    onModeChange?.(nextMode);
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 640;
  const hiddenY = isMobile ? 100 : -100;

  return (
    // 바깥쪽 고정 앵커: 포스트/인게임 설정의 브레드크럼과 동일한 슬라이드 등장/퇴장 애니메이션 적용
    <motion.div
      className="floating-tool-header-anchor"
      initial={{ opacity: 0, y: hiddenY, x: "-50%" }}
      animate={{ opacity: 1, y: 0, x: "-50%" }}
      exit={{ opacity: 0, y: hiddenY, x: "-50%" }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="floating-tool-header-group">
        {/* 메인 모핑 알약 (브레드크럼 ↔ 미니 위젯) */}
        <motion.header
          layout
          transition={{
            type: 'spring',
            stiffness: 350,
            damping: 28,
            mass: 0.7,
          }}
          className="floating-tool-header-pill"
          style={{
            borderRadius: isMini ? '24px' : '999px',
            padding: isMini ? '10px 20px' : '12px 28px',
            minHeight: isMini ? '52px' : '44px',
            maxWidth: isMini ? 'min(92vw, 580px)' : 'max-content',
          }}
          role="region"
          aria-label={`${toolName} 상단 내비게이션 및 미니 컨트롤`}
        >
          <AnimatePresence mode="wait" initial={false}>
            {!isMini ? (
              <motion.div
                key="breadcrumb-mode"
                initial={{ opacity: 0, y: -4, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: 4, filter: 'blur(4px)' }}
                transition={{ duration: 0.18, ease: 'easeInOut' }}
                className="floating-header-inner-row"
              >
                <button
                  type="button"
                  className="breadcrumb-link"
                  onClick={() => onNavigate(categoryPath)}
                  aria-label={`${categoryName} 목록으로 이동`}
                >
                  {categoryName}
                </button>

                <span className="breadcrumb-separator" aria-hidden="true">
                  <ChevronRight size={13} />
                </span>

                <span className="breadcrumb-current">{toolName}</span>
              </motion.div>
            ) : (
              <motion.div
                key="mini-widget-mode"
                initial={{ opacity: 0, y: 4, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -4, filter: 'blur(4px)' }}
                transition={{ duration: 0.18, ease: 'easeInOut' }}
                className="floating-header-inner-row mini-mode"
              >
                <div className="floating-header-widget-slot">{miniWidgetContent}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.header>

        {/* 우측 독립 원형 전환 버튼 (미니 위젯 전환 / 기본 모드 복원) */}
        {miniWidgetContent && (
          <motion.button
            type="button"
            layout
            whileTap={{ scale: 0.92 }}
            onClick={() => handleToggleMode(!isMini)}
            className="floating-tool-switch-circle-btn"
            title={isMini ? '기본 모드로 전환 (Esc)' : '미니 위젯으로 전환'}
            aria-label={isMini ? '기본 모드로 전환' : '미니 위젯으로 전환'}
          >
            <AnimatePresence mode="wait" initial={false}>
              {isMini ? (
                <motion.span
                  key="restore-icon"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Undo2 size={18} />
                </motion.span>
              ) : (
                <motion.span
                  key="widget-icon"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <AppWindow size={18} />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
