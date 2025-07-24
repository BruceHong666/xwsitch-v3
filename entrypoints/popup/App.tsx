import './App.css';
import { Main } from './components/main';

function App() {
  const isInTab = window.location.href.includes('popup.html');
  const containerClass = isInTab ? 'popup-container-tab' : 'popup-container';

  return (
    <div className={containerClass}>
      <Main />
    </div>
  );
}

export default App;
