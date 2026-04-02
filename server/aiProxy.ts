import 'dotenv/config';
import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';

const port = Number(process.env.PORT || process.env.AI_PROXY_PORT || 8787);
const app = express();

app.use(express.json({ limit: '1mb' }));

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server');
  }
  return new GoogleGenAI({ apiKey });
}

async function generateJson(prompt: string, responseSchema: Record<string, unknown>) {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema,
    },
  });

  return JSON.parse(response.text || '{}');
}

function safeHandler(
  fn: (req: express.Request) => Promise<unknown>,
): express.RequestHandler {
  return async (req, res) => {
    try {
      const result = await fn(req);
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown server error';
      const status = message.includes('GEMINI_API_KEY') ? 500 : 400;
      res.status(status).json({ error: message });
    }
  };
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/', (_req, res) => {
  res.status(200).json({
    ok: true,
    service: 'ai-proxy',
    health: '/api/health',
  });
});

app.post('/api/natal', safeHandler(async (req) => {
  const { name, date, time, location } = req.body as {
    name: string;
    date: string;
    time: string;
    location: string;
  };

  const prompt = `Act as an expert astrologer. Calculate the astrological natal chart for ${name}, born on ${date} at ${time} in ${location}. Provide the Sun, Moon, and Rising signs, a list of key planetary placements, and a comprehensive reading.`;

  return generateJson(prompt, {
    type: Type.OBJECT,
    properties: {
      sunSign: { type: Type.STRING },
      moonSign: { type: Type.STRING },
      risingSign: { type: Type.STRING },
      placements: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            planet: { type: Type.STRING },
            sign: { type: Type.STRING },
            house: { type: Type.STRING },
            description: { type: Type.STRING },
          },
        },
      },
      reading: { type: Type.STRING },
    },
    required: ['sunSign', 'moonSign', 'risingSign', 'placements', 'reading'],
  });
}));

app.post('/api/synastry', safeHandler(async (req) => {
  const { name1, date1, name2, date2 } = req.body as {
    name1: string;
    date1: string;
    name2: string;
    date2: string;
  };

  const prompt = `Act as an expert astrologer. Calculate the synastry (compatibility) between ${name1} (born ${date1}) and ${name2} (born ${date2}). Provide a compatibility score (0-100), strengths, challenges, and a detailed reading.`;

  return generateJson(prompt, {
    type: Type.OBJECT,
    properties: {
      score: { type: Type.NUMBER },
      strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
      challenges: { type: Type.ARRAY, items: { type: Type.STRING } },
      reading: { type: Type.STRING },
    },
    required: ['score', 'strengths', 'challenges', 'reading'],
  });
}));

app.post('/api/relocation', safeHandler(async (req) => {
  const { name, date, birthLocation, targetLocation } = req.body as {
    name: string;
    date: string;
    birthLocation: string;
    targetLocation: string;
  };

  const prompt = `Act as an expert astrologer specializing in Astrocartography (Local Space/Relocation astrology). Analyze how moving from ${birthLocation} to ${targetLocation} affects ${name} (born ${date}). Provide the vibe, career impact, love impact, and a detailed reading.`;

  return generateJson(prompt, {
    type: Type.OBJECT,
    properties: {
      cityVibe: { type: Type.STRING },
      careerImpact: { type: Type.STRING },
      loveImpact: { type: Type.STRING },
      reading: { type: Type.STRING },
    },
    required: ['cityVibe', 'careerImpact', 'loveImpact', 'reading'],
  });
}));

app.post('/api/tarot', safeHandler(async (req) => {
  const { question, spread } = req.body as {
    question: string;
    spread: '1-card' | '3-card';
  };

  const prompt = `Act as an expert Tarot reader. The user asks: "${question}". Draw ${spread === '1-card' ? '1 card' : '3 cards (Past, Present, Future)'}. Provide the card names, their orientation (upright/reversed), and a detailed, insightful reading.`;

  return generateJson(prompt, {
    type: Type.OBJECT,
    properties: {
      cards: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            position: { type: Type.STRING },
            name: { type: Type.STRING },
            orientation: { type: Type.STRING },
            meaning: { type: Type.STRING },
          },
        },
      },
      reading: { type: Type.STRING },
    },
    required: ['cards', 'reading'],
  });
}));

app.post('/api/horoscope', safeHandler(async (req) => {
  const { sign, timeframe } = req.body as {
    sign: string;
    timeframe: 'daily' | 'weekly';
  };

  const prompt = `Act as an expert astrologer. Provide a ${timeframe} horoscope for ${sign}. Include general themes, love, and career.`;

  return generateJson(prompt, {
    type: Type.OBJECT,
    properties: {
      general: { type: Type.STRING },
      love: { type: Type.STRING },
      career: { type: Type.STRING },
      luckyColor: { type: Type.STRING },
      luckyNumber: { type: Type.NUMBER },
    },
    required: ['general', 'love', 'career', 'luckyColor', 'luckyNumber'],
  });
}));

app.listen(port, () => {
  console.log(`AI proxy listening on http://localhost:${port}`);
});
