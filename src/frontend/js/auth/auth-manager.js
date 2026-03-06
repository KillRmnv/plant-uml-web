/**
 * Auth Manager - JWT Authentication Manager
 * PlantUML Web SCg Editor
 *
 * Manages authentication state, token storage, and redirects
 */

class AuthManager {
  constructor() {
    this.apiClient = window.apiClient;
    this.isAuthenticated = false;
    this.user = null;
    this.redirectUrl = "/"; // Куда перенаправить после логина

    this.init();
  }

  /**
   * Инициализация
   */
  async init() {
    console.log("[AuthManager] Initializing...");

    // Если мы на странице аутентификации (index.html) - очищаем guest_mode
    // Чтобы не было авто-входа при следующей загрузке app.html
    if (this.isAuthPage()) {
      this.guestLogout();
      console.log("[AuthManager] Cleared guest mode on auth page");
    }

    // Проверяем есть ли токены (JWT)
    if (this.apiClient.isAuthenticated()) {
      try {
        // Проверяем валидность токена
        this.user = await this.apiClient.getCurrentUser();
        this.isAuthenticated = true;
        console.log("[AuthManager] User authenticated:", this.user.username);

        // Если мы на странице аутентификации - НЕ делаем редирект
        // Пользователь может хотеть разлогиниться
      } catch (error) {
        console.warn("[AuthManager] Token invalid, clearing...");
        this.apiClient.clearTokens();
        this.isAuthenticated = false;
        this.user = null;
      }
    } else {
      console.log("[AuthManager] No active session");
      // На странице аутентификации остаёмся всегда
    }

    // Подписываемся на события аутентификации
    this.subscribeToAuthEvents();
  }

  /**
   * Проверка - мы на странице auth.html?
   * @returns {boolean}
   */
  isAuthPage() {
    return (
      window.location.pathname.includes("index.html") ||
      window.location.pathname.endsWith("/")
    );
  }

  /**
   * Подписка на события аутентификации
   */
  subscribeToAuthEvents() {
    window.addEventListener("auth:error", (e) => {
      console.log("[AuthManager] Auth error event:", e.detail.type);

      if (e.detail.type === "session_expired") {
        this.handleSessionExpired();
      } else if (e.detail.type === "unauthorized") {
        this.handleUnauthorized();
      }
    });
  }

  /**
   * Обработка истечения сессии
   */
  handleSessionExpired() {
    console.log("[AuthManager] Session expired");
    this.isAuthenticated = false;
    this.user = null;

    // Сохраняем текущий URL для редиректа после логина
    this.redirectUrl = window.location.pathname;

    // Показываем уведомление
    this.showNotification("Session expired. Please login again.", "warning");

    // Редирект на страницу авторизации
    this.redirectToAuth();
  }

  /**
   * Обработка unauthorized ошибки
   */
  handleUnauthorized() {
    console.log("[AuthManager] Unauthorized");
    this.isAuthenticated = false;
    this.user = null;

    this.redirectUrl = window.location.pathname;
    this.redirectToAuth();
  }

  /**
   * Логин
   * @param {string} username
   * @param {string} password
   * @param {boolean} rememberMe
   * @returns {Promise<Object>}
   */
  async login(username, password, rememberMe = false) {
    console.log("[AuthManager] Login attempt for:", username);

    try {
      const result = await this.apiClient.login(username, password);

      this.isAuthenticated = true;
      this.user = result.user;

      // Если rememberMe = false, токены не сохраняем в localStorage
      if (!rememberMe) {
        // Токены уже сохранены в apiClient, но можно добавить сессионное хранение
        console.log("[AuthManager] Session-only login (no persistent storage)");
      }

      console.log("[AuthManager] Login successful");
      return result;
    } catch (error) {
      console.error("[AuthManager] Login failed:", error);
      throw error;
    }
  }

  /**
   * Регистрация
   * @param {string} username
   * @param {string} password
   * @param {string} email
   * @returns {Promise<Object>}
   */
  async register(username, password, email) {
    console.log("[AuthManager] Register attempt for:", username);

    try {
      const result = await this.apiClient.register(username, password, email);
      console.log("[AuthManager] Registration successful");
      return result;
    } catch (error) {
      console.error("[AuthManager] Registration failed:", error);
      throw error;
    }
  }

  /**
   * Логаут
   * @returns {Promise<void>}
   */
  async logout() {
    console.log("[AuthManager] Logout");

    try {
      await this.apiClient.logout();
    } catch (error) {
      console.error("[AuthManager] Logout error:", error);
    } finally {
      this.isAuthenticated = false;
      this.user = null;
      this.redirectToAuth();
    }
  }

  /**
   * Гостевой вход (без авторизации)
   */
  guestLogin() {
    console.log("[AuthManager] Guest login");

    // Устанавливаем флаг гостевого режима
    localStorage.setItem("guest_mode", "true");
    console.log(
      "[AuthManager] guest_mode set to:",
      localStorage.getItem("guest_mode"),
    );

    this.isAuthenticated = false;
    this.user = null;

    this.redirectToMain();
  }

  /**
   * Проверка гостевого режима
   * @returns {boolean}
   */
  isGuestMode() {
    const isGuest = localStorage.getItem("guest_mode") === "true";
    console.log("[AuthManager] isGuestMode check:", isGuest);
    return isGuest;
  }

  /**
   * Выход из гостевого режима
   */
  guestLogout() {
    localStorage.removeItem("guest_mode");
  }

  /**
   * Редирект на страницу авторизации
   */
  redirectToAuth() {
    const currentPath = window.location.pathname;
    if (!currentPath.includes("index.html")) {
      console.log("[AuthManager] Redirecting to auth page");
      window.location.href = "index.html";
    }
  }

  /**
   * Редирект на главную страницу
   */
  redirectToMain() {
    const targetUrl = this.redirectUrl !== "/" ? this.redirectUrl : "app.html";
    console.log("[AuthManager] Redirecting to main:", targetUrl);
    window.location.href = targetUrl;
  }

  /**
   * Получение текущего пользователя
   * @returns {Object|null}
   */
  getUser() {
    return this.user;
  }

  /**
   * Получение username
   * @returns {string}
   */
  getUsername() {
    return this.user?.username || "Guest";
  }

  /**
   * Проверка авторизации
   * @returns {boolean}
   */
  checkAuth() {
    return this.isAuthenticated || this.isGuestMode();
  }

  /**
   * Показ уведомления
   * @param {string} message
   * @param {'success'|'error'|'warning'|'info'} type
   */
  showNotification(message, type = "info") {
    // Создаём элемент уведомления
    const notification = document.createElement("div");
    notification.className = `auth-notification ${type}`;
    notification.textContent = message;

    // Стили
    Object.assign(notification.style, {
      position: "fixed",
      top: "20px",
      right: "20px",
      padding: "12px 20px",
      borderRadius: "8px",
      backgroundColor: this.getNotificationColor(type),
      color: "white",
      fontWeight: "500",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      zIndex: "10000",
      animation: "slideInRight 0.3s ease-out",
    });

    document.body.appendChild(notification);

    // Удаляем через 4 секунды
    setTimeout(() => {
      notification.style.animation = "slideOutRight 0.3s ease-out";
      setTimeout(() => notification.remove(), 300);
    }, 4000);
  }

  /**
   * Цвет уведомления
   * @param {string} type
   * @returns {string}
   */
  getNotificationColor(type) {
    const colors = {
      success: "#22c55e",
      error: "#ef4444",
      warning: "#f59e0b",
      info: "#3b82f6",
    };
    return colors[type] || colors.info;
  }

  /**
   * Добавление CSS анимаций для уведомлений
   */
  static injectAnimations() {
    const style = document.createElement("style");
    style.textContent = `
            @keyframes slideInRight {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }
        `;
    document.head.appendChild(style);
  }
}

// Инициализируем анимации
AuthManager.injectAnimations();

// Создаём глобальный экземпляр (для index.html и auth.html)
if (typeof window !== "undefined") {
  window.AuthManager = AuthManager;
  window.authManager = new AuthManager();
}

// Экспорт для Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = AuthManager;
}
