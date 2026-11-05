// dutchPay.ts 단위 테스트
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyRounding,
  calculateDutchPay,
  formatDutchPayShareText,
} from '../src/utils/dutchPay.ts';

test('applyRounding: 절사 단위별 올림/내림/반올림 검증', () => {
  assert.equal(applyRounding(1234, 'none'), 1234);
  assert.equal(applyRounding(1234, 'floor100'), 1200);
  assert.equal(applyRounding(1234, 'ceil100'), 1300);
  assert.equal(applyRounding(1260, 'round100'), 1300);
  assert.equal(applyRounding(1240, 'round100'), 1200);
  assert.equal(applyRounding(1234, 'ceil1000'), 2000);
});

test('calculateDutchPay: 3명 1/n 정산 검증 (A가 60,000원 결제)', () => {
  const participants = [
    { id: '1', name: '김철수' },
    { id: '2', name: '이영희' },
    { id: '3', name: '박민수' },
  ];
  const items = [
    { id: 'item1', title: '저녁 삼겹살', amount: 60000, payerId: '1', participantIds: ['1', '2', '3'] },
  ];

  const res = calculateDutchPay(participants, items, 'none');

  assert.equal(res.totalAmount, 60000);
  // 철수는 60,000 지불, 각자 20,000씩 부담 -> 철수 net +40,000, 영희 -20,000, 민수 -20,000
  const chulsoo = res.settlements.find((s) => s.name === '김철수');
  assert.equal(chulsoo?.totalPaid, 60000);
  assert.equal(chulsoo?.totalOwed, 20000);
  assert.equal(chulsoo?.netAmount, 40000);

  // 송금 계획: 영희->철수 20,000, 민수->철수 20,000
  assert.equal(res.transfers.length, 2);
});

test('calculateDutchPay: 차등 항목 정산 (식사 3명 + 카페 2명)', () => {
  const participants = [
    { id: '1', name: '호스트' },
    { id: '2', name: '게스트A' },
    { id: '3', name: '게스트B' },
  ];
  const items = [
    { id: 'i1', title: '점심', amount: 30000, payerId: '1', participantIds: ['1', '2', '3'] }, // 인당 10,000
    { id: 'i2', title: '카페(B 제외)', amount: 10000, payerId: '2', participantIds: ['1', '2'] }, // 인당 5,000
  ];

  const res = calculateDutchPay(participants, items, 'none');

  assert.equal(res.totalAmount, 40000);
  const guestB = res.settlements.find((s) => s.name === '게스트B');
  assert.equal(guestB?.totalOwed, 10000); // 카페 안 마셨으므로 10,000원만 부담
});

test('formatDutchPayShareText: 카카오톡 공유용 포맷팅 검증', () => {
  const res = {
    totalAmount: 30000,
    settlements: [],
    transfers: [{ fromName: '이영희', toName: '김철수', amount: 15000 }],
    roundingDifference: 0,
  };
  const items = [{ id: '1', title: '치킨', amount: 30000, payerId: '1', participantIds: ['1', '2'] }];
  const text = formatDutchPayShareText(res, items, '카카오뱅크 3333-01-123456');

  assert.match(text, /🧾 \[더치페이 정산 영수증\]/);
  assert.match(text, /총 지출 금액: 30,000원/);
  assert.match(text, /이영희 ➔ 김철수: 15,000원/);
  assert.match(text, /카카오뱅크/);
});
