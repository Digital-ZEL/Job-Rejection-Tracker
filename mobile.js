// Mobile-First JavaScript with Touch Gestures
class MobileTracker {
  constructor() {
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchEndX = 0;
    this.touchEndY = 0;
    this.isDragging = false;
    this.draggedElement = null;
    this.longPressTimer = null;
    this.refreshThreshold = 100;
    
    this.init();
  }

  init() {
    this.setupTouchEvents();
    this.setupPullToRefresh();
    this.setupKeyboardShortcuts();
    this.setupGestureHints();
    this.setupOfflineSupport();
  }

  // Touch gesture handling
  setupTouchEvents() {
    document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    
    // Long press for context menu
    document.addEventListener('contextmenu', (e) => {
      if (e.target.closest('.application-card')) {
        e.preventDefault();
        this.showContextMenu(e);
      }
    });
  }

  handleTouchStart(e) {
    const card = e.target.closest('.application-card');
    if (!card) return;

    this.touchStartX = e.touches[0].clientX;
    this.touchStartY = e.touches[0].clientY;
    this.draggedElement = card;
    
    // Long press detection
    this.longPressTimer = setTimeout(() => {
      this.showContextMenu(e);
    }, 500);
  }

  handleTouchMove(e) {
    if (!this.draggedElement) return;

    this.touchEndX = e.touches[0].clientX;
    this.touchEndY = e.touches[0].clientY;
    
    const deltaX = this.touchEndX - this.touchStartX;
    const deltaY = this.touchEndY - this.touchStartY;
    
    // Cancel long press on movement
    clearTimeout(this.longPressTimer);
    
    // Horizontal swipe detection
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      this.handleSwipe(deltaX);
    }
  }

  handleTouchEnd(e) {
    clearTimeout(this.longPressTimer);
    
    if (this.draggedElement) {
      this.draggedElement.style.transform = '';
      this.draggedElement.style.transition = '';
      this.draggedElement = null;
    }
  }

  handleSwipe(deltaX) {
    const card = this.draggedElement;
    if (!card) return;

    const appId = card.dataset.id;
    const direction = deltaX > 0 ? 'right' : 'left';
    
    // Show swipe indicator
    this.showSwipeIndicator(card, direction);
    
    setTimeout(() => {
      if (direction === 'right') {
        this.markAsFavorite(appId);
      } else {
        this.deleteApplication(appId);
      }
    }, 300);
  }

  showSwipeIndicator(card, direction) {
    const indicator = document.createElement('div');
    indicator.className = `swipe-indicator swipe-${direction}`;
    indicator.innerHTML = direction === 'right' 
      ? '<i class="fas fa-star"></i> Favorite' 
      : '<i class="fas fa-trash"></i> Delete';
    
    card.appendChild(indicator);
    setTimeout(() => indicator.remove(), 500);
  }

  // Pull-to-refresh functionality
  setupPullToRefresh() {
    let startY = 0;
    let isRefreshing = false;

    document.addEventListener('touchstart', (e) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
      }
    });

    document.addEventListener('touchmove', (e) => {
      if (window.scrollY === 0 && !isRefreshing) {
        const currentY = e.touches[0].clientY;
        const pullDistance = currentY - startY;
        
        if (pullDistance > 50) {
          this.showRefreshIndicator();
        }
      }
    });

    document.addEventListener('touchend', (e) => {
      if (window.scrollY === 0 && !isRefreshing) {
        const currentY = e.changedTouches[0].clientY;
        const pullDistance = currentY - startY;
        
        if (pullDistance > 100) {
          this.refreshData();
        }
      }
    });
  }

  showRefreshIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'refresh-indicator';
    indicator.innerHTML = '<i class="fas fa-sync-alt"></i> Release to refresh';
    document.body.appendChild(indicator);
    
    setTimeout(() => indicator.remove(), 2000);
  }

  refreshData() {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = '<div class="loading-spinner"></div>';
    document.body.appendChild(overlay);
    
    setTimeout(() => {
      location.reload();
    }, 1000);
  }

  // Context menu for mobile
  showContextMenu(e) {
    const card = e.target.closest('.application-card');
    if (!card) return;

    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.innerHTML = `
      <div class="context-item" data-action="edit">
        <i class="fas fa-edit"></i> Edit
      </div>
      <div class="context-item" data-action="delete">
        <i class="fas fa-trash"></i> Delete
      </div>
      <div class="context-item" data-action="favorite">
        <i class="fas fa-star"></i> Favorite
      </div>
    `;
    
    menu.style.cssText = `
      position: fixed;
      top: ${e.clientY}px;
      left: ${e.clientX}px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 1001;
      min-width: 120px;
    `;
    
    document.body.appendChild(menu);
    
    // Handle context menu actions
    menu.addEventListener('click', (e) => {
      const action = e.target.closest('.context-item')?.dataset.action;
      const appId = card.dataset.id;
      
      switch(action) {
        case 'edit':
          editApplication(appId);
          break;
        case 'delete':
          deleteApplication(appId);
          break;
        case 'favorite':
          this.markAsFavorite(appId);
          break;
      }
      
      menu.remove();
    });
    
    // Close menu on outside click
    setTimeout(() => {
      document.addEventListener('click', () => menu.remove(), { once: true });
    }, 100);
  }

  // Keyboard shortcuts
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
          case 'n':
            e.preventDefault();
            openModal();
            break;
          case 'e':
            e.preventDefault();
            exportData();
            break;
          case 'a':
            e.preventDefault();
            window.location.href = 'analytics.html';
            break;
        }
      }
    });
  }

  // Gesture hints for new users
  setupGestureHints() {
    if (localStorage.getItem('gestureHintsShown')) return;
    
    setTimeout(() => {
      const hint = document.createElement('div');
      hint.className = 'gesture-hint';
      hint.innerHTML = '💡 Swipe left to delete, right to favorite';
      document.body.appendChild(hint);
      
      setTimeout(() => hint.remove(), 5000);
      localStorage.setItem('gestureHintsShown', 'true');
    }, 2000);
  }

  // Offline support
  setupOfflineSupport() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(console.error);
    }
    
    // Show offline indicator
    window.addEventListener('online', () => {
      this.showConnectionStatus('online');
    });
    
    window.addEventListener('offline', () => {
      this.showConnectionStatus('offline');
    });
  }

  showConnectionStatus(status) {
    const indicator = document.createElement('div');
    indicator.className = 'connection-indicator';
    indicator.innerHTML = status === 'online' 
      ? '<i class="fas fa-wifi"></i> Back online' 
      : '<i class="fas fa-wifi-slash"></i> Offline mode';
    
    indicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${status === 'online' ? '#4caf50' : '#ff9800'};
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.875rem;
      z-index: 1000;
    `;
    
    document.body.appendChild(indicator);
    setTimeout(() => indicator.remove(), 3000);
  }

  // Touch feedback
  showTouchFeedback(x, y) {
    const feedback = document.createElement('div');
    feedback.className = 'touch-feedback';
    feedback.style.left = `${x - 20}px`;
    feedback.style.top = `${y - 20}px`;
    document.body.appendChild(feedback);
    
    setTimeout(() => feedback.remove(), 600);
  }

  // Enhanced mobile utilities
  markAsFavorite(appId) {
    const applications = JSON.parse(localStorage.getItem('jobApplications')) || [];
    const app = applications.find(a => a.id === appId);
    if (app) {
      app.favorite = !app.favorite;
      localStorage.setItem('jobApplications', JSON.stringify(applications));
      renderApplications();
    }
  }

  // Smooth scrolling
  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Haptic feedback
  vibrate(pattern = [50]) {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }
}

// Initialize mobile features
document.addEventListener('DOMContentLoaded', () => {
  new MobileTracker();
});

// Enhanced touch events for application cards
document.addEventListener('DOMContentLoaded', () => {
  // Add touch feedback to buttons
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('touchstart', (e) => {
      e.target.style.transform = 'scale(0.95)';
    });
    
    btn.addEventListener('touchend', (e) => {
      e.target.style.transform = '';
    });
  });

  // Add swipe-to-delete functionality
  document.addEventListener('DOMContentLoaded', () => {
    const mobileTracker = new MobileTracker();
  });
});

// Service Worker for offline support
const swCode = `
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('job-tracker-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/styles.css',
        '/mobile.css',
        '/app.js',
        '/mobile.js'
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
`;

// Create service worker file
const blob = new Blob([swCode], { type: 'application/javascript' });
const swUrl = URL.createObjectURL(blob);

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register(swUrl);
}
