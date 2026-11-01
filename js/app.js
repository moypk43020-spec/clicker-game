/* Точка входа: связывает боевую логику, сохранение и UI. */
(function () {
  'use strict';

  // ---------- DOM ----------
  const goldEl = document.getElementById('gold');
  const enemyIconEl = document.getElementById('enemy-icon');
  const enemyNameEl = document.getElementById('enemy-name');
  const enemyLevelEl = document.getElementById('enemy-level');
  const enemyHpFillEl = document.getElementById('enemy-hp-fill');
  const enemyHpTextEl = document.getElementById('enemy-hp-text');
  const enemyRewardEl = document.getElementById('enemy-reward');
  const attackBtn = document.getElementById('attack-btn');
  const attackCooldownEl = document.getElementById('attack-cooldown');
  const statPowerEl = document.getElementById('stat-power');
  const statCritEl = document.getElementById('stat-crit');
  const staminaFillEl = document.getElementById('stamina-fill');
  const staminaTextEl = document.getElementById('stamina-text');
  const staminaHintEl = document.getElementById('stamina-hint');
  const shopEl = document.getElementById('shop');
  const floatersEl = document.getElementById('floaters');
  const resetBtn = document.getElementById('reset-btn');

  /* ---------- Форматирование чисел: 12.3K, 4.5M ... ---------- */
  function fmt(n) {
    if (n < 1000) return Math.floor(n).toString();
    const units = ['K', 'M', 'B', 'T'];
    let i = -1;
    while (n >= 1000 && i < units.length - 1) {
      n /= 1000;
      i++;
    }
    return n.toFixed(n < 10 ? 2 : 1) + units[i];
  }

  /* ---------- Магазин ---------- */
  const cards = {}; // upgradeId -> { card, price, level }

  function buildShop() {
    shopEl.innerHTML = '';
    for (const u of Game.UPGRADES) {
      const card = document.createElement('div');
      card.className = 'upgrade-card';
      card.innerHTML =
        '<div class="upgrade-icon">' + u.icon + '</div>' +
        '<div class="upgrade-info">' +
          '<div class="upgrade-name">' + u.name + '</div>' +
          '<div class="upgrade-desc">' + u.desc + '</div>' +
          '<div class="upgrade-level"></div>' +
        '</div>' +
        '<div class="upgrade-buy">' +
          '<div class="upgrade-price"></div>' +
        '</div>';
      card.addEventListener('click', () => onBuyClick(u));
      shopEl.appendChild(card);
      cards[u.id] = {
        card,
        price: card.querySelector('.upgrade-price'),
        level: card.querySelector('.upgrade-level')
      };
    }
  }

  function renderShop() {
    for (const u of Game.UPGRADES) {
      const c = cards[u.id];
      const maxed = u.maxLevel && Game.level(u.id) >= u.maxLevel;
      const affordable = Game.canBuy(u);

      c.price.textContent = maxed ? 'MAX' : '🪙 ' + fmt(Game.upgradeCost(u));
      c.level.textContent = u.maxLevel
        ? 'Уровень ' + Game.level(u.id) + ' / ' + u.maxLevel
        : (Game.level(u.id) > 0 ? 'Уровень ' + Game.level(u.id) : '');

      c.card.classList.toggle('affordable', affordable && !maxed);
      c.card.classList.toggle('not-affordable', !affordable || maxed);
    }
  }

  function onBuyClick(u) {
    if (Game.buy(u)) {
      TG.haptic('success');
      render();
      Storage.save(Game.state);
    } else {
      TG.haptic('error');
    }
  }

  /* ---------- Атака ---------- */
  function doAttack(e) {
    const result = Game.attack(performance.now());
    if (!result) return;

    TG.haptic(result.crit ? 'success' : 'light');
    spawnFloater('−' + fmt(result.damage), e.clientX, e.clientY, result.crit ? 'crit' : '');
    if (result.killed) {
      spawnFloater('+' + fmt(result.reward) + ' 🪙', e.clientX, e.clientY - 40, 'reward');
    }
    render();
    Storage.save(Game.state);
  }

  attackBtn.addEventListener('click', doAttack);
  attackBtn.addEventListener('contextmenu', (e) => e.preventDefault());

  /* ---------- Всплывающие цифры ---------- */
  function spawnFloater(text, x, y, extraClass) {
    const el = document.createElement('div');
    el.className = 'floater' + (extraClass ? ' ' + extraClass : '');
    el.textContent = text;
    // Если события с координатами нет (клавиатура) — над кнопкой атаки
    if (!x && !y) {
      const r = attackBtn.getBoundingClientRect();
      x = r.left + r.width / 2;
      y = r.top + r.height / 3;
    }
    el.style.left = (x - 30) + 'px';
    el.style.top = (y - 20) + 'px';
    floatersEl.appendChild(el);
    setTimeout(() => el.remove(), 800);
  }

  /* ---------- Сброс ---------- */
  resetBtn.addEventListener('click', () => {
    if (confirm('Сбросить весь прогресс?')) {
      Game.reset();
      Storage.clear();
      render();
      Storage.save(Game.state);
    }
  });

  /* ---------- Рендер ---------- */
  let lastRender = 0;

  function render() {
    const enemy = Game.currentEnemy();
    goldEl.textContent = fmt(Game.state.gold);

    enemyIconEl.textContent = enemy.icon;
    enemyNameEl.textContent = enemy.name;
    enemyLevelEl.textContent = '#' + enemy.level;
    enemyRewardEl.textContent = fmt(enemy.reward);

    const hpPct = Math.max(0, (enemy.hp / enemy.maxHp) * 100);
    enemyHpFillEl.style.width = hpPct + '%';
    enemyHpTextEl.textContent = fmt(Math.max(0, enemy.hp)) + ' / ' + fmt(enemy.maxHp);

    // Стамина
    const st = Game.stamina;
    const stMax = Game.maxStamina();
    const stPct = (st / stMax) * 100;
    staminaFillEl.style.width = stPct + '%';
    staminaTextEl.textContent = Math.floor(st) + ' / ' + stMax;

    const canAttack = Game.canAttack(performance.now());
    staminaHintEl.textContent = '−' + Game.STAMINA_PER_HIT + ' за удар · реген ' + Game.staminaRegen().toFixed(1) + '/сек';
    staminaHintEl.classList.toggle('low', st < Game.STAMINA_PER_HIT);
    attackBtn.classList.toggle('ready', canAttack);
    attackBtn.disabled = !canAttack;

    // Статы
    statPowerEl.textContent = fmt(Game.power());
    statCritEl.textContent = Math.round(Game.critChance() * 100) + '%';

    renderShop();
    lastRender = performance.now();
  }

  /* ---------- Игровой цикл ---------- */
  let lastTick = performance.now();
  let lastSave = performance.now();

  function loop(now) {
    const delta = now - lastTick;
    lastTick = now;

    // Логика: реген стамины, наёмник
    Game.tick(delta);

    // Вуаль перезарядки (каждый кадр, без полного рендера):
    // сразу после удара закрывает кнопку, по готовности исчезает
    const cdProgress = Game.cooldownProgress(now);
    attackCooldownEl.style.transform = 'scaleY(' + (1 - cdProgress) + ')';

    // Полный рендер ~10 раз в секунду
    if (now - lastRender > 100) {
      render();
    }

    // Автосохранение раз в 3 секунды
    if (now - lastSave > 3000) {
      lastSave = now;
      Storage.save(Game.state);
    }

    requestAnimationFrame(loop);
  }

  // Сохраняем при закрытии/сворачивании
  window.addEventListener('beforeunload', () => Storage.save(Game.state));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) Storage.save(Game.state);
  });

  /* ---------- Старт ---------- */
  TG.init();

  // Загрузка прогресса (локальный сейв текущего пользователя)
  Game.initState(Storage.load());

  buildShop();
  render();
  requestAnimationFrame(loop);

  // Облачный сейв Telegram важнее локального, если там прогресс больше —
  // так прогресс синхронизируется между устройствами одного аккаунта.
  // Сохранения включаются только ПОСЛЕ завершения начальной загрузки,
  // чтобы пустое состояние не перезаписало облачный сейв.
  Storage.loadFromCloud((cloud) => {
    if (cloud && cloud.coins > Game.state.coins) {
      Game.initState(cloud);
    }
    Storage.markReady();
    Storage.save(Game.state);
    render();
  });
})();
