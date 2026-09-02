import http from "http";

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
      path: urlObj.pathname + urlObj.search,
      method: options.method || "GET",
      headers: options.headers || {},
    };

    const req = http.request(reqOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on("error", reject);

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function runLiveRuntimeTests() {
  console.log("==================================================");
  console.log("LIVE RUNTIME HTTP VERIFICATION — LOCALHOST:3000");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. GET /ref/FE0C65
  const res1 = await makeRequest("http://localhost:3000/ref/FE0C65");
  assert(res1.statusCode === 307, `/ref/FE0C65 returned HTTP status 307 (got ${res1.statusCode})`);
  assert(res1.headers.location === "/register?ref=FE0C65", `/ref/FE0C65 Location header is '/register?ref=FE0C65' (got ${res1.headers.location})`);

  // 2. GET /ref/fe0c65 (lowercase)
  const res2 = await makeRequest("http://localhost:3000/ref/fe0c65");
  assert(res2.statusCode === 307, `/ref/fe0c65 (lowercase) returned HTTP status 307 (got ${res2.statusCode})`);
  assert(res2.headers.location === "/register?ref=FE0C65", `/ref/fe0c65 Location header normalizes to '/register?ref=FE0C65' (got ${res2.headers.location})`);

  // 3. GET /ref/INVALIDCODE999 (invalid code)
  const res3 = await makeRequest("http://localhost:3000/ref/INVALIDCODE999");
  assert(res3.statusCode === 307, `/ref/INVALIDCODE999 returned HTTP status 307 (got ${res3.statusCode})`);
  assert(res3.headers.location === "/register", `/ref/INVALIDCODE999 falls back safely to '/register' (got ${res3.headers.location})`);

  // 4. GET /register?ref=FE0C65
  const res4 = await makeRequest("http://localhost:3000/register?ref=FE0C65");
  assert(res4.statusCode === 200, `/register?ref=FE0C65 rendered successfully with HTTP 200 (got ${res4.statusCode})`);

  // 5. POST /api/auth/validate-referral with valid code FE0C65
  const res5 = await makeRequest("http://localhost:3000/api/auth/validate-referral", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: "FE0C65" }),
  });
  const body5 = JSON.parse(res5.body || "{}");
  assert(res5.statusCode === 200 && body5.valid === true && body5.referral_code === "FE0C65",
    `POST /api/auth/validate-referral with 'FE0C65' returned 200 valid: true (got ${res5.statusCode}, ${res5.body})`);

  // 6. POST /api/auth/validate-referral with lowercase fe0c65
  const res6 = await makeRequest("http://localhost:3000/api/auth/validate-referral", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: "fe0c65" }),
  });
  const body6 = JSON.parse(res6.body || "{}");
  assert(res6.statusCode === 200 && body6.valid === true && body6.referral_code === "FE0C65",
    `POST /api/auth/validate-referral with lowercase 'fe0c65' normalized and returned 200 valid: true (got ${res6.statusCode})`);

  // 7. POST /api/auth/validate-referral with invalid code
  const res7 = await makeRequest("http://localhost:3000/api/auth/validate-referral", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: "INVALIDCODE999" }),
  });
  const body7 = JSON.parse(res7.body || "{}");
  assert(res7.statusCode === 404 && body7.valid === false,
    `POST /api/auth/validate-referral with 'INVALIDCODE999' returned 404 valid: false (got ${res7.statusCode})`);

  console.log("==================================================");
  console.log(`LIVE RUNTIME RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runLiveRuntimeTests().catch(console.error);

