import fs from 'fs';
import path from 'path';

const parseTextToJSON = () => {
  const rawFilePath = path.join('./data/rawQuestions.txt');
  const outputFilePath = path.join('./data/aptitudeDump.json');

  // 1. Read the raw text block you pasted
  const rawText = fs.readFileSync(rawFilePath, 'utf-8');
  
  // 2. Split file contents into individual lines
  const lines = rawText.split('\n').map(line => line.trim());
  
  const formattedQuestions = [];
  
  // Track our parsing state dynamically as we scroll down the file
  let currentDifficulty = 'Basic'; 
  let currentQuestion = null;
  let capturingSolution = false;

  console.log("Analyzing file structure layers using exact formatting rules...");

  lines.forEach((line) => {
    if (!line) return; // Skip completely empty lines

    // Detect if the file explicitly shifts difficulty sections
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('## basic') || lowerLine.includes('# basic')) {
      currentDifficulty = 'Basic';
      return;
    } else if (lowerLine.includes('## intermediate') || lowerLine.includes('# intermediate')) {
      currentDifficulty = 'Intermediate';
      return;
    } else if (lowerLine.includes('## advance') || lowerLine.includes('# advance')) {
      currentDifficulty = 'Advance';
      return;
    }

    // 3. Detect the start of a brand new question block
    if (line.startsWith('Question:')) {
      // Save the previous question before starting a new one
      if (currentQuestion) {
        formattedQuestions.push(currentQuestion);
      }

      capturingSolution = false;
      
      // Initialize layout structure matching your exact UI vision
      currentQuestion = {
        category: "Quantitative Aptitude",
        topic: "Numerical Ability",
        difficulty: currentDifficulty,
        questionText: line.replace(/^Question:\s*/i, ''), // Strip the "Question:" prefix
        correctAnswer: "",
        explanation: ""
      };
      return;
    }

    // 4. Capture Solution block
    if (line.startsWith('Solution:')) {
      capturingSolution = true;
      if (currentQuestion) {
        currentQuestion.explanation = line.replace(/^Solution:\s*/i, '');
      }
      return;
    }

    // 5. Capture Final Answer line
    if (line.startsWith('Answer:')) {
      capturingSolution = false;
      if (currentQuestion) {
        currentQuestion.correctAnswer = line.replace(/^Answer:\s*/i, '');
      }
      return;
    }

    // 6. Accumulate multiline data if a block spans multiple lines
    if (currentQuestion) {
      if (capturingSolution) {
        currentQuestion.explanation += "\n" + line;
      } else if (!currentQuestion.correctAnswer) {
        // Still appending to the question text if Solution hasn't started yet
        currentQuestion.questionText += "\n" + line;
      }
    }
  });

  // Push the final running question left over after loop termination
  if (currentQuestion) {
    formattedQuestions.push(currentQuestion);
  }

  // 7. Save the neatly chunked array out to the JSON dump file
  fs.writeFileSync(outputFilePath, JSON.stringify(formattedQuestions, null, 2));
  
  // Log statistics out to terminal
  const stats = formattedQuestions.reduce((acc, q) => {
    acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
    return acc;
  }, {});

  console.log(`\nSuccess! Extracted ${formattedQuestions.length} Quantitative questions total.`);
  console.log(`📊 Section Breakdown:`, stats);
};

parseTextToJSON();