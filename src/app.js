// Main Application State and Initialization
let applications = JSON.parse(localStorage.getItem('jobApplications')) || [];
let editingId = null;

// Import modules
import { renderApplications, updateMetrics, openModal, closeModal, handleSubmit, addDemoData } from './modules/application-manager.js';
import { navigateTo } from './modules/navigation.js';
import { showSmartPasteModal, closeSmartPasteModal, processSmartPaste } from './modules/smart-paste.js';
import { exportData } from './modules/export.js';
import { loadAnalytics } from './modules/analytics.js';

// DOM Elements
const modal = document.getElementById('application-modal');
const form = document.getElementById('application-form');
const addBtn = document.getElementById('add-application-btn');
const exportBtn = document.getElementById('export-data-btn');
const closeBtn = document.querySelector('.close');

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    renderApplications();
    updateMetrics();
    loadAnalytics();
    
    // Navigation setup
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = e.target.dataset.page;
            navigateTo(page);
        });
    });
    
    // Smart paste setup
    document.getElementById('smart-paste-btn')?.addEventListener('click', showSmartPasteModal);
    document.getElementById('process-smart-paste')?.addEventListener('click', processSmartPaste);
    
    // Add demo data button if no applications
    if (applications.length === 0) {
        const demoBtn = document.createElement('button');
        demoBtn.textContent = 'Load Demo Data';
        demoBtn.className = 'btn secondary';
        demoBtn.onclick = addDemoData;
        document.querySelector('.controls')?.appendChild(demoBtn);
    }
});

// Event listeners
addBtn?.addEventListener('click', openModal);
closeBtn?.addEventListener('click', closeModal);
exportBtn?.addEventListener('click', exportData);
form?.addEventListener('submit', handleSubmit);

// Close modals
window.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
    if (e.target === document.getElementById('smart-paste-modal')) closeSmartPasteModal();
});

// Export functions for use in other modules
export {
    applications,
    editingId,
    modal,
    form,
    addBtn,
    exportBtn,
    closeBtn,
    renderApplications,
    updateMetrics,
    loadAnalytics,
    navigateTo,
    showSmartPasteModal,
    closeSmartPasteModal,
    processSmartPaste,
    openModal,
    closeModal,
    handleSubmit,
    addDemoData
};
