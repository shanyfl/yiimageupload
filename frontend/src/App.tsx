import './App.css'
import ImageUpload from './components/ImageUpload';

function App() {
  return (
      <div style={{maxWidth: '600px', margin: '2rem auto', fontFamily: 'sans-serif'}}>
          <h1>Y - Temporary Image Sharing</h1>
          <p>Upload an image and set an expiration time.</p>
          <ImageUpload/>
      </div>
  )
}

export default App
