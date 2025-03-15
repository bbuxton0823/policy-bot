// Test script for the integration between chart detection and the API

const { createPolicyDataFromText } = require('../src/app/hooks/usePolicyChartData');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Create a simple server to test the integration
const PORT = 8081;

// Create a simple HTML page for testing
const testHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chart API Integration Test</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .container { display: flex; flex-direction: column; gap: 20px; }
        .card { border: 1px solid #ccc; border-radius: 8px; padding: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        button { padding: 8px 16px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background-color: #45a049; }
        .response { background-color: #f9f9f9; padding: 8px; border-radius: 4px; white-space: pre-wrap; max-height: 300px; overflow-y: auto; }
    </style>
</head>
<body>
    <h1>Chart API Integration Test</h1>
    <div class="container">
        <div class="card">
            <h2>Test Chart Detection</h2>
            <input type="text" id="testInput" value="Show me a chart of HUD policies" style="width: 100%; padding: 8px; margin-bottom: 8px;">
            <button id="testBtn">Test Detection</button>
            <div id="testResult" class="response"></div>
        </div>
    </div>

    <script>
        document.getElementById('testBtn').addEventListener('click', () => {
            const input = document.getElementById('testInput').value;
            const resultElement = document.getElementById('testResult');
            
            fetch('/test-chart-detection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ input }),
            })
            .then(response => response.json())
            .then(data => {
                resultElement.textContent = JSON.stringify(data, null, 2);
            })
            .catch(error => {
                resultElement.textContent = 'Error: ' + error.message;
            });
        });
    </script>
</body>
</html>
`;

// Create the server
const server = http.createServer((req, res) => {
    if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(testHtml);
    } else if (req.url === '/test-chart-detection' && req.method === 'POST') {
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            try {
                const { input } = JSON.parse(body);
                const result = createPolicyDataFromText(input);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    input,
                    hasChart: result.length > 0,
                    chartData: result.length > 0 ? result : null
                }));
                
                // Log the result for testing
                console.log(`Test for: "${input}"`);
                console.log(`Result: ${result.length > 0 ? 'Chart created' : 'No chart created'}`);
                if (result.length > 0) {
                    console.log(`Chart data: ${JSON.stringify(result.slice(0, 2), null, 2)}...`);
                }
                console.log('---');
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
                
                console.error('Error:', error.message);
            }
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

// Start the server
server.listen(PORT, () => {
    console.log(`Chart API Integration Test server running at http://localhost:${PORT}`);
    console.log('Open your browser to test the chart detection API integration');
    console.log('Press Ctrl+C to stop the server');
}); 