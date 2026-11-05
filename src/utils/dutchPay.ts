// 더치페이 & 정산 계산기 유틸리티

export type RoundingUnit = 'none' | 'ceil10' | 'floor10' | 'ceil100' | 'floor100' | 'round100' | 'ceil1000';

export interface Participant {
  id: string;
  name: string;
  isHost?: boolean;
}

export interface ExpenseItem {
  id: string;
  title: string;
  amount: number;
  payerId: string; // 결제한 사람 ID
  participantIds: string[]; // 함께한 사람 ID 목록
}

export interface SettlementDetail {
  participantId: string;
  name: string;
  totalPaid: number; // 실제 결제한 금액
  totalOwed: number; // 본인이 부담해야 할 금액
  netAmount: number; // 최종 정산액 (+: 받아야 함, -: 보내야 함)
}

export interface TransferPlan {
  fromName: string;
  toName: string;
  amount: number;
}

export interface DutchPayResult {
  totalAmount: number;
  settlements: SettlementDetail[];
  transfers: TransferPlan[];
  roundingDifference: number; // 절사로 인해 발생한 오차 총합
}

/**
 * 금액 단위별 절사/올림/반올림 처리
 */
export function applyRounding(amount: number, unit: RoundingUnit): number {
  switch (unit) {
    case 'ceil10':
      return Math.ceil(amount / 10) * 10;
    case 'floor10':
      return Math.floor(amount / 10) * 10;
    case 'ceil100':
      return Math.ceil(amount / 100) * 100;
    case 'floor100':
      return Math.floor(amount / 100) * 100;
    case 'round100':
      return Math.round(amount / 100) * 100;
    case 'ceil1000':
      return Math.ceil(amount / 1000) * 1000;
    case 'none':
    default:
      return Math.round(amount);
  }
}

/**
 * 정산 및 송금 계획(최소 거래 횟수 정산) 계산 함수
 */
export function calculateDutchPay(
  participants: Participant[],
  items: ExpenseItem[],
  roundingUnit: RoundingUnit = 'none'
): DutchPayResult {
  try {
    const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0);

    // 각 참여자별 지불액(Paid) 및 분담액(Owed) 집계
    const paidMap: Record<string, number> = {};
    const owedMap: Record<string, number> = {};

    participants.forEach((p) => {
      paidMap[p.id] = 0;
      owedMap[p.id] = 0;
    });

    items.forEach((item) => {
      const amt = item.amount || 0;
      if (amt <= 0) return;

      if (paidMap[item.payerId] !== undefined) {
        paidMap[item.payerId] += amt;
      }

      const activeMemberIds = item.participantIds.filter((id) => paidMap[id] !== undefined);
      if (activeMemberIds.length > 0) {
        const splitAmount = amt / activeMemberIds.length;
        activeMemberIds.forEach((id) => {
          owedMap[id] += splitAmount;
        });
      }
    });

    // 절사 적용
    let roundingDiff = 0;
    const settlements: SettlementDetail[] = participants.map((p) => {
      const originalOwed = owedMap[p.id] || 0;
      const roundedOwed = applyRounding(originalOwed, roundingUnit);
      roundingDiff += roundedOwed - originalOwed;

      const paid = paidMap[p.id] || 0;
      const net = paid - roundedOwed;

      return {
        participantId: p.id,
        name: p.name,
        totalPaid: paid,
        totalOwed: roundedOwed,
        netAmount: net,
      };
    });

    // 최소 송금 거래 계획 계산 (Greedy 알고리즘)
    // debtors: 보내야 할 사람 (net < 0)
    // creditors: 받아야 할 사람 (net > 0)
    const debtors: { name: string; amount: number }[] = [];
    const creditors: { name: string; amount: number }[] = [];

    settlements.forEach((s) => {
      if (s.netAmount <= -1) {
        debtors.push({ name: s.name, amount: -s.netAmount });
      } else if (s.netAmount >= 1) {
        creditors.push({ name: s.name, amount: s.netAmount });
      }
    });

    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const transfers: TransferPlan[] = [];
    let dIdx = 0;
    let cIdx = 0;

    while (dIdx < debtors.length && cIdx < creditors.length) {
      const debtor = debtors[dIdx];
      const creditor = creditors[cIdx];
      const transferAmount = Math.min(debtor.amount, creditor.amount);

      if (transferAmount >= 1) {
        transfers.push({
          fromName: debtor.name,
          toName: creditor.name,
          amount: Math.round(transferAmount),
        });
      }

      debtor.amount -= transferAmount;
      creditor.amount -= transferAmount;

      if (debtor.amount < 1) dIdx++;
      if (creditor.amount < 1) cIdx++;
    }

    return {
      totalAmount,
      settlements,
      transfers,
      roundingDifference: Math.round(roundingDiff),
    };
  } catch (err) {
    console.error('더치페이 계산 오류:', err);
    return { totalAmount: 0, settlements: [], transfers: [], roundingDifference: 0 };
  }
}

/**
 * 카카오톡/클립보드 공유용 정산 내역 텍스트 생성
 */
export function formatDutchPayShareText(
  result: DutchPayResult,
  items: ExpenseItem[],
  bankAccount?: string
): string {
  try {
    const lines: string[] = [];
    lines.push('🧾 [더치페이 정산 영수증]');
    lines.push(`총 지출 금액: ${result.totalAmount.toLocaleString()}원`);
    lines.push('---------------------------');

    if (items.length > 0) {
      lines.push('[지출 내역]');
      items.forEach((item, idx) => {
        lines.push(`${idx + 1}. ${item.title}: ${item.amount.toLocaleString()}원 (${item.participantIds.length}명 참여)`);
      });
      lines.push('---------------------------');
    }

    if (result.transfers.length > 0) {
      lines.push('[정산 송금 안내]');
      result.transfers.forEach((t) => {
        lines.push(`• ${t.fromName} ➔ ${t.toName}: ${t.amount.toLocaleString()}원`);
      });
    } else {
      lines.push('모든 금액이 정산 완료되었습니다.');
    }

    if (bankAccount && bankAccount.trim()) {
      lines.push('---------------------------');
      lines.push(`💳 입금 계좌: ${bankAccount.trim()}`);
    }

    return lines.join('\n');
  } catch (err) {
    console.error('공유 텍스트 생성 오류:', err);
    return '';
  }
}
