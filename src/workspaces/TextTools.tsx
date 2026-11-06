import { toolsList } from "../data/tools";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Papa from "papaparse";
import YAML from "yaml";
import { XMLParser, XMLBuilder, XMLValidator } from "fast-xml-parser";
import { md5, crc32, toHex, fromHex } from "../utils/core";
import {
  DraftActions,
  Editor,
  Field,
  Output,
  Panels,
  Select,
  useDraft,
} from "./shared";
export default function TextTools({ toolId }: { toolId: string }) {
  const initial = {
    input: "",
    other: "",
    operation:
      toolsList.find((tool) => tool.id === toolId)?.defaultOperation ||
      "공백 정리",
    target: "JSON",
    find: "",
    replace: "",
    regex: false,
    flags: "g",
    path: "",
    columns: "",
    word: false,
  };
  const [s, set, reset] = useDraft(toolId, initial);
  const patch = (p: Partial<typeof s>) => set({ ...s, ...p });
  const [out, setOut] = useState("");
  const [error, setError] = useState("");
  const [changes, setChanges] = useState<
    { value: string; added?: boolean; removed?: boolean }[]
  >([]);
  const [parsed, setParsed] = useState<unknown>(null);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      try {
        let result = "";
        setError("");
        if (toolId === "text") {
          result = s.input;
          if (s.operation === "공백 정리")
            result = result
              .split("\n")
              .map((l) => l.trim())
              .join("\n")
              .replace(/\n{3,}/g, "\n\n");
          if (s.operation === "중복 줄 제거")
            result = [...new Set(result.split("\n"))].join("\n");
          if (s.operation === "줄 정렬")
            result = result
              .split("\n")
              .sort((a, b) => a.localeCompare(b))
              .join("\n");
          if (s.operation === "대문자") result = result.toUpperCase();
          if (s.operation === "소문자") result = result.toLowerCase();
          if (s.operation === "찾아 바꾸기" && s.find) {
            if (s.regex) {
              if (s.input.length > 100000)
                throw Error("정규식 입력은 100,000자 이하로 사용하세요.");
              result = await runRegex(s.input, s.find, s.flags, s.replace);
            } else result = result.split(s.find).join(s.replace);
          }
        }
        if (toolId === "encoding") {
          const bytes = new TextEncoder().encode(s.input);
          switch (s.operation) {
            case "Base64":
              result = btoa(
                Array.from(bytes, (b) => String.fromCharCode(b)).join(""),
              );
              break;
            case "Base64 해독":
              result = new TextDecoder("utf-8", { fatal: true }).decode(
                Uint8Array.from(atob(s.input), (c) => c.charCodeAt(0)),
              );
              break;
            case "Base64URL":
              result = btoa(
                Array.from(bytes, (b) => String.fromCharCode(b)).join(""),
              )
                .replace(/\+/g, "-")
                .replace(/\//g, "_")
                .replace(/=+$/, "");
              break;
            case "Base64URL 해독":
              result = new TextDecoder("utf-8", { fatal: true }).decode(
                Uint8Array.from(
                  atob(s.input.replace(/-/g, "+").replace(/_/g, "/")),
                  (c) => c.charCodeAt(0),
                ),
              );
              break;
            case "Hex":
              result = toHex(bytes);
              break;
            case "Hex 해독":
              result = new TextDecoder("utf-8", { fatal: true }).decode(
                fromHex(s.input),
              );
              break;
            case "URL":
              result = encodeURIComponent(s.input);
              break;
            case "URL 해독":
              result = decodeURIComponent(s.input);
              break;
            case "MD5":
              result = md5(s.input);
              break;
            case "CRC32":
              result = crc32(s.input);
              break;
            default:
              result = toHex(
                new Uint8Array(await crypto.subtle.digest(s.operation, bytes)),
              );
          }
        }
        if (toolId === "data" && s.input.trim()) {
          let value: unknown;
          if (s.operation === "JSON") value = JSON.parse(s.input);
          else if (s.operation === "YAML")
            value = YAML.parse(s.input, { maxAliasCount: 50 });
          else if (s.operation === "CSV") {
            const p = Papa.parse(s.input, {
              header: true,
              skipEmptyLines: true,
            });
            if (p.errors.length) throw Error(p.errors[0].message);
            value = p.data;
          } else {
            if (/<!DOCTYPE|<!ENTITY/i.test(s.input))
              throw Error("DTD와 외부 엔터티는 지원하지 않습니다.");
            const valid = XMLValidator.validate(s.input);
            if (valid !== true) throw Error(valid.err.msg);
            value = new XMLParser({ ignoreAttributes: false }).parse(s.input);
          }
          if (active) setParsed(value);
          if (s.target === "JSON") result = JSON.stringify(value, null, 2);
          if (s.target === "YAML") result = YAML.stringify(value);
          if (s.target === "XML")
            result = new XMLBuilder({
              format: true,
              ignoreAttributes: false,
            }).build(value);
          if (s.target === "CSV") {
            const selected = s.path
              .split(".")
              .filter(Boolean)
              .reduce(
                (v, k) =>
                  v && typeof v === "object"
                    ? (v as Record<string, unknown>)[k]
                    : undefined,
                value,
              );
            if (!Array.isArray(selected))
              throw Error("CSV로 변환할 배열 경로를 선택하세요.");
            const cols = s.columns
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean);
            result = Papa.unparse(
              selected.map((v) => {
                if (!v || typeof v !== "object") return { value: v };
                return Object.fromEntries(
                  Object.entries(v)
                    .filter(([k]) => !cols.length || cols.includes(k))
                    .map(([k, x]) => [
                      k,
                      typeof x === "object" ? JSON.stringify(x) : x,
                    ]),
                );
              }),
            );
          }
        }
        if (toolId === "diff") {
          const comparison = await runDiff(
            s.input,
            s.other,
            s.operation === "JSON 구조",
            s.word,
          );
          result = comparison.text;
          if (active) setChanges(comparison.parts);
        }

        if (active) setOut(result);
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : String(e));
          setOut("");
          setParsed(null);
          setChanges([]);
        }
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [s, toolId]);
  const formats = ["JSON", "CSV", "YAML", "XML"];
  return (
    <Panels
      actions={
        <DraftActions id={toolId} state={s} setState={set} reset={reset} />
      }
      options={
        <>
          {toolId === "text" && (
            <>
              <Select
                label="작업"
                value={s.operation}
                onChange={(operation) => patch({ operation })}
                items={[
                  "공백 정리",
                  "중복 줄 제거",
                  "줄 정렬",
                  "대문자",
                  "소문자",
                  "찾아 바꾸기",
                  "Markdown",
                ]}
              />
              {s.operation === "찾아 바꾸기" && (
                <>
                  <Field label="찾을 내용">
                    <input
                      value={s.find}
                      onChange={(e) => patch({ find: e.target.value })}
                    />
                  </Field>
                  <Field label="바꿀 내용">
                    <input
                      value={s.replace}
                      onChange={(e) => patch({ replace: e.target.value })}
                    />
                  </Field>
                  <label>
                    <input
                      type="checkbox"
                      checked={s.regex}
                      onChange={(e) => patch({ regex: e.target.checked })}
                    />{" "}
                    정규식
                  </label>
                  <Field label="정규식 플래그">
                    <input
                      value={s.flags}
                      onChange={(e) => patch({ flags: e.target.value })}
                    />
                  </Field>
                </>
              )}
              <p>
                {s.input.length}자 ·{" "}
                {s.input.trim() ? s.input.trim().split(/\s+/).length : 0}단어 ·{" "}
                {s.input.split("\n").length}줄
              </p>
            </>
          )}
          {toolId === "encoding" && (
            <Select
              label="변환"
              value={s.operation}
              onChange={(operation) => patch({ operation })}
              items={[
                "Base64",
                "Base64 해독",
                "Base64URL",
                "Base64URL 해독",
                "Hex",
                "Hex 해독",
                "URL",
                "URL 해독",
                "SHA-256",
                "SHA-384",
                "SHA-512",
                "MD5",
                "CRC32",
              ]}
            />
          )}
          {toolId === "data" && (
            <>
              <Select
                label="입력 형식"
                value={s.operation}
                onChange={(operation) => patch({ operation })}
                items={formats}
              />
              <Select
                label="출력 형식"
                value={s.target}
                onChange={(target) => patch({ target })}
                items={formats}
              />
              <details>
                <summary>CSV 배열·열 선택</summary>
                <Field label="배열 경로 (예: users)">
                  <input
                    value={s.path}
                    onChange={(e) => patch({ path: e.target.value })}
                  />
                </Field>
                <Field label="열 이름 (쉼표 구분)">
                  <input
                    value={s.columns}
                    onChange={(e) => patch({ columns: e.target.value })}
                  />
                </Field>
                <p>
                  CSV는 타입과 중첩 구조를 보존하지 않습니다. 중첩 값은 JSON
                  문자열이 됩니다.
                </p>
              </details>
            </>
          )}
          {toolId === "diff" && (
            <>
              <Select
                label="비교 방식"
                value={s.operation}
                onChange={(operation) => patch({ operation })}
                items={["텍스트", "JSON 구조"]}
              />
              <label>
                <input
                  type="checkbox"
                  checked={s.word}
                  onChange={(e) => patch({ word: e.target.checked })}
                />{" "}
                단어 단위
              </label>
            </>
          )}
        </>
      }
      result={
        <>
          {toolId === "diff" && (
            <pre className="ws-output" aria-label="변경 내용">
              {changes.map((part, index) =>
                part.added ? (
                  <ins key={index}>{part.value}</ins>
                ) : part.removed ? (
                  <del key={index}>{part.value}</del>
                ) : (
                  <span key={index}>{part.value}</span>
                ),
              )}
            </pre>
          )}
          {error && (
            <p role="alert" className="ws-error">
              {error}
            </p>
          )}
          {toolId === "text" && s.operation === "Markdown" ? (
            <div className="ws-preview">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {s.input}
              </ReactMarkdown>
              <Output value={s.input} name="document.md" />
            </div>
          ) : (
            <Output
              value={out}
              name={
                "result." + (toolId === "data" ? s.target.toLowerCase() : "txt")
              }
            />
          )}
          {toolId === "data" && parsed !== null && (
            <details>
              <summary>데이터 트리·표</summary>
              <p>
                미리보기는 각 단계와 표의 첫 100개 항목을 표시합니다. 단순 값은
                표에서 편집할 수 있습니다.
              </p>
              <Tree value={parsed} />
              {Array.isArray(parsed) &&
                parsed.length > 0 &&
                typeof parsed[0] === "object" && (
                  <div style={{ overflow: "auto" }}>
                    <table>
                      <thead>
                        <tr>
                          {Object.keys(parsed[0] || {}).map((k) => (
                            <th key={k}>{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {parsed.slice(0, 100).map((r, i) => (
                          <tr key={i}>
                            {Object.keys(parsed[0] || {}).map((k) => (
                              <td key={k}>
                                {r?.[k] !== null &&
                                ["string", "number", "boolean"].includes(
                                  typeof r?.[k],
                                ) ? (
                                  <input
                                    aria-label={`${i + 1}행 ${k}`}
                                    key={JSON.stringify(r[k])}
                                    defaultValue={String(r[k])}
                                    onBlur={(e) => {
                                      let value: unknown = e.target.value;
                                      if (typeof r[k] === "number") {
                                        value = Number(value);
                                        if (!Number.isFinite(value)) return;
                                      }
                                      if (typeof r[k] === "boolean") {
                                        if (
                                          !["true", "false"].includes(
                                            String(value),
                                          )
                                        )
                                          return;
                                        value = value === "true";
                                      }
                                      const rows = parsed.map((row, n) =>
                                        n === i ? { ...row, [k]: value } : row,
                                      );
                                      patch({
                                        operation: "JSON",
                                        input: JSON.stringify(rows, null, 2),
                                      });
                                    }}
                                  />
                                ) : (
                                  JSON.stringify(r?.[k])
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
            </details>
          )}
        </>
      }
    >
      <Editor value={s.input} onChange={(input) => patch({ input })} />
      {toolId === "diff" && (
        <Editor
          label="비교할 입력"
          value={s.other}
          onChange={(other) => patch({ other })}
        />
      )}
    </Panels>
  );
}
function Tree({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (depth >= 8) return <span>… (원본 편집기에서 확인)</span>;
  return value && typeof value === "object" ? (
    <details open={depth === 0}>
      <summary>
        {Array.isArray(value) ? `배열 (${value.length})` : "객체"}
      </summary>
      {Object.entries(value)
        .slice(0, 100)
        .map(([k, v]) => (
          <div key={k} style={{ paddingLeft: 12 }}>
            <strong>{k}: </strong>
            <Tree value={v} depth={depth + 1} />
          </div>
        ))}
    </details>
  ) : (
    <span>{JSON.stringify(value)}</span>
  );
}
function runRegex(
  input: string,
  pattern: string,
  flags: string,
  replacement: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("../workers/regex.worker.ts", import.meta.url),
      { type: "module" },
    );
    const finish = () => {
      clearTimeout(timer);
      worker.terminate();
    };
    const timer = setTimeout(() => {
      finish();
      reject(Error("정규식 실행 시간이 초과되었습니다."));
    }, 1000);
    worker.onmessage = (e) => {
      finish();
      e.data.isValid
        ? resolve(e.data.replacedText ?? input)
        : reject(Error(e.data.error));
    };
    worker.onerror = () => {
      finish();
      reject(Error("정규식 실행 실패"));
    };
    worker.postMessage({ text: input, pattern, flags, replacement });
  });
}

function runDiff(
  input: string,
  other: string,
  json: boolean,
  word: boolean,
): Promise<{
  text: string;
  parts: { value: string; added?: boolean; removed?: boolean }[];
}> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./diff.worker.ts", import.meta.url), {
      type: "module",
    });
    const finish = () => {
      clearTimeout(timer);
      worker.terminate();
    };
    const timer = setTimeout(() => {
      finish();
      reject(Error("비교 시간이 초과되었습니다. 입력을 나누어 비교하세요."));
    }, 2500);
    worker.onmessage = (e) => {
      finish();
      e.data.error ? reject(Error(e.data.error)) : resolve(e.data);
    };
    worker.onerror = (e) => {
      finish();
      reject(Error(e.message));
    };
    worker.postMessage({ input, other, json, word });
  });
}
