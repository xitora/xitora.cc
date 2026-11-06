import { lazy, Suspense, useEffect, useState } from "react";
import { toolsList } from "../data/tools";
import { DRAFT_PREFIX } from "./shared";
import { useRegisterSW } from "virtual:pwa-register/react";
import "./workspace.css";
const TextTools = lazy(() => import("./TextTools"));
const DeveloperTools = lazy(() => import("./DeveloperTools"));
const DesignTools = lazy(() => import("./DesignTools"));
const EverydayTools = lazy(() => import("./EverydayTools"));
const ImagesTool = lazy(() => import("./ImagesTool"));
const PdfTool = lazy(() => import("./PdfTool"));
const AudioTool = lazy(() => import("./AudioTool"));
const FilesTool = lazy(() => import("./FilesTool"));
const QrTool = lazy(() => import("./QrTool"));
export default function ToolWorkspacePage({
  toolId,
  onNavigate,
}: {
  toolId?: string;
  onNavigate: (path: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("전체");
  const [switching, setSwitching] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [favorite, setFavorite] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("xitora:tool-favorites") || "[]");
    } catch {
      return [];
    }
  });
  const [install, setInstall] = useState<
    (Event & { prompt: () => Promise<void> }) | null
  >(null);
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  const tool = toolsList.find((t) => t.id === toolId);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSwitching((v) => !v);
      }
      if (e.key === "Escape") setSwitching(false);
    };
    const connectivity = () => setOnline(navigator.onLine);
    const prompt = (e: Event) => {
      e.preventDefault();
      setInstall(e as Event & { prompt: () => Promise<void> });
    };
    window.addEventListener("keydown", key);
    window.addEventListener("online", connectivity);
    window.addEventListener("offline", connectivity);
    window.addEventListener("beforeinstallprompt", prompt);
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(DRAFT_PREFIX)) {
        try {
          const value = JSON.parse(localStorage.getItem(key) || "null");
          if (Date.now() - value?.updatedAt > 7 * 86400000)
            localStorage.removeItem(key);
        } catch {
          localStorage.removeItem(key);
        }
      }
    }
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("online", connectivity);
      window.removeEventListener("offline", connectivity);
      window.removeEventListener("beforeinstallprompt", prompt);
    };
  }, []);
  const filtered = toolsList.filter(
    (t) =>
      (category === "전체" ||
        (category === "즐겨찾기" && favorite.includes(t.id)) ||
        category === t.category) &&
      `${t.title} ${t.description} ${t.keywords}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  function go(id: string) {
    setSwitching(false);
    setQuery("");
    onNavigate("/tools/" + id);
  }
  function star(id: string) {
    const next = favorite.includes(id)
      ? favorite.filter((x) => x !== id)
      : [...favorite, id];
    setFavorite(next);
    localStorage.setItem("xitora:tool-favorites", JSON.stringify(next));
  }
  let content;
  if (toolId && ["text", "encoding", "data", "diff"].includes(toolId))
    content = <TextTools toolId={toolId} />;
  else if (toolId && ["requests", "mock-data"].includes(toolId))
    content = <DeveloperTools toolId={toolId} />;
  else if (toolId && ["svg", "motion", "colors"].includes(toolId))
    content = <DesignTools toolId={toolId} />;
  else if (toolId === "images") content = <ImagesTool />;
  else if (toolId === "pdf") content = <PdfTool />;
  else if (toolId === "audio") content = <AudioTool />;
  else if (toolId === "files") content = <FilesTool />;
  else if (toolId === "qr") content = <QrTool />;
  else if (toolId) content = <EverydayTools toolId={toolId} />;
  return (
    <main className="ws">
      <header>
        <button onClick={() => onNavigate(tool ? "/tools" : "/")}>
          {tool ? "← 도구 목록" : "← 메인으로"}
        </button>
        <div>
          <h1>{tool?.title || "도구"}</h1>
          <p>
            {tool?.description || "파일과 입력은 이 브라우저에서 처리합니다."}
          </p>
        </div>
        <button className="ws-switch" onClick={() => setSwitching(true)}>
          도구 전환 <small>Ctrl/⌘ K</small>
        </button>
        <span>{online ? "" : "오프라인"}</span>
        {install && (
          <button
            onClick={async () => {
              await install.prompt();
              setInstall(null);
            }}
          >
            앱 설치
          </button>
        )}
      </header>
      {offlineReady && (
        <div className="ws-toolbar" role="status">
          오프라인에서 다시 사용할 준비가 됐습니다.
          <button onClick={() => setOfflineReady(false)}>닫기</button>
        </div>
      )}
      {needRefresh && (
        <div className="ws-toolbar">
          새 버전이 있습니다. 작업을 저장한 뒤 적용하세요.
          <button onClick={() => updateServiceWorker(true)}>
            업데이트 적용
          </button>
          <button onClick={() => setNeedRefresh(false)}>나중에</button>
        </div>
      )}
      {tool ? (
        <Suspense fallback={<p role="status">도구를 불러오는 중…</p>}>
          <div key={toolId}>{content}</div>
        </Suspense>
      ) : (
        <>
          <div className="ws-toolbar">
            <input
              aria-label="도구 검색"
              placeholder="도구 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ maxWidth: 360 }}
            />
            {[
              "전체",
              "즐겨찾기",
              ...new Set(toolsList.map((t) => t.category)),
            ].map((c) => (
              <button
                key={c}
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="ws-grid">
            {filtered.map((t) => (
              <article key={t.id} className="ws-card">
                <button
                  aria-label={t.title + " 즐겨찾기"}
                  aria-pressed={favorite.includes(t.id)}
                  onClick={() => star(t.id)}
                >
                  {favorite.includes(t.id) ? "★" : "☆"}
                </button>
                <a
                  href={"/tools/" + t.id}
                  onClick={(e) => {
                    e.preventDefault();
                    go(t.id);
                  }}
                >
                  {t.title}
                </a>
                <p>{t.description}</p>
                <small>{t.category}</small>
              </article>
            ))}
          </div>
          <details>
            <summary>저장된 입력 관리</summary>
            <p>
              일반 입력과 옵션은 마지막 수정 후 7일 동안 이 브라우저에
              저장됩니다. 요청 분석 입력과 선택한 파일은 저장하지 않습니다.
            </p>
            <button
              onClick={() => {
                for (const key of Object.keys(localStorage))
                  if (key.startsWith(DRAFT_PREFIX))
                    localStorage.removeItem(key);
                alert("도구의 저장된 입력을 지웠습니다.");
              }}
            >
              모든 도구의 저장된 입력 삭제
            </button>
          </details>
        </>
      )}
      {switching && (
        <div
          className="ws-dialog"
          role="dialog"
          aria-modal="true"
          aria-label="도구 전환"
          onKeyDown={(event) => {
            if (event.key !== "Tab") return;
            const controls =
              event.currentTarget.querySelectorAll<HTMLElement>("input,button");
            const first = controls[0],
              last = controls[controls.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }}
        >
          <div className="ws-row">
            <input
              autoFocus
              aria-label="전환할 도구 검색"
              placeholder="이름이나 기능으로 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button onClick={() => setSwitching(false)}>닫기</button>
          </div>
          {toolsList
            .filter((t) =>
              (t.title + " " + t.keywords)
                .toLowerCase()
                .includes(query.toLowerCase()),
            )
            .map((t) => (
              <button key={t.id} onClick={() => go(t.id)}>
                {t.title} · {t.description}
              </button>
            ))}
        </div>
      )}
    </main>
  );
}
