import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT || 3000);
const difyApiBase = (process.env.DIFY_API_BASE || "https://api.dify.ai/v1").replace(/\/$/, "");
const difyApiKey = process.env.DIFY_API_KEY;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    hasDifyKey: Boolean(difyApiKey)
  });
});

app.get("/api/parameters", async (_request, response) => {
  if (!difyApiKey) {
    response.status(500).json({ error: "Dify API Key is not configured on the server." });
    return;
  }

  try {
    const payload = await requestDify("/parameters", {
      method: "GET"
    });

    response.json(payload);
  } catch (error) {
    const status = error.status || 502;
    response.status(status).json({ error: error.message || "Unable to load Dify parameters." });
  }
});

app.post("/api/run", async (request, response) => {
  if (!difyApiKey) {
    response.status(500).json({ error: "Dify API Key is not configured on the server." });
    return;
  }

  const inputs = request.body?.inputs || {};
  const user = String(request.body?.user || "agent-ai-web").slice(0, 128);
  const normalizedInputs = normalizeWorkflowInputs(inputs);

  const missingField = getMissingField(normalizedInputs);
  if (missingField) {
    response.status(400).json({ error: `${missingField} is required.` });
    return;
  }

  try {
    const payload = await runWorkflowStream(normalizedInputs, user);

    response.json({
      answer: sanitizeAnswer(extractWorkflowAnswer(payload)),
      workflowRunId: payload?.workflow_run_id || payload?.data?.id || "",
      elapsedTime: payload?.data?.elapsed_time || null
    });
  } catch (error) {
    const status = error.status || 502;
    console.error("Dify workflow error:", error);
    response.status(status).json({ error: error.message || "Unable to reach Dify API." });
  }
});

app.listen(port, () => {
  console.log(`Agent AI web app is running at http://localhost:${port}`);
});

async function requestDify(pathname, options = {}) {
  const difyResponse = await fetch(`${difyApiBase}${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${difyApiKey}`,
      "Content-Type": "application/json",
      ...options.headers
    }
  });

  const contentType = difyResponse.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await difyResponse.json()
    : { error: await difyResponse.text() };

  if (!difyResponse.ok) {
    const error = new Error(payload?.message || payload?.error || "Dify request failed.");
    error.status = difyResponse.status;
    throw error;
  }

  return payload;
}

async function runWorkflowStream(inputs, user) {
  const difyResponse = await fetch(`${difyApiBase}/workflows/run`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${difyApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      inputs,
      response_mode: "streaming",
      user
    })
  });

  if (!difyResponse.ok) {
    const payload = await parseDifyError(difyResponse);
    const error = new Error(payload?.message || payload?.error || "Dify request failed.");
    error.status = difyResponse.status;
    throw error;
  }

  const decoder = new TextDecoder();
  const reader = difyResponse.body.getReader();
  let buffer = "";
  let finalPayload = null;
  let streamedText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";

    for (const eventBlock of events) {
      const dataLine = eventBlock
        .split("\n")
        .find((line) => line.startsWith("data:"));

      if (!dataLine) {
        continue;
      }

      const data = dataLine.replace(/^data:\s*/, "");
      if (data === "[DONE]") {
        continue;
      }

      try {
        const event = JSON.parse(data);
        if (event.event === "text_chunk" && event.data?.text) {
          streamedText += event.data.text;
        }

        if (event.event === "workflow_finished") {
          finalPayload = event;
        }
      } catch {
        // Dify can emit keepalive comments; ignore non-JSON fragments.
      }
    }
  }

  if (finalPayload) {
    return finalPayload;
  }

  return {
    data: {
      outputs: {
        answer: streamedText
      }
    }
  };
}

async function parseDifyError(response) {
  const contentType = response.headers.get("content-type") || "";
  return contentType.includes("application/json")
    ? response.json()
    : { error: await response.text() };
}

function normalizeWorkflowInputs(inputs) {
  return {
    research_topic: String(inputs.research_topic || "").trim(),
    task_type: String(inputs.task_type || "快速综述").trim(),
    max_results: Number(inputs.max_results || 5),
    year_from: String(inputs.year_from || "").trim(),
    preferred_sources: String(inputs.preferred_sources || "arXiv + Semantic Scholar").trim(),
    output_language: String(inputs.output_language || "中文").trim(),
    custom_constraints: String(inputs.custom_constraints || "").trim()
  };
}

function getMissingField(inputs) {
  const requiredFields = {
    research_topic: "研究主题",
    task_type: "任务类型",
    max_results: "最大返回论文数",
    preferred_sources: "检索源",
    output_language: "输出语言"
  };

  for (const [field, label] of Object.entries(requiredFields)) {
    if (!inputs[field]) {
      return label;
    }
  }

  if (!Number.isFinite(inputs.max_results) || inputs.max_results < 1) {
    return "最大返回论文数";
  }

  return "";
}

function extractWorkflowAnswer(payload) {
  const outputs = payload?.data?.outputs || payload?.outputs || {};

  if (typeof outputs === "string") {
    return outputs;
  }

  const preferredKeys = [
    "markdown_result",
    "answer",
    "result",
    "output",
    "text",
    "response",
    "html_result",
    "bibtex_result"
  ];

  for (const key of preferredKeys) {
    const found = findStringByKey(outputs, key);
    if (found) {
      return found;
    }
  }

  const firstString = findFirstString(outputs);
  if (firstString) {
    return firstString;
  }

  return "";
}

function sanitizeAnswer(answer) {
  return String(answer || "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .trim();
}

function findStringByKey(value, key) {
  if (!value || typeof value !== "object") {
    return "";
  }

  if (typeof value[key] === "string" && value[key].trim()) {
    return value[key];
  }

  for (const child of Object.values(value)) {
    const found = findStringByKey(child, key);
    if (found) {
      return found;
    }
  }

  return "";
}

function findFirstString(value) {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (!value || typeof value !== "object") {
    return "";
  }

  for (const child of Object.values(value)) {
    const found = findFirstString(child);
    if (found) {
      return found;
    }
  }

  return "";
}
