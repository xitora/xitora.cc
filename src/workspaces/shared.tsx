import { toolsList } from "../data/tools";
import { unitGroups } from "./calculations";
import { useEffect, useRef, useState, type ReactNode } from "react";
export const DRAFT_PREFIX = "xitora:workspace:v1:";
export function saveFile(
  data: Blob | string | Uint8Array,
  name: string,
  type = "text/plain",
) {
  const blob =
    data instanceof Blob
      ? data
      : new Blob(
          [typeof data === "string" ? data : new Uint8Array(data).buffer],
          { type },
        );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function matchesShape(value: unknown, sample: unknown): boolean {
  if (typeof sample === "number")
    return typeof value === "number" && Number.isFinite(value);
  if (Array.isArray(sample))
    return (
      Array.isArray(value) &&
      (!sample.length || value.every((item) => matchesShape(item, sample[0])))
    );
  if (sample && typeof sample === "object")
    return (
      !!value &&
      typeof value === "object" &&
      Object.entries(sample).every(([key, item]) =>
        matchesShape((value as Record<string, unknown>)[key], item),
      )
    );
  return typeof value === typeof sample;
}
function matchesWorkspace(id: string, value: unknown, sample: unknown) {
  if (!matchesShape(value, sample)) return false;
  const state = value as Record<string, unknown>;
  if (id === "settlement")
    return (
      Array.isArray(state.expenses) &&
      state.expenses.every((item) =>
        matchesShape(item, {
          id: "",
          title: "",
          amount: 0,
          payer: "",
          people: [""],
        }),
      )
    );
  if (id === "units")
    return (
      typeof state.group === "string" &&
      !!unitGroups[state.group] &&
      typeof state.from === "string" &&
      typeof state.to === "string" &&
      Object.hasOwn(unitGroups[state.group], state.from) &&
      Object.hasOwn(unitGroups[state.group], state.to)
    );
  return true;
}
export function useDraft<T extends object>(
  id: string,
  initial: T,
  enabled = toolsList.find((tool) => tool.id === id)?.storage !== "memory",
): [T, (value: T) => void, () => void] {
  const initialRef = useRef(initial);
  const pending = useRef(false);
  const latest = useRef(initial);
  const [state, setState] = useState<T>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(DRAFT_PREFIX + id) || "null");
      if (
        enabled &&
        raw?.version === 1 &&
        Date.now() - raw.updatedAt < 7 * 86400000 &&
        matchesWorkspace(id, raw.state, initial)
      )
        return raw.state;
    } catch {}
    return initial;
  });
  latest.current = state;
  useEffect(() => {
    const flush = () => {
      if (!enabled || !pending.current) return;
      try {
        localStorage.setItem(
          DRAFT_PREFIX + id,
          JSON.stringify({
            version: 1,
            updatedAt: Date.now(),
            state: latest.current,
          }),
        );
      } catch {}
      pending.current = false;
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [enabled, id]);
  useEffect(() => {
    if (!enabled || !pending.current) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          DRAFT_PREFIX + id,
          JSON.stringify({ version: 1, updatedAt: Date.now(), state }),
        );
      } catch {}
      pending.current = false;
    }, 500);
    return () => clearTimeout(timer);
  }, [state, id, enabled]);
  return [
    state,
    (value) => {
      pending.current = true;
      setState(value);
    },
    () => {
      pending.current = false;
      localStorage.removeItem(DRAFT_PREFIX + id);
      setState(initialRef.current);
    },
  ];
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="ws-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function Select({
  label,
  value,
  onChange,
  items,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  items: string[] | string[][];
}) {
  return (
    <Field label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {items.map((item) => {
          const [v, t] = typeof item === "string" ? [item, item] : item;
          return (
            <option key={v} value={v}>
              {t}
            </option>
          );
        })}
      </select>
    </Field>
  );
}
export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step || "any"}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </Field>
  );
}
export function Editor({
  value,
  onChange,
  label = "입력",
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  return (
    <textarea
      className="ws-editor"
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      spellCheck={false}
    />
  );
}
export function Output({
  value,
  name = "result.txt",
}: {
  value: string;
  name?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <>
      <div className="ws-actions">
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {
              alert("클립보드에 접근할 수 없습니다. 다운로드를 이용하세요.");
            }
          }}
        >
          {copied ? "복사됨" : "복사"}
        </button>
        <button onClick={() => saveFile(value, name)}>다운로드</button>
      </div>
      <pre className="ws-output">{value || "결과가 여기에 표시됩니다."}</pre>
    </>
  );
}
export function Files({
  onFiles,
  accept,
  multiple = true,
}: {
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
}) {
  return (
    <label
      className="ws-drop"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onFiles(Array.from(e.dataTransfer.files));
      }}
      onPaste={(e) => {
        if (e.clipboardData.files.length)
          onFiles(Array.from(e.clipboardData.files));
      }}
    >
      파일을 선택하거나 여기에 놓으세요
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(e) => {
          onFiles(Array.from(e.target.files || []));
          e.target.value = "";
        }}
      />
    </label>
  );
}
export function DraftActions<T extends object>({
  id,
  state,
  setState,
  reset,
}: {
  id: string;
  state: T;
  setState: (v: T) => void;
  reset: () => void;
}) {
  return (
    <div className="ws-actions">
      <button onClick={reset}>초기화</button>
      <button
        onClick={() =>
          saveFile(
            JSON.stringify({ version: 1, tool: id, state }, null, 2),
            id + ".json",
            "application/json",
          )
        }
      >
        설정 내보내기
      </button>
      <label
        className="ws-button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.currentTarget.querySelector("input")?.click();
          }
        }}
      >
        불러오기
        <input
          hidden
          type="file"
          accept="application/json"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              const data = JSON.parse(await f.text());
              if (
                data.version !== 1 ||
                data.tool !== id ||
                !data.state ||
                !matchesWorkspace(id, data.state, state)
              )
                throw Error("이 도구의 설정 파일이 아닙니다.");
              setState(data.state);
            } catch (err) {
              alert(String(err));
            }
            e.target.value = "";
          }}
        />
      </label>
    </div>
  );
}
export function Panels({
  options,
  children,
  result,
  actions,
}: {
  options?: ReactNode;
  children: ReactNode;
  result?: ReactNode;
  actions?: ReactNode;
}) {
  const [tab, setTab] = useState(() =>
    localStorage.getItem("xitora:workspace-tab") === "result"
      ? "result"
      : "edit",
  );
  const [open, setOpen] = useState(
    () => localStorage.getItem("xitora:workspace-options") === "open",
  );
  useEffect(() => localStorage.setItem("xitora:workspace-tab", tab), [tab]);
  useEffect(
    () =>
      localStorage.setItem(
        "xitora:workspace-options",
        open ? "open" : "closed",
      ),
    [open],
  );
  return (
    <>
      <div className="ws-toolbar">
        <button className="ws-mobile" onClick={() => setOpen(!open)}>
          옵션 {open ? "닫기" : "열기"}
        </button>
        <div className="ws-mobile">
          <button onClick={() => setTab("edit")} aria-pressed={tab === "edit"}>
            편집
          </button>
          <button
            onClick={() => setTab("result")}
            aria-pressed={tab === "result"}
          >
            결과
          </button>
        </div>
        {actions}
      </div>
      <div className="ws-panels" data-tab={tab}>
        {options && (
          <aside className={`ws-options ${open ? "is-open" : ""}`}>
            <h2>옵션</h2>
            {options}
          </aside>
        )}
        <section className="ws-main">
          <h2>작업</h2>
          {children}
        </section>
        {result && (
          <section className="ws-result">
            <h2>결과</h2>
            {result}
          </section>
        )}
      </div>
    </>
  );
}
export function useTask() {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  return {
    status,
    busy,
    cancel: () => {
      controller.current?.abort();
      setStatus("취소했습니다.");
    },
    run: async (
      job: (signal: AbortSignal, report: (s: string) => void) => Promise<void>,
    ) => {
      const c = new AbortController();
      controller.current = c;
      setBusy(true);
      setStatus("처리 중…");
      try {
        await job(c.signal, setStatus);
        c.signal.throwIfAborted();
        setStatus("완료했습니다.");
      } catch (e) {
        setStatus(
          c.signal.aborted
            ? "취소했습니다."
            : e instanceof Error
              ? e.message
              : String(e),
        );
      } finally {
        setBusy(false);
      }
    },
  };
}
export const pause = async (signal?: AbortSignal) => {
  await new Promise((r) => setTimeout(r, 0));
  signal?.throwIfAborted();
};
export function useObjectUrl(blob: Blob | null) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!blob) {
      setUrl("");
      return;
    }
    const value = URL.createObjectURL(blob);
    setUrl(value);
    return () => URL.revokeObjectURL(value);
  }, [blob]);
  return url;
}
