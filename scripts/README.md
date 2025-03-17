# Policy Bot Scripts

This directory contains utility scripts for the Policy Bot application.

## clear-documents.ps1

This PowerShell script clears the `documents.json` file, removing all document records from the application. It's automatically run during the build process to ensure a clean state for new deployments.

### Usage

The script is automatically executed when running:

```bash
npm run build
```

You can also run it manually to clear documents:

```bash
npm run clear-documents
```

## setup-env.js

This script helps set up the environment variables for the Policy Bot application. 