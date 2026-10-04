import React from 'react';
import { 
  Heart, Phone, MapPin, Sparkles, CheckCircle2, ArrowRight, 
  MessageCircle, ShieldCheck, UserCheck, Award, Clock
} from 'lucide-react';
import { DEFAULT_CLINIC_LOGO } from '../utils/defaultAssets';

export default function PublicServices({ clinicInfo, services = [] }) {
  const phone = clinicInfo?.phone || '0946753557';
  const cleanPhone = phone.replace(/\D/g, '') || '0946753557';
  const clinicName = clinicInfo?.name || 'คลินิกกิจกรรมบำบัด บ้านฮักดี';
  const lineId = clinicInfo?.lineId || '@hugdeehome';
  const logoUrl = clinicInfo?.logoUrl || DEFAULT_CLINIC_LOGO;
  const address = clinicInfo?.address || 'อำเภอเมือง จังหวัดเชียงใหม่';

  // Highlight therapeutic domains
  const highlightDomains = [
    {
      title: 'กิจกรรมบำบัด (Occupational Therapy)',
      desc: 'ฟื้นฟูและส่งเสริมพัฒนาการกล้ามเนื้อมัดเล็ก การหยิบจับ การเขียน ทักษะชีวิตประจำวัน และการช่วยเหลือตนเอง',
      icon: '🧩',
      color: '#EA580C',
      bg: '#FFF7ED',
      badge: 'แนะนำ'
    },
    {
      title: 'บูรณาการประสาทความรู้สึก (Sensory Integration - SI)',
      desc: 'ปรับสมดุลระบบประสาทสัมผัส ลดความไวต่อสิ่งเร้า เพิ่มสมาธิ การทรงตัว และการวางแผนการเคลื่อนไหว',
      icon: '🧠',
      color: '#0284C7',
      bg: '#F0F9FF',
      badge: 'ยอดนิยม'
    },
    {
      title: 'กระตุ้นพัฒนาการเด็ก & พฤติกรรมบำบัด',
      desc: 'ส่งเสริมการสื่อสาร การสบตา อารมณ์ ทักษะทางสังคม และเตรียมความพร้อมก่อนเข้าเรียน',
      icon: '🌱',
      color: '#059669',
      bg: '#ECFDF5',
      badge: 'เฉพาะบุคคล'
    },
    {
      title: 'การประเมินและวางแผนรายบุคคล (ITP Plan)',
      desc: 'ตรวจประเมินพัฒนาการอย่างรอบด้าน ออกแบบแผนการฝึกเฉพาะบุคคล พร้อมให้คำแนะนำผู้ปกครองฝึกต่อที่บ้าน',
      icon: '📋',
      color: '#7C3AED',
      bg: '#FAF5FF',
      badge: 'ครบวงจร'
    }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FEF8F1',
      fontFamily: "'Prompt', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      color: '#2B2D42',
      paddingBottom: '3rem'
    }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #C19B6C 0%, #A57D4F 100%)',
        color: '#FFFFFF',
        padding: '3rem 1.5rem 4rem',
        textAlign: 'center',
        borderBottomLeftRadius: '32px',
        borderBottomRightRadius: '32px',
        boxShadow: '0 10px 30px rgba(165, 125, 79, 0.25)'
      }}>
        <div style={{
          width: '76px',
          height: '76px',
          margin: '0 auto 1rem',
          backgroundColor: '#FFFFFF',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 6px 18px rgba(0,0,0,0.15)',
          overflow: 'hidden',
          padding: '4px'
        }}>
          <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <h1 style={{ fontSize: '1.65rem', fontWeight: '800', margin: '0 0 0.5rem 0' }}>
          {clinicName}
        </h1>
        <p style={{ fontSize: '0.98rem', opacity: 0.95, margin: '0 auto', maxWidth: '500px', lineHeight: 1.5 }}>
          บริการกิจกรรมบำบัดและส่งเสริมพัฒนาการเด็ก โดยทีมนักกิจกรรมบำบัดวิชาชีพ 🤎
        </p>

        {/* Quick Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '1.5rem', flexWrap: 'wrap' }}>
          <a
            href="#/register-patient"
            style={{
              backgroundColor: '#FFFFFF',
              color: '#855829',
              padding: '10px 20px',
              borderRadius: '9999px',
              fontWeight: '700',
              fontSize: '0.92rem',
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            ลงทะเบียนคนไข้ใหม่ ➔
          </a>
          <a
            href={`tel:${cleanPhone}`}
            style={{
              backgroundColor: 'rgba(255,255,255,0.18)',
              color: '#FFFFFF',
              border: '1.5px solid rgba(255,255,255,0.6)',
              padding: '10px 18px',
              borderRadius: '9999px',
              fontWeight: '600',
              fontSize: '0.92rem',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Phone size={16} /> โทร {phone}
          </a>
        </div>
      </div>

      <div style={{ maxWidth: '820px', margin: '-2rem auto 0', padding: '0 1rem' }}>
        
        {/* Domain Highlights */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          padding: '1.75rem',
          boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
          border: '1px solid #F1E7DD',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: '0 0 1.25rem 0', color: '#4A4036', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} color="#C19B6C" /> โปรแกรมการบำบัดและฟื้นฟูพัฒนาการ
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            {highlightDomains.map((item, idx) => (
              <div 
                key={idx}
                style={{
                  backgroundColor: item.bg,
                  borderRadius: '16px',
                  padding: '1.25rem',
                  border: `1px solid ${item.color}25`,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '1.8rem' }}>{item.icon}</span>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      backgroundColor: item.color,
                      color: '#FFFFFF'
                    }}>
                      {item.badge}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.02rem', fontWeight: '700', color: '#1E293B', margin: '0 0 6px 0' }}>
                    {item.title}
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Services & Packages List */}
        {services && services.length > 0 && (
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            padding: '1.75rem',
            boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
            border: '1px solid #F1E7DD',
            marginBottom: '1.5rem'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: '0 0 1rem 0', color: '#4A4036', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={20} color="#C19B6C" /> รายการบริการและแพ็กเกจคอร์ส
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {services.map((srv, sIdx) => (
                <div 
                  key={sIdx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    borderRadius: '14px',
                    backgroundColor: '#FAFAF9',
                    border: '1px solid #E7E5E4'
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
                    <div style={{ fontWeight: '700', color: '#292524', fontSize: '0.96rem' }}>
                      {srv.name}
                    </div>
                    {srv.description && (
                      <div style={{ fontSize: '0.8rem', color: '#78716C', marginTop: '2px' }}>
                        {srv.description}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: '1.15rem', fontWeight: '800', color: '#C19B6C' }}>
                      {typeof srv.price === 'number' ? `${srv.price.toLocaleString()} ฿` : (srv.price || '-')}
                    </span>
                    {srv.duration && (
                      <div style={{ fontSize: '0.75rem', color: '#A8A29E' }}>
                        {srv.duration} นาที
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact & Map Card */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          padding: '1.75rem',
          boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
          border: '1px solid #F1E7DD',
          textAlign: 'center'
        }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '800', margin: '0 0 0.5rem 0', color: '#4A4036' }}>
            พร้อมร่วมดูแลพัฒนาการลูกรักกับบ้านฮักดี
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#78716C', margin: '0 auto 1.5rem', maxWidth: '460px', lineHeight: 1.5 }}>
            {address}
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <a
              href="#/register-patient"
              style={{
                backgroundColor: '#10B981',
                color: '#FFFFFF',
                padding: '12px 24px',
                borderRadius: '14px',
                fontWeight: '700',
                fontSize: '0.95rem',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
              }}
            >
              ลงทะเบียนคนไข้ใหม่ 📝
            </a>
            <a
              href="#/line-link"
              style={{
                backgroundColor: '#06C755',
                color: '#FFFFFF',
                padding: '12px 22px',
                borderRadius: '14px',
                fontWeight: '700',
                fontSize: '0.95rem',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(6, 199, 85, 0.3)'
              }}
            >
              <MessageCircle size={18} /> เชื่อมต่อ LINE OA
            </a>
            <a
              href="https://maps.google.com/?q=Hug+Dee+Home+Clinic"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                backgroundColor: '#F3F4F6',
                color: '#374151',
                padding: '12px 20px',
                borderRadius: '14px',
                fontWeight: '600',
                fontSize: '0.95rem',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <MapPin size={18} color="#EA580C" /> แผนที่คลินิก
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
