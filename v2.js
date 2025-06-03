class NightreignTimerV2 {
    constructor() {
        this.phases = [
            { name: 'Beginning of Day', duration: 270, circleClosing: false },
            { name: 'First Circle Closing', duration: 180, circleClosing: true },
            { name: 'Inner Circle', duration: 210, circleClosing: false },
            { name: 'Second Circle Closing', duration: 180, circleClosing: true },
            { name: 'Boss Fight!', duration: 0, circleClosing: false }
        ];
        
        this.activeTimer = null;
        this.audioContext = null;
        this.warningPlayed = new Set();
        this.wakeLock = null;
        
        // Initialize visual effects
        this.emberParticles = new EmberParticles();
        this.emberParticles.setIntensity(0.5); // Start with low intensity
        
        this.runeGlyphs = new RuneGlyphs();
        
        this.initializeElements();
        this.attachEventListeners();
        this.requestWakeLock();
    }
    
    getTotalRemainingTime(fromPhase) {
        let total = 0;
        for (let i = fromPhase; i < this.phases.length - 1; i++) {
            total += this.phases[i].duration;
        }
        return total;
    }
    
    initializeElements() {
        this.phaseButtons = document.querySelectorAll('.phase-button');
        this.resetBtn = document.getElementById('resetBtn');
        this.currentPhaseDisplay = document.getElementById('currentPhaseDisplay');
        this.timeRemainingDisplay = document.getElementById('timeRemaining');
        
        // Set up phase buttons with dynamic data
        this.phaseButtons.forEach((button, index) => {
            const phase = this.phases[index];
            button.dataset.duration = phase.duration;
            
            const phaseTimeElement = button.querySelector('.phase-time');
            if (phase.duration === 0) {
                phaseTimeElement.textContent = '--:--';
            } else {
                phaseTimeElement.textContent = this.formatTime(phase.duration);
            }
        });
        
        // Set initial total time display
        const totalTime = this.getTotalRemainingTime(0);
        this.timeRemainingDisplay.textContent = this.formatTime(totalTime);
        
        // Adjust layout based on viewport
        this.adjustLayoutForViewport();
        window.addEventListener('resize', () => this.adjustLayoutForViewport());
    }
    
    attachEventListeners() {
        // Phase button clicks
        this.phaseButtons.forEach(button => {
            button.addEventListener('click', () => this.startPhase(button));
        });
        
        // Reset button
        this.resetBtn.addEventListener('click', () => this.resetAll());
        
        // Initialize audio context on first user interaction
        document.addEventListener('click', () => {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
        }, { once: true });
    }
    
    async requestWakeLock() {
        // Check if the Wake Lock API is supported
        if ('wakeLock' in navigator) {
            try {
                this.wakeLock = await navigator.wakeLock.request('screen');
                console.log('Wake Lock is active');
                
                // Re-request wake lock if document becomes visible again
                document.addEventListener('visibilitychange', async () => {
                    if (this.wakeLock !== null && document.visibilityState === 'visible') {
                        this.wakeLock = await navigator.wakeLock.request('screen');
                        console.log('Wake Lock reacquired');
                    }
                });
            } catch (err) {
                console.log(`Wake Lock error: ${err.name}, ${err.message}`);
            }
        } else {
            console.log('Wake Lock API not supported');
        }
    }
    
    async releaseWakeLock() {
        if (this.wakeLock !== null) {
            await this.wakeLock.release();
            this.wakeLock = null;
            console.log('Wake Lock released');
        }
    }
    
    startPhase(button) {
        // Request wake lock when timer starts
        this.requestWakeLock();
        
        // If there's an active timer, clear it
        if (this.activeTimer) {
            clearInterval(this.activeTimer.interval);
            this.activeTimer.button.classList.remove('active', 'danger');
            this.activeTimer.button.style.setProperty('--progress', '100%');
            // Restore original time
            const phaseTimeElement = this.activeTimer.button.querySelector('.phase-time');
            phaseTimeElement.textContent = this.activeTimer.originalTime;
        }
        
        const phase = parseInt(button.dataset.phase);
        const duration = parseInt(button.dataset.duration);
        
        // Mark previous phases as completed
        this.phaseButtons.forEach(btn => {
            const btnPhase = parseInt(btn.dataset.phase);
            
            if (btnPhase < phase) {
                btn.classList.add('completed');
            } else {
                btn.classList.remove('completed');
            }
            btn.classList.remove('active');
        });
        
        // Mark current phase as active
        button.classList.add('active');
        button.classList.remove('completed');
        
        // Update rune glyphs to follow active button
        this.runeGlyphs.setActiveButton(button);
        
        // Update current phase display
        const phaseName = this.phases[phase].name;
        this.currentPhaseDisplay.textContent = phaseName;
        
        // Update background
        document.body.className = `phase-${phase}`;
        
        // Update particle intensity based on phase
        if (this.phases[phase].circleClosing) {
            this.emberParticles.setIntensity(2); // High intensity during circle closing
        } else if (phase === 4) {
            this.emberParticles.setIntensity(3); // Maximum for boss fight
        } else {
            this.emberParticles.setIntensity(0.5); // Low intensity during safe phases
        }
        
        if (phase === 4) {
            // Boss fight
            this.timeRemainingDisplay.textContent = '0:00';
            this.playSound('boss');
            this.showNotification('Boss Fight! Good luck!');
            return;
        }
        
        // Start timer
        button.style.setProperty('--progress', '0%');
        
        let timeRemaining = duration;
        let totalTimeRemaining = this.getTotalRemainingTime(phase);
        this.warningPlayed.clear();
        
        // Store original phase time for restoration
        const phaseTimeElement = button.querySelector('.phase-time');
        const originalTime = phaseTimeElement.textContent;
        
        this.activeTimer = {
            button: button,
            phase: phase,
            originalTime: originalTime,
            interval: setInterval(() => {
                timeRemaining--;
                totalTimeRemaining--;
                
                // Update time display on button
                phaseTimeElement.textContent = this.formatTime(timeRemaining);
                
                // Update total time display at bottom
                this.timeRemainingDisplay.textContent = this.formatTime(totalTimeRemaining);
                
                // Update full bar progress
                const progress = ((duration - timeRemaining) / duration) * 100;
                button.style.setProperty('--progress', progress + '%');
                
                // Check warnings
                this.checkWarnings(phase, timeRemaining, button);
                
                if (timeRemaining <= 0) {
                    clearInterval(this.activeTimer.interval);
                    button.classList.remove('active');
                    button.classList.add('completed');
                    button.style.setProperty('--progress', '100%');
                    phaseTimeElement.textContent = originalTime; // Restore original time
                    
                    // Auto-advance to next phase
                    const nextButton = this.getNextPhaseButton(phase);
                    if (nextButton) {
                        this.playSound('phase-change');
                        setTimeout(() => this.startPhase(nextButton), 1000);
                    }
                }
            }, 1000)
        };
        
        // Update initial display
        phaseTimeElement.textContent = this.formatTime(timeRemaining);
        this.timeRemainingDisplay.textContent = this.formatTime(totalTimeRemaining);
    }
    
    getNextPhaseButton(currentPhase) {
        // Find next phase button
        let nextPhase = currentPhase + 1;
        
        if (nextPhase > 4) {
            return null; // No more phases after boss fight
        }
        
        return document.querySelector(`.phase-button[data-phase="${nextPhase}"]`);
    }
    
    checkWarnings(phase, timeRemaining, button) {
        // Warning 30 seconds before circle starts closing
        if (phase === 0 && timeRemaining === 30 && !this.warningPlayed.has('first-warning')) {
            this.playSound('warning');
            this.warningPlayed.add('first-warning');
            this.showNotification('Circle closing in 30 seconds!');
            this.shakeContainer();
        }
        
        if (phase === 2 && timeRemaining === 30 && !this.warningPlayed.has('second-warning')) {
            this.playSound('warning');
            this.warningPlayed.add('second-warning');
            this.showNotification('Second circle closing in 30 seconds!');
            this.shakeContainer();
        }
        
        // Add danger class for circle closing phases
        if ((phase === 1 || phase === 3) && timeRemaining <= 30) {
            button.classList.add('danger');
        } else {
            button.classList.remove('danger');
        }
    }
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    resetAll() {
        // Clear active timer
        if (this.activeTimer) {
            clearInterval(this.activeTimer.interval);
        }
        
        // Reset all buttons
        this.phaseButtons.forEach((button, index) => {
            button.classList.remove('active', 'completed', 'danger');
            button.style.setProperty('--progress', '0%');
            
            // Restore original time display
            const phase = this.phases[index];
            const phaseTimeElement = button.querySelector('.phase-time');
            if (phase.duration === 0) {
                phaseTimeElement.textContent = '--:--';
            } else {
                phaseTimeElement.textContent = this.formatTime(phase.duration);
            }
        });
        
        // Reset displays
        this.currentPhaseDisplay.textContent = 'Ready to Start';
        const totalTime = this.getTotalRemainingTime(0);
        this.timeRemainingDisplay.textContent = this.formatTime(totalTime);
        
        // Reset background
        document.body.className = '';
        
        // Reset visual effects
        this.emberParticles.setIntensity(0.5);
        this.runeGlyphs.setActiveButton(null);
        
        this.activeTimer = null;
        this.warningPlayed.clear();
        
        // Release wake lock when resetting
        this.releaseWakeLock();
    }
    
    playSound(type) {
        if (!this.audioContext) return;
        
        switch(type) {
            case 'warning':
                // Two-tone alert
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
                // Pleasant chime
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
                // Dramatic boss sound
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
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideUp 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    shakeContainer() {
        const container = document.querySelector('.container');
        container.classList.add('shake');
        setTimeout(() => container.classList.remove('shake'), 500);
    }
    
    adjustLayoutForViewport() {
        // No longer needed with single day layout
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new NightreignTimerV2();
});