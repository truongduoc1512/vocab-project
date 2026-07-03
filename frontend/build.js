const fs = require('fs');

// Read the BACKEND_URL from environment variables, fallback to localhost if not set
const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080/api/v1/words';

// Write the Javascript assignment statement with proper quoting
const fileContent = `window.ENV_API_BASE_URL = '${backendUrl.trim()}';\n`;

try {
    fs.writeFileSync('config.js', fileContent);
    console.log(`[Success] Generated config.js with BACKEND_URL: ${backendUrl}`);
} catch (error) {
    console.error(`[Error] Failed to generate config.js:`, error);
    process.exit(1);
}
