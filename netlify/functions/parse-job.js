// Netlify Function: parse-job
// Server-side job posting parser to avoid CORS issues

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Fetch a URL with timeout
function fetchUrl(url, timeout = 10000) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const protocol = parsedUrl.protocol === 'https:' ? https : http;
        
        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'identity', // Avoid compression for simplicity
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            },
            timeout
        };
        
        const req = protocol.request(options, (res) => {
            // Handle redirects
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                fetchUrl(res.headers.location, timeout).then(resolve).catch(reject);
                return;
            }
            
            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode}`));
                return;
            }
            
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        });
        
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        
        req.end();
    });
}

// Parse HTML to extract job details
function parseJobHtml(html, url) {
    const result = {
        title: null,
        company: null,
        location: null,
        salary: null,
        description: null,
        source: new URL(url).hostname.replace('www.', '')
    };
    
    // Helper to extract text between tags
    const extractBetween = (html, start, end) => {
        const startIdx = html.indexOf(start);
        if (startIdx === -1) return null;
        const endIdx = html.indexOf(end, startIdx + start.length);
        if (endIdx === -1) return null;
        return html.substring(startIdx + start.length, endIdx).trim();
    };
    
    // Helper to clean HTML tags
    const stripTags = (str) => {
        if (!str) return null;
        return str.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    };
    
    // Extract from JSON-LD (most reliable for modern job sites)
    const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    if (jsonLdMatch) {
        for (const match of jsonLdMatch) {
            try {
                const jsonContent = match.replace(/<script[^>]*>|<\/script>/gi, '');
                const data = JSON.parse(jsonContent);
                
                // Handle array of JSON-LD objects
                const jobPosting = Array.isArray(data) 
                    ? data.find(d => d['@type'] === 'JobPosting')
                    : (data['@type'] === 'JobPosting' ? data : null);
                
                if (jobPosting) {
                    result.title = jobPosting.title || null;
                    result.company = jobPosting.hiringOrganization?.name || null;
                    result.description = stripTags(jobPosting.description)?.substring(0, 500) || null;
                    
                    // Location
                    if (jobPosting.jobLocation) {
                        const loc = Array.isArray(jobPosting.jobLocation) 
                            ? jobPosting.jobLocation[0] 
                            : jobPosting.jobLocation;
                        if (loc.address) {
                            const addr = loc.address;
                            result.location = [addr.addressLocality, addr.addressRegion, addr.addressCountry]
                                .filter(Boolean).join(', ');
                        }
                    }
                    
                    // Salary
                    if (jobPosting.baseSalary) {
                        const salary = jobPosting.baseSalary;
                        if (salary.value) {
                            const val = salary.value;
                            if (typeof val === 'object') {
                                result.salary = `${val.minValue || ''}-${val.maxValue || ''} ${salary.currency || ''}`.trim();
                            } else {
                                result.salary = `${val} ${salary.currency || ''}`.trim();
                            }
                        }
                    }
                    
                    break;
                }
            } catch (e) {
                // Continue to next JSON-LD block
            }
        }
    }
    
    // Greenhouse-specific parsing
    if (url.includes('greenhouse.io') || url.includes('boards.greenhouse')) {
        if (!result.title) {
            const titleMatch = html.match(/<h1[^>]*class="[^"]*app-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i);
            result.title = stripTags(titleMatch?.[1]) || null;
        }
        if (!result.company) {
            const companyMatch = html.match(/<span[^>]*class="[^"]*company-name[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
            result.company = stripTags(companyMatch?.[1]) || null;
        }
        if (!result.location) {
            const locationMatch = html.match(/<div[^>]*class="[^"]*location[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
            result.location = stripTags(locationMatch?.[1]) || null;
        }
    }
    
    // Lever-specific parsing
    if (url.includes('lever.co') || url.includes('jobs.lever')) {
        if (!result.title) {
            const titleMatch = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
            result.title = stripTags(titleMatch?.[1]) || null;
        }
        if (!result.location) {
            const locationMatch = html.match(/<div[^>]*class="[^"]*location[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
            result.location = stripTags(locationMatch?.[1]) || null;
        }
    }
    
    // Ashby-specific parsing
    if (url.includes('ashbyhq.com') || url.includes('jobs.ashby')) {
        if (!result.title) {
            const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
            result.title = stripTags(titleMatch?.[1]) || null;
        }
    }
    
    // Workday-specific parsing
    if (url.includes('myworkdayjobs.com') || url.includes('workday.com')) {
        if (!result.title) {
            const titleMatch = html.match(/data-automation-id="jobPostingHeader"[^>]*>([\s\S]*?)<\/h2>/i);
            result.title = stripTags(titleMatch?.[1]) || null;
        }
    }
    
    // Generic fallbacks using Open Graph and meta tags
    if (!result.title) {
        const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
        result.title = ogTitle?.[1] || null;
    }
    if (!result.title) {
        const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        result.title = stripTags(titleTag?.[1]) || null;
    }
    
    if (!result.description) {
        const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
        result.description = ogDesc?.[1]?.substring(0, 500) || null;
    }
    if (!result.description) {
        const metaDesc = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
        result.description = metaDesc?.[1]?.substring(0, 500) || null;
    }
    
    // Try to extract company from title if not found
    if (!result.company && result.title) {
        // Common patterns: "Job Title at Company" or "Job Title - Company"
        const atMatch = result.title.match(/(.+?)\s+at\s+(.+)/i);
        const dashMatch = result.title.match(/(.+?)\s+-\s+(.+)/i);
        
        if (atMatch) {
            result.title = atMatch[1].trim();
            result.company = atMatch[2].trim();
        } else if (dashMatch) {
            // Could be "Title - Company" or "Company - Title"
            // Heuristic: shorter part is usually company
            if (dashMatch[1].length < dashMatch[2].length) {
                result.company = dashMatch[1].trim();
                result.title = dashMatch[2].trim();
            } else {
                result.title = dashMatch[1].trim();
                result.company = dashMatch[2].trim();
            }
        }
    }
    
    // Clean up company name (remove common suffixes)
    if (result.company) {
        result.company = result.company
            .replace(/\s*\|\s*.*$/, '')
            .replace(/\s*-\s*Careers?.*$/i, '')
            .replace(/\s*Jobs?.*$/i, '')
            .trim();
    }
    
    return result;
}

// Main handler
exports.handler = async (event) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };
    
    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }
    
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
    
    try {
        const { url } = JSON.parse(event.body || '{}');
        
        if (!url) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'URL is required' })
            };
        }
        
        // Validate URL
        let parsedUrl;
        try {
            parsedUrl = new URL(url);
        } catch (e) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid URL format' })
            };
        }
        
        // Block known problematic sites
        const blockedDomains = ['linkedin.com', 'indeed.com', 'glassdoor.com'];
        if (blockedDomains.some(d => parsedUrl.hostname.includes(d))) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: `${parsedUrl.hostname} blocks automated access. Please copy the job details manually.`
                })
            };
        }
        
        // Fetch the page
        const html = await fetchUrl(url);
        
        // Parse job details
        const jobData = parseJobHtml(html, url);
        
        // Check if we got useful data
        if (!jobData.title && !jobData.company) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    error: 'Could not extract job details. The page structure may not be supported.',
                    partial: jobData
                })
            };
        }
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(jobData)
        };
        
    } catch (error) {
        console.error('Parse job error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: error.message || 'Failed to fetch or parse the job posting'
            })
        };
    }
};
