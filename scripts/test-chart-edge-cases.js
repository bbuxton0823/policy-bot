// Test script for edge cases and potential issues with chart detection

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

// Test cases for edge cases and potential issues
const testCases = [
  {
    name: "Empty string",
    input: "",
    expectChart: false
  },
  {
    name: "Null input",
    input: null,
    expectChart: false,
    expectError: true
  },
  {
    name: "HUD mentioned in unrelated context",
    input: "The HUD display on my car shows the speed",
    expectChart: false
  },
  {
    name: "Chart mentioned in unrelated context",
    input: "The music chart shows Taylor Swift at number one",
    expectChart: false
  },
  {
    name: "Misspelled HUD",
    input: "Show me a chart of HUB policies",
    expectChart: false
  },
  {
    name: "Misspelled chart",
    input: "Show me a char of HUD policies",
    expectChart: false
  },
  {
    name: "Case sensitivity test",
    input: "SHOW ME A CHART OF HUD POLICIES",
    expectChart: true
  },
  {
    name: "Malformed data format",
    input: "Fair Housing: Current 85, Turner 40\nHomeless Programs: Current 90, Turner 30",
    expectChart: false
  },
  {
    name: "Correct data format",
    input: "Fair Housing: Current 85%, Turner 40%",
    expectChart: true
  },
  {
    name: "Mixed case keywords",
    input: "I'd like to see a ViSuAlIzAtIoN of HoUsInG and Urban DeVeLoPmEnT policies",
    expectChart: true
  }
];

// Run tests
console.log("Testing chart detection with edge cases:");
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
    
    // If we expected an error but didn't get one
    if (test.expectError && !hasChart) {
      console.log("Expected error was handled gracefully");
    }
  } catch (error) {
    console.error(`Error executing test: ${error.message}`);
    
    // If we expected an error and got one
    if (test.expectError) {
      console.log("Expected error occurred");
      passedTests++;
    } else {
      failedTests++;
    }
  }
});

console.log("\n==========================================");
console.log(`Test Summary: ${passedTests} passed, ${failedTests} failed`);

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log("All tests passed!");
} 