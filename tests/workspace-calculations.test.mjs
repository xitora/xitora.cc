import test from "node:test";
import assert from "node:assert/strict";
import { settle, convertUnit } from "../src/workspaces/calculations.ts";
test("원 단위 정산은 금액과 참여자별 잔액을 보존한다", () => {
  const people = ["a", "b", "c"].map((id) => ({ id, name: id }));
  const result = settle(people, [
    {
      id: "1",
      title: "밥",
      amount: 10000,
      payer: "a",
      people: ["a", "b", "c"],
    },
    { id: "2", title: "커피", amount: 7001, payer: "b", people: ["b", "c"] },
  ]);
  assert.equal(result.total, 17001);
  assert.equal(
    Object.values(result.balance).reduce((a, b) => a + b, 0),
    0,
  );
  const balances = { ...result.balance };
  for (const transfer of result.transfers) {
    assert.ok(Number.isInteger(transfer.amount));
    balances[transfer.from] += transfer.amount;
    balances[transfer.to] -= transfer.amount;
  }
  assert.ok(Object.values(balances).every((v) => v === 0));
});
test("참여자가 없거나 금액이 소수인 정산은 거부한다", () => {
  const people = [{ id: "a", name: "나" }];
  assert.throws(() =>
    settle(people, [
      { id: "1", title: "", amount: 1.2, payer: "a", people: ["a"] },
    ]),
  );
  assert.throws(() =>
    settle(people, [{ id: "1", title: "", amount: 1, payer: "a", people: [] }]),
  );
});
test("온도와 이진 데이터 단위를 정확히 변환한다", () => {
  assert.equal(convertUnit(32, "온도", "°F", "°C"), 0);
  assert.equal(convertUnit(0, "온도", "°C", "K"), 273.15);
  assert.equal(convertUnit(1, "데이터", "GiB", "MiB"), 1024);
  assert.equal(convertUnit(1, "데이터", "GB", "MB"), 1000);
  assert.equal(convertUnit(36, "속도", "km/h", "m/s"), 10);
  assert.throws(() => convertUnit(NaN, "길이", "m", "cm"));
});

import { parsePages } from "../src/workspaces/pdfPages.ts";
test("PDF 페이지 선택은 순서를 보존하고 범위 밖 입력을 거부한다", () => {
  assert.deepEqual(parsePages("3,1-2", 3), [2, 0, 1]);
  assert.deepEqual(parsePages("", 2), [0, 1]);
  for (const input of ["0", "4", "2-1", "1-x"])
    assert.throws(() => parsePages(input, 3));
});
test("정산 합계의 정수 범위를 초과하면 계산을 중단한다", () => {
  assert.throws(() =>
    settle(
      [{ id: "a", name: "A" }],
      [
        {
          id: "1",
          title: "",
          amount: Number.MAX_SAFE_INTEGER,
          payer: "a",
          people: ["a"],
        },
        { id: "2", title: "", amount: 1, payer: "a", people: ["a"] },
      ],
    ),
  );
});
