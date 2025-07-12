# CLAUDE.md

> **Reverbia** — AI‑powered meeting assistant  
> Automatically pulled into context by `claude` CLI to streamline conversational AI workflows.

---

## 1. Project Overview

- **What is Reverbia?**  
  Enable anyone to fully engage in important conversations — whether project planning, technical reviews, or client discussions — while AI handles the recording, understanding, documentation, and follow‑up.

- **Primary Tasks for Claude:**  
  1. **Transcription understanding** (Whisper output cleanup)  
  2. **Summarization & Key‑Point Extraction** (decisions, action items, risks)  
  3. **Structured Output Generation** (SOWs, technical specs, project briefs)  
  4. **Conversational Q&A** over meeting transcripts & uploaded docs  

---

## 2. Environment & Tools

- **Language & Framework**  
  - TypeScript, React (Next.js)  
  - Tailwind CSS, shadcn/ui  
- **Backend Services**  
  - Supabase (Auth, Storage, Postgres)  
  - ChromaDB (vector store)  
- **CLI & Utilities**  
  - `claude` CLI (agentic coding & prompt testing)  
  - Node.js & npm scripts (`npm run dev`, `npm run build`)  
  - FFmpeg (audio processing)  

- **Logging**
  - whenever you run into an error, summarize the erorr along with the solution if found.
- **Task Logging**
  - After a task is complete, mark the task as complete in Tasks.md as [[x]](./Tasks.md)
- **User input**
  - at points where I need to do some work not in the development environment, stop and ask me to input any details or do any setting up work so that you can continue to develop.
---

## 3. Prompt Engineering Guidelines

### a. Keep Prompts Simple & Tool‑Oriented  
- ❌ “Hey Claude, what do you think?”  
- ✅ “Extract all action items from this transcript. Output as a JSON array of `{ owner, description, dueDate }`.”

### b. Modular Prompt Structure  
1. **Preprocess**: “Clean up this Whisper transcript—remove filler words, normalize timestamps.”  
2. **Retrieve Context**: “Here are embeddings‑based relevant chunks from ChromaDB.”  
3. **Core Task**: “Generate a project brief in Markdown with sections: Objective, Deliverables, Timeline, Costs.”  
4. **Postprocess**: “Validate that all headings appear and dates use ISO format.”

### c. Temperature & Token Settings  
- **Summaries**: `temperature: 0.2`, `max_tokens: 800`  
- **Spec Generation**: `temperature: 0.3`, `max_tokens: 1500`  
- **Q&A**: `temperature: 0.0–0.2` for deterministic answers  

---

## 4. CLAUDE.md Placement

- Place at **repo root** for global context.  
- Optionally add `.claude/local.md` for personal notes (in `.gitignore`).  
- In monorepos, duplicate in each service folder to surface service‑specific prompts.

---

## 5. Allowed Tools & Permissions

By default, Claude will prompt before running:
- **File operations** (`Edit`, `Move`, `Delete`)  
- **Shell commands** (`npm run dev`, `ffmpeg`, `supabase db push`)  

To streamline common tasks, consider pre‑allowing:
```jsonc
// .claude/settings.json
{
  "allowedTools": [
    "Edit", 
    "Bash(npm run dev)", 
    "Bash(ffmpeg *)", 
    "Bash(supabase *)"
  ]
}
