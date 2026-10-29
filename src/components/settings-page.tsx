"use client";
import { useEffect, useState } from "react";
import {
  Sparkles,
  Cpu,
  ImageIcon,
  ShieldCheck,
  CheckCircle2,
  KeyRound,
  Save,
  Loader2,
  ArrowUpRight,
  Radio,
  FlaskConical,
} from "lucide-react";
import { type PublicSettings, type ProviderConfig } from "@/lib/types";
import { api, Field } from "./studio-app";
const presets = {
  gemini: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    text: "gemini-2.5-flash",
    image: "gemini-2.5-flash-image",
  },
  openai: {
    baseUrl: "https://api.openai.com/v1",
    text: "gpt-4.1",
    image: "gpt-image-1.5",
  },
  seedream: {
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    text: "",
    image: "doubao-seedream-4-0-250828",
  },
};
export function SettingsPage({
  settings,
  onSaved,
  notify,
}: {
  settings: PublicSettings | null;
  onSaved: (s: PublicSettings) => void;
  notify: (s: string, e?: boolean) => void;
}) {
  const [draft, setDraft] = useState<PublicSettings | null>(settings),
    [keys, setKeys] = useState<{ text?: string; image?: string }>({}),
    [busy, setBusy] = useState(""),
    [dirty, setDirty] = useState(false);
  useEffect(() => {
    setDraft(settings);
  }, [settings]);
  if (!draft)
    return (
      <div className="page-state">
        <Loader2 className="spin" />
        正在加载模型设置
      </div>
    );
  const setProvider = (
    target: "text" | "image",
    data: Partial<ProviderConfig>,
  ) => {
    setDraft({ ...draft, [target]: { ...draft[target], ...data } });
    setDirty(true);
  };
  const save = async () => {
    setBusy("save");
    try {
      const result = await api<PublicSettings>("/api/settings", {
        method: "PUT",
        body: JSON.stringify({
          mode: draft.mode,
          text: { ...draft.text, apiKey: keys.text },
          image: { ...draft.image, apiKey: keys.image },
        }),
      });
      onSaved(result);
      setDraft(result);
      setKeys({});
      setDirty(false);
      notify("模型配置已加密保存在服务端");
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setBusy("");
    }
  };
  const test = async (target: "text" | "image") => {
    setBusy(target);
    try {
      const result = await api<{ message: string }>("/api/settings", {
        method: "POST",
        body: JSON.stringify({ target }),
      });
      notify(result.message);
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setBusy("");
    }
  };
  return (
    <div className="content-page settings-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">THE INTELLIGENCE BEHIND YOUR STUDIO</div>
          <h1>模型与设置</h1>
          <p>选择适合你的创作引擎，连接自己的 AI 能力。</p>
        </div>
        <button className="button primary" disabled={!!busy} onClick={save}>
          {busy === "save" ? (
            <Loader2 className="spin" size={16} />
          ) : (
            <Save size={16} />
          )}
          保存配置{dirty && <span className="unsaved-dot" />}
        </button>
      </div>
      <section className="settings-mode">
        <div>
          <span className="eyebrow">WORKSPACE MODE</span>
          <h2>创作模式</h2>
          <p>Demo 可完整体验产品流程；真实生成使用你提供的 API。</p>
        </div>
        <div className="mode-options">
          {[
            {
              v: "demo",
              title: "Demo 演示",
              text: "预置示例 · 无需 API",
              icon: FlaskConical,
            },
            {
              v: "live",
              title: "真实 AI 生成",
              text: "自己的模型 · 自由创作",
              icon: Radio,
            },
          ].map((x) => (
            <button
              key={x.v}
              className={draft.mode === x.v ? "selected" : ""}
              onClick={() => {
                setDraft({ ...draft, mode: x.v as "demo" | "live" });
                setDirty(true);
              }}
            >
              <x.icon size={19} />
              <div>
                <strong>{x.title}</strong>
                <span>{x.text}</span>
              </div>
              {draft.mode === x.v && <CheckCircle2 size={16} />}
            </button>
          ))}
        </div>
      </section>
      <div className="provider-grid">
        {(["text", "image"] as const).map((target, index) => (
          <section className="provider-card" key={target}>
            <div className="provider-title">
              <span className="provider-icon">
                {target === "text" ? (
                  <Cpu size={23} />
                ) : (
                  <ImageIcon size={23} />
                )}
              </span>
              <div>
                <span className="eyebrow">
                  0{index + 1} /{" "}
                  {target === "text" ? "VISION & LANGUAGE" : "IMAGE GENERATION"}
                </span>
                <h2>{target === "text" ? "视觉与文本模型" : "图像生成模型"}</h2>
              </div>
              <span
                className={`connection-tag ${draft[target].hasKey ? "configured" : ""}`}
              >
                {draft[target].hasKey ? "已保存密钥" : "未配置"}
              </span>
            </div>
            <p className="provider-description">
              {target === "text"
                ? "用于面料视觉理解、系列理念与款式规划。请选择支持图片输入的多模态模型。"
                : "用于参考图生图、系列一致性与原图编辑。使用支持多参考图的图像模型。"}
            </p>
            <Field label="Provider 协议">
              <select
                aria-label={`${target} Provider`}
                value={draft[target].kind}
                onChange={(e) => {
                  const kind = e.target.value as ProviderConfig["kind"];
                  setProvider(target, {
                    kind,
                    baseUrl: presets[kind].baseUrl,
                    model: presets[kind][target],
                  });
                }}
              >
                <option value="gemini">Google Gemini · 原生接口</option>
                <option value="openai">OpenAI 兼容接口</option>
                {target === "image" && (
                  <option value="seedream">火山方舟 Seedream</option>
                )}
              </select>
            </Field>
            <Field label="Base URL">
              <input
                aria-label={`${target} Base URL`}
                value={draft[target].baseUrl}
                onChange={(e) =>
                  setProvider(target, { baseUrl: e.target.value })
                }
                spellCheck={false}
              />
            </Field>
            <Field label="模型名称 / Model ID">
              <input
                aria-label={`${target} 模型名称`}
                value={draft[target].model}
                onChange={(e) => setProvider(target, { model: e.target.value })}
                spellCheck={false}
              />
            </Field>
            <Field
              label="API Key"
              hint={
                draft[target].hasKey
                  ? "已加密保存 · 留空保留"
                  : "仅发送到本应用服务端"
              }
            >
              <div className="key-input">
                <KeyRound size={16} />
                <input
                  aria-label={`${target} API Key`}
                  type="password"
                  autoComplete="new-password"
                  value={keys[target] ?? ""}
                  placeholder={
                    draft[target].hasKey
                      ? "已安全保存，输入可替换"
                      : "输入 API Key"
                  }
                  onChange={(e) => {
                    setKeys({ ...keys, [target]: e.target.value || undefined });
                    setDirty(true);
                  }}
                />
              </div>
            </Field>
            <div className="provider-footer">
              <button
                className="button small"
                disabled={!!busy || dirty || !draft[target].hasKey}
                onClick={() => test(target)}
              >
                {busy === target ? (
                  <Loader2 size={14} className="spin" />
                ) : (
                  <Radio size={14} />
                )}
                测试连接
              </button>
              <button
                className="text-button"
                disabled={!draft[target].hasKey || !!busy}
                onClick={() => {
                  setKeys({ ...keys, [target]: "" });
                  setDraft({
                    ...draft,
                    mode: "demo",
                    [target]: { ...draft[target], hasKey: false },
                  });
                  setDirty(true);
                }}
              >
                清除密钥
              </button>
            </div>
            {dirty && (
              <p className="field-help">保存后可测试连接。测试不会生成图像。</p>
            )}
          </section>
        ))}
      </div>
      <div className="settings-bottom-grid">
        <section className="security-note">
          <ShieldCheck size={22} />
          <div>
            <h3>密钥留在服务端</h3>
            <p>
              API Key
              经加密保存，不回传浏览器、不写入日志或前端存储。原始素材仅在执行真实
              AI 任务时发送给所选服务商。
            </p>
          </div>
        </section>
        <section className="capability-note">
          <h3>关于模型能力</h3>
          <p>
            面料精确还原与局部编辑效果取决于模型。OpenAI 兼容图像接口需支持
            /images/edits
            与多图输入，其输出尺寸可能与所选比例略有差异。示例模型名称可按账户实际可用模型修改。
          </p>
          <div>
            <a
              href="https://ai.google.dev/gemini-api/docs/generate-content/image-generation"
              target="_blank"
              rel="noreferrer"
            >
              Gemini 文档
              <ArrowUpRight size={13} />
            </a>
            <a
              href="https://www.volcengine.com/docs/82379/1541523"
              target="_blank"
              rel="noreferrer"
            >
              Seedream 文档
              <ArrowUpRight size={13} />
            </a>
          </div>
        </section>
      </div>
      <p className="settings-storage-note">
        此版本为独立工作室 MVP。项目按浏览器工作空间隔离，清除浏览器 Cookie
        后无法访问原工作空间；服务端数据仍会保留。跨设备账户、团队权限与云同步尚未接入。
      </p>
    </div>
  );
}
