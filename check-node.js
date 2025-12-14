const fs = require('fs');
const path = require('path');

console.log('🔍 Node.js Installation Checker');
console.log('==============================\n');

// Check if Node.js is installed
try {
    console.log('✅ Node.js is installed');
    console.log(`   Version: ${process.version}`);
    console.log(`   Platform: ${process.platform}`);
    console.log(`   Architecture: ${process.arch}`);
} catch (error) {
    console.log('❌ Node.js is not installed');
    console.log('   Please download and install Node.js from https://nodejs.org/');
    process.exit(1);
}

// Check if npm is available
try {
    const { execSync } = require('child_process');
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    console.log('✅ npm is installed');
    console.log(`   Version: ${npmVersion}`);
} catch (error) {
    console.log('❌ npm is not installed or not in PATH');
    console.log('   This is usually included with Node.js installation');
    console.log('   Please reinstall Node.js from https://nodejs.org/');
    process.exit(1);
}

// Check current directory
console.log(`\n📁 Current directory: ${process.cwd()}`);

// Check if we're in the right place
const backendDir = path.join(process.cwd(), 'backend');
if (fs.existsSync(backendDir)) {
    console.log('✅ Backend directory found');
    const packageJsonPath = path.join(backendDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
        console.log('✅ package.json found in backend directory');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        console.log(`   Project: ${packageJson.name}`);
        console.log(`   Version: ${packageJson.version}`);
    } else {
        console.log('❌ package.json not found in backend directory');
    }
} else {
    console.log('⚠️  Backend directory not found');
    console.log('   Make sure you are running this from the first-job-tracker directory');
}

console.log('\n🔧 Next Steps:');
console.log('1. If both Node.js and npm show ✅ above, you can install dependencies:');
console.log('   cd backend && npm install');
console.log('2. Then start the development server:');
console.log('   npm run dev');
console.log('3. Visit http://localhost:3001/api/health to verify it works');

console.log('\n💡 Tip: If you see errors above, please reinstall Node.js from https://nodejs.org/');
