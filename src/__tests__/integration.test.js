/**
 * @jest-environment jsdom
 */

import { applications } from '../app.js';
import { renderApplications, updateMetrics } from '../modules/application-manager.js';
import { loadAnalytics } from '../modules/analytics.js';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn()
};

global.localStorage = localStorageMock;

// Mock DOM elements
const mockElements = {
  'applied-list': document.createElement('div'),
  'interview-list': document.createElement('div'),
  'offer-list': document.createElement('div'),
  'rejected-list': document.createElement('div'),
  'ghosted-list': document.createElement('div'),
  'total-applications': document.createElement('div'),
  'interviews': document.createElement('div'),
  'offers': document.createElement('div'),
  'rejections': document.createElement('div'),
  'ghosted': document.createElement('div'),
  'analytics-total': document.createElement('div'),
  'analytics-interviews': document.createElement('div'),
  'analytics-offers': document.createElement('div'),
  'analytics-rejections': document.createElement('div'),
  'analytics-ghosted': document.createElement('div'),
  'success-rate': document.createElement('div')
};

// Mock getElementById
document.getElementById = jest.fn().mockImplementation((id) => {
  return mockElements[id] || document.createElement('div');
});

describe('Integration Tests', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset mock element content
    Object.values(mockElements).forEach(element => {
      element.innerHTML = '';
      element.textContent = '';
    });
    
    // Reset applications array
    while (applications.length > 0) {
      applications.pop();
    }
  });

  test('should handle full application lifecycle', () => {
    // Add some test applications
    applications.push(
      { id: '1', company: 'Google', role: 'Software Engineer', stage: 'applied' },
      { id: '2', company: 'Microsoft', role: 'Frontend Developer', stage: 'interview' },
      { id: '3', company: 'Amazon', role: 'Backend Engineer', stage: 'offer' },
      { id: '4', company: 'Facebook', role: 'Full Stack Developer', stage: 'rejected' },
      { id: '5', company: 'Apple', role: 'iOS Developer', stage: 'ghosted' }
    );

    // Test rendering
    renderApplications();
    
    // Verify lists are populated
    expect(mockElements['applied-list'].innerHTML).toContain('Google');
    expect(mockElements['interview-list'].innerHTML).toContain('Microsoft');
    expect(mockElements['offer-list'].innerHTML).toContain('Amazon');
    expect(mockElements['rejected-list'].innerHTML).toContain('Facebook');
    expect(mockElements['ghosted-list'].innerHTML).toContain('Apple');

    // Test metrics update
    updateMetrics();
    
    expect(mockElements['total-applications'].textContent).toBe('5');
    expect(mockElements['interviews'].textContent).toBe('1');
    expect(mockElements['offers'].textContent).toBe('1');
    expect(mockElements['rejections'].textContent).toBe('1');
    expect(mockElements['ghosted'].textContent).toBe('1');

    // Test analytics
    loadAnalytics();
    
    expect(mockElements['analytics-total'].textContent).toBe('5');
    expect(mockElements['analytics-interviews'].textContent).toBe('1');
    expect(mockElements['analytics-offers'].textContent).toBe('1');
    expect(mockElements['analytics-rejections'].textContent).toBe('1');
    expect(mockElements['analytics-ghosted'].textContent).toBe('1');
    expect(mockElements['success-rate'].textContent).toBe('20%');
  });

  test('should handle empty state', () => {
    // Test with empty applications
    renderApplications();
    
    // Verify empty state messages
    expect(mockElements['applied-list'].innerHTML).toContain('No applications yet');
    expect(mockElements['interview-list'].innerHTML).toContain('No applications yet');
    expect(mockElements['offer-list'].innerHTML).toContain('No applications yet');
    expect(mockElements['rejected-list'].innerHTML).toContain('No applications yet');
    expect(mockElements['ghosted-list'].innerHTML).toContain('No applications yet');

    // Test metrics with empty applications
    updateMetrics();
    
    expect(mockElements['total-applications'].textContent).toBe('0');
    expect(mockElements['interviews'].textContent).toBe('0');
    expect(mockElements['offers'].textContent).toBe('0');
    expect(mockElements['rejections'].textContent).toBe('0');
    expect(mockElements['ghosted'].textContent).toBe('0');

    // Test analytics with empty applications
    loadAnalytics();
    
    expect(mockElements['analytics-total'].textContent).toBe('0');
    expect(mockElements['analytics-interviews'].textContent).toBe('0');
    expect(mockElements['analytics-offers'].textContent).toBe('0');
    expect(mockElements['analytics-rejections'].textContent).toBe('0');
    expect(mockElements['analytics-ghosted'].textContent).toBe('0');
    expect(mockElements['success-rate'].textContent).toBe('0%');
  });
});
