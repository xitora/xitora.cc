import { motion } from "framer-motion";
import { ArrowUpRight, ChevronLeft, FolderOpen } from "lucide-react";
import "./projects.css";

const projects = [
  {
    id: "royalsg",
    image: "/assets/project-royalsg.png",
    name: "로얄상구 대여 예약",
    category: "예약 서비스",
    url: "https://royalsg.xitora.cc/",
    domain: "royalsg.xitora.cc",
    description: "로얄상구의 게임 기기를 대여할 날짜를 고르고 예약하는 웹사이트입니다.",
    features: [
      "캘린더에서 예약 가능한 날짜를 확인하고 기기를 선택해 신청합니다.",
      "Google 로그인 후 내 예약을 확인하고, 승인 대기 중인 예약을 취소할 수 있습니다.",
      "관리자는 예약을 승인하거나 운영하지 않는 날짜를 지정합니다.",
    ],
    stack: ["Next.js", "TypeScript", "Material Web", "Supabase"],
    note: "결제는 서비스 밖에서 별도로 진행합니다.",
  },
  {
    id: "chunitora",
    image: "/assets/project-chunitora.png",
    name: "츄니토라",
    category: "게임 커뮤니티",
    url: "https://chuni.xitora.cc/",
    domain: "chuni.xitora.cc",
    description: "CHUNITHM을 플레이하며 나누는 이야기와 악곡 정보를 모은 비공식 팬 커뮤니티입니다.",
    features: [
      "공략이나 플레이 성과를 글로 남기고 댓글로 이야기합니다.",
      "악곡 DB에서 난이도와 채보 상수로 곡을 찾고, WORLD’S END 채보를 따로 살펴봅니다.",
      "게시글 본문에 악곡을 연결하고, 악곡 정보 변경 제안과 신고를 운영진이 검토합니다.",
    ],
    stack: ["Next.js", "TypeScript", "Tailwind CSS", "Supabase"],
    note: "SEGA와 무관한 비공식 팬 프로젝트입니다.",
  },
];

export default function ProjectsPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <motion.main
      className="page-layout post-detail-layout projects-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="post-detail-container">
        <button className="back-btn" onClick={() => onNavigate("/")}>
          <ChevronLeft size={20} aria-hidden="true" /> 메인으로
        </button>
        <header className="projects-heading">
          <h1><FolderOpen size={32} aria-hidden="true" /> 프로젝트</h1>
          <p>직접 만들고 운영하는 웹사이트입니다.</p>
        </header>
        <div className="projects-list">
          {projects.map((project, index) => (
            <article className={`project-card project-card--${project.id}`} key={project.id}>
              <div className="project-card__backdrop" aria-hidden="true">
                <img src={project.image} alt="" loading="lazy" />
              </div>
              <div className="project-card__identity">
                <span className="project-card__category">0{index + 1} / {project.category}</span>
                <h2>{project.name}</h2>
                <a className="project-card__visit" href={project.url} target="_blank" rel="noreferrer">
                  사이트 방문 <ArrowUpRight size={18} aria-hidden="true" />
                  <span className="project-card__domain">{project.domain}</span>
                </a>
              </div>
              <div className="project-card__body">
                <p className="project-card__description">{project.description}</p>
                <ul className="project-card__features">
                  {project.features.map((feature) => <li key={feature}>{feature}</li>)}
                </ul>
                <ul className="project-card__stack" aria-label={`${project.name} 사용 기술`}>
                  {project.stack.map((tech) => <li key={tech}>{tech}</li>)}
                </ul>
                <p className="project-card__note">{project.note}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </motion.main>
  );
}
