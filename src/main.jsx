import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
// 만약 index.css 파일이 없다면 아래 줄은 지워도 됩니다.
import './index.css' 

// HTML의 id가 'root'인 요소에 우리가 만든 App 컴포넌트를 그려줍니다.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)