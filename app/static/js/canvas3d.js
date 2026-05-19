/* ==========================================================================
   AETHER THREE.JS BACKGROUND COMPONENT — LUXURY INTERACTIVE NEURAL NETWORK
   ========================================================================== */

class AmbientSpace {
    constructor() {
        this.canvas = document.getElementById('three-webgl-canvas-id');
        if (!this.canvas) return;

        this.scene = new THREE.Scene();
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        
        this.setupCamera();
        this.setupRenderer();
        this.setupParticles();
        this.setupMouseListener();
        this.setupResizeListener();
        this.animate();
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(60, this.width / this.height, 0.1, 100);
        this.camera.position.z = 28;
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            antialias: true
        });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    setupParticles() {
        this.particleCount = 85;
        this.maxDistance = 8.5; // Distance threshold for network connections
        this.geometry = new THREE.BufferGeometry();
        this.positions = new Float32Array(this.particleCount * 3);
        this.velocities = [];

        // Distribute points in space
        for (let i = 0; i < this.particleCount; i++) {
            const x = (Math.random() - 0.5) * 55;
            const y = (Math.random() - 0.5) * 45;
            const z = (Math.random() - 0.5) * 25;

            this.positions[i * 3] = x;
            this.positions[i * 3 + 1] = y;
            this.positions[i * 3 + 2] = z;

            // Drift speeds
            this.velocities.push({
                x: (Math.random() - 0.5) * 0.015,
                y: (Math.random() - 0.5) * 0.015,
                z: (Math.random() - 0.5) * 0.008
            });
        }

        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

        // Generate round blur texture
        const texture = this.createCircleTexture();

        // Points Material
        this.material = new THREE.PointsMaterial({
            color: 0x00E5FF, // Glow teal base
            size: 0.18,
            map: texture,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.particleSystem = new THREE.Points(this.geometry, this.material);
        this.scene.add(this.particleSystem);

        // Lines/Network Mesh Setup
        this.lineGeometry = new THREE.BufferGeometry();
        this.lineMaterial = new THREE.LineBasicMaterial({
            color: 0x00E5FF,
            transparent: true,
            opacity: 0.12,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        // Dynamic lines position buffer
        this.linePositions = new Float32Array(this.particleCount * this.particleCount * 6);
        this.lineGeometry.setAttribute('position', new THREE.BufferAttribute(this.linePositions, 3));
        
        this.lineSystem = new THREE.LineSegments(this.lineGeometry, this.lineMaterial);
        this.scene.add(this.lineSystem);
    }

    createCircleTexture() {
        const matCanvas = document.createElement('canvas');
        matCanvas.width = 16;
        matCanvas.height = 16;
        const matContext = matCanvas.getContext('2d');

        const grad = matContext.createRadialGradient(8, 8, 0, 8, 8, 8);
        grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
        grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        matContext.fillStyle = grad;
        matContext.fillRect(0, 0, 16, 16);

        const texture = new THREE.Texture(matCanvas);
        texture.needsUpdate = true;
        return texture;
    }

    setupMouseListener() {
        this.mouse = { x: 0, y: 0 };
        this.targetMouse = { x: 0, y: 0 };

        window.addEventListener('mousemove', (e) => {
            this.targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        });
    }

    setupResizeListener() {
        window.addEventListener('resize', () => {
            this.width = window.innerWidth;
            this.height = window.innerHeight;

            this.camera.aspect = this.width / this.height;
            this.camera.updateProjectionMatrix();

            this.renderer.setSize(this.width, this.height);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Smooth mouse lerping
        this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.05;
        this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.05;

        // Subtle automatic rotation
        this.particleSystem.rotation.y += 0.0002;
        this.particleSystem.rotation.x += 0.0001;
        this.lineSystem.rotation.y = this.particleSystem.rotation.y;
        this.lineSystem.rotation.x = this.particleSystem.rotation.x;

        // Theme adjustments
        const isLight = document.body.classList.contains('light-theme');
        if (isLight) {
            this.material.color.setHex(0x1E1B3A); // Slate Indigo
            this.lineMaterial.color.setHex(0x1E1B3A);
            this.material.opacity = 0.45;
            this.lineMaterial.opacity = 0.07;
        } else {
            this.material.color.setHex(0x00E5FF); // Electric Teal
            this.lineMaterial.color.setHex(0x00E5FF);
            this.material.opacity = 0.65;
            this.lineMaterial.opacity = 0.14;
        }

        const positions = this.particleSystem.geometry.attributes.position.array;
        const linePositions = this.lineSystem.geometry.attributes.position.array;

        // Convert mouse position to approximate 3D coordinates
        const mouseX3d = this.mouse.x * 24;
        const mouseY3d = this.mouse.y * 18;

        // Update positions & bounds loop
        for (let i = 0; i < this.particleCount; i++) {
            positions[i * 3] += this.velocities[i].x;
            positions[i * 3 + 1] += this.velocities[i].y;
            positions[i * 3 + 2] += this.velocities[i].z;

            const rX = 32;
            const rY = 26;
            const rZ = 20;

            if (positions[i * 3] > rX) positions[i * 3] = -rX;
            if (positions[i * 3] < -rX) positions[i * 3] = rX;
            if (positions[i * 3 + 1] > rY) positions[i * 3 + 1] = -rY;
            if (positions[i * 3 + 1] < -rY) positions[i * 3 + 1] = rY;
            if (positions[i * 3 + 2] > rZ) positions[i * 3 + 2] = -rZ;
            if (positions[i * 3 + 2] < -rZ) positions[i * 3 + 2] = rZ;

            // Cursor gravity interaction
            const dx = positions[i * 3] - mouseX3d;
            const dy = positions[i * 3 + 1] - mouseY3d;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 8.0) {
                const force = (8.0 - dist) * 0.012;
                positions[i * 3] += (dx / dist) * force;
                positions[i * 3 + 1] += (dy / dist) * force;
            }
        }

        // Generate lines between close points
        let lineIndex = 0;
        for (let i = 0; i < this.particleCount; i++) {
            for (let j = i + 1; j < this.particleCount; j++) {
                const dx = positions[i * 3] - positions[j * 3];
                const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
                const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                if (dist < this.maxDistance) {
                    linePositions[lineIndex++] = positions[i * 3];
                    linePositions[lineIndex++] = positions[i * 3 + 1];
                    linePositions[lineIndex++] = positions[i * 3 + 2];

                    linePositions[lineIndex++] = positions[j * 3];
                    linePositions[lineIndex++] = positions[j * 3 + 1];
                    linePositions[lineIndex++] = positions[j * 3 + 2];
                }
            }
        }

        this.particleSystem.geometry.attributes.position.needsUpdate = true;
        this.lineSystem.geometry.setDrawRange(0, lineIndex);
        this.lineSystem.geometry.attributes.position.needsUpdate = true;

        this.renderer.render(this.scene, this.camera);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.ambientChamber = new AmbientSpace();
});
