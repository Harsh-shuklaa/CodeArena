const axios = require("axios");

// Language IDs mapping for Judge0 CE
const LANGUAGE_MAPPING = {
  "JAVASCRIPT (ES6)": 93, // Node.js 18.15.0
  "JAVASCRIPT": 93,
  "PYTHON 3.11": 92,     // Python 3.11.2
  "PYTHON": 92,
  "C++ 20": 75,          // Clang 10.0.1
  "C++": 75,
  "RUST 1.70": 73,       // Rust 1.40.0
  "RUST": 73
};

/**
 * Base64 encode helper
 */
const encodeBase64 = (str) => {
  return Buffer.from(str || "").toString("base64");
};

/**
 * Base64 decode helper
 */
const decodeBase64 = (str) => {
  return Buffer.from(str || "", "base64").toString("utf8");
};

/**
 * Executes source code against stdin and expectedOutput using Judge0 CE
 */
const executeCode = async (sourceCode, language, stdin = "", expectedOutput = "") => {
  const isMock = process.env.MOCK_JUDGE0 === "true" || !process.env.JUDGE0_API_KEY;

  if (isMock) {
    console.log(`[JUDGE0] Simulating code run in mock mode for language ${language}...`);
    await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate compilation lag

    // Simple heuristic check for syntax error simulation
    const trimmedCode = sourceCode.trim();
    if (trimmedCode.includes("syntax_error") || trimmedCode.includes("throw Error")) {
      return {
        success: false,
        statusId: 6, // Compilation Error
        statusDescription: "Compilation Error",
        stdout: "",
        stderr: "SyntaxError: Unexpected token / mock error triggered.",
        time: "0.05s",
        memory: "12 MB"
      };
    }

    if (trimmedCode.includes("tle_error") || trimmedCode.includes("while(true)") || trimmedCode.includes("while (true)")) {
      return {
        success: false,
        statusId: 5, // Time Limit Exceeded
        statusDescription: "Time Limit Exceeded",
        stdout: "",
        stderr: "",
        time: "5.00s",
        memory: "18 MB"
      };
    }

    // Default to success
    return {
      success: true,
      statusId: 3, // Accepted
      statusDescription: "Accepted",
      stdout: expectedOutput || "Success output",
      stderr: "",
      time: "0.12s",
      memory: "14 MB"
    };
  }

  // Real API mode (RapidAPI or private host)
  try {
    const judge0Host = process.env.JUDGE0_HOST || "judge0-ce.p.rapidapi.com";
    const languageId = LANGUAGE_MAPPING[language.toUpperCase()] || 93;

    const payload = {
      source_code: encodeBase64(sourceCode),
      language_id: languageId,
      stdin: encodeBase64(stdin),
      expected_output: encodeBase64(expectedOutput)
    };

    console.log(`[JUDGE0] Sending submission to Judge0 API: ${judge0Host}...`);

    const response = await axios.post(
      `https://${judge0Host}/submissions?base64_encoded=true&wait=true`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "X-RapidAPI-Key": process.env.JUDGE0_API_KEY,
          "X-RapidAPI-Host": judge0Host
        }
      }
    );

    const { status, stdout, stderr, compile_output, time, memory } = response.data;

    // Status IDs: 3 = Accepted, 4 = Wrong Answer, 5 = Time Limit Exceeded, 6 = Compilation Error, etc.
    const decodedStdout = stdout ? decodeBase64(stdout) : "";
    const decodedStderr = stderr ? decodeBase64(stderr) : "";
    const decodedCompileOutput = compile_output ? decodeBase64(compile_output) : "";

    return {
      success: status.id === 3,
      statusId: status.id,
      statusDescription: status.description,
      stdout: decodedStdout,
      stderr: decodedStderr || decodedCompileOutput,
      time: `${time || 0}s`,
      memory: `${memory || 0} KB`
    };
  } catch (error) {
    console.error("[JUDGE0 ERROR] Failed to run code via Judge0 API", error.message);
    // Graceful fallback to simulator if API fails
    return {
      success: false,
      statusId: 6,
      statusDescription: "Execution Error",
      stdout: "",
      stderr: `Server Error: Unable to contact compiling core (${error.message}).`,
      time: "0s",
      memory: "0 KB"
    };
  }
};

module.exports = { executeCode };
