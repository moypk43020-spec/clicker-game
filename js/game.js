/* Игровая логика кликера: состояние, улучшения, пассивный доход. */
(function () {
  'use strict';

  /* ---------- Определения улучшений ---------- */
  const UPGRADES = [
    {
      id: 'finger',
      icon: '👆',
      name: 'Крепкий палец',
      desc: '+1 монета за клик',
      baseCost: 10,
      costGrowth: 1.5,
      maxLevel: 0, // без ограничения
      effect: { click: 1 }
    },
    {
      id: 'auto',
      icon: '🤖',
      name: 'Автокликер',
      desc: '+1 монета в секунду',
      baseCost: 50,
      costGrowth: 1.6,
      maxLevel: 0,
      effect: { auto: 1 }
    },
    {
      id: 'mega',
      icon: '💥',
      name: 'Мегаклик',
      desc: '+5 монет за клик',
      baseCost: 250,
      costGrowth: 1.7,
      maxLevel: 0,
      effect: { click: 5 }
    },
    {
      id: 'factory',
      icon: '🏭',
      name: 'Клик-завод',
      desc: '+10 монет в секунду',
      baseCost: 1200,
      costGrowth: 1.7,
      maxLevel: 0,
      effect: { auto: 10 }
    },
    {
      id: 'multiplier',
      icon: '✨',
      name: 'Золотой множитель',
      desc: '×1.5 ко всему доходу',
      baseCost: 5000,
      costGrowth: 4,
      maxLevel: 10,
      effect: { multiplier: 1.5 }
    }
  ];

  /* ---------- Состояние игры ---------- */
  const DEFAULT_STATE = {
    coins: 0,
    totalEarned: 0,
    clicks: 0,
    levels: {}   // { upgradeId: уровень }
  };

  let state = null;

  function initState(saved) {
    state = Object.assign({}, DEFAULT_STATE, saved || {});
    state.levels = (saved && saved.levels) ? saved.levels : {};
    for (const u of UPGRADES) {
      if (typeof state.levels[u.id] !== 'number') state.levels[u.id] = 0;
    }
  }

  /* ---------- Формулы ---------- */
  function level(id) {
    return state.levels[id] || 0;
  }

  function upgradeCost(upgrade) {
    return Math.floor(upgrade.baseCost * Math.pow(upgrade.costGrowth, level(upgrade.id)));
  }

  function multiplier() {
    let m = 1;
    for (const u of UPGRADES) {
      if (u.effect.multiplier) m *= Math.pow(u.effect.multiplier, level(u.id));
    }
    return m;
  }

  function perClick() {
    let click = 1;
    for (const u of UPGRADES) {
      if (u.effect.click) click += u.effect.click * level(u.id);
    }
    return click * multiplier();
  }

  function perSecond() {
    let auto = 0;
    for (const u of UPGRADES) {
      if (u.effect.auto) auto += u.effect.auto * level(u.id);
    }
    return auto * multiplier();
  }

  /* ---------- Действия ---------- */
  function click() {
    const gain = perClick();
    state.coins += gain;
    state.totalEarned += gain;
    state.clicks += 1;
    return gain;
  }

  function canBuy(upgrade) {
    const lvl = level(upgrade.id);
    if (upgrade.maxLevel && lvl >= upgrade.maxLevel) return false;
    return state.coins >= upgradeCost(upgrade);
  }

  function buy(upgrade) {
    if (!canBuy(upgrade)) return false;
    state.coins -= upgradeCost(upgrade);
    state.levels[upgrade.id] = level(upgrade.id) + 1;
    return true;
  }

  /* Пассивный доход за прошедшее время (в мс). */
  function tickIdle(deltaMs) {
    const income = perSecond() * (deltaMs / 1000);
    if (income > 0) {
      state.coins += income;
      state.totalEarned += income;
    }
  }

  function reset() {
    initState(null);
  }

  /* ---------- Экспорт ---------- */
  window.Game = {
    UPGRADES,
    get state() { return state; },
    initState,
    level,
    upgradeCost,
    multiplier,
    perClick,
    perSecond,
    canBuy,
    buy,
    click,
    tickIdle,
    reset
  };
})();
