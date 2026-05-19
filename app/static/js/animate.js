/* ==========================================================================
   AETHER ANIMATION SYSTEM — GSAP, LENIS, AND INTERACTIVE LUXURY EFFECT BUNDLE
   ========================================================================== */

class AnimationController {
    constructor() {
        this.glow = document.getElementById('custom-cursor-glow-id');
        this.dot = document.getElementById('custom-cursor-dot-id');
        this.topNavbar = document.getElementById('app-navbar-top');
        
        this.initLenis();
        this.initCursorFollower();
        this.initPreloader();
        this.initMagneticButtons();
        this.initTiltCards();
    }

    /* Initialize Lenis Smooth Scroll */
    initLenis() {
        const scrollContainer = document.getElementById('main-content-scroll-container');
        if (!scrollContainer) return;

        this.lenis = new Lenis({
            wrapper: scrollContainer,
            content: scrollContainer.querySelector('.page-viewport-container'),
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true
        });

        // Request animation loop for Lenis
        const step = (time) => {
            this.lenis.raf(time);
            requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }

    /* Cinematic Cursor Follower */
    initCursorFollower() {
        if (!this.glow || !this.dot) return;

        window.addEventListener('mousemove', (e) => {
            // Glow smooth hover track
            gsap.to(this.glow, {
                x: e.clientX,
                y: e.clientY,
                duration: 0.8,
                ease: "power3.out"
            });

            // Tight cursor dot track
            gsap.to(this.dot, {
                x: e.clientX,
                y: e.clientY,
                duration: 0.1,
                ease: "none"
            });
        });

        // Click actions
        window.addEventListener('mousedown', () => {
            gsap.to(this.dot, { scale: 0.7, duration: 0.15 });
        });
        window.addEventListener('mouseup', () => {
            gsap.to(this.dot, { scale: 1, duration: 0.15 });
        });

        // Magnetic and hover tracking hooks
        this.refreshHoverTargets();
    }

    refreshHoverTargets() {
        if (!this.dot) return;

        const targets = document.querySelectorAll('button, a, select, input, textarea, .kanban-task-card, .calendar-day-cell, .accent-dot, .theme-switch-btn');
        targets.forEach(t => {
            t.addEventListener('mouseenter', () => this.dot.classList.add('hovered'));
            t.addEventListener('mouseleave', () => this.dot.classList.remove('hovered'));
        });
    }

    /* Cinematic Preloader Timeline */
    initPreloader() {
        const preloader = document.getElementById('cinematic-preloader-id');
        const percentageNum = document.getElementById('preloader-percentage-num');
        const statusMsg = document.getElementById('preloader-status-message');
        const fillBar = document.getElementById('preloader-progress-bar-fill');
        const logoCircle = document.getElementById('logo-circle-svg');
        const logoCheck = document.getElementById('logo-check-svg');

        if (!preloader) return;

        // Reset SVG dashes
        if (logoCircle) logoCircle.style.strokeDashoffset = '283';
        if (logoCheck) logoCheck.style.strokeDashoffset = '100';

        const tl = gsap.timeline({
            onComplete: () => {
                // Exit Preloader
                gsap.to(preloader, {
                    opacity: 0,
                    scale: 1.05,
                    filter: "blur(20px)",
                    duration: 1.2,
                    ease: "power4.inOut",
                    onComplete: () => {
                        preloader.style.display = 'none';
                        this.revealDashboard();
                    }
                });
            }
        });

        // 1. Draw SVG Logo Circle
        if (logoCircle) {
            tl.to(logoCircle, {
                strokeDashoffset: 0,
                duration: 1.8,
                ease: "power2.inOut"
            });
        }

        // 2. Increment bar and stagger status logs
        const counter = { val: 0 };
        tl.to(counter, {
            val: 100,
            duration: 3,
            ease: "power2.out",
            onUpdate: () => {
                const percent = Math.floor(counter.val);
                if (percentageNum) percentageNum.textContent = `${percent.toString().padStart(2, '0')}%`;
                if (fillBar) fillBar.style.width = `${percent}%`;

                // Update text cues
                if (percent < 30) {
                    if (statusMsg) statusMsg.textContent = 'Stabilizing quantum core...';
                } else if (percent < 65) {
                    if (statusMsg) statusMsg.textContent = 'Synchronizing calendar node...';
                } else if (percent < 90) {
                    if (statusMsg) statusMsg.textContent = 'Triggering Aether AI matrix...';
                } else {
                    if (statusMsg) statusMsg.textContent = 'Establishing clean flow state.';
                }
            }
        }, "-=1.0");

        // 3. Draw Inner Check icon
        if (logoCheck) {
            tl.to(logoCheck, {
                strokeDashoffset: 0,
                duration: 0.8,
                ease: "back.out(2)"
            }, "-=0.8");
        }
    }

    revealDashboard() {
        // Reveal layouts staggered
        const topNavbar = document.getElementById('app-navbar-top');
        const pageHeader = document.getElementById('main-nav-bar-id');
        const bentoGrid = document.querySelector('.bento-grid-dashboard');

        const timeline = gsap.timeline();

        if (topNavbar) {
            timeline.fromTo(topNavbar, 
                { y: -50, opacity: 0 },
                { y: 0, opacity: 1, duration: 1.2, ease: "power4.out" }
            );
        }

        if (pageHeader) {
            timeline.fromTo(pageHeader,
                { y: -30, opacity: 0 },
                { y: 0, opacity: 1, duration: 1, ease: "power3.out" },
                "-=0.8"
            );
        }

        if (bentoGrid) {
            const cards = bentoGrid.querySelectorAll('.bento-card, .hero-bento-section > div');
            timeline.fromTo(cards,
                { y: 30, opacity: 0 },
                { y: 0, opacity: 1, stagger: 0.08, duration: 1.2, ease: "power3.out" },
                "-=0.6"
            );
        }
    }

    /* Magnetic Buttons Physics */
    initMagneticButtons() {
        const magneticBtns = document.querySelectorAll('.magnetic-btn');
        magneticBtns.forEach(btn => {
            btn.addEventListener('mousemove', (e) => {
                const rect = btn.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;

                // Drag button center elements slightly
                gsap.to(btn, {
                    x: x * 0.35,
                    y: y * 0.35,
                    duration: 0.3,
                    ease: "power2.out"
                });

                const innerSpan = btn.querySelector('span, i');
                if (innerSpan) {
                    gsap.to(innerSpan, {
                        x: x * 0.15,
                        y: y * 0.15,
                        duration: 0.3,
                        ease: "power2.out"
                    });
                }
            });

            btn.addEventListener('mouseleave', () => {
                // Spring return physics
                gsap.to(btn, {
                    x: 0,
                    y: 0,
                    duration: 0.6,
                    ease: "elastic.out(1, 0.4)"
                });

                const innerSpan = btn.querySelector('span, i');
                if (innerSpan) {
                    gsap.to(innerSpan, {
                        x: 0,
                        y: 0,
                        duration: 0.6,
                        ease: "elastic.out(1, 0.4)"
                    });
                }
            });
        });
    }

    /* 3D Card Tilt Glow */
    initTiltCards() {
        const cards = document.querySelectorAll('.tilt-card');
        cards.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                // Tilt angles
                const rotateY = ((x / rect.width) - 0.5) * 12; // Max 6 deg
                const rotateX = -(((y / rect.height) - 0.5) * 12);

                gsap.to(card, {
                    rotateX: rotateX,
                    rotateY: rotateY,
                    transformPerspective: 800,
                    duration: 0.4,
                    ease: "power2.out"
                });
            });

            card.addEventListener('mouseleave', () => {
                // Return safely
                gsap.to(card, {
                    rotateX: 0,
                    rotateY: 0,
                    duration: 0.8,
                    ease: "power3.out"
                });
            });
        });
    }

    /* View Switch GSAP transition */
    switchTabView(oldViewId, newViewId, onComplete) {
        const oldView = document.getElementById(oldViewId);
        const newView = document.getElementById(newViewId);

        if (!oldView || !newView) return;

        // Clean page scroll top on view change
        if (this.lenis) {
            this.lenis.scrollTo(0, { immediate: true });
        }

        const tl = gsap.timeline();

        // 1. Shrink and Fade Old View
        tl.to(oldView, {
            opacity: 0,
            scale: 0.96,
            y: -15,
            filter: "blur(6px)",
            duration: 0.4,
            ease: "power2.inOut",
            onComplete: () => {
                oldView.classList.remove('active');
                newView.classList.add('active');
                if (onComplete) onComplete();
            }
        });

        // 2. Expand and Fade New View
        tl.fromTo(newView,
            { opacity: 0, scale: 1.04, y: 25, filter: "blur(8px)" },
            { opacity: 1, scale: 1, y: 0, filter: "blur(0px)", duration: 0.8, ease: "power4.out" }
        );
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.anims = new AnimationController();
});
