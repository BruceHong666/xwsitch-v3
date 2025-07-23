import { useState } from 'react';
import reactLogo from '@/assets/react.svg';
import wxtLogo from '/wxt.svg';
import './App.css';
import { Button } from 'antd';
import { Main } from './components/main';

function App() {

  return (
    <div className='popup-container'>
      <Main />
    </div>
  );
}

export default App;
