import express from 'express';
import { executeCode } from '../services/codeExecutor.js';
import { generateDebugFeedback } from '../services/aiDebugger.js';
import CodingChallenge from '../models/CodingChallenge.js';
import UserDashboard from '../models/UserDashboard.js';

const router = express.Router();

router.post('/run', async (req, res) => {
  const { language, code, input, problemSlug, isSubmission } = req.body;

  // 1. STRICT VALIDATION: Reject empty submissions instantly
  if (!code || code.trim() === "" || code.includes('// Code view blueprint uninitialized.')) {
    return res.json({
      success: true,
      verdict: "Compilation Error",
      runtime: "0ms",
      error: "Submission Rejected: Please write your solution logic before executing the compiler runner."
    });
  }

  // Boilerplate validation check that allows user solutions to pass safely
  const strippedCode = code.replace(/\s+/g, '');
  const isUntouchedBoilerplate = 
    (strippedCode.includes('varisSameTree=function') || 
     strippedCode.includes('vartwoSum=function') ||
     strippedCode.includes('varmergeTwoLists=function')) && 
    !code.includes('return ') && 
    !code.includes('return;') &&
    strippedCode.length < 320;

  if (isUntouchedBoilerplate) {
    return res.json({
      success: true,
      verdict: "Wrong Answer",
      runtime: "0ms",
      error: "Result Evaluation Failed:\nYour code submission returned no values (Untouched boilerplate template detected)."
    });
  }

  let expectedOutput = "";
  let targetInput = input || "";
  let challengeProfile = null;

  try {
    // 2. CONTEXT ANALYSIS: Fetch problem specifications from MongoDB
    if (problemSlug) {
      challengeProfile = await CodingChallenge.findOne({ slug: problemSlug });
      if (challengeProfile) {
        if (isSubmission) {
          targetInput = challengeProfile.hiddenTestCases?.[0]?.input || targetInput;
          expectedOutput = challengeProfile.hiddenTestCases?.[0]?.expectedOutput || expectedOutput;
        } else if (!input && challengeProfile.visibleTestCases?.length > 0) {
          targetInput = challengeProfile.visibleTestCases[0].input;
          expectedOutput = challengeProfile.visibleTestCases[0].expectedOutput;
        }
      }
    }

    // 3. SECURE EXECUTION: Hand off execution cleanly
    // Note: The executeCode service function inside services/codeExecutor.js should read 
    // process.env.NODE_ENV === 'production' to automatically direct its internally built fetch blocks 
    // to 'https://emkc.org/api/v2/piston/execute' instead of localhost!
    const assessment = await executeCode(language, code, targetInput, expectedOutput, problemSlug);
    
    if (!assessment || !assessment.success) {
      return res.json({
        success: true,
        verdict: "Runtime Error",
        runtime: "0ms",
        error: assessment?.error || "The container core execution sandbox aborted unexpectedly."
      });
    }

    // AUTOMATED PROGRESS TRACKING HOOK: If code passes test cases, sync to dashboard cache
    if (assessment.verdict === "Accepted" && challengeProfile) {
      const mockUserId = "guest_developer_101";
      const currentProblemSlug = challengeProfile.slug;
      const diff = challengeProfile.difficulty ? challengeProfile.difficulty.toLowerCase() : 'easy';

      try {
        let dash = await UserDashboard.findOne({ userId: mockUserId });
        if (!dash) dash = new UserDashboard({ userId: mockUserId });

        if (!dash.codingMetrics.solvedSlugs.includes(currentProblemSlug)) {
          dash.codingMetrics.solvedSlugs.push(currentProblemSlug);
          dash.codingMetrics.solvedCount += 1;
          
          // Double-check nested metrics paths exist before incrementing
          if (!dash.codingMetrics.difficultyBreakdown) {
            dash.codingMetrics.difficultyBreakdown = { easy: 0, medium: 0, hard: 0 };
          }
          
          dash.codingMetrics.difficultyBreakdown[diff] = (dash.codingMetrics.difficultyBreakdown[diff] || 0) + 1;
          await dash.save();
          console.log(`[Dashboard Update] Logged completion metric for problem: ${currentProblemSlug}`);
        }
      } catch (dashErr) {
        console.error("Dashboard sync non-blocking interruption:", dashErr.message);
      }
    }

    // 4. CONCURRENT INTERCEPTION: Call Gemini API only if code fails execution parameters
    let aiFeedbackString = "";
    if (assessment.verdict !== "Accepted" && challengeProfile) {
      // Clear dynamic regex line breaks to protect prompt string evaluation layouts
      const safeErrorContent = (assessment.error || "Execution produced incorrect output matrices mismatch.")
        .replace(/\\n/g, '\n'); 
      
      const shortGuidanceEnforcement = `
      Error Summary Stack:
      ${safeErrorContent}
      
      CRITICAL ACTION DIRECTIVE FOR AI: 
      - Do NOT write long explanations or paragraphs.
      - Keep your entire critique under 3 crisp bullet points maximum.
      - Pinpoint the broken logic line immediately, explain why it fails in under 10 words, and list structural hints as concise points.
      `;

      try {
        aiFeedbackString = await generateDebugFeedback(
          challengeProfile.title,
          challengeProfile.description,
          code,
          shortGuidanceEnforcement
        );
      } catch (aiErr) {
        console.error("AI Debugger rate limit or connection hurdle caught:", aiErr.message);
        aiFeedbackString = "🤖 AI Debugger is cooling down. Fix the structural edge-cases and retry execution!";
      }
    }

    // Return the response object back to the front-end interface view
    return res.json({
      success: true,
      verdict: assessment.verdict,
      runtime: assessment.runtime,
      output: assessment.output,
      error: assessment.error,
      aiAnalysis: aiFeedbackString
    });

  } catch (globalError) {
    console.error("Caught Internal Router Exception:", globalError.message);
    return res.json({
      success: true,
      verdict: "Server Error",
      runtime: "0ms",
      error: `Internal Orchestrator Exception: ${globalError.message}`
    });
  }
});

export default router;
