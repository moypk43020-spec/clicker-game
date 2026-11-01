/* Сохранение и загрузка прогресса в localStorage. */
(function () {
  'use strict';

  const KEY = 'battle_clicker_save_v2';

  function save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Не удалось сохранить прогресс:', e);
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      // Базовая валидация
      if (typeof data.coins !== 'number' || typeof data.levels !== 'object') return null;
      return data;
    } catch (e) {
      return null;
    }
  }

  function clear() {
    try {
      localStorage.removeItem(KEY);
    } catch (e) { /* игнорируем */ }
  }

  window.Storage = { save, load, clear };
})();
