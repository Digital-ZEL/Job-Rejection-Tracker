// Application state
let applications = JSON.parse(localStorage.getItem('jobApplications')) || [];
let editingId = null;

// DOM elements
const modal = document.getElementById('application-modal');
const form = document.getElementById('application-form');
const addBtn = document.getElementById('add-application-btn');
const exportBtn = document.getElementById('export-data-btn');
const closeBtn = document.querySelector('.close');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    renderApplications();
    updateMetrics();
});

// Event listeners
addBtn.addEventListener('click', openModal);
closeBtn.addEventListener('click', closeModal);
exportBtn.addEventListener('click', exportData);
form.addEventListener('submit', handleSubmit);

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
    
    const formData = new FormData(form);
    const application = {
        id: editingId || Date.now().toString(),
        company: formData.get('company') || document.getElementById('company').value,
        role: formData.get('role') || document.getElementById('role').value,
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

    saveApplications();
    renderApplications();
    updateMetrics();
    closeModal();
}

// Save to localStorage
function saveApplications() {
    localStorage.setItem('jobApplications', JSON.stringify(applications));
}

// Render applications
function renderApplications() {
    const stages = ['applied', 'interview', 'offer', 'rejected', 'ghosted'];
    
    stages.forEach(stage => {
        const container = document.getElementById(`${stage}-list`);
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

// Create application card
function createApplicationCard(app) {
    const card = document.createElement('div');
    card.className = 'application-card';
    card.draggable = true;
    card.dataset.id = app.id;
    
    card.innerHTML = `
        <h4>${app.company}</h4>
        <p>${app.role}</p>
        ${app.location ? `<p><small><i class="fas fa-map-marker-alt"></i> ${app.location}</small></p>` : ''}
        ${app.source ? `<p><small><i class="fas fa-link"></i> ${app.source}</small></p>` : ''}
        <span class="stage ${app.stage}">${app.stage}</span>
        ${app.notes ? `<p><small>${app.notes}</small></p>` : ''}
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

// Drag and drop functionality
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
    const targetId = targetCard.dataset.id;
    
    if (draggedId !== targetId) {
        const draggedApp = applications.find(a => a.id === draggedId);
        const targetStage = targetCard.closest('.board-column').dataset.stage;
        
        if (draggedApp && draggedApp.stage !== targetStage) {
            draggedApp.stage = targetStage;
            saveApplications();
            renderApplications();
            updateMetrics();
        }
    }
    
    draggedElement.style.opacity = '';
    draggedElement = null;
}

// Edit and delete functions
function editApplication(id) {
    openModal(id);
}

function deleteApplication(id) {
    if (confirm('Are you sure you want to delete this application?')) {
        applications = applications.filter(a => a.id !== id);
        saveApplications();
        renderApplications();
        updateMetrics();
    }
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

// Export data
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

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeModal();
    }
});

// Add some demo data
function addDemoData() {
    const demoApps = [
        {
            id: 'demo1',
            company: 'Google',
            role: 'Software Engineer',
            location: 'Mountain View, CA',
            source: 'LinkedIn',
            stage: 'applied',
            notes: 'Applied through referral'
        },
        {
            id: 'demo2',
            company: 'Microsoft',
            role: 'Frontend Developer',
            location: 'Seattle, WA',
            source: 'Company website',
            stage: 'interview',
            notes: 'Phone screen scheduled'
        },
        {
            id: 'demo3',
            company: 'Amazon',
            role: 'Backend Engineer',
            location: 'Austin, TX',
            source: 'Indeed',
            stage: 'rejected',
            notes: 'Not a good fit for the team'
        }
    ];
    
    applications = [...applications, ...demoApps];
    saveApplications();
    renderApplications();
    updateMetrics();
}

// Add demo data button for testing
if (applications.length === 0) {
    const demoBtn = document.createElement('button');
    demoBtn.textContent = 'Load Demo Data';
    demoBtn.className = 'btn secondary';
    demoBtn.onclick = addDemoData;
    document.querySelector('.controls').appendChild(demoBtn);
}
