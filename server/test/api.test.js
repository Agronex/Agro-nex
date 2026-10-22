import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

process.env.NODE_ENV = "test";
const { default: app } = await import("../index.js");

test("GET /health returns a healthy response", async () => {
  const response = await request(app).get("/health");
  assert.equal(response.status, 200);
  assert.equal(response.body.status, "ok");
});

test("POST /weather validates coordinates", async () => {
  const response = await request(app).post("/weather").send({ lat: 120, lon: 0 });
  assert.equal(response.status, 400);
});

test("GET /alerts returns static alerts without coordinates", async () => {
  const response = await request(app).get("/alerts");
  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body));
});

test("POST /chat rejects an empty conversation", async () => {
  const response = await request(app).post("/chat").send({});
  assert.ok([400, 500].includes(response.status));
});

test("POST /disease rejects missing multipart image", async () => {
  const response = await request(app).post("/disease");
  assert.equal(response.status, 400);
});
