// Test script for chart functionality

// Simple implementation of the createPolicyDataFromText function for testing
function createPolicyDataFromText(text) {
  // Check if this is a chart creation request without specific data
  // Make this more specific to only match explicit HUD policy chart requests
  const isHudChartRequest = 
    (text.toLowerCase().includes('hud') || 
     text.toLowerCase().includes('housing and urban development')) &&
    (text.toLowerCase().includes('create a chart') || 
     text.toLowerCase().includes('show a chart') ||
     text.toLowerCase().includes('generate a chart') ||
     text.toLowerCase().includes('make a chart') ||
     text.toLowerCase().includes('display a chart') ||
     text.toLowerCase().includes('policy comparison chart') ||
     text.toLowerCase().includes('chart of hud policies'));
  
  // Only return default HUD data if explicitly requested
  if (isHudChartRequest && !text.includes('%') && !text.includes('implemented')) {
    return [
      {
        category: "AFFH Rule",
        currentPolicy: 100,
        turnerPolicy: 0,
      },
      {
        category: "DEI Policies",
        currentPolicy: 100,
        turnerPolicy: 10,
      }
    ];
  }
  
  const lines = text.split('\n').filter(line => line.trim() !== '');
  const data = [];
  
  for (const line of lines) {
    // Look for patterns like "Policy Name: Current X%, Turner Y%"
    const match = line.match(/([^:]+):\s*Current\s*(\d+)%,\s*Turner\s*(\d+)%/i);
    if (match) {
      data.push({
        category: match[1].trim(),
        currentPolicy: parseInt(match[2], 10),
        turnerPolicy: parseInt(match[3], 10)
      });
      continue;
    }
  }
  
  // Return the parsed data if we found any, otherwise return an empty array
  return data.length > 0 ? data : [];
}

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
    console.log(`Chart data: ${JSON.stringify(result.slice(0, 2), null, 2)}`);
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