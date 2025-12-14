const logger = require('../services/logger');

// API versioning middleware
// Supports: Header-based (API-Version: 2) or URL-based (/api/v2/...)
const apiVersioning = (req, res, next) => {
    // Extract version from header
    const versionHeader = req.headers['api-version'] || req.headers['x-api-version'];
    
    // Extract version from URL (since we're mounted at /api, path will be like /v2/applications)
    const urlVersion = req.path.match(/^\/v(\d+)/);
    
    let version = null;
    
    if (urlVersion) {
        version = parseInt(urlVersion[1]);
        // Rewrite the URL to remove version prefix for routing
        // /v2/applications -> /applications
        req.url = req.url.replace(/^\/v\d+/, '');
    } else if (versionHeader) {
        version = parseInt(versionHeader);
    } else {
        // Default to latest version
        version = 3; // Current API version
    }
    
    // Validate version
    const supportedVersions = [1, 2, 3];
    if (!supportedVersions.includes(version)) {
        return res.status(400).json({
            error: 'Unsupported API version',
            supportedVersions: supportedVersions,
            requestedVersion: version
        });
    }
    
    // Attach version to request
    req.apiVersion = version;
    
    // Log version usage (only in debug mode to avoid noise)
    if (process.env.LOG_LEVEL === 'debug') {
        logger.debug(`API Version ${version} requested for ${req.method} ${req.originalUrl}`);
    }
    
    next();
};

// Version-specific response wrapper
const versionedResponse = (req, res, data) => {
    const version = req.apiVersion || 3;
    
    // Version 1: Simple response
    if (version === 1) {
        return res.json(data);
    }
    
    // Version 2: Wrapped with metadata
    if (version === 2) {
        return res.json({
            version: 2,
            data: data,
            timestamp: new Date().toISOString()
        });
    }
    
    // Version 3: Full metadata (current)
    return res.json({
        version: 3,
        data: data,
        timestamp: new Date().toISOString(),
        requestId: req.id || req.headers['x-request-id'] || 'unknown'
    });
};

module.exports = {
    apiVersioning,
    versionedResponse
};
