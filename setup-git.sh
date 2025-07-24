#!/bin/bash
# Git setup script for First Job Rejection Tracker

# Create a new git repository
git init
git add .
git commit -m "Initial commit: First Job Rejection Tracker MVP"

# Create .gitignore
cat > .gitignore << EOF
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Database
*.db
*.sqlite
*.sqlite3

# Logs
logs/
*.log

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
.nyc_output

# Build outputs
dist/
build/

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# IDE files
.vscode/
.idea/
*.swp
*.swo
*~

# Temporary files
tmp/
temp/
EOF

echo "Git repository initialized successfully!"
echo "Next steps:"
echo "1. gh repo create first-job-tracker --private --source ."
echo "2. git push -u origin main"
