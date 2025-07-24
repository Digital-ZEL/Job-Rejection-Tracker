# First Job Rejection Tracker - Complete Full-Stack Application

A comprehensive job application tracking system with both frontend and backend components, designed for new graduates to stay organized and motivated during their job search.

## 🚀 Features

### Frontend (Browser-based)
- **Smart-Paste Technology**: Paste job URLs to auto-fill application details
- **5-Stage Pipeline**: Applied → Interview → Offer → Rejected → Ghosted
- **Drag & Drop**: Move applications between stages
- **Real-time Analytics**: Track your job search progress
- **Resume Builder**: Generate resumes from your applications
- **Data Export**: Download your data as JSON
- **Responsive Design**: Works on all devices

### Backend (Node.js/Express)
- **RESTful API**: Complete CRUD operations for applications
- **User Authentication**: JWT-based auth system
- **Database**: SQLite with full schema
- **Security**: Rate limiting, input validation, CORS
- **Analytics**: Advanced metrics and reporting
- **Scalable**: Ready for production deployment

## 🚀 Quick Start

### Frontend (No Installation Required)
1. Simply open `index.html` in your web browser
2. Start tracking applications immediately
3. All data is stored in browser's localStorage

### Backend (Optional - for full features)
1. **Install Node.js** - Download from https://nodejs.org/
2. **Run the setup script** - Double-click `setup-backend.bat` on Windows
3. **Or run manually:**
```bash
cd backend
npm install
npm run dev
```

**Note:** The `.env` file has been pre-configured for you. For production deployment, update the JWT_SECRET to a secure random string.

### Troubleshooting Node.js Installation
If you encounter issues with Node.js installation or the backend not starting:
1. Check `NODEJS_INSTALLATION_GUIDE.md` for detailed installation steps
2. Run `node check-node.js` to verify Node.js and npm installation
3. Make sure to restart your terminal after installing Node.js

## 📁 Project Structure

```
first-job-tracker/
├── index.html                    # Main frontend application
├── unified-styles.css            # Complete styling
├── unified-app.js               # Frontend JavaScript
├── SETUP_INSTRUCTIONS.md         # Detailed setup guide
├── setup-backend.bat             # Windows setup script
├── backend/
│   ├── server.js                # Express server
│   ├── package.json             # Backend dependencies
│   ├── .env                     # Environment variables (created)
│   ├── .env.example             # Environment variables template
│   └── job_tracker.db           # SQLite database (created on first run)
└── README.md                    # This file
```

## 🎯 Core Features

### Application Tracking
- Add/edit/delete job applications
- Track company, role, location, source, salary
- Add custom notes and tags
- 5-stage pipeline management

### Smart-Paste Technology
- Paste job posting URLs from LinkedIn, Indeed, Glassdoor
- Auto-extract company, role, and location
- One-click application creation

### Analytics Dashboard
- Total applications count
- Interview conversion rate
- Success rate tracking
- Visual charts and graphs

### Resume Builder
- Generate resumes from successful applications
- Professional templates
- Skills and experience tracking

## 🔧 API Endpoints

### Authentication
- `POST /api/register` - Register new user
- `POST /api/login` - User login

### Applications
- `GET /api/applications` - Get all applications
- `POST /api/applications` - Create new application
- `PUT /api/applications/:id` - Update application
- `DELETE /api/applications/:id` - Delete application

### Analytics
- `GET /api/analytics` - Get analytics data

## 🛠️ Technology Stack

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with flexbox/grid
- **Vanilla JavaScript** - No frameworks required
- **LocalStorage** - Client-side data persistence

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **SQLite** - Database
- **JWT** - Authentication
- **bcryptjs** - Password hashing

## 📊 Usage Examples

### Adding Applications
1. **Manual Entry**: Click "Add Application" and fill details
2. **Smart Paste**: Paste job URL and auto-fill
3. **Drag & Drop**: Move cards between stages

### Data Management
- **Export**: Download JSON backup
- **Import**: Restore from backup
- **Sync**: Backend sync for multi-device access

## 🔐 Security Features

- Input validation and sanitization
- Rate limiting (100 requests per 15 minutes)
- CORS protection
- JWT authentication
- Password hashing with bcrypt

## 📱 Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+
- Mobile browsers

## 🚀 Deployment Options

### Frontend Only (Zero Setup)
- Open `index.html` directly in browser
- Host on GitHub Pages, Netlify, or Vercel

### Full Stack
- **Local**: Run backend with `npm run dev`
- **Production**: Use Docker or cloud deployment
- **Database**: SQLite (zero-config) or PostgreSQL

## 🎯 Next Steps

1. **Start Simple**: Use frontend-only version
2. **Add Backend**: Connect to Node.js API
3. **Customize**: Modify styling and features
4. **Deploy**: Choose hosting option

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📄 License

MIT License - Feel free to use for personal or commercial projects.

## 🆘 Support

- **Issues**: Create GitHub issue
- **Questions**: Check documentation
- **Feature Requests**: Open discussion

---

**Ready to track your job applications like a pro!** 🎯
