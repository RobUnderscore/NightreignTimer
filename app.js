class NightreignTimer {
    constructor() {
        this.phases = [
            { name: 'Beginning of Day', duration: 270, circleClosing: false },
            { name: 'First Circle Closing', duration: 180, circleClosing: true },
            { name: 'Inner Circle', duration: 210, circleClosing: false },
            { name: 'Second Circle Closing', duration: 180, circleClosing: true },
            { name: 'Boss Fight!', duration: 0, circleClosing: false }
        ];
        // this.phases = [
        //     { name: 'Beginning of Day', duration: 10, circleClosing: false },
        //     { name: 'First Circle Closing', duration: 10, circleClosing: true },
        //     { name: 'Inner Circle', duration: 10, circleClosing: false },
        //     { name: 'Inner Circle Closing', duration: 10, circleClosing: true },
        //     { name: 'Boss Fight!', duration: 0, circleClosing: false }
        // ];
        
        this.currentPhase = 0;
        this.timeRemaining = 0;
        this.totalTime = 0;
        this.isRunning = false;
        this.interval = null;
        
        this.audioContext = null;
        this.warningPlayed = new Set();
        
        this.initializeElements();
        this.attachEventListeners();
        this.createParticleContainer();
        this.updateDisplay();
    }
    
    initializeElements() {
        this.startBtn = document.getElementById('startBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.circleProgress = document.querySelector('.circle-progress');
        this.phaseNameEl = document.querySelector('.phase-name');
        this.timeRemainingEl = document.querySelector('.time-remaining');
        this.nextEventEl = document.querySelector('.next-event');
        this.timelineItems = document.querySelectorAll('.timeline-item');
        this.resetModal = document.getElementById('resetModal');
        this.confirmResetBtn = document.getElementById('confirmReset');
        this.cancelResetBtn = document.getElementById('cancelReset');
    }
    
    attachEventListeners() {
        this.startBtn.addEventListener('click', () => this.toggleTimer());
        this.resetBtn.addEventListener('click', () => this.showResetModal());
        this.confirmResetBtn.addEventListener('click', () => this.reset());
        this.cancelResetBtn.addEventListener('click', () => this.hideResetModal());
        
        // Initialize audio context on first user interaction
        document.addEventListener('click', () => {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
        }, { once: true });
    }
    
    toggleTimer() {
        if (this.isRunning) {
            this.pause();
        } else {
            this.start();
        }
    }
    
    start() {
        this.isRunning = true;
        this.startBtn.textContent = 'Pause';
        this.resetBtn.disabled = false;
        
        if (this.timeRemaining === 0 && this.currentPhase < this.phases.length - 1) {
            this.timeRemaining = this.phases[this.currentPhase].duration;
        }
        
        this.interval = setInterval(() => this.tick(), 1000);
    }
    
    pause() {
        this.isRunning = false;
        this.startBtn.textContent = 'Resume';
        clearInterval(this.interval);
    }
    
    tick() {
        if (this.timeRemaining > 0) {
            this.timeRemaining--;
            this.totalTime++;
            
            // Check for warnings
            this.checkWarnings();
            
            this.updateDisplay();
        } else {
            // Move to next phase
            if (this.currentPhase < this.phases.length - 1) {
                this.currentPhase++;
                this.warningPlayed.clear();
                
                if (this.currentPhase < this.phases.length - 1) {
                    this.timeRemaining = this.phases[this.currentPhase].duration;
                    // Play sound for phase transition
                    this.playSound('phase-change');
                } else {
                    // Boss fight - stop timer
                    this.pause();
                    this.playSound('boss');
                }
                
                this.updateDisplay();
            }
        }
    }
    
    checkWarnings() {
        const phase = this.phases[this.currentPhase];
        
        // Warning 30 seconds before circle starts closing
        if (this.currentPhase === 0 && this.timeRemaining === 30 && !this.warningPlayed.has('first-warning')) {
            this.playSound('warning');
            this.warningPlayed.add('first-warning');
            this.showNotification('Circle closing in 30 seconds!');
            this.shakeContainer();
        }
        
        if (this.currentPhase === 2 && this.timeRemaining === 30 && !this.warningPlayed.has('second-warning')) {
            this.playSound('warning');
            this.warningPlayed.add('second-warning');
            this.showNotification('Second circle closing in 30 seconds!');
            this.shakeContainer();
        }
        
        // Add urgency effects in final seconds
        if (phase.circleClosing && this.timeRemaining <= 30 && this.timeRemaining > 0) {
            this.circleProgress.classList.add('pulsing');
        } else {
            this.circleProgress.classList.remove('pulsing');
        }
    }
    
    updateDisplay() {
        const phase = this.phases[this.currentPhase];
        
        // Update timer text
        this.phaseNameEl.textContent = phase.name;
        this.timeRemainingEl.textContent = this.formatTime(this.timeRemaining);
        
        // Update next event text
        if (this.currentPhase < this.phases.length - 1) {
            const nextPhase = this.phases[this.currentPhase + 1];
            if (this.currentPhase === this.phases.length - 2) {
                this.nextEventEl.textContent = 'Next: Boss Fight!';
            } else {
                this.nextEventEl.textContent = `Next: ${nextPhase.name} in ${this.formatTime(this.timeRemaining)}`;
            }
        } else {
            this.nextEventEl.textContent = 'Fight the boss!';
        }
        
        // Update circle animation
        this.updateCircle();
        
        // Update timeline
        this.updateTimeline();
        
        // Update background and particles
        this.updateEnvironment();
    }
    
    updateCircle() {
        const phase = this.phases[this.currentPhase];
        
        if (phase.circleClosing) {
            // Circle is closing - animate from full to empty
            const progress = this.timeRemaining / phase.duration;
            const offset = 565.48 * progress;
            this.circleProgress.style.strokeDashoffset = offset;
            
            // Change color based on time remaining
            if (this.timeRemaining <= 30) {
                this.circleProgress.classList.add('danger');
                this.circleProgress.classList.remove('warning');
            } else if (this.timeRemaining <= 60) {
                this.circleProgress.classList.add('warning');
                this.circleProgress.classList.remove('danger');
            } else {
                this.circleProgress.classList.remove('warning', 'danger');
            }
        } else {
            // For non-closing phases, show progress as circle depleting
            const progress = this.timeRemaining / phase.duration;
            const offset = 565.48 * (1 - progress);
            this.circleProgress.style.strokeDashoffset = offset;
            this.circleProgress.classList.remove('warning', 'danger');
            
            // Optional: Add subtle color for waiting phases
            if (this.currentPhase === 0 || this.currentPhase === 2) {
                this.circleProgress.style.stroke = '#4a90e2'; // Blue for waiting
            } else {
                this.circleProgress.style.stroke = ''; // Reset to CSS default
            }
        }
    }
    
    updateTimeline() {
        this.timelineItems.forEach((item, index) => {
            if (index < this.currentPhase) {
                item.classList.add('completed');
                item.classList.remove('active');
            } else if (index === this.currentPhase) {
                item.classList.add('active');
                item.classList.remove('completed');
            } else {
                item.classList.remove('active', 'completed');
            }
        });
    }
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    playSound(type) {
        if (!this.audioContext) return;
        
        switch(type) {
            case 'warning':
                // More prominent warning sound - two-tone alert
                for (let i = 0; i < 2; i++) {
                    const oscillator = this.audioContext.createOscillator();
                    const gainNode = this.audioContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(this.audioContext.destination);
                    
                    oscillator.frequency.setValueAtTime(i === 0 ? 880 : 660, this.audioContext.currentTime + (i * 0.3));
                    gainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime + (i * 0.3));
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + (i * 0.3) + 0.25);
                    
                    oscillator.start(this.audioContext.currentTime + (i * 0.3));
                    oscillator.stop(this.audioContext.currentTime + (i * 0.3) + 0.25);
                }
                break;
                
            case 'phase-change':
                // Pleasant chime for phase transitions
                const frequencies = [523.25, 659.25, 783.99]; // C, E, G major chord
                frequencies.forEach((freq, i) => {
                    const osc = this.audioContext.createOscillator();
                    const gain = this.audioContext.createGain();
                    
                    osc.connect(gain);
                    gain.connect(this.audioContext.destination);
                    
                    osc.frequency.value = freq;
                    osc.type = 'sine';
                    
                    gain.gain.setValueAtTime(0, this.audioContext.currentTime + (i * 0.1));
                    gain.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + (i * 0.1) + 0.05);
                    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + (i * 0.1) + 0.8);
                    
                    osc.start(this.audioContext.currentTime + (i * 0.1));
                    osc.stop(this.audioContext.currentTime + (i * 0.1) + 0.8);
                });
                break;
                
            case 'boss':
                // Dramatic boss sound - deep rumble with high alert
                for (let i = 0; i < 4; i++) {
                    const osc = this.audioContext.createOscillator();
                    const gain = this.audioContext.createGain();
                    osc.connect(gain);
                    gain.connect(this.audioContext.destination);
                    
                    osc.frequency.setValueAtTime(100 + (i * 150), this.audioContext.currentTime + (i * 0.15));
                    osc.type = i < 2 ? 'sawtooth' : 'square';
                    gain.gain.setValueAtTime(0.4, this.audioContext.currentTime + (i * 0.15));
                    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + (i * 0.15) + 0.3);
                    
                    osc.start(this.audioContext.currentTime + (i * 0.15));
                    osc.stop(this.audioContext.currentTime + (i * 0.15) + 0.3);
                }
                break;
        }
    }
    
    showNotification(message) {
        // Create a visual notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--warning-color);
            color: black;
            padding: 15px 30px;
            border-radius: 10px;
            font-weight: bold;
            z-index: 2000;
            animation: slideDown 0.3s ease;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideUp 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    showResetModal() {
        this.resetModal.classList.add('active');
    }
    
    hideResetModal() {
        this.resetModal.classList.remove('active');
    }
    
    reset() {
        this.pause();
        this.currentPhase = 0;
        this.timeRemaining = 0;
        this.totalTime = 0;
        this.warningPlayed.clear();
        this.startBtn.textContent = 'Start Timer';
        this.resetBtn.disabled = true;
        this.updateDisplay();
        this.hideResetModal();
    }
    
    createParticleContainer() {
        this.particleContainer = document.createElement('div');
        this.particleContainer.className = 'particle-container';
        document.body.appendChild(this.particleContainer);
        
        // Start with some initial particles
        this.spawnParticles();
    }
    
    spawnParticles() {
        // Clear existing particles
        this.particleContainer.innerHTML = '';
        
        const particleTypes = this.getParticleTypeForPhase();
        
        if (this.currentPhase === 4) {
            // Boss fight - create static stars
            const starCount = 50;
            for (let i = 0; i < starCount; i++) {
                const star = document.createElement('div');
                star.className = `particle star`;
                star.style.left = Math.random() * 100 + '%';
                star.style.top = Math.random() * 60 + '%'; // Stars in upper portion
                star.style.animationDelay = Math.random() * 3 + 's';
                this.particleContainer.appendChild(star);
            }
        } else {
            // Other phases - floating particles
            const particleCount = 30;
            for (let i = 0; i < particleCount; i++) {
                const particle = document.createElement('div');
                particle.className = `particle ${particleTypes}`;
                particle.style.left = Math.random() * 100 + '%';
                particle.style.top = '110vh'; // Start particles below viewport
                particle.style.animationDelay = Math.random() * 10 + 's';
                particle.style.animationDuration = (8 + Math.random() * 7) + 's';
                this.particleContainer.appendChild(particle);
            }
        }
    }
    
    getParticleTypeForPhase() {
        switch(this.currentPhase) {
            case 0: return 'firefly';
            case 1: return 'particle'; // Mid-day - light particles
            case 2: return 'firefly'; // Golden hour - warm fireflies
            case 3: return 'particle'; // Evening - dim particles
            case 4: return 'star'; // Night - stars
            default: return 'particle';
        }
    }
    
    updateEnvironment() {
        // Update body class for background gradient
        document.body.className = `phase-${this.currentPhase}`;
        
        // Update particles when phase changes
        if (!this.lastPhase || this.lastPhase !== this.currentPhase) {
            this.spawnParticles();
            this.lastPhase = this.currentPhase;
        }
    }
    
    shakeContainer() {
        const container = document.querySelector('.container');
        container.classList.add('shake');
        setTimeout(() => container.classList.remove('shake'), 500);
    }
}

// Add animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from {
            transform: translate(-50%, -100%);
            opacity: 0;
        }
        to {
            transform: translate(-50%, 0);
            opacity: 1;
        }
    }
    
    @keyframes slideUp {
        from {
            transform: translate(-50%, 0);
            opacity: 1;
        }
        to {
            transform: translate(-50%, -100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize the timer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new NightreignTimer();
});