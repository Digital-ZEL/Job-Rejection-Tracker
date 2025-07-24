// Export Module
import { applications } from '../app.js';

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

export { exportData };
