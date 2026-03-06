console.log("[Custom] ===== main.js НАЧАЛО ЗАГРУЗКИ =====");
console.log("[Custom] SCWeb:", typeof SCWeb);
console.log("[Custom] SCWeb.ui:", typeof SCWeb?.ui);
console.log("[Custom] SCWeb.ui.WindowManager:", typeof SCWeb?.ui?.WindowManager);
console.log("[Custom] SCWeb.core:", typeof SCWeb?.core);
console.log("[Custom] SCWeb.core.Main:", typeof SCWeb?.core?.Main);

// Константы SCgEditMode, SCgViewMode, editModes, viewModes, ScClientCreate
// уже объявлены в оригинальном sc-web/core/main.js

// Переопределение SCWeb.ui.WindowManager.appendHistoryItem
// Добавляем логику выбора scg_code формата по умолчанию
console.log("[Custom] Проверка условия для WindowManager.appendHistoryItem:");
console.log("[Custom]   typeof SCWeb !== 'undefined':", typeof SCWeb !== "undefined");
console.log("[Custom]   SCWeb.ui:", SCWeb?.ui);
console.log("[Custom]   SCWeb.ui.WindowManager:", SCWeb?.ui?.WindowManager);
console.log("[Custom]   SCWeb.ui.WindowManager.appendHistoryItem:", typeof SCWeb?.ui?.WindowManager?.appendHistoryItem);

if (typeof SCWeb !== "undefined" && SCWeb.ui && SCWeb.ui.WindowManager && SCWeb.ui.WindowManager.appendHistoryItem) {
  console.log("[Custom] ===== ПЕРЕОПРЕДЕЛЯЕМ WindowManager.appendHistoryItem =====");
  
  // Сохраняем оригинальную функцию
  var originalAppendHistoryItem = SCWeb.ui.WindowManager.appendHistoryItem;
  console.log("[Custom] Оригинальная функция:", originalAppendHistoryItem);
  
  // Переопределяем
  SCWeb.ui.WindowManager.appendHistoryItem = function(action_addr, command_state) {
    console.log("[Custom WM] ===== МОЁ ПЕРЕОПРЕДЕЛЕНИЕ ВЫЗВАНО =====");
    console.log("[Custom WM] appendHistoryItem вызван");
    console.log("[Custom WM] action_addr:", action_addr);
    console.log("[Custom WM] command_state до:", JSON.stringify(command_state));
    console.log("[Custom WM] viewMode:", SCWeb.core.Main.viewMode);
    console.log("[Custom WM] editMode:", SCWeb.core.Main.editMode);
    
    // Если формат не установлен, проверяем режим
    if (!command_state.format) {
      // Всегда используем scg_code по умолчанию
      var useScgMode = true;
      console.log("[Custom WM] useScgMode:", useScgMode);
      
      if (useScgMode) {
        // Ищем scg_code формат среди фабрик
        var factories = SCWeb.core.ComponentManager._factories_fmt;
        console.log("[Custom WM] Поиск scg_code среди фабрик...");
        for (var fmt in factories) {
          console.log("[Custom WM] Формат:", fmt, "ext_lang:", factories[fmt].ext_lang);
          if (factories[fmt].ext_lang === 'scg_code') {
            command_state.format = fmt;
            console.log("[Custom WM] Используем scg_code формат:", fmt);
            break;
          }
        }
      }
    }
    
    console.log("[Custom WM] command_state после:", command_state);
    // Вызываем оригинальную функцию
    return originalAppendHistoryItem.call(this, action_addr, command_state);
  };
}

// Переопределение SCWeb.ui.Core.init для минимальной версии
// Отключаем: Menu, ArgumentsPanel, UserPanel, LanguagePanel, ExpertModePanel
if (typeof SCWeb !== "undefined" && SCWeb.ui && SCWeb.ui.Core) {
  var originalCoreInit = SCWeb.ui.Core.init;
  SCWeb.ui.Core.init = function (data) {
    console.log("[Minimal] Инициализация упрощенного UI...");
    return new Promise((resolve) => {
      Promise.all([
        // Отключено:
        // SCWeb.ui.Menu.init(data),
        // SCWeb.ui.ArgumentsPanel.init(),
        // SCWeb.ui.UserPanel.init(data),
        // SCWeb.ui.LanguagePanel.init(data),
        // SCWeb.ui.ExpertModePanel.init(),

        // Оставлено:
        SCWeb.ui.WindowManager.init(data),
        SCWeb.ui.SearchPanel.init(),
        SCWeb.ui.KeyboardHandler.init(SCWeb.ui.WindowManager),
        SCWeb.ui.Core.resolveElementsAddr("body"),
      ]).then(function () {
        $("#search-panel").removeClass("no_display");
        console.log("[Minimal] UI инициализирован");
        resolve();
      });
    });
  };
}

console.log("[Custom] ===== ПЕРЕОПРЕДЕЛЯЕМ SCWeb.core.Main =====");

SCWeb.core.Main = {
  editMode: 0,
  viewMode: 0,
  window_types: [],
  idtf_modes: [],
  menu_commands: {},
  default_cmd_str: "ui_menu_view_full_semantic_neighborhood",

  /**
   * Initialize sc-web core and ui
   * @param {Object} params Initialization parameters.
   * There are required parameters:
   * - menu_container_id - id of dom element, that will contain menu items
   */
  init: function (params) {
    console.log("[Custom Main] ===== init ВЫЗВАН =====");
    console.log("[Custom Main] params:", params);
    return new Promise((resolve) => {
      const self = this;
      SCWeb.core.Server._initialize();
      ScClientCreate().then(function (client) {
        window.scClient = client;
        window.scHelper = new ScHelper(window.scClient);
        window.scKeynodes = new ScKeynodes(window.scHelper);

        window.scKeynodes.init().then(function () {
          window.scHelper.init().then(function () {
            // TaskPanel отключен для минимальной версии
            // SCWeb.ui.TaskPanel.init().then(function () {
            SCWeb.core.Server.init(function (data) {
              self.parseUrl(data, params).then(resolve);
            });
            // });
          });
        });
      });
    });
  },

  parseUrl: async function (data, params) {
    console.log("[Custom] ===== parseUrl ВЫЗВАН =====");
    const url = parseURL(window.location.href);

    console.log("[Custom] URL:", window.location.href);
    console.log("[Custom] url.searchObject:", url.searchObject);

    url.searchObject.view_mode =
      viewModes[url.searchObject.view_mode] ?? SCgViewMode.DefaultSCgView;

    // backward compatibility [mode <- edit_mode]
    url.searchObject.edit_mode = url.searchObject.edit_mode
      ? url.searchObject.edit_mode
      : url.searchObject.mode;
    url.searchObject.edit_mode =
      editModes[url.searchObject.edit_mode] ?? SCgEditMode.SCgModeSelect;

    console.log("[Custom] view_mode после:", url.searchObject.view_mode);
    console.log("[Custom] edit_mode после:", url.searchObject.edit_mode);

    this.menu_commands = data.menu_commands;
    this.user = data.user;
    data.menu_container_id = params.menu_container_id;

    // Устанавливаем режим по умолчанию в SCG (графический режим)
    // если не указан в URL
    console.log("[Custom] URL searchObject:", url.searchObject);
    console.log("[Custom] view_mode из URL:", url.searchObject.view_mode);
    console.log("[Custom] edit_mode из URL:", url.searchObject.edit_mode);
    
    if (!url.searchObject.view_mode && !url.searchObject.edit_mode) {
      console.log("[Custom] Режим не указан в URL, устанавливаем SCG по умолчанию");
      this.viewMode = 0; // DefaultSCgView
      this.editMode = 0; // SCgModeSelect
    } else {
      this.viewMode = url.searchObject.view_mode;
      this.editMode = url.searchObject.edit_mode;
    }
    console.log("[Custom] viewMode установлен:", this.viewMode);
    console.log("[Custom] editMode установлен:", this.editMode);

    SCWeb.core.Translation.fireLanguageChanged(this.user.current_lang);

    // Авто-открытие страницы включено
    if (!url.searchObject || !SCWeb.core.Main.pageShowedForUrlParameters(url.searchObject)) {
      SCWeb.core.Main.showDefaultPage(params).then(null);
    }

    await Promise.all([
      SCWeb.ui.Core.init(data),
      SCWeb.core.ComponentManager.init(),
      SCWeb.core.Translation.update(),
    ]);
  },

  pageShowedForUrlParameters(urlObject) {
    return (
      SCWeb.core.Main.actionParameterProcessed(urlObject) ||
      SCWeb.core.Main.systemIdentifierParameterProcessed(urlObject) ||
      SCWeb.core.Main.commandParameterProcessed(urlObject)
    );
  },

  actionParameterProcessed(urlObject) {
    const action = urlObject["action"];
    if (action) {
      /// @todo Check action is really a action
      const commandState = new SCWeb.core.CommandState(action, null, null);
      SCWeb.ui.WindowManager.appendHistoryItem(action, commandState);
      return true;
    }
    return false;
  },

  systemIdentifierParameterProcessed(urlObject) {
    const lang = urlObject["lang"];
    const window_lang = window.scKeynodes[lang];
    if (window_lang) SCWeb.core.Translation.fireLanguageChanged(window_lang);

    const sysId = urlObject["sys_id"];
    if (!sysId) return false;
    SCWeb.core.Main.doDefaultCommandWithSystemIdentifier(sysId);

    const viewMode = Number(urlObject["view_mode"]);
    const editMode = Number(urlObject["edit_mode"]);

    SCWeb.core.Main.viewMode = viewMode ?? 0;
    SCWeb.core.Main.editMode = editMode ?? 0;

    // backward compatibility [scg_structure_view_only <- full_screen_scg]
    const fullScreenView = urlObject["full_screen_scg"]
      ? urlObject["full_screen_scg"]
      : urlObject["scg_structure_view_only"];
    const hideTools = urlObject["hide_tools"];
    const hideBorders = urlObject["hide_borders"];

    if (fullScreenView) {
      this.initFullScreenView(hideTools, hideBorders);
    }
    return true;
  },

  initFullScreenView(hideTools, hideBorders) {
    $("#window-header-tools").hide();
    $("#static-window-container").hide();
    $("#header").hide();
    $("#footer").hide();
    $("#window-container").css({ "padding-right": "", "padding-left": "" });

    this.waitForElm(".sc-contour").then(() => {
      $("#window-container").children().children().children().children().hide();
      $(".sc-contour").css({
        height: "100%",
        width: "100%",
        position: "absolute",
        "background-color": "none",
        border: "0",
        padding: "0px",
        "border-radius": "0px",
      });
      $(".scs-scn-view-toogle-button").hide().click();
      $(".sc-window").css({ padding: "0px", overflow: "hidden" });
      $(".panel-body").css({ padding: "0px", overflow: "hidden" });
      $(".scs-scn-element").css("cursor", "auto !important");
      $("[id*='tools-']").parent().css({ height: "100%", width: "100%" });
      $("[id*='tools-']").parent().parent().css("height", "100%");

      if (hideBorders) {
        $(".sc-contour").css({ border: "none" });
        $(".panel-default").css({ "border-color": "#FFFFFF" });
        $(".main-container").css({ "padding-left": "0", "padding-right": "0" });
      }
    });

    this.waitForElm(".scg-tools-panel").then(() => {
      if (hideTools) {
        $(".scg-tools-panel").css({ display: "block" });
      }
    });
  },

  waitForElm(selector) {
    return new Promise((resolve) => {
      if (document.querySelector(selector)) {
        return resolve(document.querySelector(selector));
      }

      const observer = new MutationObserver(() => {
        if (document.querySelector(selector)) {
          resolve(document.querySelector(selector));
          observer.disconnect();
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    });
  },

  commandParameterProcessed(urlObject) {
    const command_identifier = urlObject["command_id"];
    if (command_identifier) {
      const parameters = Object.keys(urlObject);
      const args = [];
      for (let param of parameters) {
        if (/^arg/gi.test(param)) {
          args.push(urlObject[param]);
        }
      }
      SCWeb.core.Main.doCommandByIdentifier(command_identifier, args);
      return true;
    }
    return false;
  },

  showDefaultPage: async function (params) {
    console.log("[Custom] ===== showDefaultPage ВЫЗВАН =====");
    console.log("[Custom] viewMode перед showDefaultPage:", this.viewMode);
    console.log("[Custom] editMode перед showDefaultPage:", this.editMode);
    
    function start(a) {
      console.log("[Custom] start() с адресом:", a);
      SCWeb.core.Main.doDefaultCommand([a]);
      if (params.first_time) $("#help-modal").modal({ keyboard: true });
    }

    const argumentAddr = window.scKeynodes["ui_start_sc_element"];
    let startScElements = await window.scHelper.getSetElements(argumentAddr);
    if (startScElements.length) {
      console.log("[Custom] Используем первый элемент:", startScElements[0]);
      start(startScElements[0]);
    } else {
      console.log("[Custom] Используем argumentAddr:", argumentAddr);
      start(argumentAddr);
    }
  },

  /**
   * Returns sc-addr of preferred output language for current user
   */
  getDefaultExternalLang: function () {
    return this.user.default_ext_lang;
  },

  /**
   * Initiate user interface command
   * @param {String} cmd_addr sc-addr of user command
   * @param {Array} cmd_args Array of sc-addrs with command arguments
   */
  doCommand: function (cmd_addr, cmd_args) {
    console.log("[Custom Main] ===== doCommand ВЫЗВАН =====");
    console.log("[Custom Main] cmd_addr:", cmd_addr);
    console.log("[Custom Main] cmd_args:", cmd_args);
    console.log("[Custom Main] viewMode:", this.viewMode);
    console.log("[Custom Main] editMode:", this.editMode);
    
    SCWeb.core.Arguments.clear();
    SCWeb.core.Server.doCommand(cmd_addr, cmd_args, function (result) {
      console.log("[Custom Main] doCommand result:", result);
      if (result.action !== undefined) {
        const commandState = new SCWeb.core.CommandState(cmd_addr, cmd_args);
        console.log("[Custom Main] Создан commandState:", commandState);
        console.log("[Custom Main] Вызываем appendHistoryItem...");
        SCWeb.ui.WindowManager.appendHistoryItem(result.action, commandState);
      } else if (result.command !== undefined) {
      } else {
        alert("There are no any result. Try another request");
      }
    });
  },

  /**
   * Initiate user interface command
   * @param {String} cmd_identifier system identifier of user command
   * @param {Array} cmd_args system identifiers of command arguments
   */
  doCommandByIdentifier: function (cmd_identifier, cmd_args) {
    const self = this;
    SCWeb.core.Arguments.clear();
    SCWeb.core.Server.resolveScAddr([cmd_identifier].concat(cmd_args)).then(
      function (result) {
        const cmd_addr = result[cmd_identifier];
        const resolved_args = [];
        cmd_args.forEach(function (argument) {
          resolved_args.push(result[argument]);
        });
        self.doCommand(cmd_addr, resolved_args);
      },
    );
  },

  doCommandWithPromise: function (command_state) {
    return new Promise(function (resolve, reject) {
      SCWeb.core.Server.doCommand(
        command_state.command_addr,
        command_state.command_args,
        function (result) {
          if (result.action !== undefined) {
            resolve(result.action);
          } else if (result.command !== undefined) {
          } else {
            reject("There are no any result. Try another request");
          }
        },
      );
    });
  },

  getTranslatedResult: function (command_state) {
    return new Promise(function (resolve) {
      SCWeb.core.Main.doCommandWithPromise(command_state).then(
        function (action_addr) {
          SCWeb.core.Server.getResultTranslated(
            action_addr,
            command_state.format,
            command_state.lang,
            function (result) {
              resolve(result.link);
            },
          );
        },
      );
    });
  },

  /**
   * Initiate user natural language command
   * @param {String} query Natural language query
   */

  doTextCommand: function (query) {
    SCWeb.core.Server.textCommand(query, function (result) {
      if (result.action !== undefined) {
        const commandState = new SCWeb.core.CommandState(null, null, null);
        SCWeb.ui.WindowManager.appendHistoryItem(result.action, commandState);
      } else if (result.command !== undefined) {
      } else {
        alert("There are no any result. Try another request");
      }
    });
  },

  /**
   * Initiate default user interface command
   * @param {Array} cmd_args Array of sc-addrs with command arguments
   */
  doDefaultCommand: function (cmd_args) {
    console.log("[Custom Main] ===== doDefaultCommand ВЫЗВАН =====");
    console.log("[Custom Main] cmd_args:", cmd_args);
    console.log("[Custom Main] default_cmd:", this.default_cmd);
    console.log("[Custom Main] viewMode:", this.viewMode);
    console.log("[Custom Main] editMode:", this.editMode);
    
    if (!this.default_cmd) {
      const self = this;
      SCWeb.core.Server.resolveScAddr([this.default_cmd_str]).then(
        function (addrs) {
          self.default_cmd = addrs[self.default_cmd_str];
          console.log("[Custom Main] resolved default_cmd:", self.default_cmd);
          if (self.default_cmd) {
            self.doCommand(self.default_cmd, cmd_args);
          }
        },
      );
    } else {
      console.log("[Custom Main] Используем кешированный default_cmd");
      this.doCommand(this.default_cmd, cmd_args);
    }
  },

  /**
   * Initiate default user interface command
   * @param {string} sys_id System identifier
   */
  doDefaultCommandWithSystemIdentifier: function (sys_id) {
    SCWeb.core.Server.resolveScAddr([sys_id]).then(function (addrs) {
      const resolvedId = addrs[sys_id];
      if (resolvedId) {
        SCWeb.core.Main.doDefaultCommand([resolvedId]);
      } else {
        SCWeb.core.Main.doDefaultCommandWithSystemIdentifier(
          "ui_start_sc_element",
        );
      }
    });
  },

  /**
   * Initiate user interface command
   * @param {String} cmd_addr sc-addr of user command
   * @param {Array} cmd_args Array of sc-addrs with command arguments
   */
  doCommandWithFormat: function (cmd_addr, cmd_args, fmt_addr) {
    SCWeb.core.Server.doCommand(cmd_addr, cmd_args, function (result) {
      if (result.action !== undefined) {
        const commandState = new SCWeb.core.CommandState(
          cmd_addr,
          cmd_args,
          fmt_addr,
        );
        SCWeb.ui.WindowManager.appendHistoryItem(result.action, commandState);
      } else {
        alert("There are no any result. Try another request");
      }
    });
  },

  /**
   * Initiate default user interface command
   * @param {Array} cmd_args Array of sc-addrs with command arguments
   */
  doDefaultCommandWithFormat: function (cmd_args, fmt_addr) {
    if (!this.default_cmd) {
      var self = this;
      SCWeb.core.Server.resolveScAddr([this.default_cmd_str], function (addrs) {
        self.default_cmd = addrs[self.default_cmd_str];
        if (self.default_cmd) {
          self.doCommandWithFormat(self.default_cmd, cmd_args, fmt_addr);
        }
      });
    } else {
      this.doCommandWithFormat(this.default_cmd, cmd_args, fmt_addr);
    }
  },
};

console.log("[Custom] ===== main.js ЗАВЕРШЕН =====");
