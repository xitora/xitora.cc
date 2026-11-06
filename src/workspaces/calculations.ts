export type Person = { id: string; name: string };
export type Expense = {
  id: string;
  title: string;
  amount: number;
  payer: string;
  people: string[];
};
export function settle(people: Person[], expenses: Expense[]) {
  if (new Set(people.map((p) => p.id)).size !== people.length)
    throw Error("참여자가 중복되었습니다.");
  let total = 0;
  const balance = Object.fromEntries(people.map((p) => [p.id, 0]));
  for (const item of expenses) {
    if (!Number.isSafeInteger(item.amount) || item.amount < 0)
      throw Error("금액은 0 이상의 원 단위 정수여야 합니다.");
    if (
      !(item.payer in balance) ||
      !item.people.length ||
      item.people.some((id) => !(id in balance)) ||
      new Set(item.people).size !== item.people.length
    )
      throw Error("결제자와 참여자를 확인하세요.");
    total += item.amount;
    if (!Number.isSafeInteger(total))
      throw Error("합계가 계산 가능한 정수 범위를 초과했습니다.");
    balance[item.payer] += item.amount;
    const base = Math.floor(item.amount / item.people.length),
      remainder = item.amount % item.people.length;
    item.people.forEach(
      (id, i) => (balance[id] -= base + (i < remainder ? 1 : 0)),
    );
  }
  const debt = Object.entries(balance)
    .filter(([, v]) => v < 0)
    .map(([id, v]) => ({ id, value: -v }));
  const credit = Object.entries(balance)
    .filter(([, v]) => v > 0)
    .map(([id, value]) => ({ id, value }));
  const transfers: { from: string; to: string; amount: number }[] = [];
  let i = 0,
    j = 0;
  while (i < debt.length && j < credit.length) {
    const amount = Math.min(debt[i].value, credit[j].value);
    transfers.push({ from: debt[i].id, to: credit[j].id, amount });
    debt[i].value -= amount;
    credit[j].value -= amount;
    if (!debt[i].value) i++;
    if (!credit[j].value) j++;
  }
  return {
    balance,
    transfers,
    total,
  };
}
export const unitGroups: Record<string, Record<string, number>> = {
  길이: {
    m: 1,
    cm: 0.01,
    mm: 0.001,
    km: 1000,
    inch: 0.0254,
    ft: 0.3048,
    yd: 0.9144,
    mile: 1609.344,
  },
  면적: { "m²": 1, "km²": 1e6, 평: 3.305785124, ha: 10000, acre: 4046.8564224 },
  무게: {
    kg: 1,
    g: 0.001,
    mg: 0.000001,
    t: 1000,
    lb: 0.45359237,
    oz: 0.028349523125,
    근: 0.6,
  },
  데이터: {
    B: 1,
    KB: 1e3,
    MB: 1e6,
    GB: 1e9,
    TB: 1e12,
    PB: 1e15,
    KiB: 1024,
    MiB: 1048576,
    GiB: 1073741824,
    TiB: 1099511627776,
    PiB: 1125899906842624,
    bit: 0.125,
  },
  온도: { "°C": 1, "°F": 1, K: 1 },
  속도: { "m/s": 1, "km/h": 1 / 3.6, mph: 0.44704, knot: 0.514444444 },
  시간: { 초: 1, 분: 60, 시간: 3600, 일: 86400, 주: 604800 },
};
export function convertUnit(
  value: number,
  group: string,
  from: string,
  to: string,
) {
  if (!Number.isFinite(value)) throw Error("숫자를 입력하세요.");
  if (!unitGroups[group]?.[from] || !unitGroups[group]?.[to])
    throw Error("단위를 확인하세요.");
  if (group === "온도") {
    const c =
      from === "°F"
        ? ((value - 32) * 5) / 9
        : from === "K"
          ? value - 273.15
          : value;
    return to === "°F" ? (c * 9) / 5 + 32 : to === "K" ? c + 273.15 : c;
  }
  return (value * unitGroups[group][from]) / unitGroups[group][to];
}
