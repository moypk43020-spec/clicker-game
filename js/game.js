/* Боевая логика кликера: удары, стамина, перезарядка, враги, награды. */
(function () {
  'use strict';

  /* ---------- Улучшения (магазин снаряжения) ---------- */
  const UPGRADES = [
    {
      id: 'power',
      icon: '🗡',
      name: 'Острый клинок',
      desc: '+1 к урону за удар',
      baseCost: 10,
      costGrowth: 1.5,
      maxLevel: 0, // без ограничения
      effect: { power: 1 }
    },
    {
      id: 'stamina',
      icon: '💪',
      name: 'Выносливость',
      desc: '+10 к макс. стамине, +0.5/сек реген',
      baseCost: 25,
      costGrowth: 1.6,
      maxLevel: 0,
      effect: { stamina: 1 }
    },
    {
      id: 'recharge',
      icon: '🔄',
      name: 'Перезарядка',
      desc: '−8% к времени перезарядки удара',
      baseCost: 40,
      costGrowth: 1.7,
      maxLevel: 15,
      effect: { recharge: 1 }
    },
    {
      id: 'mercenary',
      icon: '🤖',
      name: 'Наёмник',
      desc: '+1 урона в секунду автоматически',
      baseCost: 100,
      costGrowth: 1.7,
      maxLevel: 0,
      effect: { auto: 1 }
    },
    {
      id: 'crit',
      icon: '💥',
      name: 'Критический удар',
      desc: '+3% шанс крита (×3 урона)',
      baseCost: 200,
      costGrowth: 1.8,
      maxLevel: 12,
      effect: { crit: 1 }
    }
  ];

  /* ---------- Враги ---------- */
  const ENEMY_TYPES = [
    { icon: '🐀', name: 'Крыса' },
    { icon: '🦇', name: 'Летучая мышь' },
    { icon: '🕷', name: 'Паук' },
    { icon: '👺', name: 'Гоблин' },
    { icon: '🧟', name: 'Зомби' },
    { icon: '👹', name: 'Огр' },
    { icon: '👻', name: 'Призрак' },
    { icon: '🐉', name: 'Дракон' }
  ];

  const BASE_COOLDOWN = 0.6;      // сек между ударами
  const STAMINA_PER_HIT = 10;     // расход стамины на удар
  const CRIT_MULT = 3;

  /* ---------- Состояние игры ---------- */
  const DEFAULT_STATE = {
    gold: 0,
    totalGold: 0,
    kills: 0,
    enemyLevel: 1,     // номер врага
    enemyHp: 20,       // текущее HP врага
    levels: {}         // { upgradeId: уровень }
  };

  let state = null;
  let stamina = 0;              // текущая стамина (не сохраняется)
  let lastAttackAt = 0;         // timestamp последнего удара (мс)

  function initState(saved) {
    state = Object.assign({}, DEFAULT_STATE, saved || {});
    state.levels = (saved && saved.levels) ? saved.levels : {};
    for (const u of UPGRADES) {
      if (typeof state.levels[u.id] !== 'number') state.levels[u.id] = 0;
    }
    // Валидация текущего врага
    const maxHp = enemyMaxHp(state.enemyLevel);
    if (state.enemyHp <= 0 || state.enemyHp > maxHp) state.enemyHp = maxHp;
    stamina = maxStamina();
    lastAttackAt = 0;
  }

  /* ---------- Характеристики героя ---------- */
  function level(id) {
    return state.levels[id] || 0;
  }

  function power() {
    let p = 1;
    for (const u of UPGRADES) {
      if (u.effect.power) p += u.effect.power * level(u.id);
    }
    return p;
  }

  function maxStamina() {
    let s = 50;
    for (const u of UPGRADES) {
      if (u.effect.stamina) s += u.effect.stamina * 10 * level(u.id);
    }
    return s;
  }

  function staminaRegen() {
    let r = 1;
    for (const u of UPGRADES) {
      if (u.effect.stamina) r += u.effect.stamina * 0.5 * level(u.id);
    }
    return r;
  }

  /* Время перезарядки удара в мс */
  function cooldown() {
    let c = BASE_COOLDOWN;
    for (const u of UPGRADES) {
      if (u.effect.recharge) c *= Math.pow(0.92, level(u.id));
    }
    return Math.max(0.1, c) * 1000;
  }

  function autoDps() {
    let a = 0;
    for (const u of UPGRADES) {
      if (u.effect.auto) a += u.effect.auto * level(u.id);
    }
    return a;
  }

  function critChance() {
    let c = 0;
    for (const u of UPGRADES) {
      if (u.effect.crit) c += u.effect.crit * 0.03 * level(u.id);
    }
    return Math.min(1, c);
  }

  /* ---------- Враги ---------- */
  function enemyMaxHp(enemyLevel) {
    return Math.floor(20 * Math.pow(1.35, enemyLevel - 1));
  }

  function enemyReward(enemyLevel) {
    return Math.floor(6 * Math.pow(1.3, enemyLevel - 1));
  }

  function currentEnemy() {
    const t = ENEMY_TYPES[(state.enemyLevel - 1) % ENEMY_TYPES.length];
    return {
      icon: t.icon,
      name: t.name,
      level: state.enemyLevel,
      hp: state.enemyHp,
      maxHp: enemyMaxHp(state.enemyLevel),
      reward: enemyReward(state.enemyLevel)
    };
  }

  /* ---------- Действия ---------- */
  function canAttack(now) {
    return now - lastAttackAt >= cooldown() && stamina >= STAMINA_PER_HIT;
  }

  /* Удар. Возвращает {damage, crit, killed, reward} или null. */
  function attack(now) {
    if (!canAttack(now)) return null;
    lastAttackAt = now;
    stamina -= STAMINA_PER_HIT;

    const crit = Math.random() < critChance();
    const damage = power() * (crit ? CRIT_MULT : 1);

    state.enemyHp -= damage;
    let killed = false;
    let reward = 0;

    while (state.enemyHp <= 0) {
      // Враг побеждён — награда и следующий враг (остаток урона переносим)
      reward += enemyReward(state.enemyLevel);
      const overkill = -state.enemyHp;
      state.kills += 1;
      state.enemyLevel += 1;
      state.enemyHp = enemyMaxHp(state.enemyLevel) - overkill;
      killed = true;
    }

    if (reward > 0) {
      state.gold += reward;
      state.totalGold += reward;
    }

    return { damage, crit, killed, reward };
  }

  /* Тик: реген стамины + урон наёмника. deltaMs в мс. */
  function tick(deltaMs) {
    const dt = deltaMs / 1000;
    stamina = Math.min(maxStamina(), stamina + staminaRegen() * dt);

    const dps = autoDps();
    if (dps > 0) {
      state.enemyHp -= dps * dt;
      let reward = 0;
      while (state.enemyHp <= 0) {
        reward += enemyReward(state.enemyLevel);
        const overkill = -state.enemyHp;
        state.kills += 1;
        state.enemyLevel += 1;
        state.enemyHp = enemyMaxHp(state.enemyLevel) - overkill;
      }
      if (reward > 0) {
        state.gold += reward;
        state.totalGold += reward;
      }
    }
  }

  /* Прогресс перезарядки 0..1 для UI */
  function cooldownProgress(now) {
    const cd = cooldown();
    const elapsed = now - lastAttackAt;
    return Math.min(1, elapsed / cd);
  }

  /* ---------- Покупки ---------- */
  function upgradeCost(upgrade) {
    return Math.floor(upgrade.baseCost * Math.pow(upgrade.costGrowth, level(upgrade.id)));
  }

  function canBuy(upgrade) {
    const lvl = level(upgrade.id);
    if (upgrade.maxLevel && lvl >= upgrade.maxLevel) return false;
    return state.gold >= upgradeCost(upgrade);
  }

  function buy(upgrade) {
    if (!canBuy(upgrade)) return false;
    state.gold -= upgradeCost(upgrade);
    state.levels[upgrade.id] = level(upgrade.id) + 1;
    return true;
  }

  function reset() {
    initState(null);
  }

  /* ---------- Экспорт ---------- */
  window.Game = {
    UPGRADES,
    ENEMY_TYPES,
    STAMINA_PER_HIT,
    CRIT_MULT,
    get state() { return state; },
    get stamina() { return stamina; },
    initState,
    level,
    power,
    maxStamina,
    staminaRegen,
    cooldown,
    cooldownProgress,
    autoDps,
    critChance,
    enemyMaxHp,
    enemyReward,
    currentEnemy,
    canAttack,
    attack,
    tick,
    upgradeCost,
    canBuy,
    buy,
    reset
  };
})();
