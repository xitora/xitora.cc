import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';

export interface FloatingToastProps {
  /** 표시할 메시지 (null 또는 undefined일 경우 닫힘) */
  message: string | null;
  /** 토스트 아이콘 (기본값: Check) */
  icon?: React.ReactNode;
}

/**
 * 전역 플로팅 토스트 컴포넌트
 * - createPortal을 통해 document.body에 직접 마운트하여 그리드/플렉스 레이아웃의 CLS(레이아웃 시프트)를 100% 방지합니다.
 * - framer-motion x: '-50%'를 명시하여 transform 덮어쓰기로 인한 가로 오버플로우/스크롤바 덜컥거림을 원천 차단합니다.
 */
export default function FloatingToast({ message, icon }: FloatingToastProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {message && (
        <motion.div
          key="floating-toast"
          initial={{ opacity: 0, y: -14, x: '-50%', scale: 0.95 }}
          animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }}
          exit={{ opacity: 0, y: -14, x: '-50%', scale: 0.95 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="jwt-floating-toast"
          style={{
            position: 'fixed',
            top: 84,
            left: '50%',
            zIndex: 99999,
            pointerEvents: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 20px',
            background: 'rgba(13, 15, 20, 0.95)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            border: '1px solid rgba(52, 211, 153, 0.4)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6), 0 0 16px rgba(52, 211, 153, 0.2)',
            borderRadius: 12,
            color: '#34d399',
            fontSize: '0.86rem',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            maxWidth: 'calc(100vw - 32px)',
          }}
          role="status"
          aria-live="polite"
        >
          {icon ?? <Check size={15} style={{ flexShrink: 0 }} />}
          <span>{message}</span>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
