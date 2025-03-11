import { useState, useCallback, useRef } from 'react';
import TerrainViewer, { TerrainViewerRef } from './TerrainViewer';
import { downloadSTL } from '../utils/STLExporter';

interface TerrainDesignerProps {
  width?: number;
  height?: number;
}

const TerrainDesigner: React.FC<TerrainDesignerProps> = ({
  width = 800,
  height = 600,
}) => {
  // Ref to access the TerrainViewer's scene
  const terrainViewerRef = useRef<TerrainViewerRef>(null);
  
  // State for terrain parameters
  const [elevationData, setElevationData] = useState<number[][]>([]);
  const [scale, setScale] = useState<number>(1);
  const [color, setColor] = useState<string>('#3498db');
  const [wireframe, setWireframe] = useState<boolean>(true);
  const [gridSize, setGridSize] = useState<number>(20);
  const [maxHeight, setMaxHeight] = useState<number>(5);
  const [terrainType, setTerrainType] = useState<string>('random');
  const [fileName, setFileName] = useState<string>('terrain.stl');

  // Generate terrain data
  const generateTerrain = useCallback(() => {
    const newElevationData: number[][] = [];
    
    switch (terrainType) {
      case 'flat':
        // Generate flat terrain
        for (let i = 0; i < gridSize; i++) {
          const row: number[] = [];
          for (let j = 0; j < gridSize; j++) {
            row.push(0);
          }
          newElevationData.push(row);
        }
        break;
        
      case 'random':
        // Generate random terrain
        for (let i = 0; i < gridSize; i++) {
          const row: number[] = [];
          for (let j = 0; j < gridSize; j++) {
            row.push(Math.random() * maxHeight);
          }
          newElevationData.push(row);
        }
        break;
        
      case 'sine':
        // Generate sine wave terrain
        for (let i = 0; i < gridSize; i++) {
          const row: number[] = [];
          for (let j = 0; j < gridSize; j++) {
            const x = i / gridSize * Math.PI * 2;
            const z = j / gridSize * Math.PI * 2;
            row.push((Math.sin(x) + Math.sin(z)) * maxHeight / 4 + maxHeight / 2);
          }
          newElevationData.push(row);
        }
        break;
        
      case 'hill':
        // Generate hill terrain
        const centerX = gridSize / 2;
        const centerZ = gridSize / 2;
        for (let i = 0; i < gridSize; i++) {
          const row: number[] = [];
          for (let j = 0; j < gridSize; j++) {
            const distanceFromCenter = Math.sqrt(
              Math.pow(i - centerX, 2) + Math.pow(j - centerZ, 2)
            );
            const height = Math.max(0, maxHeight - distanceFromCenter / 2);
            row.push(height);
          }
          newElevationData.push(row);
        }
        break;
        
      case 'valley':
        // Generate valley terrain
        for (let i = 0; i < gridSize; i++) {
          const row: number[] = [];
          for (let j = 0; j < gridSize; j++) {
            const distFromEdge = Math.min(
              i, j, gridSize - i - 1, gridSize - j - 1
            );
            row.push(distFromEdge / 3);
          }
          newElevationData.push(row);
        }
        break;
        
      default:
        // Default to random terrain
        for (let i = 0; i < gridSize; i++) {
          const row: number[] = [];
          for (let j = 0; j < gridSize; j++) {
            row.push(Math.random() * maxHeight);
          }
          newElevationData.push(row);
        }
    }
    
    setElevationData(newElevationData);
  }, [gridSize, maxHeight, terrainType]);

  return (
    <div className="terrain-designer">
      <div className="controls" style={{ marginBottom: '20px' }}>
        <div className="control-group">
          <h3>Terrain Parameters</h3>
          <div className="control-row">
            <label>
              Grid Size:
              <input
                type="number"
                min="2"
                max="100"
                value={gridSize}
                onChange={(e) => setGridSize(Math.max(2, parseInt(e.target.value) || 2))}
              />
            </label>
            
            <label>
              Max Height:
              <input
                type="number"
                min="1"
                max="50"
                value={maxHeight}
                onChange={(e) => setMaxHeight(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </label>
          </div>
          
          <div className="control-row">
            <label>
              Terrain Type:
              <select
                value={terrainType}
                onChange={(e) => setTerrainType(e.target.value)}
              >
                <option value="random">Random</option>
                <option value="flat">Flat</option>
                <option value="sine">Sine Wave</option>
                <option value="hill">Hill</option>
                <option value="valley">Valley</option>
              </select>
            </label>
            
            <button onClick={generateTerrain}>Generate Terrain</button>
          </div>
        </div>
        
        <div className="control-group">
          <h3>Visualization Options</h3>
          <div className="control-row">
            <label>
              Scale:
              <input
                type="number"
                min="0.1"
                max="10"
                step="0.1"
                value={scale}
                onChange={(e) => setScale(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
              />
            </label>
            
            <label>
              Color:
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </label>
            
            <label>
              Wireframe:
              <input
                type="checkbox"
                checked={wireframe}
                onChange={(e) => setWireframe(e.target.checked)}
              />
            </label>
          </div>
        </div>
      </div>
      
      {/* Export Options */}
      {elevationData.length > 0 && (
        <div className="control-group" style={{ marginBottom: '20px' }}>
          <h3>Export Options</h3>
          <div className="control-row">
            <label>
              File Name:
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value || 'terrain.stl')}
                style={{ width: '200px' }}
              />
            </label>
            
            <button 
              onClick={() => {
                const scene = terrainViewerRef.current?.getScene();
                if (scene) {
                  downloadSTL(scene, fileName, true);
                } else {
                  alert('No terrain to export. Please generate terrain first.');
                }
              }}
              style={{ 
                backgroundColor: '#28a745', 
                color: 'white',
                marginLeft: '10px'
              }}
            >
              Export as STL
            </button>
          </div>
        </div>
      )}
      
      <div className="terrain-container" style={{ border: '1px solid #ccc' }}>
        {elevationData.length > 0 ? (
          <TerrainViewer
            ref={terrainViewerRef}
            elevationData={elevationData}
            width={width}
            height={height}
            scale={scale}
            color={color}
            wireframe={wireframe}
          />
        ) : (
          <div
            style={{
              width,
              height,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f0f0f0',
              border: '2px dashed #aaa',
              borderRadius: '8px',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#333', fontWeight: 'bold', fontSize: '16px', margin: '0 0 10px 0' }}>
                Click "Generate Terrain" to create a 3D terrain model
              </p>
              <p style={{ color: '#666', fontSize: '14px' }}>
                The terrain will be displayed here
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TerrainDesigner;
