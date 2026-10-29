import { z } from "zod";

export const designSchema = z.object({
  category: z.enum(["女装", "男装", "童装"]),
  types: z
    .array(
      z.enum([
        "西装",
        "大衣",
        "衬衫",
        "连衣裙",
        "针织衫",
        "夹克",
        "半裙",
        "马甲",
      ]),
    )
    .min(1)
    .max(8),
  style: z.enum([
    "静奢风",
    "极简主义",
    "老钱风",
    "法式",
    "新中式",
    "先锋设计",
    "都市商务",
  ]),
  season: z.enum(["春夏", "秋冬"]),
  mode: z.enum(["商业成衣", "创意探索"]),
  count: z.union([z.literal(4), z.literal(6), z.literal(8)]),
  ratio: z.enum(["3:4", "9:16", "16:9"]),
  brief: z.string().max(3000),
});
export type DesignConfig = z.infer<typeof designSchema>;
export const analysisSchema = z.object({
  name: z.string().min(1).max(100),
  colors: z
    .array(
      z.object({
        name: z.string().max(40),
        hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      }),
    )
    .min(1)
    .max(6),
  texture: z.string().min(1).max(500),
  pattern: z.string().max(300),
  feel: z.string().max(500),
  suitable: z.array(z.string().max(30)).min(1).max(8),
  notes: z.string().max(2000),
});
export type Analysis = z.infer<typeof analysisSchema> & {
  source: "demo" | "ai" | "manual";
};
export const planSchema = z.object({
  title: z.string().min(1).max(70),
  subtitle: z.string().max(100),
  concept: z.string().min(1).max(2000),
  inspiration: z.string().max(1200),
  keywords: z.array(z.string().max(35)).min(1).max(8),
  looks: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        type: z.string().max(30),
        description: z.string().min(1).max(700),
        prompt: z.string().min(1).max(2500),
      }),
    )
    .min(4)
    .max(8),
});
export type Look = z.infer<typeof planSchema>["looks"][number] & {
  id: string;
  image?: string;
  status: "planned" | "generating" | "complete" | "failed";
  error?: string;
  revisions: { image: string; instruction: string; at: string }[];
  instruction?: string;
  imageSource?: "demo" | "ai";
};
export type Collection = Omit<z.infer<typeof planSchema>, "looks"> & {
  looks: Look[];
};
export type Asset = {
  id: string;
  name: string;
  url: string;
  originalUrl: string;
  role: "fabric" | "reference";
  mime: string;
  size: number;
};
export type Task = {
  id: string;
  kind: "generate" | "revise";
  mode: "demo" | "live";
  status: "running" | "complete" | "failed" | "cancelled";
  progress: number;
  message: string;
  startedAt: string;
  updatedAt: string;
  error?: string;
  lookId?: string;
};
export type Project = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  assets: Asset[];
  analysis?: Analysis;
  config: DesignConfig;
  collection?: Collection;
  task?: Task;
  generationMode?: "demo" | "live";
  favorite?: boolean;
  generationSnapshot?: {
    config: DesignConfig;
    analysis: Analysis;
    assets: Asset[];
  };
};
export const providerSchema = z.object({
  kind: z.enum(["gemini", "openai", "seedream"]),
  baseUrl: z.string().url().max(500),
  model: z
    .string()
    .min(1)
    .max(150)
    .regex(/^[a-zA-Z0-9._:/-]+$/),
  apiKey: z.string().max(2000).optional(),
});
export const settingsSchema = z.object({
  mode: z.enum(["demo", "live"]),
  text: providerSchema,
  image: providerSchema,
});
export type ProviderConfig = z.infer<typeof providerSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type PublicSettings = Omit<Settings, "text" | "image"> & {
  text: Omit<ProviderConfig, "apiKey"> & { hasKey: boolean };
  image: Omit<ProviderConfig, "apiKey"> & { hasKey: boolean };
};
export const defaultConfig: DesignConfig = {
  category: "女装",
  types: ["西装", "大衣", "夹克", "半裙"],
  style: "静奢风",
  season: "秋冬",
  mode: "商业成衣",
  count: 4,
  ratio: "3:4",
  brief:
    "以自然的燕麦色调和利落廓形，打造兼具松弛感与力量感的都市衣橱。保留面料原有纹理，注重可穿性与系列搭配。",
};
