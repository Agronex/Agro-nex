import express from "express";
import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";
import { createSseStream } from "@azure/core-sse";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

const endpoint = process.env.GITHUB_MODELS_ENDPOINT || "https://models.github.ai/inference";
const token = process.env.GITHUB_TOKEN;

const client = token
  ? ModelClient(endpoint, new AzureKeyCredential(token))
  : null;

const MODEL_CHAIN = ["openai/gpt-4o"];
const MAX_HISTORY = 20;
const MAX_MESSAGE_LENGTH = 2000;
const DEFAULT_MAX_TOKENS = 700;
const DEFAULT_TEMPERATURE = 0.55;

const SYSTEM_PROMPT =
  "You are AgroNex AI, a professional farming assistant. " +
  "Help with crops, disease prevention, irrigation, fertilizers, weather decisions, and farm operations. " +
  "Reply in clean GitHub-flavored Markdown with short sections and useful bullets when helpful. " +
  "Keep responses practical and action-oriented. " +
  "If the user asks outside agriculture, politely redirect to farming-focused help.";

function clamp(value, min, max, fallback) {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function normalizeRole(raw) {
  if (raw === "user") return "user";
  if (raw === "assistant") return "assistant";
  if (raw === "bot") return "assistant";
  return null;
}

function parseConversation(body) {
  const { message, messages } = body ?? {};
  const conversation = [];

  if (Array.isArray(messages)) {
    for (const msg of messages) {
      const role = normalizeRole(msg?.role ?? msg?.type);
      const content = typeof msg?.content === "string" ? msg.content.trim() : "";
      if (!role || !content) continue;
      if (content.length > MAX_MESSAGE_LENGTH) {
        throw new Error(`Each message must be at most ${MAX_MESSAGE_LENGTH} characters.`);
      }
      conversation.push({ role, content });
    }
  } else if (typeof message === "string") {
    const content = message.trim();
    if (!content || content.length > MAX_MESSAGE_LENGTH) {
      throw new Error(`Message must be between 1 and ${MAX_MESSAGE_LENGTH} characters.`);
    }
    conversation.push({ role: "user", content });
  }

  if (conversation.length === 0) {
    throw new Error("Provide a non-empty 'messages' array or 'message' string.");
  }

  if (conversation.length > MAX_HISTORY) {
    return conversation.slice(-MAX_HISTORY);
  }

  return conversation;
}

function buildRequestBody(conversation, options, model, stream = false) {
  const temperature = clamp(options?.temperature, 0, 1.2, DEFAULT_TEMPERATURE);
  const max_tokens = clamp(options?.maxTokens, 128, 1200, DEFAULT_MAX_TOKENS);

  return {
    model,
    stream,
    temperature,
    max_tokens,
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...conversation],
  };
}

function extractModelError(response) {
  const bodyError =
    response?.body?.error?.message ||
    response?.body?.error ||
    response?.body?.message ||
    "Unknown model error";

  return new Error(`Model request failed (${response?.status || "unknown"}): ${bodyError}`);
}

async function getCompletionWithFallback(conversation, options) {
  const failures = [];

  for (const model of MODEL_CHAIN) {
    try {
      const response = await client.path("/chat/completions").post({
        body: buildRequestBody(conversation, options, model, false),
      });

      if (isUnexpected(response)) {
        throw extractModelError(response);
      }

      const reply = response.body?.choices?.[0]?.message?.content?.trim();
      if (!reply) {
        throw new Error("The model returned an empty response.");
      }

      return { reply, model };
    } catch (error) {
      failures.push(`${model}: ${error?.message || String(error)}`);
    }
  }

  throw new Error(failures.join(" | "));
}

async function streamCompletionWithFallback(res, conversation, options) {
  const failures = [];

  for (const model of MODEL_CHAIN) {
    let emittedToken = false;

    try {
      const response = await client
        .path("/chat/completions")
        .post({
          body: buildRequestBody(conversation, options, model, true),
        })
        .asNodeStream();

      if (response.status !== 200 && response.status !== "200" || !response.body) {
        throw extractModelError(response);
      }

      res.write(`event: model\ndata: ${JSON.stringify({ model })}\n\n`);

      const events = createSseStream(response.body);

      for await (const event of events) {
        if (!event?.data) continue;
        if (event.data === "[DONE]") break;

        const payload = JSON.parse(event.data);
        const choices = Array.isArray(payload?.choices) ? payload.choices : [];

        for (const choice of choices) {
          const delta = choice?.delta?.content;
          if (!delta) continue;
          emittedToken = true;
          res.write(`event: token\ndata: ${JSON.stringify({ content: delta })}\n\n`);
        }
      }

      res.write("event: done\ndata: {}\n\n");
      res.end();
      return;
    } catch (error) {
      failures.push(`${model}: ${error?.message || String(error)}`);
      if (emittedToken) {
        res.write(`event: error\ndata: ${JSON.stringify({ message: "Stream interrupted." })}\n\n`);
        res.end();
        return;
      }
    }
  }

  res.write(
    `event: error\ndata: ${JSON.stringify({ message: "All configured models failed.", details: failures.join(" | ") })}\n\n`,
  );
  res.end();
}

router.post("/", async (req, res) => {
  if (!client) {
    return res.status(500).json({ error: "GITHUB_TOKEN is not configured on the server." });
  }

  let conversation;
  try {
    conversation = parseConversation(req.body);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  try {
    const { reply, model } = await getCompletionWithFallback(conversation, req.body?.options);
    return res.json({ reply, model });
  } catch (error) {
    console.error("[Chat API Error]", error?.message || error);
    return res.status(502).json({ error: "AI service temporarily unavailable.", details: error.message });
  }
});

router.post("/stream", async (req, res) => {
  if (!client) {
    return res.status(500).json({ error: "GITHUB_TOKEN is not configured on the server." });
  }

  let conversation;
  try {
    conversation = parseConversation(req.body);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  req.on("close", () => {
    if (!res.writableEnded) {
      res.end();
    }
  });

  try {
    await streamCompletionWithFallback(res, conversation, req.body?.options);
  } catch (error) {
    console.error("[Chat Stream Error]", error?.message || error);
    if (!res.writableEnded) {
      res.write(`event: error\ndata: ${JSON.stringify({ message: "Streaming failed." })}\n\n`);
      res.end();
    }
  }
});

export default router;
