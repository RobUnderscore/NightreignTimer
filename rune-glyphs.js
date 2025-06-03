class RuneGlyphs {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.runes = [];
        this.enabled = true;
        this.animationId = null;
        this.activeButton = null;
        
        this.config = {
            runeCount: 6,
            radius: 150,
            runeSize: 20,
            rotationSpeed: 0.0005,
            fadeSpeed: 0.02,
            glowIntensity: 15,
            // Ancient-looking symbols
            symbols: ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ', 'ᛁ', 'ᛃ', 'ᛇ', 'ᛈ', 'ᛉ', 'ᛊ'],
            colors: {
                default: 'rgba(212, 197, 160, 0.6)',
                danger: 'rgba(255, 100, 100, 0.7)',
                boss: 'rgba(200, 50, 50, 0.9)'
            }
        };
        
        this.init();
    }
    
    init() {
        // Create canvas
        this.canvas = document.createElement('canvas');
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '55'; // Above particles but below UI
        document.body.appendChild(this.canvas);
        
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        
        // Handle resize
        window.addEventListener('resize', () => this.resize());
        
        // Initialize runes
        this.createRunes();
        
        // Start animation
        this.animate();
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    createRunes() {
        this.runes = [];
        const angleStep = (Math.PI * 2) / this.config.runeCount;
        
        for (let i = 0; i < this.config.runeCount; i++) {
            this.runes.push({
                angle: angleStep * i,
                symbol: this.config.symbols[Math.floor(Math.random() * this.config.symbols.length)],
                opacity: 0,
                targetOpacity: 0,
                scale: 0.8 + Math.random() * 0.4,
                pulsePhase: Math.random() * Math.PI * 2
            });
        }
    }
    
    setActiveButton(button) {
        this.activeButton = button;
        
        if (button) {
            // Set target opacity for runes
            this.runes.forEach(rune => {
                rune.targetOpacity = 1;
            });
        } else {
            // Fade out runes
            this.runes.forEach(rune => {
                rune.targetOpacity = 0;
            });
        }
    }
    
    getButtonCenter() {
        if (!this.activeButton) return null;
        
        const rect = this.activeButton.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
    }
    
    getColor() {
        if (!this.activeButton) return this.config.colors.default;
        
        if (this.activeButton.classList.contains('danger')) {
            return this.config.colors.danger;
        } else if (this.activeButton.dataset.phase === '4') {
            return this.config.colors.boss;
        }
        
        return this.config.colors.default;
    }
    
    updateRune(rune, deltaTime) {
        // Update rotation
        rune.angle += this.config.rotationSpeed * deltaTime;
        
        // Update opacity
        if (rune.opacity < rune.targetOpacity) {
            rune.opacity = Math.min(rune.targetOpacity, rune.opacity + this.config.fadeSpeed);
        } else if (rune.opacity > rune.targetOpacity) {
            rune.opacity = Math.max(rune.targetOpacity, rune.opacity - this.config.fadeSpeed);
        }
        
        // Update pulse
        rune.pulsePhase += 0.001 * deltaTime;
    }
    
    drawRune(rune, center) {
        if (rune.opacity <= 0) return;
        
        const x = center.x + Math.cos(rune.angle) * this.config.radius;
        const y = center.y + Math.sin(rune.angle) * this.config.radius;
        
        this.ctx.save();
        
        // Set up glow effect
        const color = this.getColor();
        this.ctx.shadowBlur = this.config.glowIntensity + Math.sin(rune.pulsePhase) * 5;
        this.ctx.shadowColor = color;
        
        // Draw rune
        this.ctx.font = `${this.config.runeSize * rune.scale}px serif`;
        this.ctx.fillStyle = color.replace(/[\d.]+\)$/, `${rune.opacity})`);
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Add slight rotation to each rune
        this.ctx.translate(x, y);
        this.ctx.rotate(rune.angle * 0.5);
        this.ctx.fillText(rune.symbol, 0, 0);
        
        this.ctx.restore();
    }
    
    animate() {
        if (!this.enabled) {
            this.animationId = null;
            return;
        }
        
        const currentTime = Date.now();
        const deltaTime = currentTime - (this.lastTime || currentTime);
        this.lastTime = currentTime;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Get button center
        const center = this.getButtonCenter();
        
        if (center) {
            // Update and draw runes
            this.runes.forEach(rune => {
                this.updateRune(rune, deltaTime);
                this.drawRune(rune, center);
            });
        } else {
            // Just update opacity when no active button
            this.runes.forEach(rune => {
                this.updateRune(rune, deltaTime);
            });
        }
        
        this.animationId = requestAnimationFrame(() => this.animate());
    }
    
    enable() {
        this.enabled = true;
        if (!this.animationId) {
            this.animate();
        }
    }
    
    disable() {
        this.enabled = false;
    }
    
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
    }
}