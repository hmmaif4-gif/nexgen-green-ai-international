const state = {
  messages: [],
  isGenerating: false,
  controller: null,
  currentPrompt: '',
  theme: localStorage.getItem('nexgen-theme') || 'dark'
};

const els = {
  sidebar: document.getElementById('sidebar'),
  historyList: document.getElementById('history-list'),
  welcomeScreen: document.getElementById('welcome-screen'),
  messages: document.getElementById('messages'),
  input: document.getElementById('message-input'),
  sendBtn: document.getElementById('send-btn'),
  stopBtn: document.getElementById('stop-btn'),
  counter: document.getElementById('char-counter'),
  toast: document.getElementById('toast'),
  clearBtn: document.getElementById('clear-chat'),
  newChatBtn: document.getElementById('new-chat-btn'),
  themeToggle: document.getElementById('theme-toggle'),
  sidebarToggle: document.getElementById('sidebar-toggle')
};

function applyTheme(theme) {
  const dark = theme === 'dark';
  document.body.classList.toggle('dark', dark);
  localStorage.setItem('nexgen-theme', theme);
  state.theme = theme;
}

function renderHistory() {
  const saved = localStorage.getItem('nexgen-messages');
  if (!saved) {
    els.historyList.innerHTML = '';
    return;
  }

  try {
    const parsed = JSON.parse(saved);
    els.historyList.innerHTML = '';
    if (!Array.isArray(parsed) || !parsed.length) return;

    parsed.slice(-6).reverse().forEach((item) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'history-item';
      btn.textContent = item.text ? item.text.trim().slice(0, 36) : 'New chat';
      btn.title = item.text || 'New chat';
      btn.addEventListener('click', () => {
        if (item.text) {
          els.input.value = item.text;
          autoResize();
          els.input.focus();
        }
      });
      els.historyList.appendChild(btn);
    });
  } catch (error) {
    console.error('History parse failed', error);
  }
}

function saveChat() {
  localStorage.setItem('nexgen-messages', JSON.stringify(state.messages));
  renderHistory();
}

function loadChat() {
  try {
    const saved = localStorage.getItem('nexgen-messages');
    if (!saved) {
      state.messages = [];
      return;
    }

    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed)) {
      state.messages = parsed;
    }
  } catch (error) {
    console.error('Could not read stored chat', error);
    state.messages = [];
  }

  if (state.messages.length > 0) {
    els.welcomeScreen.style.display = 'none';
    renderMessages();
  } else {
    els.welcomeScreen.style.display = 'block';
    els.messages.innerHTML = '';
  }

  renderHistory();
}

function updateCounter() {
  const length = els.input.value.length;
  els.counter.textContent = `${length} / 12000`;
}

function autoResize() {
  const el = els.input;
  el.style.height = 'auto';
  el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = setTimeout(() => els.toast.classList.remove('show'), 2200);
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatMarkdown(text) {
  if (!text) return '';

  let html = escapeHtml(text);

  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
    const safeCode = code.trim();
    return `
      <pre>
        <div class="code-header"><span>${lang || 'code'}</span><span>snippet</span></div>
        <code>${safeCode}</code>
      </pre>
    `;
  });

  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');
  html = html.replace(/^(.*)$/gm, (match) => {
    if (/^#{1,6}\s/.test(match)) {
      return match;
    }
    if (/^[-*]\s+/.test(match)) {
      return match;
    }
    if (/^\d+\.\s+/.test(match)) {
      return match;
    }
    if (/^>\s+/.test(match)) {
      return match;
    }
    return match;
  });

  html = html.replace(/^(<br>)+/, '');
  html = html.replace(/(<br>)+$/, '');
  html = html.replace(/</g, '');
  html = html.replace(/>/g, '');

  return html;
}

function renderMessages() {
  els.messages.innerHTML = '';

  if (state.messages.length === 0) {
    els.welcomeScreen.style.display = 'block';
    return;
  }

  els.welcomeScreen.style.display = 'none';

  state.messages.forEach((message, index) => {
    const row = document.createElement('div');
    row.className = `message-row ${message.role === 'user' ? 'user' : 'ai'}`;

    const avatar = document.createElement('div');
    avatar.className = `avatar ${message.role === 'user' ? 'user' : 'ai'}`;
    avatar.innerHTML = message.role === 'user' ? '<svg viewBox="0 0 24 24"><path d="M20 21a8 8 0 0 0-16 0M12 11a4 4 0 1 0 0-8a4 4 0 0 0 0 8Z" /></svg>' : '<svg viewBox="0 0 24 24"><path d="M12 2l2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6L12 2Z" /></svg>';

    const content = document.createElement('div');
    content.className = 'message-content';

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.innerHTML = message.role === 'assistant' ? formatMarkdown(message.text) : message.text;

    content.appendChild(bubble);

    if (message.role === 'assistant') {
      const actions = document.createElement('div');
      actions.className = 'message-actions';

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'message-action';
      copyBtn.title = 'Copy';
      copyBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M9 9.5A2.5 2.5 0 0 1 11.5 7H18a2 2 0 0 1 2 2v6.5A2.5 2.5 0 0 1 17.5 18H11.5A2.5 2.5 0 0 1 9 15.5v-6Z" /><path d="M15 3H6a2 2 0 0 0-2 2v9.5A2.5 2.5 0 0 0 6.5 17H8" /></svg>';
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(message.text);
          showToast('উত্তর কপি হয়েছে');
        } catch (error) {
          console.error(error);
          showToast('কপি করা যায়নি');
        }
      });

      const regenBtn = document.createElement('button');
      regenBtn.type = 'button';
      regenBtn.className = 'message-action';
      regenBtn.title = 'Regenerate';
      regenBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 0 0 15.3 6.3M21 12a9 9 0 0 0-15.3-6.3M8 8H3v5M16 16h5v-5" /></svg>';
      regenBtn.addEventListener('click', () => regenerateResponse(index));

      actions.appendChild(copyBtn);
      actions.appendChild(regenBtn);
      content.appendChild(actions);
    }

    if (message.role === 'user') {
      row.appendChild(content);
      row.appendChild(avatar);
    } else {
      row.appendChild(avatar);
      row.appendChild(content);
    }

    els.messages.appendChild(row);
  });

  const scrollTarget = els.messages.lastElementChild;
  if (scrollTarget) scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

function addUserMessage(text) {
  state.messages.push({ role: 'user', text });
  saveChat();
  renderMessages();
}

function addAssistantMessage(text) {
  state.messages.push({ role: 'assistant', text });
  saveChat();
  renderMessages();
}

function addLoadingMessage() {
  const row = document.createElement('div');
  row.className = 'message-row ai';
  row.id = 'thinking-row';

  const avatar = document.createElement('div');
  avatar.className = 'avatar ai';
  avatar.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 2l2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6L12 2Z" /></svg>';

  const content = document.createElement('div');
  content.className = 'message-content';

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.innerHTML = `
    <div class="typing-indicator" aria-label="Thinking">
      <span></span>
      <span></span>
      <span></span>
    </div>
  `;

  content.appendChild(bubble);
  row.appendChild(avatar);
  row.appendChild(content);
  els.messages.appendChild(row);
}

function removeLoading() {
  const loader = document.getElementById('thinking-row');
  if (loader) loader.remove();
}

function clearChat() {
  state.messages = [];
  localStorage.removeItem('nexgen-messages');
  renderHistory();
  els.messages.innerHTML = '';
  els.welcomeScreen.style.display = 'block';
  showToast('চ্যাট পরিষ্কার হয়েছে');
}

async function sendRequest(prompt) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: prompt, history: state.messages.slice(-10) })
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'AI request failed');
  }

  return data.response;
}

async function generateResponse(prompt) {
  state.isGenerating = true;
  state.currentPrompt = prompt;
  els.sendBtn.disabled = true;
  els.stopBtn.classList.add('active');
  addLoadingMessage();

  try {
    const answer = await sendRequest(prompt);
    removeLoading();
    addAssistantMessage(answer);
  } catch (error) {
    removeLoading();
    addAssistantMessage('দুঃখিত! AI সার্ভারের সাথে যোগাযোগ করতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন.');
    console.error(error);
    showToast(error.message || 'সার্ভার সমস্যায়');
  } finally {
    state.isGenerating = false;
    state.currentPrompt = '';
    els.sendBtn.disabled = false;
    els.stopBtn.classList.remove('active');
    els.input.focus();
  }
}

function handleSubmit() {
  const text = els.input.value.trim();
  if (!text || state.isGenerating) return;

  addUserMessage(text);
  els.input.value = '';
  updateCounter();
  autoResize();
  generateResponse(text);
}

function regenerateResponse(index) {
  const target = state.messages[index];
  if (!target) return;
  state.messages = state.messages.slice(0, index);
  saveChat();
  const prompt = target.text;
  renderMessages();
  generateResponse(prompt);
}

function bindEvents() {
  els.newChatBtn.addEventListener('click', () => {
    els.input.value = '';
    updateCounter();
    clearChat();
    els.input.focus();
  });

  els.clearBtn.addEventListener('click', () => {
    clearChat();
  });

  els.sendBtn.addEventListener('click', handleSubmit);
  els.stopBtn.addEventListener('click', () => {
    if (state.isGenerating) {
      state.isGenerating = false;
      els.stopBtn.classList.remove('active');
      els.sendBtn.disabled = false;
      removeLoading();
      showToast('উত্তর তৈরি বন্ধ করা হয়েছে');
    }
  });

  els.input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  });

  els.input.addEventListener('input', () => {
    autoResize();
    updateCounter();
  });

  document.querySelectorAll('.suggestion-card').forEach((card) => {
    card.addEventListener('click', () => {
      const prompt = card.dataset.prompt;
      els.input.value = prompt;
      updateCounter();
      autoResize();
      els.input.focus();
    });
  });

  els.themeToggle.addEventListener('click', () => {
    const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
  });

  els.sidebarToggle.addEventListener('click', () => {
    els.sidebar.classList.toggle('open');
  });

  document.addEventListener('click', (event) => {
    if (window.innerWidth <= 860 && els.sidebar.classList.contains('open') && !els.sidebar.contains(event.target) && !els.sidebarToggle.contains(event.target)) {
      els.sidebar.classList.remove('open');
    }
  });
}

function init() {
  applyTheme(state.theme);
  loadChat();
  bindEvents();
  autoResize();
  updateCounter();
  els.input.focus();
}

init();
