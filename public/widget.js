/* ChatBot Widget - https://github.com/your-org/chatbot */
"use strict";var ChatBotWidgetModule=(()=>{var c=Object.defineProperty;var b=Object.getOwnPropertyDescriptor;var v=Object.getOwnPropertyNames;var x=Object.prototype.hasOwnProperty;var y=(i,e)=>{for(var t in e)c(i,t,{get:e[t],enumerable:!0})},k=(i,e,t,n)=>{if(e&&typeof e=="object"||typeof e=="function")for(let s of v(e))!x.call(i,s)&&s!==t&&c(i,s,{get:()=>e[s],enumerable:!(n=b(e,s))||n.enumerable});return i};var C=i=>k(c({},"__esModule",{value:!0}),i);var S={};y(S,{ChatBotWidget:()=>p});function u(i="#2563eb"){return`
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    .widget-container {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #1f2937;
    }

    /* Launcher button */
    .widget-launcher {
      position: fixed;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: ${i};
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s;
      z-index: 9998;
    }

    .widget-launcher:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }

    .widget-launcher.bottom-right {
      bottom: 20px;
      right: 20px;
    }

    .widget-launcher.bottom-left {
      bottom: 20px;
      left: 20px;
    }

    .widget-launcher svg {
      width: 28px;
      height: 28px;
      fill: white;
    }

    .widget-launcher.open svg.chat-icon {
      display: none;
    }

    .widget-launcher.open svg.close-icon {
      display: block;
    }

    .widget-launcher:not(.open) svg.chat-icon {
      display: block;
    }

    .widget-launcher:not(.open) svg.close-icon {
      display: none;
    }

    /* Chat window */
    .widget-window {
      position: fixed;
      width: 380px;
      height: 520px;
      max-height: calc(100vh - 100px);
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 9999;
      opacity: 0;
      transform: translateY(20px) scale(0.95);
      pointer-events: none;
      transition: opacity 0.2s, transform 0.2s;
    }

    .widget-window.visible {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }

    .widget-window.bottom-right {
      bottom: 90px;
      right: 20px;
    }

    .widget-window.bottom-left {
      bottom: 90px;
      left: 20px;
    }

    /* Header */
    .widget-header {
      background: linear-gradient(135deg, ${i} 0%, ${h(i,-20)} 100%);
      color: white;
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .widget-header-title {
      font-size: 18px;
      font-weight: 600;
      margin: 0;
    }

    .widget-header-subtitle {
      font-size: 12px;
      opacity: 0.9;
      margin-top: 2px;
    }

    .widget-new-chat {
      background: rgba(255, 255, 255, 0.15);
      border: none;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: background 0.2s;
    }

    .widget-new-chat:hover {
      background: rgba(255, 255, 255, 0.25);
    }

    .widget-new-chat svg {
      width: 12px;
      height: 12px;
    }

    /* Messages container */
    .widget-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      background: #f9fafb;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    /* Message bubbles */
    .widget-message {
      display: flex;
      flex-direction: column;
      max-width: 85%;
    }

    .widget-message.user {
      align-self: flex-end;
    }

    .widget-message.assistant {
      align-self: flex-start;
    }

    .widget-message-bubble {
      padding: 10px 14px;
      border-radius: 12px;
      word-wrap: break-word;
    }

    .widget-message.user .widget-message-bubble {
      background: ${i};
      color: white;
      border-bottom-right-radius: 4px;
    }

    .widget-message.assistant .widget-message-bubble {
      background: white;
      border: 1px solid #e5e7eb;
      border-bottom-left-radius: 4px;
    }

    .widget-message-time {
      font-size: 10px;
      color: #9ca3af;
      margin-top: 4px;
      padding: 0 4px;
    }

    .widget-message.user .widget-message-time {
      text-align: right;
    }

    /* Message actions */
    .widget-message-actions {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 4px;
      opacity: 0;
      transition: opacity 0.2s;
    }

    .widget-message:hover .widget-message-actions {
      opacity: 1;
    }

    .widget-action-btn {
      background: none;
      border: none;
      padding: 4px;
      cursor: pointer;
      border-radius: 4px;
      color: #9ca3af;
      transition: background 0.2s, color 0.2s;
    }

    .widget-action-btn:hover {
      background: #f3f4f6;
    }

    .widget-action-btn.positive {
      color: #22c55e;
      background: #f0fdf4;
    }

    .widget-action-btn.negative {
      color: #ef4444;
      background: #fef2f2;
    }

    .widget-action-btn svg {
      width: 14px;
      height: 14px;
    }

    /* Markdown content */
    .widget-message-content {
      font-size: 14px;
      line-height: 1.5;
    }

    .widget-message-content p {
      margin: 0 0 8px 0;
    }

    .widget-message-content p:last-child {
      margin-bottom: 0;
    }

    .widget-message-content ul,
    .widget-message-content ol {
      margin: 8px 0;
      padding-left: 20px;
    }

    .widget-message-content li {
      margin: 4px 0;
    }

    .widget-message-content code {
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'SF Mono', Monaco, Consolas, monospace;
      font-size: 13px;
    }

    .widget-message-content pre {
      background: #1f2937;
      color: #f9fafb;
      padding: 12px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 8px 0;
    }

    .widget-message-content pre code {
      background: none;
      padding: 0;
      color: inherit;
    }

    .widget-message-content a {
      color: ${i};
      text-decoration: underline;
    }

    .widget-message-content strong {
      font-weight: 600;
    }

    /* Loading indicator */
    .widget-loading {
      display: flex;
      gap: 4px;
      padding: 10px 14px;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      border-bottom-left-radius: 4px;
      align-self: flex-start;
    }

    .widget-loading-dot {
      width: 8px;
      height: 8px;
      background: #9ca3af;
      border-radius: 50%;
      animation: widget-bounce 1.4s ease-in-out infinite;
    }

    .widget-loading-dot:nth-child(1) { animation-delay: 0ms; }
    .widget-loading-dot:nth-child(2) { animation-delay: 150ms; }
    .widget-loading-dot:nth-child(3) { animation-delay: 300ms; }

    @keyframes widget-bounce {
      0%, 80%, 100% { transform: translateY(0); }
      40% { transform: translateY(-6px); }
    }

    /* Input area */
    .widget-input-area {
      padding: 12px 16px;
      border-top: 1px solid #e5e7eb;
      background: white;
    }

    .widget-input-form {
      display: flex;
      gap: 8px;
    }

    .widget-input {
      flex: 1;
      padding: 10px 14px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .widget-input:focus {
      border-color: ${i};
      box-shadow: 0 0 0 3px ${i}20;
    }

    .widget-input:disabled {
      background: #f9fafb;
      cursor: not-allowed;
    }

    .widget-send-btn {
      padding: 10px 16px;
      background: ${i};
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: background 0.2s;
    }

    .widget-send-btn:hover:not(:disabled) {
      background: ${h(i,-15)};
    }

    .widget-send-btn:disabled {
      background: #d1d5db;
      cursor: not-allowed;
    }

    .widget-send-btn svg {
      width: 16px;
      height: 16px;
    }

    /* Mobile responsiveness */
    @media (max-width: 480px) {
      .widget-window {
        width: calc(100vw - 20px);
        height: calc(100vh - 100px);
        max-height: none;
        bottom: 80px;
        right: 10px;
        left: 10px;
        border-radius: 12px;
      }

      .widget-window.bottom-left {
        right: 10px;
      }

      .widget-launcher {
        width: 54px;
        height: 54px;
      }

      .widget-launcher.bottom-right,
      .widget-launcher.bottom-left {
        bottom: 16px;
      }

      .widget-launcher.bottom-right {
        right: 16px;
      }

      .widget-launcher.bottom-left {
        left: 16px;
      }
    }
  `}function h(i,e){let t=parseInt(i.replace("#",""),16),n=Math.min(255,Math.max(0,(t>>16)+e)),s=Math.min(255,Math.max(0,(t>>8&255)+e)),o=Math.min(255,Math.max(0,(t&255)+e));return"#"+((1<<24)+(n<<16)+(s<<8)+o).toString(16).slice(1)}var d={chat:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>`,close:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>`,send:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>`,refresh:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="1 4 1 10 7 10"></polyline>
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
  </svg>`,copy:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>`,check:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>`,thumbsUp:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
  </svg>`,thumbsDown:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path>
  </svg>`};function w(i){let e=M(i);return e=e.replace(/```(\w*)\n([\s\S]*?)```/g,"<pre><code>$2</code></pre>"),e=e.replace(/`([^`]+)`/g,"<code>$1</code>"),e=e.replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>"),e=e.replace(/__([^_]+)__/g,"<strong>$1</strong>"),e=e.replace(/\*([^*]+)\*/g,"<em>$1</em>"),e=e.replace(/_([^_]+)_/g,"<em>$1</em>"),e=e.replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'),e=e.replace(/^[-*]\s+(.+)$/gm,"<li>$1</li>"),e=e.replace(/(<li>.*<\/li>\n?)+/g,"<ul>$&</ul>"),e=e.replace(/^\d+\.\s+(.+)$/gm,"<li>$1</li>"),e=e.replace(/^### (.+)$/gm,"<h3>$1</h3>"),e=e.replace(/^## (.+)$/gm,"<h2>$1</h2>"),e=e.replace(/^# (.+)$/gm,"<h1>$1</h1>"),e=e.split(/\n\n+/).map(t=>(t=t.trim(),t?/^<(ul|ol|pre|h[1-6]|blockquote)/.test(t)?t:`<p>${t}</p>`:"")).join(""),e=e.replace(/(<p>[\s\S]*?<\/p>)/g,t=>t.replace(/\n/g,"<br>")),e}function M(i){let e={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"};return i.replace(/[&<>"']/g,t=>e[t])}var $="chatbot_widget_",g=class{constructor(e){this.container=null;this.shadowRoot=null;this.isOpen=!1;this.messages=[];this.isLoading=!1;this.launcher=null;this.window=null;this.messagesContainer=null;this.input=null;this.sendButton=null;this.newChatButton=null;this.config={apiUrl:e.apiUrl,position:e.position||"bottom-right",primaryColor:e.primaryColor||"#2563eb",headerTitle:e.headerTitle||"Customer Support",headerSubtitle:e.headerSubtitle||"We're here to help!",placeholder:e.placeholder||"Type your message...",greeting:e.greeting||"Hello! How can I help you today? Feel free to ask about our courses, enrollment, pricing, or anything else.",defaultOpen:e.defaultOpen||!1,persistConversation:e.persistConversation!==!1,onOpen:e.onOpen||(()=>{}),onClose:e.onClose||(()=>{}),onMessage:e.onMessage||(()=>{})},this.init()}init(){this.container=document.createElement("div"),this.container.id="chatbot-widget-container",this.shadowRoot=this.container.attachShadow({mode:"open"});let e=document.createElement("style");e.textContent=u(this.config.primaryColor),this.shadowRoot.appendChild(e);let t=document.createElement("div");t.className="widget-container",t.innerHTML=this.getWidgetHTML(),this.shadowRoot.appendChild(t),document.body.appendChild(this.container),this.launcher=this.shadowRoot.querySelector(".widget-launcher"),this.window=this.shadowRoot.querySelector(".widget-window"),this.messagesContainer=this.shadowRoot.querySelector(".widget-messages"),this.input=this.shadowRoot.querySelector(".widget-input"),this.sendButton=this.shadowRoot.querySelector(".widget-send-btn"),this.newChatButton=this.shadowRoot.querySelector(".widget-new-chat"),this.bindEvents(),this.loadConversation(),this.config.defaultOpen&&this.open()}getWidgetHTML(){return`
      <!-- Launcher button -->
      <button class="widget-launcher ${this.config.position}" aria-label="Open chat">
        <svg class="chat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <svg class="close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      <!-- Chat window -->
      <div class="widget-window ${this.config.position}">
        <!-- Header -->
        <div class="widget-header">
          <div>
            <h2 class="widget-header-title">${this.escapeHtml(this.config.headerTitle)}</h2>
            <p class="widget-header-subtitle">${this.escapeHtml(this.config.headerSubtitle)}</p>
          </div>
          <button class="widget-new-chat" style="display: none;">
            ${d.refresh}
            <span>New Chat</span>
          </button>
        </div>

        <!-- Messages -->
        <div class="widget-messages"></div>

        <!-- Input area -->
        <div class="widget-input-area">
          <form class="widget-input-form">
            <input
              type="text"
              class="widget-input"
              placeholder="${this.escapeHtml(this.config.placeholder)}"
              autocomplete="off"
            />
            <button type="submit" class="widget-send-btn">
              ${d.send}
            </button>
          </form>
        </div>
      </div>
    `}bindEvents(){var t,n,s,o;(t=this.launcher)==null||t.addEventListener("click",()=>this.toggle());let e=(n=this.shadowRoot)==null?void 0:n.querySelector(".widget-input-form");e==null||e.addEventListener("submit",a=>{a.preventDefault(),this.handleSend()}),(s=this.newChatButton)==null||s.addEventListener("click",()=>this.startNewChat()),(o=this.input)==null||o.addEventListener("keydown",a=>{a.key==="Enter"&&!a.shiftKey&&(a.preventDefault(),this.handleSend())}),document.addEventListener("keydown",a=>{a.key==="Escape"&&this.isOpen&&this.close()})}loadConversation(){if(!this.config.persistConversation){this.initializeWithGreeting();return}try{let e=this.getStorageKey(),t=localStorage.getItem(e);if(t){let n=JSON.parse(t);this.messages=n.map(s=>({...s,timestamp:new Date(s.timestamp)}))}else this.initializeWithGreeting()}catch(e){this.initializeWithGreeting()}this.renderMessages(),this.updateNewChatVisibility()}initializeWithGreeting(){this.messages=[{role:"assistant",content:this.config.greeting,timestamp:new Date}]}saveConversation(){if(this.config.persistConversation)try{let e=this.getStorageKey();localStorage.setItem(e,JSON.stringify(this.messages))}catch(e){}}getStorageKey(){let e=new URL(this.config.apiUrl).hostname;return`${$}${e}`}async handleSend(){var n;let e=(n=this.input)==null?void 0:n.value.trim();if(!e||this.isLoading)return;this.input&&(this.input.value="");let t={role:"user",content:e,timestamp:new Date};this.messages.push(t),this.renderMessages(),this.saveConversation(),this.config.onMessage(t),this.isLoading=!0,this.updateInputState(),this.renderLoading();try{let s=await fetch(`${this.config.apiUrl}/api/chat`,{method:"POST",headers:{"Content-Type":"application/json","X-Widget-Origin":window.location.origin},body:JSON.stringify({message:e,conversationHistory:this.messages.slice(0,-1)})});if(!s.ok)throw new Error("Failed to get response");let o=await s.json(),a=`msg_${Date.now()}_${Math.random().toString(36).substring(2,9)}`,l={role:"assistant",content:o.response,timestamp:new Date,id:a,userMessage:e,feedback:null};this.messages.push(l),this.config.onMessage(l)}catch(s){let o={role:"assistant",content:"Sorry, I encountered an error. Please try again.",timestamp:new Date};this.messages.push(o)}this.isLoading=!1,this.updateInputState(),this.renderMessages(),this.saveConversation(),this.updateNewChatVisibility()}async submitFeedback(e,t){let n=this.messages.find(s=>s.id===e);if(n)try{(await fetch(`${this.config.apiUrl}/api/feedback`,{method:"POST",headers:{"Content-Type":"application/json","X-Widget-Origin":window.location.origin},body:JSON.stringify({messageId:e,userMessage:n.userMessage,assistantResponse:n.content,feedback:t})})).ok&&(n.feedback=t,this.saveConversation(),this.renderMessages())}catch(s){}}renderMessages(){this.messagesContainer&&(this.messagesContainer.innerHTML=this.messages.map((e,t)=>this.renderMessage(e,t)).join(""),this.messagesContainer.scrollTop=this.messagesContainer.scrollHeight,this.bindFeedbackButtons(),this.bindCopyButtons())}renderMessage(e,t){let n=this.formatTime(e.timestamp),s=e.role==="assistant",o="";if(s){let a="widget-action-btn copy-btn",l=`widget-action-btn thumbs-up ${e.feedback==="positive"?"positive":""}`,f=`widget-action-btn thumbs-down ${e.feedback==="negative"?"negative":""}`;o=`
        <div class="widget-message-actions">
          <button class="${a}" data-index="${t}" title="Copy">
            ${d.copy}
          </button>
          ${e.id?`
            <button class="${l}" data-id="${e.id}" title="Helpful">
              ${d.thumbsUp}
            </button>
            <button class="${f}" data-id="${e.id}" title="Not helpful">
              ${d.thumbsDown}
            </button>
          `:""}
        </div>
      `}return`
      <div class="widget-message ${e.role}">
        <div class="widget-message-bubble">
          <div class="widget-message-content">
            ${s?w(e.content):this.escapeHtml(e.content)}
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 4px;">
          <span class="widget-message-time">${n}</span>
          ${o}
        </div>
      </div>
    `}renderLoading(){if(!this.messagesContainer)return;let e=`
      <div class="widget-loading">
        <div class="widget-loading-dot"></div>
        <div class="widget-loading-dot"></div>
        <div class="widget-loading-dot"></div>
      </div>
    `;this.messagesContainer.innerHTML+=e,this.messagesContainer.scrollTop=this.messagesContainer.scrollHeight}bindFeedbackButtons(){var n,s;let e=(n=this.shadowRoot)==null?void 0:n.querySelectorAll(".thumbs-up"),t=(s=this.shadowRoot)==null?void 0:s.querySelectorAll(".thumbs-down");e==null||e.forEach(o=>{o.addEventListener("click",()=>{let a=o.getAttribute("data-id");a&&this.submitFeedback(a,"positive")})}),t==null||t.forEach(o=>{o.addEventListener("click",()=>{let a=o.getAttribute("data-id");a&&this.submitFeedback(a,"negative")})})}bindCopyButtons(){var t;let e=(t=this.shadowRoot)==null?void 0:t.querySelectorAll(".copy-btn");e==null||e.forEach(n=>{n.addEventListener("click",async()=>{let s=parseInt(n.getAttribute("data-index")||"0",10),o=this.messages[s];if(o)try{await navigator.clipboard.writeText(o.content),n.innerHTML=d.check,setTimeout(()=>{n.innerHTML=d.copy},2e3)}catch(a){}})})}updateInputState(){this.input&&(this.input.disabled=this.isLoading),this.sendButton&&(this.sendButton.disabled=this.isLoading)}updateNewChatVisibility(){this.newChatButton&&(this.newChatButton.style.display=this.messages.length>1?"flex":"none")}formatTime(e){return e.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",hour12:!0})}escapeHtml(e){let t=document.createElement("div");return t.textContent=e,t.innerHTML}startNewChat(){this.messages=[{role:"assistant",content:this.config.greeting,timestamp:new Date}],this.renderMessages(),this.saveConversation(),this.updateNewChatVisibility()}open(){var e,t,n;this.isOpen=!0,(e=this.launcher)==null||e.classList.add("open"),(t=this.window)==null||t.classList.add("visible"),(n=this.input)==null||n.focus(),this.config.onOpen()}close(){var e,t;this.isOpen=!1,(e=this.launcher)==null||e.classList.remove("open"),(t=this.window)==null||t.classList.remove("visible"),this.config.onClose()}toggle(){this.isOpen?this.close():this.open()}destroy(){var e;(e=this.container)==null||e.remove(),this.container=null,this.shadowRoot=null}sendMessage(e){this.input&&(this.input.value=e,this.handleSend())}};var r=null,p={init(i){if(r){console.warn("ChatBotWidget is already initialized. Call destroy() first to reinitialize.");return}if(!i.apiUrl){console.error("ChatBotWidget: apiUrl is required");return}r=new g(i)},open(){if(!r){console.warn("ChatBotWidget is not initialized. Call init() first.");return}r.open()},close(){if(!r){console.warn("ChatBotWidget is not initialized. Call init() first.");return}r.close()},toggle(){if(!r){console.warn("ChatBotWidget is not initialized. Call init() first.");return}r.toggle()},destroy(){r&&(r.destroy(),r=null)},sendMessage(i){if(!r){console.warn("ChatBotWidget is not initialized. Call init() first.");return}r.sendMessage(i)}};if(typeof window!="undefined"){window.ChatBotWidget=p;let i=document.currentScript;if(i){let e=i.getAttribute("data-api-url");e&&(document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>m(i,e)):m(i,e))}}function m(i,e){let t={apiUrl:e,position:i.getAttribute("data-position")||void 0,primaryColor:i.getAttribute("data-primary-color")||void 0,headerTitle:i.getAttribute("data-header-title")||void 0,headerSubtitle:i.getAttribute("data-header-subtitle")||void 0,placeholder:i.getAttribute("data-placeholder")||void 0,greeting:i.getAttribute("data-greeting")||void 0,defaultOpen:i.getAttribute("data-default-open")==="true",persistConversation:i.getAttribute("data-persist-conversation")!=="false"};p.init(t)}return C(S);})();

// Ensure ChatBotWidget is available globally
if (typeof window !== 'undefined' && !window.ChatBotWidget) {
  window.ChatBotWidget = ChatBotWidgetModule.ChatBotWidget;
}

