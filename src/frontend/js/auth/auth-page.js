/**
 * Auth Page - Login/Register Page Logic
 * PlantUML Web SCg Editor
 */

class AuthPage {
  constructor() {
    this.authManager = window.authManager;
    this.apiClient = window.apiClient;

    this.elements = {};
    this.state = {
      isLoading: false,
      loginMode: "login", // 'login' или 'register'
    };

    this.init();
  }

  /**
   * Инициализация
   */
  async init() {
    console.log("[AuthPage] Initializing...");

    this.cacheElements();
    this.bindEvents();
    if (this.authManager?.ready) {
      await this.authManager.ready;
    }

    // Если уже авторизованы - редирект
    if (this.authManager.isAuthenticated) {
      this.authManager.redirectToMain();
      return;
    }
  }

  /**
   * Кэширование элементов
   */
  cacheElements() {
    // Карточки
    this.elements.loginCard = document.getElementById("login-card");
    this.elements.registerCard = document.getElementById("register-card");
    this.elements.loadingCard = document.getElementById("loading-card");

    // Формы
    this.elements.loginForm = document.getElementById("login-form");
    this.elements.registerForm = document.getElementById("register-form");

    // Инпуты
    this.elements.loginUsername = document.getElementById("login-username");
    this.elements.loginPassword = document.getElementById("login-password");
    this.elements.rememberMe = document.getElementById("remember-me");

    this.elements.registerUsername =
      document.getElementById("register-username");
    this.elements.registerEmail = document.getElementById("register-email");
    this.elements.registerPassword =
      document.getElementById("register-password");
    this.elements.registerConfirm = document.getElementById("register-confirm");

    // Кнопки
    this.elements.loginSubmit = document.getElementById("login-submit");
    this.elements.registerSubmit = document.getElementById("register-submit");

    // Сообщения
    this.elements.loginMessage = document.getElementById("login-message");
    this.elements.registerMessage = document.getElementById("register-message");

    // Ссылки переключения
    this.elements.showRegister = document.getElementById("show-register");
    this.elements.showLogin = document.getElementById("show-login");
    this.elements.guestLogin = document.getElementById("guest-login");

    // Password toggles
    this.elements.passwordToggles =
      document.querySelectorAll(".password-toggle");

    // Password strength
    this.elements.strengthBar = document.querySelector(".strength-bar");
    this.elements.strengthText = document.querySelector(".strength-text");
    this.elements.passwordMatchHint = document.getElementById(
      "password-match-hint",
    );
  }

  /**
   * Привязка событий
   */
  bindEvents() {
    // Формы
    this.elements.loginForm?.addEventListener("submit", (e) =>
      this.handleLogin(e),
    );
    this.elements.registerForm?.addEventListener("submit", (e) =>
      this.handleRegister(e),
    );

    // Переключение между login/register
    this.elements.showRegister?.addEventListener("click", (e) => {
      e.preventDefault();
      this.showRegister();
    });

    this.elements.showLogin?.addEventListener("click", (e) => {
      e.preventDefault();
      this.showLogin();
    });

    // Гостевой вход
    this.elements.guestLogin?.addEventListener("click", (e) => {
      e.preventDefault();
      this.handleGuestLogin();
    });

    // Password visibility toggle
    this.elements.passwordToggles.forEach((toggle) => {
      toggle.addEventListener("click", () =>
        this.togglePasswordVisibility(toggle),
      );
    });

    // Password strength checker
    this.elements.registerPassword?.addEventListener("input", (e) => {
      this.checkPasswordStrength(e.target.value);
    });

    // Password match check
    this.elements.registerConfirm?.addEventListener("input", (e) => {
      this.checkPasswordMatch();
    });

    // Enter key в инпутах
    document.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.target.tagName === "INPUT") {
        e.preventDefault();
      }
    });
  }

  /**
   * Обработка логина
   * @param {Event} e
   */
  async handleLogin(e) {
    e.preventDefault();

    const username = this.elements.loginUsername.value.trim();
    const password = this.elements.loginPassword.value;
    const rememberMe = this.elements.rememberMe.checked;

    if (!username || !password) {
      this.showLoginMessage("Please enter username and password", "error");
      return;
    }

    this.setLoading("login", true);

    try {
      await this.authManager.login(username, password, rememberMe);

      this.showLoginMessage("Login successful! Redirecting...", "success");

      // Небольшая задержка для показа сообщения
      setTimeout(() => {
        this.authManager.redirectToMain();
      }, 1000);
    } catch (error) {
      console.error("[AuthPage] Login error:", error);
      this.showLoginMessage(
        error.message || "Login failed. Please try again.",
        "error",
      );
    } finally {
      this.setLoading("login", false);
    }
  }

  /**
   * Обработка регистрации
   * @param {Event} e
   */
  async handleRegister(e) {
    e.preventDefault();

    const username = this.elements.registerUsername.value.trim();
    const password = this.elements.registerPassword.value;
    const confirmPassword = this.elements.registerConfirm.value;
    const email = this.elements.registerEmail.value.trim() || undefined;

    // Валидация
    if (!username || !password) {
      this.showRegisterMessage("Please fill in all required fields", "error");
      return;
    }

    if (username.length < 3) {
      this.showRegisterMessage(
        "Username must be at least 3 characters",
        "error",
      );
      return;
    }

    if (password.length < 6) {
      this.showRegisterMessage(
        "Password must be at least 6 characters",
        "error",
      );
      return;
    }

    if (password !== confirmPassword) {
      this.showRegisterMessage("Passwords do not match", "error");
      return;
    }

    this.setLoading("register", true);

    try {
      await this.authManager.register(username, password, email);

      this.showRegisterMessage(
        "Registration successful! Redirecting to login...",
        "success",
      );

      // Очищаем форму
      this.elements.registerForm.reset();

      // Переключаем на login через 1.5 секунды
      setTimeout(() => {
        this.showLogin();
      }, 1500);
    } catch (error) {
      console.error("[AuthPage] Registration error:", error);
      this.showRegisterMessage(
        error.message || "Registration failed. Please try again.",
        "error",
      );
    } finally {
      this.setLoading("register", false);
    }
  }

  /**
   * Гостевой вход
   */
  handleGuestLogin() {
    console.log("[AuthPage] Guest login clicked");
    this.authManager.guestLogin();
  }

  /**
   * Показать login форму
   */
  showLogin() {
    this.elements.loginCard.classList.remove("hidden");
    this.elements.registerCard.classList.add("hidden");
    this.state.loginMode = "login";

    // Фокус на username
    setTimeout(() => {
      this.elements.loginUsername?.focus();
    }, 100);
  }

  /**
   * Показать register форму
   */
  showRegister() {
    this.elements.registerCard.classList.remove("hidden");
    this.elements.loginCard.classList.add("hidden");
    this.state.loginMode = "register";

    // Фокус на username
    setTimeout(() => {
      this.elements.registerUsername?.focus();
    }, 100);
  }

  /**
   * Toggle password visibility
   * @param {HTMLElement} toggle
   */
  togglePasswordVisibility(toggle) {
    const wrapper = toggle.closest(".password-wrapper");
    const input = wrapper.querySelector("input");

    if (input.type === "password") {
      input.type = "text";
      toggle.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
            `;
    } else {
      input.type = "password";
      toggle.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                </svg>
            `;
    }
  }

  /**
   * Проверка сложности пароля
   * @param {string} password
   */
  checkPasswordStrength(password) {
    let strength = 0;
    let text = "";

    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    // Обновляем UI
    this.elements.strengthBar.className = "strength-bar";

    if (strength <= 2) {
      this.elements.strengthBar.classList.add("weak");
      text = "Weak";
    } else if (strength <= 4) {
      this.elements.strengthBar.classList.add("medium");
      text = "Medium";
    } else {
      this.elements.strengthBar.classList.add("strong");
      text = "Strong";
    }

    this.elements.strengthText.textContent = text;
  }

  /**
   * Проверка совпадения паролей
   */
  checkPasswordMatch() {
    const password = this.elements.registerPassword.value;
    const confirm = this.elements.registerConfirm.value;

    if (!confirm) {
      this.elements.passwordMatchHint.textContent = "";
      this.elements.passwordMatchHint.className = "form-hint";
      return;
    }

    if (password === confirm) {
      this.elements.passwordMatchHint.textContent = "✓ Passwords match";
      this.elements.passwordMatchHint.className = "form-hint success";
    } else {
      this.elements.passwordMatchHint.textContent = "✗ Passwords do not match";
      this.elements.passwordMatchHint.className = "form-hint error";
    }
  }

  /**
   * Установка режима загрузки
   * @param {'login'|'register'} mode
   * @param {boolean} loading
   */
  setLoading(mode, loading) {
    this.state.isLoading = loading;

    if (mode === "login") {
      const btnText = this.elements.loginSubmit.querySelector(".btn-text");
      const btnLoading =
        this.elements.loginSubmit.querySelector(".btn-loading");

      if (loading) {
        btnText.classList.add("hidden");
        btnLoading.classList.remove("hidden");
        this.elements.loginSubmit.disabled = true;
      } else {
        btnText.classList.remove("hidden");
        btnLoading.classList.add("hidden");
        this.elements.loginSubmit.disabled = false;
      }
    } else if (mode === "register") {
      const btnText = this.elements.registerSubmit.querySelector(".btn-text");
      const btnLoading =
        this.elements.registerSubmit.querySelector(".btn-loading");

      if (loading) {
        btnText.classList.add("hidden");
        btnLoading.classList.remove("hidden");
        this.elements.registerSubmit.disabled = true;
      } else {
        btnText.classList.remove("hidden");
        btnLoading.classList.add("hidden");
        this.elements.registerSubmit.disabled = false;
      }
    }
  }

  /**
   * Показать сообщение в login форме
   * @param {string} message
   * @param {'success'|'error'} type
   */
  showLoginMessage(message, type) {
    this.elements.loginMessage.textContent = message;
    this.elements.loginMessage.className = `auth-message ${type}`;
    this.elements.loginMessage.classList.remove("hidden");

    // Скрыть через 5 секунд
    setTimeout(() => {
      this.elements.loginMessage.classList.add("hidden");
    }, 5000);
  }

  /**
   * Показать сообщение в register форме
   * @param {string} message
   * @param {'success'|'error'} type
   */
  showRegisterMessage(message, type) {
    this.elements.registerMessage.textContent = message;
    this.elements.registerMessage.className = `auth-message ${type}`;
    this.elements.registerMessage.classList.remove("hidden");

    // Скрыть через 5 секунд
    setTimeout(() => {
      this.elements.registerMessage.classList.add("hidden");
    }, 5000);
  }
}

// Инициализация после загрузки DOM
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    console.log("[AuthPage] DOM loaded, initializing...");
    window.authPage = new AuthPage();
  });
} else {
  console.log("[AuthPage] DOM already loaded, initializing...");
  window.authPage = new AuthPage();
}
