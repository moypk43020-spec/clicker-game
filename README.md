# 🪙 Кликер — Telegram Mini App

Простая игра-кликер с улучшениями, сделанная как [Telegram Mini App](https://core.telegram.org/bots/webapps) на чистом HTML/CSS/JavaScript — **без сборки и зависимостей**.

## 🎮 Механика

- Кликай по монете → получай монеты
- Покупай улучшения в магазине:
  | Улучшение | Эффект |
  |---|---|
  | 👆 Крепкий палец | +1 монета за клик |
  | 🤖 Автокликер | +1 монета/сек |
  | 💥 Мегаклик | +5 монет за клик |
  | 🏭 Клик-завод | +10 монет/сек |
  | ✨ Золотой множитель | ×1.5 ко всему доходу (до 10 уровня) |
- Пассивный доход тикает автоматически
- Прогресс сохраняется в `localStorage` браузера/Telegram

## 📁 Структура проекта

```
├── index.html          # Разметка игры
├── css/
│   └── style.css       # Стили (тёмная тема + тема Telegram)
├── js/
│   ├── telegram.js     # Интеграция с Telegram WebApp SDK
│   ├── storage.js      # Сохранение прогресса в localStorage
│   ├── game.js         # Игровая логика: клики, улучшения, пассивный доход
│   └── app.js          # Точка входа: UI, рендер, игровой цикл
└── README.md
```

## 🚀 Деплой на GitHub Pages

1. Создай репозиторий на GitHub и запушь этот проект:
   ```bash
   git init
   git add .
   git commit -m "Кликер: Telegram Mini App"
   git branch -M main
   git remote add origin https://github.com/<username>/<repo>.git
   git push -u origin main
   ```
2. В репозитории открой **Settings → Pages**.
3. В разделе **Source** выбери: `Deploy from a branch` → ветка `main`, папка `/ (root)` → **Save**.
4. Через 1–2 минуты сайт будет доступен по адресу:
   ```
   https://<username>.github.io/<repo>/
   ```

## 🤖 Подключение к Telegram-боту

1. Открой [@BotFather](https://t.me/BotFather) в Telegram.
2. Создай бота: `/newbot` (если ещё нет) — сохрани токен.
3. Настрой Mini App: `/newapp` или **Bot Settings → Menu Button → Configure menu button** → отправь ссылку:
   ```
   https://<username>.github.io/<repo>/
   ```
4. Также можно добавить кнопку запуска: **Bot Settings → Menu Button → Enable**.
5. Открой бота и нажми кнопку меню — игра запустится как Mini App. 🎉

## 🛠 Локальный запуск

Просто открой `index.html` в браузере, либо запусти любой статический сервер:

```bash
# Python
python -m http.server 8080

# или Node.js
npx serve .
```

Открой `http://localhost:8080` — вне Telegram игра работает в обычном браузере (вибрация и тема Telegram просто отключены).

## 📝 Лицензия

MIT — используй и дорабатывай свободно.
