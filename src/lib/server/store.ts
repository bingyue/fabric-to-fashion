import fs from "node:fs/promises";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  randomUUID,
} from "node:crypto";
import { cookies } from "next/headers";
import {
  defaultConfig,
  type Project,
  type Settings,
  type PublicSettings,
} from "../types";

export const dataRoot = path.resolve(
  /*turbopackIgnore: true*/ process.env.FABRIC_DATA_DIR || ".data",
);
export function validId(id: string) {
  if (!/^[a-f0-9-]{32,64}$/.test(id)) throw new Error("无效的资源标识");
  return id;
}
export async function workspace() {
  const jar = await cookies();
  let id = jar.get("fabric_workspace")?.value;
  if (!id || !/^[a-f0-9]{48}$/.test(id)) {
    id = randomBytes(24).toString("hex");
    jar.set("fabric_workspace", id, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.COOKIE_SECURE === "true",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  await fs.mkdir(path.join(/*turbopackIgnore: true*/ dataRoot, id), {
    recursive: true,
    mode: 0o700,
  });
  return id;
}
export const workspacePath = (w: string) =>
  path.join(/*turbopackIgnore: true*/ dataRoot, validId(w));
export const projectPath = (w: string, id: string) =>
  path.join(workspacePath(w), `${validId(id)}.json`);
const state = globalThis as typeof globalThis & {
  fabricLocks?: Map<string, Promise<unknown>>;
};
state.fabricLocks ||= new Map();
export async function locked<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const previous = state.fabricLocks!.get(key) || Promise.resolve();
  const current = previous.catch(() => {}).then(fn);
  state.fabricLocks!.set(key, current);
  try {
    return await current;
  } finally {
    if (state.fabricLocks!.get(key) === current) state.fabricLocks!.delete(key);
  }
}
async function atomic(file: string, value: unknown) {
  await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const temp = `${file}.${randomUUID()}.tmp`;
  await fs.writeFile(temp, JSON.stringify(value, null, 2), { mode: 0o600 });
  await fs.rename(temp, file);
}
export async function readProject(w: string, id: string): Promise<Project> {
  try {
    return JSON.parse(await fs.readFile(projectPath(w, id), "utf8"));
  } catch {
    throw new Error("项目不存在或无权访问");
  }
}
export async function saveProject(w: string, p: Project) {
  p.updatedAt = new Date().toISOString();
  await atomic(projectPath(w, p.id), p);
  return p;
}
export async function mutateProject(
  w: string,
  id: string,
  fn: (p: Project) => void | Promise<void>,
) {
  return locked(projectPath(w, id), async () => {
    const p = await readProject(w, id);
    await fn(p);
    return saveProject(w, p);
  });
}
export async function createProject(w: string) {
  const now = new Date().toISOString();
  const p: Project = {
    id: randomUUID(),
    name: "未命名系列",
    createdAt: now,
    updatedAt: now,
    assets: [],
    config: structuredClone(defaultConfig),
  };
  return saveProject(w, p);
}
export async function listProjects(w: string) {
  const files = (
    await fs.readdir(/*turbopackIgnore: true*/ workspacePath(w))
  ).filter((n) => /^[a-f0-9-]+\.json$/.test(n));
  const projects = await Promise.all(
    files.map((n) =>
      fs
        .readFile(
          /*turbopackIgnore: true*/ path.join(
            /*turbopackIgnore: true*/ workspacePath(w),
            n,
          ),
          "utf8",
        )
        .then((x) => JSON.parse(x) as Project),
    ),
  );
  return projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export async function deleteProject(w: string, id: string) {
  await locked(projectPath(w, id), async () => {
    const p = await readProject(w, id);
    if (p.task?.status === "running")
      throw new Error("请等待当前任务完成后删除项目");
    await fs.unlink(projectPath(w, id));
    await fs.rm(path.join(workspacePath(w), "assets", id), {
      recursive: true,
      force: true,
    });
  });
}
function encryptionKey() {
  mkdirSync(dataRoot, { recursive: true, mode: 0o700 });
  const env = process.env.FABRIC_ENCRYPTION_KEY;
  if (env) {
    if (!/^[a-f0-9]{64}$/i.test(env))
      throw new Error("FABRIC_ENCRYPTION_KEY 必须为 64 位十六进制字符串");
    return Buffer.from(env, "hex");
  }
  const file = path.join(dataRoot, ".encryption-key");
  if (!existsSync(file)) {
    try {
      writeFileSync(file, randomBytes(32), { mode: 0o600, flag: "wx" });
    } catch (e) {
      if (!existsSync(file)) throw e;
    }
  }
  return readFileSync(file);
}
export function encrypt(text: string) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  return Buffer.concat([
    iv,
    cipher.update(text),
    cipher.final(),
    cipher.getAuthTag(),
  ]).toString("base64");
}
export function decrypt(text: string) {
  const b = Buffer.from(text, "base64"),
    cipher = createDecipheriv(
      "aes-256-gcm",
      encryptionKey(),
      b.subarray(0, 12),
    );
  cipher.setAuthTag(b.subarray(-16));
  return Buffer.concat([
    cipher.update(b.subarray(12, -16)),
    cipher.final(),
  ]).toString();
}
export const defaultSettings: Settings = {
  mode: "demo",
  text: {
    kind: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    model: "gemini-2.5-flash",
  },
  image: {
    kind: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    model: "gemini-2.5-flash-image",
  },
};
export async function getSettings(w: string): Promise<Settings> {
  try {
    const saved = JSON.parse(
      await fs.readFile(path.join(workspacePath(w), "settings.secure"), "utf8"),
    );
    return {
      ...saved,
      text: {
        ...saved.text,
        apiKey: saved.text.apiKey ? decrypt(saved.text.apiKey) : undefined,
      },
      image: {
        ...saved.image,
        apiKey: saved.image.apiKey ? decrypt(saved.image.apiKey) : undefined,
      },
    };
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT")
      return structuredClone(defaultSettings);
    throw new Error("无法读取加密配置，请检查服务端主密钥");
  }
}
export function publicSettings(s: Settings): PublicSettings {
  return {
    mode: s.mode,
    text: {
      kind: s.text.kind,
      baseUrl: s.text.baseUrl,
      model: s.text.model,
      hasKey: !!s.text.apiKey,
    },
    image: {
      kind: s.image.kind,
      baseUrl: s.image.baseUrl,
      model: s.image.model,
      hasKey: !!s.image.apiKey,
    },
  };
}
export async function saveSettings(w: string, s: Settings) {
  return locked(`${w}:settings`, async () => {
    const old = await getSettings(w);
    for (const k of ["text", "image"] as const) {
      if (s[k].apiKey === undefined) s[k].apiKey = old[k].apiKey;
    }
    if (s.mode === "live" && (!s.text.apiKey || !s.image.apiKey))
      throw new Error("启用真实生成前，请分别填写文本与图像 API Key");
    await atomic(path.join(workspacePath(w), "settings.secure"), {
      ...s,
      text: {
        ...s.text,
        apiKey: s.text.apiKey ? encrypt(s.text.apiKey) : undefined,
      },
      image: {
        ...s.image,
        apiKey: s.image.apiKey ? encrypt(s.image.apiKey) : undefined,
      },
    });
    return publicSettings(s);
  });
}
export async function writeAsset(
  w: string,
  projectId: string,
  buffer: Buffer,
  ext = "jpg",
) {
  const filename = `${randomUUID()}.${ext}`;
  const dir = path.join(workspacePath(w), "assets", validId(projectId));
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  await fs.writeFile(path.join(dir, filename), buffer, { mode: 0o600 });
  return `/api/assets/${projectId}/${filename}`;
}
export function assetPath(w: string, url: string) {
  if (/^\/demo\/(look-[1-8]\.jpg|fabric\.jpg)$/.test(url))
    return path.join(process.cwd(), "public", url);
  const match = url.match(
    /^\/api\/assets\/([a-f0-9-]{36})\/([a-f0-9-]{36}\.(?:jpg|png|webp))$/,
  );
  if (!match) throw new Error("无效的素材路径");
  return path.join(workspacePath(w), "assets", match[1], match[2]);
}
export async function assetBuffer(w: string, url: string) {
  return fs.readFile(assetPath(w, url));
}
