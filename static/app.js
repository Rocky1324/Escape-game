const CONFIG = {
    animations: {
        duration: 300,
        easing: 'ease-in-out'
    },
    quiz: {
        autoAdvanceDelay: 2000,
        shakeDuration: 600,
        feedbackDisplayTime: 3000
    },
    sounds: {
        enabled: true,
        volume: 0.3
    },
    localStorage: {
        prefix: 'escapeGame_',
        keys: {
            settings: 'settings',
            progress: 'progress',
            achievements: 'achievements'
        }
    }
};

const Utils = {
    // Generate unique IDs
    generateId: () => Math.random().toString(36).substr(2, 9),
    
    // Debounce function for performance
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // Throttle function for scroll events
    throttle: (func, limit) => {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    // Local storage helpers
    storage: {
        set: (key, value) => {
            try {
                localStorage.setItem(CONFIG.localStorage.prefix + key, JSON.stringify(value));
            } catch (e) {
                console.warn('LocalStorage not available:', e);
            }
        },
        
        get: (key, defaultValue = null) => {
            try {
                const item = localStorage.getItem(CONFIG.localStorage.prefix + key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (e) {
                console.warn('LocalStorage not available:', e);
                return defaultValue;
            }
        },
        
        remove: (key) => {
            try {
                localStorage.removeItem(CONFIG.localStorage.prefix + key);
            } catch (e) {
                console.warn('LocalStorage not available:', e);
            }
        }
    },
    
    // Format time
    formatTime: (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    },
    
    // Show notification
    showNotification: (message, type = 'info', duration = 3000) => {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${NotificationManager.getIcon(type)}</span>
                <span class="notification-message">${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove
        setTimeout(() => {
            notification.remove();
        }, duration);
        
        // Manual close
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
    }
};

// ========================================
// ANIMATION MANAGER
// ========================================

const AnimationManager = {
    // Fade in animation
    fadeIn: (element, duration = CONFIG.animations.duration) => {
        element.style.opacity = '0';
        element.style.display = 'block';
        
        const start = performance.now();
        
        function animate(currentTime) {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            
            element.style.opacity = progress;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        }
        
        requestAnimationFrame(animate);
    },
    
    // Fade out animation
    fadeOut: (element, duration = CONFIG.animations.duration) => {
        const start = performance.now();
        const startOpacity = parseFloat(getComputedStyle(element).opacity);
        
        function animate(currentTime) {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            
            element.style.opacity = startOpacity * (1 - progress);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.style.display = 'none';
            }
        }
        
        requestAnimationFrame(animate);
    },
    
    // Slide in from left
    slideInLeft: (element, duration = CONFIG.animations.duration) => {
        element.style.transform = 'translateX(-100%)';
        element.style.opacity = '0';
        element.style.display = 'block';
        
        const start = performance.now();
        
        function animate(currentTime) {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
            
            element.style.transform = `translateX(${-100 * (1 - easeProgress)}%)`;
            element.style.opacity = easeProgress;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        }
        
        requestAnimationFrame(animate);
    },
    
    // Shake animation
    shake: (element, duration = CONFIG.quiz.shakeDuration) => {
        const start = performance.now();
        const originalTransform = element.style.transform;
        
        function animate(currentTime) {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            
            if (progress < 1) {
                const shake = Math.sin(progress * Math.PI * 10) * (1 - progress) * 10;
                element.style.transform = `${originalTransform} translateX(${shake}px)`;
                requestAnimationFrame(animate);
            } else {
                element.style.transform = originalTransform;
            }
        }
        
        requestAnimationFrame(animate);
    },
    
    // Pulse animation
    pulse: (element, duration = 1000) => {
        const start = performance.now();
        const originalTransform = element.style.transform;
        
        function animate(currentTime) {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            const pulse = 1 + Math.sin(progress * Math.PI * 4) * 0.1;
            
            element.style.transform = `${originalTransform} scale(${pulse})`;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        }
        
        requestAnimationFrame(animate);
    }
};

// ========================================
// NOTIFICATION MANAGER
// ========================================

const NotificationManager = {
    getIcon: (type) => {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    },
    
    show: (message, type = 'info', duration = 3000) => {
        Utils.showNotification(message, type, duration);
    }
};

// ========================================
// QUIZ MANAGER
// ========================================

const QuizManager = {
    currentQuestion: null,
    timeRemaining: 0,
    timer: null,
    isAnswered: false,
    
    init: () => {
        QuizManager.setupEventListeners();
        QuizManager.initializeTimer();
        QuizManager.enhanceQuizInterface();
    },
    
    setupEventListeners: () => {
        // Radio button selection
        document.querySelectorAll('input[name="reponse"]').forEach(radio => {
            radio.addEventListener('change', QuizManager.onAnswerSelect);
        });
        
        // Form submission
        const form = document.querySelector('form');
        if (form) {
            form.addEventListener('submit', QuizManager.onFormSubmit);
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', QuizManager.handleKeyboard);
    },
    
    onAnswerSelect: (event) => {
        const selectedOption = event.target.closest('label');
        if (selectedOption) {
            // Remove previous selection styling
            document.querySelectorAll('.option.selected').forEach(option => {
                option.classList.remove('selected');
            });
            
            // Add selection styling
            selectedOption.classList.add('selected');
            
            // Enable submit button
            const submitBtn = document.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.classList.add('pulse');
                AnimationManager.pulse(submitBtn, 1000);
            }
        }
    },
    
    onFormSubmit: (event) => {
        if (QuizManager.isAnswered) {
            return;
        }
        
        QuizManager.isAnswered = true;
        
        // Disable form elements
        document.querySelectorAll('input[name="reponse"]').forEach(radio => {
            radio.disabled = false;
        });
        // Add loading state
        const submitBtn = document.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '<span class="spinner"></span> Validation...';
            submitBtn.disabled = false;
        }

        QuizManager.isAnswered = true;
    },
    
    handleKeyboard: (event) => {
        // Number keys for answer selection (1-4)
        if (event.key >= '1' && event.key <= '4') {
            const optionIndex = parseInt(event.key) - 1;
            const options = document.querySelectorAll('input[name="reponse"]');
            if (options[optionIndex]) {
                options[optionIndex].checked = true;
                options[optionIndex].dispatchEvent(new Event('change'));
            }
        }
        
        // Enter to submit
        if (event.key === 'Enter') {
            const form = document.querySelector('form');
            if (form && !QuizManager.isAnswered) {
                form.submit();
            }
        }
        
        // Escape to go back
        if (event.key === 'Escape') {
            if (confirm('Êtes-vous sûr de vouloir quitter le quiz ?')) {
                window.location.href = '/profil';
            }
        }
    },
    
    initializeTimer: () => {
        const timeElement = document.querySelector('.time-remaining');
        if (timeElement) {
            const timeText = timeElement.textContent;
            const match = timeText.match(/(\d+)/);
            if (match) {
                QuizManager.timeRemaining = parseInt(match[1]);
                QuizManager.startTimer();
            }
        }
    },
    
    startTimer: () => {
        const timeElement = document.querySelector('.time-remaining');
        if (!timeElement) return;
        
        QuizManager.timer = setInterval(() => {
            QuizManager.timeRemaining--;
            
            if (QuizManager.timeRemaining <= 0) {
                QuizManager.timeUp();
                return;
            }
            
            // Update display
            timeElement.textContent = Utils.formatTime(QuizManager.timeRemaining);
            
            // Warning colors
            if (QuizManager.timeRemaining <= 10) {
                timeElement.style.color = '#f44336';
                timeElement.style.animation = 'pulse 1s infinite';
            } else if (QuizManager.timeRemaining <= 30) {
                timeElement.style.color = '#ff9800';
            }
        }, 1000);
    },
    
    stopTimer: () => {
        if (QuizManager.timer) {
            clearInterval(QuizManager.timer);
            QuizManager.timer = null;
        }
    },
    
    timeUp: () => {
        QuizManager.stopTimer();
        NotificationManager.show('Temps écoulé !', 'error');
        
        // Auto-submit form
        const form = document.querySelector('form');
        if (form && !QuizManager.isAnswered) {
            form.submit();
        }
    },
    
    enhanceQuizInterface: () => {
        // Enhance progress bar
        const progressBar = document.querySelector('.progress-bar');
        if (progressBar) {
            const progress = parseInt(progressBar.style.width) || 0;
            progressBar.style.width = '0%';
            
        }
        
        // Add question counter animation
        const questionTitle = document.querySelector('h1');
        if (questionTitle) {
            AnimationManager.slideInLeft(questionTitle, 500);
        }
        
        // Enhance options
        document.querySelectorAll('input[name="reponse"]').forEach((radio, index) => {
            const label = radio.closest('label');
            if (label) {
                label.classList.add('option');
                label.style.animationDelay = `${index * 100}ms`;
                AnimationManager.fadeIn(label, 300);
            }
        });
    },
    
    showFeedback: (feedback) => {
        const feedbackElement = document.querySelector('.feedback');
        if (feedbackElement) {
            // Determine feedback type
            const isCorrect = feedback.includes('✔️') || feedback.includes('Bonne');
            feedbackElement.classList.add(isCorrect ? 'success' : 'error');
            
            // Add shake animation for wrong answers
            if (!isCorrect) {
                AnimationManager.shake(feedbackElement);
            }
            
            // Show feedback with animation
            AnimationManager.fadeIn(feedbackElement, 500);
            
            // Auto-advance after delay
            setTimeout(() => {
                const nextButton = document.querySelector('a.btn');
                if (nextButton) {
                    nextButton.style.opacity = '1';
                    AnimationManager.pulse(nextButton, 1500);
                }
            }, CONFIG.quiz.autoAdvanceDelay);
        }
    }
};

// ========================================
// PROGRESS MANAGER
// ========================================

const ProgressManager = {
    updateProgress: (current, total) => {
        const percentage = (current / total) * 100;
        const progressBar = document.querySelector('.progress-bar');
        
        if (progressBar) {
            progressBar.style.width = percentage + '%';
            
            // Add completion animation
            if (percentage === 100) {
                progressBar.style.background = 'linear-gradient(90deg, #4caf50, #8bc34a)';
                AnimationManager.pulse(progressBar, 1000);
            }
        }
        
        // Update progress text
        const progressText = document.querySelector('.progress-text');
        if (progressText) {
            progressText.textContent = `${current}/${total}`;
        }
    },
    
    saveProgress: (data) => {
        const currentProgress = Utils.storage.get(CONFIG.localStorage.keys.progress, {});
        currentProgress[Date.now()] = data;
        Utils.storage.set(CONFIG.localStorage.keys.progress, currentProgress);
    }
};

// ========================================
// ACHIEVEMENT MANAGER
// ========================================

const AchievementManager = {
    achievements: [
        {
            id: 'first_question',
            title: 'Première question',
            description: 'Répondre à votre première question',
            icon: '🎯',
            condition: (data) => data.questionsAnswered >= 1
        },
        {
            id: 'perfect_score',
            title: 'Score parfait',
            description: 'Obtenir un score parfait (5/5)',
            icon: '🏆',
            condition: (data) => data.score === data.totalQuestions
        },
        {
            id: 'speed_demon',
            title: 'Démon de vitesse',
            description: 'Terminer un quiz en moins de 2 minutes',
            icon: '⚡',
            condition: (data) => data.timeTaken < 120
        },
        {
            id: 'persistent',
            title: 'Persistant',
            description: 'Jouer 10 parties',
            icon: '💪',
            condition: (data) => data.gamesPlayed >= 10
        }
    ],
    
    checkAchievements: (gameData) => {
        const unlockedAchievements = [];
        const savedAchievements = Utils.storage.get(CONFIG.localStorage.keys.achievements, []);
        
        this.achievements.forEach(achievement => {
            if (!savedAchievements.includes(achievement.id) && achievement.condition(gameData)) {
                unlockedAchievements.push(achievement);
                savedAchievements.push(achievement.id);
            }
        });
        
        if (unlockedAchievements.length > 0) {
            Utils.storage.set(CONFIG.localStorage.keys.achievements, savedAchievements);
            this.showAchievements(unlockedAchievements);
        }
        
        return unlockedAchievements;
    },
    
    showAchievements: (achievements) => {
        achievements.forEach((achievement, index) => {
            setTimeout(() => {
                this.showAchievementModal(achievement);
            }, index * 1000);
        });
    },
    
    showAchievementModal: (achievement) => {
        const modal = document.createElement('div');
        modal.className = 'achievement-modal';
        modal.innerHTML = `
            <div class="achievement-content">
                <div class="achievement-icon">${achievement.icon}</div>
                <h3>Nouveau succès débloqué !</h3>
                <h4>${achievement.title}</h4>
                <p>${achievement.description}</p>
                <button class="btn btn-success achievement-close">Continuer</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Animation
        setTimeout(() => {
            modal.classList.add('show');
        }, 100);
        
        // Close modal
        modal.querySelector('.achievement-close').addEventListener('click', () => {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        });
    }
};

// ========================================
// THEME MANAGER
// ========================================

const ThemeManager = {
    themes: {
        dark: {
            primary: '#ff5252',
            secondary: '#4db6ac',
            background: '#0d0d0d',
            surface: '#1e1e1e',
            text: '#f4f4f9'
        },
        light: {
            primary: '#d32f2f',
            secondary: '#00695c',
            background: '#fafafa',
            surface: '#ffffff',
            text: '#333333'
        }
    },
    
    currentTheme: 'dark',
    
    init: () => {
        const savedTheme = Utils.storage.get('theme', 'dark');
        ThemeManager.setTheme(savedTheme);
        
        // Add theme toggle button
        ThemeManager.addThemeToggle();
    },
    
    setTheme: (themeName) => {
        if (!ThemeManager.themes[themeName]) return;
        
        ThemeManager.currentTheme = themeName;
        const theme = ThemeManager.themes[themeName];
        
        // Update CSS custom properties
        const root = document.documentElement;
        Object.entries(theme).forEach(([key, value]) => {
            root.style.setProperty(`--theme-${key}`, value);
        });
        
        // Save preference
        Utils.storage.set('theme', themeName);
        
        // Update toggle button
        const toggle = document.querySelector('.theme-toggle');
        if (toggle) {
            toggle.textContent = themeName === 'dark' ? '🌞' : '🌙';
        }
    },
    
    addThemeToggle: () => {
        const nav = document.querySelector('nav');
        if (nav) {
            const toggle = document.createElement('button');
            toggle.className = 'theme-toggle';
            toggle.textContent = '🌞';
            toggle.title = 'Changer de thème';
            toggle.addEventListener('click', () => {
                const newTheme = ThemeManager.currentTheme === 'dark' ? 'light' : 'dark';
                ThemeManager.setTheme(newTheme);
            });
            
            nav.appendChild(toggle);
        }
    }
};

// ========================================
// PERFORMANCE MONITOR
// ========================================

const PerformanceMonitor = {
    init: () => {
        // Monitor page load time
        window.addEventListener('load', () => {
            const loadTime = performance.now();
            console.log(`Page loaded in ${loadTime.toFixed(2)}ms`);
            
            // Show loading indicator
            const loader = document.querySelector('.page-loader');
            if (loader) {
                AnimationManager.fadeOut(loader);
            }
        });
        
        // Monitor quiz performance
        PerformanceMonitor.monitorQuizPerformance();
    },
    
    monitorQuizPerformance: () => {
        const startTime = performance.now();
        
        // Track answer time
        document.addEventListener('change', (event) => {
            if (event.target.name === 'reponse') {
                const answerTime = performance.now() - startTime;
                console.log(`Answer selected in ${answerTime.toFixed(2)}ms`);
            }
        });
    }
};

// ========================================
// ACCESSIBILITY MANAGER
// ========================================

const AccessibilityManager = {
    init: () => {
        // Add skip links
        AccessibilityManager.addSkipLinks();
        
        // Enhance keyboard navigation
        AccessibilityManager.enhanceKeyboardNavigation();
        
        // Add ARIA labels
        AccessibilityManager.addAriaLabels();
        
        // Respect reduced motion preference
        AccessibilityManager.handleReducedMotion();
    },
    
    addSkipLinks: () => {
        const skipLink = document.createElement('a');
        skipLink.href = '#main-content';
        skipLink.className = 'skip-link';
        document.body.insertBefore(skipLink, document.body.firstChild);
    },
    
    enhanceKeyboardNavigation: () => {
        // Add focus indicators
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Tab') {
                document.body.classList.add('keyboard-navigation');
            }
        });
        
        document.addEventListener('mousedown', () => {
            document.body.classList.remove('keyboard-navigation');
        });
    },
    
    addAriaLabels: () => {
        // Progress bar
        const progressBar = document.querySelector('.progress-bar');
        if (progressBar) {
            const progress = Math.round((progressBar.offsetWidth / progressBar.parentElement.offsetWidth) * 100);
            progressBar.setAttribute('aria-valuenow', progress);
            progressBar.setAttribute('aria-label', `Progression: ${progress}%`);
        }
        
        // Quiz options
        document.querySelectorAll('input[name="reponse"]').forEach((radio, index) => {
            radio.setAttribute('aria-describedby', `option-${index + 1}`);
        });
    },
    
    handleReducedMotion: () => {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        if (prefersReducedMotion) {
            // Disable animations
            document.documentElement.style.setProperty('--transition-fast', '0s');
            document.documentElement.style.setProperty('--transition-normal', '0s');
            document.documentElement.style.setProperty('--transition-slow', '0s');
        }
    }
};

// ========================================
// INITIALIZATION
// ========================================

const App = {
    init: () => {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', App.initializeApp);
        } else {
            App.initializeApp();
        }
    },
    
    initializeApp: () => {
        console.log('🌍 Escape Game SVT - Initializing...');
        
        // Initialize all managers
        ThemeManager.init();
        AccessibilityManager.init();
        PerformanceMonitor.init();
        
        // Initialize quiz-specific features
        if (document.querySelector('form[method="POST"]')) {
            QuizManager.init();
        }
        
        // Initialize progress tracking
        if (document.querySelector('.progress-container')) {
            ProgressManager.updateProgress(
                parseInt(document.querySelector('h1')?.textContent?.match(/\d+/)?.[0] || 0),
                parseInt(document.querySelector('h1')?.textContent?.split('/')?.[1] || 1)
            );
        }
        
        // Show feedback if present
        const feedback = document.querySelector('.feedback');
        if (feedback) {
            QuizManager.showFeedback(feedback.textContent);
        }
        
        // Add loading states
        App.addLoadingStates();
        
        // Initialize tooltips
        App.initializeTooltips();
        
        console.log('✅ Escape Game SVT - Ready!');
    },
    
    addLoadingStates: () => {
        // Add loading state to buttons
        document.querySelectorAll('button, .btn').forEach(button => {
            button.addEventListener('click', (event) => {
                if (button.type === 'submit' || button.href) {
                    button.style.opacity = '0.7';
                    button.style.pointerEvents = 'none';
                    
                    // Add spinner
                    const spinner = document.createElement('span');
                    spinner.className = 'spinner';
                    spinner.innerHTML = '⏳';
                    button.appendChild(spinner);
                }
            });
        });
    },
    
    initializeTooltips: () => {
        // Add tooltips to elements with title attributes
        document.querySelectorAll('[title]').forEach(element => {
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = element.getAttribute('title');
            
            element.addEventListener('mouseenter', () => {
                document.body.appendChild(tooltip);
                
                const rect = element.getBoundingClientRect();
                tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
                tooltip.style.top = rect.top - tooltip.offsetHeight - 5 + 'px';
                
                AnimationManager.fadeIn(tooltip, 200);
            });
            
            element.addEventListener('mouseleave', () => {
                tooltip.remove();
            });
            
            element.removeAttribute('title');
        });
    }
};

// ========================================
// ERROR HANDLING
// ========================================

window.addEventListener('error', (event) => {
    console.error('JavaScript Error:', event.error);
    NotificationManager.show('Une erreur est survenue. Veuillez recharger la page.', 'error');
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled Promise Rejection:', event.reason);
    NotificationManager.show('Une erreur est survenue. Veuillez recharger la page.', 'error');
});

// ========================================
// START APPLICATION
// ========================================

// Initialize the application
App.init();

// Export for testing (if in Node.js environment)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        App,
        QuizManager,
        AnimationManager,
        Utils,
        CONFIG
    };
}
