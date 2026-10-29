"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  LayoutDashboard,
  SlidersHorizontal,
  FolderOpen,
  Settings2,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Upload,
  X,
  Check,
  Loader2,
  Download,
  Maximize2,
  RefreshCw,
  Grid2X2,
  Columns2,
  FileText,
  ImagePlus,
  Layers3,
  WandSparkles,
  CircleHelp,
  MoreHorizontal,
  Search,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Save,
  ShieldCheck,
  Menu,
  Star,
  Pencil,
  ZoomIn,
  Eye,
  ExternalLink,
} from "lucide-react";
import {
  defaultConfig,
  type Analysis,
  type Project,
  type DesignConfig,
  type PublicSettings,
  type Look,
} from "@/lib/types";
import { SettingsPage } from "./settings-page";
import { Proposal } from "./proposal";

export async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options?.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options?.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "请求失败");
  return data;
}
const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
export function StudioApp() {
  const router = useRouter(),
    pathname = usePathname();
  const [projects, setProjects] = useState<Project[]>([]),
    [settings, setSettings] = useState<PublicSettings | null>(null),
    [project, setProject] = useState<Project | null>(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(""),
    [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(
      null,
    ),
    [help, setHelp] = useState(false),
    [mobileNav, setMobileNav] = useState(false),
    [loadError, setLoadError] = useState("");
  const id = pathname.split("/")[2],
    view = pathname.startsWith("/studio")
      ? "studio"
      : pathname.startsWith("/projects")
        ? "projects"
        : pathname.startsWith("/settings")
          ? "settings"
          : pathname.startsWith("/proposal")
            ? "proposal"
            : pathname === "/"
              ? "home"
              : "notfound";
  const notify = useCallback(
    (text: string, error = false) => setNotice({ text, error }),
    [],
  );
  const refresh = useCallback(async () => {
    const p = await api<Project[]>("/api/projects");
    const s = await api<PublicSettings>("/api/settings");
    setProjects(p);
    setSettings(s);
  }, []);
  useEffect(() => {
    refresh()
      .catch((e) => notify(e.message, true))
      .finally(() => setLoading(false));
  }, [refresh, notify]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    setMobileNav(false);
    setLoadError("");
    if ((view === "studio" || view === "proposal") && id) {
      setProject(null);
      api<Project>(`/api/projects/${id}`)
        .then(setProject)
        .catch((e) => setLoadError(e.message));
    }
  }, [view, id]);
  useEffect(() => {
    if (!project || project.task?.status !== "running") return;
    let active = true;
    const timer = setInterval(
      () =>
        api<Project>(`/api/projects/${project.id}`)
          .then((p) => {
            if (active) {
              setProject(p);
              if (p.task?.status !== "running") {
                refresh();
                notify(
                  p.task?.message || "任务已完成",
                  p.task?.status === "failed",
                );
              }
            }
          })
          .catch((e) => {
            if (active) notify(e.message, true);
          }),
      1200,
    );
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [project?.id, project?.task?.status, refresh, notify]);
  const act = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    try {
      await fn();
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setBusy("");
    }
  };
  const create = () =>
    act("create", async () => {
      const p = await api<Project>("/api/projects", { method: "POST" });
      setProjects((prev) => [p, ...prev]);
      router.push(`/studio/${p.id}`);
    });
  const update = async (data: unknown) => {
    if (!project) throw new Error("项目尚未加载");
    const p = await api<Project>(`/api/projects/${project.id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    setProject(p);
    setProjects((prev) => prev.map((x) => (x.id === p.id ? p : x)));
    return p;
  };
  const exportFile = (kind: "pdf" | "zip") =>
    act(kind, async () => {
      if (!project) return;
      const res = await fetch(
        `/api/projects/${project.id}/export?format=${kind}`,
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.name}.${kind}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      notify(`${kind === "pdf" ? "设计提案" : "系列图片"}已下载`);
    });
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
        <Link className="brand" href="/">
          <span className="brand-mark">
            <i />
            <i />
          </span>
          FABRIQ<span className="brand-period">®</span>
        </Link>
        <div className="brand-caption">FABRIC TO FASHION</div>
        <button
          className="button primary sidebar-create"
          onClick={create}
          disabled={busy === "create"}
        >
          <Plus size={16} />
          新建设计项目
          <ArrowUpRight size={15} />
        </button>
        <div className="nav-label">
          工作空间 <span>WORKSPACE</span>
        </div>
        <nav>
          {[
            {
              href: "/",
              label: "创作概览",
              icon: LayoutDashboard,
              key: "home",
            },
            {
              href: projects[0] ? `/studio/${projects[0].id}` : "#",
              label: "设计工作台",
              icon: SlidersHorizontal,
              key: "studio",
            },
            {
              href: "/projects",
              label: "我的项目",
              icon: FolderOpen,
              key: "projects",
            },
          ].map((n) => (
            <Link
              key={n.key}
              className={`nav-item ${view === n.key ? "active" : ""}`}
              href={n.href}
              onClick={(e) => {
                if (n.href === "#") {
                  e.preventDefault();
                  create();
                }
              }}
            >
              <n.icon size={18} />
              <span>{n.label}</span>
              {n.key === "projects" ? (
                <em>{projects.length.toString().padStart(2, "0")}</em>
              ) : view === n.key ? (
                <span className="nav-dot" />
              ) : null}
            </Link>
          ))}
        </nav>
        <div className="sidebar-feature">
          <span className="tiny-label">YOUR NEXT COLLECTION</span>
          <Layers3 size={27} strokeWidth={1} />
          <p>
            每一块面料，
            <br />
            都有未被发现的可能。
          </p>
          <span className="muted">从材质出发，让灵感成形。</span>
        </div>
        <div className="sidebar-bottom">
          <Link
            className={`nav-item ${view === "settings" ? "active" : ""}`}
            href="/settings"
          >
            <Settings2 size={17} />
            模型与设置
          </Link>
          <button className="nav-item" onClick={() => setHelp(true)}>
            <CircleHelp size={17} />
            使用指南
            <ArrowUpRight size={13} />
          </button>
          <div className="studio-profile">
            <span className="profile-avatar">F</span>
            <div>
              我的设计工作室<small>Personal workspace</small>
            </div>
            <span className="status-dot" />
          </div>
        </div>
      </aside>
      {mobileNav && (
        <button
          aria-label="关闭导航"
          className="nav-backdrop"
          onClick={() => setMobileNav(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-toggle"
              onClick={() => setMobileNav(!mobileNav)}
              aria-label="打开导航"
            >
              <Menu size={20} />
            </button>
            <span>设计工作室</span>
            <ChevronRight size={13} />
            <strong>
              {
                {
                  home: "创作概览",
                  studio: "设计工作台",
                  projects: "我的项目",
                  settings: "模型与设置",
                  proposal: "系列设计提案",
                  notfound: "页面不存在",
                }[view]
              }
            </strong>
          </div>
          <div className="topbar-right">
            <Link className="mode-badge" href="/settings">
              <span
                className={`status-dot ${settings?.mode === "live" ? "live" : ""}`}
              />
              {settings?.mode === "live"
                ? "LIVE · 真实生成"
                : "DEMO · 演示模式"}
            </Link>
            <span className="top-separator" />
            <span className="top-avatar">F</span>
          </div>
        </header>
        <main>
          {view === "home" ? (
            <Home
              projects={projects}
              create={create}
              busy={busy === "create"}
            />
          ) : view === "projects" ? (
            <Projects
              projects={projects}
              create={create}
              refresh={refresh}
              notify={notify}
            />
          ) : view === "settings" ? (
            <SettingsPage
              settings={settings}
              onSaved={setSettings}
              notify={notify}
            />
          ) : view === "notfound" ? (
            <div className="page-state">
              <h1>此页尚未织成。</h1>
              <Link className="button primary" href="/">
                返回创作概览
              </Link>
            </div>
          ) : !id ? (
            <div className="empty-state">
              <Layers3 size={38} strokeWidth={1} />
              <h2>为下一个系列，建立一份设计档案。</h2>
              <button className="button primary" onClick={create}>
                新建设计项目
                <Plus size={16} />
              </button>
              <Link className="text-button" href="/projects">
                继续已有项目
                <ArrowRight size={15} />
              </Link>
            </div>
          ) : loadError ? (
            <div className="page-state">
              <AlertCircle />
              <h2>{loadError}</h2>
              <Link href="/projects" className="button">
                返回项目
              </Link>
            </div>
          ) : !project ? (
            <div className="page-state">
              <Loader2 className="spin" />
              <p>正在打开设计档案…</p>
            </div>
          ) : view === "proposal" ? (
            <Proposal
              project={project}
              onExport={() => exportFile("pdf")}
              busy={busy === "pdf"}
            />
          ) : (
            <Workbench
              key={project.id}
              project={project}
              settings={settings}
              setProject={setProject}
              update={update}
              busy={busy}
              act={act}
              notify={notify}
              exportFile={exportFile}
            />
          )}
        </main>
        {view === "home" && (
          <footer className="site-footer">
            <span>FABRIQ® — CRAFTED FROM POSSIBILITY.</span>
            <span>AI 辅助创意，设计由你定义。</span>
          </footer>
        )}
      </div>
      {notice && (
        <div
          className={`toast ${notice.error ? "error" : ""}`}
          role={notice.error ? "alert" : "status"}
        >
          {notice.error ? (
            <AlertCircle size={19} />
          ) : (
            <CheckCircle2 size={19} />
          )}
          <span>{notice.text}</span>
          <button aria-label="关闭提示" onClick={() => setNotice(null)}>
            <X size={15} />
          </button>
        </div>
      )}
      {help && (
        <Modal title="从面料到系列，只需四步" onClose={() => setHelp(false)}>
          <div className="help-body">
            {[
              "新建项目，上传面料或使用示例面料；可额外添加款式参考图。",
              "分析面料，按实物修订颜色、纹理和材质描述。",
              "选择品类、风格、季节与款式数量，生成完整系列。",
              "放大查看款式、提出修改要求，导出图片和设计提案。",
            ].map((x, i) => (
              <p key={x}>
                <span className="step-number">0{i + 1}</span>
                {x}
              </p>
            ))}
            <div className="info-note">
              Demo
              模式使用预置分析与成衣图片，图片不随输入变化。真实生成需在「模型与设置」配置
              API。面料还原、局部修改和物理性能判断均需设计师复核。
            </div>
          </div>
        </Modal>
      )}
      {loading && (
        <span className="sr-only" role="status">
          正在加载工作空间
        </span>
      )}
    </div>
  );
}
function Home({
  projects,
  create,
  busy,
}: {
  projects: Project[];
  create: () => void;
  busy: boolean;
}) {
  return (
    <div className="home-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">THE DESIGNER'S WORKSPACE</div>
          <h1>创作，从一块面料开始。</h1>
          <p>把材质的可能，织入下一个系列。</p>
        </div>
        <span className="edition">
          FABRIQ STUDIO <i /> VOL. 001
        </span>
      </div>
      <section className="hero">
        <div className="hero-copy">
          <div className="hero-kicker">
            <span className="gold-line" />
            FROM TEXTURE TO SILHOUETTE
          </div>
          <h2>
            让一块面料，
            <br />
            成为一个<span>系列。</span>
          </h2>
          <p>
            以面料为灵感原点，让 AI 与你的设计直觉协作。
            <br />
            从纹理识别、款式探索，到完整成衣提案。
          </p>
          <button
            className="button primary hero-cta"
            onClick={create}
            disabled={busy}
          >
            开启我的创作
            <ArrowUpRight size={18} />
          </button>
          <div className="hero-footnote">
            <span className="micro-stack">
              <img src="/demo/fabric.jpg" alt="人字纹面料" />
              <img src="/demo/look-1.jpg" alt="成衣示例" />
            </span>
            <span>一块面料 · 无限设计可能</span>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-photo first">
            <img src="/demo/look-1.jpg" alt="燕麦色人字纹廓形西装成衣示例" />
            <span>LOOK 01 / TAILORING</span>
          </div>
          <div className="hero-photo second">
            <img src="/demo/look-2.jpg" alt="燕麦色系带长大衣成衣示例" />
            <span>LOOK 02 / OUTERWEAR</span>
          </div>
          <div className="fabric-floating">
            <img src="/demo/fabric.jpg" alt="原始面料特写" />
            <div>
              <span>THE ORIGIN</span>
              <p>燕麦色 · 人字纹</p>
              <small>面料灵感 → 系列设计</small>
            </div>
            <ArrowUpRight size={17} />
          </div>
          <span className="hero-demo">预置 AI 设计示例</span>
        </div>
      </section>
      <section className="process-strip">
        {[
          {
            n: "01",
            title: "解读面料",
            text: "让颜色、纹理与质感，成为设计线索",
            icon: Layers3,
          },
          {
            n: "02",
            title: "定义设计",
            text: "选择风格与廓形，表达你的创作意图",
            icon: SlidersHorizontal,
          },
          {
            n: "03",
            title: "呈现系列",
            text: "从成衣效果到提案，完整呈现设计",
            icon: WandSparkles,
          },
        ].map((x, i) => (
          <div className="process-item" key={x.n}>
            <span className="process-number">{x.n}</span>
            <div>
              <h3>
                {x.title}
                <x.icon size={14} />
              </h3>
              <p>{x.text}</p>
            </div>
            {i < 2 && <ChevronRight className="process-arrow" size={16} />}
          </div>
        ))}
      </section>
      <section className="featured">
        <div className="section-heading">
          <div>
            <span className="eyebrow">CURATED INSPIRATION</span>
            <h2>
              材质的四种表达<span>THE QUIET FORM</span>
            </h2>
          </div>
          <button className="text-button" onClick={create}>
            从灵感开始创作
            <ArrowUpRight size={16} />
          </button>
        </div>
        <div className="featured-grid">
          {["松弛的秩序", "柔软的力量", "日常的诗意", "克制的轮廓"].map(
            (name, i) => (
              <button className="inspiration-card" key={name} onClick={create}>
                <div className="inspiration-image">
                  <img
                    src={`/demo/look-${i + 1}.jpg`}
                    alt={name}
                    loading="lazy"
                  />
                  <span className="image-top-tag">DEMO COLLECTION</span>
                  <span className="image-go">
                    <ArrowUpRight size={21} />
                  </span>
                </div>
                <div className="inspiration-caption">
                  <div>
                    <h3>{name}</h3>
                    <p>
                      {
                        [
                          "西装 · 静奢风",
                          "大衣 · 极简主义",
                          "套裙 · 自然层次",
                          "夹克 · 都市衣橱",
                        ][i]
                      }
                    </p>
                  </div>
                  <span>0{i + 1}</span>
                </div>
              </button>
            ),
          )}
        </div>
        <p className="demo-caption">
          精选案例为预置 AI 生成视觉，仅用于灵感和流程演示。
        </p>
      </section>
      {projects.length > 0 && (
        <section className="recent-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">PICK UP WHERE YOU LEFT OFF</span>
              <h2>继续你的设计</h2>
            </div>
            <Link className="text-button" href="/projects">
              全部项目
              <ArrowRight size={16} />
            </Link>
          </div>
          <div className="recent-row">
            {projects.slice(0, 3).map((p) => (
              <Link key={p.id} href={`/studio/${p.id}`} className="recent-card">
                <img
                  src={
                    p.collection?.looks.find((l) => l.image)?.image ||
                    p.assets[0]?.url ||
                    "/demo/fabric.jpg"
                  }
                  alt="项目封面"
                />
                <div>
                  <h3>{p.name}</h3>
                  <p>
                    {p.config.style} · {p.config.season} ·{" "}
                    {fmtDate(p.updatedAt)}
                  </p>
                </div>
                <ArrowUpRight size={17} />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
function Projects({
  projects,
  create,
  refresh,
  notify,
}: {
  projects: Project[];
  create: () => void;
  refresh: () => Promise<void>;
  notify: (s: string, e?: boolean) => void;
}) {
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [deleting, setDeleting] = useState<Project | null>(null),
    [pending, setPending] = useState(false);
  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) &&
      (filter === "all" ||
        (filter === "favorite" && p.favorite) ||
        (filter === "complete" && p.collection?.looks.some((l) => l.image))),
  );
  return (
    <div className="content-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR CREATIVE ARCHIVE</div>
          <h1>我的项目</h1>
          <p>收藏每一次灵感，延续每一个系列。</p>
        </div>
        <button className="button primary" onClick={create}>
          <Plus size={16} />
          新建设计项目
        </button>
      </div>
      <div className="project-toolbar">
        <div className="tabs">
          {[
            ["all", "全部项目"],
            ["complete", "已生成"],
            ["favorite", "已收藏"],
          ].map(([v, l]) => (
            <button
              className={filter === v ? "selected" : ""}
              key={v}
              onClick={() => setFilter(v)}
            >
              {l}
              <span>
                {v === "all"
                  ? projects.length
                  : v === "complete"
                    ? projects.filter((p) =>
                        p.collection?.looks.some((l) => l.image),
                      ).length
                    : projects.filter((p) => p.favorite).length}
              </span>
            </button>
          ))}
        </div>
        <label className="search-field">
          <Search size={16} />
          <input
            placeholder="搜索系列名称"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      {filtered.length ? (
        <div className="projects-grid">
          {filtered.map((p) => (
            <article className="project-card" key={p.id}>
              <Link href={`/studio/${p.id}`} className="project-cover">
                <img
                  src={
                    p.collection?.looks.find((l) => l.image)?.image ||
                    p.assets[0]?.url ||
                    "/demo/fabric.jpg"
                  }
                  alt={p.name}
                />
                <span className="image-top-tag">
                  {p.generationMode === "live"
                    ? "AI COLLECTION"
                    : p.collection
                      ? "DEMO COLLECTION"
                      : "DESIGN DRAFT"}
                </span>
                <span className="project-count">
                  {p.collection?.looks.filter((l) => l.image).length || 0} LOOKS
                </span>
              </Link>
              <div className="project-card-body">
                <Link href={`/studio/${p.id}`}>
                  <h3>{p.name}</h3>
                </Link>
                <p>
                  {p.config.style} · {p.config.category} · {p.config.season}
                </p>
                <div className="project-bottom">
                  <span>更新于 {fmtDate(p.updatedAt)}</span>
                  <button
                    className={`icon-button ${p.favorite ? "gold" : ""}`}
                    aria-label={p.favorite ? "取消收藏" : "收藏项目"}
                    onClick={async () => {
                      try {
                        await api(`/api/projects/${p.id}`, {
                          method: "PATCH",
                          body: JSON.stringify({ favorite: !p.favorite }),
                        });
                        await refresh();
                      } catch (e) {
                        notify((e as Error).message, true);
                      }
                    }}
                  >
                    <Star
                      size={16}
                      fill={p.favorite ? "currentColor" : "none"}
                    />
                  </button>
                  <button
                    className="icon-button"
                    aria-label="删除项目"
                    onClick={() => setDeleting(p)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </article>
          ))}
          <button className="new-project-card" onClick={create}>
            <Plus size={27} strokeWidth={1} />
            <span>开启一个新的系列</span>
            <small>FROM A SINGLE THREAD</small>
          </button>
        </div>
      ) : (
        <div className="empty-state">
          <FolderOpen size={40} strokeWidth={1} />
          <h2>{search ? "没有找到相关项目" : "你的下一个系列，从这里开始"}</h2>
          <p>上传一块面料，把灵感变成可以看见的设计。</p>
          <button className="button primary" onClick={create}>
            开始创作
            <ArrowRight size={16} />
          </button>
        </div>
      )}
      {deleting && (
        <Modal title="删除这个设计项目？" onClose={() => setDeleting(null)}>
          <p className="modal-description">
            「{deleting.name}
            」的素材、效果图与设计记录将被删除。此操作无法撤销。
          </p>
          <div className="modal-actions">
            <button className="button" onClick={() => setDeleting(null)}>
              保留项目
            </button>
            <button
              className="button danger"
              disabled={pending}
              onClick={async () => {
                setPending(true);
                try {
                  await api(`/api/projects/${deleting.id}`, {
                    method: "DELETE",
                  });
                  setDeleting(null);
                  await refresh();
                  notify("项目已删除");
                } catch (e) {
                  notify((e as Error).message, true);
                } finally {
                  setPending(false);
                }
              }}
            >
              确认删除
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

type WorkProps = {
  project: Project;
  settings: PublicSettings | null;
  setProject: (p: Project) => void;
  update: (data: unknown) => Promise<Project>;
  busy: string;
  act: (label: string, fn: () => Promise<void>) => Promise<void>;
  notify: (s: string, e?: boolean) => void;
  exportFile: (k: "pdf" | "zip") => void;
};
function Workbench({
  project: p,
  settings,
  setProject,
  update,
  busy,
  act,
  notify,
  exportFile,
}: WorkProps) {
  const [step, setStep] = useState(1),
    [config, setConfig] = useState<DesignConfig>(p.config),
    [layout, setLayout] = useState<"grid" | "lineup">("grid"),
    [selected, setSelected] = useState<string | null>(null),
    [analysisEdit, setAnalysisEdit] = useState(false),
    [renaming, setRenaming] = useState(false),
    [name, setName] = useState(p.name),
    [drag, setDrag] = useState(false),
    [confirmGenerate, setConfirmGenerate] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null),
    [role, setRole] = useState<"fabric" | "reference">("fabric");
  const running = p.task?.status === "running";
  const locked = !!busy || running;
  const look = p.collection?.looks.find((l) => l.id === selected);
  const done = p.collection?.looks.filter((l) => l.image).length || 0;
  useEffect(() => {
    setConfig(p.config);
    setName(p.name);
  }, [p.id]);
  const upload = (files: FileList | File[] | null, sample = false) => {
    if (!sample && !files?.length) return;
    act("upload", async () => {
      const form = new FormData();
      form.append("role", role);
      if (sample) form.append("sample", "true");
      else Array.from(files!).forEach((f) => form.append("files", f));
      setProject(
        await api<Project>(`/api/projects/${p.id}/upload`, {
          method: "POST",
          body: form,
        }),
      );
      notify("素材已加入面料档案");
    });
  };
  const analyze = () =>
    act("analyze", async () => {
      setProject(
        await api<Project>(`/api/projects/${p.id}/analyze`, {
          method: "POST",
          body: "{}",
        }),
      );
      notify(
        settings?.mode === "demo"
          ? "已载入预设面料分析，请按实物修订"
          : "面料分析已完成",
      );
    });
  const generate = () =>
    act("generate", async () => {
      await update({ config });
      setProject(
        await api<Project>(`/api/projects/${p.id}/generate`, {
          method: "POST",
          body: "{}",
        }),
      );
      setConfirmGenerate(false);
    });
  const revise = (id: string, instruction: string) =>
    act("revise", async () => {
      setProject(
        await api<Project>(`/api/projects/${p.id}/generate`, {
          method: "POST",
          body: JSON.stringify({ lookId: id, instruction }),
        }),
      );
      notify(
        settings?.mode === "demo"
          ? "演示任务已启动：预置图片保持不变"
          : "款式调整任务已启动",
      );
    });
  return (
    <div className="workbench">
      <div className="workspace-title">
        <div className="workspace-name">
          {renaming ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                act("rename", async () => {
                  await update({ name });
                  setRenaming(false);
                });
              }}
            >
              <input
                autoFocus
                aria-label="项目名称"
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <button className="icon-button" aria-label="保存名称">
                <Check size={17} />
              </button>
            </form>
          ) : (
            <>
              <h1>{p.name}</h1>
              <button
                aria-label="重命名项目"
                className="icon-button"
                disabled={locked}
                onClick={() => setRenaming(true)}
              >
                <Pencil size={14} />
              </button>
            </>
          )}
          <span className="saved-state">
            <Check size={12} />
            {JSON.stringify(config) === JSON.stringify(p.config)
              ? "已保存"
              : "参数待保存"}
          </span>
        </div>
        <div className="workspace-actions">
          <button
            className="button small"
            disabled={!done || locked}
            onClick={() => exportFile("zip")}
          >
            <Download size={15} />
            下载图片
          </button>
          <Link
            aria-disabled={!done}
            className={`button small ${!done ? "disabled" : ""}`}
            href={done ? `/proposal/${p.id}` : "#"}
          >
            <FileText size={15} />
            设计提案
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
      <div className="workspace-body">
        <aside className="config-panel">
          <div className="config-tabs">
            <button
              className={step === 1 ? "selected" : ""}
              onClick={() => setStep(1)}
            >
              <span>01</span>面料与灵感{p.analysis && <Check size={13} />}
            </button>
            <button
              className={step === 2 ? "selected" : ""}
              onClick={() => setStep(2)}
            >
              <span>02</span>设计方向
            </button>
          </div>
          <div className="config-scroll">
            {step === 1 ? (
              <>
                <div className="panel-section-heading">
                  <h3>面料档案</h3>
                  <span>{p.assets.length} / 6</span>
                </div>
                <p className="field-help">
                  从一张清晰的面料照片开始，保留真实色彩与纹理。
                </p>
                <div className="segmented role-switch">
                  <button
                    className={role === "fabric" ? "selected" : ""}
                    onClick={() => setRole("fabric")}
                  >
                    面料小样
                  </button>
                  <button
                    className={role === "reference" ? "selected" : ""}
                    onClick={() => setRole("reference")}
                  >
                    款式参考图
                  </button>
                </div>
                <button
                  disabled={locked || p.assets.length >= 6}
                  className={`upload-zone ${drag ? "dragging" : ""}`}
                  onClick={() => inputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDrag(true);
                  }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDrag(false);
                    if (!locked) upload(e.dataTransfer.files);
                  }}
                >
                  <Upload size={24} strokeWidth={1.3} />
                  <strong>
                    {busy === "upload"
                      ? "正在上传素材…"
                      : `拖拽或上传${role === "fabric" ? "面料" : "参考"}图片`}
                  </strong>
                  <span>JPG / PNG / WebP · 单张 ≤ 10 MB</span>
                </button>
                <input
                  className="sr-only"
                  aria-label="上传图片"
                  ref={inputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(e) => {
                    upload(e.target.files);
                    e.target.value = "";
                  }}
                />
                {!p.assets.length && (
                  <button
                    className="sample-link"
                    disabled={locked}
                    onClick={() => upload(null, true)}
                  >
                    <img src="/demo/fabric.jpg" alt="示例面料" />
                    <div>
                      暂时没有面料？
                      <strong>
                        使用燕麦色人字纹示例
                        <ArrowRight size={13} />
                      </strong>
                    </div>
                  </button>
                )}
                <div className="asset-list">
                  {p.assets.map((a) => (
                    <div className="asset-item" key={a.id}>
                      <a href={a.originalUrl} target="_blank" rel="noreferrer">
                        <img src={a.url} alt={a.name} />
                      </a>
                      <div>
                        <strong>{a.name}</strong>
                        <small>
                          {a.role === "fabric" ? "主面料" : "款式参考"} ·
                          原图已保留
                        </small>
                      </div>
                      <button
                        className="icon-button"
                        aria-label={`移除${a.name}`}
                        disabled={locked}
                        onClick={() =>
                          act("remove", async () => {
                            await update({ removeAsset: a.id });
                          })
                        }
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                {p.analysis ? (
                  <div className="analysis-card">
                    <div className="panel-section-heading">
                      <h3>
                        <Sparkles size={15} />
                        面料解读
                      </h3>
                      <button
                        className="text-button"
                        onClick={() => setAnalysisEdit(true)}
                        disabled={locked}
                      >
                        编辑
                        <Pencil size={12} />
                      </button>
                    </div>
                    <span className="source-tag">
                      {p.analysis.source === "demo"
                        ? "DEMO · 预设分析"
                        : p.analysis.source === "manual"
                          ? "已人工修订"
                          : "AI 视觉分析"}
                    </span>
                    <h4>{p.analysis.name}</h4>
                    <div className="color-row">
                      {p.analysis.colors.map((c) => (
                        <span key={c.hex}>
                          <i style={{ background: c.hex }} />
                          {c.name}
                        </span>
                      ))}
                    </div>
                    <dl>
                      <dt>纹理 / TEXTURE</dt>
                      <dd>{p.analysis.texture}</dd>
                      <dt>图案 / PATTERN</dt>
                      <dd>{p.analysis.pattern}</dd>
                      <dt>视觉质感 / FEEL</dt>
                      <dd>{p.analysis.feel}</dd>
                    </dl>
                    <div className="tag-row">
                      {p.analysis.suitable.map((s) => (
                        <span key={s}>{s}</span>
                      ))}
                    </div>
                    <p className="analysis-note">{p.analysis.notes}</p>
                    <button
                      className="text-button"
                      disabled={locked}
                      onClick={analyze}
                    >
                      <RefreshCw size={13} />
                      重新分析
                    </button>
                  </div>
                ) : (
                  <div className="panel-tip">
                    <Sparkles size={17} />
                    <p>
                      AI 将解读面料颜色、纹理与视觉质感，为系列设计提供依据。
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="panel-section-heading">
                  <h3>定义你的系列</h3>
                  <SlidersHorizontal size={15} />
                </div>
                <p className="field-help">
                  让创作有方向，也为意外的灵感留出空间。
                </p>
                <fieldset disabled={locked}>
                  <Field label="服装品类">
                    <Segment
                      options={["女装", "男装", "童装"]}
                      value={config.category}
                      onChange={(v) =>
                        setConfig({
                          ...config,
                          category: v as DesignConfig["category"],
                        })
                      }
                    />
                  </Field>
                  <Field label="款式类型" hint="可多选">
                    <div className="choice-grid">
                      {[
                        "西装",
                        "大衣",
                        "衬衫",
                        "连衣裙",
                        "针织衫",
                        "夹克",
                        "半裙",
                        "马甲",
                      ].map((v) => (
                        <button
                          key={v}
                          className={
                            config.types.includes(v as never) ? "selected" : ""
                          }
                          onClick={() => {
                            const types = config.types.includes(v as never)
                              ? config.types.filter((x) => x !== v)
                              : ([...config.types, v] as DesignConfig["types"]);
                            if (types.length) setConfig({ ...config, types });
                          }}
                        >
                          {v}
                          {config.types.includes(v as never) && (
                            <Check size={11} />
                          )}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label="设计风格">
                    <div className="style-grid">
                      {[
                        "静奢风",
                        "极简主义",
                        "老钱风",
                        "法式",
                        "新中式",
                        "先锋设计",
                        "都市商务",
                      ].map((v, i) => (
                        <button
                          key={v}
                          className={config.style === v ? "selected" : ""}
                          onClick={() =>
                            setConfig({
                              ...config,
                              style: v as DesignConfig["style"],
                            })
                          }
                        >
                          <span className={`style-swatch swatch-${i}`} />
                          {v}
                          {config.style === v && <Check size={12} />}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label="设计季节">
                    <Segment
                      options={["春夏", "秋冬"]}
                      value={config.season}
                      onChange={(v) =>
                        setConfig({
                          ...config,
                          season: v as DesignConfig["season"],
                        })
                      }
                    />
                  </Field>
                  <Field label="创作模式">
                    <Segment
                      options={["商业成衣", "创意探索"]}
                      value={config.mode}
                      onChange={(v) =>
                        setConfig({
                          ...config,
                          mode: v as DesignConfig["mode"],
                        })
                      }
                    />
                  </Field>
                  <div className="two-fields">
                    <Field label="生成数量">
                      <Segment
                        options={["4", "6", "8"]}
                        value={String(config.count)}
                        onChange={(v) =>
                          setConfig({
                            ...config,
                            count: Number(v) as 4 | 6 | 8,
                          })
                        }
                      />
                    </Field>
                    <Field label="图片比例">
                      <select
                        aria-label="图片比例"
                        value={config.ratio}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            ratio: e.target.value as DesignConfig["ratio"],
                          })
                        }
                      >
                        {["3:4", "9:16", "16:9"].map((x) => (
                          <option key={x}>{x}</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <Field label="设计要求" hint={`${config.brief.length}/3000`}>
                    <textarea
                      aria-label="设计要求"
                      rows={5}
                      maxLength={3000}
                      value={config.brief}
                      onChange={(e) =>
                        setConfig({ ...config, brief: e.target.value })
                      }
                      placeholder="描述廓形、细节、使用场景或你希望表达的情绪…"
                    />
                  </Field>
                  <button
                    className="text-button save-config"
                    onClick={() =>
                      act("save", async () => {
                        await update({ config });
                        notify("设计参数已保存");
                      })
                    }
                  >
                    <Save size={13} />
                    保存设计参数
                  </button>
                </fieldset>
              </>
            )}
          </div>
          <div className="config-footer">
            {step === 1 ? (
              <button
                className="button primary full"
                disabled={locked || !p.assets.some((a) => a.role === "fabric")}
                onClick={p.analysis ? () => setStep(2) : analyze}
              >
                {busy === "analyze" ? (
                  <Loader2 className="spin" size={16} />
                ) : p.analysis ? (
                  <ArrowRight size={16} />
                ) : (
                  <Sparkles size={16} />
                )}{" "}
                {busy === "analyze"
                  ? "正在解读面料…"
                  : p.analysis
                    ? "下一步 · 定义设计"
                    : "分析面料"}
              </button>
            ) : (
              <button
                className="button primary full"
                disabled={locked || !p.analysis}
                onClick={() =>
                  p.collection ? setConfirmGenerate(true) : generate()
                }
              >
                {running ? (
                  <Loader2 className="spin" size={16} />
                ) : (
                  <WandSparkles size={17} />
                )}{" "}
                {running ? "系列设计中…" : `生成系列 · ${config.count} 款`}
              </button>
            )}
            <p>
              {!p.analysis && step === 2
                ? "请先完成面料上传与分析"
                : settings?.mode === "demo"
                  ? "DEMO · 预置案例演示，不调用模型"
                  : "LIVE · 将调用已配置模型，可能产生费用"}
            </p>
          </div>
        </aside>
        <section className="preview-panel">
          <div className="preview-heading">
            <div>
              <span className="eyebrow">COLLECTION CANVAS</span>
              <h2>
                {p.collection ? "系列成衣" : "灵感，正在成形。"}
                <span>
                  {p.collection
                    ? `${done} / ${p.collection.looks.length} LOOKS`
                    : "从面料出发，探索设计可能"}
                </span>
              </h2>
            </div>
            <div className="view-toggle">
              <button
                aria-label="网格展示"
                className={layout === "grid" ? "selected" : ""}
                onClick={() => setLayout("grid")}
              >
                <Grid2X2 size={17} />
              </button>
              <button
                aria-label="系列陈列"
                className={layout === "lineup" ? "selected" : ""}
                onClick={() => setLayout("lineup")}
              >
                <Columns2 size={17} />
              </button>
            </div>
          </div>
          {p.task && (
            <div
              className={`task-panel ${p.task.status === "failed" ? "failed" : ""}`}
              role="status"
            >
              <div>
                {running ? (
                  <Loader2 size={16} className="spin" />
                ) : p.task.status === "failed" ? (
                  <AlertCircle size={16} />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                <span>{p.task.message}</span>
                <strong>{p.task.progress}%</strong>
              </div>
              {running && (
                <div className="progress-track">
                  <i style={{ width: `${p.task.progress}%` }} />
                </div>
              )}
              {p.task.error && (
                <p>
                  {p.task.error}
                  <button
                    onClick={() =>
                      act("retry", async () => {
                        setProject(
                          await api<Project>(`/api/projects/${p.id}/generate`, {
                            method: "POST",
                            body: JSON.stringify({ retry: true }),
                          }),
                        );
                      })
                    }
                    disabled={locked}
                  >
                    重试未完成款式
                    <RefreshCw size={12} />
                  </button>
                </p>
              )}
            </div>
          )}
          {p.collection ? (
            <>
              <div className="collection-intro">
                <div>
                  <span className="eyebrow">{p.collection.subtitle}</span>
                  <h3>{p.collection.title}</h3>
                </div>
                <div className="tag-row">
                  {p.collection.keywords.map((k) => (
                    <span key={k}>{k}</span>
                  ))}
                  <span className="gold-tag">
                    {p.generationMode === "demo" ? "DEMO 示例" : "AI 生成"}
                  </span>
                </div>
                <p>{p.collection.concept}</p>
              </div>
              <div
                className={`look-grid ${layout === "lineup" ? "lineup" : ""}`}
              >
                {p.collection.looks.map((l, i) => (
                  <article className="look-card" key={l.id}>
                    <div
                      className="look-image"
                      style={{
                        aspectRatio: (
                          p.generationSnapshot?.config.ratio || p.config.ratio
                        ).replace(":", "/"),
                      }}
                    >
                      {l.image ? (
                        <button
                          aria-label={`查看${l.name}`}
                          className="look-open"
                          onClick={() => setSelected(l.id)}
                        >
                          <img src={l.image} alt={l.name} />
                          <span className="look-zoom">
                            <Maximize2 size={18} />
                          </span>
                        </button>
                      ) : (
                        <div className="look-placeholder">
                          {l.status === "failed" ? (
                            <AlertCircle size={25} />
                          ) : (
                            <Layers3 size={29} strokeWidth={1} />
                          )}
                          <span>
                            {l.status === "planned"
                              ? "等待生成"
                              : l.status === "failed"
                                ? "生成未完成"
                                : "细节正在成形"}
                          </span>
                        </div>
                      )}
                      <span className="look-number">
                        LOOK {String(i + 1).padStart(2, "0")}
                      </span>
                      {l.status === "generating" && (
                        <div className="look-generating">
                          <Loader2 size={25} className="spin" />
                          <span>正在创作</span>
                        </div>
                      )}
                      {p.generationMode === "demo" && (
                        <span className="look-demo">DEMO</span>
                      )}
                    </div>
                    <div className="look-caption">
                      <div>
                        <h3>{l.name}</h3>
                        <p>
                          {l.type} ·{" "}
                          {p.generationSnapshot?.config.style || p.config.style}
                        </p>
                      </div>
                      <button
                        className="icon-button"
                        aria-label={`修改${l.name}`}
                        onClick={() => setSelected(l.id)}
                      >
                        <MoreHorizontal size={19} />
                      </button>
                    </div>
                    {l.status === "failed" && (
                      <div className="look-error">
                        <p>{l.error}</p>
                        <button
                          className="text-button"
                          disabled={locked}
                          onClick={() => revise(l.id, "")}
                        >
                          <RefreshCw size={13} />
                          重试此款
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
              <div className="canvas-footer">
                <ShieldCheck size={14} />
                <span>
                  AI
                  效果图用于设计沟通。面料还原、结构可实现性与局部修改效果需人工确认。
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="preview-empty-intro">
                <span className="source-tag">示例系列 · THE QUIET FORM</span>
                <p>上传你的面料，定义属于你的下一季。</p>
              </div>
              <div className="preview-demo-grid">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n}>
                    <img
                      src={`/demo/look-${n}.jpg`}
                      alt={`预置灵感款式 ${n}`}
                    />
                    <span>
                      LOOK 0{n}
                      <small>预置示例</small>
                    </span>
                  </div>
                ))}
              </div>
              <div className="canvas-empty-note">
                <span className="gold-line" />
                你的设计将在这里呈现
                <span className="gold-line" />
              </div>
            </>
          )}
        </section>
      </div>
      {analysisEdit && p.analysis && (
        <AnalysisEditor
          analysis={p.analysis}
          onClose={() => setAnalysisEdit(false)}
          onSave={(a) =>
            act("analysis-save", async () => {
              await update({ analysis: a });
              setAnalysisEdit(false);
              notify("面料分析已更新");
            })
          }
          busy={busy === "analysis-save"}
        />
      )}
      {look && (
        <LookModal
          look={look}
          project={p}
          onClose={() => setSelected(null)}
          busy={locked}
          onRevise={(instruction) => revise(look.id, instruction)}
          onSave={(name, description) =>
            act("look-save", async () => {
              await update({ look: { id: look.id, name, description } });
              notify("款式说明已保存");
            })
          }
        />
      )}
      {confirmGenerate && (
        <Modal
          title="重新创作这个系列？"
          onClose={() => setConfirmGenerate(false)}
        >
          <p className="modal-description">
            将使用当前面料与设计参数生成新系列，并替换此项目的现有款式。你可以先下载现有图片与提案。
          </p>
          <div className="modal-actions">
            <button
              className="button"
              onClick={() => setConfirmGenerate(false)}
            >
              继续保留
            </button>
            <button
              className="button primary"
              onClick={generate}
              disabled={locked}
            >
              生成新系列
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <div className="field-label">
        <span>{label}</span>
        {hint && <small>{hint}</small>}
      </div>
      {children}
    </div>
  );
}
function Segment({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="segmented">
      {options.map((v) => (
        <button
          type="button"
          className={v === value ? "selected" : ""}
          key={v}
          onClick={() => onChange(v)}
        >
          {v}
        </button>
      ))}
    </div>
  );
}
export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const nodes = ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),a[href],input,textarea,select,[tabindex="0"]',
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("keydown", key);
      prev?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button
            className="icon-button"
            aria-label="关闭窗口"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
function AnalysisEditor({
  analysis,
  onClose,
  onSave,
  busy,
}: {
  analysis: Analysis;
  onClose: () => void;
  onSave: (a: Analysis) => void;
  busy: boolean;
}) {
  const [a, setA] = useState(analysis);
  return (
    <Modal title="修订面料档案" onClose={onClose}>
      <form
        className="analysis-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(a);
        }}
      >
        <Field label="面料名称">
          <input
            required
            maxLength={100}
            aria-label="面料名称"
            value={a.name}
            onChange={(e) => setA({ ...a, name: e.target.value })}
          />
        </Field>
        <div className="color-editors">
          {a.colors.map((c, i) => (
            <div key={i}>
              <input
                type="color"
                aria-label={`颜色 ${i + 1}`}
                value={c.hex}
                onChange={(e) =>
                  setA({
                    ...a,
                    colors: a.colors.map((v, j) =>
                      j === i ? { ...v, hex: e.target.value } : v,
                    ),
                  })
                }
              />
              <input
                aria-label={`颜色名称 ${i + 1}`}
                maxLength={40}
                value={c.name}
                onChange={(e) =>
                  setA({
                    ...a,
                    colors: a.colors.map((v, j) =>
                      j === i ? { ...v, name: e.target.value } : v,
                    ),
                  })
                }
              />
            </div>
          ))}
        </div>
        {[
          ["texture", "纹理"],
          ["pattern", "图案"],
          ["feel", "视觉质感"],
          ["notes", "补充说明"],
        ].map(([k, l]) => (
          <Field key={k} label={l}>
            <textarea
              required={k === "texture"}
              rows={2}
              maxLength={k === "notes" ? 2000 : k === "pattern" ? 300 : 500}
              aria-label={l}
              value={a[k as "texture"]}
              onChange={(e) => setA({ ...a, [k]: e.target.value })}
            />
          </Field>
        ))}
        <Field label="适用品类（以顿号分隔）">
          <input
            value={a.suitable.join("、")}
            aria-label="适用品类"
            onChange={(e) =>
              setA({ ...a, suitable: e.target.value.split("、").slice(0, 8) })
            }
          />
        </Field>
        <div className="modal-actions">
          <button type="button" className="button" onClick={onClose}>
            取消
          </button>
          <button className="button primary" disabled={busy}>
            <Save size={15} />
            保存档案
          </button>
        </div>
      </form>
    </Modal>
  );
}
function LookModal({
  look,
  project,
  onClose,
  busy,
  onRevise,
  onSave,
}: {
  look: Look;
  project: Project;
  onClose: () => void;
  busy: boolean;
  onRevise: (s: string) => void;
  onSave: (n: string, d: string) => void;
}) {
  const [instruction, setInstruction] = useState(""),
    [name, setName] = useState(look.name),
    [description, setDescription] = useState(look.description),
    [zoom, setZoom] = useState(false),
    [revision, setRevision] = useState<string | undefined>();
  const src = revision || look.image;
  return (
    <Modal
      title={`${project.collection?.subtitle} / LOOK ${String(project.collection!.looks.indexOf(look) + 1).padStart(2, "0")}`}
      onClose={onClose}
      wide
    >
      <div className="look-modal-body">
        <div className={`look-modal-image ${zoom ? "zoomed" : ""}`}>
          {src ? (
            <button aria-label="切换图片缩放" onClick={() => setZoom(!zoom)}>
              <img src={src} alt={look.name} />
              <span className="zoom-hint">
                <ZoomIn size={15} />
                {zoom ? "点击还原" : "点击放大细节"}
              </span>
            </button>
          ) : (
            <div className="empty-state">
              <Layers3 />
              <p>暂无效果图</p>
            </div>
          )}
        </div>
        <div className="look-modal-detail">
          <span className="eyebrow">DESIGN NOTES</span>
          <Field label="款式名称">
            <input
              value={name}
              aria-label="款式名称"
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="设计说明">
            <textarea
              aria-label="设计说明"
              rows={4}
              maxLength={700}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <button
            className="text-button"
            disabled={busy || !name || !description}
            onClick={() => onSave(name, description)}
          >
            <Save size={14} />
            保存说明
          </button>
          <div className="detail-divider" />
          <Field label="局部调整 / 重新设计">
            <textarea
              aria-label="款式修改要求"
              rows={3}
              maxLength={2000}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="例如：收窄领口，保持面料颜色和其他细节不变"
            />
          </Field>
          <p className="field-help">
            {project.generationMode === "demo"
              ? "Demo 仅演示调整流程，预置效果图不会改变。"
              : "通过原图 + 文字进行编辑，修改区域与其余细节的保留程度取决于模型；不提供像素级遮罩编辑。"}
          </p>
          <button
            className="button primary full"
            disabled={busy}
            onClick={() => {
              setRevision(undefined);
              onRevise(instruction);
            }}
          >
            {busy ? (
              <Loader2 className="spin" size={16} />
            ) : (
              <RefreshCw size={16} />
            )}{" "}
            {instruction ? "应用修改" : "重新生成此款"}
          </button>
          {look.image && (
            <a
              className="button full"
              href={`${look.image}${look.image.startsWith("/api") ? "?download=1" : ""}`}
              download={`${look.name}.jpg`}
            >
              <Download size={16} />
              下载效果图
            </a>
          )}
          {look.revisions.length > 0 && (
            <div className="revision-history">
              <div className="field-label">
                版本记录<span>{look.revisions.length + 1} 个版本</span>
              </div>
              <button
                className={!revision ? "selected" : ""}
                onClick={() => setRevision(undefined)}
              >
                当前版本
              </button>
              {look.revisions.map((r, i) => (
                <button
                  key={i}
                  onClick={() => setRevision(r.image)}
                  className={revision === r.image ? "selected" : ""}
                >
                  V{i + 1} · {r.instruction.slice(0, 20)}
                </button>
              ))}
            </div>
          )}
          <div className="mini-palette">
            {project.analysis?.colors.map((c) => (
              <i key={c.hex} style={{ background: c.hex }} title={c.name} />
            ))}
            <span>COLLECTION PALETTE</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
