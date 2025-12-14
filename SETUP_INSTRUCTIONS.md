# First Job Rejection Tracker - Setup Instructions

## Prerequisites

Before you can run the backend server, you need to install Node.js on your system.

### Installing Node.js on Windows

1. **Download Node.js:**
   - Go to https://nodejs.org/
   - Download the LTS (Long Term Support) version for Windows
   - Run the installer and follow the installation wizard
   - Make sure to check "Automatically install the necessary tools..." if prompted

2. **Verify Installation:**
   ```bash
   node --version
   npm --version
   ```

## Setting Up the Backend

1. **Navigate to the backend directory:**
   ```bash
   cd first-job-tracker/backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Configuration:**
   - The `.env` file has been created for you
   - For production deployment, change the `JWT_SECRET` to a secure random string
   - Update `CORS_ORIGINS` to include your production domain(s)

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Run the production server:**
   ```bash
   npm start
   ```

## Testing the Setup

Once the server is running, you can test it by visiting:
- Health check: http://localhost:3001/api/health
- API endpoints: http://localhost:3001/api/

## Frontend Usage

The frontend can be used independently without the backend:
1. Simply open `first-job-tracker/index.html` in your web browser
2. All data will be stored in your browser's localStorage
3. To use backend features, make sure the backend server is running

## Deployment Checklist

Before deploying to production:

- [ ] Update `JWT_SECRET` in `.env` to a secure random string
- [ ] Update `CORS_ORIGINS` in `.env` to include production domains
- [ ] Set `NODE_ENV=production` in `.env`
- [ ] Test all API endpoints
- [ ] Verify database persistence
- [ ] Check security headers and rate limiting
- [ ] Review logging configuration

## Troubleshooting

**Common Issues:**

1. **Port already in use:** Change `PORT` in `.env` to a different port
2. **Permission errors:** Run command prompt as administrator on Windows
3. **Module not found:** Run `npm install` to install dependencies
4. **Database errors:** Ensure the application has write permissions to the directory

**Need Help?**
- Check the main README.md for more detailed information
- Look at the console output for error messages
- Verify all environment variables are correctly set
