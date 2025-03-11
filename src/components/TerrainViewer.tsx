import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface TerrainViewerProps {
  elevationData: number[][];
  width?: number;
  height?: number;
  scale?: number;
  color?: string;
  wireframe?: boolean;
}

// Define a ref type for accessing the scene externally
export interface TerrainViewerRef {
  getScene: () => THREE.Scene | null;
}

const TerrainViewer = forwardRef<TerrainViewerRef, TerrainViewerProps>(({
  elevationData,
  width = 800,
  height = 600,
  scale = 1,
  color = '#3498db',
  wireframe = true,
}, ref) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);

  // Expose the scene through the ref
  useImperativeHandle(ref, () => ({
    getScene: () => sceneRef.current
  }));

  useEffect(() => {
    if (!mountRef.current) return;
    if (elevationData.length === 0) return;

    // Clear any previous content
    while (mountRef.current.firstChild) {
      mountRef.current.removeChild(mountRef.current.firstChild);
    }

    let renderer: THREE.WebGLRenderer;
    let scene: THREE.Scene;
    let camera: THREE.PerspectiveCamera;
    let controls: OrbitControls;
    let terrain: THREE.Mesh;
    let animationFrameId: number;

    try {
      // Create scene
      scene = new THREE.Scene();
      scene.background = new THREE.Color('#f0f0f0');
      sceneRef.current = scene; // Store the scene in the ref for external access

      // Create camera
      camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
      camera.position.set(0, 10, 20);

      // Create renderer
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      mountRef.current.appendChild(renderer.domElement);

      // Add lights
      const ambientLight = new THREE.AmbientLight(0x606060);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(1, 1, 1);
      scene.add(directionalLight);

      // Add grid helper
      const gridHelper = new THREE.GridHelper(20, 20);
      scene.add(gridHelper);

      // Add axes helper
      const axesHelper = new THREE.AxesHelper(5);
      scene.add(axesHelper);

      // Create terrain
      const rows = elevationData.length;
      const cols = elevationData[0]?.length || 0;
      
      // Use PlaneGeometry for the terrain
      const geometry = new THREE.PlaneGeometry(
        cols * scale, 
        rows * scale, 
        cols - 1, 
        rows - 1
      );
      
      // Rotate the plane to be horizontal (x-z plane)
      geometry.rotateX(-Math.PI / 2);
      
      // Update vertex heights
      const positionAttribute = geometry.getAttribute('position');
      const vertex = new THREE.Vector3();
      
      for (let i = 0; i < positionAttribute.count; i++) {
        vertex.fromBufferAttribute(positionAttribute, i);
        
        // Calculate grid coordinates
        const x = Math.round((vertex.x / scale) + (cols / 2) - 0.5);
        const z = Math.round((vertex.z / scale) + (rows / 2) - 0.5);
        
        // Set height if within bounds
        if (x >= 0 && x < cols && z >= 0 && z < rows) {
          vertex.y = elevationData[z][x] * scale;
          positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
        }
      }
      
      // Update geometry
      positionAttribute.needsUpdate = true;
      geometry.computeVertexNormals();
      
      // Create material
      const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color(color),
        wireframe: wireframe,
        side: THREE.DoubleSide,
        flatShading: true,
      });
      
      // Create mesh
      terrain = new THREE.Mesh(geometry, material);
      scene.add(terrain);
      
      // Center the terrain
      terrain.position.set(0, 0, 0);
      
      // Add orbit controls
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      
      // Position camera to view terrain
      const terrainSize = Math.max(rows, cols) * scale;
      camera.position.set(0, terrainSize / 2, terrainSize);
      controls.target.set(0, 0, 0);
      
      // Animation loop
      const animate = () => {
        animationFrameId = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      
      animate();
    } catch (err) {
      console.error('Error initializing 3D terrain:', err);
      setError('Failed to initialize 3D terrain. Your browser may not support WebGL.');
      
      // Create error message
      const errorDiv = document.createElement('div');
      errorDiv.style.width = `${width}px`;
      errorDiv.style.height = `${height}px`;
      errorDiv.style.display = 'flex';
      errorDiv.style.alignItems = 'center';
      errorDiv.style.justifyContent = 'center';
      errorDiv.style.backgroundColor = '#f8d7da';
      errorDiv.style.color = '#721c24';
      errorDiv.style.padding = '20px';
      errorDiv.style.borderRadius = '8px';
      errorDiv.style.textAlign = 'center';
      errorDiv.innerHTML = `
        <div>
          <h3>WebGL Error</h3>
          <p>Unable to initialize 3D rendering. Your browser may not support WebGL or it might be disabled.</p>
        </div>
      `;
      
      if (mountRef.current) {
        mountRef.current.appendChild(errorDiv);
      }
    }

    // Cleanup
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      
      if (terrain) {
        scene.remove(terrain);
        terrain.geometry.dispose();
        (terrain.material as THREE.Material).dispose();
      }
      
      if (renderer) {
        renderer.dispose();
      }
    };
  }, [elevationData, width, height, scale, color, wireframe]);

  return (
    <div ref={mountRef} style={{ width, height }}>
      {error && (
        <div style={{ 
          width, 
          height, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '20px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div>
            <h3>Error</h3>
            <p>{error}</p>
          </div>
        </div>
      )}
    </div>
  );
});

export default TerrainViewer;
