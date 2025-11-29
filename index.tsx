import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; message?: string }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, message: String(error?.message ?? error) };
  }
  componentDidCatch(error: any, info: any) {
    console.error('Render error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#f8fafc',color:'#0f172a',textAlign:'center'}}>
          <div style={{background:'#ffffff',padding:'24px',borderRadius:'16px',boxShadow:'0 10px 30px rgba(0,0,0,0.1)'}}>
            <h1 style={{fontSize:'20px',fontWeight:800,marginBottom:'8px'}}>Something went wrong</h1>
            <p style={{fontSize:'14px',color:'#334155'}}>Check the console for details.</p>
            {this.state.message && <p style={{marginTop:'8px',fontSize:'12px',color:'#64748b'}}>Error: {this.state.message}</p>}
          </div>
        </div>
      );
    }
    return this.props.children as any;
  }
}

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);