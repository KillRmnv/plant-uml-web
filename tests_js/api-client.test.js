/**
 * Тесты ApiClient (src/frontend/js/api/client.js).
 *
 * Подгружаем исходник через vm-контекст, чтобы переменные класса
 * (объявленные через `class`) появились в global, как в браузере.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const CLIENT_PATH = path.resolve(
  __dirname,
  "../../plant-uml-web/src/frontend/js/api/client.js",
);

function loadApiClient() {
  // Минимальный stub окружения, который нужен client.js
  const sandbox = {
    window: globalThis,
    document: globalThis.document,
    localStorage: globalThis.localStorage,
    fetch: globalThis.fetch,
    console,
    Config: { API_BASE_URL: "http://test.local/api" },
    setTimeout,
    Promise,
    Error,
    JSON,
    CustomEvent: globalThis.CustomEvent,
  };
  vm.createContext(sandbox);

  const code = fs.readFileSync(CLIENT_PATH, "utf-8");
  vm.runInContext(code, sandbox);
  return sandbox.ApiClient;
}

describe("ApiClient", () => {
  let ApiClient;
  let storage;

  beforeEach(() => {
    storage = {};
    globalThis.localStorage = {
      getItem: (k) => (k in storage ? storage[k] : null),
      setItem: (k, v) => {
        storage[k] = String(v);
      },
      removeItem: (k) => {
        delete storage[k];
      },
      clear: () => {
        storage = {};
      },
    };
    ApiClient = loadApiClient();
  });

  it("starts unauthenticated when no tokens in storage", () => {
    const c = new ApiClient();
    expect(c.accessToken).toBeNull();
    expect(c.refreshToken).toBeNull();
  });

  it("restores tokens from localStorage on construction", () => {
    storage["access_token"] = "tok-A";
    storage["refresh_token"] = "tok-R";
    storage["current_user"] = JSON.stringify({ id: 1, username: "alice" });

    const c = new ApiClient();
    expect(c.accessToken).toBe("tok-A");
    expect(c.refreshToken).toBe("tok-R");
    expect(c.currentUser.username).toBe("alice");
  });

  it("dispatches auth:error event only once", () => {
    const c = new ApiClient();
    const handler = vi.fn();
    globalThis.addEventListener("auth:error", handler);

    c._dispatchAuthError("session_expired");
    c._dispatchAuthError("session_expired");

    expect(handler).toHaveBeenCalledTimes(1);
    globalThis.removeEventListener("auth:error", handler);
  });

  it("resetAuthErrorFlag re-arms dispatch", () => {
    const c = new ApiClient();
    const handler = vi.fn();
    globalThis.addEventListener("auth:error", handler);

    c._dispatchAuthError("x");
    c.resetAuthErrorFlag();
    c._dispatchAuthError("x");

    expect(handler).toHaveBeenCalledTimes(2);
    globalThis.removeEventListener("auth:error", handler);
  });

  it("attaches Authorization header when token is set", async () => {
    const c = new ApiClient();
    c.accessToken = "abc";

    const fakeResp = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    globalThis.fetch = vi.fn().mockResolvedValue(fakeResp);

    await c.request("/health");

    const [, options] = globalThis.fetch.mock.calls[0];
    expect(options.headers["Authorization"]).toBe("Bearer abc");
    expect(options.headers["Content-Type"]).toBe("application/json");
  });
});
