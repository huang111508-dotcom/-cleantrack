import { GoogleGenAI } from "@google/genai";
import { CleaningLog, Location, Language } from "../types";

const apiKey = process.env.API_KEY || '';

export const analyzeCleaningData = async (
  logs: CleaningLog[],
  locations: Location[],
  language: Language
): Promise<string> => {
  if (!apiKey) {
    return language === 'zh' 
      ? "未检测到 API Key，无法进行 AI 分析。" 
      : "API Key is missing. Unable to perform AI analysis.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Prepare data summary for the prompt
    const now = Date.now();
    const todayStart = new Date().setHours(0,0,0,0);
    const todaysLogs = logs.filter(l => l.timestamp >= todayStart);

    const locationSummaries = locations.map(loc => {
      const count = todaysLogs.filter(l => l.locationId === loc.id).length;
      const progress = Math.round((count / loc.targetDailyFrequency) * 100);
      const name = language === 'zh' ? loc.nameZh : loc.nameEn;
      return `- ${name} (${loc.zone}): Cleaned ${count}/${loc.targetDailyFrequency} times. Progress: ${progress}%.`;
    }).join('\n');

    const prompt = `
      You are an Operations Manager AI for a large supermarket. 
      Analyze the following cleaning data for today. 
      Identify critical anomalies (locations significantly behind schedule), patterns of neglect, or success stories.
      The goal is to ensure hygiene compliance.

      Current Time: ${new Date(now).toLocaleTimeString()}
      
      Location Data:
      ${locationSummaries}

      Please provide a concise, bulleted executive summary of the cleaning status in ${language === 'zh' ? 'Chinese (Simplified)' : 'English'}.
      Highlight specific locations that need immediate attention if they are below 80% of their target prorated for the current time of day.
      Keep the tone professional and actionable.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || (language === 'zh' ? "未生成分析结果。" : "No analysis generated.");
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return language === 'zh' 
      ? "生成分析时出错，请稍后再试。" 
      : "Error generating analysis. Please try again later.";
  }
};