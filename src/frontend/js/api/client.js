/**
 * API Client - PlantUML Web SCg Editor
 * HTTP client for backend communication with JWT authentication
 *
 * Endpoints:
 *   - Auth: /auth/login, /auth/register, /auth/refresh, /auth/logout, /auth/me
 *   - Converter: /converter/scs-to-gwf, /converter/gwf-to-scs, /converter/validate/*
 *   - PlantUML: /plantuml/render/scs, /plantuml/render/gwf
 *   - Assistant: /assistant/chats, /assistant/chat (with JWT)
 *   - Settings: /settings (with JWT)
 *   - Session: /session/* (with JWT)
 */

class ApiClient {
  constructor(baseUrl = Config.API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.accessToken = null;
    this.refreshToken = null;
    this.currentUser = null;

    // Восстанавливаем токены из localStorage
    this._restoreTokens();
  }


  /**
   * Восстановление токенов из localStorage
   * @private
   */
  _restoreTokens() {
    try {
      const accessToken = localStorage.getItem("access_token");
      const refreshToken = localStorage.getItem("refresh_token");
      const userStr = localStorage.getItem("current_user");

      if (accessToken && refreshToken) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        if (userStr) {
          this.currentUser = JSON.parse(userStr);
        }
        console.log("[ApiClient] Tokens restored from storage");
      }
    } catch (e) {
      console.warn("[ApiClient] Failed to restore tokens:", e);
    }
  }

  /**
   * Сохранение токенов в localStorage
   * @private
   */
  _saveTokens() {
    try {
      if (this.accessToken) {
        localStorage.setItem("access_token", this.accessToken);
        localStorage.setItem("refresh_token", this.refreshToken);
        if (this.currentUser) {
          localStorage.setItem(
            "current_user",
            JSON.stringify(this.currentUser),
          );
        }
      } else {
        this._clearTokensStorage();
      }
    } catch (e) {
      console.warn("[ApiClient] Failed to save tokens:", e);
    }
  }

  /**
   * Очистка токенов в localStorage
   * @private
   */
  _clearTokensStorage() {
    try {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("current_user");
    } catch (e) {
      console.warn("[ApiClient] Failed to clear tokens:", e);
    }
  }

  /**
   * Парсинг ответа
   * @private
   */
  async _parseResponse(response) {
    const contentType = response.headers.get("Content-Type");

    // Blob для файлов
    if (contentType && contentType.includes("application/octet-stream")) {
      return await response.blob();
    }

    // Пустой ответ (204 No Content)
    if (response.status === 204) {
      return null;
    }

    // JSON ответ
    const text = await response.text();
    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch (e) {
      console.warn("[ApiClient] Failed to parse JSON:", e);
      return { raw: text };
    }
  }

  /**
   * Обработка ошибок аутентификации
   * @private
   */
  _onAuthError(type) {
    window.dispatchEvent(
      new CustomEvent("auth:error", {
        detail: { type },
      }),
    );
  }

 

  /**
   * Базовый метод для HTTP запросов
   * @param {string} endpoint - Endpoint URL
   * @param {Object} options - Fetch options
   * @returns {Promise<any>}
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;

    // Не устанавливаем Content-Type для FormData
    const isFormData = options.body instanceof FormData;
    const defaultHeaders = isFormData
      ? {}
      : {
          "Content-Type": "application/json",
        };

    // Добавляем Authorization header если есть токен
    if (this.accessToken) {
      defaultHeaders["Authorization"] = `Bearer ${this.accessToken}`;
    }

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers || {}),
      },
    };

    try {
      const response = await fetch(url, config);

      // 401 Unauthorized - пробуем обновить токен
      if (response.status === 401) {
        const errorData = await response.json().catch(() => ({}));

        // Если токен истёк и есть refresh_token
        if (this.refreshToken && errorData.code === "TOKEN_EXPIRED") {
          try {
            await this.refreshAccessToken();

            // Повторяем запрос с новым токеном
            config.headers["Authorization"] = `Bearer ${this.accessToken}`;
            const retryResponse = await fetch(url, config);

            if (!retryResponse.ok) {
              const retryError = await retryResponse.json().catch(() => ({}));
              throw new Error(
                retryError.message || `HTTP ${retryResponse.status}`,
              );
            }

            return await this._parseResponse(retryResponse);
          } catch (refreshError) {
            // Не удалось обновить токен - очищаем сессию
            this.clearTokens();
            this._onAuthError("session_expired");
            throw new Error("Session expired. Please login again.");
          }
        }

        // Другие 401 ошибки
        this.clearTokens();
        this._onAuthError("unauthorized");
        throw new Error(errorData.message || "Unauthorized");
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      return await this._parseResponse(response);
    } catch (error) {
      console.error(`[API] Error: ${endpoint}`, error);
      throw error;
    }
  }

  /**
   * GET запрос
   * @param {string} endpoint - Endpoint URL
   * @param {Object} options - Дополнительные опции
   * @returns {Promise<any>}
   */
  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: "GET" });
  }

  /**
   * POST запрос
   * @param {string} endpoint - Endpoint URL
   * @param {any} data - Данные
   * @param {Object} options - Дополнительные опции
   * @returns {Promise<any>}
   */
  post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * PUT запрос
   * @param {string} endpoint - Endpoint URL
   * @param {any} data - Данные
   * @param {Object} options - Дополнительные опции
   * @returns {Promise<any>}
   */
  put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE запрос
   * @param {string} endpoint - Endpoint URL
   * @param {Object} options - Дополнительные опции
   * @returns {Promise<any>}
   */
  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: "DELETE" });
  }


  /**
   * Логин пользователя
   * @param {string} username - Имя пользователя
   * @param {string} password - Пароль
   * @returns {Promise<{access_token: string, refresh_token: string, expires_in: number, user: Object}>}
   */
  async login(username, password) {
    const result = await this.post("/auth/login", { username, password });
    this.setTokens(result.access_token, result.refresh_token);
    this.currentUser = result.user;
    this._saveTokens();
    console.log("[ApiClient] Login successful:", result.user?.username);
    return result;
  }

  /**
   * Регистрация нового пользователя
   * @param {string} username - Имя пользователя
   * @param {string} password - Пароль
   * @param {string} email - Email (опционально)
   * @returns {Promise<{user_id: string, username: string}>}
   */
  async register(username, password, email) {
    return this.post("/auth/register", { username, password, email });
  }

  /**
   * Обновление access токена
   * @returns {Promise<{access_token: string, expires_in: number}>}
   */
  async refreshAccessToken() {
    const result = await this.post("/auth/refresh", {
      refresh_token: this.refreshToken,
    });
    this.accessToken = result.access_token;
    return result;
  }

  /**
   * Логаут пользователя
   * @returns {Promise<{success: boolean}>}
   */
  async logout() {
    try {
      const result = await this.post("/auth/logout", {
        refresh_token: this.refreshToken,
      });
      this.clearTokens();
      this._clearTokensStorage();
      console.log("[ApiClient] Logout successful");
      return result;
    } catch (error) {
      // Даже если ошибка - очищаем локально
      this.clearTokens();
      this._clearTokensStorage();
      throw error;
    }
  }

  /**
   * Получение текущего пользователя
   * @returns {Promise<{user_id: string, username: string, email: string}>}
   */
  async getCurrentUser() {
    if (this.currentUser) {
      return this.currentUser;
    }
    this.currentUser = await this.get("/auth/me");
    return this.currentUser;
  }

  /**
   * Проверка авторизации
   * @returns {boolean}
   */
  isAuthenticated() {
    return !!this.accessToken;
  }

  /**
   * Установка токенов
   * @param {string} accessToken - Access токен
   * @param {string} refreshToken - Refresh токен
   */
  setTokens(accessToken, refreshToken) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this._saveTokens();
  }

  /**
   * Очистка токенов
   */
  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    this.currentUser = null;
  }

 
  /**
   * Конвертация ScS → GWF
   * @param {string} scsContent - ScS контент
   * @returns {Promise<{gwf: string}>}
   */
  async scsToGwf(scsContent) {
    return this.post("/converter/scs-to-gwf", { content: scsContent });
  }

  /**
   * Конвертация GWF → ScS
   * @param {string} gwfContent - GWF XML контент
   * @returns {Promise<{scs: string}>}
   */
  async gwfToScs(gwfContent) {
    return this.post("/converter/gwf-to-scs", { content: gwfContent });
  }

  /**
   * Валидация ScS
   * @param {string} content - ScS контент
   * @returns {Promise<{valid: boolean, errors: string[], warnings: string[]}>}
   */
  async validateScs(content) {
    return this.post("/converter/validate/scs", { content });
  }

  /**
   * Валидация GWF
   * @param {string} content - GWF контент
   * @returns {Promise<{valid: boolean, errors: string[], warnings: string[]}>}
   */
  async validateGwf(content) {
    return this.post("/converter/validate/gwf", { content });
  }


  /**
   * Рендеринг ScS → PlantUML код + изображение
   * @param {string} scsContent - ScS контент
   * @param {'png'|'svg'} format - Формат изображения
   * @returns {Promise<{plantuml_code: string, image: string, format: string}>}
   */
  async renderScsToPlantUml(scsContent, format = "png") {
    return this.post("/plantuml/render/scs", {
      content: scsContent,
      format,
    });
  }

  /**
   * Рендеринг GWF → PlantUML код + изображение
   * @param {string} gwfContent - GWF XML контент
   * @param {'png'|'svg'} format - Формат изображения
   * @returns {Promise<{plantuml_code: string, image: string, format: string}>}
   */
  async renderGwfToPlantUml(gwfContent, format = "png") {
    return this.post("/plantuml/render/gwf", {
      content: gwfContent,
      format,
    });
  }

 
  /**
   * Получить список чатов текущего пользователя
   * @returns {Promise<Array<{id: string, title: string, preview: string, created_at: string}>>}
   */
  async getChats() {
    return this.get("/assistant/chats");
  }

  /**
   * Создать чат
   * @param {string} title - Заголовок чата
   * @returns {Promise<{id: string, title: string, created_at: string}>}
   */
  async createChat(title) {
    return this.post("/assistant/chats", { title });
  }

  /**
   * Получить сообщения чата
   * @param {string} chatId - ID чата
   * @returns {Promise<Array<{role: string, content: string, timestamp: string}>>}
   */
  async getChatMessages(chatId) {
    return this.get(`/assistant/chats/${chatId}/messages`);
  }

  /**
   * Отправить сообщение в чат
   * @param {string} chatId - ID чата
   * @param {string} message - Текст сообщения
   * @param {string} mode - Режим (assistant/analyst)
   * @returns {Promise<{message: string, chat_id: string, response: string}>}
   */
  async sendMessage(chatId, message, mode = "assistant") {
    return this.post("/assistant/chat", {
      chat_id: chatId,
      message,
      mode,
    });
  }

  /**
   * Удалить чат
   * @param {string} chatId - ID чата
   * @returns {Promise<{success: boolean}>}
   */
  async deleteChat(chatId) {
    return this.delete(`/assistant/chats/${chatId}`);
  }

  /**
   * Обновить заголовок чата
   * @param {string} chatId - ID чата
   * @param {string} title - Новый заголовок
   * @returns {Promise<{success: boolean}>}
   */
  async updateChatTitle(chatId, title) {
    return this.put(`/assistant/chats/${chatId}`, { title });
  }

  /**
   * Экспорт чата
   * @param {string} chatId - ID чата
   * @param {'txt'|'json'|'md'} format - Формат экспорта
   * @returns {Promise<Blob>}
   */
  async exportChat(chatId, format = "txt") {
    return this.get(`/assistant/chats/${chatId}/export?format=${format}`);
  }

  /**
   * Получить доступные провайдеры AI
   * @returns {Promise<Array<{id: string, name: string}>>}
   */
  async getProviders() {
    return this.get("/assistant/providers");
  }

  /**
   * Получить модели для провайдера
   * @param {string} provider - ID провайдера
   * @returns {Promise<Array<string>>}
   */
  async getModels(provider) {
    return this.get(
      `/assistant/models?provider=${encodeURIComponent(provider)}`,
    );
  }


  /**
   * Получить настройки текущего пользователя
   * @returns {Promise<{provider: string, model: string, auto_save: boolean, api_key?: string}>}
   */
  async getSettings() {
    return this.get("/settings");
  }

  /**
   * Сохранить настройки текущего пользователя
   * @param {Object} settings - Настройки
   * @returns {Promise<{success: boolean}>}
   */
  async saveSettings(settings) {
    return this.post("/settings", settings);
  }


  /**
   * Сохранить сессию текущего пользователя
   * @param {Object} sessionData - Данные сессии
   * @returns {Promise<{success: boolean, session_id: string}>}
   */
  async saveSession(sessionData) {
    return this.post("/session/save", sessionData);
  }

  /**
   * Загрузить сессию текущего пользователя
   * @returns {Promise<{editor_type: string, editor_content: string, timestamp: string}>}
   */
  async loadSession() {
    return this.get("/session/load");
  }


  /**
   * Проверка доступности сервера
   * @returns {Promise<{status: string, version: string}>}
   */
  async checkHealth() {
    return this.get("/health");
  }

  /**
   * Старый метод render (обратно совместимость)
   * @deprecated Используйте renderScsToPlantUml или renderGwfToPlantUml
   */
  async render(content, type = "scs", format = "png") {
    return this.post("/render", { content, type, format });
  }
}

// Создаём глобальный экземпляр
const apiClient = new ApiClient();

// Экспорт для браузера
if (typeof window !== "undefined") {
  window.ApiClient = ApiClient;
  window.apiClient = apiClient;
}

// Экспорт для Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ApiClient, apiClient };
}
