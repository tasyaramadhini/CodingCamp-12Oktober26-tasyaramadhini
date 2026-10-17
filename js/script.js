/**
 * ToDo Life Dashboard – script.js
 * Vanilla JS only. No frameworks, no external deps.
 * All persistence via localStorage.
 */

'use strict';

/* =====================================================
   UTILITIES
===================================================== */

/** Safe localStorage wrapper */
const Store = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage might be full; silently fail
    }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  }
};

/** Generate a simple unique ID */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Escape HTML to prevent XSS */
function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

/** Validate a URL string (must have a valid protocol) */
function isValidUrl(str) {
  try {
    const u = new URL(str);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Derive a friendly hostname label */
function hostname(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

/** Get favicon URL via Google's favicon service */
function faviconUrl(url) {
  try {
    const origin = new URL(url).origin;
    return `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(origin)}`;
  } catch { return ''; }
}

/* =====================================================
   TOAST
===================================================== */
let _toastTimer = null;

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = '';
  // Icon
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const icon = document.createElement('span');
  icon.textContent = icons[type] || 'ℹ️';
  toast.appendChild(icon);
  const text = document.createElement('span');
  text.textContent = message;
  toast.appendChild(text);

  toast.className = `toast toast--${type} show`;

  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

/* =====================================================
   THEME (dark / light)
===================================================== */
const THEME_KEY = 'dashboard_theme';

function initTheme() {
  const saved = Store.get(THEME_KEY, 'light');
  applyTheme(saved);

  const btn = document.getElementById('theme-toggle');
  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    Store.set(THEME_KEY, next);
    showToast(`Switched to ${next} mode`, 'info');
  });
  btn.setAttribute('aria-label', 'Toggle dark/light mode');
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const thumb = document.querySelector('.theme-toggle__thumb');
  if (thumb) thumb.textContent = theme === 'dark' ? '🌙' : '☀️';
}

/* =====================================================
   CLOCK & GREETING
===================================================== */
const NAME_KEY = 'dashboard_username';

function initClock() {
  updateClock();
  setInterval(updateClock, 1000);

  // Name edit button
  const editBtn = document.getElementById('name-edit-btn');
  editBtn.addEventListener('click', openNameModal);
}

function updateClock() {
  const now = new Date();

  // Time
  const timeEl = document.getElementById('clock-time');
  if (timeEl) {
    timeEl.textContent = now.toLocaleTimeString([], {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }

  // Date
  const dateEl = document.getElementById('clock-date');
  if (dateEl) {
    dateEl.textContent = now.toLocaleDateString([], {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  // Greeting
  const greetEl = document.getElementById('clock-greeting');
  if (greetEl) {
    const h = now.getHours();
    let greet = 'Good evening';
    if (h < 12) greet = 'Good morning';
    else if (h < 17) greet = 'Good afternoon';

    const name = Store.get(NAME_KEY, '');
    greetEl.textContent = name ? `${greet}, ${name}!` : `${greet}!`;
  }
}

/* ---------- Name Modal ---------- */
function openNameModal() {
  const overlay = document.getElementById('name-modal-overlay');
  const input = document.getElementById('name-modal-input');
  input.value = Store.get(NAME_KEY, '');
  overlay.classList.add('open');
  input.focus();
}

function closeNameModal() {
  document.getElementById('name-modal-overlay').classList.remove('open');
}

function saveNameModal() {
  const input = document.getElementById('name-modal-input');
  const val = input.value.trim().slice(0, 50);
  Store.set(NAME_KEY, val);
  closeNameModal();
  updateClock();
  showToast(val ? `Hello, ${val}! 👋` : 'Name cleared.', 'success');
}

/* =====================================================
   POMODORO TIMER
===================================================== */
const POMO_STATE_KEY = 'dashboard_pomo_state';
const DEFAULT_MINUTES = 25;

const pomo = {
  totalSeconds: DEFAULT_MINUTES * 60,
  remaining: DEFAULT_MINUTES * 60,
  running: false,
  interval: null,
  completed: false,
};

function initPomodoro() {
  // Restore last known duration from storage (not running state — we don't persist ticking)
  const saved = Store.get(POMO_STATE_KEY, null);
  if (saved && typeof saved.totalSeconds === 'number') {
    pomo.totalSeconds = saved.totalSeconds;
    pomo.remaining = saved.totalSeconds;
  }

  const durInput = document.getElementById('pomo-duration');
  durInput.value = Math.round(pomo.totalSeconds / 60);

  updatePomodoroDisplay();

  document.getElementById('pomo-start').addEventListener('click', pomoStart);
  document.getElementById('pomo-pause').addEventListener('click', pomoPause);
  document.getElementById('pomo-reset').addEventListener('click', pomoReset);
  document.getElementById('pomo-set-duration').addEventListener('click', pomoSetDuration);

  // Also allow pressing Enter in duration input
  durInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') pomoSetDuration();
  });
}

function pomoStart() {
  if (pomo.running) return;
  if (pomo.remaining <= 0) {
    pomoReset();
    return;
  }
  pomo.running = true;
  pomo.completed = false;
  // Clear any stale interval before creating a new one
  if (pomo.interval) {
    clearInterval(pomo.interval);
    pomo.interval = null;
  }
  pomo.interval = setInterval(pomoTick, 1000);
  updatePomodoroDisplay();
  updatePomodoroButtons();
}

function pomoPause() {
  if (!pomo.running) return;
  pomo.running = false;
  clearInterval(pomo.interval);
  pomo.interval = null;
  updatePomodoroDisplay();
  updatePomodoroButtons();
}

function pomoReset() {
  pomo.running = false;
  pomo.completed = false;
  clearInterval(pomo.interval);
  pomo.interval = null;
  pomo.remaining = pomo.totalSeconds;
  updatePomodoroDisplay();
  updatePomodoroButtons();
}

function pomoTick() {
  pomo.remaining -= 1;

  if (pomo.remaining <= 0) {
    // Session complete
    pomo.remaining = 0;
    clearInterval(pomo.interval);
    pomo.interval = null;
    pomo.running = false;
    pomo.completed = true;
    updatePomodoroDisplay();
    updatePomodoroButtons();
    showToast('🎉 Pomodoro session complete! Take a break.', 'success');
    // Optional: browser notification
    if (Notification && Notification.permission === 'granted') {
      new Notification('Pomodoro Complete!', {
        body: 'Time for a break. Well done!',
        icon: ''
      });
    }
    return;
  }
  updatePomodoroDisplay();
}

function pomoSetDuration() {
  if (pomo.running) {
    showToast('Stop the timer before changing duration.', 'error');
    return;
  }
  const raw = parseInt(document.getElementById('pomo-duration').value, 10);
  if (!raw || raw < 1 || raw > 180) {
    showToast('Please enter a duration between 1 and 180 minutes.', 'error');
    return;
  }
  pomo.totalSeconds = raw * 60;
  pomo.remaining = pomo.totalSeconds;
  pomo.completed = false;
  Store.set(POMO_STATE_KEY, { totalSeconds: pomo.totalSeconds });
  updatePomodoroDisplay();
  updatePomodoroButtons();
  showToast(`Duration set to ${raw} minutes.`, 'info');
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function updatePomodoroDisplay() {
  const timerEl = document.getElementById('pomo-timer');
  const labelEl = document.getElementById('pomo-label');
  const fillEl  = document.getElementById('pomo-progress-fill');

  if (timerEl) timerEl.textContent = formatTime(pomo.remaining);

  if (labelEl) {
    if (pomo.completed) labelEl.textContent = 'Session complete! 🎉';
    else if (pomo.running) labelEl.textContent = 'Focus time — you got this!';
    else if (pomo.remaining < pomo.totalSeconds) labelEl.textContent = 'Paused';
    else labelEl.textContent = 'Ready to focus?';
  }

  if (fillEl) {
    const pct = pomo.totalSeconds > 0 ? (pomo.remaining / pomo.totalSeconds) * 100 : 100;
    fillEl.style.width = `${pct}%`;
  }

  // Update document title when running
  if (pomo.running) {
    document.title = `⏱ ${formatTime(pomo.remaining)} – ToDo Dashboard`;
  } else {
    document.title = 'ToDo Life Dashboard';
  }
}

function updatePomodoroButtons() {
  const startBtn = document.getElementById('pomo-start');
  const pauseBtn = document.getElementById('pomo-pause');
  const resetBtn = document.getElementById('pomo-reset');

  startBtn.disabled = pomo.running || pomo.completed;
  pauseBtn.disabled = !pomo.running;
  resetBtn.disabled = pomo.remaining === pomo.totalSeconds && !pomo.completed;
}

/* =====================================================
   TO-DO LIST
===================================================== */
const TODOS_KEY = 'dashboard_todos';
const SORT_KEY  = 'dashboard_todo_sort';

let todos = [];
let currentSort = 'default'; // 'default' | 'alpha' | 'alpha-desc'

function initTodos() {
  todos = Store.get(TODOS_KEY, []);
  currentSort = Store.get(SORT_KEY, 'default');

  const sortSelect = document.getElementById('todo-sort');
  if (sortSelect) sortSelect.value = currentSort;

  const addBtn   = document.getElementById('todo-add-btn');
  const addInput = document.getElementById('todo-input');

  addBtn.addEventListener('click', () => addTodo(addInput.value));
  addInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addTodo(addInput.value);
  });

  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      currentSort = sortSelect.value;
      Store.set(SORT_KEY, currentSort);
      renderTodos();
    });
  }

  renderTodos();
}

function addTodo(rawText) {
  const text = rawText.trim();
  if (!text) {
    showToast('Please type a task first.', 'error');
    return;
  }
  if (text.length > 300) {
    showToast('Task is too long (max 300 characters).', 'error');
    return;
  }
  const task = { id: uid(), text, done: false, createdAt: Date.now() };
  todos.push(task);
  saveTodos();
  renderTodos();
  document.getElementById('todo-input').value = '';
  showToast('Task added!', 'success');
}

function toggleTodo(id) {
  const task = todos.find(t => t.id === id);
  if (!task) return;
  task.done = !task.done;
  saveTodos();
  renderTodos();
}

function deleteTodo(id) {
  todos = todos.filter(t => t.id !== id);
  saveTodos();
  renderTodos();
  showToast('Task deleted.', 'info');
}

function startEditTodo(id) {
  // Close any other open edits first
  document.querySelectorAll('.todo-item--editing').forEach(el => {
    const cancelBtn = el.querySelector('[data-action="cancel-edit"]');
    if (cancelBtn) cancelBtn.click();
  });

  const item = document.querySelector(`[data-id="${id}"]`);
  if (!item) return;

  const task = todos.find(t => t.id === id);
  if (!task) return;

  const textEl = item.querySelector('.todo-item__text');
  const editInput = item.querySelector('.todo-item__edit-input');
  const editBtn   = item.querySelector('[data-action="edit"]');
  const saveBtn   = item.querySelector('[data-action="save-edit"]');
  const cancelBtn = item.querySelector('[data-action="cancel-edit"]');

  textEl.style.display = 'none';
  editInput.style.display = 'block';
  editInput.value = task.text;
  editInput.focus();
  editBtn.style.display = 'none';
  if (saveBtn) saveBtn.style.display = '';
  if (cancelBtn) cancelBtn.style.display = '';
  item.classList.add('todo-item--editing');
}

function saveEditTodo(id) {
  const item = document.querySelector(`[data-id="${id}"]`);
  if (!item) return;
  const editInput = item.querySelector('.todo-item__edit-input');
  const newText = editInput.value.trim();
  if (!newText) {
    showToast('Task text cannot be empty.', 'error');
    return;
  }
  if (newText.length > 300) {
    showToast('Task is too long.', 'error');
    return;
  }
  const task = todos.find(t => t.id === id);
  if (task) {
    task.text = newText;
    saveTodos();
    renderTodos();
    showToast('Task updated.', 'success');
  }
}

function cancelEditTodo(id) {
  const item = document.querySelector(`[data-id="${id}"]`);
  if (!item) return;
  const textEl    = item.querySelector('.todo-item__text');
  const editInput = item.querySelector('.todo-item__edit-input');
  const editBtn   = item.querySelector('[data-action="edit"]');
  const saveBtn   = item.querySelector('[data-action="save-edit"]');
  const cancelBtn = item.querySelector('[data-action="cancel-edit"]');

  textEl.style.display = '';
  editInput.style.display = 'none';
  if (editBtn)   editBtn.style.display = '';
  if (saveBtn)   saveBtn.style.display = 'none';
  if (cancelBtn) cancelBtn.style.display = 'none';
  item.classList.remove('todo-item--editing');
}

function getSortedTodos() {
  // Always put incomplete tasks before completed ones first,
  // then apply secondary sort within each group.
  const incomplete = todos.filter(t => !t.done);
  const complete   = todos.filter(t =>  t.done);

  const sortFn = (a, b) => {
    if (currentSort === 'alpha')      return a.text.localeCompare(b.text);
    if (currentSort === 'alpha-desc') return b.text.localeCompare(a.text);
    if (currentSort === 'newest')     return b.createdAt - a.createdAt;
    if (currentSort === 'oldest')     return a.createdAt - b.createdAt;
    return 0; // 'default' = insertion order
  };

  return [...incomplete.sort(sortFn), ...complete.sort(sortFn)];
}

function renderTodos() {
  const list = document.getElementById('todo-list');
  const statsEl = document.getElementById('todo-stats');
  if (!list) return;

  const sorted = getSortedTodos();
  const total  = todos.length;
  const done   = todos.filter(t => t.done).length;

  if (statsEl) {
    statsEl.textContent = total > 0 ? `${done} / ${total} completed` : '';
  }

  if (total === 0) {
    list.innerHTML = `<li class="todo__empty">No tasks yet — add one above! ✨</li>`;
    return;
  }

  list.innerHTML = '';
  sorted.forEach(task => {
    const li = document.createElement('li');
    li.className = `todo-item${task.done ? ' todo-item--done' : ''}`;
    li.dataset.id = task.id;

    li.innerHTML = `
      <input class="todo-item__check" type="checkbox" ${task.done ? 'checked' : ''}
             aria-label="Mark task as ${task.done ? 'incomplete' : 'complete'}"
             tabindex="0">
      <div class="todo-item__body">
        <div class="todo-item__text">${escHtml(task.text)}</div>
        <input class="todo-item__edit-input input" type="text"
               aria-label="Edit task text" style="display:none"
               maxlength="300">
        ${task.done ? `<span class="todo-item__tag">Done</span>` : ''}
      </div>
      <div class="todo-item__actions">
        <button class="btn btn--icon btn--sm" data-action="edit"
                aria-label="Edit task" title="Edit">✏️</button>
        <button class="btn btn--icon btn--sm" data-action="save-edit"
                aria-label="Save edit" title="Save" style="display:none">💾</button>
        <button class="btn btn--icon btn--sm" data-action="cancel-edit"
                aria-label="Cancel edit" title="Cancel" style="display:none">✖️</button>
        <button class="btn btn--icon btn--sm" data-action="delete"
                aria-label="Delete task" title="Delete">🗑️</button>
      </div>`;

    // Checkbox
    li.querySelector('.todo-item__check').addEventListener('change', () => toggleTodo(task.id));
    // Edit
    li.querySelector('[data-action="edit"]').addEventListener('click', () => startEditTodo(task.id));
    // Save edit
    li.querySelector('[data-action="save-edit"]').addEventListener('click', () => saveEditTodo(task.id));
    // Cancel edit
    li.querySelector('[data-action="cancel-edit"]').addEventListener('click', () => cancelEditTodo(task.id));
    // Delete
    li.querySelector('[data-action="delete"]').addEventListener('click', () => {
      if (confirm(`Delete task: "${task.text}"?`)) deleteTodo(task.id);
    });
    // Save on Enter in edit input
    li.querySelector('.todo-item__edit-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveEditTodo(task.id);
      if (e.key === 'Escape') cancelEditTodo(task.id);
    });

    list.appendChild(li);
  });
}

function saveTodos() {
  Store.set(TODOS_KEY, todos);
}

/* =====================================================
   QUICK LINKS
===================================================== */
const LINKS_KEY = 'dashboard_links';

let links = [];

// Default starter links
const DEFAULT_LINKS = [
  { id: uid(), label: 'GitHub',    url: 'https://github.com' },
  { id: uid(), label: 'Google',    url: 'https://google.com' },
  { id: uid(), label: 'YouTube',   url: 'https://youtube.com' },
  { id: uid(), label: 'Wikipedia', url: 'https://wikipedia.org' },
];

function initLinks() {
  const stored = Store.get(LINKS_KEY, null);
  links = stored !== null ? stored : DEFAULT_LINKS;
  if (stored === null) saveLinks(); // persist defaults

  const addBtn   = document.getElementById('link-add-btn');
  const labelIn  = document.getElementById('link-label-input');
  const urlIn    = document.getElementById('link-url-input');

  addBtn.addEventListener('click', () => addLink(labelIn.value, urlIn.value));
  [labelIn, urlIn].forEach(inp => {
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addLink(labelIn.value, urlIn.value);
    });
  });

  renderLinks();
}

function addLink(rawLabel, rawUrl) {
  const label = rawLabel.trim().slice(0, 60);
  let   url   = rawUrl.trim();

  if (!url) {
    showToast('Please enter a URL.', 'error');
    return;
  }
  // Auto-prepend https:// if missing scheme
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  if (!isValidUrl(url)) {
    showToast('Invalid URL. Please check and try again.', 'error');
    return;
  }

  const displayLabel = label || hostname(url);
  links.push({ id: uid(), label: displayLabel, url });
  saveLinks();
  renderLinks();
  document.getElementById('link-label-input').value = '';
  document.getElementById('link-url-input').value   = '';
  showToast('Link added!', 'success');
}

function deleteLink(id) {
  links = links.filter(l => l.id !== id);
  saveLinks();
  renderLinks();
  showToast('Link removed.', 'info');
}

function renderLinks() {
  const grid = document.getElementById('links-grid');
  if (!grid) return;

  if (links.length === 0) {
    grid.innerHTML = `<p class="links__empty">No links yet. Add your favorites above! 🔗</p>`;
    return;
  }

  grid.innerHTML = '';
  links.forEach(link => {
    const anchor = document.createElement('a');
    anchor.className = 'link-item';
    anchor.href = link.url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.title = link.url;
    anchor.setAttribute('aria-label', `Open ${link.label} in a new tab`);

    const initial = (link.label[0] || '?').toUpperCase();
    const fav = faviconUrl(link.url);

    anchor.innerHTML = `
      ${fav
        ? `<img class="link-item__favicon" src="${escHtml(fav)}" alt="" aria-hidden="true"
               onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
        : ''}
      <div class="link-item__favicon-fallback" aria-hidden="true"
           style="${fav ? 'display:none' : ''}">${escHtml(initial)}</div>
      <span class="link-item__label">${escHtml(link.label)}</span>
      <span class="link-item__host">${escHtml(hostname(link.url))}</span>
      <button class="link-item__del" aria-label="Delete ${escHtml(link.label)}" title="Remove link">×</button>`;

    anchor.querySelector('.link-item__del').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (confirm(`Remove link: "${link.label}"?`)) deleteLink(link.id);
    });

    grid.appendChild(anchor);
  });
}

function saveLinks() {
  Store.set(LINKS_KEY, links);
}

/* =====================================================
   MODAL WIRE-UP
===================================================== */
function initModals() {
  // Name modal
  document.getElementById('name-modal-save').addEventListener('click', saveNameModal);
  document.getElementById('name-modal-cancel').addEventListener('click', closeNameModal);
  document.getElementById('name-modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeNameModal();
  });
  document.getElementById('name-modal-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveNameModal();
    if (e.key === 'Escape') closeNameModal();
  });
}

/* =====================================================
   NOTIFICATION PERMISSION (optional, for Pomodoro)
===================================================== */
function requestNotificationPermission() {
  if (Notification && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => { /* ignore */ });
  }
}

/* =====================================================
   INIT
===================================================== */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initClock();
  initPomodoro();
  initTodos();
  initLinks();
  initModals();
  requestNotificationPermission();
});
