/**
 * Simple test script to verify the logging system works
 * Run with: node test-logging.js
 */

const fetch = require("node-fetch");

async function testLogging() {
  const baseUrl = "http://localhost:8787";

  console.log("Testing centralized logging system...\n");

  try {
    // Test the /api/log endpoint
    const response = await fetch(`${baseUrl}/api/log`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "test-event",
        meta: {
          test: true,
          timestamp: new Date().toISOString(),
          message: "This is a test log event",
        },
      }),
    });

    if (response.ok) {
      console.log("✅ /api/log endpoint working correctly");
      const result = await response.json();
      console.log("Response:", result);
    } else {
      console.log(
        "❌ /api/log endpoint failed:",
        response.status,
        response.statusText
      );
    }

    // Test health endpoint
    const healthResponse = await fetch(`${baseUrl}/api/health`);
    if (healthResponse.ok) {
      console.log("✅ Server is running and healthy");
    } else {
      console.log("❌ Health check failed");
    }
  } catch (error) {
    console.log("❌ Test failed:", error.message);
    console.log("Make sure the server is running with: npm run dev");
  }
}

testLogging();
