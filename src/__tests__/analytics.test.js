/**
 * @jest-environment jsdom
 */

import { loadAnalytics, getStageColor, loadResumeBuilder } from '../modules/analytics.js';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn()
};

global.localStorage = localStorageMock;

// Mock DOM elements
const mockElements = {
  'analytics-total': document.createElement('div'),
  'analytics-interviews': document.createElement('div'),
  'analytics-offers': document.createElement('div'),
  'analytics-rejections': document.createElement('div'),
  'analytics-ghosted': document.createElement('div'),
  'success-rate': document.createElement('div'),
  'resume-experience': document.createElement('div')
};

// Mock getElementById
document.getElementById = jest.fn().mockImplementation((id) => {
  return mockElements[id] || document.createElement('div');
});

// Mock canvas context
const mockContext = {
  clearRect: jest.fn(),
  fillRect: jest.fn(),
  fillText: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  stroke: jest.fn()
};

// Mock canvas element
const mockCanvas = document.createElement('canvas');
mockCanvas.getContext = jest.fn().mockReturnValue(mockContext);

describe('Analytics Module', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset mock element content
    Object.values(mockElements).forEach(element => {
      element.innerHTML = '';
      element.textContent = '';
    });
  });

  describe('getStageColor', () => {
    test('should return correct colors for each stage', () => {
      expect(getStageColor('applied')).toBe('#1976d2');
      expect(getStageColor('interview')).toBe('#7b1fa2');
      expect(getStageColor('offer')).toBe('#388e3c');
      expect(getStageColor('rejected')).toBe('#d32f2f');
      expect(getStageColor('ghosted')).toBe('#f57c00');
    });

    test('should return default color for unknown stages', () => {
      expect(getStageColor('unknown')).toBe('#666');
    });
  });

  describe('loadAnalytics', () => {
    test('should calculate and display correct metrics', () => {
      // Mock applications data
      global.applications = [
        { id: '1', stage: 'applied' },
        { id: '2', stage: 'interview' },
        { id: '3', stage: 'offer' },
        { id: '4', stage: 'rejected' },
        { id: '5', stage: 'ghosted' },
        { id: '6', stage: 'offer' }
      ];

      loadAnalytics();

      expect(mockElements['analytics-total'].textContent).toBe('6');
      expect(mockElements['analytics-interviews'].textContent).toBe('1');
      expect(mockElements['analytics-offers'].textContent).toBe('2');
      expect(mockElements['analytics-rejections'].textContent).toBe('1');
      expect(mockElements['analytics-ghosted'].textContent).toBe('1');
      expect(mockElements['success-rate'].textContent).toBe('33%');
    });

    test('should handle empty applications array', () => {
      global.applications = [];

      loadAnalytics();

      expect(mockElements['analytics-total'].textContent).toBe('0');
      expect(mockElements['analytics-interviews'].textContent).toBe('0');
      expect(mockElements['analytics-offers'].textContent).toBe('0');
      expect(mockElements['analytics-rejections'].textContent).toBe('0');
      expect(mockElements['analytics-ghosted'].textContent).toBe('0');
      expect(mockElements['success-rate'].textContent).toBe('0%');
    });
  });

  describe('loadResumeBuilder', () => {
    test('should populate resume experience with offer stage applications', () => {
      global.applications = [
        { id: '1', company: 'Google', role: 'Software Engineer', location: 'Mountain View, CA', stage: 'applied' },
        { id: '2', company: 'Microsoft', role: 'Frontend Developer', location: 'Seattle, WA', stage: 'offer' },
        { id: '3', company: 'Amazon', role: 'Backend Engineer', location: 'Austin, TX', stage: 'rejected' },
        { id: '4', company: 'Apple', role: 'iOS Developer', location: 'Cupertino, CA', stage: 'offer' }
      ];

      loadResumeBuilder();

      expect(mockElements['resume-experience'].innerHTML).toContain('Microsoft');
      expect(mockElements['resume-experience'].innerHTML).toContain('Frontend Developer');
      expect(mockElements['resume-experience'].innerHTML).toContain('Apple');
      expect(mockElements['resume-experience'].innerHTML).toContain('iOS Developer');
      // Should not contain rejected or applied applications
      expect(mockElements['resume-experience'].innerHTML).not.toContain('Google');
      expect(mockElements['resume-experience'].innerHTML).not.toContain('Amazon');
    });

    test('should handle no offer stage applications', () => {
      global.applications = [
        { id: '1', company: 'Google', role: 'Software Engineer', location: 'Mountain View, CA', stage: 'applied' },
        { id: '2', company: 'Amazon', role: 'Backend Engineer', location: 'Austin, TX', stage: 'rejected' }
      ];

      loadResumeBuilder();

      expect(mockElements['resume-experience'].innerHTML).not.toContain('Google');
      expect(mockElements['resume-experience'].innerHTML).not.toContain('Amazon');
    });
  });
});
