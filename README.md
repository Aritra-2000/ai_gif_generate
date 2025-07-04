# 🎬 AI-Powered GIF Generator

**Turn any MP4 into captioned GIFs with AI!**  
This tool analyzes video transcripts, extracts key moments based on your theme (e.g., "funny" or "motivational"), and generates shareable GIFs with overlaid captions.

👉 **Try it live:** https://ai-gif-generate.vercel.app/

![Demo Video] (assets/demo.gif)

![demo](https://github.com/user-attachments/assets/1d3a8f92-1f7a-44c8-a491-44062fdbc6d0)

![Demo GIF] assets/demo.gif

![demo](https://github.com/user-attachments/assets/4bedf849-b6ba-4937-9b76-e5964b69e9f0)

---

## 🚀 Features
- **Theme-based GIF extraction**: Enter prompts from audio transcript.
- **Auto-captioning**: Uses Assembly AI (or YouTube captions) for transcriptions.
- **Supports**:
  - Direct MP4 uploads

---

## ⚙️ How It Works
1. **User uplaod**: upload any short mp4.
2. **User Input**: Submit transcription prompt.
3. **Backend Processing**:
   - Audio transcribed via Assembly AI.
   - LLM (e.g., Deepseek) extracts relevant lines + timestamps.
   - FFmpeg clips video segments and overlays captions.
4. **Output**: Downloadable GIFs with captions.
---

## 🛠️ Installation
### Prerequisites
- FFmpeg
- OpenAI API key *(using Assembly/Deepseek)*

### Steps
```bash
git clone https://github.com/yourusername/ai-gif-generator.git
cd ai-gif-generator
npm install
npx prisma generate
