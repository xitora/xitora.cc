export type ContactItem =
  | { kind: "copy"; category: string; label: string; value: string; icon: string; color: string }
  | { kind: "link"; category: string; label: string; value: string; href: string; icon: string; color: string };

export const contacts: ContactItem[] = [
  { kind: "copy", category: "SNS", label: "디스코드", value: "xitora.cc", icon: "Discord", color: "#5865F2" },
  { kind: "link", category: "SNS", label: "디스코드 서버", value: "discord.gg/gRwzzKm4ba", href: "https://discord.gg/gRwzzKm4ba", icon: "Discord", color: "#5865F2" },
  { kind: "link", category: "SNS", label: "X", value: "x.com/xit0ra", href: "https://x.com/xit0ra", icon: "X", color: "#FFFFFF" },
  { kind: "link", category: "SNS", label: "유튜브", value: "youtube.com/@xitora_ovo", href: "https://youtube.com/@xitora_ovo", icon: "Youtube", color: "#FF0000" },
  { kind: "link", category: "SNS", label: "카카오톡", value: "open.kakao.com/me/xitora", href: "https://open.kakao.com/me/xitora", icon: "Kakao", color: "#FEE500" },
  { kind: "copy", category: "SNS", label: "텔레그램", value: "@xit0ra", icon: "Telegram", color: "#229ED9" },

  { kind: "link", category: "게임", label: "스팀", value: "steamcommunity.com/id/xitora", href: "https://steamcommunity.com/id/xitora/", icon: "Steam", color: "#2a475e" },
  { kind: "copy", category: "게임", label: "라이엇 게임즈", value: "xitora#tora", icon: "Riot", color: "#EB0029" },
  { kind: "link", category: "게임", label: "츄니즘", value: "chunilib.tsaibee.org/user/xitora", href: "https://chunilib.tsaibee.org/user/xitora", icon: "Chunithm", color: "#FFC800" },
  { kind: "link", category: "게임", label: "마이마이", value: "maimai.shiftpsh.com/profile/xitora", href: "https://maimai.shiftpsh.com/profile/xitora", icon: "Maimai", color: "#33BBFF" },
  { kind: "copy", category: "게임", label: "프로젝트 세카이", value: "469154469596278791", icon: "Sekai", color: "#33CCBB" },
  { kind: "copy", category: "게임", label: "블루 아카이브", value: "AYWXBESO", icon: "BlueArchive", color: "#00AEEF" },

  { kind: "link", category: "기타", label: "깃허브", value: "github.com/xitora", href: "https://github.com/xitora", icon: "GitHub", color: "#FFFFFF" },
  { kind: "link", category: "기타", label: "스포티파이", value: "open.spotify.com/user/u04ybsi04ymfkfivvv8az51b7", href: "https://open.spotify.com/user/u04ybsi04ymfkfivvv8az51b7", icon: "Spotify", color: "#1DB954" }
];
