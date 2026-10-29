import { randomUUID } from "node:crypto";
import type { Analysis, Collection, Project } from "./types";
export const demoAnalysis: Analysis = {
  name: "燕麦色人字纹面料",
  colors: [
    { name: "燕麦", hex: "#B7A58E" },
    { name: "暖灰", hex: "#8E8578" },
    { name: "象牙白", hex: "#DDD4C5" },
  ],
  texture: "细密人字纹交织，表面呈现柔和绒感与自然颗粒。",
  pattern: "微型人字纹 · 同色系双色纱线",
  feel: "视觉上柔软、哑光，具有适度挺括感。实际纤维成分、克重和手感需以实物检测为准。",
  suitable: ["西装", "大衣", "夹克", "半裙"],
  notes:
    "这是预设面料档案，用于演示工作流程；未对当前上传图片执行 AI 识别。请按实物修订。",
  source: "demo",
};
const names = [
  "松弛廓形西装",
  "系带长款大衣",
  "结构感马甲套裙",
  "短款立领夹克",
  "柔肩衬衫套装",
  "极简直身连衣裙",
  "层叠针织套装",
  "长线条风衣",
];
const types = [
  "西装",
  "大衣",
  "半裙",
  "夹克",
  "衬衫",
  "连衣裙",
  "针织衫",
  "大衣",
];
const descriptions = [
  "以宽松肩线与双排扣构建从容比例，搭配垂坠阔腿裤，突出面料细腻纹理。",
  "宽幅翻领与自然收腰平衡结构和柔软，长款衣身让人字纹形成连贯的视觉线条。",
  "修身马甲与 A 字长裙形成上下呼应，象牙色内搭为同色系造型增加呼吸感。",
  "利落立领、贴袋与短衣长建立轻盈结构，高腰阔腿裤延续自然松弛的系列语言。",
  "以舒展的肩部线条和宽松比例，演绎日常通勤中的温柔力量。",
  "简洁直身廓形保留面料的自然垂感，以细节比例呈现安静的质感。",
  "以细腻肌理与同色层次营造轻柔包裹感，延续系列的自然色彩。",
  "修长线条与宽幅腰带勾勒从容姿态，适合季节交替时的层次穿搭。",
];
export function demoCollection(p: Project): Collection {
  return {
    title: "静序 · 自然之间",
    subtitle: "THE QUIET FORM",
    concept: `以「${p.config.style}」为设计方向，让织物的天然肌理成为设计的起点。以克制的色彩、舒展的廓形和有秩序的层次，构建一组适合${p.config.season}的${p.config.category}系列。${p.config.brief ? `设计需求：${p.config.brief}` : ""}`,
    inspiration:
      "从光落在石材与织物上的细微变化中汲取灵感，让材质自己说话。演示图片为预置静奢女装案例，不随面料、品类或文字要求改变。",
    keywords: [p.config.style, "自然肌理", "建筑廓形", "同色层次"],
    looks: Array.from({ length: p.config.count }, (_, i) => ({
      id: randomUUID(),
      name: names[i],
      type: types[i],
      description: descriptions[i],
      prompt: "Demo preset look",
      status: "planned",
      revisions: [],
    })),
  };
}
export const demoImage = (i: number) => `/demo/look-${(i % 8) + 1}.jpg`;
