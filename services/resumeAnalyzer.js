import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { GoogleGenAI } from '@google/genai';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Extracts plain text from a raw PDF file buffer
 */
const extractTextFromBuffer = async (fileBuffer) => {
  const data = new Uint8Array(fileBuffer);
  const loadingTask = pdfjs.getDocument({ data });
  const pdf = await loadingTask.promise;
  
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(" ");
    fullText += pageText + "\n";
  }
  return fullText;
};

/**
 * Evaluates semantic ATS scores with strict API key scoping parameters
 */
export const analyzeResumeData = async (fileBuffer, targetSector, jobDescription = "") => {
  // Explicitly clear any overlapping system tokens by locking your targeted key string variable
  const activeKey = process.env.GEMINI_API_KEY;
  if (!activeKey) throw new Error("AI Context Blocked: GEMINI_API_KEY is unconfigured inside your .env parameters.");

  const resumeText = await extractTextFromBuffer(fileBuffer);
  if (!resumeText || resumeText.trim().length < 20) {
    throw new Error("Parsing Failure: The uploaded file contains no machine-readable text.");
  }

  // FIX: Force pass the string token directly to the instance, overriding hidden system fallbacks
  const ai = new GoogleGenAI({ apiKey: activeKey });

  const systemPrompt = `
Analyze this resume text content for the targeted profession: ${targetSector}.
Role Requirements Context: ${jobDescription || "Standard competitive industry expectations."}

Resume Content:
${resumeText}

Compute a deep analysis and output an un-wrapped raw JSON structure matching these exact parameter keys. All point values must be strings limited to 12 words max. No paragraphs.

{
  "atsMatchScore": 85, 
  "sectorAlignment": "Short 1-sentence verdict.",
  "foundSkills": ["Skill1", "Skill2"],
  "keywordGapAnalysis": ["Add keyword X.", "Mention process Y."],
  "formattingCritique": ["Use strong action verbs.", "Quantify metric data."],
  "bulletRewrites": [{"original": "raw text", "suggested": "optimized metric text"}],
  "careerPathPrediction": "One sentence progression statement.",
  "toneVoiceAnalysis": "Short profile tone summary."
}
`;

  // We loop across 2.5-flash and the classic 2.0 endpoint fallback tracking matrices
  const targetModels = ['gemini-2.5-flash', 'gemini-2.0-flash'];
  let lastError = null;

  for (const modelName of targetModels) {
    let retries = 2;
    while (retries > 0) {
      try {
        console.log(`Forwarding resume content to endpoint via ${modelName}... 🤖`);
        
        const response = await ai.models.generateContent({
          model: modelName,
          contents: systemPrompt,
          config: { responseMimeType: "application/json" }
        });

        return JSON.parse(response.text);

      } catch (err) {
        lastError = err;
        const errMsg = err.message || "";
        
        // Handle 429 adjustments on the fly
        if (errMsg.includes('429') || errMsg.toLowerCase().includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED')) {
          console.warn(`[Quota Throttle] Retrying transaction loop on model ${modelName} after a brief 2-second clearance cooldown...`);
          await sleep(2000);
          retries--;
          continue;
        }
        break;
      }
    }
  }

  throw new Error(`AI Core Interrupted: Please confirm that your new API key string is saved inside backend/.env and restart your server node.`);
};