// Analytics Dashboard JavaScript
let applications = JSON.parse(localStorage.getItem('jobApplications')) || [];
let charts = {};

// Initialize analytics
document.addEventListener('DOMContentLoaded', () => {
    if (applications.length === 0) {
        showEmptyState();
        return;
    }
    
    calculateMetrics();
    createCharts();
    generateInsights();
});

// Show empty state
function showEmptyState() {
    document.querySelector('.analytics-grid').innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
            <h3>No Analytics Available</h3>
            <p>Add some job applications to see detailed analytics and insights.</p>
            <a href="index.html" class="btn primary">Go to Tracker</a>
        </div>
    `;
}

// Calculate key metrics
function calculateMetrics() {
    const total = applications.length;
    const offers = applications.filter(a => a.stage === 'offer').length;
    const interviews = applications.filter(a => a.stage === 'interview').length;
    
    const successRate = total > 0 ? Math.round((offers / total) * 100) : 0;
    const interviewRate = total > 0 ? Math.round((interviews / total) * 100) : 0;
    
    // Calculate average time to offer
    let totalDays = 0;
    let offerCount = 0;
    
    applications.forEach(app => {
        if (app.stage === 'offer' && app.dateApplied) {
            const appliedDate = new Date(app.dateApplied);
            const offerDate = new Date(); // Simplified - in real app, use actual offer date
            const daysDiff = Math.round((offerDate - appliedDate) / (1000 * 60 * 60 * 24));
            totalDays += daysDiff;
            offerCount++;
        }
    });
    
    const avgTimeToOffer = offerCount > 0 ? Math.round(totalDays / offerCount) : 0;
    
    // Find most active month
    const monthCounts = {};
    applications.forEach(app => {
        const month = new Date(app.dateApplied).toLocaleString('default', { month: 'long', year: 'numeric' });
        monthCounts[month] = (monthCounts[month] || 0) + 1;
    });
    
    const mostActiveMonth = Object.entries(monthCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || '-';
    
    // Update display
    document.getElementById('success-rate').textContent = `${successRate}%`;
    document.getElementById('interview-rate').textContent = `${interviewRate}%`;
    document.getElementById('avg-time-to-offer').textContent = `${avgTimeToOffer} days`;
    document.getElementById('most-active-month').textContent = mostActiveMonth;
}

// Create all charts
function createCharts() {
    createTimelineChart();
    createStageChart();
    createCompanyChart();
    createSourceChart();
    createWeeklyChart();
    createSuccessTimelineChart();
}

// Application Timeline Chart
function createTimelineChart() {
    const ctx = document.getElementById('timeline-chart').getContext('2d');
    
    // Group applications by month
    const monthlyData = {};
    applications.forEach(app => {
        const month = new Date(app.dateApplied).toLocaleString('default', { month: 'short', year: '2-digit' });
        monthlyData[month] = (monthlyData[month] || 0) + 1;
    });
    
    const labels = Object.keys(monthlyData).sort();
    const data = labels.map(month => monthlyData[month]);
    
    charts.timeline = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Applications',
                data: data,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// Stage Distribution Pie Chart
function createStageChart() {
    const ctx = document.getElementById('stage-chart').getContext('2d');
    
    const stageCounts = {
        applied: 0,
        interview: 0,
        offer: 0,
        rejected: 0,
        ghosted: 0
    };
    
    applications.forEach(app => {
        stageCounts[app.stage]++;
    });
    
    charts.stage = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Applied', 'Interview', 'Offer', 'Rejected', 'Ghosted'],
            datasets: [{
                data: Object.values(stageCounts),
                backgroundColor: [
                    '#1976d2',
                    '#7b1fa2',
                    '#388e3c',
                    '#d32f2f',
                    '#f57c00'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// Top Companies Bar Chart
function createCompanyChart() {
    const ctx = document.getElementById('company-chart').getContext('2d');
    
    const companyCounts = {};
    applications.forEach(app => {
        companyCounts[app.company] = (companyCounts[app.company] || 0) + 1;
    });
    
    const topCompanies = Object.entries(companyCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);
    
    charts.company = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topCompanies.map(([company]) => company),
            datasets: [{
                label: 'Applications',
                data: topCompanies.map(([,count]) => count),
                backgroundColor: '#667eea'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// Application Sources Chart
function createSourceChart() {
    const ctx = document.getElementById('source-chart').getContext('2d');
    
    const sourceCounts = {};
    applications.forEach(app => {
        const source = app.source || 'Unknown';
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });
    
    const sources = Object.entries(sourceCounts)
        .sort(([,a], [,b]) => b - a);
    
    charts.source = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: sources.map(([source]) => source),
            datasets: [{
                data: sources.map(([,count]) => count),
                backgroundColor: [
                    '#667eea', '#764ba2', '#f093fb', '#f5576c',
                    '#4facfe', '#00f2fe', '#a8edea', '#fed6e3'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// Weekly Activity Chart
function createWeeklyChart() {
    const ctx = document.getElementById('weekly-chart').getContext('2d');
    
    const weeklyData = {};
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const day = date.toLocaleDateString('en-US', { weekday: 'short' });
        weeklyData[day] = 0;
    }
    
    applications.forEach(app => {
        const appDate = new Date(app.dateApplied);
        const dayDiff = Math.round((today - appDate) / (1000 * 60 * 60 * 24));
        
        if (dayDiff <= 6) {
            const day = appDate.toLocaleDateString('en-US', { weekday: 'short' });
            if (weeklyData.hasOwnProperty(day)) {
                weeklyData[day]++;
            }
        }
    });
    
    charts.weekly = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(weeklyData),
            datasets: [{
                label: 'Applications',
                data: Object.values(weeklyData),
                backgroundColor: '#667eea'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// Success Timeline Chart
function createSuccessTimelineChart() {
    const ctx = document.getElementById('success-timeline-chart').getContext('2d');
    
    const monthlySuccess = {};
    const monthlyApplications = {};
    
    applications.forEach(app => {
        const month = new Date(app.dateApplied).toLocaleString('default', { month: 'short', year: '2-digit' });
        
        monthlyApplications[month] = (monthlyApplications[month] || 0) + 1;
        
        if (app.stage === 'offer') {
            monthlySuccess[month] = (monthlySuccess[month] || 0) + 1;
        }
    });
    
    const labels = Object.keys(monthlyApplications).sort();
    const applicationsData = labels.map(month => monthlyApplications[month]);
    const successData = labels.map(month => monthlySuccess[month] || 0);
    
    charts.successTimeline = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Applications',
                    data: applicationsData,
                    backgroundColor: 'rgba(102, 126, 234, 0.6)'
                },
                {
                    label: 'Offers',
                    data: successData,
                    backgroundColor: '#388e3c'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// Generate detailed insights
function generateInsights() {
    const insights = [];
    
    // Basic metrics
    const total = applications.length;
    const offers = applications.filter(a => a.stage === 'offer').length;
    const interviews = applications.filter(a => a.stage === 'interview').length;
    const rejections = applications.filter(a => a.stage === 'rejected').length;
    const ghosted = applications.filter(a => a.stage === 'ghosted').length;
    
    // Success rate insight
    const successRate = total > 0 ? Math.round((offers / total) * 100) : 0;
    if (successRate > 20) {
        insights.push({
            type: 'positive',
            title: 'Excellent Success Rate',
            description: `Your ${successRate}% success rate is above average! Most job seekers see 2-5% success rates.`
        });
    } else if (successRate > 0) {
        insights.push({
            type: 'neutral',
            title: 'Success Rate Analysis',
            description: `Your ${successRate}% success rate is within normal range. Keep applying!`
        });
    }
    
    // Application volume insight
    if (total < 10) {
        insights.push({
            type: 'neutral',
            title: 'Application Volume',
            description: `You've applied to ${total} positions. Consider increasing applications to improve chances.`
        });
    } else {
        insights.push({
            type: 'positive',
            title: 'Good Application Volume',
            description: `You've applied to ${total} positions - this shows consistent effort!`
        });
    }
    
    // Stage distribution insight
    if (interviews > 0) {
        const interviewRate = Math.round((interviews / total) * 100);
        insights.push({
            type: interviewRate > 15 ? 'positive' : 'neutral',
            title: 'Interview Conversion',
            description: `${interviewRate}% of your applications resulted in interviews.`
        });
    }
    
    // Ghosting insight
    if (ghosted > 0) {
        const ghostRate = Math.round((ghosted / total) * 100);
        insights.push({
            type: ghostRate > 30 ? 'negative' : 'neutral',
            title: 'Ghosting Analysis',
            description: `${ghostRate}% of applications were ghosted. This is ${ghostRate > 30 ? 'high' : 'normal'} for the industry.`
        });
    }
    
    // Top companies insight
    const companyCounts = {};
    applications.forEach(app => {
        companyCounts[app.company] = (companyCounts[app.company] || 0) + 1;
    });
    
    const topCompany = Object.entries(companyCounts)
        .sort(([,a], [,b]) => b - a)[0];
    
    if (topCompany) {
        insights.push({
            type: 'neutral',
            title: 'Most Applied Company',
            description: `You've applied to ${topCompany[0]} ${topCompany[1]} time${topCompany[1] > 1 ? 's' : ''}.`
        });
    }
    
    // Display insights
    const insightsContainer = document.getElementById('insights-list');
    insightsContainer.innerHTML = insights.map(insight => `
        <div class="insight-item insight-${insight.type}">
            <h4>${insight.title}</h4>
            <p>${insight.description}</p>
        </div>
    `).join('');
}
