/**
 * @jest-environment jsdom
 */

import { renderApplications, createApplicationCard, updateMetrics, addDemoData } from '../modules/application-manager.js';

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
  'ghosted': document.createElement('div')
};

// Mock getElementById
document.getElementById = jest.fn().mockImplementation((id) => {
  return mockElements[id] || document.createElement('div');
});

describe('Application Manager', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset mock element content
    Object.values(mockElements).forEach(element => {
      element.innerHTML = '';
      element.textContent = '';
    });
  });

  describe('createApplicationCard', () => {
    test('should create a card with correct application data', () => {
      const app = {
        id: '1',
        company: 'Google',
        role: 'Software Engineer',
        location: 'Mountain View, CA',
        source: 'LinkedIn',
        stage: 'applied',
        notes: 'Applied through referral',
        dateApplied: new Date().toISOString()
      };

      const card = createApplicationCard(app);
      
      expect(card.className).toBe('application-card');
      expect(card.dataset.id).toBe('1');
      expect(card.innerHTML).toContain('Google');
      expect(card.innerHTML).toContain('Software Engineer');
      expect(card.innerHTML).toContain('Mountain View, CA');
      expect(card.innerHTML).toContain('LinkedIn');
      expect(card.innerHTML).toContain('applied');
      expect(card.innerHTML).toContain('Applied through referral');
    });

    test('should handle missing optional fields', () => {
      const app = {
        id: '2',
        company: 'Microsoft',
        role: 'Frontend Developer',
        stage: 'interview',
        dateApplied: new Date().toISOString()
      };

      const card = createApplicationCard(app);
      
      expect(card.innerHTML).toContain('Microsoft');
      expect(card.innerHTML).toContain('Frontend Developer');
      expect(card.innerHTML).toContain('interview');
      // Should not contain location or source when not provided
      expect(card.innerHTML).not.toContain('fa-map-marker-alt');
      expect(card.innerHTML).not.toContain('fa-link');
    });
  });

  describe('updateMetrics', () => {
    test('should update metrics display elements', () => {
      // Mock applications data
      global.applications = [
        { id: '1', stage: 'applied' },
        { id: '2', stage: 'interview' },
        { id: '3', stage: 'offer' },
        { id: '4', stage: 'rejected' },
        { id: '5', stage: 'ghosted' }
      ];

      updateMetrics();

      expect(mockElements['total-applications'].textContent).toBe('5');
      expect(mockElements['interviews'].textContent).toBe('1');
      expect(mockElements['offers'].textContent).toBe('1');
      expect(mockElements['rejections'].textContent).toBe('1');
      expect(mockElements['ghosted'].textContent).toBe('1');
    });

    test('should handle empty applications array', () => {
      global.applications = [];

      updateMetrics();

      expect(mockElements['total-applications'].textContent).toBe('0');
      expect(mockElements['interviews'].textContent).toBe('0');
      expect(mockElements['offers'].textContent).toBe('0');
      expect(mockElements['rejections'].textContent).toBe('0');
      expect(mockElements['ghosted'].textContent).toBe('0');
    });
  });

  describe('addDemoData', () => {
    test('should add demo applications to the global applications array', () => {
      global.applications = [];
      global.localStorage = localStorageMock;

      addDemoData();

      expect(global.applications).toHaveLength(3);
      expect(global.applications[0].company).toBe('Google');
      expect(global.applications[1].company).toBe('Microsoft');
      expect(global.applications[2].company).toBe('Amazon');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('jobApplications', expect.any(String));
    });
  });
});
