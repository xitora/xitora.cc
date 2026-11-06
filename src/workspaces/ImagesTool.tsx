import { useState } from "react";
import { zipSync, strToU8 } from "fflate";
import {
  ICON_DIMENSIONS,
  createIcoFromPngs,
  generateHtmlSnippet,
  generateWebManifestJson,
} from "../utils/favicon";
import {
  DraftActions,
  Field,
  Files,
  NumberField,
  Panels,
  Select,
  saveFile,
  useDraft,
  useObjectUrl,
  useTask,
  pause,
} from "./shared";
export default function ImagesTool() {
  const [s, set, reset] = useDraft("images", {
    format: "image/webp",
    quality: 0.85,
    width: 1200,
    height: 0,
    rotate: 0,
    flip: false,
    cropX: 0,
    cropY: 0,
    cropW: 100,
    cropH: 100,
    redact: "없음",
    x: 20,
    y: 20,
    w: 30,
    h: 20,
    watermark: "",
    watermarkColor: "#ffffff",
  });
  const patch = (p: Partial<typeof s>) => set({ ...s, ...p });
  const [files, setFiles] = useState<File[]>([]);
  const [result, setResult] = useState<{ name: string; blob: Blob }[]>([]);
  const [preview, setPreview] = useState<Blob | null>(null);
  const url = useObjectUrl(preview);
  const task = useTask();
  async function render(file: File) {
    const bitmap = await createImageBitmap(file);
    try {
      const sx = (bitmap.width * s.cropX) / 100,
        sy = (bitmap.height * s.cropY) / 100,
        sw = (bitmap.width * s.cropW) / 100,
        sh = (bitmap.height * s.cropH) / 100;
      if (
        sw <= 0 ||
        sh <= 0 ||
        sx + sw > bitmap.width + 0.01 ||
        sy + sh > bitmap.height + 0.01
      )
        throw Error("자르기 범위는 이미지 안에 있어야 합니다.");
      const width = s.width || sw,
        height = s.height || Math.round((width * sh) / sw);
      if (width < 1 || height < 1 || width * height > 40000000)
        throw Error("출력은 1~40,000,000픽셀 범위로 지정하세요.");
      const base = document.createElement("canvas");
      base.width = width;
      base.height = height;
      const b = base.getContext("2d")!;
      if (s.format === "image/jpeg") {
        b.fillStyle = "#fff";
        b.fillRect(0, 0, width, height);
      }
      b.drawImage(bitmap, sx, sy, sw, sh, 0, 0, width, height);
      if (s.redact !== "없음") {
        const x = (width * s.x) / 100,
          y = (height * s.y) / 100,
          w = (width * s.w) / 100,
          h = (height * s.h) / 100;
        const region = document.createElement("canvas");
        region.width =
          s.redact === "모자이크"
            ? Math.max(1, Math.round(w / 14))
            : Math.max(1, w);
        region.height =
          s.redact === "모자이크"
            ? Math.max(1, Math.round(h / 14))
            : Math.max(1, h);
        region
          .getContext("2d")!
          .drawImage(base, x, y, w, h, 0, 0, region.width, region.height);
        b.save();
        b.beginPath();
        b.rect(x, y, w, h);
        b.clip();
        if (s.redact === "단색") {
          b.fillStyle = "#111";
          b.fillRect(x, y, w, h);
        } else {
          b.imageSmoothingEnabled = s.redact !== "모자이크";
          if (s.redact === "블러") b.filter = "blur(14px)";
          b.drawImage(region, x, y, w, h);
        }
        b.restore();
      }
      const canvas = document.createElement("canvas");
      const quarter = s.rotate % 180 !== 0;
      canvas.width = quarter ? height : width;
      canvas.height = quarter ? width : height;
      const ctx = canvas.getContext("2d")!;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((s.rotate * Math.PI) / 180);
      ctx.scale(s.flip ? -1 : 1, 1);
      ctx.drawImage(base, -width / 2, -height / 2);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (s.watermark) {
        ctx.font = `${Math.max(12, Math.round(canvas.width / 32))}px sans-serif`;
        ctx.fillStyle = s.watermarkColor;
        ctx.textAlign = "right";
        ctx.fillText(s.watermark, canvas.width - 20, canvas.height - 20);
      }
      const blob = await new Promise<Blob | null>((r) =>
        canvas.toBlob(r, s.format, s.quality),
      );
      if (!blob) throw Error("이미지 변환에 실패했습니다.");
      return { canvas, blob };
    } finally {
      bitmap.close();
    }
  }
  async function run(favicon = false) {
    await task.run(async (signal, report) => {
      if (!files.length) throw Error("이미지를 선택하세요.");
      if (favicon) {
        const { canvas } = await render(files[0]);
        const bundle: Record<string, Uint8Array> = {};
        const ico = [];
        for (const d of ICON_DIMENSIONS) {
          await pause(signal);
          const c = document.createElement("canvas");
          c.width = c.height = d.size;
          const ctx = c.getContext("2d")!;
          const scale = Math.min(d.size / canvas.width, d.size / canvas.height);
          ctx.drawImage(
            canvas,
            (d.size - canvas.width * scale) / 2,
            (d.size - canvas.height * scale) / 2,
            canvas.width * scale,
            canvas.height * scale,
          );
          const blob = await new Promise<Blob | null>((r) =>
            c.toBlob(r, "image/png"),
          );
          if (!blob) throw Error("아이콘 생성 실패");
          const bytes = new Uint8Array(await blob.arrayBuffer());
          bundle[d.filename] = bytes;
          if (d.size <= 48)
            ico.push({ width: d.size, height: d.size, data: bytes });
        }
        bundle["favicon.ico"] = createIcoFromPngs(ico);
        bundle["site.webmanifest"] = strToU8(generateWebManifestJson());
        bundle["installation.html"] = strToU8(generateHtmlSnippet());
        signal.throwIfAborted();
        saveFile(zipSync(bundle), "favicon.zip", "application/zip");
        return;
      }
      const items = [];
      for (let i = 0; i < files.length; i++) {
        await pause(signal);
        report(`${i + 1}/${files.length} 변환 중`);
        const { blob } = await render(files[i]);
        signal.throwIfAborted();
        items.push({
          name:
            files[i].name.replace(/\.[^.]+$/, "") +
            "." +
            s.format.split("/")[1].replace("jpeg", "jpg"),
          blob,
        });
      }
      setResult(items);
      setPreview(items[0].blob);
    });
  }
  return (
    <Panels
      actions={
        <>
          <DraftActions
            id="images"
            state={s}
            setState={set}
            reset={() => {
              task.cancel();
              reset();
              setFiles([]);
              setResult([]);
              setPreview(null);
            }}
          />
          <button disabled={task.busy} onClick={() => run()}>
            변환
          </button>
          <button disabled={task.busy} onClick={() => run(true)}>
            파비콘 패키지
          </button>
          {task.busy && <button onClick={task.cancel}>취소</button>}
          <span role="status">{task.status}</span>
        </>
      }
      options={
        <>
          <Select
            label="출력 형식"
            value={s.format}
            items={["image/webp", "image/jpeg", "image/png"]}
            onChange={(format) => patch({ format })}
          />
          <NumberField
            label="품질 (0~1)"
            value={s.quality}
            min={0.1}
            max={1}
            onChange={(quality) => patch({ quality })}
          />
          <NumberField
            label="너비 (0=원본)"
            value={s.width}
            min={0}
            onChange={(width) => patch({ width })}
          />
          <NumberField
            label="높이 (0=비율 유지)"
            value={s.height}
            min={0}
            onChange={(height) => patch({ height })}
          />
          <Select
            label="회전"
            value={String(s.rotate)}
            items={["0", "90", "180", "270"]}
            onChange={(v) => patch({ rotate: Number(v) })}
          />
          <label>
            <input
              type="checkbox"
              checked={s.flip}
              onChange={(e) => patch({ flip: e.target.checked })}
            />{" "}
            좌우 반전
          </label>
          <details>
            <summary>자르기 (원본 대비 %)</summary>
            {(["cropX", "cropY", "cropW", "cropH"] as const).map((key, i) => (
              <NumberField
                key={key}
                label={["왼쪽", "위쪽", "너비", "높이"][i]}
                value={s[key]}
                min={0}
                max={100}
                onChange={(v) => patch({ [key]: v })}
              />
            ))}
          </details>
          <details>
            <summary>영역 가리기</summary>
            <Select
              label="처리"
              value={s.redact}
              items={["없음", "블러", "모자이크", "단색"]}
              onChange={(redact) => patch({ redact })}
            />
            {(["x", "y", "w", "h"] as const).map((key, i) => (
              <NumberField
                key={key}
                label={["왼쪽 %", "위쪽 %", "너비 %", "높이 %"][i]}
                value={s[key]}
                min={0}
                max={100}
                onChange={(v) => patch({ [key]: v })}
              />
            ))}
          </details>
          <details>
            <summary>워터마크</summary>
            <Field label="문구">
              <input
                value={s.watermark}
                onChange={(e) => patch({ watermark: e.target.value })}
              />
            </Field>
            <Field label="색상">
              <input
                type="color"
                value={s.watermarkColor}
                onChange={(e) => patch({ watermarkColor: e.target.value })}
              />
            </Field>
          </details>
        </>
      }
      result={
        <>
          {url && <img src={url} alt="변환된 이미지" />}
          {result.map((r, i) => (
            <div className="ws-actions" key={i}>
              <button onClick={() => setPreview(r.blob)}>
                {r.name} 미리보기
              </button>
              <button onClick={() => saveFile(r.blob, r.name)}>
                {Math.round(r.blob.size / 1024)} KB 저장
              </button>
            </div>
          ))}
        </>
      }
    >
      <Files
        accept="image/png,image/jpeg,image/webp,image/avif,image/gif,image/bmp"
        onFiles={(f) => {
          setFiles(f);
          setPreview(f[0] || null);
          setResult([]);
        }}
      />
      <p>{files.length}개 선택 · 원본은 변경하지 않습니다.</p>
    </Panels>
  );
}
