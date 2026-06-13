import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '2.5rem', 
          textAlign: 'center', 
          backgroundColor: '#FEF2F2', 
          border: '1.5px solid #FCA5A5', 
          borderRadius: 'var(--radius-lg, 12px)', 
          margin: '2rem auto',
          maxWidth: '600px',
          boxShadow: 'var(--shadow-md, 0 4px 6px rgba(0, 0, 0, 0.05))',
          fontFamily: 'var(--font-family, sans-serif)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ color: '#DC2626', marginBottom: '0.75rem', fontWeight: 700 }}>เกิดข้อผิดพลาดในการโหลดหน้าจอนี้</h2>
          <p style={{ color: '#7F1D1D', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5', wordBreak: 'break-all' }}>
            รายละเอียด: {this.state.error?.message || this.state.error?.toString() || 'ข้อผิดพลาดระบบการเรนเดอร์'}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button 
              className="btn btn-secondary" 
              onClick={() => {
                this.setState({ hasError: false, error: null });
              }}
              style={{ padding: '0.5rem 1.5rem', fontWeight: 600 }}
            >
              ลองโหลดใหม่อีกครั้ง
            </button>
            <button 
              className="btn btn-light" 
              onClick={() => window.location.reload()}
              style={{ padding: '0.5rem 1.5rem', fontWeight: 600 }}
            >
              รีเฟรชหน้าต่างเว็บบราวเซอร์
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
