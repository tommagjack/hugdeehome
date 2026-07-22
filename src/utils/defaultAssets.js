// สินทรัพย์รูปภาพและตราประทับตั้งต้นประจำระบบ (Embedded Default Data URLs)
// ทำงานได้ 100% บนทุกเบราว์เซอร์ (รวมถึง IE, Chrome, Firefox, Safari, Edge, Mobile) โดยไม่ต้องพึ่งพาอินเทอร์เน็ตภายนอก

export const DEFAULT_CLINIC_LOGO = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><circle cx="100" cy="100" r="95" fill="%23FEF8F1" stroke="%23b0895a" stroke-width="6"/><circle cx="100" cy="100" r="82" fill="none" stroke="%23dfc6a7" stroke-width="2" stroke-dasharray="6,4"/><path d="M100 45 L145 85 L135 85 L135 135 L65 135 L65 85 L55 85 Z" fill="%23b0895a"/><path d="M100 70 C85 55 60 70 100 115 C140 70 115 55 100 70 Z" fill="%23e07a5f"/><text x="100" y="158" font-family="sans-serif" font-size="16" font-weight="bold" fill="%235a4632" text-anchor="middle">Hug Dee Home</text><text x="100" y="175" font-family="sans-serif" font-size="11" font-weight="600" fill="%23b0895a" text-anchor="middle">บ้านฮักดี</text></svg>`;

export const DEFAULT_CLINIC_STAMP = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><circle cx="100" cy="100" r="92" fill="none" stroke="%231a5fb4" stroke-width="5"/><circle cx="100" cy="100" r="82" fill="none" stroke="%231a5fb4" stroke-width="2"/><path id="circlePath" d="M 30, 100 A 70,70 0 1,1 170,100 A 70,70 0 1,1 30,100" fill="none"/><text font-family="sans-serif" font-size="12" font-weight="bold" fill="%231a5fb4"><textPath href="%23circlePath" startOffset="50%" text-anchor="middle">★ คลินิกกิจกรรมบำบัด ฮักดีโฮม ★</textPath></text><rect x="40" y="85" width="120" height="30" rx="5" fill="none" stroke="%231a5fb4" stroke-width="3"/><text x="100" y="105" font-family="sans-serif" font-size="14" font-weight="bold" fill="%231a5fb4" text-anchor="middle">APPROVED</text><text x="100" y="138" font-family="sans-serif" font-size="10" font-weight="bold" fill="%231a5fb4" text-anchor="middle">บ.ป. 25690045</text></svg>`;

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
