class EmberParticles {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.particles = [];
        this.enabled = true;
        this.intensity = 1;
        this.animationId = null;
        
        this.config = {
            baseCount: 30,
            baseSpeed: 0.5,
            sizeRange: { min: 1, max: 3 },
            lifespanRange: { min: 3000, max: 6000 },
            swayAmount: 0.5,
            fadeInTime: 500,
            fadeOutTime: 1000,
            colors: [
                'rgba(255, 100, 0, 0.8)',   // Bright orange
                'rgba(255, 150, 50, 0.6)',  // Light orange
                'rgba(255, 200, 100, 0.4)', // Pale orange
                'rgba(255, 50, 0, 0.9)'     // Deep red-orange
            ]
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
        this.canvas.style.zIndex = '50'; // Above background but below UI
        document.body.appendChild(this.canvas);
        
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        
        // Handle resize
        window.addEventListener('resize', () => this.resize());
        
        // Start animation
        this.animate();
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    setIntensity(intensity) {
        this.intensity = Math.max(0, Math.min(3, intensity));
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
    
    createParticle() {
        const color = this.config.colors[Math.floor(Math.random() * this.config.colors.length)];
        const size = this.config.sizeRange.min + Math.random() * (this.config.sizeRange.max - this.config.sizeRange.min);
        
        return {
            x: Math.random() * this.canvas.width,
            y: this.canvas.height + size,
            size: size,
            color: color,
            speed: this.config.baseSpeed + Math.random() * 0.5,
            swaySpeed: 0.001 + Math.random() * 0.002,
            swayAmount: this.config.swayAmount + Math.random() * 0.3,
            lifespan: this.config.lifespanRange.min + Math.random() * (this.config.lifespanRange.max - this.config.lifespanRange.min),
            age: 0,
            opacity: 0
        };
    }
    
    updateParticle(particle, deltaTime) {
        particle.age += deltaTime;
        
        // Fade in/out
        if (particle.age < this.config.fadeInTime) {
            particle.opacity = particle.age / this.config.fadeInTime;
        } else if (particle.age > particle.lifespan - this.config.fadeOutTime) {
            particle.opacity = (particle.lifespan - particle.age) / this.config.fadeOutTime;
        } else {
            particle.opacity = 1;
        }
        
        // Move upward with sway
        particle.y -= particle.speed * this.intensity;
        particle.x += Math.sin(particle.age * particle.swaySpeed) * particle.swayAmount;
        
        // Remove if off screen or too old
        return particle.y > -particle.size && particle.age < particle.lifespan;
    }
    
    drawParticle(particle) {
        this.ctx.save();
        
        // Apply opacity to color
        const rgba = particle.color.match(/[\d.]+/g);
        this.ctx.fillStyle = `rgba(${rgba[0]}, ${rgba[1]}, ${rgba[2]}, ${rgba[3] * particle.opacity})`;
        
        // Draw glowing ember
        this.ctx.shadowBlur = particle.size * 3;
        this.ctx.shadowColor = particle.color;
        
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        this.ctx.fill();
        
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
        
        // Add new particles
        const targetCount = this.config.baseCount * this.intensity;
        while (this.particles.length < targetCount) {
            this.particles.push(this.createParticle());
        }
        
        // Update and draw particles
        this.particles = this.particles.filter(particle => {
            const alive = this.updateParticle(particle, deltaTime);
            if (alive) {
                this.drawParticle(particle);
            }
            return alive;
        });
        
        this.animationId = requestAnimationFrame(() => this.animate());
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