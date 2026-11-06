import { useState } from "react";
import { parsePages } from "./pdfPages";
import { PDFDocument } from "pdf-lib";
import * as pdfjs from "pdfjs-dist";
import { zip } from "fflate";
import {
  DraftActions,
  Field,
  Files,
  NumberField,
  Panels,
  Select,
  saveFile,
  useDraft,
  useTask,
  pause,
} from "./shared";
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).href;
export default function PdfTool() {
  const [s, set, reset] = useDraft("pdf", {
    mode: "합치기",
    pages: "",
    rotation: "0",
    scale: 1.5,
    imageType: "PNG",
  });
  const patch = (p: Partial<typeof s>) => set({ ...s, ...p });
  const [files, setFiles] = useState<File[]>([]);
  const [summary, setSummary] = useState("");
  const task = useTask();
  async function run() {
    await task.run(async (signal, report) => {
      if (!files.length) throw Error("파일을 선택하세요.");
      if (!["이미지 → PDF", "PDF → 이미지"].includes(s.mode)) {
        const inputs: ArrayBuffer[] = [];
        for (const file of files) {
          await pause(signal);
          inputs.push(await file.arrayBuffer());
        }
        signal.throwIfAborted();
        const result = await new Promise<{ output: Uint8Array; count: number }>(
          (resolve, reject) => {
            const worker = new Worker(
              new URL("./pdf.worker.ts", import.meta.url),
              { type: "module" },
            );
            const cancel = () => {
              worker.terminate();
              reject(Error("취소했습니다."));
            };
            signal.addEventListener("abort", cancel, { once: true });
            worker.onmessage = (e) => {
              if (e.data.progress) {
                report(e.data.progress);
                return;
              }
              worker.terminate();
              signal.removeEventListener("abort", cancel);
              e.data.error ? reject(Error(e.data.error)) : resolve(e.data);
            };
            worker.onerror = (e) => {
              worker.terminate();
              reject(Error(e.message));
            };
            worker.postMessage(
              {
                inputs,
                pages: s.pages,
                rotation: Number(s.rotation),
                split: s.mode === "페이지별 나누기",
              },
              inputs,
            );
          },
        );
        signal.throwIfAborted();
        const split = s.mode === "페이지별 나누기";
        saveFile(
          result.output,
          split ? "pages.zip" : "document.pdf",
          split ? "application/zip" : "application/pdf",
        );
        setSummary(
          `${result.count}${split ? "개 파일" : "페이지 PDF"}을 저장했습니다.`,
        );
        return;
      }
      const output = await PDFDocument.create();
      const bundle: Record<string, Uint8Array> = {};
      for (let f = 0; f < files.length; f++) {
        await pause(signal);
        report(`${f + 1}/${files.length} 처리 중`);
        const bytes = new Uint8Array(await files[f].arrayBuffer());
        if (s.mode === "이미지 → PDF") {
          const bitmap = await createImageBitmap(files[f]);
          const c = document.createElement("canvas");
          c.width = bitmap.width;
          c.height = bitmap.height;
          c.getContext("2d")!.drawImage(bitmap, 0, 0);
          bitmap.close();
          const blob = await new Promise<Blob | null>((r) =>
            c.toBlob(r, "image/png"),
          );
          if (!blob) throw Error("이미지를 읽을 수 없습니다.");
          const img = await output.embedPng(await blob.arrayBuffer());
          const page = output.addPage([img.width, img.height]);
          page.drawImage(img, {
            x: 0,
            y: 0,
            width: img.width,
            height: img.height,
          });
          continue;
        }
        if (s.mode === "PDF → 이미지") {
          const loading = pdfjs.getDocument({
            data: bytes,
            cMapUrl: "/pdf/cmaps/",
            cMapPacked: true,
            standardFontDataUrl: "/pdf/standard_fonts/",
            wasmUrl: "/pdf/wasm/",
          });
          const doc = await loading.promise;
          try {
            const pages = parsePages(s.pages, doc.numPages);
            for (const index of pages) {
              await pause(signal);
              const page = await doc.getPage(index + 1);
              const viewport = page.getViewport({
                scale: s.scale,
                rotation: Number(s.rotation),
              });
              if (viewport.width * viewport.height > 40000000)
                throw Error("페이지 이미지가 너무 큽니다. 배율을 줄이세요.");
              const canvas = document.createElement("canvas");
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              const rendering = page.render({ canvas, viewport });
              signal.addEventListener("abort", () => rendering.cancel(), {
                once: true,
              });
              await rendering.promise;
              const blob = await new Promise<Blob | null>((r) =>
                canvas.toBlob(
                  r,
                  s.imageType === "PNG" ? "image/png" : "image/jpeg",
                  0.9,
                ),
              );
              if (blob)
                bundle[
                  `${f + 1}-page-${index + 1}.${s.imageType.toLowerCase()}`
                ] = new Uint8Array(await blob.arrayBuffer());
              canvas.width = canvas.height = 0;
              report(`페이지 ${index + 1}/${doc.numPages}`);
            }
          } finally {
            await loading.destroy();
          }
          continue;
        }
      }
      signal.throwIfAborted();
      if (Object.keys(bundle).length) {
        const bytes = await new Promise<Uint8Array>((resolve, reject) => {
          const cancel = zip(bundle, { level: 1 }, (err, data) =>
            err ? reject(err) : resolve(data),
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
        saveFile(bytes, "pages.zip", "application/zip");
        setSummary(`${Object.keys(bundle).length}개 파일을 저장했습니다.`);
      } else {
        const bytes = await output.save();
        signal.throwIfAborted();
        saveFile(bytes, "document.pdf", "application/pdf");
        setSummary(`${output.getPageCount()}페이지 PDF를 저장했습니다.`);
      }
    });
  }
  return (
    <Panels
      actions={
        <>
          <DraftActions
            id="pdf"
            state={s}
            setState={set}
            reset={() => {
              task.cancel();
              reset();
              setFiles([]);
              setSummary("");
            }}
          />
          <button onClick={run} disabled={task.busy}>
            실행·저장
          </button>
          {task.busy && <button onClick={task.cancel}>취소</button>}
          <span role="status">{task.status}</span>
        </>
      }
      options={
        <>
          <Select
            label="작업"
            value={s.mode}
            items={[
              "합치기",
              "페이지 선택·순서·회전",
              "페이지별 나누기",
              "이미지 → PDF",
              "PDF → 이미지",
            ]}
            onChange={(mode) => patch({ mode })}
          />
          <Field label="페이지 순서 (빈칸=전체)">
            <input
              placeholder="3,1,2 또는 1-4"
              value={s.pages}
              onChange={(e) => patch({ pages: e.target.value })}
            />
          </Field>
          <Select
            label="추가 회전"
            value={s.rotation}
            items={["0", "90", "180", "270"]}
            onChange={(rotation) => patch({ rotation })}
          />
          <details>
            <summary>이미지 출력</summary>
            <NumberField
              label="배율"
              value={s.scale}
              min={0.25}
              max={4}
              onChange={(scale) => patch({ scale })}
            />
            <Select
              label="이미지 형식"
              value={s.imageType}
              items={["PNG", "JPEG"]}
              onChange={(imageType) => patch({ imageType })}
            />
          </details>
          <p>암호화된 PDF, OCR, Word 변환은 지원하지 않습니다.</p>
        </>
      }
      result={<p>{summary || "실행하면 결과 파일을 다운로드합니다."}</p>}
    >
      <Files
        accept={s.mode === "이미지 → PDF" ? "image/*" : "application/pdf"}
        onFiles={setFiles}
      />
      {files.map((file, i) => (
        <div className="ws-row" key={i}>
          <span>
            {i + 1}. {file.name}
          </span>
          <button
            disabled={i === 0}
            onClick={() => {
              const next = [...files];
              [next[i - 1], next[i]] = [next[i], next[i - 1]];
              setFiles(next);
            }}
          >
            위로
          </button>
          <button
            disabled={i === files.length - 1}
            onClick={() => {
              const next = [...files];
              [next[i], next[i + 1]] = [next[i + 1], next[i]];
              setFiles(next);
            }}
          >
            아래로
          </button>
          <button onClick={() => setFiles(files.filter((_, n) => n !== i))}>
            제거
          </button>
        </div>
      ))}
    </Panels>
  );
}
