import { diffLines, diffWords } from "diff";
function ordered(value: unknown): unknown {
  return Array.isArray(value)
    ? value.map(ordered)
    : value && typeof value === "object"
      ? Object.fromEntries(
          Object.entries(value)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, item]) => [key, ordered(item)]),
        )
      : value;
}
self.onmessage = (e) => {
  try {
    let { input, other, json, word } = e.data as {
      input: string;
      other: string;
      json: boolean;
      word: boolean;
    };
    if (json) {
      input = JSON.stringify(ordered(JSON.parse(input)), null, 2);
      other = JSON.stringify(ordered(JSON.parse(other)), null, 2);
    }
    const options = { timeout: 1000, maxEditLength: 20000 };
    const parts =
      word && !json
        ? diffWords(input, other, options)
        : diffLines(input, other, options);
    if (!parts)
      throw Error("비교 범위가 너무 큽니다. 입력을 나누어 비교하세요.");
    const text =
      json && input === other
        ? "동일한 JSON입니다."
        : parts
            .map((p) => (p.added ? "+ " : p.removed ? "- " : "  ") + p.value)
            .join("");
    self.postMessage({ text, parts });
  } catch (err) {
    self.postMessage({
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
