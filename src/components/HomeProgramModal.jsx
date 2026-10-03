import React, { useState } from 'react';
import { 
  Home, 
  X, 
  Plus, 
  Trash2, 
  Printer, 
  Copy, 
  Check, 
  Sparkles, 
  Calendar, 
  User, 
  FileText,
  Activity,
  HeartHandshake
} from 'lucide-react';
import Swal from 'sweetalert2';
import { formatPatientNickname, formatDateBE } from '../utils/format';
import { DEFAULT_CLINIC_LOGO } from '../utils/defaultAssets';

const PRESET_ACTIVITIES = [
  {
    category: 'กล้ามเนื้อมัดเล็ก & การใช้มือ (Fine Motor)',
    items: [
      { title: 'ปั้นแป้งโดว์หรือดินน้ำมัน', desc: 'ปั้นเป็นลูกกลม บีบ กด แบน เพื่อเสริมความแข็งแรงของนิ้วหัวแม่มือและนิ้วชี้ (10-15 นาที)' },
      { title: 'ใช้ที่คีบ/นิ้วหยิบของขนาดเล็ก', desc: 'ใช้นิ้วโป้งและนิ้วชี้คีบเมล็ดถั่วหรือปอมปอมใส่ขวดปากแคบ (5-10 นาที)' },
      { title: 'ฝึกติดกระดุมหรือรูดซิป', desc: 'ฝึกทักษะการช่วยเหลือตนเองกับเสื้อผ้าตัวหลวม 5-10 ครั้งต่อวัน' },
      { title: 'ฉีกหรือตัดกระดาษตามแนวเส้น', desc: 'ฝึกประสานมือสองข้าง ตัดกระดาษเส้นตรงหรือเส้นโค้งอย่างง่าย' }
    ]
  },
  {
    category: 'ระบบการรับรู้ข้อต่อและกล้ามเนื้อ (Proprioceptive / Sensory Diet)',
    items: [
      { title: 'เดินท่าสัตว์ (Animal Walks)', desc: 'เดินท่าหมี คลานท่าปู หรือกระโดดท่ากบ เพื่อกระตุ้นแรงต้านข้อต่อและแกนกลางลำตัว (รอบละ 1-2 นาที)' },
      { title: 'งานหนักกระตุ้นกล้ามเนื้อ (Heavy Work)', desc: 'ช่วยยกของ ดันตะกร้าผ้า หรือดึงกล่องของเล่นที่มีน้ำหนักพอเหมาะ' },
      { title: 'กระโดดแทรมโพลีนหรือข้ามหมอน', desc: 'กระโดดลงบนเบาะหรือหมอน 15-20 ครั้ง ช่วยปรับระดับความตื่นตัวของสมอง' },
      { title: 'เกมแซนด์วิชหมอน (Deep Pressure)', desc: 'ใช้หมอนกดทับลำตัวเบาๆ ให้แรงกดที่ลึก ช่วยให้สงบและผ่อนคลายก่อนนอน' }
    ]
  },
  {
    category: 'การควบคุมตนเองและสมาธิ (Self-Regulation & Calming)',
    items: [
      { title: 'เป่าฟองสบู่หรือลูกโป่งน้ำ', desc: 'สูดหายใจเข้าลึกๆ และเป่าฟองสบู่ช้าๆ ช่วยฝึกควบคุมลมหายใจและสมาธิ' },
      { title: 'นวดสัมผัสลึก (Firm Touch Massage)', desc: 'นวดแขนและขาด้วยแรงกดที่สม่ำเสมอ ผ่อนคลายกล้ามเนื้อก่อนเข้านอน' },
      { title: 'เล่นเกมหยุด-ไป (Red Light, Green Light)', desc: 'ฝึกการยับยั้งชั่งใจและการรับฟังคำสั่ง' }
    ]
  }
];

export default function HomeProgramModal({
  isOpen,
  onClose,
  patient,
  therapistName,
  clinicInfo
}) {
  const [targetDate, setTargetDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const [activities, setActivities] = useState([
    {
      id: 1,
      title: 'ปั้นแป้งโดว์หรือดินน้ำมัน',
      desc: 'ปั้นเป็นก้อนกลมและใช้ปลายนิ้วบีบ เพื่อเสริมความแข็งแรงของกล้ามเนื้อมือ',
      frequency: 'วันละ 10-15 นาที'
    },
    {
      id: 2,
      title: 'เดินเลียนแบบท่าสัตว์ (Animal Walks)',
      desc: 'เดินท่าหมีหรือคลานท่าปู เสริมสร้างความแข็งแรงของแกนกลางลำตัว',
      frequency: 'วันละ 5-10 นาที ก่อนอาบน้ำ'
    }
  ]);

  const [customTitle, setCustomTitle] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customFreq, setCustomFreq] = useState('');
  const [specialNote, setSpecialNote] = useState('หากน้องมีอาการเหนื่อยล้าหรือไม่พร้อม ให้หยุดพักและปรับเป็นกิจกรรมที่น้องชอบแทน');
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen || !patient) return null;

  const nickname = formatPatientNickname(patient.nickname) || patient.firstname;
  const fullName = `${patient.title || ''}${patient.firstname} ${patient.lastname}`;

  const handleAddPreset = (item) => {
    setActivities(prev => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        title: item.title,
        desc: item.desc,
        frequency: 'วันละ 1-2 ครั้ง'
      }
    ]);
  };

  const handleAddCustom = (e) => {
    e.preventDefault();
    if (!customTitle.trim()) return;
    setActivities(prev => [
      ...prev,
      {
        id: Date.now(),
        title: customTitle.trim(),
        desc: customDesc.trim(),
        frequency: customFreq.trim() || 'ตามสะดวก'
      }
    ]);
    setCustomTitle('');
    setCustomDesc('');
    setCustomFreq('');
  };

  const handleRemoveActivity = (id) => {
    setActivities(prev => prev.filter(a => a.id !== id));
  };

  // สร้างข้อความสรุปสำหรับส่งเข้า LINE
  const handleCopyForLine = () => {
    const lines = [
      `🏠 กิจกรรมฝึกต่อที่บ้าน (Home Program)`,
      `คลินิกบ้านฮักดี 💙`,
      `---------------------------------`,
      `👦 ผู้รับบริการ: น้อง${nickname} (HN: ${patient.hn})`,
      `📅 วันที่: ${formatDateBE(targetDate)}`,
      `👩‍⚕️ ครูผู้ดูแล: ${therapistName || 'ครูผู้บำบัด'}`,
      `---------------------------------`,
      `✨ กิจกรรมแนะนำสำหรับฝึกที่บ้าน:`
    ];

    activities.forEach((act, idx) => {
      lines.push(`${idx + 1}. ${act.title}`);
      if (act.desc) lines.push(`   📝 วิธีฝึก: ${act.desc}`);
      if (act.frequency) lines.push(`   ⏱️ ความถี่: ${act.frequency}`);
    });

    if (specialNote) {
      lines.push(`---------------------------------`);
      lines.push(`💡 ข้อแนะนำ: ${specialNote}`);
    }

    lines.push(`---------------------------------`);
    lines.push(`ส่งเสริมพัฒนาการอย่างต่อเนื่อง เพื่อความสุขและความสำเร็จของน้องครับ/ค่ะ 🌱`);

    const textToCopy = lines.join('\n');
    navigator.clipboard.writeText(textToCopy).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
      Swal.fire({
        icon: 'success',
        title: 'คัดลอกข้อความแล้ว!',
        text: 'สามารถนำข้อความไปวางส่งในห้องแชท LINE ผู้ปกครองได้ทันที',
        timer: 1800,
        showConfirmButton: false
      });
    });
  };

  // พิมพ์บัตรกิจกรรมเป็น PDF
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      Swal.fire({ icon: 'warning', title: 'เบราว์เซอร์บล็อกหน้าต่างพิมพ์', text: 'กรุณาอนุญาตป๊อปอัปสำหรับเว็บไซต์นี้' });
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Home Program - น้อง${nickname} (${patient.hn})</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4; margin: 15mm; }
          body {
            font-family: 'Sarabun', 'Segoe UI', Tahoma, sans-serif;
            color: #1e293b;
            margin: 0;
            padding: 0;
            background: #fff;
          }
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #8b5a2b;
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          .clinic-title {
            font-size: 20px;
            font-weight: bold;
            color: #8b5a2b;
          }
          .clinic-sub {
            font-size: 12px;
            color: #64748b;
          }
          .badge-box {
            background: #fdf8f6;
            border: 1px solid #fed7aa;
            border-radius: 8px;
            padding: 10px 14px;
            margin-bottom: 18px;
            display: flex;
            justify-content: space-between;
            font-size: 13px;
          }
          .program-title {
            font-size: 16px;
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .activity-card {
            border: 1px solid #e2e8f0;
            border-left: 4px solid #8b5a2b;
            border-radius: 6px;
            padding: 10px 14px;
            margin-bottom: 10px;
            background: #fafafa;
          }
          .act-title {
            font-size: 14px;
            font-weight: bold;
            color: #0f172a;
          }
          .act-desc {
            font-size: 12px;
            color: #334155;
            margin-top: 4px;
            line-height: 1.5;
          }
          .act-freq {
            font-size: 11px;
            color: #8b5a2b;
            font-weight: 600;
            margin-top: 4px;
          }
          .note-box {
            margin-top: 18px;
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            border-radius: 8px;
            padding: 10px 14px;
            font-size: 12px;
            color: #1e40af;
          }
          .footer-sig {
            margin-top: 36px;
            display: flex;
            justify-content: space-between;
          }
          .sig-box {
            text-align: center;
            width: 200px;
            font-size: 12px;
          }
          .sig-line {
            border-bottom: 1px dotted #94a3b8;
            height: 35px;
            margin-bottom: 6px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="clinic-title">${clinicInfo?.name || 'คลินิกบ้านฮักดี'}</div>
            <div class="clinic-sub">คลินิกการประกอบโรคศิลปะสาขากิจกรรมบำบัด | โทร ${clinicInfo?.phone || '094-675-3557'}</div>
          </div>
          <div style="text-align: right; font-size: 12px; color: #64748b;">
            <div><strong>ใบกิจกรรมฝึกที่บ้าน (Home Program)</strong></div>
            <div>วันที่: ${formatDateBE(targetDate)}</div>
          </div>
        </div>

        <div class="badge-box">
          <div><strong>ผู้รับบริการ:</strong> น้อง${nickname} (${fullName}) | <strong>HN:</strong> ${patient.hn}</div>
          <div><strong>ครูผู้แนะนำ:</strong> ${therapistName || 'ครูกิจกรรมบำบัด'}</div>
        </div>

        <div class="program-title">🎯 รายการกิจกรรมแนะนำสำหรับฝึกที่บ้าน:</div>

        ${activities.map((act, i) => `
          <div class="activity-card">
            <div class="act-title">${i + 1}. ${act.title}</div>
            ${act.desc ? `<div class="act-desc">${act.desc}</div>` : ''}
            ${act.frequency ? `<div class="act-freq">⏱️ ความถี่ที่แนะนำ: ${act.frequency}</div>` : ''}
          </div>
        `).join('')}

        ${specialNote ? `
          <div class="note-box">
            <strong>💡 คำแนะนำเพิ่มเติม:</strong> ${specialNote}
          </div>
        ` : ''}

        <div class="footer-sig">
          <div class="sig-box">
            <div class="sig-line"></div>
            <div>( ${therapistName || 'ครูผู้บำบัด'} )</div>
            <div style="color: #64748b; font-size: 10px;">นักกิจกรรมบำบัดผู้ดูแล</div>
          </div>
          <div class="sig-box">
            <div class="sig-line"></div>
            <div>( ${patient.guardian || 'ผู้ปกครอง'} )</div>
            <div style="color: #64748b; font-size: 10px;">ผู้ปกครองผู้รับคำแนะนำ</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1050 }}>
      <div className="modal-content-wrapper" style={{ maxWidth: '850px', width: '95%' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ backgroundColor: '#fef3c7', padding: '0.45rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Home size={20} color="#b45309" />
            </div>
            <div>
              <h3 style={{ fontWeight: 700, margin: 0 }}>
                สร้างใบกิจกรรมฝึกที่บ้าน (Home Program Planner)
              </h3>
              <div style={{ fontSize: '0.8rem', color: 'var(--dark-light)' }}>
                สำหรับน้อง{nickname} (HN: {patient.hn}) | ส่งเสริมความต่อเนื่องในการฟื้นฟูพัฒนาการ
              </div>
            </div>
          </div>
          <button className="close-modal-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '72vh', overflowY: 'auto' }}>
          {/* ข้อมูลหัวเอกสาร */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', backgroundColor: 'var(--light)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={16} color="var(--primary)" />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>วันที่แนะนำ:</span>
              <input 
                type="date" 
                className="form-control" 
                value={targetDate} 
                onChange={(e) => setTargetDate(e.target.value)} 
                style={{ width: '145px', padding: '0.35rem 0.6rem', fontSize: '0.85rem' }} 
              />
            </div>
            <div style={{ fontSize: '0.85rem' }}>
              ครูผู้แนะนำ: <strong>{therapistName || 'ครูผู้บำบัด'}</strong>
            </div>
          </div>

          {/* รายการกิจกรรมที่เลือกไว้ */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--dark)' }}>
                กิจกรรมที่แนะนำ ({activities.length} รายการ):
              </label>
            </div>

            {activities.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)', color: 'var(--dark-light)', fontSize: '0.85rem' }}>
                ยังไม่มีรายการกิจกรรม กรุณาเลือกจากหมวดหมู่สำเร็จรูปด้านล่าง หรือพิมพ์เพิ่มเอง
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {activities.map((act, index) => (
                  <div 
                    key={act.id} 
                    style={{ 
                      padding: '0.75rem 1rem', 
                      borderRadius: 'var(--radius-md)', 
                      border: '1px solid var(--border)', 
                      backgroundColor: '#ffffff',
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--dark)' }}>
                        {index + 1}. {act.title}
                      </div>
                      {act.desc && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--dark-light)', marginTop: '2px' }}>
                          {act.desc}
                        </div>
                      )}
                      {act.frequency && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: 600, marginTop: '3px' }}>
                          ⏱️ {act.frequency}
                        </div>
                      )}
                    </div>
                    <button 
                      type="button" 
                      onClick={() => handleRemoveActivity(act.id)} 
                      className="btn btn-light btn-icon-only" 
                      title="ลบกิจกรรมนี้"
                      style={{ color: 'var(--danger)', padding: '0.3rem' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* คลังกิจกรรมสำเร็จรูป (Preset Activities) */}
          <div style={{ backgroundColor: '#faf5ef', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid #f3e8db' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem', color: '#8b5a2b', fontWeight: 700, fontSize: '0.88rem' }}>
              <Sparkles size={16} />
              เลือกกิจกรรมสำเร็จรูปตามหมวดหมู่ (คลิกเพื่อเพิ่ม):
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {PRESET_ACTIVITIES.map((group, gIdx) => (
                <div key={gIdx}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#6b4520', marginBottom: '0.35rem' }}>
                    {group.category}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {group.items.map((item, iIdx) => (
                      <button
                        key={iIdx}
                        type="button"
                        onClick={() => handleAddPreset(item)}
                        style={{
                          padding: '0.35rem 0.65rem',
                          borderRadius: '16px',
                          border: '1px solid #d4c2b0',
                          backgroundColor: '#ffffff',
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          transition: 'all 0.2s',
                          color: '#443322'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#8b5a2b'; e.currentTarget.style.backgroundColor = '#fffbf7'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#d4c2b0'; e.currentTarget.style.backgroundColor = '#ffffff'; }}
                      >
                        <Plus size={12} color="#8b5a2b" />
                        {item.title}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ฟอร์มเพิ่มกิจกรรมกำหนดเอง */}
          <form onSubmit={handleAddCustom} style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--dark)' }}>
              + เพิ่มกิจกรรมที่กำหนดเอง:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="ชื่อกิจกรรม เช่น ฝึกติดกระดุมเสื้อ..."
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                style={{ fontSize: '0.85rem' }}
              />
              <input 
                type="text" 
                className="form-control" 
                placeholder="ความถี่ เช่น วันละ 10 นาที..."
                value={customFreq}
                onChange={(e) => setCustomFreq(e.target.value)}
                style={{ fontSize: '0.85rem' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="รายละเอียด/วิธีฝึกสั้นๆ..."
                value={customDesc}
                onChange={(e) => setCustomDesc(e.target.value)}
                style={{ fontSize: '0.85rem', flex: 1 }}
              />
              <button 
                type="submit" 
                className="btn btn-secondary btn-sm"
                disabled={!customTitle.trim()}
                style={{ whiteSpace: 'nowrap' }}
              >
                <Plus size={14} /> เพิ่มรายการ
              </button>
            </div>
          </form>

          {/* ข้อแนะนำเพิ่มเติม */}
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--dark)', marginBottom: '0.35rem', display: 'block' }}>
              💡 ข้อแนะนำพิเศษสำหรับผู้ปกครอง:
            </label>
            <input 
              type="text" 
              className="form-control" 
              value={specialNote}
              onChange={(e) => setSpecialNote(e.target.value)}
              placeholder="ข้อแนะนำหรือข้อควรระวัง..."
              style={{ fontSize: '0.85rem' }}
            />
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button type="button" className="btn btn-light" onClick={onClose}>
            ปิด
          </button>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              type="button" 
              className="btn btn-light" 
              onClick={handleCopyForLine}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#16a34a', borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' }}
            >
              {isCopied ? <Check size={16} /> : <Copy size={16} />}
              {isCopied ? 'คัดลอกแล้ว!' : 'คัดลอกสรุปส่ง LINE'}
            </button>
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={handlePrint}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Printer size={16} /> พิมพ์การ์ดกิจกรรม (PDF)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
