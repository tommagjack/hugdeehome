import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Eraser, RotateCcw, Check, PenTool } from 'lucide-react';

export default function SignaturePad({ 
  value, 
  onChange, 
  title = 'ลงลายมือชื่อ (เซ็นบนหน้าจอ)',
  height = 160,
  readOnly = false
}) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(!!value);
  const strokesHistoryRef = useRef([]);

  // ตั้งค่าและเคลียร์ Canvas
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokesHistoryRef.current = [];
    setHasSignature(false);
    if (onChange) onChange('');
  }, [onChange]);

  // ปรับขนาด Canvas ให้คมชัดตาม devicePixelRatio
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // บันทึกภาพเดิมไว้ก่อนถ้ามี
    let prevData = null;
    if (hasSignature) {
      prevData = canvas.toDataURL();
    }

    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#1e293b'; // Slate 800

    if (value) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, rect.width, height);
        ctx.drawImage(img, 0, 0, rect.width, height);
        setHasSignature(true);
      };
      img.src = value;
    } else if (prevData) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, rect.width, height);
        ctx.drawImage(img, 0, 0, rect.width, height);
      };
      img.src = prevData;
    }
  }, [height, hasSignature, value]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  // โหลดค่าเมื่อ value จากภายนอกเปลี่ยน
  useEffect(() => {
    if (value && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      const img = new Image();
      img.onload = () => {
        const dpr = window.devicePixelRatio || 1;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
        ctx.drawImage(img, 0, 0, rect.width, height);
        setHasSignature(true);
      };
      img.src = value;
    } else if (!value && canvasRef.current && hasSignature) {
      clearCanvas();
    }
  }, [value]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    if (readOnly) return;
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing || readOnly) return;
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = (e) => {
    if (!isDrawing || readOnly) return;
    if (e) e.preventDefault();
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas && onChange) {
      const dataUrl = canvas.toDataURL('image/png');
      onChange(dataUrl);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--dark)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <PenTool size={15} color="var(--primary)" />
          {title}
        </label>
        {!readOnly && hasSignature && (
          <button 
            type="button" 
            onClick={clearCanvas}
            className="btn btn-sm btn-light"
            style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--danger)' }}
          >
            <Eraser size={13} /> ล้างลายเซ็น
          </button>
        )}
      </div>

      <div style={{ 
        position: 'relative', 
        border: '1.5px dashed var(--border)', 
        borderRadius: 'var(--radius-md)', 
        backgroundColor: '#ffffff', 
        overflow: 'hidden',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)',
        cursor: readOnly ? 'default' : 'crosshair',
        touchAction: 'none'
      }}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: `${height}px`, display: 'block', touchAction: 'none' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />

        {!hasSignature && (
          <div style={{ 
            position: 'absolute', 
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)', 
            pointerEvents: 'none', 
            color: '#94a3b8', 
            fontSize: '0.85rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.25rem'
          }}>
            <PenTool size={20} color="#cbd5e1" />
            <span>{readOnly ? 'ไม่มีลายมือชื่อ' : 'ใช้นิ้วมือหรือปากกาเซ็นลงในกรอบนี้'}</span>
          </div>
        )}

        <div style={{
          position: 'absolute',
          bottom: '8px',
          left: '12px',
          fontSize: '0.7rem',
          color: '#cbd5e1',
          pointerEvents: 'none',
          userSelect: 'none'
        }}>
          ✕ ลายมือชื่อ
        </div>
      </div>
    </div>
  );
}
