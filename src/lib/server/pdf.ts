import PDFDocument from "pdfkit";
import path from "node:path";
import sharp from "sharp";
import type { Project } from "../types";
import { assetBuffer } from "./store";
const C = {
  bg: "#101216",
  panel: "#191c20",
  white: "#F2F0EB",
  gold: "#B9A78B",
  muted: "#999b9d",
  line: "#343638",
};
export async function makePdf(w: string, p: Project): Promise<Buffer> {
  const c = p.collection!;
  const snapshot = p.generationSnapshot || p;
  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margin: 0,
    bufferPages: true,
    autoFirstPage: false,
    info: {
      Title: `${p.name} | FABRIQ 系列设计提案`,
      Author: "FABRIQ Studio",
      Subject:
        p.generationMode === "demo"
          ? "DEMO - 预置 AI 设计示例"
          : "AI 辅助成衣设计提案",
    },
  });
  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  doc.registerFont(
    "CJK",
    path.join(process.cwd(), "public/fonts/NotoSansSC-Regular.ttf"),
  );
  doc.registerFont(
    "Latin",
    path.join(process.cwd(), "public/fonts/Manrope-Regular.ttf"),
  );
  const W = 841.89,
    H = 595.28,
    M = 43;
  let pageNumber = 0;
  const text = (
    value: string,
    x: number,
    y: number,
    width: number,
    size = 10,
    color = C.white,
    font = "CJK",
    height?: number,
  ) => {
    doc
      .font(font)
      .fontSize(size)
      .fillColor(color)
      .text(value, x, y, {
        width,
        lineGap: size * 0.5,
        ...(height ? { height, ellipsis: true } : {}),
      });
  };
  const label = (value: string, x: number, y: number, width = 500) =>
    text(value, x, y, width, 8, C.gold, "Latin");
  const line = (y: number) => {
    doc
      .moveTo(M, y)
      .lineTo(W - M, y)
      .strokeColor(C.line)
      .lineWidth(0.5)
      .stroke();
  };
  const page = (section: string) => {
    doc.addPage();
    pageNumber++;
    doc.rect(0, 0, W, H).fill(C.bg);
    label("FABRIQ® / COLLECTION PROPOSAL", M, 26);
    text(section.replace(/\s+/g, " "), W - 300, 26, 257, 8, C.muted, "CJK", 14);
    line(47);
    line(H - 40);
    text(
      p.generationMode === "demo"
        ? "DEMO · 预置 AI 设计示例，图片不随输入改变"
        : "AI 辅助设计 · 面料及工艺需以实物验证",
      M,
      H - 28,
      560,
      7,
      C.muted,
    );
    text(
      String(pageNumber).padStart(2, "0"),
      W - M - 30,
      H - 28,
      30,
      8,
      C.gold,
      "Latin",
    );
  };
  const image = async (
    url: string,
    x: number,
    y: number,
    width: number,
    height: number,
    cover = false,
  ) => {
    const buf = await sharp(await assetBuffer(w, url))
      .flatten({ background: "#17191b" })
      .jpeg({ quality: 90 })
      .toBuffer();
    doc.save();
    doc.rect(x, y, width, height).clip();
    doc.image(buf, x, y, {
      [cover ? "cover" : "fit"]: [width, height],
      align: "center",
      valign: "center",
    });
    doc.restore();
  };
  const palette = (x: number, y: number) => {
    snapshot.analysis?.colors.forEach((color, i) => {
      const col = i % 3,
        row = Math.floor(i / 3);
      doc.circle(x + col * 100 + 8, y + row * 37 + 8, 8).fill(color.hex);
      text(
        color.name,
        x + col * 100,
        y + row * 37 + 22,
        92,
        7,
        C.muted,
        "CJK",
        13,
      );
    });
  };
  const fitText = (
    value: string,
    x: number,
    y: number,
    width: number,
    height: number,
    size = 11,
    color = C.muted,
  ) => {
    while (size > 7) {
      doc.font("CJK").fontSize(size);
      if (doc.heightOfString(value, { width, lineGap: size * 0.5 }) <= height)
        break;
      size -= 0.5;
    }
    doc.font("CJK").fontSize(size);
    const overflow =
      doc.heightOfString(value, { width, lineGap: size * 0.5 }) > height;
    text(value, x, y, width, size, color, "CJK", height);
    return overflow;
  };
  const textPages = (title: string, kicker: string, body: string) => {
    let remaining = body,
      part = 1;
    while (remaining) {
      page(title + (part > 1 ? " · 续" : ""));
      label(kicker, M, 74);
      text(title, M, 104, 640, 28);
      let end = remaining.length;
      doc.font("CJK").fontSize(11);
      while (
        doc.heightOfString(remaining.slice(0, end), {
          width: 690,
          lineGap: 5.5,
        }) > 342
      )
        end = Math.floor(end * 0.92);
      const piece = remaining.slice(0, end);
      text(piece, M, 166, 690, 11, C.muted);
      remaining = remaining.slice(end);
      part++;
    }
  };
  page("系列设计提案");
  const first = c.looks.find((l) => l.image);
  if (first?.image) await image(first.image, 421, 48, W - 421, H - 89, true);
  label(c.subtitle, M, 115, 350);
  fitText(c.title, M, 167, 340, 124, 31, C.white);
  text(
    `${snapshot.config.category} / ${snapshot.config.season} / ${snapshot.config.style}`,
    M,
    322,
    345,
    11,
    C.gold,
  );
  text("以面料为原点，让灵感成为完整系列。", M, 363, 320, 11, C.muted);
  label(
    `${c.looks.length} LOOKS / ${snapshot.config.mode === "商业成衣" ? "READY TO WEAR" : "CREATIVE EXPLORATION"}`,
    M,
    435,
    345,
  );
  text(
    new Date(p.createdAt).toLocaleDateString("zh-CN", {
      timeZone: "Asia/Shanghai",
    }),
    M,
    478,
    300,
    9,
    C.muted,
  );
  if (p.generationMode === "demo")
    text(
      "演示图片为预先制作的静奢女装案例，\n未依据本次上传面料或配置实时生成。",
      M,
      501,
      350,
      8,
      C.gold,
    );
  textPages(
    "系列理念与灵感",
    "01 / THE CONCEPT",
    `${c.concept}\n\n核心关键词：${c.keywords.join(" / ")}\n\n灵感说明\n${c.inspiration}`,
  );
  if (snapshot.analysis) {
    const a = snapshot.analysis;
    page("面料档案");
    label("02 / THE MATERIAL", M, 74);
    fitText(a.name.replace(/\s+/g, " "), M, 101, 715, 53, 25, C.white);
    const fabric = snapshot.assets.find((a) => a.role === "fabric");
    if (fabric) await image(fabric.url, M, 165, 343, 278, true);
    palette(M, 468);
    label("TEXTURE / PATTERN / HAND FEEL", 419, 169, 375);
    const description = `纹理：${a.texture}\n\n图案：${a.pattern}\n\n视觉质感：${a.feel}\n\n适用品类：${a.suitable.join("、")}`;
    if (fitText(description, 419, 202, 374, 304, 11))
      textPages("完整面料分析", "THE MATERIAL / CONTINUED", description);
    textPages(
      "面料补充说明与创作要求",
      "MATERIAL NOTES / DESIGN BRIEF",
      `${a.notes}\n\n分析来源：${a.source === "demo" ? "预设演示分析，未识别上传图片" : a.source === "manual" ? "设计师人工修订" : "AI 视觉理解"}\n\n设计要求\n${snapshot.config.brief || "未填写额外要求"}\n\n面料颜色、纤维成分、克重及物理性能需以实物检测为准。`,
    );
  }
  const additional = snapshot.assets.filter(
    (a) =>
      a.role === "reference" ||
      (a.role === "fabric" &&
        a.id !== snapshot.assets.find((a) => a.role === "fabric")?.id),
  );
  if (additional.length) {
    page("素材与款式参考");
    label("REFERENCE LIBRARY", M, 74);
    for (let i = 0; i < additional.length; i++) {
      const a = additional[i],
        x = M + (i % 3) * 253,
        y = 110 + Math.floor(i / 3) * 214;
      await image(a.url, x, y, 237, 170);
      text(
        `${a.role === "fabric" ? "面料" : "款式参考"} · ${a.name}`,
        x,
        y + 178,
        237,
        8,
        C.muted,
        "CJK",
        28,
      );
    }
  }
  for (let i = 0; i < c.looks.length; i++) {
    const look = c.looks[i];
    page(`LOOK ${String(i + 1).padStart(2, "0")} / ${look.name}`);
    if (look.image) await image(look.image, M, 68, 350, 468);
    else {
      doc.rect(M, 68, 350, 468).fill(C.panel);
      text("此款尚未生成完成", M + 65, 285, 240, 14, C.muted);
    }
    label(`03 / LOOK ${String(i + 1).padStart(2, "0")}`, 430, 92, 340);
    fitText(look.name.replace(/\s+/g, " "), 430, 132, 355, 70, 23, C.white);
    text(
      `${look.type} · ${snapshot.config.style} · ${snapshot.config.season}`,
      430,
      214,
      345,
      10,
      C.gold,
    );
    doc
      .moveTo(430, 250)
      .lineTo(W - M, 250)
      .strokeColor(C.line)
      .lineWidth(0.5)
      .stroke();
    const descriptionOverflow = fitText(
      look.description,
      430,
      274,
      350,
      211,
      11,
    );
    if (look.status === "failed")
      text(
        "最新生成失败，图片为此前版本（如有）。",
        430,
        503,
        350,
        8,
        "#D19B8E",
      );
    if (descriptionOverflow)
      textPages(
        "完整款式说明",
        `LOOK ${String(i + 1).padStart(2, "0")} / DESIGN NOTES`,
        look.description,
      );
  }
  const ready = c.looks.filter((l) => l.image);
  for (let offset = 0; offset < ready.length; offset += 4) {
    page("系列陈列");
    label("04 / THE LINEUP", M, 74);
    text("一组完整的设计语言", M, 100, 700, 26);
    const batch = ready.slice(offset, offset + 4),
      width = (W - M * 2 - 3 * 12) / 4;
    for (let i = 0; i < batch.length; i++) {
      const look = batch[i],
        x = M + i * (width + 12);
      await image(look.image!, x, 160, width, 314);
      label(
        `LOOK ${String(c.looks.indexOf(look) + 1).padStart(2, "0")}`,
        x,
        490,
        width,
      );
      text(look.name, x, 510, width, 9, C.muted, "CJK", 28);
    }
  }
  textPages(
    "设计交付与使用说明",
    "DESIGN DELIVERY / NEXT STEPS",
    `本提案包含系列主题、设计理念、面料档案、款式说明与系列陈列。\n\n${p.generationMode === "demo" ? "本系列处于 DEMO 模式，图片是预先制作的演示案例，并非根据上传素材实时生成。设计师填写的配置与演示图像可能并不一致。" : "本系列使用外部 AI 模型生成。图像仅用于设计方向与视觉沟通，并不等同于工艺图纸或版型文件。"}\n\n面料纹理与颜色可能受拍摄光线和模型生成影响，无法保证精确还原。局部编辑采用原图与文字指令，可能同时改变其他细节。\n\n建议在正式生产前完成实物面料确认、版型设计、工艺评审与打样验证。\n\nFABRIQ Studio\nFrom fabric to fashion.`,
  );
  doc.end();
  return done;
}
