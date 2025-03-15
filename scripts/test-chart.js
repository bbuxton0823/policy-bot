#!/usr/bin/env node

const { createPolicyDataFromText } = require('../src/app/hooks/usePolicyChartData');

// Test cases
const testCases = [
  {
    name: "Regular question (should not create chart)",
    input: "Who is the HUD secretary?",
    expectChart: false
  },
  {
    name: "HUD chart request (should create chart)",
    input: "Show me a chart of HUD policies",
    expectChart: true
  },
  {
    name: "Non-HUD chart request (should not create chart)",
    input: "Create a chart of employee satisfaction",
    expectChart: false
  },
  {
    name: "HUD with specific data (should create chart)",
    input: "AFFH Rule: Current 100%, Turner 0%\nDEI Policies: Current 90%, Turner 10%",
    expectChart: true
  }
];

// Run tests
console.log("Testing chart data creation functionality:");
console.log("==========================================");

let passedTests = 0;
let failedTests = 0;

testCases.forEach((test, index) => {
  console.log(`\nTest ${index + 1}: ${test.name}`);
  console.log(`Input: "${test.input}"`);
  
  const result = createPolicyDataFromText(test.input);
  const hasChart = result.length > 0;
  
  console.log(`Result: ${hasChart ? 'Chart created' : 'No chart created'}`);
  if (hasChart) {
    console.log(`Chart data: ${JSON.stringify(result.slice(0, 2), null, 2)}...`);
  }
  
  const passed = hasChart === test.expectChart;
  console.log(`Test ${passed ? 'PASSED' : 'FAILED'}`);
  
  if (passed) {
    passedTests++;
  } else {
    failedTests++;
  }
});

console.log("\n==========================================");
console.log(`Test Summary: ${passedTests} passed, ${failedTests} failed`);

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log("All tests passed!");
} 