// Smart Paste Module
import { openModal } from './application-manager.js';

// Smart-Paste Feature
function handleSmartPaste(url) {
    // Parse job posting URL and extract data
    const parsedData = parseJobUrl(url);
    if (parsedData) {
        document.getElementById('company').value = parsedData.company || '';
        document.getElementById('role').value = parsedData.role || '';
        document.getElementById('location').value = parsedData.location || '';
        document.getElementById('source').value = parsedData.source || '';
        openModal();
    }
}

function parseJobUrl(url) {
    // Basic URL parsing for common job sites
    const patterns = {
        linkedin: /linkedin\.com\/jobs\/view\/\d+\/?.*company=([^&]+).*jobTitle=([^&]+)/,
        indeed: /indeed\.com\/.*company=([^&]+).*jobTitle=([^&]+)/,
        glassdoor: /glassdoor\.com\/.*company=([^&]+).*jobTitle=([^&]+)/
    };
    
    let data = {};
    
    if (url.includes('linkedin.com')) {
        data.source = 'LinkedIn';
    } else if (url.includes('indeed.com')) {
        data.source = 'Indeed';
    } else if (url.includes('glassdoor.com')) {
        data.source = 'Glassdoor';
    }
    
    // Extract company and role from URL or use smart defaults
    const urlParts = new URL(url);
    const pathParts = urlParts.pathname.split('/');
    
    // Try to extract company and role from URL structure
    if (pathParts.length > 2) {
        data.company = pathParts[2].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        data.role = pathParts[3]?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || '';
    }
    
    return data;
}

// Smart Paste Modal
function showSmartPasteModal() {
    const modal = document.getElementById('smart-paste-modal');
    modal.style.display = 'block';
}

function closeSmartPasteModal() {
    const modal = document.getElementById('smart-paste-modal');
    modal.style.display = 'none';
}

function processSmartPaste() {
    const url = document.getElementById('smart-paste-url').value;
    if (!url) return;
    
    const data = parseJobUrl(url);
    if (data) {
        document.getElementById('company').value = data.company || '';
        document.getElementById('role').value = data.role || '';
        document.getElementById('location').value = data.location || '';
        document.getElementById('source').value = data.source || '';
        closeSmartPasteModal();
        openModal();
    }
}

export { handleSmartPaste, parseJobUrl, showSmartPasteModal, closeSmartPasteModal, processSmartPaste };
