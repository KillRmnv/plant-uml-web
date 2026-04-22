/**
 * App - Main application controller
 * PlantUML Web - SCg Editor
 */

class App {
  constructor() {
    this.panelSystem = null;
    this.editorManager = null;
    this.assistantPanel = null;
    this.settingsModal = null;
    this.renderFactory = null;
    this.autoSaveTimer = null;
    this.authManager = null;

    this.init();
  }

  async init() {
    console.log("[App] Initializing...");

    const hasAccess = await this.initAuth();
    if (!hasAccess) {
      return;
    }
    this.initApiClient();
    this.initPanelSystem();
    this.initRenderFactory();
    this.initEditor();
    this.initAssistant();
    this.initSettings();
    this.initSession();
    this.initEventListeners();

    console.log("[App] Initialization complete");
  }

  /**
   * Инициализация аутентификации
   */
  async initAuth() {
    // AuthManager уже инициализирован в auth-manager.js
    this.authManager = window.authManager || new AuthManager();
    if (this.authManager.ready) {
      await this.authManager.ready;
    }

    console.log(
      "[App.initAuth] isAuthenticated:",
      this.authManager.isAuthenticated,
    );
    console.log("[App.initAuth] isGuestMode:", this.authManager.isGuestMode());

    // Проверка авторизации - если нет, редирект на auth.html
    if (!this.authManager.isAuthenticated && !this.authManager.isGuestMode()) {
      console.log("[App] Not authenticated, redirecting to auth...");
      // Сохраняем текущий URL для редиректа после логина
      this.authManager.redirectUrl = window.location.pathname;
      this.authManager.redirectToAuth();
      return false;
    }

    console.log("[App.initAuth] Access granted");

    // Обновляем UI пользователя
    this.updateUserUI();

    // Подписка на события аутентификации
    window.addEventListener("auth:error", () => {
      this.updateUserUI();
    });

    return true;
  }

  /**
   * Обновление UI пользователя
   */
  updateUserUI() {
    const userNameEl = document.getElementById("user-name");
    const userIndicatorEl = document.getElementById("user-indicator");
    const btnLogout = document.getElementById("btn-logout");

    if (!userNameEl || !userIndicatorEl || !btnLogout) return;

    if (this.authManager?.isAuthenticated) {
      const username = this.authManager.getUsername();
      userNameEl.textContent = username;
      userIndicatorEl.classList.add("authenticated");
      userIndicatorEl.title = `Logged in as ${username}`;
      btnLogout.style.display = "flex";
    } else if (this.authManager?.isGuestMode()) {
      userNameEl.textContent = "Guest";
      userIndicatorEl.classList.remove("authenticated");
      userIndicatorEl.title = "Guest mode";
      btnLogout.style.display = "flex";
    } else {
      userNameEl.textContent = "Guest";
      userIndicatorEl.classList.remove("authenticated");
      userIndicatorEl.title = "Not logged in";
      btnLogout.style.display = "none";
    }
  }

  initApiClient() {
    this.apiClient = apiClient;
  }

  initPanelSystem() {
    const container = document.getElementById("panel-container");
    if (!container) {
      console.error("[App] Panel container not found!");
      return;
    }
    this.panelSystem = new PanelSystem(container);
    this.panelSystem.loadPanelState();
  }

  initRenderFactory() {
    this.renderFactory = new RenderFactory(this.apiClient);
  }

  initEditor() {
    const editorContainer = this.panelSystem.getPanelContent("editor");

    this.editorManager = new EditorManager(editorContainer, {
      onChange: (type, value) => this.onEditorChange(type, value),
      onSwitch: (type) => this.onEditorSwitch(type),
    });
  }

  initAssistant() {
    const assistantContainer = this.panelSystem.getPanelContent("assistant");
    this.assistantPanel = new AssistantPanel(assistantContainer, {
      apiClient: this.apiClient,
      authManager: this.authManager,
      app: this,
    });
  }

  initSettings() {
    // Guests cannot access settings - block access
    if (this.authManager?.isGuestMode()) {
      console.log("[App] Guest mode - settings blocked");
      // Disable settings button for guests
      const btnSettings = document.getElementById("btn-settings");
      if (btnSettings) {
        btnSettings.disabled = true;
        btnSettings.title = "Доступно после входа";
        btnSettings.style.opacity = "0.5";
        btnSettings.style.pointerEvents = "none";
      }
      return;
    }

    // Only authenticated users can access settings
    const modalContainer = document.getElementById("modal-container");
    this.settingsModal = new SettingsModal(modalContainer, {
      onSave: (settings) => this.onSettingsSave(settings),
      apiClient: this.apiClient,
    });
    if (!this.apiClient) {
      this.settingsModal.setApiClient(this.apiClient);
    }
  }

  initSession() {
    this.loadSession();

    window.addEventListener("beforeunload", () => {
      this.saveSession();
    });
  }

  initEventListeners() {
    document.getElementById("btn-settings").addEventListener("click", () => {
      this.settingsModal.show();
    });

    document.getElementById("btn-render").addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.showRenderPopup();
    });

    document.getElementById("btn-save").addEventListener("click", () => {
      this.saveSession();
      this.showStatus("Session saved", "success");
    });

    document.getElementById("btn-clear").addEventListener("click", () => {
      this.clearSession();
    });

    document.getElementById("btn-save-scs").addEventListener("click", () => {
      this.saveScsToFile();
    });

    document.getElementById("btn-load-scs").addEventListener("click", () => {
      this.loadScsFromFile();
    });

    document.getElementById("btn-sync-scweb").addEventListener("click", () => {
      this.syncFromScWeb();
    });

    document.getElementById("btn-logout").addEventListener("click", () => {
      this.handleLogout();
    });

    this.initRenderPopupListeners();

    const toolbarBtns = document.querySelectorAll(".toolbar-btn[data-mode]");
    toolbarBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const mode = btn.dataset.mode;
        if (mode === "scs" || mode === "scweb") {
          this.editorManager.switchTo(mode);
        }
      });
    });
  }

  initRenderPopupListeners() {
    const popup = document.getElementById("render-popup");
    const input = document.getElementById("structure-name-input");
    const closeBtn = document.getElementById("render-popup-close");
    const cancelBtn = document.getElementById("render-popup-cancel");
    const submitBtn = document.getElementById("render-popup-submit");
    const errorEl = document.getElementById("render-popup-error");

    closeBtn.addEventListener("click", () => this.hideRenderPopup());
    cancelBtn.addEventListener("click", () => this.hideRenderPopup());

    submitBtn.addEventListener("click", async () => {
      const structureName = input.value.trim();
      if (!structureName) {
        errorEl.textContent = "Введите название структуры";
        errorEl.style.display = "block";
        return;
      }
      errorEl.style.display = "none";
      this.hideRenderPopup();
      await this.renderWithStructureName(structureName);
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        submitBtn.click();
      } else if (e.key === "Escape") {
        this.hideRenderPopup();
      }
    });

    document.addEventListener("click", (e) => {
      if (popup.style.display !== "none" && !popup.contains(e.target) && e.target.id !== "btn-render") {
        this.hideRenderPopup();
      }
    });
  }

  showRenderPopup() {
    const popup = document.getElementById("render-popup");
    const input = document.getElementById("structure-name-input");
    const errorEl = document.getElementById("render-popup-error");

    input.value = "";
    errorEl.style.display = "none";
    popup.style.display = "block";
    input.focus();
  }

  hideRenderPopup() {
    const popup = document.getElementById("render-popup");
    popup.style.display = "none";
  }

  onEditorChange(type, value) {
    if (this.settings?.autoSave) {
      clearTimeout(this.autoSaveTimer);
      this.autoSaveTimer = setTimeout(() => {
        this.saveSession();
      }, Config.EDITOR.AUTO_SAVE_DELAY);
    }
  }

  onEditorSwitch(type) {
    console.log("[App] Editor switched to:", type);
  }

  onSettingsSave(settings) {
    this.settings = settings;
    this.showStatus("Settings saved", "success");
  }

  async renderWithStructureName(structureName) {
    const imagePanel = this.panelSystem.getPanelContent("image");

    const loadingHtml = `
            <div class="loading-overlay">
                <div class="spinner"></div>
            </div>
            <div class="image-placeholder">
                <svg class="image-placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                <div class="image-placeholder-text">Rendering...</div>
            </div>
        `;

    imagePanel.innerHTML = loadingHtml;

    try {
      const editorType = this.editorManager.currentEditor;
      const renderType = editorType === "scweb" ? "scg" : editorType;
      console.log("[App.renderWithStructureName] editorType:", editorType);
      console.log("[App.renderWithStructureName] renderType:", renderType);
      console.log("[App.renderWithStructureName] renderFactory strategies:", Object.keys(this.renderFactory.strategies));
      console.log("[App.renderWithStructureName] structureName:", structureName);
      let result;

      if (editorType === "scs") {
        const content = this.editorManager.getValue();
        if (!content) {
          imagePanel.innerHTML = `
                    <div class="image-placeholder">
                        <svg class="image-placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                        <div class="image-placeholder-text">No content to render</div>
                        <div class="image-placeholder-hint">Enter some content in the editor</div>
                    </div>
                `;
          return;
        }
        result = await this.renderFactory.renderWithStructureName(
          renderType,
          content,
          structureName,
          { format: Config.RENDER.DEFAULT_FORMAT }
        );
      } else {
        result = await this.renderFactory.renderOnlyStructureName(renderType, structureName, {
          format: Config.RENDER.DEFAULT_FORMAT,
        });
      }

      this.lastPlantumlCode = (result && result.plantuml_code) ? result.plantuml_code : '';

      if (result && result.image_base64) {
        imagePanel.innerHTML = `
                    <div class="image-scroll-container">
                        <div class="image-controls">
                            <button class="zoom-in" title="Zoom In">+</button>
                            <button class="zoom-out" title="Zoom Out">−</button>
                            <button class="zoom-fit" title="Fit to Panel">⊡</button>
                            <button class="zoom-100" title="Reset Zoom">1:1</button>
                        </div>
                        <img class="image-preview" src="data:image/png;base64,${result.image_base64}" alt="Rendered graph">
                    </div>
                `;
        const container = imagePanel.querySelector('.image-scroll-container');
        const img = container.querySelector('.image-preview');
        container.classList.add('fit-mode');
        this._imageZoomState = { scale: 1 };
        this._initDragToScroll(container);
        this._initImageZoom(container, img);
      } else {
        imagePanel.innerHTML = `
                    <div class="image-placeholder">
                        <svg class="image-placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <div class="image-placeholder-text">Empty result</div>
                    </div>
                `;
      }
    } catch (error) {
      console.error("[App] Render error:", error);
      imagePanel.innerHTML = `
                <div class="error-message">
                    Render error: ${error.message}
                </div>
            `;
    }
  }

  saveSession() {
    const session = {
      editorType: this.editorManager?.currentEditor,
      editorContent: this.editorManager?.getValue(),
      timestamp: new Date().toISOString(),
    };

    try {
      localStorage.setItem(
        Config.STORAGE_KEYS.SESSION,
        JSON.stringify(session),
      );
    } catch (e) {
      console.warn("[App] Failed to save session:", e);
    }
  }

  loadSession() {
    try {
      const saved = localStorage.getItem(Config.STORAGE_KEYS.SESSION);
      if (saved) {
        const session = JSON.parse(saved);

        if (session.editorType && session.editorContent !== undefined) {
          this.editorManager?.switchTo(session.editorType);
          this.editorManager?.setValue(session.editorContent);
        }

        console.log("[App] Session loaded from:", session.timestamp);
      }
    } catch (e) {
      console.warn("[App] Failed to load session:", e);
    }
  }

  clearSession() {
    try {
      localStorage.removeItem(Config.STORAGE_KEYS.SESSION);

      this.editorManager?.setValue("");

      const imagePanel = this.panelSystem.getPanelContent("image");
      imagePanel.innerHTML = `
                <div class="image-placeholder">
                    <svg class="image-placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                    <div class="image-placeholder-text">Session cleared</div>
                    <div class="image-placeholder-hint">Click Render to generate image</div>
                </div>
            `;

      this.showStatus("Session cleared", "success");
    } catch (e) {
      console.warn("[App] Failed to clear session:", e);
    }
  }

  saveScsToFile() {
    const content = this.editorManager.getValue();
    if (!content) {
      this.showStatus("Nothing to save", "warning");
      return;
    }

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "graph.scs";
    a.click();
    URL.revokeObjectURL(url);

    this.showStatus("SCS saved to file", "success");
  }

  loadScsFromFile() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".scs";

    input.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target.result;
        this.editorManager.setValue(content);
        this.showStatus("SCS loaded from file", "success");
      };
      reader.readAsText(file);
    });

    input.click();
  }

  syncFromScWeb() {
    const iframe = document.querySelector(".scweb-editor-wrapper iframe");
    if (!iframe || !iframe.contentWindow) {
      this.showStatus("SC-Web not loaded", "error");
      return;
    }

    try {
      const gwfContent = iframe.contentWindow.getGwfContent();
      if (!gwfContent) {
        this.showStatus("Failed to get graph from SC-Web", "error");
        return;
      }

      this.showStatus("Synced from SC-Web (GWF received)", "success");
      console.log("[App] GWF content:", gwfContent.substring(0, 200) + "...");
    } catch (err) {
      this.showStatus("Error syncing: " + err.message, "error");
    }
  }

  /**
   * Обработка logout
   */
  async handleLogout() {
    if (this.authManager?.isGuestMode()) {
      // Выход из гостевого режима
      this.authManager.guestLogout();
      this.showStatus("Guest session ended", "info");
      // Редирект на страницу входа
      setTimeout(() => {
        window.location.href = "index.html";
      }, 500);
    } else {
      // Логаут авторизованного пользователя
      const confirmed = confirm("Are you sure you want to logout?");
      if (!confirmed) return;

      try {
        await this.authManager?.logout();
        this.showStatus("Logged out successfully", "success");
        // Редирект на страницу входа
        setTimeout(() => {
          window.location.href = "index.html";
        }, 500);
      } catch (error) {
        console.error("[App] Logout error:", error);
        this.showStatus("Logout error: " + error.message, "error");
      }
    }

    this.updateUserUI();
  }

  showStatus(message, type = "info") {
    const statusElement = document.getElementById("status-message");
    if (statusElement) {
      statusElement.textContent = message;

      setTimeout(() => {
        statusElement.textContent = "";
      }, 3000);
    }
  }

  _initDragToScroll(container) {
    let isDown = false;
    let startX, startY, scrollLeft, scrollTop;

    container.addEventListener('mousedown', (e) => {
      isDown = true;
      container.style.cursor = 'grabbing';
      startX = e.pageX - container.offsetLeft;
      startY = e.pageY - container.offsetTop;
      scrollLeft = container.scrollLeft;
      scrollTop = container.scrollTop;
    });

    container.addEventListener('mouseleave', () => {
      isDown = false;
      container.style.cursor = 'grab';
    });

    container.addEventListener('mouseup', () => {
      isDown = false;
      container.style.cursor = 'grab';
    });

    container.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - container.offsetLeft;
      const y = e.pageY - container.offsetTop;
      const walkX = (x - startX) * 1.5;
      const walkY = (y - startY) * 1.5;
      container.scrollLeft = scrollLeft - walkX;
      container.scrollTop = scrollTop - walkY;
    });
  }

  _initImageZoom(container, img) {
    const state = this._imageZoomState;

    container.querySelector('.zoom-in').addEventListener('click', () => {
      state.scale = Math.min(state.scale + 0.25, 3);
      img.style.transform = `scale(${state.scale})`;
    });

    container.querySelector('.zoom-out').addEventListener('click', () => {
      state.scale = Math.max(state.scale - 0.25, 0.25);
      img.style.transform = `scale(${state.scale})`;
    });

    container.querySelector('.zoom-fit').addEventListener('click', () => {
      container.classList.add('fit-mode');
      img.style.transform = 'scale(1)';
      state.scale = 1;
    });

    container.querySelector('.zoom-100').addEventListener('click', () => {
      container.classList.remove('fit-mode');
      img.style.transform = 'scale(1)';
      state.scale = 1;
    });

    img.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      state.scale = Math.max(0.25, Math.min(3, state.scale + delta));
      img.style.transform = `scale(${state.scale})`;
    }, { passive: false });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.app = new App();
});
