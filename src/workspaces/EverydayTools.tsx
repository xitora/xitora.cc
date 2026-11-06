import { useEffect, useRef, useState } from "react";
import { NoiseEngine, INITIAL_TRACKS } from "../utils/noiseAudio";
import { WORLD_CITIES, calculateBusinessOverlap } from "../utils/worldTime";
import {
  convertUnit,
  settle,
  unitGroups,
  type Person,
  type Expense,
} from "./calculations";
import {
  DraftActions,
  Field,
  NumberField,
  Output,
  Panels,
  Select,
  useDraft,
} from "./shared";
export default function EverydayTools({ toolId }: { toolId: string }) {
  const initial = {
    group: "길이",
    from: "m",
    to: "cm",
    value: 1,
    focus: 25,
    rest: 5,
    tracks: INITIAL_TRACKS,
    volume: 0.3,
    date: new Date().toISOString().slice(0, 10),
    other: new Date().toISOString().slice(0, 10),
    days: 7,
    unix: String(Math.floor(Date.now() / 1000)),
    unixUnit: "초",
    cities: ["seoul", "tokyo", "london"],
    start: 9,
    end: 18,
    people: [
      { id: "a", name: "나" },
      { id: "b", name: "친구" },
    ] as Person[],
    expenses: [] as Expense[],
  };
  const [s, set, reset] = useDraft(toolId, initial);
  const patch = (p: Partial<typeof s>) => set({ ...s, ...p });
  const [seconds, setSeconds] = useState(s.focus * 60);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState("집중");
  const deadline = useRef(0);
  const engine = useRef<NoiseEngine | null>(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (toolId !== "datetime") return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [toolId]);
  useEffect(
    () => () => {
      engine.current?.dispose();
    },
    [],
  );
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.ceil((deadline.current - Date.now()) / 1000),
      );
      setSeconds(remaining);
      if (!remaining) {
        setRunning(false);
        setPhase((p) => (p === "집중" ? "휴식" : "집중"));
        setSeconds((phase === "집중" ? s.rest : s.focus) * 60);
        engine.current?.stop();
        setPlaying(false);
      }
    }, 250);
    return () => clearInterval(timer);
  }, [running, phase, s.focus, s.rest]);
  let result = "";
  try {
    if (toolId === "units")
      result = `${s.value} ${s.from} = ${Number(convertUnit(s.value, s.group, s.from, s.to).toPrecision(12))} ${s.to}`;
    if (toolId === "datetime") {
      const a = new Date(s.date + "T00:00:00Z"),
        b = new Date(s.other + "T00:00:00Z");
      const ts = Number(s.unix) * (s.unixUnit === "초" ? 1000 : 1);
      const d = new Date(ts);
      if (
        !Number.isFinite(a.getTime()) ||
        !Number.isFinite(b.getTime()) ||
        !Number.isFinite(d.getTime())
      )
        throw Error("유효한 날짜와 Unix 값을 입력하세요.");
      const add = new Date(a);
      add.setUTCDate(add.getUTCDate() + s.days);
      result = `날짜 차이: ${(b.getTime() - a.getTime()) / 86400000}일\n${s.days}일 후: ${add.toISOString().slice(0, 10)}\nUnix → ISO: ${d.toISOString()}\n날짜 → Unix: ${a.getTime() / (s.unixUnit === "초" ? 1000 : 1)}`;
    }
    if (toolId === "settlement") {
      const r = settle(s.people, s.expenses);
      const name = (id: string) =>
        s.people.find((p) => p.id === id)?.name || id;
      result =
        `총 ${r.total.toLocaleString()}원\n\n` +
        r.transfers
          .map(
            (t) =>
              `${name(t.from)} → ${name(t.to)}: ${t.amount.toLocaleString()}원`,
          )
          .join("\n") +
        (!r.transfers.length ? "송금할 금액이 없습니다." : "") +
        "\n\n남는 원은 항목의 참여자 순서대로 1원씩 배분합니다.";
    }
  } catch (e) {
    result = e instanceof Error ? e.message : String(e);
  }
  return (
    <Panels
      actions={
        <DraftActions
          id={toolId}
          state={s}
          setState={set}
          reset={() => {
            reset();
            setRunning(false);
            setSeconds(initial.focus * 60);
            setPhase("집중");
            setError("");
            engine.current?.stop();
            setPlaying(false);
          }}
        />
      }
      options={
        <>
          {toolId === "units" && (
            <>
              <Select
                label="종류"
                value={s.group}
                items={Object.keys(unitGroups)}
                onChange={(group) => {
                  const keys = Object.keys(unitGroups[group]);
                  patch({ group, from: keys[0], to: keys[1] });
                }}
              />
              <Select
                label="입력 단위"
                value={s.from}
                items={Object.keys(unitGroups[s.group])}
                onChange={(from) => patch({ from })}
              />
              <Select
                label="결과 단위"
                value={s.to}
                items={Object.keys(unitGroups[s.group])}
                onChange={(to) => patch({ to })}
              />
              <button onClick={() => patch({ from: s.to, to: s.from })}>
                단위 맞바꾸기
              </button>
            </>
          )}
          {toolId === "focus" && (
            <>
              <NumberField
                label="집중 (분)"
                value={s.focus}
                min={1}
                max={240}
                onChange={(focus) => {
                  patch({ focus });
                  if (!running) setSeconds(focus * 60);
                }}
              />
              <NumberField
                label="휴식 (분)"
                value={s.rest}
                min={1}
                max={120}
                onChange={(rest) => patch({ rest })}
              />
              <NumberField
                label="전체 음량 (0~1)"
                value={s.volume}
                min={0}
                max={1}
                step={0.05}
                onChange={(volume) => {
                  patch({ volume });
                  engine.current?.setMasterVolume(volume);
                }}
              />
            </>
          )}
          {toolId === "datetime" && (
            <>
              <NumberField
                label="업무 시작 시각"
                value={s.start}
                min={0}
                max={23}
                onChange={(start) => patch({ start })}
              />
              <NumberField
                label="업무 종료 시각"
                value={s.end}
                min={1}
                max={24}
                onChange={(end) => patch({ end })}
              />
              <Field label="도시 추가">
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value && !s.cities.includes(e.target.value))
                      patch({ cities: [...s.cities, e.target.value] });
                  }}
                >
                  <option value="">도시 선택</option>
                  {WORLD_CITIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameKo}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          )}
          {toolId === "settlement" && (
            <>
              <p>참여자</p>
              {s.people.map((p) => (
                <div className="ws-row" key={p.id}>
                  <input
                    aria-label="참여자 이름"
                    value={p.name}
                    onChange={(e) =>
                      patch({
                        people: s.people.map((x) =>
                          x.id === p.id ? { ...x, name: e.target.value } : x,
                        ),
                      })
                    }
                  />
                  <button
                    onClick={() => {
                      if (
                        s.expenses.some(
                          (e) => e.payer === p.id || e.people.includes(p.id),
                        )
                      ) {
                        setError("이 참여자의 비용을 먼저 수정하세요.");
                        return;
                      }
                      patch({ people: s.people.filter((x) => x.id !== p.id) });
                    }}
                  >
                    삭제
                  </button>
                </div>
              ))}
              <button
                onClick={() =>
                  patch({
                    people: [
                      ...s.people,
                      {
                        id: crypto.randomUUID(),
                        name: "참여자 " + (s.people.length + 1),
                      },
                    ],
                  })
                }
              >
                참여자 추가
              </button>
            </>
          )}
        </>
      }
      result={
        toolId === "focus" ? (
          <>
            <p>{phase}</p>
            <div style={{ fontSize: 60, fontVariantNumeric: "tabular-nums" }}>
              {String(Math.floor(seconds / 60)).padStart(2, "0")}:
              {String(seconds % 60).padStart(2, "0")}
            </div>
            <div className="ws-actions">
              <button
                onClick={() => {
                  if (running) setRunning(false);
                  else {
                    deadline.current = Date.now() + seconds * 1000;
                    setRunning(true);
                  }
                }}
              >
                {running ? "일시 정지" : "시작"}
              </button>
              <button
                onClick={() => {
                  setRunning(false);
                  setSeconds((phase === "집중" ? s.focus : s.rest) * 60);
                }}
              >
                타이머 초기화
              </button>
              <button
                onClick={() => {
                  setRunning(false);
                  const next = phase === "집중" ? "휴식" : "집중";
                  setPhase(next);
                  setSeconds((next === "집중" ? s.focus : s.rest) * 60);
                }}
              >
                집중·휴식 전환
              </button>
            </div>
          </>
        ) : (
          <Output value={result} />
        )
      }
    >
      {toolId === "units" && (
        <NumberField
          label="값"
          value={s.value}
          onChange={(value) => patch({ value })}
        />
      )}
      {toolId === "datetime" && (
        <>
          <div className="ws-row">
            <Field label="기준 날짜">
              <input
                type="date"
                value={s.date}
                onChange={(e) => patch({ date: e.target.value })}
              />
            </Field>
            <Field label="비교 날짜">
              <input
                type="date"
                value={s.other}
                onChange={(e) => patch({ other: e.target.value })}
              />
            </Field>
          </div>
          <NumberField
            label="더할 날짜 (음수는 빼기)"
            value={s.days}
            onChange={(days) => patch({ days })}
          />
          <Field label="Unix 타임스탬프">
            <input
              value={s.unix}
              onChange={(e) => patch({ unix: e.target.value })}
            />
          </Field>
          <Select
            label="Unix 단위"
            value={s.unixUnit}
            items={["초", "밀리초"]}
            onChange={(unixUnit) => patch({ unixUnit })}
          />
          {s.cities.map((id) => {
            const c = WORLD_CITIES.find((c) => c.id === id);
            return (
              c && (
                <div className="ws-row" key={id}>
                  <span>
                    {c.nameKo}:{" "}
                    {new Intl.DateTimeFormat("ko-KR", {
                      timeZone: c.timeZone,
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(now))}
                  </span>
                  <button
                    onClick={() =>
                      patch({ cities: s.cities.filter((x) => x !== id) })
                    }
                  >
                    제거
                  </button>
                </div>
              )
            );
          })}
          <details>
            <summary>업무 시간 겹치는 구간 (내 시간대 기준)</summary>
            {Number.isFinite(new Date(s.date + "T12:00:00").getTime()) && (
              <>
                {calculateBusinessOverlap(
                  WORLD_CITIES.filter((c) => s.cities.includes(c.id)),
                  new Date(s.date + "T12:00:00"),
                  s.start,
                  s.end,
                )
                  .goldenRanges.filter((r) => r.isAllOverlap)
                  .map((r, i) => (
                    <p key={i}>
                      {r.startHour}:00 ~ {r.endHour}:00 ({r.durationHours}시간)
                    </p>
                  ))}
                <p>
                  선택한 모든 도시가 업무 중인 시간대입니다. 구간이 없으면 공통
                  업무 시간이 없습니다.
                </p>
              </>
            )}
          </details>
        </>
      )}
      {toolId === "focus" && (
        <>
          <p>소리는 재생 버튼을 눌렀을 때만 시작합니다.</p>
          {s.tracks.map((track) => (
            <div key={track.id}>
              <label>
                <input
                  type="checkbox"
                  checked={track.enabled}
                  onChange={(e) => {
                    const enabled = e.target.checked;
                    patch({
                      tracks: s.tracks.map((t) =>
                        t.id === track.id ? { ...t, enabled } : t,
                      ),
                    });
                    engine.current?.setTrackVolume(
                      track.id,
                      track.volume,
                      enabled,
                    );
                  }}
                />{" "}
                {track.name}
              </label>
              <Field label={track.name + " 음량"}>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step=".01"
                  value={track.volume}
                  onChange={(e) => {
                    const volume = Number(e.target.value);
                    patch({
                      tracks: s.tracks.map((t) =>
                        t.id === track.id ? { ...t, volume } : t,
                      ),
                    });
                    engine.current?.setTrackVolume(
                      track.id,
                      volume,
                      track.enabled,
                    );
                  }}
                />
              </Field>
            </div>
          ))}
          <button
            onClick={() => {
              if (playing) engine.current?.stop();
              else {
                engine.current ??= new NoiseEngine();
                engine.current.init();
                engine.current.setMasterVolume(s.volume);
                engine.current.start(s.tracks);
              }
              setPlaying(!playing);
            }}
          >
            {playing ? "소리 정지" : "소리 재생"}
          </button>
        </>
      )}
      {toolId === "settlement" && (
        <>
          {error && <p role="alert">{error}</p>}
          {s.expenses.map((item) => (
            <div className="ws-card" key={item.id}>
              <Field label="항목">
                <input
                  value={item.title}
                  onChange={(e) =>
                    patch({
                      expenses: s.expenses.map((x) =>
                        x.id === item.id ? { ...x, title: e.target.value } : x,
                      ),
                    })
                  }
                />
              </Field>
              <NumberField
                label="금액 (원)"
                value={item.amount}
                min={0}
                step={1}
                onChange={(amount) =>
                  patch({
                    expenses: s.expenses.map((x) =>
                      x.id === item.id ? { ...x, amount } : x,
                    ),
                  })
                }
              />
              <Select
                label="결제자"
                value={item.payer}
                items={s.people.map((p) => [p.id, p.name])}
                onChange={(payer) =>
                  patch({
                    expenses: s.expenses.map((x) =>
                      x.id === item.id ? { ...x, payer } : x,
                    ),
                  })
                }
              />
              <p>비용을 나눌 사람</p>
              {s.people.map((p) => (
                <label key={p.id} style={{ display: "block" }}>
                  <input
                    type="checkbox"
                    checked={item.people.includes(p.id)}
                    onChange={(e) =>
                      patch({
                        expenses: s.expenses.map((x) =>
                          x.id === item.id
                            ? {
                                ...x,
                                people: e.target.checked
                                  ? [...x.people, p.id]
                                  : x.people.filter((id) => id !== p.id),
                              }
                            : x,
                        ),
                      })
                    }
                  />{" "}
                  {p.name}
                </label>
              ))}
              <button
                onClick={() =>
                  patch({
                    expenses: s.expenses.filter((x) => x.id !== item.id),
                  })
                }
              >
                항목 삭제
              </button>
            </div>
          ))}
          <button
            disabled={!s.people.length}
            onClick={() =>
              patch({
                expenses: [
                  ...s.expenses,
                  {
                    id: crypto.randomUUID(),
                    title: "새 비용",
                    amount: 0,
                    payer: s.people[0]?.id,
                    people: s.people.map((p) => p.id),
                  },
                ],
              })
            }
          >
            비용 추가
          </button>
        </>
      )}
    </Panels>
  );
}
