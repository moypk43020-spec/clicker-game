/* Интеграция с Telegram WebApp SDK.
   Вне Telegram (обычный браузер) всё мягко деградирует. */
(function () {
  'use strict';

  let tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
  let initialized = false;

  function init() {
    // SDK подключён с async: если Telegram недоступен (обычный браузер/офлайн) —
    // ждём до 5 секунд, затем тихо продолжаем без интеграции
    if (initialized) return;
    if (tg) {
      initTelegram();
    } else {
      const startedAt = Date.now();
      const timer = setInterval(() => {
        tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
        if (tg) {
          clearInterval(timer);
          initTelegram();
        } else if (Date.now() - startedAt > 5000) {
          clearInterval(timer);
        }
      }, 100);
    }
  }

  function initTelegram() {
    initialized = true;

    try {
      tg.ready();          // сообщаем Telegram, что приложение загрузилось
      tg.expand();         // разворачиваем на весь экран
      if (tg.setHeaderColor) tg.setHeaderColor('secondary_bg_color');
      if (tg.setBackgroundColor) tg.setBackgroundColor('secondary_bg_color');
      tg.disableVerticalSwipes && tg.disableVerticalSwipes();
    } catch (e) {
      console.warn('Telegram init warning:', e);
    }

    applyTheme();
    // Telegram присылает событие при смене темы (день/ночь и т.д.)
    tg.onEvent('themeChanged', applyTheme);
  }

  /* Применяем цветовые параметры Telegram к CSS-переменным. */
  function applyTheme() {
    if (!tg || !tg.themeParams) return;
    const p = tg.themeParams;
    const map = {
      '--bg': 'secondary_bg_color',
      '--bg-secondary': 'bg_color',
      '--card': 'bg_color',
      '--card-hover': 'hint_color',
      '--text': 'text_color',
      '--text-muted': 'hint_color',
      '--accent': 'link_color',
      '--danger': 'destructive_color'
    };
    for (const [cssVar, tgParam] of Object.entries(map)) {
      if (p[tgParam]) document.documentElement.style.setProperty(cssVar, p[tgParam]);
    }
  }

  /* Лёгкая вибрация при клике / покупке. Вне Telegram — заглушка. */
  function haptic(style) {
    try {
      if (!tg || !tg.HapticFeedback) return;
      if (style === 'success' || style === 'error') {
        tg.HapticFeedback.notificationOccurred(style);
      } else {
        tg.HapticFeedback.impactOccurred(style || 'light');
      }
    } catch (e) { /* игнорируем */ }
  }

  window.TG = { init, haptic, tg };
})();
