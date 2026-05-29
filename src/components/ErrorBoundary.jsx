import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif', backgroundColor: '#fdfdfd', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#fff0f0', border: '1px solid #ffcccc', padding: '2rem', borderRadius: '1rem', maxWidth: '600px', width: '100%' }}>
            <h1 style={{ color: '#d32f2f', margin: '0 0 1rem 0' }}>Something went wrong.</h1>
            <p style={{ color: '#555', marginBottom: '2rem' }}>We apologize for the inconvenience. An unexpected error occurred while loading this page.</p>
            <button 
              onClick={() => {
                this.setState({ hasError: false, error: null, errorInfo: null });
                window.location.href = '/';
              }}
              style={{
                backgroundColor: '#d32f2f',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Refresh Application
            </button>
            
            {this.state.error && (
              <details style={{ whiteSpace: 'pre-wrap', textAlign: 'left', marginTop: '2rem', color: '#888', backgroundColor: '#f9f9f9', padding: '1rem', borderRadius: '0.5rem', fontSize: '0.8rem', overflowX: 'auto' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '0.5rem' }}>Error Details (for developers)</summary>
                {this.state.error.toString()}
                <br />
                {this.state.errorInfo?.componentStack}
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
