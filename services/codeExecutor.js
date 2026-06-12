import axios from 'axios';

const PISTON_LANG_MAP = {
  javascript: { language: 'javascript', version: '18.15.0' },
  python: { language: 'python', version: '3.10.0' },
  cpp: { language: 'cpp', version: '10.2.0' },
  java: { language: 'java', version: '15.0.2' }
};

const injectTestRunner = (language, userCode, stdinInput, problemSlug) => {
  if (language === 'javascript') {
    let functionName = 'solve';
    
    if (/isSameTree/i.test(userCode)) functionName = 'isSameTree';
    else if (/twoSum/i.test(userCode)) functionName = 'twoSum';
    else if (/mergeTwoLists/i.test(userCode)) functionName = 'mergeTwoLists';
    else {
      const standardMatch = userCode.match(/function\s+(\w+)\s*\(/);
      const assignmentMatch = userCode.match(/(?:var|let|const)\s+(\w+)\s*=\s*(?:function|\([^)]*\)\s*=>)/);
      if (standardMatch) functionName = standardMatch[1];
      else if (assignmentMatch) functionName = assignmentMatch[1];
    }

    // ---- LINKED LIST PROBLEMS WITH LOOP GUARD ----
    if (problemSlug?.includes('list') || /list/i.test(problemSlug)) {
      return `
${userCode}
function ListNode(val, next) {
    this.val = (val===undefined ? 0 : val)
    this.next = (next===undefined ? null : next)
}
const buildLinkedList = (arr) => {
    if (!arr || arr.length === 0) return null;
    let head = new ListNode(arr[0]);
    let current = head;
    for (let i = 1; i < arr.length; i++) {
        current.next = new ListNode(arr[i]);
        current = current.next;
    }
    return head;
};
const serializeLinkedList = (head) => {
    let result = [];
    let current = head;
    let loopGuard = 0; // FIX: Prevent Socket Hang up crashes
    while (current !== null) {
        loopGuard++;
        if(loopGuard > 5000) {
            console.log("\\n__JUDGE_RUNTIME_ERROR__: Infinite Loop Detected inside your Linked List node pointers.");
            process.exit(0);
        }
        result.push(current.val);
        current = current.next;
    }
    return result;
};
try {
  const lines = \`${stdinInput}\`.trim().split('\\n');
  const list1Array = JSON.parse(lines[0] || '[]');
  const list2Array = lines[1] ? JSON.parse(lines[1]) : null;
  const l1 = buildLinkedList(list1Array);
  const l2 = list2Array !== null ? buildLinkedList(list2Array) : null;
  const resultHead = l2 !== null ? ${functionName}(l1, l2) : ${functionName}(l1);
  console.log("\\n__JUDGE_OUTPUT__:" + JSON.stringify(serializeLinkedList(resultHead)));
} catch(err) {
  console.log("\\n__JUDGE_RUNTIME_ERROR__:" + err.message);
}
`;
    }

    // ---- BINARY TREE PROBLEMS WITH LOOP GUARD ----
    if (problemSlug?.includes('tree') || /tree/i.test(problemSlug)) {
      return `
${userCode}
function TreeNode(val, left, right) {
    this.val = (val===undefined ? 0 : val)
    this.left = (left===undefined ? null : left)
    this.right = (right===undefined ? null : right)
}
const buildTree = (arr) => {
    if (!arr || arr.length === 0 || arr[0] === null) return null;
    let root = new TreeNode(arr[0]);
    let queue = [root];
    let i = 1;
    while (queue.length > 0 && i < arr.length) {
        let curr = queue.shift();
        if (i < arr.length && arr[i] !== null) {
            curr.left = new TreeNode(arr[i]);
            queue.push(curr.left);
        }
        i++;
        if (i < arr.length && arr[i] !== null) {
            curr.right = new TreeNode(arr[i]);
            queue.push(curr.right);
        }
        i++;
    }
    return root;
};
try {
  const lines = \`${stdinInput}\`.trim().split('\\n');
  const pArray = JSON.parse(lines[0] || '[]');
  const qArray = lines[1] ? JSON.parse(lines[1]) : [];
  const result = ${functionName}(buildTree(pArray), buildTree(qArray));
  console.log("\\n__JUDGE_OUTPUT__:" + JSON.stringify(result));
} catch(err) {
  console.log("\\n__JUDGE_RUNTIME_ERROR__:" + err.message);
}
`;
    }

    // ---- GENERIC FALLBACK ----
    return `
${userCode}
try {
  const lines = \`${stdinInput}\`.trim().split('\\n');
  const param1 = lines[0] ? JSON.parse(lines[0]) : [];
  const param2 = lines[1] ? JSON.parse(lines[1]) : null;
  const result = param2 !== null ? ${functionName}(param1, param2) : ${functionName}(param1);
  console.log("\\n__JUDGE_OUTPUT__:" + JSON.stringify(result));
} catch(err) {
  console.log("\\n__JUDGE_RUNTIME_ERROR__:" + err.message);
}
`;
  }
  return userCode;
};

export const executeCode = async (language, code, stdin = "", expectedOutput = "", problemSlug = "") => {
  const cleanExpected = expectedOutput ? expectedOutput.trim() : null;

  try {
    const runtime = PISTON_LANG_MAP[language];
    if (!runtime) return { success: false, verdict: "System Error", error: "Language unsupported." };

    const finalCode = injectTestRunner(language, code, stdin, problemSlug);

    const response = await axios.post('http://localhost:2000/api/v2/execute', {
      language: runtime.language,
      version: runtime.version,
      files: [{ content: finalCode }]
    }, { timeout: 4000 }); // Added a strict 4-second timeout to protect Node channels

    const { run, compile } = response.data;

    if (compile && compile.code !== 0) {
      return { success: true, output: "", error: compile.stderr || compile.output, runtime: "0ms", verdict: "Compilation Error" };
    }

    const stdoutStr = run.stdout || "";
    const stderrStr = run.stderr || "";

    if (run.code !== 0 || stdoutStr.includes("__JUDGE_RUNTIME_ERROR__")) {
      const errorMsg = stdoutStr.includes("__JUDGE_RUNTIME_ERROR__") 
        ? stdoutStr.split("__JUDGE_RUNTIME_ERROR__:")[1]?.split('\n')[0]
        : stderrStr || run.output;
      return { success: true, output: "", error: errorMsg, runtime: "0ms", verdict: "Runtime Error" };
    }

    if (stdoutStr.includes("__JUDGE_OUTPUT__")) {
      const actualOutput = stdoutStr.split("__JUDGE_OUTPUT__:")[1]?.split('\n')[0]?.trim();
      const cleanStdout = stdoutStr.split("__JUDGE_OUTPUT__:")[0].trim();

      if (cleanExpected !== null) {
        const normActual = actualOutput.toLowerCase().replace(/\s+/g, '');
        const normExpected = cleanExpected.toLowerCase().replace(/\s+/g, '');

        if (normActual === normExpected) {
          return { success: true, output: cleanStdout, runtime: "Passed", verdict: "Accepted" };
        } else {
          return {
            success: true,
            output: cleanStdout,
            runtime: "Failed",
            verdict: "Wrong Answer",
            error: `Wrong Answer ✗\nExpected: ${cleanExpected}\nReceived: ${actualOutput}`
          };
        }
      }
      return { success: true, output: `${cleanStdout}\nReturned Value: ${actualOutput}`.trim(), runtime: "Executed", verdict: "Accepted" };
    }

    return { success: true, output: stdoutStr, runtime: "Executed", verdict: "Accepted" };
  } catch (err) {
    console.error("Piston Server Access Crash:", err.message);
    return { 
      success: true, 
      verdict: "Runtime Error", 
      runtime: "Timeout", 
      error: "Time Limit Exceeded (TLE) ✗: Your solution ran too long or triggered an infinite reference loop." 
    };
  }
};