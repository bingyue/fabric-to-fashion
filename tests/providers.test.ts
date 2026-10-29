import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import {
  defaultConfig,
  type Project,
  type ProviderConfig,
} from "../src/lib/types";
import { demoAnalysis, demoCollection } from "../src/lib/demo";

test("providers preserve reference inputs, implement all image protocols and redact upstream errors", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "fabriq-contract-"));
  process.env.FABRIC_DATA_DIR = dir;
  process.env.ALLOW_PRIVATE_API = "true";
  const provider = await import("../src/lib/server/providers");
  const store = await import("../src/lib/server/store");
  const b64 = (await fs.readFile("public/demo/look-1.jpg")).toString("base64");
  const calls: {
    url: string;
    headers: http.IncomingHttpHeaders;
    body: string;
  }[] = [];
  let imageRequests = 0,
    failImageAt = -1;
  const server = http.createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    calls.push({ url: req.url!, headers: req.headers, body });
    res.setHeader("Content-Type", "application/json");
    if (req.url?.includes("bad-model")) {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: "secret-upstream-key" }));
      return;
    }
    if (req.url?.includes("models/") && req.method === "GET") {
      res.end(JSON.stringify({ name: "test-model" }));
      return;
    }
    if (req.url?.endsWith("models")) {
      res.end(JSON.stringify({ data: [{ id: "test-model" }] }));
      return;
    }
    if (req.url?.includes("generateContent")) {
      const request = JSON.parse(body);
      if (request.generationConfig.responseModalities) {
        imageRequests++;
        if (imageRequests === failImageAt) {
          res.statusCode = 503;
          res.end("{}");
          return;
        }
      }
      res.end(
        JSON.stringify(
          request.generationConfig.responseModalities
            ? {
                candidates: [
                  {
                    content: {
                      parts: [
                        { inlineData: { mimeType: "image/jpeg", data: b64 } },
                      ],
                    },
                  },
                ],
              }
            : {
                candidates: [
                  {
                    content: {
                      parts: [
                        {
                          text: JSON.stringify(
                            request.contents[0].parts[0].text.includes("looks")
                              ? demoCollection(p)
                              : demoAnalysis,
                          ),
                        },
                      ],
                    },
                  },
                ],
              },
        ),
      );
      return;
    }
    if (req.url?.endsWith("chat/completions")) {
      res.end(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify(demoAnalysis) } }],
        }),
      );
      return;
    }
    res.end(JSON.stringify({ data: [{ b64_json: b64 }] }));
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as { port: number }).port;
  const config: ProviderConfig = {
    kind: "gemini",
    baseUrl: `http://127.0.0.1:${port}`,
    model: "test-model",
    apiKey: "contract-test-key",
  };
  const w = randomBytes(24).toString("hex");
  await fs.mkdir(store.workspacePath(w), { recursive: true });
  const p: Project = {
    ...(await store.createProject(w)),
    analysis: demoAnalysis,
    assets: [
      {
        id: "material",
        name: "test",
        url: "/demo/fabric.jpg",
        originalUrl: "/demo/fabric.jpg",
        role: "fabric",
        mime: "image/jpeg",
        size: 1,
      },
    ],
    config: defaultConfig,
  };
  const look = {
    id: "look",
    name: "test",
    type: "西装",
    description: "test",
    prompt: "Create a tailored wool suit",
    status: "planned" as const,
    revisions: [],
  };
  try {
    const analysis = await provider.analyze(w, p, config);
    assert.equal(analysis.source, "ai");
    assert.equal(analysis.name, demoAnalysis.name);
    const vision = JSON.parse(calls.at(-1)!.body);
    assert.equal(vision.contents[0].parts[1].inlineData.mimeType, "image/jpeg");
    assert.ok(vision.contents[0].parts[1].inlineData.data.length > 1000);
    assert.equal(calls.at(-1)!.headers["x-goog-api-key"], "contract-test-key");
    const geminiImage = await provider.generateImage(w, p, look, config);
    assert.ok((await store.assetBuffer(w, geminiImage)).length > 10000);
    const geminiRequest = JSON.parse(calls.at(-1)!.body);
    assert.deepEqual(geminiRequest.generationConfig.responseModalities, [
      "TEXT",
      "IMAGE",
    ]);
    assert.equal(geminiRequest.generationConfig.imageConfig.aspectRatio, "3:4");
    await provider.analyze(w, p, { ...config, kind: "openai" });
    assert.match(calls.at(-1)!.url, /chat\/completions/);
    assert.match(
      JSON.parse(calls.at(-1)!.body).messages[1].content[1].image_url.url,
      /^data:image\/jpeg;base64,/,
    );
    await provider.generateImage(
      w,
      p,
      { ...look, image: geminiImage },
      { ...config, kind: "openai" },
      "Narrow the lapel",
    );
    const openai = calls.at(-1)!;
    assert.match(openai.url, /images\/edits/);
    assert.match(openai.headers["content-type"]!, /multipart\/form-data/);
    assert.equal((openai.body.match(/name="image\[\]"/g) || []).length, 2);
    assert.match(openai.body, /Narrow the lapel/);
    await provider.generateImage(w, p, look, { ...config, kind: "seedream" });
    const seedream = JSON.parse(calls.at(-1)!.body);
    assert.equal(seedream.image.length, 1);
    assert.equal(seedream.size, "1728x2304");
    assert.equal(seedream.response_format, "b64_json");
    await assert.rejects(
      () => provider.testProvider({ ...config, model: "bad-model" }),
      (e) => {
        assert.ok(e instanceof Error);
        assert.match(e.message, /API Key 无效/);
        assert.doesNotMatch(e.message, /secret-upstream-key/);
        return true;
      },
    );
    await provider.testProvider(config);
    await provider.testProvider({ ...config, kind: "openai" });
    const jobs = await import("../src/lib/server/jobs");
    await store.saveProject(w, p);
    failImageAt = imageRequests + 2;
    const settings = { mode: "live" as const, text: config, image: config };
    const firstJob = await jobs.startTask(w, p.id, settings);
    await firstJob.run();
    const partial = await store.readProject(w, p.id);
    assert.equal(partial.task?.status, "failed");
    assert.equal(
      partial.collection?.looks.filter((l) => l.status === "complete").length,
      3,
    );
    const firstImage = partial.collection!.looks[0].image;
    const beforeRetry = imageRequests;
    const retry = await jobs.startTask(
      w,
      p.id,
      settings,
      undefined,
      undefined,
      true,
    );
    await retry.run();
    const complete = await store.readProject(w, p.id);
    assert.equal(complete.task?.status, "complete");
    assert.equal(imageRequests, beforeRetry + 1);
    assert.equal(complete.collection!.looks[0].image, firstImage);
    assert.equal(complete.collection!.looks.length, 4);
    await store.mutateProject(w, p.id, (p) => {
      p.task = {
        ...p.task!,
        id: "interrupted-task",
        status: "running",
        updatedAt: new Date(Date.now() - 30000).toISOString(),
      };
    });
    const recovered = await jobs.recoverProject(w, p.id);
    assert.equal(recovered.task?.status, "failed");
    assert.match(recovered.task?.error || "", /中断/);
    delete process.env.ALLOW_PRIVATE_API;
    await assert.rejects(
      () => provider.validateUrl("https://127.0.0.1"),
      /内网/,
    );
    await assert.rejects(
      () => provider.validateUrl("https://user:password@example.com"),
      /账户/,
    );
    const encrypted = store.encrypt("local-secret");
    assert.notEqual(encrypted, "local-secret");
    assert.equal(store.decrypt(encrypted), "local-secret");
    const tampered = Buffer.from(encrypted, "base64");
    tampered[15] ^= 1;
    assert.throws(() => store.decrypt(tampered.toString("base64")));
    await assert.rejects(
      () => store.assetBuffer(w, "/../../etc/passwd"),
      /无效/,
    );
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
    await fs.rm(dir, { recursive: true, force: true });
  }
});
