const fs = require('fs');
const path = require('path');

const workletsDir = path.join(__dirname, '..', 'node_modules', 'react-native-worklets');
const pluginFile = path.join(workletsDir, 'plugin.js');

// Create directory if it doesn't exist
if (!fs.existsSync(workletsDir)) {
    fs.mkdirSync(workletsDir, { recursive: true });
}

// Create plugin.js that redirects to reanimated
const content = "module.exports = require('react-native-reanimated/plugin');\n";
fs.writeFileSync(pluginFile, content, 'utf8');

console.log('✅ Created react-native-worklets/plugin.js symlink to reanimated');
// "@ | Out-File -FilePath "scripts\setup - worklets.js" -Encoding UTF8