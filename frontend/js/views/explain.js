import { api } from "../api.js";
import { el, loadingBlock } from "../ui.js";

export function ExplainView(root, { corridorId, corridors, onCorridorChange }) {
  root.innerHTML = "";
  const page = el("div", { class: "page" });
  root.appendChild(page);

  page.appendChild(
    el("div", { class: "page-header" }, [
      el("div", {}, [
        el("div", { class: "page-eyebrow" }, "Grounded in this platform's own data"),
        el("h1", {}, "Explain This Risk"),
      ]),
      corridorSelector(corridors, corridorId, onCorridorChange),
    ])
  );

  const chatWrap = el("div", { class: "card chat-card" });
  const messages = el("div", { class: "chat-messages" });

  const quickQs = el("div", { class: "quick-questions" }, [
    quickButton(messages, corridorId, "Why is the risk level what it is?"),
    quickButton(messages, corridorId, "How confident is this assessment?"),
    quickButton(messages, corridorId, "What should authorities do right now?"),
  ]);

  const input = el("input", { type: "text", placeholder: "Ask a question about this corridor's risk…" });
  const sendBtn = el("button", { class: "btn btn-primary", type: "submit" }, "Ask");
  const form = el(
    "form",
    {
      class: "chat-input-row",
      onsubmit: (e) => {
        e.preventDefault();
        if (!input.value.trim()) return;
        ask(messages, corridorId, input.value.trim());
        input.value = "";
      },
    },
    [input, sendBtn]
  );

  chatWrap.appendChild(messages);
  chatWrap.appendChild(quickQs);
  chatWrap.appendChild(form);
  page.appendChild(chatWrap);

  addMessage(messages, "assistant", `Ask me anything about the current risk assessment for this corridor. For example: "Why is this high?" or "What should I do?"`);
}

function corridorSelector(corridors, selectedId, onChange) {
  const select = el(
    "select",
    { class: "corridor-select", onchange: (e) => onChange(Number(e.target.value)) },
    corridors.slice().sort((a, b) => a.name.localeCompare(b.name)).map((c) => el("option", { value: c.id, ...(c.id === selectedId ? { selected: "selected" } : {}) }, `${c.name} (${c.state})`))
  );
  return el("div", { class: "corridor-selector" }, [el("label", {}, "Pilot corridor"), select]);
}

function quickButton(messages, corridorId, question) {
  return el("button", { class: "btn btn-chip btn-small", onclick: () => ask(messages, corridorId, question) }, question);
}

async function ask(messages, corridorId, question) {
  addMessage(messages, "user", question);
  const loadingMsg = addMessage(messages, "assistant", "");
  loadingMsg.appendChild(loadingBlock("Thinking…"));
  try {
    const res = await api.explain(corridorId, question);
    loadingMsg.innerHTML = "";
    loadingMsg.appendChild(el("p", {}, res.answer));
    loadingMsg.appendChild(el("span", { class: "muted tiny mode-tag" }, `mode: ${res.mode}`));
  } catch (err) {
    loadingMsg.innerHTML = "";
    loadingMsg.appendChild(el("p", { class: "error-text" }, err.message));
  }
  messages.scrollTop = messages.scrollHeight;
}

function addMessage(container, role, text) {
  const bubble = el("div", { class: `chat-bubble chat-${role}` }, text ? [el("p", {}, text)] : []);
  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
  return bubble;
}
