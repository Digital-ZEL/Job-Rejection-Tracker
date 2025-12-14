// Analytics Module
// Get applications from localStorage
function getApplications() {
    return JSON.parse(localStorage.getItem('jobApplications')) || [];
}

// Analytics Dashboard with comprehensive job rejection metrics
function loadAnalytics() {
    const applications = getApplications();
    
    if (!applications || applications.length === 0) {
        showEmptyState();
        return;
    }

    const total = applications.length;
    const interviews = applications.filter(a => a.stage === 'interview').length;
    const offers = applications.filter(a => a.stage === 'offer').length;
    const rejections = applications.filter(a => a.stage === 'rejected').length;
    const ghosted = applications.filter(a => a.stage === 'ghosted').length;
    const applied = applications.filter(a => a.stage === 'applied').length;
    
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
    const applications = getApplications();
    const ctx = document.getElementById('applications-chart');
    if (!ctx) return;
    
    const canvas = ctx;
    const ctx2d = canvas.getContext('2d');
    const stages = ['applied', 'interview', 'offer', 'rejected', 'ghosted'];
    const counts = stages.map(stage => applications.filter(a => a.stage === stage).length);
    
    // Clear canvas
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
            
            // Draw label
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
    const applications = getApplications();
    const ctx = document.getElementById('timeline-chart');
    if (!ctx) return;
    
    // Group applications by month
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
    
    // Find most active month
    const mostActive = months.reduce((a, b) => monthlyData[a] > monthlyData[b] ? a : b);
    const mostActiveDate = new Date(mostActive + '-01');
    const monthName = mostActiveDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    updateElement('most-active-month', monthName);
}

function generateSourceChart() {
    const applications = getApplications();
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
        
        // Rotate text for better readability
        ctx2d.save();
        ctx2d.translate(x + barWidth/2, canvas.height - 5);
        ctx2d.rotate(-Math.PI / 4);
        ctx2d.fillText(source.substring(0, 8), 0, 0);
        ctx2d.restore();
    });
}

function generateTopCompanies() {
    const applications = getApplications();
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
    
    // Success rate insight
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
    
    // Interview rate insight
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
    
    // Ghosted applications insight
    if (ghosted > total * 0.5) {
        insights.push({
            icon: 'clock',
            color: '#f57c00',
            title: 'High No-Response Rate',
            message: `${Math.round((ghosted/total)*100)}% of applications haven't received responses. Consider following up.`
        });
    }
    
    // Volume insight
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
    
    // Rejection pattern insight
    if (rejections > 0 && rejections / total > 0.3) {
        insights.push({
            icon: 'redo',
            color: '#d32f2f',
            title: 'Learning from Rejections',
            message: `You've received ${rejections} rejection${rejections !== 1 ? 's' : ''}. Each one is a learning opportunity.`
        });
    }
    
    // Default insight if no specific insights
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
    const applications = getApplications();
    // Calculate average response time
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
    const applications = getApplications();
    // Initialize resume builder with current applications
    const resumeData = {
        experience: applications.filter(a => a.stage === 'offer').map(a => ({
            company: a.company,
            role: a.role,
            location: a.location
        }))
    };
    
    // Populate resume template
    const resumeExp = document.getElementById('resume-experience');
    if (resumeExp) {
        resumeExp.innerHTML = resumeData.experience.map(exp => `
            <div class="resume-item">
                <h4>${exp.role}</h4>
                <p><strong>${exp.company}</strong> - ${exp.location}</p>
            </div>
        `).join('');
    }
}

export { loadAnalytics, generateStageChart, getStageColor, loadResumeBuilder };
