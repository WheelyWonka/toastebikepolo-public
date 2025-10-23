class ToasterGame {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.gameRunning = false;
        this.gameStartTime = 0;
        this.score = 0;
        this.lives = 5;
        this.maxLives = 5;
        
        // Game objects
        this.toaster = null;
        this.toasts = [];
        this.rainBalls = [];
        this.particles = [];
        
        // Input handling
        this.mousePos = { x: 0, y: 0 };
        this.isShooting = false;
        this.shootDirection = { x: 0, y: 0 };
        
        // Game settings
        this.toasterSpeed = 2;
        this.toastSpeed = 8;
        this.rainSpeed = 3;
        this.baseRainSpawnRate = 0.02; // Base probability per frame
        this.rainSpawnRate = 0.02; // Current probability per frame (will increase)
        this.toastSpawnRate = 0.3; // Probability per frame when shooting (increased for more reliable shooting)
        this.difficultyIncreaseRate = 0.001; // How much spawn rate increases per second
        this.lastShotTime = 0;
        this.minShotInterval = 200; // Minimum milliseconds between shots
        this.hasShotThisClick = false; // Track if we've already shot for this click
        
        // Colors for rain balls - fluorescent colors with labels and hit requirements
        this.rainColors = [
            { color: '#ff6600', label: 'HOT', hitsRequired: 1 },    // Orange fluo - 1 hit
            { color: '#ff1493', label: 'COOL', hitsRequired: 2 },   // Pink fluo - 2 hits
            { color: '#ffff00', label: 'COLD', hitsRequired: 3 }    // Yellow fluo - 3 hits
        ];
        
        // Assets
        this.toasterImage = null;
        this.toastImage = null;
        
        // Track loop/timers to ensure proper teardown
        this.rafId = null;
        this.countdownIntervalId = null;
        this.countdownTimeoutId = null;
        // Sound mute state persisted across sessions
        this.isMuted = localStorage.getItem('toaste_game_muted') === 'true';
        this.init();
    }
    
    init() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Add mobile-specific resize handling
        if (window.innerWidth <= 768) {
            // Force mobile viewport fix immediately
            this.forceMobileViewport();
        }
        
        // Load assets
        this.loadAssets();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Setup game UI
        this.setupGameUI();
    }
    
    resizeCanvas() {
        const container = document.getElementById('game-container');
        
        // Use window dimensions for mobile to handle viewport issues
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
            // Use window dimensions to avoid mobile browser UI issues
            const width = window.innerWidth;
            const height = window.innerHeight;
            
            this.canvas.width = width;
            this.canvas.height = height;
            
            // Set canvas style to match
            this.canvas.style.width = width + 'px';
            this.canvas.style.height = height + 'px';
            
            // Debug log for mobile
            console.log('Mobile canvas resize:', { width, height, canvasWidth: this.canvas.width, canvasHeight: this.canvas.height });
        } else {
            // Desktop: use container dimensions
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight;
        }
        
        // If toaster exists, reposition it
        if (this.toaster) {
            this.toaster.x = this.canvas.width / 2;
            this.toaster.y = this.canvas.height - 70;
        }
    }
    
    forceMobileViewport() {
        // Get the actual available viewport
        const gameContainer = document.getElementById('game-container');
        const gameOverlay = document.getElementById('game-overlay');
        
        // Use the actual available space
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        // Set container and overlay to available space
        gameContainer.style.width = width + 'px';
        gameContainer.style.height = height + 'px';
        gameOverlay.style.width = width + 'px';
        gameOverlay.style.height = height + 'px';
        
        // Set canvas to available space
        this.canvas.width = width;
        this.canvas.height = height;
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
        
        console.log('VIEWPORT FIX:', { width, height });
    }
    
    loadAssets() {
        // Load toaster SVG
        this.toasterImage = new Image();
        this.toasterImage.onload = () => {
            // Scale toaster to appropriate game size (original is 483x305)
            this.toasterImage.width = 80;
            this.toasterImage.height = 50;
        };
        this.toasterImage.src = 'assets/graphics/toaster.svg';
        
        // Load toast SVG
        this.toastImage = new Image();
        this.toastImage.onload = () => {
            // Scale toast to appropriate game size (original is 47x48)
            this.toastImage.width = 24;
            this.toastImage.height = 24;
        };
        this.toastImage.src = 'assets/graphics/toast.svg';
    }
    
    setupEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mousePos.x = e.clientX - rect.left;
            this.mousePos.y = e.clientY - rect.top;
        });
        
        this.canvas.addEventListener('mousedown', (e) => {
            if (this.gameRunning) {
                this.isShooting = true;
                this.hasShotThisClick = false; // Reset shot flag for new click
                this.calculateShootDirection();
            }
        });
        
        this.canvas.addEventListener('mouseup', () => {
            this.isShooting = false;
        });
        
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.gameRunning) {
                const touch = e.touches[0];
                const rect = this.canvas.getBoundingClientRect();
                this.mousePos.x = touch.clientX - rect.left;
                this.mousePos.y = touch.clientY - rect.top;
                this.isShooting = true;
                this.hasShotThisClick = false; // Reset shot flag for new touch
                this.calculateShootDirection();
            }
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (this.gameRunning) {
                const touch = e.touches[0];
                const rect = this.canvas.getBoundingClientRect();
                this.mousePos.x = touch.clientX - rect.left;
                this.mousePos.y = touch.clientY - rect.top;
            }
        });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.isShooting = false;
        });
        
        // Game over screen buttons
        document.getElementById('restart-game').addEventListener('click', () => {
            this.restartGame();
        });
        
        document.getElementById('exit-game').addEventListener('click', () => {
            this.exitGame();
        });
        
        // Sound toggle button
        const soundToggle = document.getElementById('sound-toggle');
        if (soundToggle) {
            this.updateSoundToggleUI();
            soundToggle.addEventListener('click', () => {
                this.isMuted = !this.isMuted;
                localStorage.setItem('toaste_game_muted', String(this.isMuted));
                this.updateSoundToggleUI();
                if (this.isMuted && this.readyAudio) {
                    try { this.readyAudio.pause(); } catch {}
                }
            });
        }
    }
    
    updateSoundToggleUI() {
        const btn = document.getElementById('sound-toggle');
        if (!btn) return;
        if (this.isMuted) {
            btn.classList.add('muted');
            btn.setAttribute('aria-label', 'Sound off');
            btn.title = 'Sound off';
        } else {
            btn.classList.remove('muted');
            btn.setAttribute('aria-label', 'Sound on');
            btn.title = 'Sound on';
        }
    }
    
    setupGameUI() {
        this.updateUI();
    }
    
    calculateShootDirection() {
        if (this.toaster) {
            const dx = this.mousePos.x - this.toaster.x;
            const dy = this.mousePos.y - this.toaster.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            this.shootDirection.x = dx / distance;
            this.shootDirection.y = dy / distance;
        }
    }
    
    startGame() {
        this.showCountdown();
    }
    
    showCountdown() {
        const countdownScreen = document.getElementById('countdown-screen');
        const countdownNumber = document.getElementById('countdown-number');
        
        // Clear any previous timers before starting a new countdown
        this.clearTimers();
        countdownScreen.style.display = 'flex';
        countdownNumber.textContent = '3';
        
        // Start READY sound aligned with the 3-2-1 cadence
        this.playReadySound();
        
        let count = 3;
        const countdownInterval = setInterval(() => {
            count--;
            if (count > 0) {
                countdownNumber.textContent = count;
            } else {
                clearInterval(countdownInterval);
                this.countdownIntervalId = null;
                countdownNumber.textContent = 'POLO!';
                
                // Wait a bit longer for "POLO!" then start the game
                this.countdownTimeoutId = setTimeout(() => {
                    countdownScreen.style.display = 'none';
                    this.startGameplay();
                    this.countdownTimeoutId = null;
                }, 800);
            }
        }, 1000);
        this.countdownIntervalId = countdownInterval;
    }
    
    startGameplay() {
        // Force mobile viewport fix before starting gameplay
        if (window.innerWidth <= 768) {
            this.forceMobileViewport();
        }
        
        this.gameRunning = true;
        this.gameStartTime = Date.now();
        this.score = 0;
        this.lives = this.maxLives;
        this.rainSpawnRate = this.baseRainSpawnRate; // Reset spawn rate
        this.rainStartTime = Date.now() + 2000; // Start rain after 2 seconds
        
        // Initialize toaster
        this.toaster = {
            x: this.canvas.width / 2,
            y: this.canvas.height - 70,
            width: 80,
            height: 50,
            direction: 1,
            speed: this.toasterSpeed,
            bumpScale: 1.0,
            bumpDuration: 0,
            maxBumpDuration: 10, // frames
            opacity: 0, // Start invisible
            // Death animation properties
            isDead: false,
            deathBounce: 0,
            deathVelocity: { x: 0, y: -8 }, // Initial upward velocity
            deathRotation: 0,
            deathRotationSpeed: 0.1,
            // Removed bounce and rotation - keeping only inflation
        };
        
        // Clear arrays
        this.toasts = [];
        this.rainBalls = [];
        this.particles = [];
        
        // Initialize screen flash
        this.screenFlash = {
            active: false,
            duration: 0,
            maxDuration: 120, // 120ms flash - longer and more brutal
            flashCount: 0,
            maxFlashes: 1, // Normal hit = 1 flash
            isGameOver: false,
            flashDelay: 0,
            maxFlashDelay: 150 // 150ms delay between flashes
        };
        
        // Fade in UI
        const gameUI = document.getElementById('game-ui');
        gameUI.classList.add('fade-in');
        
        this.updateUI();
        this.gameLoop();
    }
    
    gameLoop() {
        // Continue game loop if game is running OR if flash sequence is active OR if toaster is dying
        if (!this.gameRunning && !this.screenFlash.active && !(this.toaster && this.toaster.isDead)) {
            // No more animation frames needed
            this.rafId = null;
            return;
        }
        
        this.update();
        this.render();
        
        this.rafId = requestAnimationFrame(() => this.gameLoop());
    }
    
    update() {
        // Always update screen flash (even when game is stopped)
        this.updateScreenFlash();
        
        // Always update toaster (for death animation even when game is stopped)
        this.updateToaster();
        
        // Only update other game elements if game is running
        if (this.gameRunning) {
            const currentTime = Date.now();
            this.score = Math.floor((currentTime - this.gameStartTime) / 1000);
            
            // Increase difficulty over time
            this.rainSpawnRate = this.baseRainSpawnRate + (this.score * this.difficultyIncreaseRate);
            
            this.updateToasts();
            this.updateRainBalls();
            this.updateParticles();
            this.checkCollisions();
            this.spawnRainBalls();
            
            if (this.isShooting) {
                this.spawnToasts();
            }
            
            this.updateUI();
        }
    }
    
    updateToaster() {
        if (!this.toaster) return;
        
        // Handle death animation
        if (this.toaster.isDead) {
            // Apply gravity
            this.toaster.deathVelocity.y += 0.3;
            
            // Update position
            this.toaster.x += this.toaster.deathVelocity.x;
            this.toaster.y += this.toaster.deathVelocity.y;
            
            // Update rotation
            this.toaster.deathRotation += this.toaster.deathRotationSpeed;
            
            // Bounce when hitting the ground (only for first few bounces)
            if (this.toaster.y >= this.canvas.height - this.toaster.height && this.toaster.deathBounce <= 2) {
                this.toaster.y = this.canvas.height - this.toaster.height;
                this.toaster.deathVelocity.y *= -0.6; // Bounce with energy loss
                this.toaster.deathBounce++;
                
                // Add some horizontal movement on bounce
                this.toaster.deathVelocity.x += (Math.random() - 0.5) * 2;
            }
            
            // After 2 bounces, let it fall through the ground
            if (this.toaster.deathBounce > 2) {
                this.toaster.deathVelocity.y = Math.abs(this.toaster.deathVelocity.y); // Always fall down
                this.toaster.deathVelocity.x = 0; // Stop horizontal movement
                // Don't constrain Y position - let it fall through the ground
            }
            
            // Fade out as it falls
            if (this.toaster.y > this.canvas.height + 100) {
                this.toaster.opacity = Math.max(0, this.toaster.opacity - 0.02);
            }
            
            return; // Skip normal toaster behavior when dead
        }
        
        // Handle fade-in effect (only when not dead)
        const currentTime = Date.now();
        const fadeStartTime = this.gameStartTime;
        const fadeDuration = 1000; // 1 second fade-in
        
        if (currentTime - fadeStartTime < fadeDuration) {
            const fadeProgress = (currentTime - fadeStartTime) / fadeDuration;
            this.toaster.opacity = Math.min(1, fadeProgress);
        } else {
            this.toaster.opacity = 1;
        }
        
        // Handle bump animation
        if (this.toaster.bumpDuration > 0) {
            this.toaster.bumpDuration--;
            // Create a smooth bump effect using sine wave
            const progress = 1 - (this.toaster.bumpDuration / this.toaster.maxBumpDuration);
            this.toaster.bumpScale = 1.0 + Math.sin(progress * Math.PI) * 0.05; // Scale from 1.0 to 1.05 and back
        } else {
            this.toaster.bumpScale = 1.0;
        }
        
        // Move toaster left and right
        this.toaster.x += this.toaster.direction * this.toaster.speed;
        
        // Bounce off walls
        if (this.toaster.x <= 0 || this.toaster.x >= this.canvas.width - this.toaster.width) {
            this.toaster.direction *= -1;
            this.toaster.x = Math.max(0, Math.min(this.canvas.width - this.toaster.width, this.toaster.x));
        }
        
        // Random direction changes
        if (Math.random() < 0.005) {
            this.toaster.direction *= -1;
        }
    }
    
    updateToasts() {
        for (let i = this.toasts.length - 1; i >= 0; i--) {
            const toast = this.toasts[i];
            toast.x += toast.vx;
            toast.y += toast.vy;
            toast.rotation += toast.rotationSpeed;
            
            // Remove toasts that are off screen
            if (toast.x < 0 || toast.x > this.canvas.width || 
                toast.y < 0 || toast.y > this.canvas.height) {
                this.toasts.splice(i, 1);
            }
        }
    }
    
    updateRainBalls() {
        for (let i = this.rainBalls.length - 1; i >= 0; i--) {
            const ball = this.rainBalls[i];
            ball.y += ball.speed;
            ball.rotation += ball.rotationSpeed;
            
            // Remove balls that are off screen
            if (ball.y > this.canvas.height) {
                this.rainBalls.splice(i, 1);
            }
        }
    }
    
    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life--;
            
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    updateScreenFlash() {
        if (this.screenFlash.active) {
            // If we're in a delay between flashes
            if (this.screenFlash.flashDelay > 0) {
                this.screenFlash.flashDelay += 16; // 16ms per frame
                if (this.screenFlash.flashDelay >= this.screenFlash.maxFlashDelay) {
                    this.screenFlash.flashDelay = 0;
                    this.screenFlash.duration = 0; // Start next flash
                }
                return;
            }
            
            // Flash is active
            this.screenFlash.duration += 16; // Assuming ~60fps, 16ms per frame
            
            if (this.screenFlash.duration >= this.screenFlash.maxDuration) {
                this.screenFlash.flashCount++;
                
                if (this.screenFlash.flashCount >= this.screenFlash.maxFlashes) {
                    this.screenFlash.active = false;
                    this.screenFlash.duration = 0;
                    this.screenFlash.flashCount = 0;
                    this.screenFlash.flashDelay = 0;
                    
                    // If this was a game over sequence, show game over screen
                    if (this.screenFlash.isGameOver) {
                        this.screenFlash.isGameOver = false;
                        this.showGameOverScreen();
                    }
                } else {
                    // Start delay before next flash
                    this.screenFlash.flashDelay = 16; // Start delay
                }
            }
        }
    }
    
    spawnToasts() {
        if (this.isShooting && this.toaster && !this.hasShotThisClick) {
            const currentTime = Date.now();
            
            // Check if enough time has passed since last shot
            if (currentTime - this.lastShotTime >= this.minShotInterval) {
                // Trigger bump animation
                this.toaster.bumpDuration = this.toaster.maxBumpDuration;
                
                // Play throw sound
                this.playRandomHitSound();
                
                this.toasts.push({
                    x: this.toaster.x + this.toaster.width / 2 - 12, // Center the toast
                    y: this.toaster.y - 18,
                    width: 24,
                    height: 24,
                    vx: this.shootDirection.x * this.toastSpeed,
                    vy: this.shootDirection.y * this.toastSpeed,
                    rotation: 0,
                    rotationSpeed: (Math.random() - 0.5) * 0.3 + 0.1 // Random spin speed between 0.1 and 0.4
                });
                
                this.lastShotTime = currentTime;
                this.hasShotThisClick = true; // Mark that we've shot for this click
            }
        }
    }
    
    spawnRainBalls() {
        // Don't spawn rain balls until 2 seconds have passed
        const currentTime = Date.now();
        if (currentTime < this.rainStartTime) {
            return;
        }
        
        if (Math.random() < this.rainSpawnRate) {
            const colorData = this.rainColors[Math.floor(Math.random() * this.rainColors.length)];
            this.rainBalls.push({
                x: Math.random() * this.canvas.width,
                y: -20,
                radius: 20, // Initial size for all rain balls
                originalRadius: 20, // Store original size for calculations
                color: colorData.color,
                label: colorData.label,
                hitsRequired: colorData.hitsRequired,
                hitsTaken: 0, // Track how many hits this ball has taken
                speed: Math.random() * 3 + this.rainSpeed,
                rotation: 0,
                rotationSpeed: (Math.random() - 0.5) * 0.2 // Random rotation speed -0.1 to +0.1
            });
        }
    }
    
    playRandomHitSound() {
        if (this.isMuted) return;
        try {
            const idx = Math.floor(Math.random() * 3) + 1; // 1-3
            const audio = new Audio(`/assets/sounds/hit-0${idx}.mp3`);
            audio.volume = 0.45;
            audio.playbackRate = 0.95 + Math.random() * 0.1;
            audio.play().catch(() => {});
        } catch {}
    }

    playRandomBangSound() {
        if (this.isMuted) return;
        try {
            const idx = Math.floor(Math.random() * 2) + 1; // 1-2
            const audio = new Audio(`/assets/sounds/bang-0${idx}.mp3`);
            audio.volume = 0.4;
            audio.playbackRate = 0.95 + Math.random() * 0.1;
            audio.play().catch(() => {});
        } catch {}
    }

    playRandomPunchSound() {
        if (this.isMuted) return;
        try {
            const idx = Math.floor(Math.random() * 2) + 1; // 1-2
            const audio = new Audio(`/assets/sounds/punch-0${idx}.mp3`);
            audio.volume = 0.35;
            audio.playbackRate = 0.95 + Math.random() * 0.1;
            audio.play().catch(() => {});
        } catch {}
    }

    playReadySound() {
        if (this.isMuted) return;
        try {
            if (this.readyAudio) {
                this.readyAudio.pause();
                this.readyAudio = null;
            }
            const audio = new Audio(`/assets/sounds/ready.mp3`);
            audio.volume = 0.25;
            audio.currentTime = 2.6;
            audio.play().catch(() => {});
            this.readyAudio = audio;
        } catch {}
    }

    playGameOverSound() {
        if (this.isMuted) return;
        try {
            const audio = new Audio(`/assets/sounds/awww.mp3`);
            audio.volume = 0.35;
            audio.play().catch(() => {});
        } catch {}
    }

    checkCollisions() {
        // Check toaster vs rain balls
        if (this.toaster) {
            for (let i = this.rainBalls.length - 1; i >= 0; i--) {
                const ball = this.rainBalls[i];
                if (this.circleRectCollision(ball, this.toaster)) {
                    this.lives--;
                    this.createParticles(ball.x, ball.y, ball.color);
                    this.playRandomPunchSound();
                    this.rainBalls.splice(i, 1);
                    
                    // Trigger screen flash
                    this.screenFlash.active = true;
                    this.screenFlash.duration = 0;
                    this.screenFlash.flashCount = 0;
                    this.screenFlash.flashDelay = 0;
                    
                    // If game over, trigger death animation and 5-flash sequence
                    if (this.lives <= 0) {
                        this.toaster.isDead = true;
                        this.toaster.deathVelocity.x = (Math.random() - 0.5) * 4; // Random horizontal velocity
                        this.toaster.deathVelocity.y = -8; // Upward velocity
                        this.toaster.deathRotationSpeed = (Math.random() - 0.5) * 0.2; // Random rotation speed
                        
                        this.screenFlash.maxFlashes = 5;
                        this.screenFlash.isGameOver = true;
                        this.gameRunning = false; // Stop the game immediately
                    } else {
                        this.screenFlash.maxFlashes = 1; // Normal hit
                        this.screenFlash.isGameOver = false;
                    }
                }
            }
        }
        
        // Check toasts vs rain balls
        for (let i = this.toasts.length - 1; i >= 0; i--) {
            const toast = this.toasts[i];
            for (let j = this.rainBalls.length - 1; j >= 0; j--) {
                const ball = this.rainBalls[j];
                if (this.circleRectCollision(ball, toast)) {
                    // Increment hit count
                    ball.hitsTaken++;
                    
                    // Create particles for the hit
                    this.createParticles(ball.x, ball.y, ball.color);
                    this.playRandomBangSound();
                    
                    // Remove the toast (it's consumed by the hit)
                    this.toasts.splice(i, 1);
                    
                    // Check if ball should be destroyed
                    if (ball.hitsTaken >= ball.hitsRequired) {
                        // Ball is destroyed - remove it
                        this.rainBalls.splice(j, 1);
                    } else {
                        // Ball survives - reduce its size
                        const sizeReduction = ball.originalRadius * 0.3; // Reduce by 30% each hit
                        ball.radius = Math.max(ball.originalRadius - (ball.hitsTaken * sizeReduction), ball.originalRadius * 0.2); // Minimum 20% of original size
                    }
                    break;
                }
            }
        }
    }
    
    circleRectCollision(circle, rect) {
        const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
        const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
        
        const distanceX = circle.x - closestX;
        const distanceY = circle.y - closestY;
        
        return (distanceX * distanceX + distanceY * distanceY) < (circle.radius * circle.radius);
    }
    
    createParticles(x, y, color) {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                color: color,
                life: 30
            });
        }
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#efca52';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw toaster
        if (this.toaster) {
            this.ctx.save();
            
            // Apply opacity for fade-in effect
            this.ctx.globalAlpha = this.toaster.opacity || 1;
            
            // Apply death rotation if dead
            if (this.toaster.isDead) {
                this.ctx.translate(this.toaster.x + this.toaster.width / 2, this.toaster.y + this.toaster.height / 2);
                this.ctx.rotate(this.toaster.deathRotation);
                this.ctx.translate(-this.toaster.width / 2, -this.toaster.height / 2);
            }
            
            // Apply bump scaling
            const scaledWidth = this.toaster.width * this.toaster.bumpScale;
            const scaledHeight = this.toaster.height * this.toaster.bumpScale;
            const offsetX = (this.toaster.width - scaledWidth) / 2;
            const offsetY = (this.toaster.height - scaledHeight) / 2;
            
            const finalX = this.toaster.isDead ? offsetX : this.toaster.x + offsetX;
            const finalY = this.toaster.isDead ? offsetY : this.toaster.y + offsetY;
            
            if (this.toasterImage.complete) {
                this.ctx.drawImage(this.toasterImage, finalX, finalY, scaledWidth, scaledHeight);
            } else {
                // Fallback rectangle if image not loaded yet
                this.ctx.fillStyle = '#2D2218';
                this.ctx.fillRect(finalX, finalY, scaledWidth, scaledHeight);
            }
            
            this.ctx.restore();
        }
        
        // Draw toasts
        for (const toast of this.toasts) {
            this.ctx.save();
            
            // Move to toast center for rotation
            this.ctx.translate(toast.x + toast.width / 2, toast.y + toast.height / 2);
            this.ctx.rotate(toast.rotation);
            
            if (this.toastImage.complete) {
                this.ctx.drawImage(this.toastImage, -toast.width / 2, -toast.height / 2, toast.width, toast.height);
            } else {
                // Fallback rectangle if image not loaded yet
                this.ctx.fillStyle = '#D4A574';
                this.ctx.fillRect(-toast.width / 2, -toast.height / 2, toast.width, toast.height);
            }
            
            this.ctx.restore();
        }
        
        // Draw rain balls
        for (const ball of this.rainBalls) {
            this.ctx.save();
            
            // Apply rotation
            this.ctx.translate(ball.x, ball.y);
            this.ctx.rotate(ball.rotation);
            
            // Draw the ball
            this.ctx.fillStyle = ball.color;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw the label
            this.ctx.fillStyle = '#2D2218';
            this.ctx.font = 'bold 12px FKRasterGrotesk';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(ball.label, 0, 0);
            
            this.ctx.restore();
        }
        
        // Draw particles
        for (const particle of this.particles) {
            this.ctx.fillStyle = particle.color;
            this.ctx.globalAlpha = particle.life / 30;
            this.ctx.fillRect(particle.x, particle.y, 4, 4);
            this.ctx.globalAlpha = 1;
        }
        
        // Draw crosshair when shooting
        if (this.isShooting && this.toaster) {
            this.ctx.strokeStyle = '#2D2218';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(this.mousePos.x - 10, this.mousePos.y);
            this.ctx.lineTo(this.mousePos.x + 10, this.mousePos.y);
            this.ctx.moveTo(this.mousePos.x, this.mousePos.y - 10);
            this.ctx.lineTo(this.mousePos.x, this.mousePos.y + 10);
            this.ctx.stroke();
        }
        
        // Draw screen flash
        if (this.screenFlash.active) {
            let flashAlpha = 0;
            
            // If we're in a delay between flashes, show no flash
            if (this.screenFlash.flashDelay > 0) {
                flashAlpha = 0;
            } else {
                // Flash is active, calculate alpha
                const flashProgress = this.screenFlash.duration / this.screenFlash.maxDuration;
                flashAlpha = Math.sin(flashProgress * Math.PI); // Fade in and out smoothly
            }
            
            this.ctx.save();
            this.ctx.globalAlpha = flashAlpha * 0.95; // 95% opacity max - more brutal
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.restore();
        }
    }
    
    updateUI() {
        document.getElementById('score-value').textContent = this.score;
        this.updateLivesDisplay();
    }
    
    updateLivesDisplay() {
        const toastIcons = document.querySelectorAll('.toast-live-icon');
        toastIcons.forEach((icon, index) => {
            if (index < this.lives) {
                icon.classList.remove('lost');
            } else {
                icon.classList.add('lost');
            }
        });
    }
    
    
    showGameOverScreen() {
        this.playGameOverSound();
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('game-over-screen').classList.remove('hidden');
    }
    
    gameOver() {
        // This method is now handled by triggerGameOverSequence
        // Keep it for compatibility but it shouldn't be called directly
    }
    
    restartGame() {
        document.getElementById('game-over-screen').classList.add('hidden');
        // Ensure previous loop/timers are stopped and transient state reset
        this.fullStop();
        // Reset toaster to alive state
        if (this.toaster) {
            this.toaster.isDead = false;
            this.toaster.x = this.canvas.width / 2;
            this.toaster.y = this.canvas.height - 70;
            this.toaster.deathBounce = 0;
            this.toaster.deathVelocity = { x: 0, y: -8 };
            this.toaster.deathRotation = 0;
            this.toaster.deathRotationSpeed = 0.1;
            this.toaster.opacity = 0; // Will fade in during startGameplay
        }
        this.startGame();
    }
    
    exitGame() {
        // Stop game loop and timers, reset transient effects
        this.fullStop();
        document.getElementById('game-over-screen').classList.add('hidden');
        document.getElementById('game-overlay').classList.add('hidden');
        document.querySelector('.main-content').classList.remove('fade-out');
        
        // Remove game-active class from body for mobile
        document.body.classList.remove('game-active');
    }
    
    // Helpers to ensure proper teardown and a clean restart
    clearTimers() {
        if (this.countdownIntervalId) {
            clearInterval(this.countdownIntervalId);
            this.countdownIntervalId = null;
        }
        if (this.countdownTimeoutId) {
            clearTimeout(this.countdownTimeoutId);
            this.countdownTimeoutId = null;
        }
    }
    
    fullStop() {
        // Stop gameplay and animation frames
        this.gameRunning = false;
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        // Clear countdown timers
        this.clearTimers();
        // Reset transient visual states so loop termination condition is met
        if (this.screenFlash) {
            this.screenFlash.active = false;
            this.screenFlash.duration = 0;
            this.screenFlash.flashCount = 0;
            this.screenFlash.flashDelay = 0;
            this.screenFlash.isGameOver = false;
        }
        if (this.toaster) {
            this.toaster.isDead = false;
        }
        // Clear dynamic entities
        this.toasts = [];
        this.rainBalls = [];
        this.particles = [];
    }
}

// Game activation system
class GameActivator {
    constructor() {
        this.clickCount = 0;
        this.clickTimeout = null;
        this.clickWindow = 1000; // 1 second window for consecutive clicks
        this.game = null;
        this.logoAnimating = false; // Flag to prevent multiple logo animations
        
        this.init();
    }
    
    init() {
        const logoContainer = document.querySelector('.logo-container');
        if (logoContainer) {
            // Mouse down events (triggers when mouse button is pressed)
            logoContainer.addEventListener('mousedown', (e) => {
                this.handleClick(e);
            });
            
            // Touch events for mobile
            logoContainer.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.handleClick(e);
            });
        }
    }
    
    handleClick(e) {
        e.preventDefault();
        
        // Clear existing timeout first
        if (this.clickTimeout) {
            clearTimeout(this.clickTimeout);
        }
        
        // Start click window (pause toaster movements) if this is the first click
        if (this.clickCount === 0 && window.toasterMovementControl) {
            window.toasterMovementControl.startClickWindow();
        }
        
        this.clickCount++;
        console.log(`Logo clicked! Count: ${this.clickCount}/10`);
        
        // Animate the main logo on each click
        this.animateMainLogo();
        
        // Animate the toaster based on click count
        this.animateToaster();
        
        // If we've reached 10 clicks, activate the game
        if (this.clickCount >= 10) {
            console.log('🎮 Game activated! 10 consecutive clicks detected!');
            this.activateGame();
            return;
        }
        
        // Set timeout to reset click count if no more clicks come in
        this.clickTimeout = setTimeout(() => {
            console.log(`⏰ Click timeout! Resetting count from ${this.clickCount} to 0`);
            this.clickCount = 0;
            // Reset toaster to original size when clicks reset
            this.resetToaster();
            // End click window (resume toaster movements)
            if (window.toasterMovementControl) {
                window.toasterMovementControl.endClickWindow();
            }
        }, this.clickWindow);
    }
    
    animateMainLogo() {
        const logoContainer = document.querySelector('.logo-container');
        if (!logoContainer) return;

        // Prevent multiple animations from running simultaneously
        if (this.logoAnimating) {
            console.log('Logo animation already running, skipping...');
            return;
        }
        
        console.log('Starting logo animation...');
        this.logoAnimating = true;

        const maxInflation = 1.05; // 5% inflation like in the game
        const animationDuration = 200; // 200ms total animation

        // Simple CSS transition animation
        logoContainer.style.transition = `transform ${animationDuration}ms ease-in-out`;
        
        // Inflate
        logoContainer.style.transform = `scale(${maxInflation})`;
        
        // After half the duration, deflate
        setTimeout(() => {
            logoContainer.style.transform = 'scale(1.0)';
        }, animationDuration / 2);
        
        // Reset after animation completes
        setTimeout(() => {
            logoContainer.style.transition = '';
            this.logoAnimating = false;
            console.log('Logo animation complete');
        }, animationDuration);
    }
    
    animateToaster() {
        const toaster = document.querySelector('#toaster');
        if (!toaster) return;
        
        // Ensure transform origin is set to center for proper scaling
        toaster.style.transformOrigin = 'center center';
        
        // Calculate inflation based on click count (0-10)
        // Start at 1.0 (normal size) and go up to 1.15 (15% inflation) at 10 clicks
        const inflationProgress = this.clickCount / 10;
        const targetScale = 1.0 + (inflationProgress * 0.15);
        
        // Calculate upward movement to keep toaster within SVG bounds
        // Move up more as it inflates to prevent overflow
        const upwardMovement = inflationProgress * 8; // 0-8px upward movement
        
        // Create bouncy animation sequence
        this.performBouncyInflation(toaster, targetScale, upwardMovement);
        
        console.log(`Toaster inflating to ${targetScale.toFixed(2)}x and moving up ${upwardMovement.toFixed(1)}px (${this.clickCount}/10 clicks)`);
    }
    
    performBouncyInflation(toaster, targetScale, upwardMovement) {
        // First bounce: overshoot the target (reduced bounce)
        const overshootScale = targetScale + 0.04; // 4% overshoot (reduced from 8%)
        const overshootUpward = upwardMovement + 1; // Extra upward movement for bounce (reduced from 2)
        
        // Set bouncy transition for the overshoot (less aggressive easing)
        toaster.style.transition = 'transform 0.18s cubic-bezier(0.68, -0.25, 0.265, 1.25)';
        toaster.style.transform = `translateY(-${overshootUpward}px) scale(${overshootScale})`;
        
        // Second bounce: settle to target with slight undershoot
        setTimeout(() => {
            const undershootScale = targetScale - 0.015; // 1.5% undershoot (reduced from 2%)
            const undershootUpward = upwardMovement - 0.3; // Reduced from 0.5
            
            toaster.style.transition = 'transform 0.12s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            toaster.style.transform = `translateY(-${undershootUpward}px) scale(${undershootScale})`;
            
            // Final settle: reach exact target
            setTimeout(() => {
                toaster.style.transition = 'transform 0.08s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                toaster.style.transform = `translateY(-${upwardMovement}px) scale(${targetScale})`;
            }, 120); // Reduced from 150ms
        }, 180); // Reduced from 200ms
    }
    
    resetToaster() {
        const toaster = document.querySelector('#toaster');
        if (!toaster) return;
        
        // Ensure transform origin is set to center for proper scaling
        toaster.style.transformOrigin = 'center center';
        
        // Reset toaster to original size and position
        toaster.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        toaster.style.transform = 'translateY(0px) scale(1.0)';
        
        console.log('Toaster reset to original size and position');
    }
    
    activateGame() {
        this.clickCount = 0;
        
        // End click window (resume toaster movements) when game activates
        if (window.toasterMovementControl) {
            window.toasterMovementControl.endClickWindow();
        }
        
        // Fade out main content
        const mainContent = document.querySelector('.main-content');
        mainContent.classList.add('fade-out');
        
        // Show game overlay after fade
        setTimeout(() => {
            const gameOverlay = document.getElementById('game-overlay');
            gameOverlay.classList.remove('hidden');
            
            // Add game-active class to body for mobile
            document.body.classList.add('game-active');
            
            // Initialize and start game
            if (!this.game) {
                this.game = new ToasterGame();
            } else {
                // If a game instance exists, ensure it's fully stopped before starting again
                this.game.fullStop();
            }
            this.game.startGame();
        }, 1000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new GameActivator();
});
