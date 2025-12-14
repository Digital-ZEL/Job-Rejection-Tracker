// API Configuration
// Update this file to connect frontend to backend API

const API_CONFIG = {
    // Backend API base URL
    // For production: Update this to your backend URL
    // For development: Use 'http://localhost:3001'
    // For standalone: Set to null to use localStorage only
    BASE_URL: null, // Set to 'http://localhost:3001' or 'https://api.yourdomain.com' to enable backend
    
    // API endpoints
    ENDPOINTS: {
        REGISTER: '/api/register',
        LOGIN: '/api/login',
        APPLICATIONS: '/api/applications',
        ANALYTICS: '/api/analytics',
        HEALTH: '/api/health'
    },
    
    // Check if backend is enabled
    isBackendEnabled() {
        return this.BASE_URL !== null && this.BASE_URL !== '';
    },
    
    // Get full API URL
    getUrl(endpoint) {
        if (!this.isBackendEnabled()) {
            return null;
        }
        return `${this.BASE_URL}${endpoint}`;
    }
};

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API_CONFIG;
}
