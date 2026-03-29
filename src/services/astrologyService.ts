import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getNatalChart(name: string, date: string, time: string, location: string) {
  const prompt = `Act as an expert astrologer. Calculate the astrological natal chart for ${name}, born on ${date} at ${time} in ${location}. Provide the Sun, Moon, and Rising signs, a list of key planetary placements, and a comprehensive reading.`;
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
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
                description: { type: Type.STRING }
              }
            }
          },
          reading: { type: Type.STRING }
        },
        required: ["sunSign", "moonSign", "risingSign", "placements", "reading"]
      }
    }
  });
  return JSON.parse(response.text || "{}");
}

export async function getSynastry(name1: string, date1: string, name2: string, date2: string) {
  const prompt = `Act as an expert astrologer. Calculate the synastry (compatibility) between ${name1} (born ${date1}) and ${name2} (born ${date2}). Provide a compatibility score (0-100), strengths, challenges, and a detailed reading.`;
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          challenges: { type: Type.ARRAY, items: { type: Type.STRING } },
          reading: { type: Type.STRING }
        },
        required: ["score", "strengths", "challenges", "reading"]
      }
    }
  });
  return JSON.parse(response.text || "{}");
}

export async function getRelocation(name: string, date: string, birthLocation: string, targetLocation: string) {
  const prompt = `Act as an expert astrologer specializing in Astrocartography (Local Space/Relocation astrology). Analyze how moving from ${birthLocation} to ${targetLocation} affects ${name} (born ${date}). Provide the vibe, career impact, love impact, and a detailed reading.`;
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          cityVibe: { type: Type.STRING },
          careerImpact: { type: Type.STRING },
          loveImpact: { type: Type.STRING },
          reading: { type: Type.STRING }
        },
        required: ["cityVibe", "careerImpact", "loveImpact", "reading"]
      }
    }
  });
  return JSON.parse(response.text || "{}");
}

export async function getHoroscope(sign: string, timeframe: 'daily' | 'weekly') {
  const prompt = `Act as an expert astrologer. Provide a ${timeframe} horoscope for ${sign}. Include general themes, love, and career.`;
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          general: { type: Type.STRING },
          love: { type: Type.STRING },
          career: { type: Type.STRING },
          luckyColor: { type: Type.STRING },
          luckyNumber: { type: Type.NUMBER }
        },
        required: ["general", "love", "career", "luckyColor", "luckyNumber"]
      }
    }
  });
  return JSON.parse(response.text || "{}");
}
