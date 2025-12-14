// API Configuration
const API_BASE_URL = 'https://job-rejection-tracker-production.up.railway.app';

// Unified Application State
let applications = [];

try {
    const stored = localStorage.getItem('jobApplications');
    applications = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(applications)) applications = [];
} catch (e) {
    console.error('Failed to load applications:', e);
    applications = [];
}

let editingId = null;
let currentPage = 'dashboard';

// User Authentication State
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let authToken = localStorage.getItem('authToken') || null;
const FREE_TIER_LIMIT = 5;

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
        setTimeout(() => {
            loadAnalytics();
        }, 100);
    } else if (page === 'resume-builder') {
        // loadResumeBuilder(); // Placeholder function not needed
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

// Analytics Dashboard with comprehensive metrics
function loadAnalytics() {
    if (!applications || applications.length === 0) {
        showEmptyState();
        return;
    }

    const total = applications.length;
    const interviews = applications.filter(a => a.stage === 'interview').length;
    const offers = applications.filter(a => a.stage === 'offer').length;
    const rejections = applications.filter(a => a.stage === 'rejected').length;
    const ghosted = applications.filter(a => a.stage === 'ghosted').length;
    
    // Update key metrics
    updateElement('analytics-total', total);
    updateElement('analytics-interviews', interviews);
    updateElement('analytics-offers', offers);
    updateElement('analytics-rejections', rejections);
    updateElement('analytics-ghosted', ghosted);
    
    // Calculate rates
    const interviewRate = total > 0 ? Math.round((interviews / total) * 100) : 0;
    const successRate = total > 0 ? Math.round((offers / total) * 100) : 0;
    const rejectionRate = total > 0 ? Math.round((rejections / total) * 100) : 0;
    const ghostedRate = total > 0 ? Math.round((ghosted / total) * 100) : 0;
    const responseRate = total > 0 ? Math.round(((interviews + offers + rejections) / total) * 100) : 0;
    const interviewConversion = interviews > 0 ? Math.round((offers / interviews) * 100) : 0;
    const offerConversion = interviews > 0 ? Math.round((offers / interviews) * 100) : 0;
    
    // Update rate labels
    updateElement('interview-rate-label', `${interviewRate}% interview rate`);
    updateElement('success-rate-label', `${successRate}% success rate`);
    updateElement('rejection-rate-label', `${rejectionRate}% rejection rate`);
    updateElement('ghosted-rate-label', `${ghostedRate}% no response`);
    updateElement('response-rate', `${responseRate}%`);
    updateElement('interview-conversion', `${interviewConversion}%`);
    updateElement('offer-conversion', `${offerConversion}%`);
    
    // Generate charts
    generateStageChart();
    generateTimelineChart();
    generateSourceChart();
    generateTopCompanies();
    
    // Generate insights
    generateInsights(total, interviews, offers, rejections, ghosted, interviewRate, successRate);
    
    // Calculate performance metrics
    calculatePerformanceMetrics();
}

function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

function showEmptyState() {
    const container = document.getElementById('insights-container');
    if (container) {
        container.innerHTML = `
            <div class="empty-state-card">
                <i class="fas fa-chart-line" style="font-size: 3rem; color: #667eea; margin-bottom: 1rem;"></i>
                <h3>No Analytics Available</h3>
                <p>Start tracking your job applications to see detailed analytics and insights.</p>
            </div>
        `;
    }
}

function generateStageChart() {
    const ctx = document.getElementById('applications-chart');
    if (!ctx) return;
    
    const canvas = ctx;
    const ctx2d = canvas.getContext('2d');
    const stages = ['applied', 'interview', 'offer', 'rejected', 'ghosted'];
    const counts = stages.map(stage => applications.filter(a => a.stage === stage).length);
    
    ctx2d.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw pie chart
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) / 2 - 20;
    let currentAngle = -Math.PI / 2;
    const total = counts.reduce((a, b) => a + b, 0);
    
    if (total === 0) {
        ctx2d.fillStyle = '#ccc';
        ctx2d.beginPath();
        ctx2d.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx2d.fill();
        ctx2d.fillStyle = '#666';
        ctx2d.font = '14px Arial';
        ctx2d.textAlign = 'center';
        ctx2d.fillText('No data', centerX, centerY);
        return;
    }
    
    stages.forEach((stage, index) => {
        if (counts[index] > 0) {
            const sliceAngle = (counts[index] / total) * 2 * Math.PI;
            
            ctx2d.beginPath();
            ctx2d.moveTo(centerX, centerY);
            ctx2d.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            ctx2d.closePath();
            ctx2d.fillStyle = getStageColor(stage);
            ctx2d.fill();
            
            const labelAngle = currentAngle + sliceAngle / 2;
            const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
            const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);
            
            ctx2d.fillStyle = '#fff';
            ctx2d.font = 'bold 12px Arial';
            ctx2d.textAlign = 'center';
            ctx2d.fillText(counts[index], labelX, labelY);
            
            currentAngle += sliceAngle;
        }
    });
}

function generateTimelineChart() {
    const ctx = document.getElementById('timeline-chart');
    if (!ctx) return;
    
    const monthlyData = {};
    applications.forEach(app => {
        if (app.date_applied) {
            const date = new Date(app.date_applied);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
        }
    });
    
    const canvas = ctx;
    const ctx2d = canvas.getContext('2d');
    ctx2d.clearRect(0, 0, canvas.width, canvas.height);
    
    const months = Object.keys(monthlyData).sort();
    if (months.length === 0) return;
    
    const maxCount = Math.max(...Object.values(monthlyData));
    const barWidth = canvas.width / months.length - 5;
    const maxBarHeight = canvas.height - 40;
    
    months.forEach((month, index) => {
        const count = monthlyData[month];
        const barHeight = (count / maxCount) * maxBarHeight;
        const x = index * (barWidth + 5) + 2;
        const y = canvas.height - barHeight - 20;
        
        ctx2d.fillStyle = '#667eea';
        ctx2d.fillRect(x, y, barWidth, barHeight);
        
        ctx2d.fillStyle = '#333';
        ctx2d.font = '10px Arial';
        ctx2d.textAlign = 'center';
        ctx2d.fillText(count, x + barWidth/2, y - 5);
        
        const monthLabel = new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' });
        ctx2d.fillText(monthLabel, x + barWidth/2, canvas.height - 5);
    });
    
    const mostActive = months.reduce((a, b) => monthlyData[a] > monthlyData[b] ? a : b);
    const mostActiveDate = new Date(mostActive + '-01');
    const monthName = mostActiveDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    updateElement('most-active-month', monthName);
}

function generateSourceChart() {
    const ctx = document.getElementById('source-chart');
    if (!ctx) return;
    
    const sourceCounts = {};
    applications.forEach(app => {
        const source = app.source || 'Unknown';
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });
    
    const canvas = ctx;
    const ctx2d = canvas.getContext('2d');
    ctx2d.clearRect(0, 0, canvas.width, canvas.height);
    
    const sources = Object.keys(sourceCounts);
    if (sources.length === 0) return;
    
    const maxCount = Math.max(...Object.values(sourceCounts));
    const barWidth = canvas.width / sources.length - 10;
    const maxBarHeight = canvas.height - 40;
    
    sources.forEach((source, index) => {
        const count = sourceCounts[source];
        const barHeight = (count / maxCount) * maxBarHeight;
        const x = index * (barWidth + 10) + 5;
        const y = canvas.height - barHeight - 20;
        
        ctx2d.fillStyle = getSourceColor(source);
        ctx2d.fillRect(x, y, barWidth, barHeight);
        
        ctx2d.fillStyle = '#333';
        ctx2d.font = '10px Arial';
        ctx2d.textAlign = 'center';
        ctx2d.fillText(count, x + barWidth/2, y - 5);
        
        ctx2d.save();
        ctx2d.translate(x + barWidth/2, canvas.height - 5);
        ctx2d.rotate(-Math.PI / 4);
        ctx2d.fillText(source.substring(0, 8), 0, 0);
        ctx2d.restore();
    });
}

function generateTopCompanies() {
    const companyCounts = {};
    applications.forEach(app => {
        if (app.company) {
            companyCounts[app.company] = (companyCounts[app.company] || 0) + 1;
        }
    });
    
    const sortedCompanies = Object.entries(companyCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    const container = document.getElementById('top-companies-list');
    if (!container) return;
    
    if (sortedCompanies.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666;">No company data available</p>';
        return;
    }
    
    container.innerHTML = sortedCompanies.map(([company, count]) => `
        <div class="company-item">
            <span class="company-name">${company}</span>
            <span class="company-count">${count} ${count === 1 ? 'application' : 'applications'}</span>
        </div>
    `).join('');
}

function generateInsights(total, interviews, offers, rejections, ghosted, interviewRate, successRate) {
    const container = document.getElementById('insights-container');
    if (!container) return;
    
    const insights = [];
    
    if (successRate >= 20) {
        insights.push({
            icon: 'trophy',
            color: '#10b981',
            title: 'Excellent Success Rate',
            message: `Your ${successRate}% success rate is above average! Keep up the great work.`
        });
    } else if (successRate > 0) {
        insights.push({
            icon: 'chart-line',
            color: '#667eea',
            title: 'Building Momentum',
            message: `You have ${offers} offer${offers !== 1 ? 's' : ''}. Consider refining your approach to increase your success rate.`
        });
    }
    
    if (interviewRate >= 30) {
        insights.push({
            icon: 'handshake',
            color: '#7b1fa2',
            title: 'Strong Interview Rate',
            message: `${interviewRate}% of your applications led to interviews. Your resume is getting noticed!`
        });
    } else if (interviewRate < 10 && total > 5) {
        insights.push({
            icon: 'exclamation-triangle',
            color: '#f59e0b',
            title: 'Resume Review Needed',
            message: `Only ${interviewRate}% interview rate. Consider optimizing your resume and cover letters.`
        });
    }
    
    if (ghosted > total * 0.5) {
        insights.push({
            icon: 'clock',
            color: '#f57c00',
            title: 'High No-Response Rate',
            message: `${Math.round((ghosted/total)*100)}% of applications haven't received responses. Consider following up.`
        });
    }
    
    if (total < 10) {
        insights.push({
            icon: 'plus-circle',
            color: '#667eea',
            title: 'Increase Application Volume',
            message: `You've applied to ${total} positions. Most job seekers apply to 50-100+ positions.`
        });
    } else if (total >= 50) {
        insights.push({
            icon: 'check-circle',
            color: '#10b981',
            title: 'High Application Volume',
            message: `You've applied to ${total} positions. That's excellent volume!`
        });
    }
    
    if (rejections > 0 && rejections / total > 0.3) {
        insights.push({
            icon: 'redo',
            color: '#d32f2f',
            title: 'Learning from Rejections',
            message: `You've received ${rejections} rejection${rejections !== 1 ? 's' : ''}. Each one is a learning opportunity.`
        });
    }
    
    if (insights.length === 0) {
        insights.push({
            icon: 'info-circle',
            color: '#667eea',
            title: 'Getting Started',
            message: 'Keep tracking your applications to unlock personalized insights and recommendations.'
        });
    }
    
    container.innerHTML = insights.map(insight => `
        <div class="insight-card" style="border-left: 4px solid ${insight.color};">
            <div class="insight-header">
                <i class="fas fa-${insight.icon}" style="color: ${insight.color};"></i>
                <h4>${insight.title}</h4>
            </div>
            <p>${insight.message}</p>
        </div>
    `).join('');
}

function calculatePerformanceMetrics() {
    const respondedApps = applications.filter(app => {
        if (!app.date_applied) return false;
        const appliedDate = new Date(app.date_applied);
        return app.stage !== 'applied' && app.stage !== 'ghosted';
    });
    
    if (respondedApps.length > 0) {
        const totalDays = respondedApps.reduce((sum, app) => {
            if (!app.date_applied) return sum;
            const appliedDate = new Date(app.date_applied);
            const today = new Date();
            const days = Math.floor((today - appliedDate) / (1000 * 60 * 60 * 24));
            return sum + days;
        }, 0);
        const avgDays = Math.round(totalDays / respondedApps.length);
        updateElement('avg-response-time', `${avgDays} days`);
    } else {
        updateElement('avg-response-time', 'No data');
    }
}

function getSourceColor(source) {
    const colors = {
        'LinkedIn': '#0077b5',
        'Indeed': '#2164f3',
        'Glassdoor': '#0caa41',
        'Company Website': '#667eea',
        'Referral': '#10b981',
        'Other': '#888'
    };
    return colors[source] || '#888';
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
    openModal('smart-paste-modal');
}

function closeSmartPasteModal() {
    closeModal('smart-paste-modal');
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
addBtn?.addEventListener('click', () => {
    // Check limit before opening modal
    if (!checkApplicationLimit()) {
        return; // Limit check failed, modal already shown
    }
    openModal();
});
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
    
    openModal('application-modal');
}

function closeModal() {
    const modal = document.getElementById('application-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('is-open');
    }
    document.body.style.overflow = '';
    form.reset();
    editingId = null;
}

// Handle form submission
function handleSubmit(e) {
    e.preventDefault();
    
    // Check application limit for new applications (not edits)
    if (!editingId && !checkApplicationLimit()) {
        return; // Limit check failed, modal already shown
    }
    
    const newStage = document.getElementById('stage').value;
    let wasOffer = false;
    
    // Check if this is a new offer
    if (editingId) {
        const oldApp = applications.find(a => a.id === editingId);
        if (oldApp && oldApp.stage !== 'offer' && newStage === 'offer') {
            wasOffer = true;
        }
    } else if (newStage === 'offer') {
        wasOffer = true;
    }
    
    const application = {
        id: editingId || Date.now().toString(),
        company: document.getElementById('company').value,
        role: document.getElementById('role').value,
        location: document.getElementById('location').value,
        source: document.getElementById('source').value,
        stage: newStage,
        notes: document.getElementById('notes').value,
        dateApplied: new Date().toISOString()
    };

    if (editingId) {
        const index = applications.findIndex(a => a.id === editingId);
        applications[index] = { ...applications[index], ...application };
    } else {
        applications.push(application);
    }

    // Sync to backend
    const isNew = !editingId;
    if (authToken) {
        syncApplicationToBackend(application).then(savedApp => {
            // Update local copy with backend ID
            if (isNew) {
                const index = applications.findIndex(a => a.id === application.id);
                if (index !== -1) applications[index] = savedApp;
            }
            localStorage.setItem('jobApplications', JSON.stringify(applications));
        }).catch(err => console.error('Backend sync failed:', err));
    }
    
    localStorage.setItem('jobApplications', JSON.stringify(applications));
    renderApplications();
    updateMetrics();
    loadAnalytics();
    closeModal();
    
    // 🎉 Celebrate if it's an offer!
    if (wasOffer) {
        setTimeout(() => {
            createConfetti();
            showToast('Congratulations! Offer received! 🎉', 'success');
        }, 300);
    } else {
        showToast('Application saved!', 'success');
    }
}

// Drag and drop
let draggedElement = null;

function handleDragStart(e) {
    draggedElement = e.target;
    e.target.style.opacity = '0.5';
    // Add class to all columns to indicate they are drop targets
    document.querySelectorAll('.board-column').forEach(col => {
        col.classList.add('drop-target-active');
    });
}

function handleDragOver(e) {
    e.preventDefault();
    const column = e.target.closest('.board-column');
    if (column) {
        // Remove hover class from all other columns first
        document.querySelectorAll('.board-column').forEach(c => c.classList.remove('drop-hover'));
        column.classList.add('drop-hover');
    }
}

function handleDragLeave(e) {
    const column = e.target.closest('.board-column');
    if (column) {
        column.classList.remove('drop-hover');
    }
}

function handleDragEnd(e) {
    e.target.style.opacity = '';
    document.querySelectorAll('.board-column').forEach(col => {
        col.classList.remove('drop-target-active', 'drop-hover');
    });
}

function handleDrop(e) {
    e.preventDefault();
    // Clean up classes
    document.querySelectorAll('.board-column').forEach(col => {
        col.classList.remove('drop-target-active', 'drop-hover');
    });

    if (!draggedElement) return;
    
    // Find target column directly (dropping on empty column) or via card
    const targetColumn = e.target.closest('.board-column');
    if (!targetColumn) return;
    
    const draggedId = draggedElement.dataset.id;
    const targetStage = targetColumn.dataset.stage;
    
    const draggedApp = applications.find(a => a.id === draggedId);
    if (draggedApp && draggedApp.stage !== targetStage) {
        const wasNotOffer = draggedApp.stage !== 'offer';
        draggedApp.stage = targetStage;
        localStorage.setItem('jobApplications', JSON.stringify(applications));
        renderApplications();
        updateMetrics();
        loadAnalytics();
        
        // 🎉 Celebrate if dragged to offer!
        if (targetStage === 'offer' && wasNotOffer) {
            setTimeout(() => {
                createConfetti();
                showToast('Congratulations! Offer received.', 'success');
            }, 300);
        }
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

// Close modals when clicking outside (on backdrop)
window.addEventListener('click', (e) => {
    // Check if the clicked element is a modal backdrop
    if (e.target.classList.contains('modal') && e.target.id) {
        // Close the specific modal
        if (e.target.id === 'application-modal') closeModal();
        else if (e.target.id === 'smart-paste-modal') closeSmartPasteModal();
        else if (e.target.id === 'auth-modal') closeAuthModal();
        else if (e.target.id === 'upgrade-modal') closeUpgradeModal();
        else if (e.target.id === 'payment-modal') closePaymentModal();
        else if (e.target.id === 'notification-modal') closeNotificationModal();
    }
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

// Authentication Functions
function checkAuthStatus() {
    if (!currentUser) {
        // Show login button
        updateAuthUI();
        // Optionally show login modal on first visit
        // showLoginModal();
    } else {
        updateAuthUI();
    }
}

function updateAuthUI() {
    const authMenuItem = document.getElementById('auth-menu-item');
    if (!authMenuItem) return;
    
    if (currentUser) {
        authMenuItem.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1rem;">
                <span style="color: #667eea; font-weight: 500;">
                    <i class="fas fa-user"></i> ${currentUser.name || currentUser.email}
                </span>
                <span style="color: #666; font-size: 0.9rem;">
                    ${getUserPlanDisplay()}
                </span>
                <a href="#" class="nav-link" onclick="handleLogout(); return false;">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </a>
            </div>
        `;
    } else {
        authMenuItem.innerHTML = `
            <a href="#" class="nav-link" id="login-btn" onclick="showLoginModal(); return false;">
                <i class="fas fa-sign-in-alt"></i> Login
            </a>
        `;
    }
}

function getUserPlanDisplay() {
    if (!currentUser) return '';
    if (currentUser.plan === 'professional' || currentUser.plan === 'enterprise') {
        return '<span style="color: #10b981;">Pro</span>';
    }
    return '<span style="color: #f59e0b;">Free</span>';
}

// ===== MODAL MANAGER =====
// Ensures only one modal is open at a time

function closeAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
        modal.classList.remove('is-open');
    });
}

function openModal(modalId) {
    closeAllModals();
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        modal.classList.add('is-open');
        // Lock body scroll when modal is open
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('is-open');
    }
    // Restore body scroll
    document.body.style.overflow = '';
}

// ===== AUTH MODAL FUNCTIONS =====

function showLoginModal() {
    openModal('auth-modal');
    showLoginForm();
}

function showLoginForm() {
    document.getElementById('login-form-container').style.display = 'block';
    document.getElementById('register-form-container').style.display = 'none';
}

function showRegisterForm() {
    document.getElementById('login-form-container').style.display = 'none';
    document.getElementById('register-form-container').style.display = 'block';
}

function closeAuthModal() {
    closeModal('auth-modal');
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Save auth token and user info
            authToken = data.token;
            localStorage.setItem('authToken', authToken);
            
            currentUser = {
                email: data.user.email,
                name: data.user.name,
                plan: data.user.plan || 'free',
                createdAt: data.user.createdAt
            };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            closeAuthModal();
            updateAuthUI();
            showToast('Welcome back, ' + currentUser.name + '! 👋', 'success');
            
            // Load user's applications from backend
            await loadApplicationsFromBackend();
        } else {
            showToast('Invalid email or password. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('Network error. Please check your connection and try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account...';
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Save auth token and user info
            authToken = data.token;
            localStorage.setItem('authToken', authToken);
            
            currentUser = {
                email: data.user.email,
                name: data.user.name,
                plan: 'free',
                createdAt: data.user.createdAt
            };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            closeAuthModal();
            updateAuthUI();
            showToast('Welcome to Job Tracker, ' + name + '! 🎉 You can track up to 5 applications for free.', 'success');
            
            // Load user's applications from backend
            await loadApplicationsFromBackend();
        } else {
            showToast(data.message || 'Registration failed. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showToast('Network error. Please check your connection and try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
    }
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        currentUser = null;
        authToken = null;
        localStorage.removeItem('currentUser');
        localStorage.removeItem('authToken');
        updateAuthUI();
        showToast('You have been logged out. See you soon! 👋', 'info');
    }
}

// ===== BACKEND API INTEGRATION =====

async function loadApplicationsFromBackend() {
    if (!authToken) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/applications`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            applications = data.applications || [];
            localStorage.setItem('jobApplications', JSON.stringify(applications));
            renderApplications();
            updateMetrics();
        } else if (response.status === 401) {
            // Token expired, logout
            handleLogout();
            showToast('Session expired. Please login again.', 'info');
        }
    } catch (error) {
        console.error('Error loading applications:', error);
        // Fallback to localStorage - offline mode
    }
}

async function syncApplicationToBackend(application) {
    if (!authToken) {
        // Not logged in - save locally only
        return application;
    }
    
    try {
        // Determine if new or update (new IDs are timestamps)
        const isNew = !application.id || application.id.toString().length < 15;
        const url = isNew 
            ? `${API_BASE_URL}/api/applications`
            : `${API_BASE_URL}/api/applications/${application.id}`;
        const method = isNew ? 'POST' : 'PUT';
        
        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(application)
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.application; // Return backend version with real ID
        } else {
            throw new Error('Backend save failed');
        }
    } catch (error) {
        console.error('Backend sync error:', error);
        // Return local version as fallback
        return application;
    }
}

async function deleteApplicationFromBackend(id) {
    if (!authToken) return true;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/applications/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        return response.ok;
    } catch (error) {
        console.error('Backend delete error:', error);
        return true; // Allow local delete even if backend fails
    }
}

// Backend API Functions
async function loadApplicationsFromBackend() {
    if (!authToken) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/applications`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            applications = data.applications || [];
            localStorage.setItem('jobApplications', JSON.stringify(applications));
            renderApplications();
            updateMetrics();
        }
    } catch (error) {
        console.error('Error loading applications:', error);
        showToast('Using offline mode. Data syncs when online.', 'info');
    }
}

async function saveApplicationToBackend(application) {
    if (!authToken) {
        return saveApplicationLocally(application);
    }
    
    try {
        const isNew = !application.id || !application.id.toString().includes('-');
        const url = isNew 
            ? `${API_BASE_URL}/api/applications`
            : `${API_BASE_URL}/api/applications/${application.id}`;
        const method = isNew ? 'POST' : 'PUT';
        
        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(application)
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.application;
        } else {
            throw new Error('Failed to save to backend');
        }
    } catch (error) {
        console.error('Error saving to backend:', error);
        return saveApplicationLocally(application);
    }
}

async function deleteApplicationFromBackend(id) {
    if (!authToken) {
        return deleteApplicationLocally(id);
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/applications/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            return true;
        } else {
            throw new Error('Failed to delete from backend');
        }
    } catch (error) {
        console.error('Error deleting from backend:', error);
        return deleteApplicationLocally(id);
    }
}

// Local storage fallback functions
function saveApplicationLocally(application) {
    if (!application.id) {
        application.id = Date.now().toString();
        applications.push(application);
    } else {
        const index = applications.findIndex(a => a.id === application.id);
        if (index !== -1) {
            applications[index] = application;
        }
    }
    localStorage.setItem('jobApplications', JSON.stringify(applications));
    return application;
}

function deleteApplicationLocally(id) {
    applications = applications.filter(app => app.id !== id);
    localStorage.setItem('jobApplications', JSON.stringify(applications));
    return true;
}

// Main delete function (called from UI)
async function deleteApplication(id) {
    if (!confirm('Are you sure you want to delete this application?')) {
        return;
    }
    
    try {
        // Delete from backend if authenticated
        if (authToken) {
            await deleteApplicationFromBackend(id);
        }
        
        // Delete locally
        applications = applications.filter(app => app.id !== id);
        localStorage.setItem('jobApplications', JSON.stringify(applications));
        
        renderApplications();
        updateMetrics();
        showToast('Application deleted successfully.', 'success');
    } catch (error) {
        console.error('Error deleting application:', error);
        showToast('Error deleting application. Please try again.', 'error');
    }
}

function checkApplicationLimit() {
    // If not logged in, prompt to login
    if (!currentUser) {
        showToast('Please login or create a free account to start tracking applications! 🚀', 'info');
        setTimeout(() => showLoginModal(), 500);
        return false;
    }
    
    // Professional and Enterprise plans have unlimited applications
    if (currentUser.plan === 'professional' || currentUser.plan === 'enterprise') {
        return true;
    }
    
    // Free plan: limit to 5 applications
    if (applications.length >= FREE_TIER_LIMIT) {
        showUpgradeModal();
        return false;
    }
    
    return true;
}

function showUpgradeModal() {
    openModal('upgrade-modal');
}

function closeUpgradeModal() {
    closeModal('upgrade-modal');
}

// ==========================================
// NEW FEATURES - ALL 5 UPGRADES
// ==========================================

// 1. SEARCH AND FILTER FUNCTIONS
let filteredApplications = [...applications];

function filterApplications() {
    const searchTerm = document.getElementById('search-input')?.value.toLowerCase() || '';
    const stageFilter = document.getElementById('filter-stage')?.value || '';
    const sourceFilter = document.getElementById('filter-source')?.value || '';
    
    filteredApplications = applications.filter(app => {
        const matchesSearch = !searchTerm || 
            app.company.toLowerCase().includes(searchTerm) ||
            app.role.toLowerCase().includes(searchTerm) ||
            (app.notes && app.notes.toLowerCase().includes(searchTerm)) ||
            (app.location && app.location.toLowerCase().includes(searchTerm));
        
        const matchesStage = !stageFilter || app.stage === stageFilter;
        const matchesSource = !sourceFilter || app.source === sourceFilter;
        
        return matchesSearch && matchesStage && matchesSource;
    });
    
    sortApplications();
    renderFilteredApplications();
}

function sortApplications() {
    const sortBy = document.getElementById('sort-by')?.value || 'date-desc';
    
    filteredApplications.sort((a, b) => {
        switch(sortBy) {
            case 'date-desc':
                return new Date(b.dateApplied || 0) - new Date(a.dateApplied || 0);
            case 'date-asc':
                return new Date(a.dateApplied || 0) - new Date(b.dateApplied || 0);
            case 'company-asc':
                return a.company.localeCompare(b.company);
            case 'company-desc':
                return b.company.localeCompare(a.company);
            default:
                return 0;
        }
    });
    
    renderFilteredApplications();
}

function renderFilteredApplications() {
    const stages = ['applied', 'interview', 'offer', 'rejected', 'ghosted'];
    
    stages.forEach(stage => {
        const container = document.getElementById(`${stage}-list`);
        if (!container) return;
        
        container.innerHTML = '';
        const stageApps = filteredApplications.filter(app => app.stage === stage);
        
        if (stageApps.length === 0) {
            container.innerHTML = '<div class="empty-state">No applications</div>';
            return;
        }
        
        stageApps.forEach(app => {
            const card = createApplicationCard(app);
            container.appendChild(card);
        });
    });
}

// 2. DARK MODE
function initDarkMode() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        const btn = document.getElementById('dark-mode-btn');
        if (btn) {
            btn.classList.add('active');
            btn.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
        }
    }
}

function toggleDarkMode() {
    const body = document.body;
    const btn = document.getElementById('dark-mode-btn');
    
    body.classList.toggle('dark-mode');
    const isDarkMode = body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
    
    if (btn) {
        if (isDarkMode) {
            btn.classList.add('active');
            btn.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
        } else {
            btn.classList.remove('active');
            btn.innerHTML = '<i class="fas fa-moon"></i> Dark Mode';
        }
    }
    
    showToast(isDarkMode ? 'Dark mode enabled' : 'Light mode enabled', 'info');
}

// 3. PAYMENT FUNCTIONS
function showPaymentModal() {
    openModal('payment-modal');
}

function closePaymentModal() {
    closeModal('payment-modal');
}

function handlePayment(e) {
    e.preventDefault();
    
    const cardName = document.getElementById('card-name').value;
    const cardNumber = document.getElementById('card-number').value;
    const cardExpiry = document.getElementById('card-expiry').value;
    const cardCvc = document.getElementById('card-cvc').value;
    
    // Validate card number (basic check)
    if (cardNumber.replace(/\s/g, '').length < 16) {
        showToast('Please enter a valid card number', 'error');
        return;
    }
    
    // Simulate payment processing
    showToast('Processing payment...', 'info');
    
    setTimeout(() => {
        // In production, this would call Stripe API
        // For demo, we'll simulate success
        if (currentUser) {
            currentUser.plan = 'professional';
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            // Update users array
            const users = JSON.parse(localStorage.getItem('users')) || [];
            const userIndex = users.findIndex(u => u.email === currentUser.email);
            if (userIndex !== -1) {
                users[userIndex].plan = 'professional';
                localStorage.setItem('users', JSON.stringify(users));
            }
        }
        
        closePaymentModal();
        updateAuthUI();
        updateUsageIndicator();
        showToast('Payment successful! You now have unlimited applications.', 'success');
    }, 2000);
}

// 4. NOTIFICATION FUNCTIONS
function showNotificationModal() {
    openModal('notification-modal');
    loadNotificationSettings();
}

function closeNotificationModal() {
    closeModal('notification-modal');
}

function loadNotificationSettings() {
    const settings = JSON.parse(localStorage.getItem('notificationSettings')) || {};
    
    document.getElementById('notify-followup').checked = settings.followup !== false;
    document.getElementById('notify-interview').checked = settings.interview !== false;
    document.getElementById('notify-weekly').checked = settings.weekly || false;
    document.getElementById('notify-tips').checked = settings.tips || false;
    document.getElementById('notify-email').value = settings.email || (currentUser?.email || '');
}

function saveNotificationSettings(e) {
    e.preventDefault();
    
    const settings = {
        followup: document.getElementById('notify-followup').checked,
        interview: document.getElementById('notify-interview').checked,
        weekly: document.getElementById('notify-weekly').checked,
        tips: document.getElementById('notify-tips').checked,
        email: document.getElementById('notify-email').value
    };
    
    localStorage.setItem('notificationSettings', JSON.stringify(settings));
    closeNotificationModal();
    showToast('Notification settings saved!', 'success');
}

// 5. TOAST NOTIFICATIONS
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    
    toast.innerHTML = `
        <i class="fas fa-${icons[type] || 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// USAGE INDICATOR
function updateUsageIndicator() {
    const indicator = document.getElementById('usage-indicator');
    const fill = document.getElementById('usage-fill');
    const text = document.getElementById('usage-text');
    
    if (!indicator || !fill || !text) return;
    
    // Only show for free users
    if (currentUser && (currentUser.plan === 'professional' || currentUser.plan === 'enterprise')) {
        indicator.style.display = 'none';
        return;
    }
    
    if (currentUser) {
        indicator.style.display = 'flex';
        const used = applications.length;
        const limit = FREE_TIER_LIMIT;
        const percentage = Math.min((used / limit) * 100, 100);
        
        fill.style.width = `${percentage}%`;
        text.textContent = `${used}/${limit} applications used`;
        
        if (percentage >= 80) {
            fill.classList.add('warning');
        } else {
            fill.classList.remove('warning');
        }
    } else {
        indicator.style.display = 'none';
    }
}

// ENHANCED ANALYTICS FUNCTIONS
function calculateAdvancedAnalytics() {
    if (applications.length === 0) return null;
    
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    
    // Applications this month
    const thisMonth = applications.filter(app => {
        const appDate = new Date(app.dateApplied);
        return appDate >= thirtyDaysAgo;
    }).length;
    
    // Applications last month
    const sixtyDaysAgo = new Date(now - 60 * 24 * 60 * 60 * 1000);
    const lastMonth = applications.filter(app => {
        const appDate = new Date(app.dateApplied);
        return appDate >= sixtyDaysAgo && appDate < thirtyDaysAgo;
    }).length;
    
    // Trend calculation
    const trend = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth * 100).toFixed(0) : 0;
    
    // Average applications per week
    const oldestApp = applications.reduce((oldest, app) => {
        const appDate = new Date(app.dateApplied || now);
        return appDate < oldest ? appDate : oldest;
    }, now);
    
    const weeksTracking = Math.max(1, Math.ceil((now - oldestApp) / (7 * 24 * 60 * 60 * 1000)));
    const avgPerWeek = (applications.length / weeksTracking).toFixed(1);
    
    // Success metrics
    const interviews = applications.filter(a => a.stage === 'interview').length;
    const offers = applications.filter(a => a.stage === 'offer').length;
    const rejections = applications.filter(a => a.stage === 'rejected').length;
    const ghosted = applications.filter(a => a.stage === 'ghosted').length;
    
    const total = applications.length;
    const responseRate = total > 0 ? Math.round(((interviews + offers + rejections) / total) * 100) : 0;
    const interviewRate = total > 0 ? Math.round((interviews / total) * 100) : 0;
    const successRate = total > 0 ? Math.round((offers / total) * 100) : 0;
    
    return {
        thisMonth,
        lastMonth,
        trend,
        avgPerWeek,
        total,
        interviews,
        offers,
        rejections,
        ghosted,
        responseRate,
        interviewRate,
        successRate
    };
}

// Check for follow-up reminders
function checkFollowUpReminders() {
    const settings = JSON.parse(localStorage.getItem('notificationSettings')) || {};
    if (!settings.followup) return;
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const needsFollowUp = applications.filter(app => {
        if (app.stage !== 'applied') return false;
        const appDate = new Date(app.dateApplied);
        return appDate <= sevenDaysAgo;
    });
    
    if (needsFollowUp.length > 0) {
        showToast(`You have ${needsFollowUp.length} application(s) that might need follow-up!`, 'warning');
    }
}

// ==========================================
// MODERN UI FEATURES
// ==========================================

// 🎉 CONFETTI CELEBRATION
function createConfetti() {
    const container = document.getElementById('confetti-container');
    if (!container) return;
    
    // Professional, subtle colors (blues, greens, golds)
    const colors = ['#2563eb', '#3b82f6', '#059669', '#10b981', '#d97706', '#0ea5e9'];
    
    // Fewer particles for professional look
    for (let i = 0; i < 60; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.borderRadius = '2px';
            confetti.style.width = Math.random() * 6 + 4 + 'px';
            confetti.style.height = Math.random() * 6 + 4 + 'px';
            confetti.style.animationDuration = Math.random() * 2 + 2.5 + 's';
            container.appendChild(confetti);
            
            // Remove after animation
            setTimeout(() => confetti.remove(), 4500);
        }, i * 20);
    }
}

// Trigger confetti when status changes to offer
function celebrateOffer() {
    createConfetti();
    showToast('Congratulations! Offer received.', 'success');
}

// 💫 RIPPLE EFFECT ON BUTTONS
function createRipple(event) {
    const button = event.currentTarget;
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    
    button.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
}

// Add ripple to all buttons
function initRippleEffect() {
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', createRipple);
    });
}

// 📊 ANIMATED COUNTERS
function animateCounter(element, target, duration = 1000) {
    if (!element) return;
    
    const start = parseInt(element.textContent) || 0;
    const increment = (target - start) / (duration / 16);
    let current = start;
    
    element.classList.add('counting');
    
    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= target) || (increment < 0 && current <= target)) {
            current = target;
            clearInterval(timer);
            element.classList.remove('counting');
        }
        element.textContent = Math.round(current);
    }, 16);
}

function animateAllCounters() {
    const counters = {
        'total-applications': applications.length,
        'interviews': applications.filter(a => a.stage === 'interview').length,
        'offers': applications.filter(a => a.stage === 'offer').length,
        'rejections': applications.filter(a => a.stage === 'rejected').length,
        'ghosted': applications.filter(a => a.stage === 'ghosted').length
    };
    
    Object.entries(counters).forEach(([id, target]) => {
        const el = document.getElementById(id);
        if (el) animateCounter(el, target, 800);
    });
}

// 🔘 FLOATING ACTION BUTTON
function initFloatingActionButton() {
    // Check if FAB already exists
    if (document.getElementById('fab')) return;
    
    const fab = document.createElement('button');
    fab.id = 'fab';
    fab.className = 'fab glow-on-hover';
    fab.innerHTML = '<i class="fas fa-plus"></i>';
    fab.title = 'Add Application';
    fab.onclick = () => {
        if (checkApplicationLimit()) {
            openModal();
        }
    };
    document.body.appendChild(fab);
}

// 🦴 SKELETON LOADERS
function showSkeletonLoaders() {
    const stages = ['applied', 'interview', 'offer', 'rejected', 'ghosted'];
    stages.forEach(stage => {
        const container = document.getElementById(`${stage}-list`);
        if (container && container.children.length === 0) {
            for (let i = 0; i < 2; i++) {
                const skeleton = document.createElement('div');
                skeleton.className = 'skeleton skeleton-card';
                container.appendChild(skeleton);
            }
        }
    });
}

function removeSkeletonLoaders() {
    document.querySelectorAll('.skeleton').forEach(el => el.remove());
}

// ✨ STAGGER ANIMATIONS
function initStaggerAnimations() {
    const cards = document.querySelectorAll('.metric, .analytics-card, .pricing-card');
    cards.forEach((card, index) => {
        card.classList.add('animate-in', `stagger-${Math.min(index + 1, 5)}`);
    });
}

// 🎨 INTERSECTION OBSERVER FOR ANIMATIONS
function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    
    document.querySelectorAll('.application-card, .chart-container, .insight-card').forEach(el => {
        observer.observe(el);
    });
}

// 🔔 NOTIFICATION BADGE
function updateNotificationBadge(count) {
    let badge = document.getElementById('notification-badge');
    if (!badge && count > 0) {
        badge = document.createElement('span');
        badge.id = 'notification-badge';
        badge.className = 'notification-badge pulse';
        badge.style.cssText = 'position: absolute; top: -5px; right: -5px; background: #ef4444; color: white; font-size: 0.7rem; padding: 2px 6px; border-radius: 999px;';
        const navItem = document.getElementById('auth-menu-item');
        if (navItem) {
            navItem.style.position = 'relative';
            navItem.appendChild(badge);
        }
    }
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'block' : 'none';
    }
}

// 🎯 PROGRESS RING GENERATOR
function createProgressRing(percentage, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (percentage / 100) * circumference;
    
    container.innerHTML = `
        <svg width="120" height="120">
            <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#6366f1"/>
                    <stop offset="100%" style="stop-color:#ec4899"/>
                </linearGradient>
            </defs>
            <circle class="progress-ring-circle" cx="60" cy="60" r="45"/>
            <circle class="progress-ring-progress" cx="60" cy="60" r="45"
                stroke-dasharray="${circumference}" 
                stroke-dashoffset="${offset}"/>
        </svg>
        <div class="progress-ring-text">${percentage}%</div>
    `;
}

// 🌊 SMOOTH SCROLL
function initSmoothScroll() {
    document.documentElement.style.scrollBehavior = 'smooth';
}

// Override updateMetrics to use animated counters
const originalUpdateMetrics = typeof updateMetrics === 'function' ? updateMetrics : null;
function updateMetrics() {
    if (originalUpdateMetrics) {
        // Let original update the DOM first
    }
    setTimeout(animateAllCounters, 100);
}

// Initialize on load
document.addEventListener('DOMContentLoaded', async () => {
    checkAuthStatus();
    initDarkMode();
    
    // Show skeleton loaders while content loads
    showSkeletonLoaders();
    
    // Load applications from backend if authenticated
    if (authToken) {
        await loadApplicationsFromBackend();
    }
    
    setTimeout(() => {
        removeSkeletonLoaders();
        renderApplications();
        animateAllCounters();
        loadAnalytics();
        updateUsageIndicator();
        
        // Initialize modern features
        initRippleEffect();
        initFloatingActionButton();
        initStaggerAnimations();
        initScrollAnimations();
        initSmoothScroll();
        
        // Check for follow-up reminders
        setTimeout(checkFollowUpReminders, 2000);
    }, 500);
    
    // Add demo data button if no applications
    if (applications.length === 0) {
        setTimeout(() => {
            const demoBtn = document.createElement('button');
            demoBtn.textContent = 'Load Sample Data';
            demoBtn.className = 'btn secondary';
            demoBtn.onclick = () => {
                addDemoData();
                showToast('Sample data loaded successfully', 'success');
            };
            document.querySelector('.controls')?.appendChild(demoBtn);
        }, 600);
    }
    
    // Check for login/register params
    // Handle URL parameters for deep linking
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('login') === 'true') {
        setTimeout(() => {
            showLoginModal();
            // Clean up URL to remove query parameter
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
        }, 500);
    } else if (urlParams.get('register') === 'true') {
        setTimeout(() => {
            showLoginModal();
            showRegisterForm();
            // Clean up URL to remove query parameter
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
        }, 500);
    }

    // Re-init ripple effect when new buttons are added
    const observer = new MutationObserver(() => {
        document.querySelectorAll('.btn:not([data-ripple])').forEach(btn => {
            btn.setAttribute('data-ripple', 'true');
            btn.addEventListener('click', createRipple);
        });
    });
    observer.observe(document.body, { childList: true, subtree: true });
});

// ==========================================
// CHAT ASSISTANT
// ==========================================

let chatPanelOpen = false;
let pendingParsedJob = null; // Store parsed job for confirmation

// Toggle chat panel visibility
function toggleChatPanel() {
    const panel = document.getElementById('chat-panel');
    const toggleBtn = document.getElementById('chat-toggle-btn');
    
    chatPanelOpen = !chatPanelOpen;
    
    if (chatPanelOpen) {
        panel.classList.add('open');
        toggleBtn.classList.add('hidden');
        document.getElementById('chat-input').focus();
    } else {
        panel.classList.remove('open');
        toggleBtn.classList.remove('hidden');
    }
}

// Handle Enter key in chat input
function handleChatKeypress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendChatMessage();
    }
}

// Extract URLs from text
function extractUrls(text) {
    return text.match(/https?:\/\/[^\s)>\]]+/g) || [];
}

// Send a chat message
function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add user message to chat
    addChatMessage(message, 'user');
    input.value = '';
    
    // Process the message
    processChatMessage(message);
}

// Add a message to the chat
function addChatMessage(content, type, options = {}) {
    const messagesContainer = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${type}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = type === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    if (options.isError) {
        contentDiv.classList.add('message-error');
    }
    
    if (options.isHtml) {
        contentDiv.innerHTML = content;
    } else {
        const p = document.createElement('p');
        p.textContent = content;
        contentDiv.appendChild(p);
    }
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
    messagesContainer.appendChild(messageDiv);
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    return messageDiv;
}

// Show typing indicator
function showTypingIndicator() {
    const messagesContainer = document.getElementById('chat-messages');
    const typing = document.createElement('div');
    typing.className = 'chat-message assistant';
    typing.id = 'typing-indicator';
    typing.innerHTML = `
        <div class="message-avatar"><i class="fas fa-robot"></i></div>
        <div class="message-content">
            <div class="typing-indicator">
                <span></span><span></span><span></span>
            </div>
        </div>
    `;
    messagesContainer.appendChild(typing);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Hide typing indicator
function hideTypingIndicator() {
    const typing = document.getElementById('typing-indicator');
    if (typing) typing.remove();
}

// Process chat message
function processChatMessage(message) {
    const lowerMessage = message.toLowerCase().trim();
    
    // Handle commands
    if (lowerMessage === 'help') {
        showHelpMessage();
        return;
    }
    
    if (lowerMessage === 'status') {
        showStatusMessage();
        return;
    }
    
    // Check for URLs
    const urls = extractUrls(message);
    
    if (urls.length > 1) {
        addChatMessage('I found multiple URLs. Which one would you like me to parse?', 'assistant');
        urls.forEach((url, index) => {
            const domain = new URL(url).hostname.replace('www.', '');
            addChatMessage(`${index + 1}. ${domain}`, 'assistant', {
                isHtml: true,
                content: `<p><a href="#" onclick="parseJobUrl('${url}'); return false;">${index + 1}. ${domain}</a></p>`
            });
        });
        return;
    }
    
    if (urls.length === 1) {
        parseJobFromUrl(urls[0]);
        return;
    }
    
    // Check for "add" command with URL
    if (lowerMessage.startsWith('add ')) {
        const urlPart = message.substring(4).trim();
        const addUrls = extractUrls(urlPart);
        if (addUrls.length > 0) {
            parseJobFromUrl(addUrls[0]);
            return;
        }
    }
    
    // No URL found - provide help
    addChatMessage(
        "I didn't find a job URL in your message. Paste a job posting link (Greenhouse, Lever, Ashby, etc.) and I'll extract the details for you. Type 'help' for more options.",
        'assistant'
    );
}

// Show help message
function showHelpMessage() {
    const helpHtml = `
        <p><strong>📋 Commands:</strong></p>
        <p>• <strong>Paste a URL</strong> - Auto-parse job details</p>
        <p>• <strong>add [url]</strong> - Same as pasting a URL</p>
        <p>• <strong>status</strong> - See your application stats</p>
        <p>• <strong>help</strong> - Show this message</p>
        <p class="message-hint" style="margin-top: 12px;">Supported sites: Greenhouse, Lever, Ashby, Workday, and most company career pages</p>
    `;
    addChatMessage(helpHtml, 'assistant', { isHtml: true });
}

// Show status message
function showStatusMessage() {
    const total = applications.length;
    const interviews = applications.filter(a => a.stage?.toLowerCase() === 'interview').length;
    const offers = applications.filter(a => a.stage?.toLowerCase() === 'offer').length;
    const rejections = applications.filter(a => a.stage?.toLowerCase() === 'rejected').length;
    
    const statusHtml = `
        <p><strong>📊 Your Job Search Stats:</strong></p>
        <p>• Total Applications: <strong>${total}</strong></p>
        <p>• Interviews: <strong>${interviews}</strong></p>
        <p>• Offers: <strong>${offers}</strong></p>
        <p>• Rejections: <strong>${rejections}</strong></p>
        ${total > 0 ? `<p class="message-hint">Interview rate: ${Math.round((interviews / total) * 100)}%</p>` : ''}
    `;
    addChatMessage(statusHtml, 'assistant', { isHtml: true });
}

// Parse job from URL (calls Netlify function)
async function parseJobFromUrl(url) {
    showTypingIndicator();
    addChatMessage(`Parsing job post...`, 'assistant');
    
    try {
        const response = await fetch('/.netlify/functions/parse-job', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        
        hideTypingIndicator();
        
        if (!response.ok) {
            throw new Error('Failed to parse job posting');
        }
        
        const data = await response.json();
        
        if (data.error) {
            showParseError(url, data.error);
            return;
        }
        
        // Store parsed job for confirmation
        pendingParsedJob = {
            ...data,
            jobUrl: url,
            source: new URL(url).hostname.replace('www.', '')
        };
        
        // Show parsed job card
        showParsedJobCard(pendingParsedJob);
        
    } catch (error) {
        hideTypingIndicator();
        console.error('Parse error:', error);
        showParseError(url, error.message);
    }
}

// Show parse error
function showParseError(url, errorMessage) {
    const domain = new URL(url).hostname.replace('www.', '');
    const errorHtml = `
        <p>⚠️ Couldn't parse the job from <strong>${domain}</strong></p>
        <p class="message-hint">${errorMessage || 'The site may be blocking automated access.'}</p>
        <p style="margin-top: 8px;">Try copying the job details manually and using the <strong>Add Application</strong> button.</p>
    `;
    addChatMessage(errorHtml, 'assistant', { isHtml: true, isError: true });
}

// Show parsed job card with confirmation buttons
function showParsedJobCard(job) {
    const cardHtml = `
        <p>✅ Found this job:</p>
        <div class="parsed-job-card">
            <h4>${job.title || 'Unknown Position'}</h4>
            <div class="company">${job.company || 'Unknown Company'}</div>
            <div class="details">
                ${job.location ? `<span class="detail-tag"><i class="fas fa-map-marker-alt"></i> ${job.location}</span>` : ''}
                ${job.salary ? `<span class="detail-tag"><i class="fas fa-dollar-sign"></i> ${job.salary}</span>` : ''}
                <span class="detail-tag"><i class="fas fa-globe"></i> ${job.source}</span>
            </div>
            <div class="actions">
                <button class="btn primary" onclick="createApplicationFromChat()">
                    <i class="fas fa-plus"></i> Create Application
                </button>
                <button class="btn secondary" onclick="editBeforeSaving()">
                    <i class="fas fa-edit"></i> Edit First
                </button>
            </div>
        </div>
    `;
    addChatMessage(cardHtml, 'assistant', { isHtml: true });
}

// Create application from parsed job
function createApplicationFromChat() {
    if (!pendingParsedJob) {
        addChatMessage('No job to save. Please paste a new job URL.', 'assistant');
        return;
    }
    
    // Check free tier limit
    if (!currentUser?.plan || currentUser.plan === 'free') {
        if (applications.length >= FREE_TIER_LIMIT) {
            showUpgradeModal();
            addChatMessage('You\'ve reached the free tier limit. Upgrade to add more applications!', 'assistant');
            return;
        }
    }
    
    const application = {
        id: Date.now().toString(),
        company: pendingParsedJob.company || 'Unknown Company',
        role: pendingParsedJob.title || 'Unknown Position',
        location: pendingParsedJob.location || '',
        source: pendingParsedJob.source || '',
        stage: 'applied',
        notes: pendingParsedJob.description || '',
        salary: pendingParsedJob.salary || '',
        dateApplied: new Date().toISOString().split('T')[0],
        jobUrl: pendingParsedJob.jobUrl || ''
    };
    
    // Add to applications
    applications.push(application);
    localStorage.setItem('jobApplications', JSON.stringify(applications));
    
    // Sync to backend if authenticated
    if (authToken) {
        syncApplicationToBackend(application).catch(err => console.error('Backend sync failed:', err));
    }
    
    // Update UI
    renderApplications();
    updateMetrics();
    updateUsageIndicator();
    
    // Success message
    addChatMessage(
        `✅ Created application for <strong>${application.company}</strong> - <strong>${application.role}</strong>!`,
        'assistant',
        { isHtml: true }
    );
    
    // Clear pending job
    pendingParsedJob = null;
    
    // Show confetti for fun
    if (typeof createConfetti === 'function') {
        createConfetti();
    }
}

// Edit job before saving (opens modal with prefilled data)
function editBeforeSaving() {
    if (!pendingParsedJob) {
        addChatMessage('No job to edit. Please paste a new job URL.', 'assistant');
        return;
    }
    
    // Prefill the application modal
    document.getElementById('company').value = pendingParsedJob.company || '';
    document.getElementById('role').value = pendingParsedJob.title || '';
    document.getElementById('location').value = pendingParsedJob.location || '';
    document.getElementById('source').value = pendingParsedJob.source || '';
    document.getElementById('notes').value = pendingParsedJob.description || '';
    document.getElementById('stage').value = 'applied';
    
    // Open modal
    openModal('application-modal');
    
    // Clear pending job
    pendingParsedJob = null;
    
    addChatMessage('Opened the form with the job details. Make any changes and save!', 'assistant');
}
