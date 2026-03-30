/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { AppState, SimulationVoxel, RebuildTarget, VoxelData } from '../types';
import { CONFIG, COLORS } from '../utils/voxelConstants';

export class VoxelEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private instanceMesh: THREE.InstancedMesh | null = null;
  private dummy = new THREE.Object3D();
  
  private voxels: SimulationVoxel[] = [];
  private rebuildTargets: RebuildTarget[] = [];
  private rebuildStartTime: number = 0;
  
  private state: AppState = AppState.STABLE;
  private onStateChange: (state: AppState) => void;
  private onCountChange: (count: number) => void;
  private animationId: number = 0;

  constructor(
    container: HTMLElement, 
    onStateChange: (state: AppState) => void,
    onCountChange: (count: number) => void
  ) {
    this.container = container;
    this.onStateChange = onStateChange;
    this.onCountChange = onCountChange;

    // Init Three.js
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(CONFIG.BG_COLOR);
    this.scene.fog = new THREE.Fog(CONFIG.BG_COLOR, 60, 140); // Reduced haze

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.001, 1000);
    // Slightly zoomed out start position
    this.camera.position.set(30, 30, 60);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.5;
    this.controls.target.set(0, 5, 0);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(50, 80, 30);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.left = -40;
    dirLight.shadow.camera.right = 40;
    dirLight.shadow.camera.top = 40;
    dirLight.shadow.camera.bottom = -40;
    this.scene.add(dirLight);

    // Floor
    const planeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 1 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), planeMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = CONFIG.FLOOR_Y;
    floor.receiveShadow = true;
    this.scene.add(floor);

    this.animate = this.animate.bind(this);
    this.animate();
  }

  public loadInitialModel(data: VoxelData[]) {
    this.createVoxels(data);
    this.onCountChange(this.voxels.length);
    this.state = AppState.STABLE;
    this.onStateChange(this.state);
  }

  private createVoxels(data: VoxelData[]) {
    // Clear existing
    if (this.instanceMesh) {
      this.scene.remove(this.instanceMesh);
      this.instanceMesh.geometry.dispose();
      if (Array.isArray(this.instanceMesh.material)) {
          this.instanceMesh.material.forEach(m => m.dispose());
      } else {
          this.instanceMesh.material.dispose();
      }
    }

    this.voxels = data.map((v, i) => {
        const c = new THREE.Color(v.color);
        // Slight color variation for realism
        c.offsetHSL(0, 0, (Math.random() * 0.1) - 0.05);
        return {
            id: i,
            x: v.x, y: v.y, z: v.z, color: c,
            vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, rz: 0,
            rvx: 0, rvy: 0, rvz: 0
        };
    });

    const geometry = new THREE.BoxGeometry(CONFIG.VOXEL_SIZE - 0.05, CONFIG.VOXEL_SIZE - 0.05, CONFIG.VOXEL_SIZE - 0.05);
    const material = new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0.1 });
    this.instanceMesh = new THREE.InstancedMesh(geometry, material, this.voxels.length);
    this.instanceMesh.castShadow = true;
    this.instanceMesh.receiveShadow = true;
    this.instanceMesh.frustumCulled = false;
    this.scene.add(this.instanceMesh);

    this.draw();
  }

  private draw() {
    if (!this.instanceMesh) return;
    this.voxels.forEach((v, i) => {
        this.dummy.position.set(v.x, v.y, v.z);
        this.dummy.rotation.set(v.rx, v.ry, v.rz);
        this.dummy.updateMatrix();
        this.instanceMesh!.setMatrixAt(i, this.dummy.matrix);
        this.instanceMesh!.setColorAt(i, v.color);
    });
    this.instanceMesh.instanceMatrix.needsUpdate = true;
    this.instanceMesh.instanceColor!.needsUpdate = true;
  }

  public generateEffect(data: VoxelData[]) {
    if (this.state === AppState.GENERATING) return;

    // Clear existing and create new voxels at scattered positions
    if (this.instanceMesh) {
      this.scene.remove(this.instanceMesh);
      this.instanceMesh.geometry.dispose();
      if (Array.isArray(this.instanceMesh.material)) {
          this.instanceMesh.material.forEach(m => m.dispose());
      } else {
          this.instanceMesh.material.dispose();
      }
    }

    this.voxels = data.map((v, i) => {
        const c = new THREE.Color(v.color);
        c.offsetHSL(0, 0, (Math.random() * 0.1) - 0.05);
        
        // Start scattered high up in the air
        const startX = v.x + (Math.random() - 0.5) * 40;
        const startY = v.y + 40 + Math.random() * 40;
        const startZ = v.z + (Math.random() - 0.5) * 40;
        
        return {
            id: i,
            x: startX, y: startY, z: startZ, color: c,
            vx: 0, vy: 0, vz: 0, 
            rx: Math.random() * Math.PI * 2, 
            ry: Math.random() * Math.PI * 2, 
            rz: Math.random() * Math.PI * 2,
            rvx: 0, rvy: 0, rvz: 0
        };
    });

    const geometry = new THREE.BoxGeometry(CONFIG.VOXEL_SIZE - 0.05, CONFIG.VOXEL_SIZE - 0.05, CONFIG.VOXEL_SIZE - 0.05);
    const material = new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0.1 });
    this.instanceMesh = new THREE.InstancedMesh(geometry, material, this.voxels.length);
    this.instanceMesh.castShadow = true;
    this.instanceMesh.receiveShadow = true;
    this.instanceMesh.frustumCulled = false;
    this.scene.add(this.instanceMesh);

    this.onCountChange(this.voxels.length);

    // Set targets to their final positions
    this.rebuildTargets = data.map((v, i) => {
        // Delay based on y position so bottom builds first
        const h = Math.max(0, (v.y - CONFIG.FLOOR_Y) / 15);
        return {
            x: v.x, y: v.y, z: v.z,
            delay: h * 600 + Math.random() * 200
        };
    });

    this.rebuildStartTime = Date.now();
    this.state = AppState.GENERATING;
    this.onStateChange(this.state);
  }

  private updatePhysics() {
    if (this.state === AppState.GENERATING) {
        const now = Date.now();
        const elapsed = now - this.rebuildStartTime;
        let allDone = true;

        this.voxels.forEach((v, i) => {
            const t = this.rebuildTargets[i];
            if (!t) return;

            if (elapsed < t.delay) {
                allDone = false;
                // Add a slight floating effect while waiting
                v.y += Math.sin(now * 0.005 + i) * 0.05;
                v.rx += 0.02;
                v.ry += 0.02;
                return;
            }

            // Spring physics for snapping into place
            const speed = 0.15;
            v.x += (t.x - v.x) * speed;
            v.y += (t.y - v.y) * speed;
            v.z += (t.z - v.z) * speed;
            
            // Rotate back to zero
            v.rx += (0 - v.rx) * speed;
            v.ry += (0 - v.ry) * speed;
            v.rz += (0 - v.rz) * speed;

            // Check if reached
            if ((t.x - v.x) ** 2 + (t.y - v.y) ** 2 + (t.z - v.z) ** 2 > 0.01) {
                allDone = false;
            } else {
                // Snap to grid
                v.x = t.x; v.y = t.y; v.z = t.z;
                v.rx = 0; v.ry = 0; v.rz = 0;
            }
        });

        if (allDone) {
            this.state = AppState.STABLE;
            this.onStateChange(this.state);
        }
    }
  }

  private animate() {
    this.animationId = requestAnimationFrame(this.animate);
    this.controls.update();
    this.updatePhysics();
    
    // Optimize: only draw if moving
    if (this.state !== AppState.STABLE || this.controls.autoRotate) {
        this.draw();
    }
    
    this.renderer.render(this.scene, this.camera);
  }

  public handleResize() {
      if (this.camera && this.renderer) {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
      }
  }
  
  public setAutoRotate(enabled: boolean) {
    if (this.controls) {
        this.controls.autoRotate = enabled;
    }
  }

  public getJsonData(): string {
      const data = this.voxels.map((v, i) => ({
          id: i,
          x: +v.x.toFixed(2),
          y: +v.y.toFixed(2),
          z: +v.z.toFixed(2),
          c: '#' + v.color.getHexString()
      }));
      return JSON.stringify(data, null, 2);
  }
  
  public getUniqueColors(): string[] {
    const colors = new Set<string>();
    this.voxels.forEach(v => {
        colors.add('#' + v.color.getHexString());
    });
    return Array.from(colors);
  }

  public cleanup() {
    cancelAnimationFrame(this.animationId);
    this.container.removeChild(this.renderer.domElement);
    this.renderer.dispose();
  }
}
