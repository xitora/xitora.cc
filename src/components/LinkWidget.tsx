import React, { useEffect, useState, useMemo } from 'react';
import { ExternalLink, Globe } from 'lucide-react';

export interface LinkWidgetProps {
  url: string;
  title?: string;
  desc?: string;
}

interface MetaData {
  title?: string;
  description?: string;
  image?: string;
  publisher?: string;
  color?: string;
}

// 메모리 캐시로 중복 API 호출 방지
const metaCache = new Map<string, MetaData>();

// 유명 플랫폼별 기본 시그니처 색상 및 브랜드 명칭
const BRAND_PRESETS: Record<string, { name: string; color: string; defaultTitle?: string }> = {
  'spotify.com': { name: 'Spotify', color: '#1DB954', defaultTitle: 'Spotify' },
  'open.spotify.com': { name: 'Spotify', color: '#1DB954', defaultTitle: 'Spotify' },
  'discord.com': { name: 'Discord', color: '#5865F2', defaultTitle: 'Discord' },
  'discord.gg': { name: 'Discord', color: '#5865F2', defaultTitle: 'Discord' },
  'youtube.com': { name: 'YouTube', color: '#FF0000', defaultTitle: 'YouTube' },
  'youtu.be': { name: 'YouTube', color: '#FF0000', defaultTitle: 'YouTube' },
  'github.com': { name: 'GitHub', color: '#8b949e', defaultTitle: 'GitHub' },
  'twitter.com': { name: 'X (Twitter)', color: '#1D9BF0', defaultTitle: 'X' },
  'x.com': { name: 'X', color: '#1D9BF0', defaultTitle: 'X' },
  'naver.com': { name: 'NAVER', color: '#03C75A', defaultTitle: '네이버' },
  'nid.naver.com': { name: 'NAVER', color: '#03C75A', defaultTitle: '네이버 로그인' },
  'dcinside.com': { name: '디시인사이드', color: '#3B5A9A', defaultTitle: '디시인사이드' },
  'gall.dcinside.com': { name: '디시인사이드', color: '#3B5A9A', defaultTitle: '디시인사이드 갤러리' },
  'steamcommunity.com': { name: 'Steam', color: '#66C0F4', defaultTitle: 'Steam 커뮤니티' },
  'steampowered.com': { name: 'Steam', color: '#66C0F4', defaultTitle: 'Steam 상점' },
  'drive.google.com': { name: 'Google Drive', color: '#4285F4', defaultTitle: '구글 드라이브' },
  'docs.google.com': { name: 'Google Docs', color: '#4285F4', defaultTitle: '구글 문서' },
  'twitch.tv': { name: 'Twitch', color: '#9146FF', defaultTitle: '트위치' },
  'reddit.com': { name: 'Reddit', color: '#FF4500', defaultTitle: 'Reddit' },
  'xitora.cc': { name: 'xitora.cc', color: '#0395FC', defaultTitle: 'xitora.cc' },
};

// 도메인 문자열 기반 일관된 HSL 악센트 컬러 생성 함수
function generateEmbedColor(domain: string): string {
  try {
    let hash = 0;
    for (let i = 0; i < domain.length; i++) {
      hash = domain.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 55%)`;
  } catch {
    return '#0395FC';
  }
}

// URL로부터 도메인 및 호스트명 안전하게 추출
function parseHostname(rawUrl: string): { hostname: string; rootDomain: string } {
  try {
    const parsed = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const parts = hostname.split('.');
    const rootDomain = parts.length >= 2 ? parts.slice(-2).join('.') : hostname;
    return { hostname, rootDomain };
  } catch {
    return { hostname: rawUrl, rootDomain: rawUrl };
  }
}

export const LinkWidget: React.FC<LinkWidgetProps> = ({ url, title: initialTitle, desc: initialDesc }) => {
  const [meta, setMeta] = useState<MetaData | null>(() => metaCache.get(url) || null);
  const [faviconError, setFaviconError] = useState(false);

  const { hostname, rootDomain } = useMemo(() => parseHostname(url), [url]);

  // 브랜드 프리셋 정보 조회
  const brandPreset = useMemo(() => {
    return BRAND_PRESETS[hostname] || BRAND_PRESETS[rootDomain] || null;
  }, [hostname, rootDomain]);

  // 임베드 테마 색상 결정 (메타데이터 color -> 브랜드 프리셋 -> 도메인 해시 컬러)
  const embedColor = useMemo(() => {
    return meta?.color || brandPreset?.color || generateEmbedColor(hostname);
  }, [meta?.color, brandPreset, hostname]);

  // 구글 고해상도 파비콘 서비스 URL
  const faviconUrl = useMemo(() => {
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
  }, [hostname]);

  // 자동 메타데이터 패치 (Microlink API)
  useEffect(() => {
    if (!url || metaCache.has(url)) return;

    let isMounted = true;
    const fetchMetadata = async () => {
      try {
        const targetUrl = url.startsWith('http') ? url : `https://${url}`;
        const apiUrl = `https://api.microlink.io?url=${encodeURIComponent(targetUrl)}`;
        const res = await fetch(apiUrl);
        if (!res.ok) return;

        const json = await res.json();
        if (json.status === 'success' && json.data) {
          const fetchedData: MetaData = {
            title: json.data.title || undefined,
            description: json.data.description || undefined,
            image: json.data.image?.url || undefined,
            publisher: json.data.publisher || undefined,
          };
          metaCache.set(url, fetchedData);
          if (isMounted) {
            setMeta(fetchedData);
          }
        }
      } catch (err) {
        // 네트워크 실패 시 기본 폴백 정보 유지
      }
    };

    fetchMetadata();
    return () => {
      isMounted = false;
    };
  }, [url]);

  // 최종 표시할 제목 결정
  const displayTitle = useMemo(() => {
    if (initialTitle && initialTitle !== 'LinkWidget' && initialTitle !== '링크') {
      return initialTitle;
    }
    if (meta?.title) {
      return meta.title;
    }
    if (brandPreset?.defaultTitle) {
      return brandPreset.defaultTitle;
    }
    return hostname;
  }, [initialTitle, meta?.title, brandPreset, hostname]);

  // 최종 표시할 설명문 결정
  const displayDesc = useMemo(() => {
    if (initialDesc) return initialDesc;
    if (meta?.description) return meta.description;
    return undefined;
  }, [initialDesc, meta?.description]);

  // 사이트 제공자명 결정
  const providerName = useMemo(() => {
    return meta?.publisher || brandPreset?.name || hostname;
  }, [meta?.publisher, brandPreset, hostname]);

  const targetHref = url.startsWith('http') ? url : `https://${url}`;

  return (
    <a
      href={targetHref}
      target="_blank"
      rel="noopener noreferrer"
      className="discord-embed-widget post-widget"
      style={{
        '--embed-color': embedColor,
      } as React.CSSProperties}
    >
      {/* 1. 배경 이미지 레이어: OG 배너 이미지를 강하게 블러 처리 */}
      {meta?.image && (
        <div
          className="discord-embed-backdrop-image"
          style={{ backgroundImage: `url(${meta.image})` }}
          aria-hidden="true"
        />
      )}

      {/* 2. 배경 그라데이션 및 마스킹 레이어 (왼쪽 위 -> 오른쪽 아래로 서서히 투명해짐) */}
      <div className="discord-embed-backdrop-gradient" aria-hidden="true" />

      {/* 3. 우측 상단 고정 바로가기 아이콘 */}
      <div className="discord-embed-top-right-action" aria-hidden="true">
        <ExternalLink size={14} className="discord-embed-ext-icon" />
      </div>

      {/* 4. 본문 콘텐츠 레이어 (여백을 최소화하여 컴팩트하게 정렬) */}
      <div className="discord-embed-content">
        {/* 상단 헤더: 파비콘 + 도메인/제공자명 */}
        <div className="discord-embed-header">
          <div className="discord-embed-provider">
            {!faviconError ? (
              <img
                src={faviconUrl}
                alt=""
                className="discord-embed-favicon"
                onError={() => setFaviconError(true)}
              />
            ) : (
              <Globe size={13} className="discord-embed-favicon-fallback" />
            )}
            <span className="discord-embed-provider-name">{providerName}</span>
          </div>
        </div>

        {/* 중앙 타이틀 (1~2줄 깔끔한 말줄임) */}
        <div className="discord-embed-title">
          {displayTitle}
        </div>

        {/* 하단 요약 설명 또는 URL */}
        {displayDesc ? (
          <div className="discord-embed-desc">
            {displayDesc}
          </div>
        ) : (
          <span className="discord-embed-url">{targetHref}</span>
        )}
      </div>
    </a>
  );
};

export default LinkWidget;
