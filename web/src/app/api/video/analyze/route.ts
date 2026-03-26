import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

async function analyzeTranscriptForCaptions(transcript: string, prompt: string) {
  try {
    const clipPrompt = `You are given a video transcript. Analyze it and find the SINGLE BEST clip that most closely matches the prompt.
Return ONLY 1 clip object.
Requirements:
- Must include: start (number, seconds), end (number, seconds), text (exact quote from transcript)
- The clip should be 3-8 seconds long
- Pick the most relevant moment that directly matches the prompt

Return valid JSON: { "clips": [{"start": 5, "end": 12, "text": "exact words from transcript"}] }

Transcript:
${transcript}
Prompt: "${prompt}"`;

    // 0th Priority: Groq (fastest, most reliable free tier — 30 RPM, no billing needed)
    if (process.env.GROQ_API_KEY) {
      const groqModels = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'gemma2-9b-it'];
      for (const model of groqModels) {
        try {
          const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: 'You are a helpful assistant that returns only valid JSON.' },
                { role: 'user', content: clipPrompt }
              ],
              temperature: 0.3,
            }),
          });
          const groqData = await groqResponse.json();
          if (groqData.error) throw new Error(groqData.error.message || JSON.stringify(groqData.error));
          const groqText = groqData.choices?.[0]?.message?.content?.trim() || '';
          if (groqText) {
            console.log(`Successfully used Groq model: ${model}`);
            return parseClips(groqText, prompt);
          }
        } catch (e: any) {
          console.warn(`Groq model ${model} failed: ${e.message}`);
        }
      }
    }

    // 1st Priority: Google Gemini via native REST API (try multiple model names)
    if (process.env.GEMINI_API_KEY) {
      const geminiModels = [
        'gemini-2.0-flash',
        'gemini-1.5-flash-latest',
        'gemini-1.5-flash',
        'gemini-pro',
      ];
      for (const geminiModel of geminiModels) {
        try {
          const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: clipPrompt }] }]
              })
            }
          );
          const geminiData = await geminiResponse.json();
          if (geminiData.error) throw new Error(geminiData.error.message);
          const geminiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
          if (geminiText) {
            console.log(`Successfully used Google Gemini model: ${geminiModel}`);
            return parseClips(geminiText, prompt);
          }
        } catch (e: any) {
          console.warn(`Gemini model ${geminiModel} failed: ${e.message}`);
        }
      }
      console.warn('All Gemini models failed – trying OpenRouter fallback...');
    }

    // 2nd Priority: OpenRouter (only if explicit OPENROUTER_API_KEY is set)
    if (process.env.OPENROUTER_API_KEY) {
      const orModels = [
        'mistralai/mistral-7b-instruct:free',
        'microsoft/phi-3-mini-128k-instruct:free',
        'qwen/qwen-2.5-72b-instruct:free',
        'meta-llama/llama-3.1-8b-instruct:free',
        'deepseek/deepseek-r1:free',
        'google/gemini-2.0-flash-exp:free',
      ];
      for (const model of orModels) {
        try {
          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
              'X-Title': 'AI-Gif-Creator'
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: clipPrompt }
              ]
            }),
          });
          const data = await response.json();
          if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
          const content = data.choices?.[0]?.message?.content?.trim() || '';
          if (content) {
            console.log(`Successfully used OpenRouter model: ${model}`);
            return parseClips(content, prompt);
          }
        } catch (err: any) {
          console.warn(`OpenRouter model ${model} failed: ${err.message}`);
        }
      }
    }

    throw new Error('No AI providers were available. Please check GEMINI_API_KEY or OPENROUTER_API_KEY in your .env file.');
  } catch (error: any) {
    console.error('DeepSeek analysis error:', error);
    throw error;
  }
}

function parseClips(content: string, prompt: string) {
  // Strip <think> tags from reasoning models
  if (content.includes('</think>')) content = content.split('</think>')[1].trim();
  // Strip markdown code fences
  if (content.startsWith('```')) content = content.replace(/```json|```/g, '').trim();

  let clips;
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) clips = parsed;
    else if (Array.isArray(parsed.clips)) clips = parsed.clips;
    else clips = Object.values(parsed);
  } catch {
    const match = content.match(/\[\s*{[\s\S]*?}\s*\]/);
    if (match) clips = JSON.parse(match[0]);
    else throw new Error('AI returned unrecognized format');
  }

  return clips.map((clip: any) => ({
    text: clip.text || clip.caption || 'Unknown caption',
    startTime: clip.start ?? clip.startTime ?? 0,
    endTime: clip.end ?? clip.endTime ?? 0,
    reason: `AI-generated caption matching: "${prompt}"`
  }));
}




function generateTimestampedText(words: any[]) {
  if (!words || !Array.isArray(words) || words.length === 0) return null;
  let result = '';
  let wordsSinceLastStamp = 0;
  for (let i = 0; i < words.length; i++) {
     const w = words[i];
     const text = typeof w === 'string' ? w : w.text;
     if (!text) continue;
     const prevWord = i > 0 ? (typeof words[i-1] === 'string' ? undefined : words[i-1]) : undefined;
     const isStartOfSentence = prevWord && typeof prevWord === 'object' && prevWord.text && /[.?!]$/.test(prevWord.text);
     if (i === 0 || isStartOfSentence || wordsSinceLastStamp > 15) {
        if (typeof w === 'object' && typeof w.start === 'number') {
           const s = Math.floor(w.start / 1000); // ms to sec
           const m = Math.floor(s / 60).toString().padStart(2, '0');
           const sec = (s % 60).toString().padStart(2, '0');
           result += ` [${m}:${sec}] `;
           wordsSinceLastStamp = 0;
        }
     }
     result += text + ' ';
     wordsSinceLastStamp++;
  }
  return result.trim().replace(/\s+/g, ' ');
}

export async function POST(req: NextRequest) {
  try {
    const { videoId, prompt } = await req.json();
    
    if (!videoId || !prompt) {
      return NextResponse.json({ error: 'Video ID and prompt are required' }, { status: 400 });
    }

    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: { transcript: true }
    });

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    if (!video.transcript?.fullText) {
      return NextResponse.json({ error: 'No transcript found for this video' }, { status: 400 });
    }

    let transcriptText = video.transcript.fullText;
    
    // Inject exact timestamps before analysis!
    if (video.transcript.words) {
      let wordsArr;
      if (typeof video.transcript.words === 'string') {
        try { wordsArr = JSON.parse(video.transcript.words); } catch(e) {}
      } else if (Array.isArray(video.transcript.words)) {
        wordsArr = video.transcript.words;
      }
      if (wordsArr) {
        transcriptText = generateTimestampedText(wordsArr) || transcriptText;
      }
    }

    // Analyze transcript to find caption-worthy lines
    const captions = await analyzeTranscriptForCaptions(transcriptText, prompt);

    return NextResponse.json({ 
      videoId,
      captions,
      prompt
    });

  } catch (err: any) {
    console.error('Analysis Error:', err);
    return NextResponse.json({ 
      error: 'Failed to analyze transcript',
      details: err.message 
    }, { status: 500 });
  }
}
