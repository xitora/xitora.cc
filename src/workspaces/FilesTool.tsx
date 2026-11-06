import { useState } from "react";
import { zip } from "fflate";
import {
  DraftActions,
  Field,
  Files,
  NumberField,
  Output,
  Panels,
  saveFile,
  useDraft,
  useTask,
  pause,
} from "./shared";
export default function FilesTool() {
  const [s, set, reset] = useDraft("files", {
    prefix: "",
    suffix: "",
    find: "",
    replace: "",
    start: 1,
    pad: 3,
    number: false,
  });
  const patch = (p: Partial<typeof s>) => set({ ...s, ...p });
  const [files, setFiles] = useState<File[]>([]);
  const [hashes, setHashes] = useState("");
  const task = useTask();
  const names = files.map((file, i) => {
    const dot = file.name.lastIndexOf(".");
    const base = dot > 0 ? file.name.slice(0, dot) : file.name,
      ext = dot > 0 ? file.name.slice(dot) : "";
    return (
      s.prefix +
      (s.number ? String(s.start + i).padStart(s.pad, "0") + "-" : "") +
      (s.find ? base.split(s.find).join(s.replace) : base) +
      s.suffix +
      ext
    );
  });
  const invalid =
    names.some(
      (n) => !n || /[\\/:*?"<>|\x00-\x1f]/.test(n) || n === "." || n === "..",
    ) || new Set(names.map((n) => n.toLowerCase())).size !== names.length;
  async function run(hash = false) {
    await task.run(async (signal, report) => {
      if (!files.length) throw Error("파일을 선택하세요.");
      if (hash) {
        const items = [];
        const groups = new Map<string, string[]>();
        for (let i = 0; i < files.length; i++) {
          await pause(signal);
          report(`${i + 1}/${files.length} 해시 계산`);
          const digest = Array.from(
            new Uint8Array(
              await crypto.subtle.digest(
                "SHA-256",
                await files[i].arrayBuffer(),
              ),
            ),
            (v) => v.toString(16).padStart(2, "0"),
          ).join("");
          items.push(`${files[i].name}\nSHA-256 ${digest}`);
          groups.set(digest, [...(groups.get(digest) || []), files[i].name]);
        }
        signal.throwIfAborted();
        setHashes(
          items.join("\n\n") +
            "\n\n중복 그룹:\n" +
            [...groups.values()]
              .filter((g) => g.length > 1)
              .map((g) => g.join(" = "))
              .join("\n"),
        );
        return;
      }
      if (invalid)
        throw Error("중복되거나 사용할 수 없는 파일 이름을 수정하세요.");
      const data: Record<string, Uint8Array> = Object.create(null);
      for (let i = 0; i < files.length; i++) {
        await pause(signal);
        report(`${i + 1}/${files.length} 복사 준비`);
        data[names[i]] = new Uint8Array(await files[i].arrayBuffer());
      }
      const zipped = await new Promise<Uint8Array>((resolve, reject) => {
        const cancel = zip(data, { level: 1 }, (err, out) =>
          err ? reject(err) : resolve(out),
        );
        signal.addEventListener(
          "abort",
          () => {
            cancel();
            reject(Error("취소했습니다."));
          },
          { once: true },
        );
      });
      signal.throwIfAborted();
      saveFile(zipped, "renamed-files.zip", "application/zip");
    });
  }
  return (
    <Panels
      actions={
        <>
          <DraftActions
            id="files"
            state={s}
            setState={set}
            reset={() => {
              task.cancel();
              reset();
              setFiles([]);
              setHashes("");
            }}
          />
          <button disabled={task.busy || invalid} onClick={() => run()}>
            이름을 바꾼 복사본 ZIP
          </button>
          <button disabled={task.busy} onClick={() => run(true)}>
            체크섬·중복 검사
          </button>
          {task.busy && <button onClick={task.cancel}>취소</button>}
          <span role="status">{task.status}</span>
        </>
      }
      options={
        <>
          {(["prefix", "suffix", "find", "replace"] as const).map((key, i) => (
            <Field
              key={key}
              label={["접두사", "접미사", "찾을 문자", "바꿀 문자"][i]}
            >
              <input
                value={s[key]}
                onChange={(e) => patch({ [key]: e.target.value })}
              />
            </Field>
          ))}
          <label>
            <input
              type="checkbox"
              checked={s.number}
              onChange={(e) => patch({ number: e.target.checked })}
            />{" "}
            번호 붙이기
          </label>
          <NumberField
            label="시작 번호"
            value={s.start}
            min={0}
            onChange={(start) => patch({ start })}
          />
          <NumberField
            label="번호 자릿수"
            value={s.pad}
            min={1}
            max={12}
            onChange={(pad) => patch({ pad })}
          />
          <p>원본 파일을 변경하지 않습니다.</p>
        </>
      }
      result={<Output value={hashes} name="checksums.txt" />}
    >
      <Files onFiles={setFiles} />
      {invalid && (
        <p role="alert">이름이 중복되거나 사용할 수 없는 문자가 있습니다.</p>
      )}
      <table>
        <thead>
          <tr>
            <th>원래 이름</th>
            <th>새 이름</th>
          </tr>
        </thead>
        <tbody>
          {files.map((f, i) => (
            <tr key={i}>
              <td>{f.name}</td>
              <td>{names[i]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panels>
  );
}
