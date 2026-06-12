import { GoogleGenAI } from '@google/genai';

/**
 * Generates immediate concise debugging hints when compilation or tests fail
 */
export const generateDebugFeedback = async (problemTitle, problemDescription, userCode, executionError) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return "AI Guidance Offline: GEMINI_API_KEY missing from environment parameter layers.";
  }

  // Instantiate the clean, verified SDK client
  const ai = new GoogleGenAI({ apiKey: apiKey });

  const prompt = `
You are an expert compiler engineer and competitive programmer code judge.
Review this code optimization failure.

[PROBLEM PROFILE]
Title: ${problemTitle}
Description: ${problemDescription}

[USER CODE CODE]
${userCode}

[COMPILER/TEST EXCEPTION LOG]
${executionError}

[CRITICAL INSTRUCTIONS]
Identify why the code failed or miscalculated. Provide exactly 3 bullet points listing:
1. The broken logical line/assumption.
2. Why it fails to compute the target test case matrix.
3. A small, text-based code suggestion hint.
Do not use paragraphs. Keep each bullet point under 15 words.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt
    });

    return response.text?.trim() || "Review your base/edge case parameters and pointer loop step bounds.";
  } catch (err) {
    console.error("AI Code Sandbox Debugger tracking breakdown:", err.message);
    return "🤖 AI Debugger is busy tracking separate server clusters. Double check your syntax tree statements manual-style!";
  }
};