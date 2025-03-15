// Test script for different phrasings of chart requests

const path = require('path');
const fs = require('fs');

// Read the file content
const filePath = path.join(__dirname, '../src/app/hooks/usePolicyChartData.ts');
const fileContent = fs.readFileSync(filePath, 'utf8');

// Extract the function using regex
const functionMatch = fileContent.match(/export const createPolicyDataFromText = \(text: string\): PolicyData\[\] => \{([\s\S]*?)return data\.length > 0 \? data : \[\];/);

if (!functionMatch) {
  console.error('Could not extract the function from the file');
  process.exit(1);
}

// Create a function that we can execute
const functionBody = functionMatch[1]
  .replace(/const lines = text\.split\('\\n'\)\.filter\(line => line\.trim\(\) !== ''\);/, 'const lines = text.split("\\n").filter(line => line.trim() !== "");')
  .replace(/const data: PolicyData\[\] = \[\];/, 'const data = [];');

// Create the function
const createPolicyDataFromText = new Function('text', `
  ${functionBody}
  return data.length > 0 ? data : [];
`);

// Test cases with different phrasings
const testCases = [
  {
    name: "Direct HUD chart request",
    input: "Show me a chart of HUD policies",
    expectChart: true
  },
  {
    name: "Indirect HUD chart request",
    input: "I'd like to see a visualization of Housing and Urban Development policies",
    expectChart: true
  },
  {
    name: "Question about HUD with chart request",
    input: "Can you create a chart showing the differences in HUD policies?",
    expectChart: true
  },
  {
    name: "HUD mention without chart request",
    input: "Tell me about HUD policies under different administrations",
    expectChart: false
  },
  {
    name: "Chart request without HUD mention",
    input: "Generate a chart of federal housing initiatives",
    expectChart: false
  },
  {
    name: "Complex HUD chart request with additional context",
    input: "I'm researching policy changes and would like to see a chart of HUD policies over time",
    expectChart: true
  },
  {
    name: "HUD chart with specific policy data",
    input: "Fair Housing: Current 85%, Turner 40%\nHomeless Programs: Current 90%, Turner 30%",
    expectChart: true
  }
];

// Run tests
console.log("Testing chart detection with different phrasings:");
console.log("==========================================");

let passedTests = 0;
let failedTests = 0;

testCases.forEach((test, index) => {
  console.log(`\nTest ${index + 1}: ${test.name}`);
  console.log(`Input: "${test.input}"`);
  
  try {
    const result = createPolicyDataFromText(test.input);
    const hasChart = Array.isArray(result) && result.length > 0;
    
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
      console.log(`EXPECTED: ${test.expectChart ? 'Chart created' : 'No chart created'}`);
    }
  } catch (error) {
    console.error(`Error executing test: ${error.message}`);
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