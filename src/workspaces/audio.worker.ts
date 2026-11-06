import { Mp3Encoder } from "@breezystack/lamejs";
self.onmessage = (e) => {
  try {
    const { channels, rate, format } = e.data as {
      channels: Float32Array[];
      rate: number;
      format: string;
    };
    const n = channels[0].length,
      pcm = channels.map((data) =>
        Int16Array.from(data, (v) =>
          Math.round(Math.max(-1, Math.min(1, v)) * (v < 0 ? 32768 : 32767)),
        ),
      );
    let output: Uint8Array;
    if (format === "MP3") {
      const encoder = new Mp3Encoder(channels.length, rate, 192);
      const parts: Uint8Array[] = [];
      for (let i = 0; i < n; i += 1152) {
        const chunk = encoder.encodeBuffer(
          pcm[0].subarray(i, i + 1152),
          pcm[1]?.subarray(i, i + 1152),
        );
        parts.push(new Uint8Array(chunk));
        if (i % 115200 === 0)
          self.postMessage({ progress: Math.round((i / n) * 100) });
      }
      parts.push(new Uint8Array(encoder.flush()));
      output = new Uint8Array(parts.reduce((a, p) => a + p.length, 0));
      let at = 0;
      for (const part of parts) {
        output.set(part, at);
        at += part.length;
      }
    } else {
      const length = n * channels.length * 2,
        buffer = new ArrayBuffer(44 + length),
        view = new DataView(buffer);
      const str = (at: number, value: string) =>
        Array.from(value).forEach((c, i) =>
          view.setUint8(at + i, c.charCodeAt(0)),
        );
      str(0, "RIFF");
      view.setUint32(4, 36 + length, true);
      str(8, "WAVE");
      str(12, "fmt ");
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, channels.length, true);
      view.setUint32(24, rate, true);
      view.setUint32(28, rate * channels.length * 2, true);
      view.setUint16(32, channels.length * 2, true);
      view.setUint16(34, 16, true);
      str(36, "data");
      view.setUint32(40, length, true);
      for (let i = 0; i < n; i++)
        for (let c = 0; c < channels.length; c++)
          view.setInt16(44 + (i * channels.length + c) * 2, pcm[c][i], true);
      output = new Uint8Array(buffer);
    }
    self.postMessage({ output });
  } catch (err) {
    self.postMessage({
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
