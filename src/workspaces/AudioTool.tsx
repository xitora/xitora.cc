import { useEffect, useRef, useState } from "react";
import {
  DraftActions,
  Files,
  NumberField,
  Panels,
  Select,
  saveFile,
  useDraft,
  useObjectUrl,
  useTask,
} from "./shared";
export default function AudioTool() {
  const [s, set, reset] = useDraft("audio", {
    start: 0,
    end: 0,
    volume: 1,
    fadeIn: 0,
    fadeOut: 0,
    format: "WAV",
  });
  const patch = (p: Partial<typeof s>) => set({ ...s, ...p });
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [original, setOriginal] = useState<File | null>(null);
  const [output, setOutput] = useState<Blob | null>(null);
  const url = useObjectUrl(output),
    originalUrl = useObjectUrl(original);
  const canvas = useRef<HTMLCanvasElement>(null);
  const task = useTask();
  useEffect(() => {
    if (!canvas.current) return;
    if (!buffer) {
      canvas.current
        .getContext("2d")
        ?.clearRect(0, 0, canvas.current.width, canvas.current.height);
      return;
    }
    const c = canvas.current,
      ctx = c.getContext("2d")!,
      data = buffer.getChannelData(0);
    c.width = 1000;
    c.height = 180;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#b394da";
    for (let i = 0; i < c.width; i++) {
      const start = Math.floor((i * data.length) / c.width),
        end = Math.floor(((i + 1) * data.length) / c.width);
      let max = 0;
      for (let n = start; n < end; n++) max = Math.max(max, Math.abs(data[n]));
      ctx.fillRect(i, 90 - max * 85, 1, Math.max(1, max * 170));
    }
  }, [buffer]);
  async function load(files: File[]) {
    await task.run(async () => {
      if (!files[0]) return;
      const context = new AudioContext();
      try {
        const decoded = await context.decodeAudioData(
          await files[0].arrayBuffer(),
        );
        setBuffer(decoded);
        setOriginal(files[0]);
        setOutput(null);
        patch({ start: 0, end: decoded.duration });
      } finally {
        await context.close();
      }
    });
  }
  async function run() {
    await task.run(async (signal, report) => {
      if (!buffer) throw Error("오디오를 먼저 선택하세요.");
      if (
        s.start < 0 ||
        s.end <= s.start ||
        s.end > buffer.duration + 0.001 ||
        s.volume < 0 ||
        s.volume > 4 ||
        s.fadeIn < 0 ||
        s.fadeOut < 0
      )
        throw Error("구간과 음량을 확인하세요.");
      const from = Math.floor(s.start * buffer.sampleRate),
        to = Math.min(buffer.length, Math.floor(s.end * buffer.sampleRate));
      const channels = Array.from(
        { length: Math.min(2, buffer.numberOfChannels) },
        (_, c) => {
          const data = buffer.getChannelData(c).slice(from, to);
          for (let i = 0; i < data.length; i++) {
            const t = i / buffer.sampleRate,
              remain = (data.length - i - 1) / buffer.sampleRate;
            const fade = Math.min(
              1,
              s.fadeIn ? t / s.fadeIn : 1,
              s.fadeOut ? remain / s.fadeOut : 1,
            );
            data[i] *= s.volume * Math.max(0, fade);
          }
          return data;
        },
      );
      const result = await new Promise<Uint8Array>((resolve, reject) => {
        const worker = new Worker(
          new URL("./audio.worker.ts", import.meta.url),
          { type: "module" },
        );
        const stop = () => {
          worker.terminate();
          reject(Error("취소했습니다."));
        };
        signal.addEventListener("abort", stop, { once: true });
        worker.onmessage = (e) => {
          if (e.data.progress !== undefined) {
            report(`인코딩 ${e.data.progress}%`);
            return;
          }
          worker.terminate();
          signal.removeEventListener("abort", stop);
          e.data.error ? reject(Error(e.data.error)) : resolve(e.data.output);
        };
        worker.onerror = (e) => {
          worker.terminate();
          reject(Error(e.message));
        };
        worker.postMessage(
          { channels, rate: buffer.sampleRate, format: s.format },
          channels.map((c) => c.buffer),
        );
      });
      signal.throwIfAborted();
      setOutput(
        new Blob([new Uint8Array(result).buffer], {
          type: s.format === "MP3" ? "audio/mpeg" : "audio/wav",
        }),
      );
    });
  }
  return (
    <Panels
      actions={
        <>
          <DraftActions
            id="audio"
            state={s}
            setState={set}
            reset={() => {
              task.cancel();
              reset();
              setBuffer(null);
              setOriginal(null);
              setOutput(null);
            }}
          />
          <button onClick={run} disabled={task.busy}>
            구간 변환
          </button>
          {task.busy && <button onClick={task.cancel}>취소</button>}
          <span role="status">{task.status}</span>
        </>
      }
      options={
        <>
          <NumberField
            label="시작 (초)"
            value={s.start}
            min={0}
            onChange={(start) => patch({ start })}
          />
          <NumberField
            label="끝 (초)"
            value={s.end}
            min={0}
            onChange={(end) => patch({ end })}
          />
          <NumberField
            label="음량 (1=원본)"
            value={s.volume}
            min={0}
            max={4}
            onChange={(volume) => patch({ volume })}
          />
          <NumberField
            label="페이드 인 (초)"
            value={s.fadeIn}
            min={0}
            onChange={(fadeIn) => patch({ fadeIn })}
          />
          <NumberField
            label="페이드 아웃 (초)"
            value={s.fadeOut}
            min={0}
            onChange={(fadeOut) => patch({ fadeOut })}
          />
          <Select
            label="출력"
            value={s.format}
            items={["WAV", "MP3"]}
            onChange={(format) => patch({ format })}
          />
        </>
      }
      result={
        <>
          {url && (
            <>
              <audio src={url} controls />
              <button
                onClick={() =>
                  saveFile(output!, "audio." + s.format.toLowerCase())
                }
              >
                오디오 저장
              </button>
            </>
          )}
        </>
      }
    >
      <Files accept="audio/*" multiple={false} onFiles={load} />
      <canvas ref={canvas} aria-label="오디오 파형" />
      {originalUrl && <audio src={originalUrl} controls />}
      {buffer && (
        <p>
          {buffer.duration.toFixed(2)}초 · {buffer.sampleRate} Hz ·{" "}
          {buffer.numberOfChannels}채널
        </p>
      )}
      <p>
        브라우저에서 재생 가능한 파일을 지원합니다. 출력은 최대 스테레오입니다.
      </p>
    </Panels>
  );
}
