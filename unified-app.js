// Unified Application State
let applications = JSON.parse(localStorage.getItem('jobApplications')) || [];
let editingId = null;
let currentPage = 'dashboard';

// DOM Elements
const modal = document.getElementById('application-modal');
const form = document.getElementById('application-form');
const addBtn = document.getElementById('add-application-btn');
const exportBtn = document.getElementById('export-data-btn');
const closeBtn = document.querySelector('.close');

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

// Navigation System
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

// Enhanced Application Management
function renderApplications() {
    const stages = ['applied', 'interview', 'offer', 'rejected', 'ghosted'];
    
    stages.forEach(stage => {
        const container = document.getElementById(`${stage}-list`);
        if (!container) return;
        
        container.innerHTML = '';
        const stageApps = applications.filter(app => app.stage === stage);
        
        if (stageApps.length === 0) {
            container.innerHTML = '<div class="empty-state">No applications yet</div>';
            return;
        }
        
        stageApps.forEach(app => {
            const card = createApplicationCard(app);
            container.appendChild(card);
        });
    });
}

function createApplicationCard(app) {
    const card = document.createElement('div');
    card.className = 'application-card';
    card.draggable = true;
    card.dataset.id = app.id;
    
    const daysSinceApplied = Math.floor((Date.now() - new Date(app.dateApplied)) / (1000 * 60 * 60 * 24));
    
    card.innerHTML = `
        <h4>${app.company}</h4>
        <p>${app.role}</p>
        ${app.location ? `<p><small><i class="fas fa-map-marker-alt"></i> ${app.location}</small></p>` : ''}
        ${app.source ? `<p><small><i class="fas fa-link"></i> ${app.source}</small></p>` : ''}
        <span class="stage ${app.stage}">${app.stage}</span>
        ${app.notes ? `<p><small>${app.notes}</small></p>` : ''}
        <p><small><i class="fas fa-calendar"></i> ${daysSinceApplied} days ago</small></p>
        <div style="margin-top: 0.5rem;">
            <button onclick="editApplication('${app.id}')" class="btn small">Edit</button>
            <button onclick="deleteApplication('${app.id}')" class="btn small danger">Delete</button>
        </div>
    `;
    
    // Add drag and drop
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragover', handleDragOver);
    card.addEventListener('drop', handleDrop);
    
    return card;
}

// Analytics Dashboard
function loadAnalytics() {
    const total = applications.length;
    const interviews = applications.filter(a => a.stage === 'interview').length;
    const offers = applications.filter(a => a.stage === 'offer').length;
    const rejections = applications.filter(a => a.stage === 'rejected').length;
    const ghosted = applications.filter(a => a.stage === 'ghosted').length;
    
    // Update analytics dashboard
    document.getElementById('analytics-total').textContent = total;
    document.getElementById('analytics-interviews').textContent = interviews;
    document.getElementById('analytics-offers').textContent = offers;
    document.getElementById('analytics-rejections').textContent = rejections;
    document.getElementById('analytics-ghosted').textContent = ghosted;
    
    // Calculate success rate
    const successRate = total > 0 ? Math.round((offers / total) * 100) : 0;
    document.getElementById('success-rate').textContent = `${successRate}%`;
    
    // Generate chart data
    generateChart();
}

function generateChart() {
    const ctx = document.getElementById('applications-chart');
    if (!ctx) return;
    
    // Simple bar chart using canvas
    const canvas = ctx;
    const ctx2d = canvas.getContext('2d');
    const stages = ['applied', 'interview', 'offer', 'rejected', 'ghosted'];
    const counts = stages.map(stage => applications.filter(a => a.stage === stage).length);
    
    // Clear canvas
    ctx2d.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw bars
    const barWidth = canvas.width / stages.length - 10;
    const maxCount = Math.max(...counts);
    
    stages.forEach((stage, index) => {
        const barHeight = (counts[index] / maxCount) * (canvas.height - 40);
        const x = index * (barWidth + 10) + 5;
        const y = canvas.height - barHeight - 20;
        
        ctx2d.fillStyle = getStageColor(stage);
        ctx2d.fillRect(x, y, barWidth, barHeight);
        
        ctx2d.fillStyle = '#333';
        ctx2d.font = '12px Arial';
        ctx2d.textAlign = 'center';
        ctx2d.fillText(counts[index], x + barWidth/2, y - 5);
        ctx2d.fillText(stage, x + barWidth/2, canvas.height - 5);
    });
}

function getStageColor(stage) {
    const colors = {
        applied: '#1976d2',
        interview: '#7b1fa2',
        offer: '#388e3c',
        rejected: '#d32f2f',
        ghosted: '#f57c00'
    };
    return colors[stage] || '#666';
}

// Resume Builder
function loadResumeBuilder() {
    // Initialize resume builder with current applications
    const resumeData = {
        experience: applications.filter(a => a.stage === 'offer').map(a => ({
            company: a.company,
            role: a.role,
            location: a.location
        }))
    };
    
    // Populate resume template
    document.getElementById('resume-experience').innerHTML = resumeData.experience.map(exp => `
        <div class="resume-item">
            <h4>${exp.role}</h4>
            <p><strong>${exp.company}</strong> - ${exp.location}</p>
        </div>
    `).join('');
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

// Enhanced Export
function exportData() {
    const data = {
        applications: applications,
        exportDate: new Date().toISOString(),
        summary: {
            total: applications.length,
            interviews: applications.filter(a => a.stage === 'interview').length,
            offers: applications.filter(a => a.stage === 'offer').length,
            rejections: applications.filter(a => a.stage === 'rejected').length,
            ghosted: applications.filter(a => a.stage === 'ghosted').length
        }
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `job-applications-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Initialize
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
});

// Event listeners
addBtn?.addEventListener('click', openModal);
closeBtn?.addEventListener('click', closeModal);
exportBtn?.addEventListener('click', exportData);
form?.addEventListener('submit', handleSubmit);

// Modal functions
function openModal(id = null) {
    editingId = id;
    const modalTitle = document.getElementById('modal-title');
    
    if (id) {
        const app = applications.find(a => a.id === id);
        modalTitle.textContent = 'Edit Application';
        document.getElementById('company').value = app.company;
        document.getElementById('role').value = app.role;
        document.getElementById('location').value = app.location || '';
        document.getElementById('source').value = app.source || '';
        document.getElementById('stage').value = app.stage;
        document.getElementById('notes').value = app.notes || '';
        document.getElementById('application-id').value = id;
    } else {
        modalTitle.textContent = 'Add New Application';
        form.reset();
    }
    
    modal.style.display = 'block';
}

function closeModal() {
    modal.style.display = 'none';
    form.reset();
    editingId = null;
}

// Handle form submission
function handleSubmit(e) {
    e.preventDefault();
    
    const application = {
        id: editingId || Date.now().toString(),
        company: document.getElementById('company').value,
        role: document.getElementById('role').value,
        location: document.getElementById('location').value,
        source: document.getElementById('source').value,
        stage: document.getElementById('stage').value,
        notes: document.getElementById('notes').value,
        dateApplied: new Date().toISOString()
    };

    if (editingId) {
        const index = applications.findIndex(a => a.id === editingId);
        applications[index] = { ...applications[index], ...application };
    } else {
        applications.push(application);
    }

    localStorage.setItem('jobApplications', JSON.stringify(applications));
    renderApplications();
    updateMetrics();
    loadAnalytics();
    closeModal();
}

// Drag and drop
let draggedElement = null;

function handleDragStart(e) {
    draggedElement = e.target;
    e.target.style.opacity = '0.5';
}

function handleDragOver(e) {
    e.preventDefault();
}

function handleDrop(e) {
    e.preventDefault();
    if (!draggedElement) return;
    
    const targetCard = e.target.closest('.application-card');
    if (!targetCard) return;
    
    const draggedId = draggedElement.dataset.id;
    const targetStage = targetCard.closest('.board-column').dataset.stage;
    
    const draggedApp = applications.find(a => a.id === draggedId);
    if (draggedApp && draggedApp.stage !== targetStage) {
        draggedApp.stage = targetStage;
        localStorage.setItem('jobApplications', JSON.stringify(applications));
        renderApplications();
        updateMetrics();
        loadAnalytics();
    }
    
    draggedElement.style.opacity = '';
    draggedElement = null;
}

// Update metrics
function updateMetrics() {
    const total = applications.length;
    const interviews = applications.filter(a => a.stage === 'interview').length;
    const offers = applications.filter(a => a.stage === 'offer').length;
    const rejections = applications.filter(a => a.stage === 'rejected').length;
    const ghosted = applications.filter(a => a.stage === 'ghosted').length;
    
    document.getElementById('total-applications').textContent = total;
    document.getElementById('interviews').textContent = interviews;
    document.getElementById('offers').textContent = offers;
    document.getElementById('rejections').textContent = rejections;
    document.getElementById('ghosted').textContent = ghosted;
}

// Close modals
window.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
    if (e.target === document.getElementById('smart-paste-modal')) closeSmartPasteModal();
});

// Add demo data
function addDemoData() {
    const demoApps = [
        {
            id: 'demo1',
            company: 'Google',
            role: 'Software Engineer',
            location: 'Mountain View, CA',
            source: 'LinkedIn',
            stage: 'applied',
            notes: 'Applied through referral',
            dateApplied: new Date(Date.now() - 86400000 * 5).toISOString()
        },
        {
            id: 'demo2',
            company: 'Microsoft',
            role: 'Frontend Developer',
            location: 'Seattle, WA',
            source: 'Company website',
            stage: 'interview',
            notes: 'Phone screen scheduled for next week',
            dateApplied: new Date(Date.now() - 86400000 * 10).toISOString()
        },
        {
            id: 'demo3',
            company: 'Amazon',
            role: 'Backend Engineer',
            location: 'Austin, TX',
            source: 'Indeed',
            stage: 'rejected',
            notes: 'Not a good fit for the team',
            dateApplied: new Date(Date.now() - 86400000 * 15).toISOString()
        }
    ];
    
    applications = [...applications, ...demoApps];
    localStorage.setItem('jobApplications', JSON.stringify(applications));
    renderApplications();
    updateMetrics();
    loadAnalytics();
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    renderApplications();
    updateMetrics();
    loadAnalytics();
    
    // Add demo data button if no applications
    if (applications.length === 0) {
        const demoBtn = document.createElement('button');
        demoBtn.textContent = 'Load Demo Data';
        demoBtn.className = 'btn secondary';
        demoBtn.onclick = addDemoData;
        document.querySelector('.controls')?.appendChild(demoBtn);
    }
});
