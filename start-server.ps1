# Add Node.js to the PATH
$env:PATH += ";C:\Program Files\nodejs"

# Set the NODE_PATH environment variable
$env:NODE_PATH = "C:\Program Files\nodejs\node_modules"

# Start the Next.js development server
& "C:\Program Files\nodejs\node.exe" "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run dev 