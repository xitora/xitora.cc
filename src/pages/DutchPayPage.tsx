import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Receipt,
  Users,
  Plus,
  Trash2,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  ArrowRight,
  CreditCard,
  Share2,
} from 'lucide-react';
import FloatingToolHeader from '../components/FloatingToolHeader';
import FloatingToast from '../components/FloatingToast';
import {
  Participant,
  ExpenseItem,
  RoundingUnit,
  calculateDutchPay,
  formatDutchPayShareText,
} from '../utils/dutchPay';

interface DutchPayPageProps {
  onNavigate: (path: string) => void;
}

export default function DutchPayPage({ onNavigate }: DutchPayPageProps) {
  // 참여자 목록 (프리셋 선택 전에는 비어있음)
  const [participants, setParticipants] = useState<Participant[]>([]);
  // 새 참여자 이름 인풋
  const [newMemberName, setNewMemberName] = useState<string>('');

  // 지출 항목 목록 (프리셋 선택 전에는 비어있음)
  const [items, setItems] = useState<ExpenseItem[]>([]);

  // 절사 단위
  const [roundingUnit, setRoundingUnit] = useState<RoundingUnit>('floor100');
  // 입금 계좌번호
  const [bankAccount, setBankAccount] = useState<string>('');
  // 복사 알림 토스트
  const [copyToast, setCopyToast] = useState<string | null>(null);

  // 정산 계산 결과
  const result = useMemo(() => {
    return calculateDutchPay(participants, items, roundingUnit);
  }, [participants, items, roundingUnit]);

  // 공유 텍스트
  const shareText = useMemo(() => {
    return formatDutchPayShareText(result, items, bankAccount);
  }, [result, items, bankAccount]);

  // 복사 핸들러
  const handleCopy = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyToast(`${label}이(가) 복사되었습니다.`);
      setTimeout(() => setCopyToast(null), 2000);
    } catch (err) {
      console.error('클립보드 복사 실패:', err);
    }
  }, []);

  // 참여자 추가
  const handleAddParticipant = useCallback(() => {
    const trimmed = newMemberName.trim();
    if (!trimmed) return;
    const newId = String(Date.now());
    setParticipants((prev) => [...prev, { id: newId, name: trimmed }]);
    // 모든 기존 아이템의 참여자에도 자동 추가
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        participantIds: [...item.participantIds, newId],
      }))
    );
    setNewMemberName('');
  }, [newMemberName]);

  // 참여자 삭제
  const handleRemoveParticipant = useCallback((id: string) => {
    setParticipants((prev) => prev.filter((p) => p.id !== id));
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        participantIds: item.participantIds.filter((pId) => pId !== id),
        payerId: item.payerId === id ? '' : item.payerId,
      }))
    );
  }, []);

  // 지출 항목 추가
  const handleAddItem = useCallback(() => {
    const newId = `item_${Date.now()}`;
    const defaultPayer = participants[0]?.id || '';
    const allMemberIds = participants.map((p) => p.id);
    setItems((prev) => [
      ...prev,
      {
        id: newId,
        title: `지출 ${prev.length + 1}`,
        amount: 0,
        payerId: defaultPayer,
        participantIds: allMemberIds,
      },
    ]);
  }, [participants]);

  // 지출 항목 삭제
  const handleRemoveItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // 지출 항목 필드 변경
  const handleUpdateItem = useCallback((id: string, updates: Partial<ExpenseItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  }, []);

  // 지출 항목의 특정 멤버 참여 토글
  const handleToggleItemParticipant = useCallback((itemId: string, memberId: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const exists = item.participantIds.includes(memberId);
        const nextIds = exists
          ? item.participantIds.filter((id) => id !== memberId)
          : [...item.participantIds, memberId];
        return { ...item, participantIds: nextIds };
      })
    );
  }, []);

  // 프리셋 로드
  const handleLoadPreset = useCallback((presetType: 'drinking' | 'tworounds') => {
    if (presetType === 'drinking') {
      const p = [
        { id: '1', name: '김철수', isHost: true },
        { id: '2', name: '이영희' },
        { id: '3', name: '박민수(비음주)' },
        { id: '4', name: '정수진' },
      ];
      setParticipants(p);
      setItems([
        { id: 'i1', title: '식사(안주)', amount: 80000, payerId: '1', participantIds: ['1', '2', '3', '4'] },
        { id: 'i2', title: '주류(술)', amount: 40000, payerId: '1', participantIds: ['1', '2', '4'] },
      ]);
    } else {
      const p = [
        { id: '1', name: '팀장님', isHost: true },
        { id: '2', name: '김대리' },
        { id: '3', name: '이주임' },
      ];
      setParticipants(p);
      setItems([
        { id: 'i1', title: '1차 고깃집', amount: 96000, payerId: '1', participantIds: ['1', '2', '3'] },
        { id: 'i2', title: '2차 디저트 카페', amount: 24000, payerId: '2', participantIds: ['1', '2', '3'] },
      ]);
    }
  }, []);

  // 비우기
  const handleClear = useCallback(() => {
    setParticipants([]);
    setItems([]);
    setBankAccount('');
  }, []);

  // 미니 위젯 내용
  const miniWidgetContent = useMemo(() => {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
        <span style={{ color: '#38bdf8', fontWeight: 700 }}>총 {result.totalAmount.toLocaleString()}원</span>
        <span style={{ color: 'var(--border)' }}>|</span>
        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{participants.length}명 참여</span>
      </div>
    );
  }, [result.totalAmount, participants.length]);

  return (
    <motion.div
      className="page-layout post-detail-layout"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <FloatingToolHeader
        toolName="더치페이 & 정산 계산기"
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
              <Receipt size={24} stroke="url(#toolIconGradient)" />
            </div>
            <div>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0, letterSpacing: "-0.03em" }}>
                더치페이 & 정산 계산기
              </h1>
              <p style={{ fontSize: "0.92rem", color: "#888", margin: 0, marginTop: 4 }}>
                N빵 및 차등 정산, 100원 단위 올림/내림 처리 및 공유용 정산 내역 포맷팅
              </p>
            </div>
          </div>
        </div>

        {/* 프리셋 및 비우기 바 */}
        <div className="jwt-presets-bar" style={{ marginBottom: 24 }}>
          <span className="jwt-presets-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={14} style={{ color: '#0395FC' }} />
            샘플 프리셋:
          </span>
          <div className="jwt-presets-list">
            <button
              type="button"
              onClick={() => handleLoadPreset('drinking')}
              className="jwt-preset-chip"
              title="비음주자 주류값 제외 정산"
            >
              <span>술자리 (비음주자 제외)</span>
            </button>
            <button
              type="button"
              onClick={() => handleLoadPreset('tworounds')}
              className="jwt-preset-chip"
              title="1차 고기 + 2차 카페 교차 결제"
            >
              <span>1차 식사 + 2차 카페</span>
            </button>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="jwt-preset-chip jwt-chip-clear"
            style={{ marginLeft: 'auto' }}
            title="내역 비우기"
          >
            <RotateCcw size={12} />
            <span>비우기</span>
          </button>
        </div>

        {/* 메인 레이아웃 2열 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20, alignItems: 'start' }}>
          {/* 좌측: 참여자 & 지출 내역 입력 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* 참여자 관리 카드 */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Users size={16} color="#0395FC" />
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>정산 참여 멤버 ({participants.length}명)</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input
                  type="text"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddParticipant()}
                  placeholder="새 멤버 이름 입력 후 엔터"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-main)',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddParticipant}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    background: 'rgba(1, 74, 255, 0.2)',
                    border: '1px solid rgba(1, 74, 255, 0.45)',
                    color: '#0395FC',
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  추가
                </button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {participants.length === 0 ? (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    등록된 멤버가 없습니다. 이름 입력 후 추가하거나 상단 프리셋을 선택하세요.
                  </span>
                ) : (
                  participants.map((p) => (
                    <span
                      key={p.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12,
                        padding: '4px 8px',
                        borderRadius: 6,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-main)',
                      }}
                    >
                      <span>{p.name}</span>
                      {participants.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveParticipant(p.id)}
                          style={{ color: '#f87171', padding: 0, display: 'flex', cursor: 'pointer' }}
                          title="멤버 삭제"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* 지출 항목 목록 카드 */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Receipt size={16} color="#0395FC" />
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>지출 항목</span>
                </div>
                <button
                  type="button"
                  onClick={handleAddItem}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 12,
                    padding: '4px 10px',
                    borderRadius: 6,
                    background: 'rgba(1, 74, 255, 0.16)',
                    color: '#0395FC',
                    border: '1px solid rgba(1, 74, 255, 0.35)',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  <Plus size={13} />
                  항목 추가
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {items.length === 0 ? (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', padding: '12px 0', textAlign: 'center' }}>
                    등록된 지출 내역이 없습니다. '항목 추가'를 누르거나 상단 프리셋을 선택하세요.
                  </span>
                ) : (
                  items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      background: 'rgba(0,0,0,0.25)',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      padding: 12,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => handleUpdateItem(item.id, { title: e.target.value })}
                        placeholder="항목명 (예: 식사)"
                        style={{
                          flex: 1,
                          padding: '6px 10px',
                          borderRadius: 6,
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-main)',
                          fontSize: 13,
                        }}
                      />
                      <input
                        type="number"
                        value={item.amount || ''}
                        onChange={(e) => handleUpdateItem(item.id, { amount: Number(e.target.value) })}
                        placeholder="금액 (원)"
                        style={{
                          width: 110,
                          padding: '6px 10px',
                          borderRadius: 6,
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-main)',
                          fontSize: 13,
                          textAlign: 'right',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        style={{ color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
                        title="항목 삭제"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, flexWrap: 'wrap', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: 'var(--text-muted)' }}>결제자:</span>
                        <select
                          value={item.payerId}
                          onChange={(e) => handleUpdateItem(item.id, { payerId: e.target.value })}
                          style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-main)',
                            borderRadius: 6,
                            padding: '2px 6px',
                            fontSize: 12,
                          }}
                        >
                          {participants.map((p) => (
                            <option key={p.id} value={p.id} style={{ background: '#121212' }}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                        <span style={{ color: 'var(--text-muted)', marginRight: 2 }}>참여:</span>
                        {participants.map((p) => {
                          const isChecked = item.participantIds.includes(p.id);
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleToggleItemParticipant(item.id, p.id)}
                              style={{
                                padding: '2px 6px',
                                borderRadius: 4,
                                fontSize: 11,
                                border: '1px solid',
                                borderColor: isChecked ? 'rgba(1, 74, 255, 0.45)' : 'var(--border)',
                                background: isChecked ? 'rgba(1, 74, 255, 0.18)' : 'transparent',
                                color: isChecked ? '#0395FC' : 'var(--text-muted)',
                                cursor: 'pointer',
                              }}
                            >
                              {p.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            </div>

            {/* 절사 단위 옵션 & 계좌번호 */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
              <div style={{ marginBottom: 14 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: 8 }}>
                  금액 절사 옵션 (단위 맞춤)
                </span>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {[
                    { id: 'none', label: '1원 단위 (정확)' },
                    { id: 'floor100', label: '100원 내림' },
                    { id: 'ceil100', label: '100원 올림' },
                    { id: 'round100', label: '100원 반올림' },
                    { id: 'ceil1000', label: '1,000원 올림' },
                  ].map((unit) => (
                    <button
                      key={unit.id}
                      type="button"
                      onClick={() => setRoundingUnit(unit.id as RoundingUnit)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontSize: 12,
                        cursor: 'pointer',
                        background: roundingUnit === unit.id ? 'rgba(1, 74, 255, 0.2)' : 'rgba(255,255,255,0.03)',
                        color: roundingUnit === unit.id ? '#0395FC' : 'var(--text-muted)',
                        fontWeight: roundingUnit === unit.id ? 600 : 400,
                        border: roundingUnit === unit.id ? '1px solid rgba(1, 74, 255, 0.45)' : '1px solid var(--border)',
                      }}
                    >
                      {unit.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: 6 }}>
                  입금 계좌 정보 (선택)
                </span>
                <input
                  type="text"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  placeholder="예: 카카오뱅크 3333-01-xxxxxx (홍길동)"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-main)',
                    fontSize: 13,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          </div>

          {/* 우측: 최종 정산 송금 안내 및 공유 영수증 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* 정산 요약 카드 */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)' }}>정산 송금 가이드</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0395FC' }}>총 {result.totalAmount.toLocaleString()}원</span>
              </div>

              {result.transfers.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {result.transfers.map((t, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        borderRadius: 10,
                        background: 'rgba(1, 74, 255, 0.06)',
                        border: '1px solid rgba(1, 74, 255, 0.22)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: 14 }}>{t.fromName}</span>
                        <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                        <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: 14 }}>{t.toName}</span>
                      </div>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#34d399' }}>{t.amount.toLocaleString()}원</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                  정산할 금액이 없거나 지출 항목을 추가해 주세요.
                </div>
              )}
            </div>

            {/* 영수증 텍스트 복사 카드 */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Share2 size={16} color="#0395FC" />
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>공유용 영수증 텍스트</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(shareText, '카카오톡 정산 내역')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 12,
                    padding: '5px 12px',
                    borderRadius: 6,
                    background: 'rgba(1, 74, 255, 0.2)',
                    border: '1px solid rgba(1, 74, 255, 0.45)',
                    color: '#0395FC',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Copy size={13} />
                  내역 복사
                </button>
              </div>

              <textarea
                readOnly
                value={shareText}
                rows={9}
                style={{
                  width: '100%',
                  padding: 12,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontSize: 12,
                  lineHeight: 1.6,
                  borderRadius: 8,
                  background: 'rgba(0,0,0,0.35)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-main)',
                  resize: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <aside className="post-sidebar post-sidebar-right"></aside>
    </motion.div>
  );
}
