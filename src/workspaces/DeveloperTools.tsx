import { useState } from "react";
import {
  parseCurlCommand,
  generateFetchCode,
  generateAxiosCode,
  generatePythonRequestsCode,
  generateGoCode,
} from "../utils/curl";
import {
  decodeJwt,
  evaluateTokenStatus,
  verifyHmacSignature,
} from "../utils/jwt";
import Papa from "papaparse";
import {
  DraftActions,
  Editor,
  Field,
  NumberField,
  Output,
  Panels,
  Select,
  useDraft,
  useTask,
} from "./shared";
type Schema = {
  id: string;
  key: string;
  type: string;
  min: number;
  max: number;
  value: string;
};
export default function DeveloperTools({ toolId }: { toolId: string }) {
  const [s, set, reset] = useDraft(
    toolId,
    {
      input: "",
      mode: "URL",
      language: "Fetch",
      secret: "",
      count: 20,
      fields: [
        { id: "1", key: "id", type: "UUID", min: 0, max: 100, value: "" },
        { id: "2", key: "name", type: "이름", min: 0, max: 100, value: "" },
      ] as Schema[],
    },
    toolId !== "requests",
  );
  const patch = (p: Partial<typeof s>) => set({ ...s, ...p });
  const [output, setOutput] = useState("");
  const [csv, setCsv] = useState("");
  const task = useTask();
  let url: URL | null = null;
  try {
    url = new URL(s.input);
  } catch {}
  function updateQuery(
    index: number,
    key: string,
    value: string,
    remove = false,
  ) {
    if (!url) return;
    const params = Array.from(url.searchParams.entries());
    if (remove) params.splice(index, 1);
    else params[index] = [key, value];
    url.search = new URLSearchParams(params).toString();
    patch({ input: url.href });
  }

  async function run() {
    await task.run(async (signal) => {
      if (toolId === "requests") {
        if (s.mode === "URL") {
          const url = new URL(s.input);
          setOutput(
            JSON.stringify(
              {
                protocol: url.protocol,
                host: url.host,
                pathname: url.pathname,
                hash: url.hash,
                query: Array.from(url.searchParams.entries()),
              },
              null,
              2,
            ),
          );
        }
        if (s.mode === "cURL") {
          const parsed = parseCurlCommand(s.input);
          if (!parsed) throw Error("유효한 cURL 명령어를 입력하세요.");
          const gen = {
            Fetch: generateFetchCode,
            Axios: generateAxiosCode,
            Python: generatePythonRequestsCode,
            Go: generateGoCode,
          };
          setOutput(gen[s.language as keyof typeof gen](parsed));
        }
        if (s.mode === "JWT") {
          const decoded = decodeJwt(s.input);
          if (!decoded.success) throw Error(decoded.error);
          const verification = s.secret
            ? await verifyHmacSignature(s.input, s.secret)
            : "서명을 검증하지 않았습니다.";
          signal.throwIfAborted();
          setOutput(
            JSON.stringify(
              {
                ...decoded.data,
                status: evaluateTokenStatus(decoded.data.payload),
                verification,
              },
              null,
              2,
            ),
          );
        }
      } else {
        if (
          !s.fields.length ||
          s.fields.some((f) => !f.key.trim()) ||
          new Set(s.fields.map((f) => f.key.trim())).size !== s.fields.length
        )
          throw Error("필드 이름은 비어 있거나 중복될 수 없습니다.");
        if (!Number.isInteger(s.count) || s.count < 1 || s.count > 10000)
          throw Error("행 수는 1~10,000 사이의 정수여야 합니다.");
        if (
          s.fields.some(
            (f) =>
              f.type === "숫자" &&
              (!Number.isFinite(f.min) ||
                !Number.isFinite(f.max) ||
                f.min > f.max),
          )
        )
          throw Error("숫자 범위를 확인하세요.");
        const data = Array.from({ length: s.count }, (_, i) =>
          Object.fromEntries(
            s.fields.map((f) => [f.key.trim(), sampleValue(f, i)]),
          ),
        );
        setOutput(JSON.stringify(data, null, 2));
        setCsv(Papa.unparse(data));
      }
    });
  }
  return (
    <Panels
      actions={
        <>
          <DraftActions
            id={toolId}
            state={s}
            setState={set}
            reset={() => {
              reset();
              setOutput("");
              setCsv("");
            }}
          />
          <button disabled={task.busy} onClick={run}>
            {toolId === "requests" ? "분석" : "생성"}
          </button>
          <span role="status" className="ws-status">
            {task.status}
          </span>
        </>
      }
      options={
        toolId === "requests" ? (
          <>
            <Select
              label="분석 대상"
              value={s.mode}
              onChange={(mode) => patch({ mode })}
              items={["URL", "cURL", "JWT"]}
            />
            {s.mode === "cURL" && (
              <Select
                label="출력 언어"
                value={s.language}
                onChange={(language) => patch({ language })}
                items={["Fetch", "Axios", "Python", "Go"]}
              />
            )}
            {s.mode === "JWT" && (
              <Field label="HMAC 검증 키">
                <input
                  type="password"
                  autoComplete="off"
                  value={s.secret}
                  onChange={(e) => patch({ secret: e.target.value })}
                />
              </Field>
            )}
            <p>
              요청을 보내지 않습니다. 입력과 검증 키는 자동 저장하지 않습니다.
            </p>
          </>
        ) : (
          <NumberField
            label="행 수 (최대 10,000)"
            value={s.count}
            onChange={(count) => patch({ count })}
            min={1}
            max={10000}
          />
        )
      }
      result={
        <>
          <Output
            value={output}
            name={toolId === "mock-data" ? "sample.json" : "result.txt"}
          />
          {csv && (
            <details>
              <summary>CSV</summary>
              <Output value={csv} name="sample.csv" />
            </details>
          )}
        </>
      }
    >
      {toolId === "requests" ? (
        <>
          <Editor value={s.input} onChange={(input) => patch({ input })} />
          {s.mode === "URL" && url && (
            <details open>
              <summary>쿼리 편집</summary>
              {Array.from(url.searchParams.entries()).map(
                ([key, value], index) => (
                  <div className="ws-row" key={index}>
                    <input
                      aria-label={"쿼리 이름 " + (index + 1)}
                      value={key}
                      onChange={(e) =>
                        updateQuery(index, e.target.value, value)
                      }
                    />
                    <input
                      aria-label={"쿼리 값 " + (index + 1)}
                      value={value}
                      onChange={(e) => updateQuery(index, key, e.target.value)}
                    />
                    <button
                      onClick={() => updateQuery(index, key, value, true)}
                    >
                      삭제
                    </button>
                  </div>
                ),
              )}
              <button
                onClick={() =>
                  updateQuery(url!.searchParams.size, "key", "value")
                }
              >
                쿼리 추가
              </button>
            </details>
          )}
        </>
      ) : (
        <>
          {s.fields.map((f, index) => (
            <div className="ws-card" key={f.id}>
              <Field label="필드 이름">
                <input
                  value={f.key}
                  onChange={(e) =>
                    patch({
                      fields: s.fields.map((x, i) =>
                        i === index ? { ...x, key: e.target.value } : x,
                      ),
                    })
                  }
                />
              </Field>
              <Select
                label="타입"
                value={f.type}
                items={[
                  "UUID",
                  "번호",
                  "이름",
                  "영문 이름",
                  "전화번호",
                  "주소",
                  "도시",
                  "이메일",
                  "날짜",
                  "숫자",
                  "불리언",
                  "고정값",
                  "선택값",
                ]}
                onChange={(type) =>
                  patch({
                    fields: s.fields.map((x, i) =>
                      i === index ? { ...x, type } : x,
                    ),
                  })
                }
              />
              {f.type === "숫자" ? (
                <>
                  <NumberField
                    label="최솟값"
                    value={f.min}
                    onChange={(min) =>
                      patch({
                        fields: s.fields.map((x, i) =>
                          i === index ? { ...x, min } : x,
                        ),
                      })
                    }
                  />
                  <NumberField
                    label="최댓값"
                    value={f.max}
                    onChange={(max) =>
                      patch({
                        fields: s.fields.map((x, i) =>
                          i === index ? { ...x, max } : x,
                        ),
                      })
                    }
                  />
                </>
              ) : (
                ["고정값", "선택값"].includes(f.type) && (
                  <Field label="값 (선택값은 쉼표 구분)">
                    <input
                      value={f.value}
                      onChange={(e) =>
                        patch({
                          fields: s.fields.map((x, i) =>
                            i === index ? { ...x, value: e.target.value } : x,
                          ),
                        })
                      }
                    />
                  </Field>
                )
              )}
              <button
                onClick={() =>
                  patch({ fields: s.fields.filter((_, i) => i !== index) })
                }
              >
                필드 삭제
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              patch({
                fields: [
                  ...s.fields,
                  {
                    id: crypto.randomUUID(),
                    key: "field" + (s.fields.length + 1),
                    type: "고정값",
                    min: 0,
                    max: 100,
                    value: "",
                  },
                ],
              })
            }
          >
            필드 추가
          </button>
        </>
      )}
    </Panels>
  );
}

function sampleValue(field: Schema, index: number): string | number | boolean {
  switch (field.type) {
    case "UUID":
      return crypto.randomUUID();
    case "번호":
      return index + 1;
    case "숫자":
      return (
        Math.floor(Math.random() * (field.max - field.min + 1)) + field.min
      );
    case "불리언":
      return Math.random() > 0.5;
    case "고정값":
      return field.value;
    case "선택값": {
      const choices = field.value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      if (!choices.length) throw Error("선택값을 하나 이상 입력하세요.");
      return choices[Math.floor(Math.random() * choices.length)];
    }
    case "이메일":
      return `user${index + 1}@example.com`;
    case "전화번호":
      return `010-0000-${String(index + 1).padStart(4, "0")}`;
    case "도시":
      return ["서울", "부산", "대구", "인천", "대전"][index % 5];
    case "주소":
      return `서울시 예시로 ${index + 1}`;
    case "영문 이름":
      return ["Alex Kim", "Jamie Lee", "Taylor Park", "Morgan Choi"][index % 4];
    case "날짜":
      return new Date(
        Date.UTC(2020, 0, 1) + Math.floor(Math.random() * 2192) * 86400000,
      )
        .toISOString()
        .slice(0, 10);
    default:
      return ["김민수", "이서연", "박지훈", "최유진", "정도윤"][index % 5];
  }
}
