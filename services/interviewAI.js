import { GoogleGenAI } from '@google/genai';

const getAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("AI Context Blocked: GEMINI_API_KEY is unconfigured.");
  return new GoogleGenAI({ apiKey });
};

/**
 * Generates the next strategic interview question using custom role & text parameters
 */
export const generateNextQuestion = async (track, historyLog = [], roundNumber, targetRole, resumeText = "", jobDescription = "") => {
  const ai = getAIClient();
  
  const formattedHistory = historyLog.map((log, i) => 
    `Round ${i+1} Question: ${log.question}\nUser Answer Given: ${log.userAnswer || "No answer provided."}`
  ).join("\n\n");

  const prompt = `
You are an expert technical interviewer, panel recruiter, and senior tech lead conducting a formal placement interview.
Adapt your persona to target this specific position: ${targetRole}
Interview Track Type: ${track}
Current Round: ${roundNumber} of 5

[CANDIDATE PROFILE BACKGROUND (FROM RESUME)]
${resumeText || "No resume uploaded. Assume standard baseline candidate qualifications for this role."}

[TARGET COMPANY / JOB DESCRIPTION CONTEXT]
${jobDescription || "Standard competitive tech industry expectations for this target role level."}

[CONVERSATION HISTORY SO FAR]
${formattedHistory || "This is the start of the interview. Ask the introductory question."}

[GENERATION DIRECTIVE]
1. Generate exactly one highly relevant question appropriate for this round and track.
2. If this is Round 1, ask an introductory question tailored to the target role, or pick a core technical concept/project straight out of their resume background text.
3. If history exists, deeply critique their last answer. Choose to grill them further on their implementation details or pivot to a core skill required in the Job Description.
4. Keep the question concise, sharp, and highly technical. Do NOT include introductory remarks, chit-chat, or filler text. Output ONLY the raw question text.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt
    });
    return response.text?.trim() || `Describe your experience building scalable applications for a ${targetRole} position.`;
  } catch (err) {
    console.error("Interview generation error:", err.message);
    return "Explain how you optimize network queries, manage database transactions, or isolate state re-renders.";
  }
};

/**
 * Compiles a final scorecard benchmarked against the target job requirements
 */
export const generateFinalScorecard = async (track, completedHistoryLog, targetRole) => {
  const ai = getAIClient();
  
  const structuredHistory = completedHistoryLog.map((log, i) => 
    `Q${i+1}: ${log.question}\nUser Answer: ${log.userAnswer}`
  ).join("\n\n");

  const prompt = `
You are an executive hiring manager compiling a post-interview feedback sheet for a candidate applying to a ${targetRole} role.
Track Type evaluated: ${track}

[INTERVIEW TRANSCRIPTION]
${structuredHistory}

Return your analysis as a single valid JSON object. Do NOT wrap it in markdown block identifiers.
Schema:
{
  "overallScore": 75,
  "strengths": ["Item 1 (max 12 words)", "Item 2"],
  "weaknesses": ["Item 1 (max 12 words)", "Item 2"],
  "summaryVerdict": "Short 1-2 sentence overall evaluation regarding role readiness."
}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text);
  } catch (err) {
    console.error("Scorecard generation error:", err.message);
    return {
      overallScore: 50,
      strengths: ["Completed all active mock interview rounds."],
      weaknesses: ["System timeout generating dynamic metrics."],
      summaryVerdict: "Session complete. Review answers manually for accuracy."
    };
  }
};