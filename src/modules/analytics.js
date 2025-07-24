// Analytics Module
import { applications } from '../app.js';

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

export { loadAnalytics, generateChart, getStageColor, loadResumeBuilder };
