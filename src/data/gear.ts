export interface GearItem {
  index: string;
  category: string;
  name: string;
  detail: string;
}

// Update name and detail when the actual gear models are available.
export const gearItems: GearItem[] = [
  {
    index: "01",
    category: "마우스",
    name: "VXE MAD R MAJOR+",
    detail: "-",
  },
  {
    index: "02",
    category: "키보드",
    name: "Wooting 60HE+",
    detail: "스위치: 상우정공 Raptor HE\n케이스: Alumaze60\n키캡: osumekey sakura hiragana with novelty",
  },
  {
    index: "03",
    category: "마우스패드",
    name: "겜용이 GB5050 브레이킹",
    detail: "-",
  },
  {
    index: "04",
    category: "이어폰",
    name: "수월우 KATO",
    detail: "케이블: 수월우 Autumn Moon",
  },
  {
    index: "05",
    category: "마이크",
    name: "Shure SM7B",
    detail: "-",
  },
  {
    index: "06",
    category: "마이크 프리앰프",
    name: "Triton FetHead Ge",
    detail: "-",
  },
  {
    index: "07",
    category: "오디오 인터페이스",
    name: "Audient ID14 mk2",
    detail: "-",
  },
  {
    index: "08",
    category: "스피커",
    name: "Edifier MR4",
    detail: "-",
  },
];
