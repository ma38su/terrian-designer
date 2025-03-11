import './App.css'
import TerrainDesigner from './components/TerrainDesigner'

function App() {
  return (
    <div className="app">
      <header>
        <h1>3D Terrain Designer</h1>
        <p>Visualize elevation data as 3D terrain models</p>
      </header>
      
      <main>
        <TerrainDesigner width={800} height={600} />
      </main>
      
      <footer>
        <p>Built with React, TypeScript, and Three.js</p>
      </footer>
    </div>
  )
}

export default App
