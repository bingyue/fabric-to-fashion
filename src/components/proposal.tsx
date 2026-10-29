"use client";
import Link from "next/link";
import { ArrowLeft, Download, Loader2, ArrowUpRight } from "lucide-react";
import type { Project } from "@/lib/types";
export function Proposal({
  project: p,
  onExport,
  busy,
}: {
  project: Project;
  onExport: () => void;
  busy: boolean;
}) {
  const c = p.collection,
    s = p.generationSnapshot || p;
  if (!c)
    return (
      <div className="empty-state">
        <h2>先创作一个系列，再让提案成形。</h2>
        <Link className="button primary" href={`/studio/${p.id}`}>
          返回工作台
          <ArrowUpRight size={16} />
        </Link>
      </div>
    );
  const looks = c.looks.filter((l) => l.image);
  return (
    <div className="proposal-page">
      <div className="proposal-toolbar">
        <Link className="text-button" href={`/studio/${p.id}`}>
          <ArrowLeft size={16} />
          返回设计工作台
        </Link>
        <span>系列设计提案 · {looks.length} LOOKS</span>
        <button
          className="button primary"
          disabled={busy || !looks.length || p.task?.status === "running"}
          onClick={onExport}
        >
          {busy ? (
            <Loader2 size={16} className="spin" />
          ) : (
            <Download size={16} />
          )}
          导出 PDF 提案
        </button>
      </div>
      <article className="proposal-document">
        <header className="proposal-cover">
          <div className="proposal-cover-copy">
            <span className="proposal-wordmark">FABRIQ®</span>
            <div>
              <span className="eyebrow">{c.subtitle}</span>
              <h1>{c.title}</h1>
              <p>
                {s.config.category} / {s.config.season} / {s.config.style}
              </p>
              <span className="proposal-edition">
                COLLECTION PROPOSAL
                <br />
                {new Date(p.createdAt).toLocaleDateString("zh-CN")}
              </span>
            </div>
            <span className="proposal-source">
              {p.generationMode === "demo"
                ? "DEMO · 预置 AI 设计示例"
                : "AI ASSISTED DESIGN · 人工复核后使用"}
            </span>
          </div>
          {looks[0] && <img src={looks[0].image} alt={looks[0].name} />}
        </header>
        <section className="proposal-section">
          <span className="eyebrow">01 / THE CONCEPT</span>
          <div className="proposal-concept">
            <h2>
              让材质，
              <br />
              成为设计的语言。
            </h2>
            <div>
              <h3>系列设计理念</h3>
              <p>{c.concept}</p>
              <div className="tag-row">
                {c.keywords.map((k) => (
                  <span key={k}>{k}</span>
                ))}
              </div>
              <h3>灵感来源</h3>
              <p>{c.inspiration}</p>
            </div>
          </div>
        </section>
        <section className="proposal-section">
          <span className="eyebrow">02 / THE MATERIAL</span>
          <div className="proposal-material">
            <div className="material-photos">
              {s.assets
                .filter((a) => a.role === "fabric")
                .map((a) => (
                  <img src={a.url} alt={a.name} key={a.id} />
                ))}
            </div>
            <div>
              <h2>{s.analysis?.name}</h2>
              <div className="color-row">
                {s.analysis?.colors.map((color) => (
                  <span key={color.hex}>
                    <i style={{ background: color.hex }} />
                    {color.name}
                  </span>
                ))}
              </div>
              <p>{s.analysis?.texture}</p>
              <p>{s.analysis?.pattern}</p>
              <p>{s.analysis?.feel}</p>
              <p className="muted">{s.analysis?.notes}</p>
              <small>
                {s.analysis?.source === "demo"
                  ? "面料档案来源：预设演示分析"
                  : s.analysis?.source === "manual"
                    ? "面料档案来源：人工修订"
                    : "面料档案来源：AI 视觉分析"}
              </small>
            </div>
          </div>
        </section>
        <section className="proposal-section">
          <span className="eyebrow">03 / THE COLLECTION</span>
          <h2>系列款式</h2>
          <div className="proposal-looks">
            {c.looks.map((l, i) => (
              <div key={l.id}>
                {l.image ? (
                  <img src={l.image} alt={l.name} />
                ) : (
                  <div className="proposal-missing">此款尚未生成完成</div>
                )}
                <span className="eyebrow">
                  LOOK {String(i + 1).padStart(2, "0")} / {l.type}
                </span>
                <h3>{l.name}</h3>
                <p>{l.description}</p>
                {l.status === "failed" && (
                  <small>此款最新生成失败；图片如有展示则为上一版本。</small>
                )}
              </div>
            ))}
          </div>
        </section>
        <section className="proposal-section lineup-section">
          <span className="eyebrow">04 / THE LINEUP</span>
          <h2>一组完整的设计语言</h2>
          <div className="proposal-lineup">
            {looks.map((l, i) => (
              <div key={l.id}>
                <img src={l.image} alt={l.name} />
                <span>LOOK {String(i + 1).padStart(2, "0")}</span>
              </div>
            ))}
          </div>
        </section>
        <footer className="proposal-end">
          <span>
            FABRIQ®<small>FROM FABRIC TO FASHION</small>
          </span>
          <p>
            {p.generationMode === "demo"
              ? "本提案包含预置演示图片，并非根据上传素材实时生成。"
              : "本提案为 AI 辅助生成的视觉设计方案。"}
            <br />
            面料还原、色差、服装结构与工艺可实现性需以实物及专业打样验证。
          </p>
        </footer>
      </article>
    </div>
  );
}
