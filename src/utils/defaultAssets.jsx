import React, { useState, useEffect } from 'react';

// สินทรัพย์รูปภาพและตราประทับตั้งต้นประจำระบบ (Embedded Default Data URLs)
// ทำงานได้ 100% บนทุกเบราว์เซอร์ (รวมถึง IE, Chrome, Firefox, Safari, Edge, Mobile) โดยไม่ต้องพึ่งพาอินเทอร์เน็ตภายนอก

export const DEFAULT_CLINIC_LOGO = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><circle cx="100" cy="100" r="95" fill="%23FEF8F1" stroke="%23b0895a" stroke-width="5"/><circle cx="100" cy="100" r="84" fill="%23FFFFFF" stroke="%23dfc6a7" stroke-width="2"/><g transform="translate(100,72) scale(0.95)"><path d="M-35 5 L0 -25 L35 5 L28 5 L28 35 L-28 35 L-28 5 Z" fill="%238ECAE6" stroke="%23219EBC" stroke-width="3"/><path d="M-40 7 L0 -28 L40 7" fill="none" stroke="%23FB8500" stroke-width="6" stroke-linecap="round"/><circle cx="-12" cy="15" r="7" fill="%23FFB703"/><path d="M-12 22 L-12 35 M-16 26 L-8 26 M-16 35 L-8 35" stroke="%23FFB703" stroke-width="2.5"/><circle cx="12" cy="15" r="7" fill="%23E63946"/><path d="M12 22 L12 35 M8 26 L16 26 M8 35 L16 35" stroke="%23E63946" stroke-width="2.5"/></g><text x="100" y="142" font-family="'Prompt', 'Kanit', sans-serif" font-size="17" font-weight="800" fill="%232B2D42" text-anchor="middle">บ้านฮักดี</text><text x="100" y="160" font-family="'Prompt', 'Kanit', sans-serif" font-size="11" font-weight="600" fill="%238D99AE" text-anchor="middle">HugDeeHome</text></svg>`;

export const DEFAULT_CLINIC_STAMP = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><circle cx="100" cy="100" r="92" fill="none" stroke="%231a5fb4" stroke-width="5"/><circle cx="100" cy="100" r="82" fill="none" stroke="%231a5fb4" stroke-width="2"/><path id="circlePath" d="M 30, 100 A 70,70 0 1,1 170,100 A 70,70 0 1,1 30,100" fill="none"/><text font-family="sans-serif" font-size="12" font-weight="bold" fill="%231a5fb4"><textPath href="%23circlePath" startOffset="50%" text-anchor="middle">★ คลินิกกิจกรรมบำบัด ฮักดีโฮม ★</textPath></text><rect x="40" y="85" width="120" height="30" rx="5" fill="none" stroke="%231a5fb4" stroke-width="3"/><text x="100" y="105" font-family="sans-serif" font-size="14" font-weight="bold" fill="%231a5fb4" text-anchor="middle">APPROVED</text><text x="100" y="138" font-family="sans-serif" font-size="10" font-weight="bold" fill="%231a5fb4" text-anchor="middle">บ.ป. 25690045</text></svg>`;

// ตัวทำความสะอาดรูปภาพแบบรองรับ Safari / WebKit / IE
export const sanitizeImageUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  let str = url.trim();
  if (str.startsWith('data:image')) {
    // ลบการขึ้นบรรทัดใหม่และช่องว่างที่ขัดขวางการเรนเดอร์ใน Safari/WebKit
    str = str.replace(/[\r\n\s]/g, '');
    // ปรับแก้ data:image/jpg ให้เป็น data:image/jpeg เพื่อมาตรฐาน Safari
    if (str.startsWith('data:image/jpg;')) {
      str = str.replace('data:image/jpg;', 'data:image/jpeg;');
    }
  } else if (str && !str.startsWith('http://') && !str.startsWith('https://')) {
    str = 'https://' + str;
  }
  return str;
};

// ตัวจัดการเมื่อรูปภาพเกิดข้อผิดพลาดในการโหลด (Cross-Browser Image Error Handler)
export const handleLogoError = (e) => {
  if (e && e.target) {
    e.target.onerror = null;
    e.target.src = DEFAULT_CLINIC_LOGO;
  }
};

export const handleStampError = (e) => {
  if (e && e.target) {
    e.target.onerror = null;
    e.target.src = DEFAULT_CLINIC_STAMP;
  }
};

// คอมโพเนนต์แสดงรูปโปรไฟล์แบบอัจฉริยะ (Smart Avatar Component)
export const SmartAvatar = ({ src, name, fontSize = '0.75rem', style = {} }) => {
  const sanitized = sanitizeImageUrl(src);
  const [imgSrc, setImgSrc] = useState(sanitized);
  const [hasError, setHasError] = useState(false);
  const [triedProxy, setTriedProxy] = useState(false);

  useEffect(() => {
    const clean = sanitizeImageUrl(src);
    setImgSrc(clean);
    setHasError(false);
    setTriedProxy(false);
  }, [src]);

  const handleError = () => {
    if (!triedProxy && imgSrc && typeof imgSrc === 'string' && !imgSrc.startsWith('data:image')) {
      setTriedProxy(true);
      const cleanUrl = imgSrc.replace(/^https?:\/\//, '');
      setImgSrc(`https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}`);
    } else {
      setHasError(true);
    }
  };

  const getInitials = (n) => {
    if (!n) return 'U';
    const parts = String(n).trim().split(/\s+/);
    if (parts.length > 1 && parts[0] && parts[1]) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return String(n).slice(0, 2).toUpperCase();
  };

  if (!hasError && imgSrc) {
    return (
      <img
        src={imgSrc}
        alt={name || ''}
        referrerPolicy="no-referrer"
        style={{ width: '100%', height: '100%', objectFit: 'cover', maxWidth: '100%', maxHeight: '100%', ...style }}
        onError={handleError}
      />
    );
  }

  return (
    <span style={{ fontSize, fontWeight: 700, color: 'var(--secondary)' }}>
      {getInitials(name || 'User')}
    </span>
  );
};
