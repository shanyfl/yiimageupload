import './App.css'
import ImageUpload from './components/ImageUpload/ImageUpload.tsx';
import ImageViewer from "./components/ImageViewer/ImageViewer.tsx";


function App() {
  return (
      <div style={{maxWidth: '600px', margin: '2rem auto', fontFamily: 'sans-serif'}}>
          <h1>Y - Temporary Image Sharing</h1>
          <p>Upload an image and set an expiration time.</p>
          <ImageUpload/>
          <ImageViewer />
      </div>
  )
}

export default App
