export function parsePages(input: string, count: number) {
  if (!input.trim()) return Array.from({ length: count }, (_, i) => i);
  const pages: number[] = [];
  for (const token of input.split(",")) {
    const match = token.trim().match(/^(\d+)(?:-(\d+))?$/);
    if (!match) throw Error("페이지는 1,3,5-7 형식으로 입력하세요.");
    const from = Number(match[1]),
      to = Number(match[2] || match[1]);
    if (from < 1 || to < from || to > count)
      throw Error(`페이지 범위는 1~${count}입니다.`);
    for (let i = from; i <= to; i++) pages.push(i - 1);
  }
  return pages;
}
