/**
 * Kalai AI Chatbot — Embeddable Widget (Vanilla JavaScript)
 * Drop this script into any HTML page to embed the chatbot.
 *
 * Usage:
 *   <script>
 *     window.KalaiChat = {
 *       apiUrl: 'https://your-api-url.com',
 *       botName: 'Kalai Assistant',
 *       primaryColor: '#7C3AED',
 *       welcomeMessage: 'Hi! How can I help you today? 🍽️',
 *       position: 'bottom-right', // 'bottom-right' | 'bottom-left'
 *     };
 *   </script>
 *   <script src="chatbot-widget.js" async></script>
 */

(function () {
  'use strict';

  // ─── Configuration ────────────────────────────────────────────────────────
  const config = Object.assign({
    apiUrl: 'http://localhost:5000',
    botName: 'Kalai Assistant',
    primaryColor: '#7C3AED',
    welcomeMessage: 'Hi there! 👋 How can I help you today?',
    position: 'bottom-right',
    zIndex: 9999,
  }, window.KalaiChat || {});

  let sessionId = localStorage.getItem('kalai_session_id') || null;
  let isOpen = false;
  let isTyping = false;
  let messages = [];

  // ─── Styles ───────────────────────────────────────────────────────────────
  const styles = `
    #kalai-widget * { box-sizing: border-box; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 0; }
    #kalai-widget { position: fixed; ${config.position === 'bottom-left' ? 'left: 24px;' : 'right: 24px;'} bottom: 24px; z-index: ${config.zIndex}; display: flex; flex-direction: column; align-items: ${config.position === 'bottom-left' ? 'flex-start' : 'flex-end'}; gap: 12px; }
    
    #kalai-toggle { width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, ${config.primaryColor}, #9333ea); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 30px rgba(124,58,237,0.5); transition: transform 0.2s, box-shadow 0.2s; }
    #kalai-toggle:hover { transform: scale(1.08); box-shadow: 0 12px 40px rgba(124,58,237,0.7); }
    #kalai-toggle svg { width: 26px; height: 26px; fill: none; stroke: white; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; transition: opacity 0.2s; }
    
    #kalai-badge { position: absolute; top: -4px; right: -4px; width: 20px; height: 20px; background: #EF4444; border-radius: 50%; border: 2px solid #0A0A0F; display: none; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: white; }
    #kalai-badge.visible { display: flex; animation: kalai-pulse 1s ease infinite; }
    
    @keyframes kalai-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.2)} }
    @keyframes kalai-slide-up { from{opacity:0;transform:translateY(20px) scale(0.95)} to{opacity:1;transform:translateY(0) scale(1)} }
    @keyframes kalai-slide-down { from{opacity:1;transform:translateY(0) scale(1)} to{opacity:0;transform:translateY(20px) scale(0.95)} }
    @keyframes kalai-dot { 0%,60%,100%{transform:translateY(0);opacity:0.4} 30%{transform:translateY(-6px);opacity:1} }
    @keyframes kalai-fade-in { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
    
    #kalai-window { width: 360px; height: 520px; background: #111118; border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,58,237,0.1); display: flex; flex-direction: column; overflow: hidden; animation: kalai-slide-up 0.35s cubic-bezier(0.34,1.56,0.64,1); }
    #kalai-window.closing { animation: kalai-slide-down 0.25s ease forwards; }
    
    #kalai-header { background: linear-gradient(135deg, ${config.primaryColor}dd, #9333eacc); padding: 14px 16px; display: flex; align-items: center; gap: 10px; }
    #kalai-avatar { width: 36px; height: 36px; background: rgba(255,255,255,0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center; }
    #kalai-avatar svg { width: 18px; height: 18px; stroke: white; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    #kalai-header-info { flex: 1; }
    #kalai-bot-name { font-size: 14px; font-weight: 700; color: white; }
    #kalai-status { font-size: 11px; color: rgba(255,255,255,0.7); display: flex; align-items: center; gap: 4px; margin-top: 1px; }
    #kalai-status-dot { width: 7px; height: 7px; background: #34D399; border-radius: 50%; }
    #kalai-close { background: none; border: none; cursor: pointer; color: rgba(255,255,255,0.7); padding: 4px; border-radius: 8px; display: flex; align-items: center; justify-content: center; transition: background 0.2s; }
    #kalai-close:hover { background: rgba(255,255,255,0.1); color: white; }
    #kalai-close svg { width: 18px; height: 18px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; }
    
    #kalai-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; scroll-behavior: smooth; }
    #kalai-messages::-webkit-scrollbar { width: 4px; }
    #kalai-messages::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.3); border-radius: 4px; }
    
    .kalai-msg { display: flex; gap: 8px; animation: kalai-fade-in 0.3s ease; max-width: 85%; }
    .kalai-msg.user { align-self: flex-end; flex-direction: row-reverse; }
    .kalai-msg.bot { align-self: flex-start; }
    .kalai-msg-avatar { width: 28px; height: 28px; border-radius: 50%; background: rgba(124,58,237,0.2); border: 1px solid rgba(124,58,237,0.3); display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 4px; }
    .kalai-msg-avatar svg { width: 13px; height: 13px; stroke: ${config.primaryColor}; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .kalai-bubble-wrap { display: flex; flex-direction: column; gap: 4px; }
    .kalai-bubble { padding: 10px 14px; border-radius: 16px; font-size: 13.5px; line-height: 1.55; word-break: break-word; }
    .kalai-bubble.user { background: linear-gradient(135deg, ${config.primaryColor}, #9333ea); color: white; border-radius: 16px 16px 4px 16px; }
    .kalai-bubble.bot { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); color: #e2e2ee; border-radius: 16px 16px 16px 4px; }
    .kalai-time { font-size: 10px; color: rgba(255,255,255,0.3); padding: 0 4px; }
    .kalai-msg.user .kalai-time { text-align: right; }
    
    .kalai-typing { display: flex; gap: 4px; padding: 12px 14px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px 16px 16px 4px; }
    .kalai-typing span { width: 7px; height: 7px; background: ${config.primaryColor}; border-radius: 50%; animation: kalai-dot 1.4s infinite; }
    .kalai-typing span:nth-child(2) { animation-delay: 0.2s; }
    .kalai-typing span:nth-child(3) { animation-delay: 0.4s; }
    
    #kalai-input-area { padding: 12px; border-top: 1px solid rgba(255,255,255,0.06); display: flex; gap: 8px; align-items: flex-end; background: #0D0D14; }
    #kalai-input { flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 10px 14px; color: white; font-size: 13.5px; resize: none; max-height: 100px; outline: none; font-family: inherit; line-height: 1.5; transition: border-color 0.2s; }
    #kalai-input::placeholder { color: rgba(255,255,255,0.3); }
    #kalai-input:focus { border-color: ${config.primaryColor}66; }
    #kalai-send { width: 38px; height: 38px; border-radius: 10px; background: linear-gradient(135deg, ${config.primaryColor}, #9333ea); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: transform 0.2s, opacity 0.2s; }
    #kalai-send:hover { transform: scale(1.08); }
    #kalai-send:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    #kalai-send svg { width: 17px; height: 17px; stroke: white; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    
    #kalai-powered { text-align: center; font-size: 10px; color: rgba(255,255,255,0.2); padding: 6px; background: #0D0D14; }
    
    @media (max-width: 420px) {
      #kalai-window { width: calc(100vw - 32px); height: 70vh; border-radius: 16px; }
      #kalai-widget { ${config.position === 'bottom-left' ? 'left: 12px;' : 'right: 12px;'} bottom: 12px; }
    }
  `;

  // ─── SVG Icons ────────────────────────────────────────────────────────────
  const icons = {
    bot: '<svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="7" r="3"/><path d="M12 4V2M8 2h8"/><circle cx="9" cy="16" r="1.5" fill="currentColor" stroke="none"/><circle cx="15" cy="16" r="1.5" fill="currentColor" stroke="none"/></svg>',
    close: '<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    send: '<svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
    chat: '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    user: '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const formatTime = (d = new Date()) =>
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const api = async (endpoint, options = {}) => {
    const res = await fetch(`${config.apiUrl}/api${endpoint}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  };

  // ─── DOM Construction ─────────────────────────────────────────────────────
  const buildWidget = () => {
    // Inject styles
    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);

    // Widget container
    const widget = document.createElement('div');
    widget.id = 'kalai-widget';

    // Chat window
    widget.innerHTML = `
      <div id="kalai-window" style="display:none;">
        <div id="kalai-header">
          <div id="kalai-avatar">${icons.bot}</div>
          <div id="kalai-header-info">
            <div id="kalai-bot-name">${config.botName}</div>
            <div id="kalai-status"><span id="kalai-status-dot"></span>Online</div>
          </div>
          <button id="kalai-close" title="Close">${icons.close}</button>
        </div>
        <div id="kalai-messages"></div>
        <div id="kalai-input-area">
          <textarea id="kalai-input" rows="1" placeholder="Type your message…"></textarea>
          <button id="kalai-send" title="Send">${icons.send}</button>
        </div>
        <div id="kalai-powered">Powered by Kalai AI</div>
      </div>
      <div style="position:relative;">
        <button id="kalai-toggle" title="Chat with us">${icons.chat}</button>
        <div id="kalai-badge">1</div>
      </div>
    `;

    document.body.appendChild(widget);

    // Event listeners
    document.getElementById('kalai-toggle').addEventListener('click', toggleWidget);
    document.getElementById('kalai-close').addEventListener('click', closeWidget);
    document.getElementById('kalai-send').addEventListener('click', handleSend);
    document.getElementById('kalai-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    });
    document.getElementById('kalai-input').addEventListener('input', autoResize);
  };

  const autoResize = () => {
    const el = document.getElementById('kalai-input');
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
  };

  // ─── Widget Open/Close ────────────────────────────────────────────────────
  const toggleWidget = () => isOpen ? closeWidget() : openWidget();

  const openWidget = async () => {
    isOpen = true;
    const win = document.getElementById('kalai-window');
    document.getElementById('kalai-badge').classList.remove('visible');
    win.style.display = 'flex';
    win.style.flexDirection = 'column';
    win.classList.remove('closing');

    // Switch toggle icon
    document.getElementById('kalai-toggle').innerHTML = icons.close;

    // Init session if needed
    if (!sessionId) {
      try {
        const res = await api('/chat/session', { method: 'POST' });
        sessionId = res.data.sessionId;
        localStorage.setItem('kalai_session_id', sessionId);
      } catch (e) { console.warn('KalaiChat: session init failed', e); }
    }

    // Show welcome message if first time
    if (messages.length === 0) {
      addBotMessage(config.welcomeMessage);
    }

    scrollToBottom();
    document.getElementById('kalai-input').focus();
  };

  const closeWidget = () => {
    isOpen = false;
    const win = document.getElementById('kalai-window');
    win.classList.add('closing');
    document.getElementById('kalai-toggle').innerHTML = icons.chat;
    setTimeout(() => { win.style.display = 'none'; win.classList.remove('closing'); }, 250);
  };

  // ─── Messages ─────────────────────────────────────────────────────────────
  const addBotMessage = (text) => {
    messages.push({ role: 'bot', content: text, time: new Date() });
    renderMessage({ role: 'bot', content: text, time: new Date() });
    if (!isOpen) {
      document.getElementById('kalai-badge').classList.add('visible');
    }
  };

  const addUserMessage = (text) => {
    messages.push({ role: 'user', content: text, time: new Date() });
    renderMessage({ role: 'user', content: text, time: new Date() });
  };

  const renderMessage = (msg) => {
    const container = document.getElementById('kalai-messages');
    const isUser = msg.role === 'user';
    const div = document.createElement('div');
    div.className = `kalai-msg ${isUser ? 'user' : 'bot'}`;
    div.innerHTML = `
      ${!isUser ? `<div class="kalai-msg-avatar">${icons.bot}</div>` : ''}
      <div class="kalai-bubble-wrap">
        <div class="kalai-bubble ${isUser ? 'user' : 'bot'}">${escapeHtml(msg.content).replace(/\n/g, '<br>')}</div>
        <div class="kalai-time">${formatTime(msg.time)}</div>
      </div>
      ${isUser ? `<div class="kalai-msg-avatar">${icons.user}</div>` : ''}
    `;
    container.appendChild(div);
    scrollToBottom();
  };

  const showTyping = () => {
    const container = document.getElementById('kalai-messages');
    const div = document.createElement('div');
    div.className = 'kalai-msg bot';
    div.id = 'kalai-typing-indicator';
    div.innerHTML = `
      <div class="kalai-msg-avatar">${icons.bot}</div>
      <div class="kalai-typing"><span></span><span></span><span></span></div>
    `;
    container.appendChild(div);
    scrollToBottom();
  };

  const hideTyping = () => {
    const el = document.getElementById('kalai-typing-indicator');
    if (el) el.remove();
  };

  const scrollToBottom = () => {
    const el = document.getElementById('kalai-messages');
    if (el) el.scrollTop = el.scrollHeight;
  };

  const escapeHtml = (str) => str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  // ─── Send Message ─────────────────────────────────────────────────────────
  const handleSend = async () => {
    const input = document.getElementById('kalai-input');
    const text = input.value.trim();
    if (!text || isTyping) return;

    input.value = '';
    input.style.height = 'auto';
    addUserMessage(text);

    isTyping = true;
    document.getElementById('kalai-send').disabled = true;
    showTyping();

    try {
      const res = await api('/chat/message', {
        method: 'POST',
        body: JSON.stringify({ message: text, sessionId }),
      });

      if (res.data.sessionId && !sessionId) {
        sessionId = res.data.sessionId;
        localStorage.setItem('kalai_session_id', sessionId);
      }

      hideTyping();
      addBotMessage(res.data.response);
    } catch (err) {
      hideTyping();
      addBotMessage("Sorry, I'm having trouble connecting right now. Please try again in a moment.");
      console.error('KalaiChat error:', err);
    } finally {
      isTyping = false;
      document.getElementById('kalai-send').disabled = false;
      document.getElementById('kalai-input').focus();
    }
  };

  // ─── Init ─────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildWidget);
  } else {
    buildWidget();
  }

  // Expose public API
  window.KalaiChat = Object.assign(config, {
    open: openWidget,
    close: closeWidget,
    toggle: toggleWidget,
  });
})();
