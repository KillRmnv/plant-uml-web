/**
 * Тесты ChatWindow.formatContent (src/frontend/js/assistant/chat-window.js)
 *
 * Проверяем рендеринг markdown и безопасность (XSS).
 */
import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const CHAT_WINDOW_PATH = path.resolve(
  __dirname,
  "../src/frontend/js/assistant/chat-window.js",
);

function loadChatWindow() {
  const code = fs.readFileSync(CHAT_WINDOW_PATH, "utf-8");

  // Упрощённый вариант: создаём контекст с минимальным набором глобальных переменных
  const sandbox = vm.createContext({
    window: {},
    document: {
      createElement: (tag) => ({
        textContent: "",
        innerHTML: "",
        set textContent(v) { this._text = v; },
        get textContent() { return this._text || ""; },
        set innerHTML(v) { this._html = v; },
        get innerHTML() { return this._html || ""; },
      }),
    },
    localStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    },
    console,
    setTimeout,
    Promise,
    Error,
    RegExp,
    marked: undefined,
    DOMPurify: undefined,
  });

  // Выполняем код — class ChatWindow попадёт в sandbox
  vm.runInContext(code, sandbox);

  // Если exports через module.exports — забираем оттуда
  if (sandbox.module && sandbox.module.exports) {
    return sandbox.module.exports;
  }

  return sandbox.ChatWindow || sandbox.window.ChatWindow;
}

describe("ChatWindow.formatContent", () => {
  let ChatWindow;
  let instance;

  beforeEach(() => {
    ChatWindow = loadChatWindow();

    // Создаём "контейнер" с минимальным API
    const fakeContainer = {
      innerHTML: "",
      querySelector: () => null,
      querySelectorAll: () => [],
      appendChild: () => {},
      addEventListener: () => {},
    };

    instance = new ChatWindow(fakeContainer, {});

    // stub escapeHtml если он не виден извне
    if (typeof instance.escapeHtml !== "function") {
      instance.escapeHtml = function (text) {
        const div = { textContent: "", innerHTML: "" };
        div.textContent = text;
        return div.innerHTML;
      };
    }
  });

  it("без marked.js: экранирует HTML и заменяет переводы строк на <br>", () => {
    const input = "<script>alert('xss')</script>\nLine2";
    const result = instance.formatContent(input);
    expect(result).toContain("&lt;script&gt;");
    expect(result).toContain("<br>");
  });

  it("с marked.js: превращает markdown в HTML", () => {
    // подменяем marked
    instance.marked = { parse: (text) => `<p>${text}</p>` };

    const result = instance.formatContent("hello");
    expect(result).toContain("<p>");
    expect(result).toContain("hello");
  });

  it("с marked + DOMPurify: удаляет опасные теги", () => {
    instance.marked = {
      parse: (text) => `<p>${text}</p><script>alert(1)</script>`,
    };
    instance.DOMPurify = {
      sanitize: (html) => html.replace(/<script.*?>.*?<\/script>/gs, ""),
    };

    const result = instance.formatContent("hello");
    expect(result).not.toContain("<script>");
    expect(result).toContain("<p>");
  });
});
