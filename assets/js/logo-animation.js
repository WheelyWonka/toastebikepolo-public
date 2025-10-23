document.addEventListener('DOMContentLoaded', async () => {
    // First, load the SVG content
    try {
        const response = await fetch('/assets/graphics/logo.svg');
        const svgContent = await response.text();
        
        // Add the SVG content directly to the container
        document.querySelector('.logo-container').innerHTML = svgContent;

        // Now that the SVG is loaded, we can select its elements
        const eyeLeft = document.querySelector('#eye-left');
        const eyeRight = document.querySelector('#eye-right');
        const containerLeft = document.querySelector('#eye-container-left');
        const containerRight = document.querySelector('#eye-container-right');
        const svg = document.querySelector('svg');

        // Cache SVG bounds to avoid repeated calculations
        let svgRect = null;
        let svgScale = null;
        
        function updateSVGBounds() {
            svgRect = svg.getBoundingClientRect();
            svgScale = svgRect.width / svg.viewBox.baseVal.width;
        }

        function getContainerBounds(container) {
            if (!svgRect || !svgScale) {
                updateSVGBounds();
            }
            
            const bounds = container.getBBox();
            
            return {
                left: svgRect.left + (bounds.x * svgScale),
                top: svgRect.top + (bounds.y * svgScale),
                width: bounds.width * svgScale,
                height: bounds.height * svgScale,
                centerX: svgRect.left + ((bounds.x + bounds.width / 2) * svgScale),
                centerY: svgRect.top + ((bounds.y + bounds.height / 2) * svgScale)
            };
        }

        function moveEye(eye, container, mouseX, mouseY) {
            const bounds = getContainerBounds(container);
            
            // Calculate the vector from center to mouse
            const dx = mouseX - bounds.centerX;
            const dy = mouseY - bounds.centerY;
            
            // Calculate the angle
            const angle = Math.atan2(dy, dx);
            
            // Calculate the maximum radius (distance from center to edge)
            const maxRadius = Math.min(bounds.width, bounds.height) * 0.35;
            
            // Calculate the distance from center to mouse, capped at maxRadius
            const distance = Math.min(Math.hypot(dx, dy), maxRadius);
            
            // Calculate the final position
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;
            
            // Apply the transform with will-change for better performance
            eye.style.willChange = 'transform';
            eye.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        }

        function moveEyes(event) {
            // Update SVG bounds on each move to handle window resizing
            updateSVGBounds();
            
            // Move both eyes in the same frame
            requestAnimationFrame(() => {
            moveEye(eyeLeft, containerLeft, event.clientX, event.clientY);
            moveEye(eyeRight, containerRight, event.clientX, event.clientY);
            });
        }

        // Add mouse move event listener for desktop
        document.addEventListener('mousemove', moveEyes);

        // Add touch support for mobile (on entire document to catch all touches)
        document.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            moveEyes({
                clientX: touch.clientX,
                clientY: touch.clientY
            });
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
                const touch = e.touches[0];
                moveEyes({
                    clientX: touch.clientX,
                    clientY: touch.clientY
                });
            }, { passive: true });

        // Simple sound helper (random hit)
        function playRandomHit() {
            try {
                const idx = Math.floor(Math.random() * 3) + 1; // 1-3
                const audio = new Audio(`/assets/sounds/hit-0${idx}.mp3`);
                audio.volume = 0.5;
                audio.playbackRate = 0.95 + Math.random() * 0.1; // slight pitch variation
                audio.play().catch(() => {});
            } catch {}
        }

        // Toast projectile from logo toward left/right
        function getElementCenterRect(el) {
            const r = el.getBoundingClientRect();
            return {
                x: r.left + r.width / 2,
                y: r.top + r.height / 2,
                width: r.width,
                height: r.height
            };
        }

        function launchToastProjectile() {
            const modelContainer = document.getElementById('model-container');
            if (!modelContainer) return;

            // Play throw sound
            playRandomHit();

            // Compute start (logo center)
            const logoRect = getElementCenterRect(document.querySelector('.logo-container'));

            const start = { x: logoRect.x, y: logoRect.y };
            // Choose a random horizontal direction from the logo (left or right)
            const dir = Math.random() < 0.5 ? -1 : 1;
            const distanceX = 260 + Math.random() * 240; // 260-500px horizontally
            const end = {
                x: start.x + dir * distanceX,
                // End well below viewport so it exits the screen
                y: window.innerHeight + 160 + Math.random() * 160
            };

            // Create toast element
            const img = document.createElement('img');
            img.src = '/assets/graphics/toast.svg';
            img.alt = 'toast';
            img.style.position = 'fixed';
            img.style.left = '-28px';
            img.style.top = '-43px';
            img.style.width = '56px';
            img.style.height = '56px';
            img.style.transform = `translate3d(${start.x}px, ${start.y}px, 0) rotate(0deg)`;
            img.style.willChange = 'transform, opacity';
            img.style.pointerEvents = 'none';
            img.style.zIndex = '10';
            document.body.appendChild(img);

            // Arc control point (higher arc upward) and slight lateral curve
            const arcBoost = Math.max(420, Math.abs(end.x - start.x) * 0.8);
            const lateralCurve = (Math.random() * 2 - 1) * 60; // more pronounced sideways arc
            const mid = {
                x: (start.x + end.x) / 2 + lateralCurve,
                y: Math.min(start.y, end.y) - arcBoost
            };

            const duration = 1600 + Math.random() * 800; // ms - slower, floatier per toast
            const startTime = performance.now();
            const spin = (Math.random() * 2 - 1) * 360; // random spin

            function quadBezier(p0, p1, p2, t) {
                const inv = 1 - t;
                return {
                    x: inv * inv * p0.x + 2 * inv * t * p1.x + t * t * p2.x,
                    y: inv * inv * p0.y + 2 * inv * t * p1.y + t * t * p2.y
                };
            }

            function easeOutCubic(t) {
                return 1 - Math.pow(1 - t, 3);
            }

            function animate() {
                const now = performance.now();
                const rawT = Math.min(1, (now - startTime) / duration);
                const t = easeOutCubic(rawT);
                const p = quadBezier(start, mid, end, t);
                const rot = spin * t;
                img.style.transform = `translate3d(${p.x}px, ${p.y}px, 0) rotate(${rot}deg)`;
                // Slight hover scale for floatiness
                const scale = 1 + 0.05 * Math.sin(t * Math.PI);
                img.style.transform += ` scale(${scale})`;
                img.style.opacity = String(1 - t * 0.1);
                if (rawT < 1) {
                    requestAnimationFrame(animate);
                } else {
                    img.remove();
                }
            }

            requestAnimationFrame(animate);
        }

        // Fire a toast on each click/tap on the logo
        // Note: Game activation (10 clicks) is handled in game.js
        const logoContainer = document.querySelector('.logo-container');
        if (logoContainer) {
            logoContainer.addEventListener('mousedown', (e) => {
                // Don't prevent default here - let the game activation system handle it
                launchToastProjectile();
                blinkEyes();
            });
            logoContainer.addEventListener('touchstart', (e) => {
                // Don't prevent default here - let the game activation system handle it
                launchToastProjectile();
                blinkEyes();
            }, { passive: true });
        }

        // Eye blinking animation
        function blinkEyes() {
            const eyesOpened = document.querySelector('#eyes-opened');
            const eyesClosed = document.querySelector('#eyes-closed');
            
            if (!eyesOpened || !eyesClosed) return;
            
            // Hide opened eyes, show closed eyes
            eyesOpened.style.display = 'none';
            eyesClosed.style.display = 'block';
            
            // After a short delay, show opened eyes again
            setTimeout(() => {
                eyesOpened.style.display = 'block';
                eyesClosed.style.display = 'none';
            }, 150); // 150ms blink duration
        }

        // Toaster movement animation system
        function startToasterMovements() {
            const toaster = document.querySelector('#toaster');
            if (!toaster) return;
            
            // Set initial transform origin to center for natural movements
            toaster.style.transformOrigin = 'center center';
            toaster.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            
            // Movement control variables
            let isHovered = false;
            let isInClickWindow = false;
            let movementTimeout = null;
            let isAnimating = false;
            
            // Different movement types
            const movementTypes = ['shake', 'vibrate', 'wiggle'];
            
            // Hover event listeners on both toaster and logo container
            const logoContainer = document.querySelector('.logo-container');
            
            function handleMouseEnter() {
                isHovered = true;
                console.log('Logo area hovered - pausing random movements');
            }
            
            function handleMouseLeave() {
                isHovered = false;
                console.log('Logo area unhovered - resuming random movements');
                // Resume movements if not currently animating
                if (!isAnimating) {
                    performMovement();
                }
            }
            
            // Add hover listeners to both toaster and logo container
            toaster.addEventListener('mouseenter', handleMouseEnter);
            toaster.addEventListener('mouseleave', handleMouseLeave);
            
            if (logoContainer) {
                logoContainer.addEventListener('mouseenter', handleMouseEnter);
                logoContainer.addEventListener('mouseleave', handleMouseLeave);
            }
            
            function performMovement() {
                // Don't start new movements if hovered, in click window, or already animating
                if (isHovered || isInClickWindow || isAnimating) {
                    return;
                }
                
                // Random delay between movements (2-6 seconds)
                const nextMovementDelay = 2000 + Math.random() * 4000;
                
                movementTimeout = setTimeout(() => {
                    // Check again if we should still perform movement
                    if (isHovered || isInClickWindow || isAnimating) {
                        return;
                    }
                    
                    const movementType = movementTypes[Math.floor(Math.random() * movementTypes.length)];
                    isAnimating = true;
                    
                    switch (movementType) {
                        case 'jump':
                            performJump();
                            break;
                        case 'slide':
                            performSlide();
                            break;
                        case 'shake':
                            performShake();
                            break;
                        case 'vibrate':
                            performVibrate();
                            break;
                        case 'wiggle':
                            performWiggle();
                            break;
                    }
                    
                    // Schedule next movement after current animation completes
                    setTimeout(() => {
                        isAnimating = false;
                        performMovement();
                    }, 1000); // Give time for animation to complete
                }, nextMovementDelay);
            }
            
            function performJump() {
                // Jump with slight horizontal movement and rotation
                const jumpHeight = 6 + Math.random() * 3; // 6-9px jump
                const jumpDistance = (Math.random() - 0.5) * 4; // -2 to +2px horizontal
                const rotation = (Math.random() - 0.5) * 6; // -3 to +3 degrees
                
                toaster.style.transform = `translate(${jumpDistance}px, -${jumpHeight}px) rotate(${rotation}deg)`;
                
                setTimeout(() => {
                    if (!isHovered) { // Only continue if not hovered
                        const landRotation = rotation * 0.3;
                        toaster.style.transform = `translate(${jumpDistance * 0.7}px, -${jumpHeight * 0.2}px) rotate(${landRotation}deg)`;
                        
                        setTimeout(() => {
                            if (!isHovered) { // Only land if not hovered
                                toaster.style.transform = 'translate(0px, 0px) rotate(0deg)';
                            }
                        }, 150);
                    }
                }, 250);
            }
            
            function performSlide() {
                // Gentle slide left or right
                const slideDistance = (Math.random() - 0.5) * 8; // -4 to +4px
                const slightRotation = (Math.random() - 0.5) * 2; // -1 to +1 degrees
                
                toaster.style.transform = `translate(${slideDistance}px, 0px) rotate(${slightRotation}deg)`;
                
                setTimeout(() => {
                    if (!isHovered) { // Only return to center if not hovered
                        toaster.style.transform = 'translate(0px, 0px) rotate(0deg)';
                    }
                }, 400);
            }
            
            function performShake() {
                // Quick horizontal shake
                const shakeIntensity = 2 + Math.random() * 2; // 2-4px
                let shakeCount = 0;
                const maxShakes = 4 + Math.floor(Math.random() * 3); // 4-6 shakes
                
                function doShake() {
                    if (shakeCount >= maxShakes || isHovered) {
                        if (!isHovered) {
                            toaster.style.transform = 'translate(0px, 0px) rotate(0deg)';
                        }
                        return;
                    }
                    
                    const shakeX = (Math.random() - 0.5) * shakeIntensity;
                    const shakeY = (Math.random() - 0.5) * (shakeIntensity * 0.3);
                    const shakeRot = (Math.random() - 0.5) * 1;
                    
                    toaster.style.transform = `translate(${shakeX}px, ${shakeY}px) rotate(${shakeRot}deg)`;
                    shakeCount++;
                    
                    setTimeout(doShake, 80 + Math.random() * 40); // 80-120ms between shakes
                }
                
                doShake();
            }
            
            function performVibrate() {
                // Subtle vibration with small movements
                const vibrateIntensity = 1 + Math.random() * 1.5; // 1-2.5px
                let vibrateCount = 0;
                const maxVibrates = 6 + Math.floor(Math.random() * 4); // 6-9 vibrations
                
                function doVibrate() {
                    if (vibrateCount >= maxVibrates || isHovered) {
                        if (!isHovered) {
                            toaster.style.transform = 'translate(0px, 0px) rotate(0deg)';
                        }
                        return;
                    }
                    
                    const vibrateX = (Math.random() - 0.5) * vibrateIntensity;
                    const vibrateY = (Math.random() - 0.5) * vibrateIntensity;
                    const vibrateRot = (Math.random() - 0.5) * 0.5;
                    
                    toaster.style.transform = `translate(${vibrateX}px, ${vibrateY}px) rotate(${vibrateRot}deg)`;
                    vibrateCount++;
                    
                    setTimeout(doVibrate, 60 + Math.random() * 30); // 60-90ms between vibrations
                }
                
                doVibrate();
            }
            
            function performWiggle() {
                // Gentle wiggle with rotation
                const wiggleIntensity = 1.5 + Math.random() * 1; // 1.5-2.5px
                const wiggleRotation = (Math.random() - 0.5) * 4; // -2 to +2 degrees
                let wiggleCount = 0;
                const maxWiggles = 3 + Math.floor(Math.random() * 2); // 3-4 wiggles
                
                function doWiggle() {
                    if (wiggleCount >= maxWiggles || isHovered) {
                        if (!isHovered) {
                            toaster.style.transform = 'translate(0px, 0px) rotate(0deg)';
                        }
                        return;
                    }
                    
                    const wiggleX = (Math.random() - 0.5) * wiggleIntensity;
                    const wiggleY = (Math.random() - 0.5) * (wiggleIntensity * 0.5);
                    const currentRot = wiggleRotation * (wiggleCount % 2 === 0 ? 1 : -1);
                    
                    toaster.style.transform = `translate(${wiggleX}px, ${wiggleY}px) rotate(${currentRot}deg)`;
                    wiggleCount++;
                    
                    setTimeout(doWiggle, 120 + Math.random() * 60); // 120-180ms between wiggles
                }
                
                doWiggle();
            }
            
            // Expose functions to control click window state
            window.toasterMovementControl = {
                startClickWindow: () => {
                    isInClickWindow = true;
                    console.log('Click window started - pausing toaster movements');
                },
                endClickWindow: () => {
                    isInClickWindow = false;
                    console.log('Click window ended - resuming toaster movements');
                    // Resume movements if not currently animating and not hovered
                    if (!isAnimating && !isHovered) {
                        performMovement();
                    }
                }
            };
            
            // Start the movement cycle
            performMovement();
        }

        // Start toaster movement animations after a short delay
        setTimeout(startToasterMovements, 2000);

    } catch (error) {
        console.error('Error loading SVG:', error);
    }
}); 