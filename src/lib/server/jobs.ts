import { randomUUID } from "node:crypto";
import type { Project, Settings, Task } from "../types";
import { demoCollection, demoImage } from "../demo";
import { mutateProject, readProject } from "./store";
import { generateImage, plan } from "./providers";
const runtime = globalThis as typeof globalThis & { fabricJobs?: Set<string> };
runtime.fabricJobs ||= new Set();
export async function recoverProject(w: string, id: string) {
  const p = await readProject(w, id);
  if (
    p.task?.status === "running" &&
    !runtime.fabricJobs!.has(p.task.id) &&
    Date.now() - Date.parse(p.task.updatedAt) > 20000
  ) {
    return mutateProject(w, id, (p) => {
      if (p.task?.status === "running" && !runtime.fabricJobs!.has(p.task.id)) {
        p.task.status = "failed";
        p.task.error = "任务因服务重启而中断，可保留已完成款式并重试";
        p.task.message = p.task.error;
        p.collection?.looks.forEach((l) => {
          if (l.status === "generating") l.status = "failed";
        });
      }
    });
  }
  return p;
}
export async function startTask(
  w: string,
  id: string,
  settings: Settings,
  lookId?: string,
  instruction?: string,
  retry = false,
) {
  const task: Task = {
    id: randomUUID(),
    kind: lookId ? "revise" : "generate",
    mode: settings.mode,
    status: "running",
    progress: 2,
    message: lookId ? "正在准备款式调整" : "正在构思系列主题",
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lookId,
  };
  const p = await mutateProject(w, id, (p) => {
    if (p.task?.status === "running") throw new Error("当前项目已有生成任务");
    if (!p.assets.some((x) => x.role === "fabric") || !p.analysis)
      throw new Error("请先上传并分析面料");
    if (lookId && !p.collection?.looks.some((l) => l.id === lookId))
      throw new Error("款式不存在");
    if (lookId && p.generationMode !== settings.mode)
      throw new Error("此系列的生成模式与当前设置不同，请切换模式或创建新系列");
    if (retry && p.generationMode && p.generationMode !== settings.mode)
      throw new Error("请先恢复此系列原有生成模式后重试");
    if (
      settings.mode === "live" &&
      (!settings.text.apiKey || !settings.image.apiKey)
    )
      throw new Error("请先完整配置文本和图像 API Key");
    p.task = task;
    if (!lookId && !retry) {
      p.collection = undefined;
      p.generationMode = settings.mode;
      p.generationSnapshot = {
        config: structuredClone(p.config),
        analysis: structuredClone(p.analysis),
        assets: structuredClone(p.assets),
      };
    }
  });
  runtime.fabricJobs!.add(task.id);
  return {
    project: p,
    run: () => run(w, id, task, settings, lookId, instruction, retry),
  };
}
async function run(
  w: string,
  id: string,
  task: Task,
  settings: Settings,
  lookId?: string,
  instruction?: string,
  retry = false,
) {
  const update = async (fn: (p: Project) => void) =>
    mutateProject(w, id, (p) => {
      if (p.task?.id !== task.id || p.task.status !== "running")
        throw new Error("任务已停止");
      fn(p);
      p.task.updatedAt = new Date().toISOString();
    });
  try {
    let p = await readProject(w, id);
    if (!lookId && (!retry || !p.collection)) {
      const collection =
        settings.mode === "demo"
          ? demoCollection(p)
          : await plan(w, p, settings.text);
      p = await update((p) => {
        p.collection = collection;
        p.name = collection.title;
        p.generationMode = settings.mode;
        p.task!.progress = 12;
        p.task!.message = "系列方案就绪，正在生成成衣效果图";
      });
    }
    const targets = p.collection!.looks.filter((l) =>
      lookId ? l.id === lookId : retry ? l.status !== "complete" : true,
    );
    for (let index = 0; index < targets.length; index++) {
      const target = targets[index];
      p = await update((p) => {
        const look = p.collection!.looks.find((x) => x.id === target.id)!;
        look.status = "generating";
        look.error = undefined;
        p.task!.progress = 12 + Math.round((index / targets.length) * 83);
        p.task!.message = `${lookId ? "正在调整" : "正在生成"} ${String(p.collection!.looks.indexOf(look) + 1).padStart(2, "0")} / ${p.collection!.looks.length} · ${look.name}`;
      });
      try {
        let image: string;
        if (settings.mode === "demo") {
          await new Promise((r) => setTimeout(r, 650));
          image = demoImage(
            p.collection!.looks.findIndex((l) => l.id === target.id),
          );
        } else {
          image = await generateImage(
            w,
            { ...p, ...(p.generationSnapshot || {}) },
            target,
            settings.image,
            instruction,
          );
        }
        p = await update((p) => {
          const look = p.collection!.looks.find((x) => x.id === target.id)!;
          if (look.image)
            look.revisions.push({
              image: look.image,
              instruction: look.instruction || "原始版本",
              at: new Date().toISOString(),
            });
          look.image = image;
          look.imageSource = settings.mode === "demo" ? "demo" : "ai";
          look.status = "complete";
          look.instruction = instruction;
          if (instruction && settings.mode === "live")
            look.description = `${look.description.split("\n调整要求：")[0]}\n调整要求：${instruction}`;
        });
      } catch (e) {
        if ((e as Error).message === "任务已停止") throw e;
        await update((p) => {
          const look = p.collection!.looks.find((x) => x.id === target.id)!;
          look.status = "failed";
          look.error = (e as Error).message;
        });
      }
    }
    await update((p) => {
      const failed = p.collection!.looks.filter(
        (l) => l.status === "failed",
      ).length;
      p.task!.status = failed ? "failed" : "complete";
      p.task!.progress = 100;
      p.task!.message = failed
        ? `${failed} 款生成失败，已完成的款式已保存`
        : settings.mode === "demo"
          ? "演示系列已就绪 · 预置图片不会因修改要求改变"
          : "系列设计已完成";
      if (failed) p.task!.error = "可单独重试失败款式，或重试所有未完成款式";
    });
  } catch (e) {
    await mutateProject(w, id, (p) => {
      if (p.task?.id === task.id && p.task.status === "running") {
        p.task.status = "failed";
        p.task.error = (e as Error).message;
        p.task.message = p.task.error;
      }
    });
  } finally {
    runtime.fabricJobs!.delete(task.id);
  }
}
