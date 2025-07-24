/**
 * @jest-environment jsdom
 */

import { navigateTo } from '../modules/navigation.js';

// Mock DOM elements
const mockPages = {
  'dashboard-page': document.createElement('div'),
  'analytics-page': document.createElement('div'),
  'resume-builder-page': document.createElement('div'),
  'pricing-page': document.createElement('div')
};

const mockNavLinks = [
  { classList: { remove: jest.fn(), add: jest.fn() }, dataset: { page: 'dashboard' } },
  { classList: { remove: jest.fn(), add: jest.fn() }, dataset: { page: 'analytics' } },
  { classList: { remove: jest.fn(), add: jest.fn() }, dataset: { page: 'resume-builder' } },
  { classList: { remove: jest.fn(), add: jest.fn() }, dataset: { page: 'pricing' } }
];

// Mock querySelectorAll
document.querySelectorAll = jest.fn().mockImplementation((selector) => {
  if (selector === '.page-content') {
    return Object.values(mockPages);
  }
  if (selector === '.nav-link') {
    return mockNavLinks;
  }
  return [];
});

// Mock getElementById
document.getElementById = jest.fn().mockImplementation((id) => {
  return mockPages[id] || document.createElement('div');
});

// Mock load functions
global.loadAnalytics = jest.fn();
global.loadResumeBuilder = jest.fn();

describe('Navigation Module', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset mock element display styles
    Object.values(mockPages).forEach(page => {
      page.style.display = '';
    });
    
    // Reset mock nav link classes
    mockNavLinks.forEach(link => {
      link.classList.remove.mockClear();
      link.classList.add.mockClear();
    });
  });

  describe('navigateTo', () => {
    test('should display the correct page and hide others', () => {
      navigateTo('analytics');
      
      // Check that analytics page is displayed
      expect(mockPages['analytics-page'].style.display).toBe('block');
      
      // Check that other pages are hidden
      expect(mockPages['dashboard-page'].style.display).toBe('none');
      expect(mockPages['resume-builder-page'].style.display).toBe('none');
      expect(mockPages['pricing-page'].style.display).toBe('none');
    });

    test('should update active navigation link', () => {
      navigateTo('resume-builder');
      
      // Check that all links have remove called
      mockNavLinks.forEach(link => {
        expect(link.classList.remove).toHaveBeenCalledWith('active');
      });
      
      // Check that the correct link gets active class
      const activeLink = mockNavLinks.find(link => link.dataset.page === 'resume-builder');
      expect(activeLink.classList.add).toHaveBeenCalledWith('active');
    });

    test('should call loadAnalytics when navigating to analytics page', () => {
      navigateTo('analytics');
      
      expect(global.loadAnalytics).toHaveBeenCalled();
    });

    test('should call loadResumeBuilder when navigating to resume builder page', () => {
      navigateTo('resume-builder');
      
      expect(global.loadResumeBuilder).toHaveBeenCalled();
    });

    test('should handle navigation to unknown pages gracefully', () => {
      navigateTo('unknown-page');
      
      // All pages should be hidden
      Object.values(mockPages).forEach(page => {
        expect(page.style.display).toBe('none');
      });
    });
  });
});
