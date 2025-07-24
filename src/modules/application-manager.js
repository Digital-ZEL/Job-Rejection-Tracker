// Application Management Module
import { applications, renderApplications, updateMetrics, loadAnalytics } from '../app.js';

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

export {
    renderApplications,
    createApplicationCard,
    handleSubmit,
    updateMetrics,
    openModal,
    closeModal,
    handleDragStart,
    handleDragOver,
    handleDrop,
    addDemoData
};
