const http = require("http");

const postJSON = (path, body, token) => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body);
    const headers = {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(postData)
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const req = http.request({
      hostname: "localhost",
      port: 5001,
      path,
      method: "POST",
      headers
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
      });
    });

    req.on("error", (e) => reject(e));
    req.write(postData);
    req.end();
  });
};

const runTest = async () => {
  try {
    // 1. Login
    console.log("Logging in...");
    const loginRes = await postJSON("/api/auth/login", {
      email: "harsh@gmail.com",
      password: "password123" // we don't know the exact password, let's check seed or database
    });
    console.log("Login status:", loginRes.statusCode);
    console.log("Login response:", loginRes.body);

    if (loginRes.statusCode !== 200) {
      // Let's sign up or use a test login
      console.error("Login failed.");
      process.exit(1);
    }

    const token = loginRes.body.token;

    // 2. Create room
    console.log("Creating room...");
    const roomRes = await postJSON("/api/room/create", {
      difficulty: "Medium",
      language: "JAVASCRIPT (ES6)"
    }, token);
    console.log("Create room status:", roomRes.statusCode);
    console.log("Create room response:", roomRes.body);

    const roomCode = roomRes.body.roomCode;

    // 3. Invite friend
    console.log("Inviting Rahul...");
    const inviteRes = await postJSON("/api/room/invite", {
      roomCode,
      friendUsername: "Rahul"
    }, token);
    console.log("Invite status:", inviteRes.statusCode);
    console.log("Invite response:", inviteRes.body);

    process.exit(0);
  } catch (err) {
    console.error("TEST FAILED:", err);
    process.exit(1);
  }
};

runTest();
