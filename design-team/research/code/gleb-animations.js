/**
 * Gleb Kuznetsov Animation Library
 * Extracted and optimized motion patterns for CastMatch
 */

import * as THREE from 'three';
import { gsap } from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import SimplexNoise from 'simplex-noise';

// Register custom easing functions
CustomEase.create('gleb-ease-in', '0.55, 0.055, 0.675, 0.19');
CustomEase.create('gleb-ease-out', '0.215, 0.61, 0.355, 1');
CustomEase.create('gleb-ease-in-out', '0.645, 0.045, 0.355, 1');
CustomEase.create('gleb-elastic', '0.68, -0.55, 0.265, 1.55');

/**
 * Core Animation System
 */
export class GlebMotionSystem {
  constructor() {
    this.simplex = new SimplexNoise();
    this.animations = new Map();
    this.rafId = null;
  }

  /**
   * 3D Card Flip Animation
   */
  createCardFlip(element, options = {}) {
    const defaults = {
      duration: 0.6,
      rotationY: 180,
      scale: 1.1,
      perspective: 1000,
      easing: 'gleb-elastic'
    };
    
    const config = { ...defaults, ...options };
    
    return gsap.timeline()
      .to(element, {
        rotationY: config.rotationY / 2,
        scale: config.scale,
        duration: config.duration / 2,
        ease: config.easing,
        transformPerspective: config.perspective
      })
      .to(element, {
        rotationY: config.rotationY,
        scale: 1,
        duration: config.duration / 2,
        ease: config.easing
      });
  }

  /**
   * Organic Morph Animation
   */
  createOrganicMorph(mesh, targetGeometry, options = {}) {
    const defaults = {
      duration: 1.2,
      noiseAmplitude: 0.5,
      noiseFrequency: 0.02,
      easing: 'power2.inOut'
    };
    
    const config = { ...defaults, ...options };
    
    // Store original positions
    const originalPositions = mesh.geometry.attributes.position.array.slice();
    const targetPositions = targetGeometry.attributes.position.array;
    
    // Create morph animation
    const morphAnimation = {
      progress: 0,
      noise: 0
    };
    
    return gsap.to(morphAnimation, {
      progress: 1,
      noise: 1,
      duration: config.duration,
      ease: config.easing,
      onUpdate: () => {
        const positions = mesh.geometry.attributes.position;
        
        for (let i = 0; i < positions.count; i++) {
          const i3 = i * 3;
          
          // Linear interpolation between original and target
          let x = originalPositions[i3] + (targetPositions[i3] - originalPositions[i3]) * morphAnimation.progress;
          let y = originalPositions[i3 + 1] + (targetPositions[i3 + 1] - originalPositions[i3 + 1]) * morphAnimation.progress;
          let z = originalPositions[i3 + 2] + (targetPositions[i3 + 2] - originalPositions[i3 + 2]) * morphAnimation.progress;
          
          // Add organic noise
          const noise = this.simplex.noise3D(
            x * config.noiseFrequency,
            y * config.noiseFrequency,
            z * config.noiseFrequency + morphAnimation.noise
          ) * config.noiseAmplitude * (1 - Math.abs(morphAnimation.progress - 0.5) * 2);
          
          positions.setXYZ(i, x + noise, y + noise, z + noise);
        }
        
        positions.needsUpdate = true;
      }
    });
  }

  /**
   * Particle Burst Effect
   */
  createParticleBurst(origin, options = {}) {
    const defaults = {
      count: 100,
      spread: 50,
      velocity: 5,
      gravity: -0.2,
      duration: 2,
      size: 0.1,
      color: 0x00ff88,
      fadeOut: true
    };
    
    const config = { ...defaults, ...options };
    
    // Create particle geometry
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(config.count * 3);
    const velocities = new Float32Array(config.count * 3);
    const lifetimes = new Float32Array(config.count);
    
    // Initialize particles
    for (let i = 0; i < config.count; i++) {
      const i3 = i * 3;
      
      // Random position within spread
      positions[i3] = origin.x + (Math.random() - 0.5) * config.spread;
      positions[i3 + 1] = origin.y + (Math.random() - 0.5) * config.spread;
      positions[i3 + 2] = origin.z + (Math.random() - 0.5) * config.spread;
      
      // Random velocity
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      velocities[i3] = Math.sin(phi) * Math.cos(theta) * config.velocity;
      velocities[i3 + 1] = Math.sin(phi) * Math.sin(theta) * config.velocity;
      velocities[i3 + 2] = Math.cos(phi) * config.velocity;
      
      // Random lifetime
      lifetimes[i] = Math.random() * config.duration;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));
    
    // Create material with vertex shader
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        size: { value: config.size },
        color: { value: new THREE.Color(config.color) },
        gravity: { value: config.gravity }
      },
      vertexShader: `
        attribute vec3 velocity;
        attribute float lifetime;
        uniform float time;
        uniform float size;
        uniform float gravity;
        varying float vAlpha;
        
        void main() {
          float age = mod(time, lifetime);
          float normalizedAge = age / lifetime;
          
          vec3 pos = position + velocity * age;
          pos.y += 0.5 * gravity * age * age;
          
          vAlpha = 1.0 - normalizedAge;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (1.0 - normalizedAge) * 100.0 / -mvPosition.z;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        varying float vAlpha;
        
        void main() {
          float r = length(gl_PointCoord - 0.5);
          if (r > 0.5) discard;
          
          float alpha = vAlpha * (1.0 - r * 2.0);
          gl_FragColor = vec4(color, alpha);
        }
      `,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      transparent: true
    });
    
    const particles = new THREE.Points(geometry, material);
    
    // Animate particles
    const animate = () => {
      material.uniforms.time.value += 0.016;
      
      if (material.uniforms.time.value < config.duration) {
        this.rafId = requestAnimationFrame(animate);
      } else {
        // Cleanup
        particles.geometry.dispose();
        particles.material.dispose();
        if (particles.parent) {
          particles.parent.remove(particles);
        }
      }
    };
    
    animate();
    return particles;
  }

  /**
   * Wave Propagation Effect
   */
  createWavePropagation(mesh, options = {}) {
    const defaults = {
      amplitude: 10,
      frequency: 0.1,
      speed: 2,
      damping: 0.95,
      duration: 3
    };
    
    const config = { ...defaults, ...options };
    
    const geometry = mesh.geometry;
    const originalPositions = geometry.attributes.position.array.slice();
    
    const waveAnimation = {
      time: 0,
      amplitude: config.amplitude
    };
    
    return gsap.to(waveAnimation, {
      time: config.duration,
      amplitude: 0,
      duration: config.duration,
      ease: 'power2.out',
      onUpdate: () => {
        const positions = geometry.attributes.position;
        
        for (let i = 0; i < positions.count; i++) {
          const i3 = i * 3;
          const x = originalPositions[i3];
          const y = originalPositions[i3 + 1];
          const z = originalPositions[i3 + 2];
          
          // Calculate distance from center
          const distance = Math.sqrt(x * x + z * z);
          
          // Calculate wave displacement
          const wavePhase = distance * config.frequency - waveAnimation.time * config.speed;
          const displacement = Math.sin(wavePhase) * waveAnimation.amplitude * Math.exp(-distance * 0.01);
          
          positions.setY(i, y + displacement);
        }
        
        positions.needsUpdate = true;
      }
    });
  }

  /**
   * Glass Material Creation
   */
  createGlassMaterial(options = {}) {
    const defaults = {
      color: 0xffffff,
      roughness: 0.05,
      metalness: 0.1,
      transmission: 0.95,
      thickness: 0.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.0,
      ior: 1.5,
      envMapIntensity: 1
    };
    
    const config = { ...defaults, ...options };
    
    return new THREE.MeshPhysicalMaterial({
      color: config.color,
      roughness: config.roughness,
      metalness: config.metalness,
      transmission: config.transmission,
      thickness: config.thickness,
      clearcoat: config.clearcoat,
      clearcoatRoughness: config.clearcoatRoughness,
      ior: config.ior,
      envMapIntensity: config.envMapIntensity,
      side: THREE.DoubleSide
    });
  }

  /**
   * Magnetic Snap Animation
   */
  createMagneticSnap(element, target, options = {}) {
    const defaults = {
      threshold: 100,
      strength: 0.5,
      duration: 0.3,
      ease: 'power2.out'
    };
    
    const config = { ...defaults, ...options };
    
    let isSnapped = false;
    
    const updatePosition = (e) => {
      const rect = target.getBoundingClientRect();
      const targetX = rect.left + rect.width / 2;
      const targetY = rect.top + rect.height / 2;
      
      const distance = Math.sqrt(
        Math.pow(e.clientX - targetX, 2) + 
        Math.pow(e.clientY - targetY, 2)
      );
      
      if (distance < config.threshold && !isSnapped) {
        isSnapped = true;
        
        gsap.to(element, {
          x: targetX - e.clientX,
          y: targetY - e.clientY,
          scale: 1.1,
          duration: config.duration,
          ease: config.ease,
          onComplete: () => {
            // Trigger snap event
            element.dispatchEvent(new CustomEvent('magneticsnap', {
              detail: { target }
            }));
          }
        });
      } else if (distance >= config.threshold && isSnapped) {
        isSnapped = false;
        
        gsap.to(element, {
          x: 0,
          y: 0,
          scale: 1,
          duration: config.duration,
          ease: config.ease
        });
      }
    };
    
    document.addEventListener('mousemove', updatePosition);
    
    // Return cleanup function
    return () => {
      document.removeEventListener('mousemove', updatePosition);
    };
  }

  /**
   * Elastic Band Selection
   */
  createElasticBand(container, options = {}) {
    const defaults = {
      color: 'rgba(0, 255, 136, 0.2)',
      borderColor: 'rgba(0, 255, 136, 0.8)',
      elasticity: 0.8,
      friction: 0.2
    };
    
    const config = { ...defaults, ...options };
    
    const band = document.createElement('div');
    band.style.cssText = `
      position: absolute;
      background: ${config.color};
      border: 2px solid ${config.borderColor};
      pointer-events: none;
      will-change: transform;
      transform-origin: top left;
    `;
    
    let isSelecting = false;
    let startX, startY;
    
    container.addEventListener('mousedown', (e) => {
      isSelecting = true;
      startX = e.clientX;
      startY = e.clientY;
      
      band.style.left = startX + 'px';
      band.style.top = startY + 'px';
      band.style.width = '0px';
      band.style.height = '0px';
      
      container.appendChild(band);
    });
    
    container.addEventListener('mousemove', (e) => {
      if (!isSelecting) return;
      
      const currentX = e.clientX;
      const currentY = e.clientY;
      
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);
      
      gsap.to(band, {
        width: width,
        height: height,
        x: currentX < startX ? currentX - startX : 0,
        y: currentY < startY ? currentY - startY : 0,
        duration: 0.1,
        ease: 'power2.out'
      });
    });
    
    container.addEventListener('mouseup', () => {
      if (!isSelecting) return;
      
      isSelecting = false;
      
      gsap.to(band, {
        scale: 0.9,
        opacity: 0,
        duration: 0.3,
        ease: 'back.in',
        onComplete: () => {
          if (band.parentNode) {
            band.parentNode.removeChild(band);
          }
        }
      });
    });
  }

  /**
   * Neural Network Visualization
   */
  createNeuralNetwork(container, options = {}) {
    const defaults = {
      nodes: 24,
      layers: 3,
      nodeRadius: 4,
      connectionOpacity: 0.3,
      pulseFrequency: 0.5,
      colorScheme: {
        input: 0x00ff88,
        hidden: 0x0088ff,
        output: 0xff0088
      }
    };
    
    const config = { ...defaults, ...options };
    
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);
    
    // Create nodes
    const nodeGeometry = new THREE.SphereGeometry(config.nodeRadius, 32, 16);
    const nodes = [];
    const connections = [];
    
    const nodesPerLayer = Math.floor(config.nodes / config.layers);
    
    for (let layer = 0; layer < config.layers; layer++) {
      const layerColor = layer === 0 ? config.colorScheme.input :
                        layer === config.layers - 1 ? config.colorScheme.output :
                        config.colorScheme.hidden;
      
      for (let i = 0; i < nodesPerLayer; i++) {
        const material = new THREE.MeshPhongMaterial({
          color: layerColor,
          emissive: layerColor,
          emissiveIntensity: 0.5
        });
        
        const node = new THREE.Mesh(nodeGeometry, material);
        
        // Position nodes
        const x = (layer - config.layers / 2) * 100;
        const y = (i - nodesPerLayer / 2) * 30;
        const z = 0;
        
        node.position.set(x, y, z);
        nodes.push(node);
        scene.add(node);
        
        // Create connections to previous layer
        if (layer > 0) {
          const prevLayerStart = (layer - 1) * nodesPerLayer;
          const prevLayerEnd = layer * nodesPerLayer;
          
          for (let j = prevLayerStart; j < prevLayerEnd; j++) {
            const geometry = new THREE.BufferGeometry().setFromPoints([
              nodes[j].position,
              node.position
            ]);
            
            const material = new THREE.LineBasicMaterial({
              color: 0xffffff,
              opacity: config.connectionOpacity,
              transparent: true
            });
            
            const connection = new THREE.Line(geometry, material);
            connections.push(connection);
            scene.add(connection);
          }
        }
      }
    }
    
    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    
    const pointLight = new THREE.PointLight(0xffffff, 1, 100);
    pointLight.position.set(0, 0, 50);
    scene.add(pointLight);
    
    camera.position.z = 300;
    
    // Animate
    const animate = () => {
      requestAnimationFrame(animate);
      
      const time = Date.now() * 0.001;
      
      // Pulse nodes
      nodes.forEach((node, i) => {
        const scale = 1 + Math.sin(time * config.pulseFrequency + i * 0.1) * 0.1;
        node.scale.set(scale, scale, scale);
      });
      
      // Animate connections
      connections.forEach((connection, i) => {
        connection.material.opacity = config.connectionOpacity + 
          Math.sin(time * 2 + i * 0.1) * 0.1;
      });
      
      renderer.render(scene, camera);
    };
    
    animate();
    
    return { scene, camera, renderer, nodes, connections };
  }

  /**
   * Cleanup all animations
   */
  destroy() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    
    this.animations.forEach(animation => {
      if (animation.kill) animation.kill();
    });
    
    this.animations.clear();
  }
}

// Export singleton instance
export default new GlebMotionSystem();