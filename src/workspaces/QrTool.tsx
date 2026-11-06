import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { buildWifiPayload, buildVCardPayload } from "../utils/qrGenerator";
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
  useTask,
} from "./shared";
export default function QrTool() {
  const [s, set, reset] = useDraft("qr", {
    mode: "텍스트·URL",
    text: "https://xitora.cc",
    ssid: "",
    password: "",
    encryption: "WPA",
    name: "",
    phone: "",
    email: "",
    size: 512,
    fg: "#111111",
    bg: "#ffffff",
    level: "M",
  });
  const patch = (p: Partial<typeof s>) => set({ ...s, ...p });
  const [png, setPng] = useState("");
  const [svg, setSvg] = useState("");
  const [decoded, setDecoded] = useState("");
  const [camera, setCamera] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const controls = useRef<IScannerControls | null>(null);
  const task = useTask();
  const text =
    s.mode === "Wi-Fi"
      ? buildWifiPayload({
          ssid: s.ssid,
          password: s.password,
          encryption: s.encryption as "WPA" | "WEP" | "nopass",
        })
      : s.mode === "연락처"
        ? buildVCardPayload({ name: s.name, phone: s.phone, email: s.email })
        : s.text;
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const options = {
          width: s.size,
          margin: 4,
          errorCorrectionLevel: s.level as "L" | "M" | "Q" | "H",
          color: { dark: s.fg, light: s.bg },
        };
        const p = await QRCode.toDataURL(text, options),
          v = await QRCode.toString(text, { ...options, type: "svg" });
        if (active) {
          setPng(p);
          setSvg(v);
        }
      } catch {
        if (active) {
          setPng("");
          setSvg("");
        }
      }
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [text, s.size, s.fg, s.bg, s.level]);
  function stop() {
    task.cancel();
    controls.current?.stop();
    controls.current = null;
    const stream = video.current?.srcObject;
    if (stream instanceof MediaStream)
      stream.getTracks().forEach((t) => t.stop());
    setCamera(false);
  }
  useEffect(() => {
    const node = video.current;
    return () => {
      controls.current?.stop();
      const stream = node?.srcObject;
      if (stream instanceof MediaStream)
        stream.getTracks().forEach((t) => t.stop());
    };
  }, []);
  async function start() {
    setCamera(true);
    await task.run(async (signal) => {
      await new Promise((r) => setTimeout(r, 0));
      const reader = new BrowserQRCodeReader();
      const c = await reader.decodeFromVideoDevice(
        undefined,
        video.current!,
        (result) => {
          if (result) {
            setDecoded(result.getText());
            controls.current?.stop();
            setCamera(false);
          }
        },
      );
      if (signal.aborted) {
        c.stop();
        return;
      }
      controls.current = c;
    });
  }
  return (
    <Panels
      actions={
        <DraftActions
          id="qr"
          state={s}
          setState={set}
          reset={() => {
            stop();
            reset();
            setDecoded("");
          }}
        />
      }
      options={
        <>
          <Select
            label="내용 종류"
            value={s.mode}
            items={["텍스트·URL", "Wi-Fi", "연락처"]}
            onChange={(mode) => patch({ mode })}
          />
          <NumberField
            label="크기 (px)"
            value={s.size}
            min={128}
            max={2048}
            onChange={(size) => patch({ size })}
          />
          <Select
            label="오류 복원"
            value={s.level}
            items={["L", "M", "Q", "H"]}
            onChange={(level) => patch({ level })}
          />
          <Field label="전경색">
            <input
              type="color"
              value={s.fg}
              onChange={(e) => patch({ fg: e.target.value })}
            />
          </Field>
          <Field label="배경색">
            <input
              type="color"
              value={s.bg}
              onChange={(e) => patch({ bg: e.target.value })}
            />
          </Field>
        </>
      }
      result={
        <>
          {png && <img src={png} alt="생성한 QR 코드" />}
          <div className="ws-actions">
            <button
              disabled={!svg}
              onClick={() => saveFile(svg, "qr.svg", "image/svg+xml")}
            >
              SVG 저장
            </button>
            <button
              disabled={!png}
              onClick={async () =>
                saveFile(await (await fetch(png)).blob(), "qr.png")
              }
            >
              PNG 저장
            </button>
          </div>
          <Output value={decoded} name="decoded.txt" />
          <p>읽은 주소는 자동으로 열지 않습니다.</p>
        </>
      }
    >
      {s.mode === "텍스트·URL" ? (
        <Editor value={s.text} onChange={(text) => patch({ text })} />
      ) : (
        <>
          {(s.mode === "Wi-Fi"
            ? ["ssid", "password"]
            : ["name", "phone", "email"]
          ).map((key) => (
            <Field
              key={key}
              label={
                (
                  {
                    ssid: "네트워크 이름",
                    password: "비밀번호",
                    name: "이름",
                    phone: "전화번호",
                    email: "이메일",
                  } as Record<string, string>
                )[key]
              }
            >
              <input
                type={key === "password" ? "password" : "text"}
                value={s[key as keyof typeof s]}
                onChange={(e) => patch({ [key]: e.target.value })}
              />
            </Field>
          ))}
          {s.mode === "Wi-Fi" && (
            <Select
              label="보안"
              value={s.encryption}
              items={["WPA", "WEP", "nopass"]}
              onChange={(encryption) => patch({ encryption })}
            />
          )}
        </>
      )}
      <h2>QR 읽기</h2>
      <Files
        accept="image/*"
        multiple={false}
        onFiles={(files) =>
          task.run(async () => {
            if (!files[0]) return;
            const url = URL.createObjectURL(files[0]);
            try {
              const result = await new BrowserQRCodeReader().decodeFromImageUrl(
                url,
              );
              setDecoded(result.getText());
            } finally {
              URL.revokeObjectURL(url);
            }
          })
        }
      />
      <button onClick={() => (camera ? stop() : start())}>
        {camera ? "카메라 정지" : "카메라로 읽기"}
      </button>
      <video
        ref={video}
        style={{ display: camera ? "block" : "none" }}
        muted
        playsInline
      />
      <p role="status">{task.status}</p>
    </Panels>
  );
}
