/* Точка входа: связывает игровую логику, сохранение и UI. */
(function () {
  'use strict';

  // Инициализация Telegram
  TG.init();

  // Загрузка прогресса
  Game.initState(Storage.load());

  // ---------- DOM ----------
  const coinsEl = document.getElementById('coins');
  const perClickEl = document.getElementById('per-click');
  const perSecEl = document.getElementById('per-sec');
  const clickBtn = document.getElementById('click-btn');
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

  /* ---------- Клик по монете ---------- */
  clickBtn.addEventListener('click', (e) => {
    const gain = Game.click();
    TG.haptic('light');
    spawnFloater('+' + fmt(gain), e.clientX, e.clientY);
    render();
    Storage.save(Game.state);
  });

  /* ---------- Всплывающие "+N" ---------- */
  function spawnFloater(text, x, y) {
    const el = document.createElement('div');
    el.className = 'floater';
    el.textContent = text;
    // Если клик был с клавиатуры — показываем над монетой
    if (!x && !y) {
      const r = clickBtn.getBoundingClientRect();
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
  function render() {
    coinsEl.textContent = fmt(Game.state.coins);
    perClickEl.textContent = '+' + fmt(Game.perClick());
    perSecEl.textContent = '+' + fmt(Game.perSecond());
    renderShop();
  }

  /* ---------- Игровой цикл ---------- */
  let lastTick = performance.now();
  let lastSave = performance.now();

  function loop(now) {
    const delta = now - lastTick;
    lastTick = now;

    Game.tickIdle(delta);
    render();

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
  buildShop();
  render();
  requestAnimationFrame(loop);
})();
