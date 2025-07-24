// Navigation Module
import { loadAnalytics, loadResumeBuilder } from './analytics.js';

let currentPage = 'dashboard';

function navigateTo(page) {
    currentPage = page;
    const pages = document.querySelectorAll('.page-content');
    pages.forEach(p => p.style.display = 'none');
    
    const targetPage = document.getElementById(`${page}-page`);
    if (targetPage) {
        targetPage.style.display = 'block';
    }
    
    // Update active nav
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[data-page="${page}"]`)?.classList.add('active');
    
    // Load page-specific data
    if (page === 'analytics') {
        loadAnalytics();
    } else if (page === 'resume-builder') {
        loadResumeBuilder();
    }
}

export { navigateTo, currentPage };
