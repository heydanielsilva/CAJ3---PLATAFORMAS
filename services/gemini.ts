
import { GoogleGenAI } from "@google/genai";
import { Activity } from "../types";

export async function getAiInsights(activities: Activity[]): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const summaryData = activities.slice(0, 50).map(a => `${a.plataforma}: ${a.atividade} (${a.status})`).join('\n');
  
  const prompt = `
    Como um analista de dados sênior, analise estas pendências de desenvolvimento:
    ${summaryData}
    
    Forneça 3 insights rápidos e acionáveis para o gestor do projeto sobre quais plataformas focar ou riscos detectados.
    Responda em Português do Brasil.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Não foi possível gerar insights no momento.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Ocorreu um erro ao processar os insights com IA.";
  }
}
