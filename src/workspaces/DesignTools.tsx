import { useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";
import {
  getWcagRating,
  hexToRgb,
  rgbToHsl,
  rgbToHex,
  hslToHex,
  generateHarmonies,
} from "../utils/colorPalette";
import { parseSvgPath } from "../utils/svgPath";
import {
  DraftActions,
  Editor,
  Field,
  Files,
  NumberField,
  Output,
  Panels,
  Select,
  saveFile,
  useDraft,
} from "./shared";
const defaultSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><circle cx="120" cy="120" r="90" fill="#b394da"/></svg>';
function cleanSvg(input: string) {
  const clean = DOMPurify.sanitize(input, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: [
      "foreignObject",
      "image",
      "use",
      "a",
      "style",
      "animate",
      "set",
      "animateTransform",
    ],
    FORBID_ATTR: ["href", "xlink:href", "style"],
  });
  return clean.replace(/url\(([^)]*)\)/gi, (match, target: string) =>
    /^\s*['"]?#[\w-]+['"]?\s*$/.test(target) ? match : "none",
  );
}
export default function DesignTools({ toolId }: { toolId: string }) {
  const [s, set, reset] = useDraft(toolId, {
    input: defaultSvg,
    color: "#b394da",
    colorInput: "#b394da",
    background: "#19191f",
    palette: "#b394da,#5b9c8e,#e1b779",
    width: 240,
    height: 240,
    duration: 1,
    delay: 0,
    repeat: "infinite",
    easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    frames:
      "0% { transform: translateX(0); opacity: .3; }\n100% { transform: translateX(180px); opacity: 1; }",
  });
  const patch = (p: Partial<typeof s>) => set({ ...s, ...p });
  const preview = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState("");
  const clean = cleanSvg(s.input);
  const css = `@keyframes previewMotion {\n${s.frames}\n}\n.target { animation: previewMotion ${s.duration}s ${s.easing} ${s.delay}s ${s.repeat} alternate both; }`;
  useEffect(() => {
    if (toolId !== "motion" || !preview.current) return;
    const style = document.createElement("style");
    try {
      if (/url\s*\(|@/i.test(s.frames))
        throw Error("외부 리소스와 @ 규칙은 미리보기에서 사용할 수 없습니다.");
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(`@keyframes workspaceMotion {${s.frames}}`);
      if (
        sheet.cssRules.length !== 1 ||
        sheet.cssRules[0].type !== CSSRule.KEYFRAMES_RULE
      )
        throw Error("키프레임 구문을 확인하세요.");
      style.textContent = sheet.cssRules[0].cssText;
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return;
    }
    document.head.append(style);
    return () => style.remove();
  }, [s.frames, toolId]);
  function resizeSvg() {
    try {
      const doc = new DOMParser().parseFromString(clean, "image/svg+xml");
      const root = doc.documentElement;
      if (root.localName !== "svg") throw Error("SVG 루트가 없습니다.");
      root.setAttribute("width", String(s.width));
      root.setAttribute("height", String(s.height));
      root
        .querySelectorAll('[fill]:not([fill="none"])')
        .forEach((e) => e.setAttribute("fill", s.color));
      patch({ input: new XMLSerializer().serializeToString(root) });
    } catch (e) {
      setError(String(e));
    }
  }
  async function png() {
    try {
      const image = new Image();
      const url = URL.createObjectURL(
        new Blob([clean], { type: "image/svg+xml" }),
      );
      try {
        image.src = url;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = s.width;
        canvas.height = s.height;
        canvas.getContext("2d")!.drawImage(image, 0, 0, s.width, s.height);
        const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r));
        if (blob) saveFile(blob, "image.png");
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      setError(String(e));
    }
  }
  function convertColor() {
    try {
      const value = s.colorInput.trim();
      let color = value;
      if (/^rgb/i.test(value)) {
        const nums = value.match(/[\d.]+/g)?.map(Number);
        if (!nums || nums.length !== 3 || nums.some((n) => n < 0 || n > 255))
          throw Error("RGB는 0~255 값 3개를 입력하세요.");
        color = rgbToHex(nums[0], nums[1], nums[2]);
      } else if (/^hsl/i.test(value)) {
        const nums = value.match(/-?[\d.]+/g)?.map(Number);
        if (
          !nums ||
          nums.length !== 3 ||
          nums[1] < 0 ||
          nums[1] > 100 ||
          nums[2] < 0 ||
          nums[2] > 100
        )
          throw Error("HSL 값을 확인하세요.");
        color = hslToHex(nums[0], nums[1], nums[2]);
      }
      if (!hexToRgb(color))
        throw Error(
          "HEX, rgb(179,148,218), hsl(267,49%,72%) 형식을 사용하세요.",
        );
      patch({ color });
      setError("");
    } catch (err) {
      setError(String(err));
    }
  }
  const colors = s.palette
    .split(",")
    .map((c) => c.trim())
    .filter((c) => /^#[\da-f]{6}$/i.test(c));
  const rgb = hexToRgb(s.color);
  const contrast = getWcagRating(s.color, s.background);
  return (
    <Panels
      actions={
        <DraftActions
          id={toolId}
          state={s}
          setState={set}
          reset={() => {
            reset();
            setAnalysis("");
            setError("");
          }}
        />
      }
      options={
        <>
          {toolId === "svg" && (
            <>
              <NumberField
                label="너비"
                value={s.width}
                onChange={(width) => patch({ width })}
                min={1}
                max={8192}
              />
              <NumberField
                label="높이"
                value={s.height}
                onChange={(height) => patch({ height })}
                min={1}
                max={8192}
              />
              <Field label="색상">
                <input
                  type="color"
                  value={s.color}
                  onChange={(e) => patch({ color: e.target.value })}
                />
              </Field>
              <button onClick={resizeSvg}>크기·색상 적용</button>
              <button
                onClick={() => patch({ input: clean.replace(/></g, ">\n<") })}
              >
                안전하게 정리
              </button>
              <p>외부 리소스, 스크립트와 이벤트 속성을 제거한 뒤 표시합니다.</p>
            </>
          )}
          {toolId === "motion" && (
            <>
              <NumberField
                label="재생 시간 (초)"
                value={s.duration}
                onChange={(duration) => patch({ duration })}
                min={0.01}
              />
              <NumberField
                label="지연 (초)"
                value={s.delay}
                onChange={(delay) => patch({ delay })}
              />
              <Select
                label="반복"
                value={s.repeat}
                onChange={(repeat) => patch({ repeat })}
                items={["1", "2", "3", "infinite"]}
              />
              <Field label="이징">
                <input
                  value={s.easing}
                  onChange={(e) => patch({ easing: e.target.value })}
                />
              </Field>
            </>
          )}
          {toolId === "colors" && (
            <>
              <Field label="전경색">
                <input
                  type="color"
                  value={s.color}
                  onChange={(e) => patch({ color: e.target.value })}
                />
              </Field>
              <Field label="배경색">
                <input
                  type="color"
                  value={s.background}
                  onChange={(e) => patch({ background: e.target.value })}
                />
              </Field>
              <p>
                대비 {contrast.ratio.toFixed(2)}:1
                <br />
                AA 본문 {contrast.aaNormal ? "통과" : "미달"} · 큰 글자{" "}
                {contrast.aaLarge ? "통과" : "미달"}
                <br />
                AAA 본문 {contrast.aaaNormal ? "통과" : "미달"}
              </p>
            </>
          )}
        </>
      }
      result={
        <>
          {error && <p role="alert">{error}</p>}
          {toolId === "svg" && (
            <>
              <div
                className="ws-preview"
                dangerouslySetInnerHTML={{ __html: clean }}
              />
              <div className="ws-actions">
                <button
                  onClick={() => saveFile(clean, "image.svg", "image/svg+xml")}
                >
                  SVG 저장
                </button>
                <button onClick={png}>PNG 저장</button>
              </div>
              <details>
                <summary>경로 분석</summary>
                <button
                  onClick={() => {
                    try {
                      const doc = new DOMParser().parseFromString(
                        clean,
                        "image/svg+xml",
                      );
                      setAnalysis(
                        JSON.stringify(
                          Array.from(doc.querySelectorAll("path")).map((p) =>
                            parseSvgPath(p.getAttribute("d") || ""),
                          ),
                          null,
                          2,
                        ),
                      );
                    } catch (e) {
                      setAnalysis(String(e));
                    }
                  }}
                >
                  분석
                </button>
                <Output value={analysis} />
              </details>
            </>
          )}
          {toolId === "motion" && (
            <>
              <div
                ref={preview}
                className="ws-preview"
                style={{ minHeight: 180, overflow: "hidden" }}
              >
                <div
                  style={{
                    width: 50,
                    height: 50,
                    background: "#b394da",
                    borderRadius: 10,
                    animation: `workspaceMotion ${s.duration}s ${s.easing} ${s.delay}s ${s.repeat} alternate both`,
                  }}
                />
              </div>
              <Output value={css} name="motion.css" />
            </>
          )}
          {toolId === "colors" && (
            <>
              {colors.map((c) => (
                <div className="swatch" key={c} style={{ background: c }}>
                  {c}
                </div>
              ))}
              <Output
                value={colors
                  .map((c, i) => `--color-${i + 1}: ${c};`)
                  .join("\n")}
                name="colors.css"
              />
              <Output
                value={JSON.stringify(
                  Object.fromEntries(
                    colors.map((c, i) => [
                      "color" + (i + 1),
                      { $type: "color", $value: c },
                    ]),
                  ),
                  null,
                  2,
                )}
                name="tokens.json"
              />
            </>
          )}
        </>
      }
    >
      {toolId === "svg" ? (
        <>
          <Files
            accept="image/svg+xml"
            multiple={false}
            onFiles={async (files) => {
              if (files[0]) patch({ input: await files[0].text() });
            }}
          />
          <Editor value={s.input} onChange={(input) => patch({ input })} />
        </>
      ) : toolId === "motion" ? (
        <Editor
          label="키프레임"
          value={s.frames}
          onChange={(frames) => patch({ frames })}
        />
      ) : (
        <>
          <p style={{ color: s.color, background: s.background, padding: 20 }}>
            색상과 대비 미리보기
          </p>
          <Field label="HEX / RGB / HSL">
            <input
              value={s.colorInput}
              onChange={(e) => patch({ colorInput: e.target.value })}
            />
          </Field>
          <button onClick={convertColor}>색상 변환</button>
          <Output
            value={
              rgb
                ? `${s.color}\nrgb(${rgb.r}, ${rgb.g}, ${rgb.b})\n${JSON.stringify(rgbToHsl(rgb.r, rgb.g, rgb.b))}`
                : ""
            }
          />
          <Field label="팔레트 (HEX 쉼표 구분)">
            <input
              value={s.palette}
              onChange={(e) => patch({ palette: e.target.value })}
            />
          </Field>
          <button
            onClick={() =>
              patch({
                palette: [
                  ...new Set(Object.values(generateHarmonies(s.color)).flat()),
                ].join(","),
              })
            }
          >
            조화 팔레트 만들기
          </button>
          <Files
            accept="image/*"
            multiple={false}
            onFiles={async (files) => {
              if (!files[0]) return;
              const bitmap = await createImageBitmap(files[0]);
              const canvas = document.createElement("canvas");
              canvas.width = 64;
              canvas.height = 64;
              const ctx = canvas.getContext("2d")!;
              ctx.drawImage(bitmap, 0, 0, 64, 64);
              bitmap.close();
              const data = ctx.getImageData(0, 0, 64, 64).data;
              const counts = new Map<string, number>();
              for (let i = 0; i < data.length; i += 4) {
                if (data[i + 3] < 128) continue;
                const c =
                  "#" +
                  [data[i], data[i + 1], data[i + 2]]
                    .map((x) =>
                      Math.min(255, Math.round(x / 32) * 32)
                        .toString(16)
                        .padStart(2, "0"),
                    )
                    .join("");
                counts.set(c, (counts.get(c) || 0) + 1);
              }
              patch({
                palette: [...counts]
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 6)
                  .map((x) => x[0])
                  .join(","),
              });
            }}
          />
        </>
      )}
    </Panels>
  );
}
