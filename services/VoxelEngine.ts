/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { AppState, SimulationVoxel, RebuildTarget, VoxelData, BrickPiece, BrickInstance } from '../types';
import { CONFIG, COLORS } from '../utils/voxelConstants';
import { getBrickGeometry } from './brickMeshLibrary';

type EngineMode = 'voxel' | 'brick';

const HIGHLIGHT_COLOR = new THREE.Color(0xef4444);

export class VoxelEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private instanceMesh: THREE.InstancedMesh | null = null;
  private dummy = new THREE.Object3D();
  private initialCameraPosition = new THREE.Vector3(30, 30, 60);
  private initialCameraTarget = new THREE.Vector3(0, 5, 0);

  private voxels: SimulationVoxel[] = [];
  private rebuildTargets: RebuildTarget[] = [];
  private rebuildStartTime: number = 0;

  private mode: EngineMode = 'voxel';
  private bricks: BrickInstance[] = [];
  private brickMeshes: Map<string, THREE.InstancedMesh> = new Map();
  private highlightedBrickIds: Set<string> = new Set();
  private brickColorOverrides: Map<string, THREE.Color> = new Map();
  private raycaster = new THREE.Raycaster();

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

    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.001, 1000);
    // Slightly zoomed out start position
    this.camera.position.copy(this.initialCameraPosition);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.5;
    this.controls.target.copy(this.initialCameraTarget);

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
    this.mode = 'voxel';
    this.bricks = [];
    this.clearBrickMeshes();
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

    this.mode = 'voxel';
    this.bricks = [];
    this.clearBrickMeshes();

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
    if (this.mode === 'brick') {
      this.updateBrickPhysics();
    } else {
      this.updatePhysics();
    }

    // Optimize: only draw if moving
    if (this.state !== AppState.STABLE || this.controls.autoRotate) {
      if (this.mode === 'brick') this.drawBricks();
      else this.draw();
    }

    this.renderer.render(this.scene, this.camera);
  }

  public handleResize() {
      if (this.camera && this.renderer) {
        const w = this.container.clientWidth || window.innerWidth;
        const h = this.container.clientHeight || window.innerHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
      }
  }
  
  public setAutoRotate(enabled: boolean) {
    if (this.controls) {
        this.controls.autoRotate = enabled;
    }
  }

  /**
   * Enable/disable OrbitControls. Used to free the canvas for picking events
   * (e.g. manual click-to-paint). When disabled, autoRotate also pauses so
   * the model stays still while the user aims at a brick.
   */
  public setControlsEnabled(enabled: boolean) {
    if (!this.controls) return;
    this.controls.enabled = enabled;
    if (!enabled) {
      this.controls.autoRotate = false;
    }
  }

  /** The renderer's canvas element. Caller can attach event listeners directly
   *  (e.g. paint-mode click handlers) — bypasses any DOM-bubbling quirks. */
  public getDomElement(): HTMLCanvasElement {
    return this.renderer.domElement;
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

  public getCameraState(): { position: THREE.Vector3; target: THREE.Vector3 } {
    return {
      position: this.camera.position.clone(),
      target: this.controls.target.clone(),
    };
  }

  public setCameraState(position: THREE.Vector3, target: THREE.Vector3) {
    this.camera.position.copy(position);
    this.controls.target.copy(target);
  }

  public resetView() {
    this.camera.position.copy(this.initialCameraPosition);
    this.controls.target.copy(this.initialCameraTarget);
    this.controls.update();
  }

  // ===================== Brick mode =====================

  /**
   * Compute centering offsets so the model sits with bottom on the floor (y=0)
   * and is centered on x=0, z=0. Mirrors voxel-mode `normalizeModel` in modelImport.
   */
  private computeBrickNormalization(bricks: BrickPiece[]): { dx: number; dy: number; dz: number } {
    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    let minLayer = Infinity;
    for (const b of bricks) {
      if (b.baseX < minX) minX = b.baseX;
      if (b.baseX + b.sizeX - 1 > maxX) maxX = b.baseX + b.sizeX - 1;
      if (b.baseY < minZ) minZ = b.baseY;
      if (b.baseY + b.sizeY - 1 > maxZ) maxZ = b.baseY + b.sizeY - 1;
      if (b.layer < minLayer) minLayer = b.layer;
    }
    const centerX = Math.round((minX + maxX) / 2);
    const centerZ = Math.round((minZ + maxZ) / 2);
    return { dx: -centerX, dy: -minLayer, dz: -centerZ };
  }

  private clearBrickMeshes() {
    this.brickMeshes.forEach((mesh) => {
      this.scene.remove(mesh);
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose());
      } else {
        mesh.material.dispose();
      }
      // Don't dispose geometry — it's cached in brickMeshLibrary.
    });
    this.brickMeshes.clear();
  }

  private clearAllMeshes() {
    if (this.instanceMesh) {
      this.scene.remove(this.instanceMesh);
      this.instanceMesh.geometry.dispose();
      if (Array.isArray(this.instanceMesh.material)) {
        this.instanceMesh.material.forEach((m) => m.dispose());
      } else {
        this.instanceMesh.material.dispose();
      }
      this.instanceMesh = null;
    }
    this.clearBrickMeshes();
  }

  private buildBrickInstances(bricks: BrickPiece[]): BrickInstance[] {
    const { dx, dy, dz } = this.computeBrickNormalization(bricks);

    // Group by size to assign slot indices.
    const slotCounters: Map<string, number> = new Map();
    return bricks.map((b) => {
      const sizeKey = `${b.sizeX}x${b.sizeY}`;
      const slotIdx = slotCounters.get(sizeKey) ?? 0;
      slotCounters.set(sizeKey, slotIdx + 1);

      const centerX = b.baseX + (b.sizeX - 1) / 2 + dx;
      const centerY = b.layer + dy;
      const centerZ = b.baseY + (b.sizeY - 1) / 2 + dz;

      const baseColor = new THREE.Color(b.color);
      baseColor.offsetHSL(0, 0, (Math.random() * 0.1) - 0.05);

      return {
        id: b.id,
        sizeX: b.sizeX,
        sizeY: b.sizeY,
        baseX: b.baseX,
        baseY: b.baseY,
        layer: b.layer,
        x: centerX,
        y: centerY,
        z: centerZ,
        targetX: centerX,
        targetY: centerY,
        targetZ: centerZ,
        baseColor,
        color: baseColor.clone(),
        vx: 0, vy: 0, vz: 0,
        rx: 0, ry: 0, rz: 0,
        rvx: 0, rvy: 0, rvz: 0,
        sizeKey,
        slotIdx,
      };
    });
  }

  private buildBrickInstancedMeshes() {
    // Group bricks by size; for each size, build an InstancedMesh sized to its count.
    const countsBySize = new Map<string, number>();
    for (const b of this.bricks) {
      countsBySize.set(b.sizeKey, (countsBySize.get(b.sizeKey) ?? 0) + 1);
    }

    for (const [sizeKey, count] of countsBySize.entries()) {
      const [sx, sy] = sizeKey.split('x').map(Number);
      const geometry = getBrickGeometry(sx, sy);
      const material = new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0.05 });
      const mesh = new THREE.InstancedMesh(geometry, material, count);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      mesh.userData.sizeKey = sizeKey;
      this.scene.add(mesh);
      this.brickMeshes.set(sizeKey, mesh);
    }
  }

  private drawBricks() {
    if (this.bricks.length === 0) return;
    for (const b of this.bricks) {
      const mesh = this.brickMeshes.get(b.sizeKey);
      if (!mesh) continue;
      this.dummy.position.set(b.x, b.y, b.z);
      this.dummy.rotation.set(b.rx, b.ry, b.rz);
      this.dummy.updateMatrix();
      mesh.setMatrixAt(b.slotIdx, this.dummy.matrix);
      const effectiveColor = this.effectiveBrickColor(b);
      mesh.setColorAt(b.slotIdx, effectiveColor);
    }
    this.brickMeshes.forEach((mesh) => {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
  }

  private effectiveBrickColor(b: BrickInstance): THREE.Color {
    if (this.highlightedBrickIds.has(b.id)) return HIGHLIGHT_COLOR;
    const override = this.brickColorOverrides.get(b.id);
    if (override) return override;
    return b.color;
  }

  public loadBrickModel(bricks: BrickPiece[]) {
    this.clearAllMeshes();
    this.bricks = this.buildBrickInstances(bricks);
    this.buildBrickInstancedMeshes();
    this.mode = 'brick';
    this.drawBricks();
    this.onCountChange(this.bricks.length);
    this.state = AppState.STABLE;
    this.onStateChange(this.state);
  }

  public generateBrickEffect(bricks: BrickPiece[]) {
    if (this.state === AppState.GENERATING) return;

    this.clearAllMeshes();
    this.highlightedBrickIds.clear();
    this.brickColorOverrides.clear();

    this.bricks = this.buildBrickInstances(bricks);
    // Scatter from above.
    for (const b of this.bricks) {
      b.x = b.targetX + (Math.random() - 0.5) * 40;
      b.y = b.targetY + 40 + Math.random() * 40;
      b.z = b.targetZ + (Math.random() - 0.5) * 40;
      b.rx = Math.random() * Math.PI * 2;
      b.ry = Math.random() * Math.PI * 2;
      b.rz = Math.random() * Math.PI * 2;
    }

    this.buildBrickInstancedMeshes();
    this.mode = 'brick';
    this.onCountChange(this.bricks.length);

    this.rebuildStartTime = Date.now();
    // Reuse rebuildTargets shape for brick-mode physics.
    this.rebuildTargets = this.bricks.map((b) => {
      const h = Math.max(0, (b.targetY - CONFIG.FLOOR_Y) / 15);
      return { x: b.targetX, y: b.targetY, z: b.targetZ, delay: h * 600 + Math.random() * 200 };
    });

    this.state = AppState.GENERATING;
    this.onStateChange(this.state);
  }

  private updateBrickPhysics() {
    if (this.state !== AppState.GENERATING) return;
    const now = Date.now();
    const elapsed = now - this.rebuildStartTime;
    let allDone = true;

    this.bricks.forEach((b, i) => {
      const t = this.rebuildTargets[i];
      if (!t) return;

      if (elapsed < t.delay) {
        allDone = false;
        b.y += Math.sin(now * 0.005 + i) * 0.05;
        b.rx += 0.02;
        b.ry += 0.02;
        return;
      }

      const speed = 0.15;
      b.x += (t.x - b.x) * speed;
      b.y += (t.y - b.y) * speed;
      b.z += (t.z - b.z) * speed;
      b.rx += (0 - b.rx) * speed;
      b.ry += (0 - b.ry) * speed;
      b.rz += (0 - b.rz) * speed;

      if ((t.x - b.x) ** 2 + (t.y - b.y) ** 2 + (t.z - b.z) ** 2 > 0.01) {
        allDone = false;
      } else {
        b.x = t.x; b.y = t.y; b.z = t.z;
        b.rx = 0; b.ry = 0; b.rz = 0;
      }
    });

    if (allDone) {
      this.state = AppState.STABLE;
      this.onStateChange(this.state);
    }
  }

  // ----- Brick-mode public hooks -----

  public setHighlightedBricks(ids: string[]) {
    this.highlightedBrickIds = new Set(ids);
    if (this.mode === 'brick') this.drawBricks();
  }

  public clearHighlightedBricks() {
    this.highlightedBrickIds.clear();
    if (this.mode === 'brick') this.drawBricks();
  }

  public setBrickColor(id: string, hex: number | string) {
    const color = new THREE.Color(hex as number);
    this.brickColorOverrides.set(id, color);
    if (this.mode === 'brick') this.drawBricks();
  }

  public clearBrickColorOverrides() {
    this.brickColorOverrides.clear();
    if (this.mode === 'brick') this.drawBricks();
  }

  public pickBrickAt(clientX: number, clientY: number): string | null {
    if (this.mode !== 'brick' || this.bricks.length === 0) return null;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const meshes = Array.from(this.brickMeshes.values());
    const hits = this.raycaster.intersectObjects(meshes, false);
    for (const hit of hits) {
      const sizeKey = (hit.object as THREE.InstancedMesh).userData.sizeKey as string;
      const instanceId = hit.instanceId;
      if (instanceId == null) continue;
      const brick = this.bricks.find((b) => b.sizeKey === sizeKey && b.slotIdx === instanceId);
      if (brick) return brick.id;
    }
    return null;
  }

  public getBrickText(): string {
    return this.bricks
      .map((b) => `${b.sizeX}x${b.sizeY} (${b.baseX},${b.baseY},${b.layer})`)
      .join('\n');
  }

  public getBrickJson(): string {
    const data = this.bricks.map((b) => ({
      id: b.id,
      size: `${b.sizeX}x${b.sizeY}`,
      x: b.baseX,
      y: b.baseY,
      layer: b.layer,
      c: '#' + this.effectiveBrickColor(b).getHexString(),
    }));
    return JSON.stringify(data, null, 2);
  }

  public hasBricks(): boolean {
    return this.mode === 'brick' && this.bricks.length > 0;
  }

  // ===================== End brick mode =====================

  public cleanup() {
    cancelAnimationFrame(this.animationId);
    this.controls.dispose();
    if (this.instanceMesh) {
      this.scene.remove(this.instanceMesh);
      this.instanceMesh.geometry.dispose();
      if (Array.isArray(this.instanceMesh.material)) {
        this.instanceMesh.material.forEach(m => m.dispose());
      } else {
        this.instanceMesh.material.dispose();
      }
    }
    this.clearBrickMeshes();
    this.scene.traverse(obj => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material?.dispose();
        }
      }
    });
    this.container.removeChild(this.renderer.domElement);
    this.renderer.dispose();
  }
}
