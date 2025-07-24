import './App.css';
import { Main } from './components/main';

function App() {
  const isInTab = window.location.href.includes('popup.html');
  const containerStyle = isInTab 
    ? { minHeight: '100vh', width: '100vw' }
    : { width: '800px', height: '600px' };

  return (
    <div className='popup-container' style={containerStyle}>
      <Main />
    </div>
  );
}

export default App;
