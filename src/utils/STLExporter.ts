import * as THREE from 'three';

// Define interfaces for type safety
interface SkinnedMesh extends THREE.Mesh {
  isSkinnedMesh: boolean;
  boneTransform: (index: number, target: THREE.Vector3) => void;
}

// This is a simplified version of the STLExporter from Three.js examples
export class STLExporter {
  parse(scene: THREE.Object3D, options: { binary?: boolean } = {}): string | ArrayBuffer {
    const binary = options.binary !== undefined ? options.binary : false;

    // Create a clone of the scene to avoid modifying the original
    const clonedScene = scene.clone();
    
    // Apply rotation to make Y-up in Three.js match Z-up in STL
    // We don't want to modify the original scene, so we apply this to the clone
    const rotationMatrix = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
    clonedScene.applyMatrix4(rotationMatrix);

    const meshes: THREE.Mesh[] = [];
    let triangles = 0;

    // Find all meshes in the cloned scene
    clonedScene.traverse(function (object) {
      if (object instanceof THREE.Mesh) {
        const mesh = object as THREE.Mesh;
        const geometry = mesh.geometry;

        if (geometry instanceof THREE.BufferGeometry) {
          const index = geometry.index;
          const positionAttribute = geometry.getAttribute('position');

          if (index !== null) {
            triangles += index.count / 3;
          } else {
            triangles += positionAttribute.count / 3;
          }
        }

        meshes.push(mesh);
      }
    });

    let output: string | ArrayBuffer;
    let offset = 80; // skip header

    if (binary === true) {
      const bufferLength = triangles * 2 + triangles * 3 * 4 * 4 + 80 + 4;
      const arrayBuffer = new ArrayBuffer(bufferLength);
      output = arrayBuffer;

      const writer = new DataView(arrayBuffer);
      writer.setUint32(offset, triangles, true);
      offset += 4;
    } else {
      output = '';
      output += 'solid exported\n';
    }

    const vA = new THREE.Vector3();
    const vB = new THREE.Vector3();
    const vC = new THREE.Vector3();
    const cb = new THREE.Vector3();
    const ab = new THREE.Vector3();
    const normal = new THREE.Vector3();

    for (let i = 0, il = meshes.length; i < il; i++) {
      const mesh = meshes[i];
      const geometry = mesh.geometry;

      if (!(geometry instanceof THREE.BufferGeometry)) {
        continue;
      }

      const index = geometry.index;
      const positionAttribute = geometry.getAttribute('position');

      if (index !== null) {
        // indexed geometry
        for (let j = 0; j < index.count; j += 3) {
          const a = index.getX(j + 0);
          const b = index.getX(j + 1);
          const c = index.getX(j + 2);

          writeFace(a, b, c, positionAttribute, mesh);
        }
      } else {
        // non-indexed geometry
        for (let j = 0; j < positionAttribute.count; j += 3) {
          const a = j + 0;
          const b = j + 1;
          const c = j + 2;

          writeFace(a, b, c, positionAttribute, mesh);
        }
      }
    }

    if (binary === false) {
      output += 'endsolid exported\n';
    }

    // Clean up the cloned scene
    clonedScene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        if (object.geometry) {
          object.geometry.dispose();
        }
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      }
    });

    return output;

    function writeFace(
      a: number,
      b: number,
      c: number,
      positionAttribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
      mesh: THREE.Mesh
    ) {
      vA.fromBufferAttribute(positionAttribute as any, a);
      vB.fromBufferAttribute(positionAttribute as any, b);
      vC.fromBufferAttribute(positionAttribute as any, c);

      // Handle skinned mesh if available
      const skinnedMesh = mesh as unknown as SkinnedMesh;
      if (skinnedMesh.isSkinnedMesh) {
        skinnedMesh.boneTransform(a, vA);
        skinnedMesh.boneTransform(b, vB);
        skinnedMesh.boneTransform(c, vC);
      }

      vA.applyMatrix4(mesh.matrixWorld);
      vB.applyMatrix4(mesh.matrixWorld);
      vC.applyMatrix4(mesh.matrixWorld);

      cb.subVectors(vC, vB);
      ab.subVectors(vA, vB);
      normal.crossVectors(cb, ab).normalize();

      if (binary === true) {
        const writer = new DataView(output as ArrayBuffer);

        writer.setFloat32(offset, normal.x, true);
        offset += 4;
        writer.setFloat32(offset, normal.y, true);
        offset += 4;
        writer.setFloat32(offset, normal.z, true);
        offset += 4;

        writer.setFloat32(offset, vA.x, true);
        offset += 4;
        writer.setFloat32(offset, vA.y, true);
        offset += 4;
        writer.setFloat32(offset, vA.z, true);
        offset += 4;

        writer.setFloat32(offset, vB.x, true);
        offset += 4;
        writer.setFloat32(offset, vB.y, true);
        offset += 4;
        writer.setFloat32(offset, vB.z, true);
        offset += 4;

        writer.setFloat32(offset, vC.x, true);
        offset += 4;
        writer.setFloat32(offset, vC.y, true);
        offset += 4;
        writer.setFloat32(offset, vC.z, true);
        offset += 4;

        writer.setUint16(offset, 0, true);
        offset += 2;
      } else {
        output = output as string;
        output += '\tfacet normal ' + normal.x + ' ' + normal.y + ' ' + normal.z + '\n';
        output += '\t\touter loop\n';
        output += '\t\t\tvertex ' + vA.x + ' ' + vA.y + ' ' + vA.z + '\n';
        output += '\t\t\tvertex ' + vB.x + ' ' + vB.y + ' ' + vB.z + '\n';
        output += '\t\t\tvertex ' + vC.x + ' ' + vC.y + ' ' + vC.z + '\n';
        output += '\t\tendloop\n';
        output += '\tendfacet\n';
      }
    }
  }
}

// Helper function to download STL file
export function downloadSTL(scene: THREE.Scene, fileName: string = 'terrain.stl', binary: boolean = true) {
  const exporter = new STLExporter();
  const result = exporter.parse(scene, { binary });
  
  const blob = binary 
    ? new Blob([result as ArrayBuffer], { type: 'application/octet-stream' }) 
    : new Blob([result as string], { type: 'text/plain' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  
  // Clean up
  URL.revokeObjectURL(link.href);
}
