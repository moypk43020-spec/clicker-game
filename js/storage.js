/* Сохранение и загрузка прогресса.
   - Отдельный сейв для каждого пользователя (по Telegram user id) —
     разные аккаунты на одном устройстве больше не конфликтуют
   - Автосохранение при выходе (visibilitychange / beforeunload) — на стороне app.js
   - Загрузка при входе
   - Дублирование в Telegram CloudStorage (если запущено в Telegram):
     прогресс синхронизируется между устройствами одного аккаунта */
(function () {
  'use strict';

  const LEGACY_KEY = 'clicker_save_v1';
  const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;

  /* Уникальный ключ для текущего пользователя */
  function saveKey() {
    const uid = tg && tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user.id : null;
    return uid ? `clicker_save_v2_u${uid}` : 'clicker_save_v2_guest';
  }

  function isTelegram() {
    return !!(tg && tg.CloudStorage);
  }

  function readLocal(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (typeof data.coins !== 'number' || typeof data.levels !== 'object') return null;
      return data;
    } catch (e) {
      return null;
    }
  }

  function writeLocal(key, state) {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {
      console.warn('Не удалось сохранить прогресс:', e);
    }
  }

  /* Синхронная загрузка из localStorage текущего пользователя (+ миграция старого сейва) */
  function load() {
    const key = saveKey();

    // Миграция: если есть старый общий сейв v1 — переносим в ключ пользователя
    if (!localStorage.getItem(key)) {
      const legacy = readLocal(LEGACY_KEY);
      if (legacy) {
        writeLocal(key, legacy);
        localStorage.removeItem(LEGACY_KEY);
      }
    }

    return readLocal(key);
  }

  /* Защита от гонки: пока начальная загрузка (облако) не завершена,
     сохранения заблокированы — иначе пустой прогресс перезапишет облачный сейв */
  let ready = false;

  function markReady() {
    ready = true;
  }

  function isReady() {
    return ready;
  }

  /* Сохранение: локально + в Telegram CloudStorage (если доступно).
     Работает только после markReady() */
  function save(state) {
    if (!ready) return;

    const key = saveKey();
    const payload = JSON.stringify(state);
    writeLocal(key, state);

    if (isTelegram()) {
      try {
        tg.CloudStorage.setItem(key, payload, function (err) {
          if (err) console.warn('CloudStorage save failed:', err);
        });
      } catch (e) {
        console.warn('CloudStorage save error:', e);
      }
    }
  }

  /* Асинхронная проверка облачного сейва: если в облаке прогресс больше —
     возвращает его через callback, иначе null */
  function loadFromCloud(callback) {
    if (!isTelegram()) {
      callback(null);
      return;
    }
    try {
      tg.CloudStorage.getItem(saveKey(), function (err, value) {
        if (err || !value) {
          callback(null);
          return;
        }
        try {
          const data = JSON.parse(value);
          if (typeof data.coins !== 'number' || typeof data.levels !== 'object') {
            callback(null);
            return;
          }
          callback(data);
        } catch (e) {
          callback(null);
        }
      });
    } catch (e) {
      callback(null);
    }
  }

  function clear() {
    const key = saveKey();
    try {
      localStorage.removeItem(key);
      localStorage.removeItem(LEGACY_KEY);
    } catch (e) { /* игнорируем */ }
    if (isTelegram()) {
      try {
        tg.CloudStorage.removeItem(key, function () { /* ok */ });
      } catch (e) { /* игнорируем */ }
    }
  }

  window.Storage = { load, save, loadFromCloud, clear, isTelegram, markReady, isReady };
})();
