import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface WeeklyAuditData {
  tasks: Array<{ description: string; hours: number; category: string }>;
  efficiencyScore: number;
  classification: { development: number; operational: number; strategic: number };
  bottlenecks: string[];
  revenueRoadmap: Array<{ title: string; description: string }>;
}

export async function generateWeeklyAudit(tasks: Array<{ description: string; hours: number }>): Promise<WeeklyAuditData> {
  const prompt = `
    Ти си "AI Business Systems Architect". Твоята мисия е да максимизираш ефективността на моя ИИ бизнес.
    Анализирай следните задачи за седмицата:
    ${JSON.stringify(tasks, null, 2)}

    Приложи следния алгоритъм:
    1. Класифицирай всяка задача като "Развойна" (билдване на ИИ), "Оперативна" (администрация) или "Стратегическа" (продажби на ИИ).
    2. Оцени седмицата по Efficiency Score (0-100%) на базата на High-Leverage AI tasks (Развойни и Стратегически).
    3. Bottleneck Identification: Посочи къде губя време в задачи, които самият ИИ може да реши вместо мен.
    4. Revenue Roadmap: Предложи 3 преки пътя за монетизация на ИИ уменията или приложенията.

    Върни резултата в JSON формат.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          tasks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING },
                hours: { type: Type.NUMBER },
                category: { type: Type.STRING, enum: ["Развойна", "Оперативна", "Стратегическа"] }
              },
              required: ["description", "hours", "category"]
            }
          },
          efficiencyScore: { type: Type.NUMBER },
          classification: {
            type: Type.OBJECT,
            properties: {
              development: { type: Type.NUMBER },
              operational: { type: Type.NUMBER },
              strategic: { type: Type.NUMBER }
            },
            required: ["development", "operational", "strategic"]
          },
          bottlenecks: { type: Type.ARRAY, items: { type: Type.STRING } },
          revenueRoadmap: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ["title", "description"]
            }
          }
        },
        required: ["tasks", "efficiencyScore", "classification", "bottlenecks", "revenueRoadmap"]
      }
    }
  });

  const text = response.text || "{}";
  return JSON.parse(text);
}
