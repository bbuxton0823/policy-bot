// Direct test of chart functionality

// Import the function from the module
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
console.log("Testing chart data creation functionality directly:");
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