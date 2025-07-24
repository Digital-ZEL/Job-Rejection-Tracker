/**
 * @jest-environment jsdom
 */

import { parseJobUrl, handleSmartPaste, showSmartPasteModal, closeSmartPasteModal, processSmartPaste } from '../modules/smart-paste.js';

// Mock DOM elements
const mockElements = {
  'smart-paste-modal': document.createElement('div'),
  'smart-paste-url': document.createElement('input'),
  'company': document.createElement('input'),
  'role': document.createElement('input'),
  'location': document.createElement('input'),
  'source': document.createElement('input')
};

// Mock getElementById
document.getElementById = jest.fn().mockImplementation((id) => {
  return mockElements[id] || document.createElement('div');
});

// Mock openModal function
global.openModal = jest.fn();

describe('Smart Paste Module', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset mock element content
    Object.values(mockElements).forEach(element => {
      element.innerHTML = '';
      element.value = '';
      element.style.display = '';
    });
  });

  describe('parseJobUrl', () => {
    test('should parse LinkedIn URLs correctly', () => {
      const url = 'https://www.linkedin.com/jobs/view/software-engineer-at-google-12345';
      const result = parseJobUrl(url);
      
      expect(result.source).toBe('LinkedIn');
      expect(result.company).toBe('Software Engineer At Google');
    });

    test('should parse Indeed URLs correctly', () => {
      const url = 'https://www.indeed.com/viewjob?jk=12345';
      const result = parseJobUrl(url);
      
      expect(result.source).toBe('Indeed');
    });

    test('should parse Glassdoor URLs correctly', () => {
      const url = 'https://www.glassdoor.com/job-listing/software-engineer-google-JV_IC111.htm';
      const result = parseJobUrl(url);
      
      expect(result.source).toBe('Glassdoor');
    });

    test('should handle unknown URLs gracefully', () => {
      const url = 'https://www.unknownsite.com/jobs/12345';
      const result = parseJobUrl(url);
      
      expect(result.source).toBeUndefined();
    });
  });

  describe('showSmartPasteModal', () => {
    test('should display the smart paste modal', () => {
      mockElements['smart-paste-modal'].style.display = 'none';
      
      showSmartPasteModal();
      
      expect(mockElements['smart-paste-modal'].style.display).toBe('block');
    });
  });

  describe('closeSmartPasteModal', () => {
    test('should hide the smart paste modal', () => {
      mockElements['smart-paste-modal'].style.display = 'block';
      
      closeSmartPasteModal();
      
      expect(mockElements['smart-paste-modal'].style.display).toBe('none');
    });
  });

  describe('processSmartPaste', () => {
    test('should not process empty URL', () => {
      mockElements['smart-paste-url'].value = '';
      
      processSmartPaste();
      
      expect(global.openModal).not.toHaveBeenCalled();
    });

    test('should process valid URL and populate form fields', () => {
      mockElements['smart-paste-url'].value = 'https://www.linkedin.com/jobs/view/software-engineer-at-google-12345';
      
      processSmartPaste();
      
      expect(mockElements['company'].value).toBe('Software Engineer At Google');
      expect(global.openModal).toHaveBeenCalled();
    });
  });
});
