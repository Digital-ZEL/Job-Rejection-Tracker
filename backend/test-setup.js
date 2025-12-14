const fs = require('fs');
const path = require('path');

console.log('🔍 First Job Tracker - Backend Setup Test');
console.log('==========================================\n');

// Check if required files exist
const requiredFiles = [
    'package.json',
    '.env',
    'server.js'
];

console.log('Checking required files...');
let allFilesExist = true;

requiredFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        console.log(`✅ ${file} - Found`);
    } else {
        console.log(`❌ ${file} - Missing`);
        allFilesExist = false;
    }
});

console.log();

// Check if node_modules exists
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
    console.log('✅ node_modules - Found (dependencies installed)');
} else {
    console.log('⚠️  node_modules - Missing (run "npm install" to install dependencies)');
}

console.log();

// Check environment variables
require('dotenv').config();

const requiredEnvVars = [
    'PORT',
    'JWT_SECRET',
    'DB_PATH'
];

console.log('Checking environment variables...');
let allEnvVarsSet = true;

requiredEnvVars.forEach(envVar => {
    if (process.env[envVar]) {
        console.log(`✅ ${envVar} - Set`);
    } else {
        console.log(`❌ ${envVar} - Not set`);
        allEnvVarsSet = false;
    }
});

console.log();

if (allFilesExist && allEnvVarsSet) {
    console.log('🎉 Setup looks good! You can now run:');
    console.log('   npm run dev    # For development');
    console.log('   npm start      # For production');
} else {
    console.log('⚠️  Some setup steps are missing. Please check the output above.');
    console.log('📝 Refer to SETUP_INSTRUCTIONS.md for detailed setup guide.');
}

console.log('\n🔧 Tip: Run this test anytime to verify your setup.');
