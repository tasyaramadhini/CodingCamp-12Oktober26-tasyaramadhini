# ToDo Life Dashboard

A lightweight, fully client-side productivity dashboard built with plain HTML, CSS, and vanilla JavaScript. No frameworks, no build tools, no external dependencies.

[![Live Demo – open index.html](https://img.shields.io/badge/open-locally-blue)](#)

---

## Features

| Feature | Details |
|---|---|
| 🕐 Live Clock | Digital clock updated every second, shows full date and a time-aware greeting |
| 👤 Custom Name | Personalise the greeting with your name; persisted in Local Storage |
| 🍅 Pomodoro Timer | Default 25 min; Start / Pause / Reset; progress bar; customisable duration (1–180 min); browser notifications on completion |
| ✅ To-Do List | Add, edit, complete/uncomplete, delete tasks; incomplete tasks always appear before completed ones |
| 🔃 Task Sorting | Sort by insertion order, oldest, newest, A→Z, Z→A; preference saved |
| 🔗 Quick Links | Add/delete bookmarks; persists across reloads; auto-fetches favicons; validates URLs |
| 🌙 Dark / Light Mode | Toggle with a single click; preference saved in Local Storage |
| 💾 Persistence | All user data stored in `localStorage`; survives browser refresh |
| 📱 Responsive | Mobile-first grid; works on phones, tablets, and desktops |

---

## File Structure

```
ToDo-Life-Dashboard/
├── index.html          # Main entry point
├── css/
│   └── style.css       # All styles (no external CSS)
├── js/
│   └── script.js       # All logic (no external JS)
├── .kiro/              # Kiro IDE configuration and steering files
└── README.md
```

---

## Getting Started

### Open locally

Just double-click **index.html** (or drag it into any modern browser). No server or build step required.

### Deploy to GitHub Pages

1. Push the repository to GitHub.
2. Go to **Settings → Pages**.
3. Set the source to the `main` branch, root folder `/`.
4. GitHub Pages will serve `index.html` directly.

---

## How to Test Each Feature

### Live Clock
- Open the page — the clock ticks every second and the date updates at midnight.

### Custom Greeting
- Click **✏️ Edit name** in the clock card, type your name, and press **Save**.
- Refresh the page — the name persists.

### Dark / Light Mode
- Click the toggle (☀️ / 🌙) in the top-right corner.
- Refresh — the preference is remembered.

### Pomodoro Timer
- Click **▶ Start** to begin the countdown.
- Click **⏸ Pause** to pause, then **▶ Start** again to resume.
- Click **↺ Reset** to restore the full duration.
- Change the minutes field and click **Set** (only works while the timer is stopped).
- Wait for 00:00 — a toast notification and (if allowed) a browser notification appear.

### To-Do List
- Type in the input field and press **Enter** or click **+ Add**.
- Check the checkbox to mark a task done; it moves below incomplete tasks.
- Click **✏️** to edit inline; press **Enter** or 💾 to save, **✖️** to cancel.
- Click **🗑️** and confirm to delete a task.
- Use the **Sort by** dropdown to reorder tasks.
- Refresh the page — tasks persist.

### Quick Links
- Enter a URL (and optionally a label) and press **Enter** or **+ Add Link**.
- Hover over a link tile — an **×** delete button appears.
- Click the tile to open the link in a new tab.
- Refresh — links persist.

---

## Browser Support

Chrome 90+, Firefox 88+, Safari 14+, Edge 90+.  
Requires JavaScript enabled and Local Storage available (normal in all modern browsers).

---

## License

MIT — free to use, modify, and distribute.
