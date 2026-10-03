import React, { useState, useMemo } from 'react';
import { 
  Target, 
  Search, 
  Plus, 
  Printer, 
  Edit2, 
  Trash2, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Award, 
  Calendar, 
  User, 
  Sparkles,
  BarChart2,
  ChevronRight,
  Filter
} from 'lucide-react';
import Swal from 'sweetalert2';
import { formatPatientNickname, formatTherapistName, formatDateBE, parseDateToAD } from '../utils/format';

// หมวดหมู่เป้าหมายทางกิจกรรมบำบัดเด็ก
const ITP_CATEGORIES = [
  'กล้ามเนื้อมัดใหญ่ & การทรงตัว (Gross Motor)',
  'กล้ามเนื้อมัดเล็ก & สหสัมพันธ์ตา-มือ (Fine Motor)',
  'การช่วยเหลือตนเอง & กิจวัตรประจำวัน (Self-Care & ADL)',
  'การบูรณาการประสาทความรู้สึก (Sensory Integration)',
  'การสื่อสาร & การมีปฏิสัมพันธ์ทางสังคม (Social & Communication)'
];

// เทมเพลตเป้าหมายแนะนำ
const PRESET_GOALS = [
  {
    category: 'กล้ามเนื้อมัดเล็ก & สหสัมพันธ์ตา-มือ (Fine Motor)',
    title: 'ใช้นิ้วหัวแม่มือและนิ้วชี้ (Pincer Grasp) หยิบวัตถุขนาดเล็กใส่ขวดได้อย่างคล่องแคล่ว',
    targetTerm: 'ระยะสั้น (1-3 เดือน)'
  },
  {
    category: 'กล้ามเนื้อมัดเล็ก & สหสัมพันธ์ตา-มือ (Fine Motor)',
    title: 'ใช้กรรไกรตัดกระดาษตามแนวเส้นตรงระยะ 15 ซม. ได้โดยไม่หลุดจากแนวเส้น',
    targetTerm: 'ระยะสั้น (1-3 เดือน)'
  },
  {
    category: 'การช่วยเหลือตนเอง & กิจวัตรประจำวัน (Self-Care & ADL)',
    title: 'สามารถติดและปลดกระดุมเสื้อผ้าขนาดมาตรฐานได้ด้วยตนเองอย่างน้อย 4 เม็ด',
    targetTerm: 'ระยะยาว (3-6 เดือน)'
  },
  {
    category: 'กล้ามเนื้อมัดใหญ่ & การทรงตัว (Gross Motor)',
    title: 'ทรงตัวยืนขาเดียวสลับข้างได้ข้างละอย่างน้อย 5 วินาที โดยไม่เสียการทรงตัว',
    targetTerm: 'ระยะสั้น (1-3 เดือน)'
  },
  {
    category: 'การบูรณาการประสาทความรู้สึก (Sensory Integration)',
    title: 'สามารถนั่งทำงานหรือทำกิจกรรมบนโต๊ะได้อย่างต่อเนื่อง 15 นาที โดยไม่ลุกออกจากที่',
    targetTerm: 'ระยะสั้น (1-3 เดือน)'
  },
  {
    category: 'การสื่อสาร & การมีปฏิสัมพันธ์ทางสังคม (Social & Communication)',
    title: 'สบตาและหันมาตอบรับเมื่อผู้ฝึกหรือผู้ปกครองเรียกชื่ออย่างน้อย 8 ใน 10 ครั้ง',
    targetTerm: 'ระยะสั้น (1-3 เดือน)'
  }
];

export default function ITPTracker({
  patients = [],
  therapists = [],
  itpGoals = [],
  setItpGoals,
  currentUser,
  clinicInfo
}) {
  const [selectedHn, setSelectedHn] = useState('');
  const [patientSearchText, setPatientSearchText] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [termFilter, setTermFilter] = useState('All');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [formCategory, setFormCategory] = useState(ITP_CATEGORIES[0]);
  const [formTitle, setFormTitle] = useState('');
  const [formTerm, setFormTerm] = useState('ระยะสั้น (1-3 เดือน)');
  const [formTargetDate, setFormTargetDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [formProgress, setFormProgress] = useState(0);
  const [formStatus, setFormStatus] = useState('กำลังฝึก');
  const [formNotes, setFormNotes] = useState('');

  // คัดกรองผู้ป่วย
  const filteredPatients = useMemo(() => {
    const q = patientSearchText.trim().toLowerCase();
    if (!q || q.startsWith('hn:')) return patients;
    return patients.filter(p => 
      String(p.hn).toLowerCase().includes(q) || 
      String(p.nickname || '').toLowerCase().includes(q) || 
      `${p.title || ''}${p.firstname} ${p.lastname}`.toLowerCase().includes(q)
    );
  }, [patients, patientSearchText]);

  // ผู้รับบริการที่เลือก
  const activePatient = useMemo(() => {
    return patients.find(p => String(p.hn) === String(selectedHn)) || null;
  }, [patients, selectedHn]);

  // ซิงค์ชื่อผู้ป่วยในช่องค้นหา
  React.useEffect(() => {
    if (selectedHn && activePatient) {
      setPatientSearchText(`HN: ${activePatient.hn} | ${formatPatientNickname(activePatient.nickname)} (${activePatient.title || ''}${activePatient.firstname} ${activePatient.lastname})`);
    }
  }, [selectedHn, activePatient]);

  // เป้าหมายของผู้ป่วยรายนี้
  const patientGoals = useMemo(() => {
    if (!selectedHn) return [];
    return (itpGoals || []).filter(g => String(g.hn) === String(selectedHn));
  }, [itpGoals, selectedHn]);

  // สถิติภาพรวม
  const stats = useMemo(() => {
    if (patientGoals.length === 0) {
      return { total: 0, completed: 0, inProgress: 0, notStarted: 0, avgProgress: 0 };
    }
    const total = patientGoals.length;
    const completed = patientGoals.filter(g => g.progress >= 100 || g.status === 'บรรลุเป้าหมายแล้ว').length;
    const notStarted = patientGoals.filter(g => g.progress === 0 && g.status === 'ยังไม่เริ่ม').length;
    const inProgress = total - completed - notStarted;
    const sumProgress = patientGoals.reduce((sum, g) => sum + (parseInt(g.progress, 10) || 0), 0);
    const avgProgress = Math.round(sumProgress / total);
    return { total, completed, inProgress, notStarted, avgProgress };
  }, [patientGoals]);

  // กรองเป้าหมายตามแถบเลือก
  const displayGoals = useMemo(() => {
    return patientGoals.filter(g => {
      const matchCat = categoryFilter === 'All' || g.category === categoryFilter;
      const matchTerm = termFilter === 'All' || g.targetTerm === termFilter;
      return matchCat && matchTerm;
    });
  }, [patientGoals, categoryFilter, termFilter]);

  // เปิด Modal เพิ่มเป้าหมาย
  const handleOpenAdd = () => {
    setEditingGoalId(null);
    setFormCategory(ITP_CATEGORIES[0]);
    setFormTitle('');
    setFormTerm('ระยะสั้น (1-3 เดือน)');
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    setFormTargetDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    setFormProgress(0);
    setFormStatus('กำลังฝึก');
    setFormNotes('');
    setShowModal(true);
  };

  // เปิด Modal แก้ไขเป้าหมาย
  const handleOpenEdit = (goal) => {
    setEditingGoalId(goal.id);
    setFormCategory(goal.category || ITP_CATEGORIES[0]);
    setFormTitle(goal.title || '');
    setFormTerm(goal.targetTerm || 'ระยะสั้น (1-3 เดือน)');
    setFormTargetDate(goal.targetDate || '');
    setFormProgress(goal.progress || 0);
    setFormStatus(goal.status || 'กำลังฝึก');
    setFormNotes(goal.evalNotes || '');
    setShowModal(true);
  };

  // บันทึกเป้าหมาย
  const handleSaveGoal = (e) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      Swal.fire({ icon: 'warning', title: 'กรุณาระบุรายละเอียดเป้าหมาย', confirmButtonColor: 'var(--secondary)' });
      return;
    }

    const currentList = [...(itpGoals || [])];
    const nowIso = new Date().toISOString();
    const currentTherapistName = currentUser?.fullname || currentUser?.nickname || 'ครูผู้บำบัด';

    const goalData = {
      id: editingGoalId || `ITP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      hn: selectedHn,
      category: formCategory,
      title: formTitle.trim(),
      targetTerm: formTerm,
      targetDate: formTargetDate,
      progress: parseInt(formProgress, 10) || 0,
      status: parseInt(formProgress, 10) >= 100 ? 'บรรลุเป้าหมายแล้ว' : formStatus,
      evalNotes: formNotes.trim(),
      therapist: currentTherapistName,
      updatedAt: nowIso
    };

    if (editingGoalId) {
      const idx = currentList.findIndex(g => g.id === editingGoalId);
      if (idx !== -1) {
        currentList[idx] = { ...currentList[idx], ...goalData };
      }
    } else {
      currentList.push({ ...goalData, createdAt: nowIso });
    }

    if (setItpGoals) {
      setItpGoals(currentList);
    }

    setShowModal(false);
    Swal.fire({
      icon: 'success',
      title: editingGoalId ? 'แก้ไขเป้าหมายเรียบร้อย' : 'เพิ่มเป้าหมายสำเร็จ',
      timer: 1500,
      showConfirmButton: false
    });
  };

  // ปรับความก้าวหน้าอย่างรวดเร็ว (Quick Progress Update)
  const handleQuickProgress = (goalId, newProgress) => {
    const currentList = [...(itpGoals || [])];
    const idx = currentList.findIndex(g => g.id === goalId);
    if (idx !== -1) {
      currentList[idx] = {
        ...currentList[idx],
        progress: newProgress,
        status: newProgress >= 100 ? 'บรรลุเป้าหมายแล้ว' : (newProgress === 0 ? 'ยังไม่เริ่ม' : 'กำลังฝึก'),
        updatedAt: new Date().toISOString()
      };
      if (setItpGoals) setItpGoals(currentList);
    }
  };

  // ลบเป้าหมาย
  const handleDeleteGoal = (goalId) => {
    Swal.fire({
      title: 'ยืนยันการลบเป้าหมายนี้?',
      text: 'ข้อมูลเป้าหมายนี้จะถูกลบออกจากแผนการบำบัดของผู้รับบริการ',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ลบข้อมูล',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: 'var(--danger)',
      cancelButtonColor: '#aaa'
    }).then(res => {
      if (res.isConfirmed) {
        const updated = (itpGoals || []).filter(g => g.id !== goalId);
        if (setItpGoals) setItpGoals(updated);
        Swal.fire({ icon: 'success', title: 'ลบข้อมูลแล้ว', timer: 1200, showConfirmButton: false });
      }
    });
  };

  // พิมพ์รายงานความก้าวหน้ารายบุคคล (ITP Progress Report PDF)
  const handlePrintReport = () => {
    if (!activePatient || patientGoals.length === 0) {
      Swal.fire({ icon: 'info', title: 'ไม่มีข้อมูลเป้าหมาย', text: 'กรุณาเลือกผู้รับบริการที่มีเป้าหมายในระบบเพื่อพิมพ์รายงาน', confirmButtonColor: 'var(--secondary)' });
      return;
    }

    const printWin = window.open('', '_blank');
    if (!printWin) {
      Swal.fire({ icon: 'warning', title: 'เบราว์เซอร์บล็อกหน้าต่างพิมพ์', text: 'กรุณาอนุญาตป๊อปอัปสำหรับเว็บไซต์นี้' });
      return;
    }

    const nickname = formatPatientNickname(activePatient.nickname) || activePatient.firstname;
    const fullName = `${activePatient.title || ''}${activePatient.firstname} ${activePatient.lastname}`;
    const todayBE = formatDateBE(new Date());

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>ITP Progress Report - น้อง${nickname} (${activePatient.hn})</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: 'Sarabun', 'Segoe UI', Tahoma, sans-serif; color: #1e293b; background: #fff; margin: 0; padding: 0; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #8b5a2b; padding-bottom: 12px; margin-bottom: 16px; }
          .clinic-name { font-size: 20px; font-weight: bold; color: #8b5a2b; }
          .clinic-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
          .report-badge { background: #fdf8f6; border: 1px solid #fed7aa; border-radius: 8px; padding: 12px 16px; margin-bottom: 18px; display: flex; justify-content: space-between; font-size: 13px; }
          .metric-row { display: flex; gap: 12px; margin-bottom: 20px; }
          .metric-card { flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; text-align: center; background: #f8fafc; }
          .metric-num { font-size: 20px; font-weight: bold; color: #8b5a2b; }
          .metric-lbl { font-size: 11px; color: #64748b; }
          .goal-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; margin-bottom: 12px; background: #fafafa; }
          .goal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
          .goal-cat { font-size: 11px; font-weight: bold; color: #8b5a2b; }
          .goal-term { font-size: 10px; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; }
          .goal-title { font-size: 13px; font-weight: 600; color: #0f172a; margin-bottom: 8px; line-height: 1.4; }
          .progress-track { width: 100%; height: 10px; background: #e2e8f0; border-radius: 5px; overflow: hidden; margin-bottom: 6px; }
          .progress-bar { height: 100%; background: #16a34a; }
          .goal-meta { display: flex; justify-content: space-between; font-size: 11px; color: #64748b; }
          .goal-notes { margin-top: 6px; font-size: 11px; color: #1e40af; background: #eff6ff; padding: 6px 10px; border-radius: 4px; }
          .footer-sig { margin-top: 40px; display: flex; justify-content: space-between; }
          .sig-box { text-align: center; width: 220px; font-size: 12px; }
          .sig-line { border-bottom: 1px dotted #94a3b8; height: 40px; margin-bottom: 6px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="clinic-name">${clinicInfo?.name || 'คลินิกบ้านฮักดี'}</div>
            <div class="clinic-sub">คลินิกการประกอบโรคศิลปะสาขากิจกรรมบำบัด | โทร ${clinicInfo?.phone || '094-675-3557'}</div>
          </div>
          <div style="text-align: right; font-size: 12px; color: #64748b;">
            <div style="font-weight: bold; color: #0f172a; font-size: 14px;">รายงานความก้าวหน้าแผนการบำบัด (ITP Report)</div>
            <div>วันที่ออกรายงาน: ${todayBE}</div>
          </div>
        </div>

        <div class="report-badge">
          <div><strong>ผู้รับบริการ:</strong> น้อง${nickname} (${fullName}) | <strong>รหัส HN:</strong> ${activePatient.hn}</div>
          <div><strong>ผู้ปกครอง:</strong> ${activePatient.guardian || '-'} | <strong>เบอร์ติดต่อ:</strong> ${activePatient.phone || '-'}</div>
        </div>

        <div class="metric-row">
          <div class="metric-card"><div class="metric-num">${stats.total}</div><div class="metric-lbl">เป้าหมายทั้งหมด</div></div>
          <div class="metric-card"><div class="metric-num" style="color: #16a34a;">${stats.completed}</div><div class="metric-lbl">บรรลุเป้าหมายแล้ว</div></div>
          <div class="metric-card"><div class="metric-num" style="color: #d97706;">${stats.inProgress}</div><div class="metric-lbl">กำลังฝึกฝน</div></div>
          <div class="metric-card"><div class="metric-num" style="color: #2563eb;">${stats.avgProgress}%</div><div class="metric-lbl">ความก้าวหน้าเฉลี่ย</div></div>
        </div>

        <div style="font-size: 14px; font-weight: bold; margin-bottom: 12px; color: #0f172a;">
          🎯 รายละเอียดเป้าหมายการฟื้นฟูพัฒนาการรายบุคคล:
        </div>

        ${patientGoals.map((g, idx) => `
          <div class="goal-card">
            <div class="goal-header">
              <span class="goal-cat">${g.category}</span>
              <span class="goal-term">${g.targetTerm}</span>
            </div>
            <div class="goal-title">${idx + 1}. ${g.title}</div>
            <div class="progress-track">
              <div class="progress-bar" style="width: ${g.progress}%; background: ${g.progress >= 100 ? '#16a34a' : g.progress >= 50 ? '#0284c7' : '#f59e0b'};"></div>
            </div>
            <div class="goal-meta">
              <span>ความก้าวหน้า: <strong>${g.progress}%</strong> (${g.status})</span>
              <span>เป้าหมายวันที่: ${formatDateBE(g.targetDate)} | ครูผู้ดูแล: ${g.therapist || '-'}</span>
            </div>
            ${g.evalNotes ? `<div class="goal-notes"><strong>บันทึกความคืบหน้า:</strong> ${g.evalNotes}</div>` : ''}
          </div>
        `).join('')}

        <div class="footer-sig">
          <div class="sig-box">
            <div class="sig-line"></div>
            <div>( ${currentUser?.fullname || 'นักกิจกรรมบำบัดผู้ประเมิน'} )</div>
            <div style="color: #64748b; font-size: 10px;">นักกิจกรรมบำบัดผู้จัดทำแผน</div>
          </div>
          <div class="sig-box">
            <div class="sig-line"></div>
            <div>( ${activePatient.guardian || 'ผู้ปกครอง'} )</div>
            <div style="color: #64748b; font-size: 10px;">ผู้ปกครองรับทราบแผนการบำบัด</div>
          </div>
        </div>

        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(htmlContent);
    printWin.document.close();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>
          <Target size={28} />
          แผนเป้าหมายการบำบัดรายบุคคล (ITP Goals Tracker)
        </h1>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {selectedHn && patientGoals.length > 0 && (
            <button 
              className="btn btn-secondary" 
              onClick={handlePrintReport}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#0284c7', borderColor: '#0284c7', color: 'white' }}
            >
              <Printer size={16} /> พิมพ์รายงานความก้าวหน้า (PDF)
            </button>
          )}
          {selectedHn && (
            <button 
              className="btn btn-primary" 
              onClick={handleOpenAdd}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Plus size={16} /> เพิ่มเป้าหมายใหม่
            </button>
          )}
        </div>
      </div>

      {/* เลือกผู้รับบริการ */}
      <div className="card-2xl">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <label style={{ fontWeight: 600, fontSize: '0.95rem', margin: 0 }}>
            กรุณาเลือกผู้รับบริการเพื่อติดตามเป้าหมายการบำบัด (ITP):
          </label>
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              className="form-control" 
              placeholder="-- พิมพ์ HN, ชื่อจริง, หรือชื่อเล่น เพื่อค้นหาผู้รับบริการ --" 
              value={patientSearchText}
              onChange={(e) => {
                setPatientSearchText(e.target.value);
                setSelectedHn('');
                setShowPatientDropdown(true);
              }}
              onFocus={() => setShowPatientDropdown(true)}
              onBlur={() => setTimeout(() => setShowPatientDropdown(false), 250)}
              style={{ paddingLeft: '2.5rem' }}
            />
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--dark-light)' }} />

            {showPatientDropdown && (
              <div 
                className="card-md"
                style={{ 
                  position: 'absolute', 
                  top: '100%', 
                  left: 0, 
                  right: 0, 
                  maxHeight: '260px', 
                  overflowY: 'auto', 
                  zIndex: 1000, 
                  backgroundColor: 'white', 
                  border: '1px solid var(--border)', 
                  boxShadow: 'var(--shadow-lg)', 
                  borderRadius: 'var(--radius-md)' 
                }}
              >
                {filteredPatients.length === 0 ? (
                  <div style={{ padding: '1rem', color: 'var(--dark-light)', textAlign: 'center' }}>
                    ไม่พบข้อมูลผู้รับบริการ
                  </div>
                ) : (
                  filteredPatients.map(p => (
                    <div 
                      key={p.hn}
                      style={{ 
                        padding: '0.6rem 1rem', 
                        cursor: 'pointer', 
                        fontSize: '0.9rem', 
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.15s' 
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--light)'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      onMouseDown={() => {
                        setSelectedHn(p.hn);
                        setPatientSearchText(`HN: ${p.hn} | ${formatPatientNickname(p.nickname)} (${p.title || ''}${p.firstname} ${p.lastname})`);
                        setShowPatientDropdown(false);
                      }}
                    >
                      <strong>HN: {p.hn}</strong> | น้อง{formatPatientNickname(p.nickname)} ({p.title || ''}${p.firstname} {p.lastname})
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* เมื่อเลือกผู้รับบริการแล้ว */}
      {selectedHn && activePatient ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* ข้อมูลสรุปและ Progress Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
            <div className="card-2xl" style={{ padding: '1.25rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--dark-light)', marginBottom: '0.25rem' }}>เป้าหมายทั้งหมด</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--dark)' }}>{stats.total}</div>
            </div>
            <div className="card-2xl" style={{ padding: '1.25rem', textAlign: 'center', backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
              <div style={{ fontSize: '0.8rem', color: '#166534', marginBottom: '0.25rem' }}>บรรลุเป้าหมายแล้ว</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#16a34a' }}>{stats.completed}</div>
            </div>
            <div className="card-2xl" style={{ padding: '1.25rem', textAlign: 'center', backgroundColor: '#fffbeb', borderColor: '#fde68a' }}>
              <div style={{ fontSize: '0.8rem', color: '#92400e', marginBottom: '0.25rem' }}>กำลังฝึกฝน</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#d97706' }}>{stats.inProgress}</div>
            </div>
            <div className="card-2xl" style={{ padding: '1.25rem', textAlign: 'center', backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }}>
              <div style={{ fontSize: '0.8rem', color: '#1e40af', marginBottom: '0.25rem' }}>ความสำเร็จโดยรวม</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#2563eb' }}>{stats.avgProgress}%</div>
            </div>
          </div>

          {/* แถบตัวกรอง */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button 
                type="button" 
                className={`btn btn-sm ${categoryFilter === 'All' ? 'btn-secondary' : 'btn-light'}`}
                onClick={() => setCategoryFilter('All')}
              >
                ทุกหมวดหมู่
              </button>
              {ITP_CATEGORIES.map(cat => {
                const shortName = cat.split('(')[0].trim();
                return (
                  <button 
                    key={cat}
                    type="button" 
                    className={`btn btn-sm ${categoryFilter === cat ? 'btn-secondary' : 'btn-light'}`}
                    onClick={() => setCategoryFilter(cat)}
                  >
                    {shortName}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {['All', 'ระยะสั้น (1-3 เดือน)', 'ระยะยาว (3-6 เดือน)'].map(term => (
                <button
                  key={term}
                  type="button"
                  className={`toggle-filter-btn ${termFilter === term ? 'active' : ''}`}
                  onClick={() => setTermFilter(term)}
                  style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
                >
                  {term === 'All' ? 'ทุกระยะ' : term.split('(')[0].trim()}
                </button>
              ))}
            </div>
          </div>

          {/* รายการเป้าหมาย */}
          {displayGoals.length === 0 ? (
            <div className="card-2xl" style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--dark-light)' }}>
              <Target size={40} color="#cbd5e1" style={{ margin: '0 auto 1rem auto' }} />
              <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--dark)' }}>
                ยังไม่มีเป้าหมายในหมวดนี้
              </div>
              <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                กดปุ่ม "+ เพิ่มเป้าหมายใหม่" เพื่อกำหนดเป้าหมายการบำบัดของน้อง{formatPatientNickname(activePatient.nickname)}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {displayGoals.map((goal, index) => {
                const progressNum = parseInt(goal.progress, 10) || 0;
                const isDone = progressNum >= 100 || goal.status === 'บรรลุเป้าหมายแล้ว';

                return (
                  <div 
                    key={goal.id}
                    className="card-2xl"
                    style={{ 
                      padding: '1.25rem', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '0.8rem',
                      borderLeft: `5px solid ${isDone ? '#16a34a' : progressNum >= 50 ? '#0284c7' : '#f59e0b'}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--secondary)', backgroundColor: '#fef3c7', padding: '0.2rem 0.55rem', borderRadius: '12px' }}>
                            {goal.category}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--dark-light)', backgroundColor: '#f1f5f9', padding: '0.2rem 0.55rem', borderRadius: '12px' }}>
                            {goal.targetTerm}
                          </span>
                        </div>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--dark)', margin: 0, lineHeight: 1.4 }}>
                          {index + 1}. {goal.title}
                        </h3>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span className={`badge ${isDone ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.8rem', padding: '0.25rem 0.6rem' }}>
                          {isDone ? '✓ บรรลุเป้าหมาย' : `${progressNum}%`}
                        </span>
                        <button 
                          type="button" 
                          onClick={() => handleOpenEdit(goal)} 
                          className="btn btn-light btn-icon-only" 
                          title="แก้ไขเป้าหมาย"
                          style={{ padding: '0.35rem' }}
                        >
                          <Edit2 size={14} color="var(--secondary)" />
                        </button>
                        <button 
                          type="button" 
                          onClick={() => handleDeleteGoal(goal.id)} 
                          className="btn btn-light btn-icon-only" 
                          title="ลบเป้าหมาย"
                          style={{ padding: '0.35rem', color: 'var(--danger)' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar & Quick Adjust */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--dark-light)', marginBottom: '0.35rem' }}>
                        <span>ระดับความก้าวหน้า: <strong>{progressNum}%</strong></span>
                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                          {[0, 25, 50, 75, 100].map(val => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => handleQuickProgress(goal.id, val)}
                              style={{
                                padding: '0.15rem 0.45rem',
                                fontSize: '0.7rem',
                                borderRadius: '4px',
                                border: '1px solid var(--border)',
                                backgroundColor: progressNum === val ? 'var(--secondary)' : '#ffffff',
                                color: progressNum === val ? '#ffffff' : 'var(--dark)',
                                cursor: 'pointer',
                                fontWeight: 600
                              }}
                            >
                              {val}%
                            </button>
                          ))}
                        </div>
                      </div>

                      <div style={{ width: '100%', height: '10px', backgroundColor: '#e2e8f0', borderRadius: '5px', overflow: 'hidden' }}>
                        <div 
                          style={{ 
                            width: `${progressNum}%`, 
                            height: '100%', 
                            backgroundColor: isDone ? '#16a34a' : progressNum >= 50 ? '#0284c7' : '#f59e0b',
                            transition: 'width 0.3s ease'
                          }} 
                        />
                      </div>
                    </div>

                    {/* Notes & Metadata */}
                    {goal.evalNotes && (
                      <div style={{ backgroundColor: '#f8fafc', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid #e2e8f0', fontSize: '0.82rem', color: '#334155' }}>
                        <strong>บันทึกความคืบหน้า:</strong> {goal.evalNotes}
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--dark-light)', marginTop: '0.2rem' }}>
                      <span>กำหนดเป้าหมาย: {formatDateBE(goal.targetDate)}</span>
                      <span>ครูผู้ประเมิน: {goal.therapist || 'ครูผู้บำบัด'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="card-2xl" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--dark-light)' }}>
          <Target size={48} color="#cbd5e1" style={{ margin: '0 auto 1.25rem auto' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--dark)', marginBottom: '0.5rem' }}>
            ยังไม่ได้เลือกผู้รับบริการ
          </h3>
          <p style={{ fontSize: '0.9rem', maxWidth: '450px', margin: '0 auto' }}>
            กรุณาเลือกผู้รับบริการจากช่องค้นหาด้านบน เพื่อจัดการและติดตามเป้าหมายการบำบัด (ITP Goals Tracker)
          </p>
        </div>
      )}

      {/* Modal: เพิ่ม / แก้ไขเป้าหมาย */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content-wrapper" style={{ maxWidth: '650px', width: '95%' }}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 700, margin: 0 }}>
                {editingGoalId ? 'แก้ไขเป้าหมายการบำบัด' : 'เพิ่มเป้าหมายการบำบัดใหม่'}
              </h3>
              <button className="close-modal-btn" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={handleSaveGoal}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '72vh', overflowY: 'auto' }}>
                {/* เลือกหมวดหมู่ */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>หมวดหมู่เป้าหมาย</label>
                  <select 
                    className="form-control" 
                    value={formCategory} 
                    onChange={(e) => setFormCategory(e.target.value)}
                  >
                    {ITP_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* เทมเพลตแนะนำ */}
                <div style={{ backgroundColor: '#faf5ef', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid #f3e8db' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#8b5a2b', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Sparkles size={13} /> ตัวอย่างเป้าหมายที่พบบ่อย (คลิกเพื่อเลือก):
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {PRESET_GOALS.filter(p => p.category === formCategory).map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setFormTitle(preset.title);
                          setFormTerm(preset.targetTerm);
                        }}
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '12px',
                          border: '1px solid #d4c2b0',
                          backgroundColor: '#ffffff',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        {preset.title.length > 35 ? preset.title.substring(0, 32) + '...' : preset.title}
                      </button>
                    ))}
                  </div>
                </div>

                {/* รายละเอียดเป้าหมาย */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    รายละเอียดเป้าหมาย (Goal Description) <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <textarea 
                    className="form-control" 
                    rows={3} 
                    placeholder="เช่น น้องสามารถสบตาและตอบรับเมื่อถูกเรียกชื่อ 8 ใน 10 ครั้ง..."
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    required
                  />
                </div>

                {/* ระยะและวันที่กำหนด */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>ระยะของเป้าหมาย</label>
                    <select 
                      className="form-control" 
                      value={formTerm} 
                      onChange={(e) => setFormTerm(e.target.value)}
                    >
                      <option value="ระยะสั้น (1-3 เดือน)">ระยะสั้น (1-3 เดือน)</option>
                      <option value="ระยะยาว (3-6 เดือน)">ระยะยาว (3-6 เดือน)</option>
                      <option value="ระยะยาว (6-12 เดือน)">ระยะยาว (6-12 เดือน)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>วันที่เป้าหมาย</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={formTargetDate} 
                      onChange={(e) => setFormTargetDate(e.target.value)}
                      required 
                    />
                  </div>
                </div>

                {/* ความก้าวหน้าเริ่มต้น / ปัจจุบัน */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>ความก้าวหน้า (%): {formProgress}%</label>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: formProgress >= 100 ? '#16a34a' : '#d97706' }}>
                      {formProgress >= 100 ? 'บรรลุเป้าหมายแล้ว' : formProgress === 0 ? 'ยังไม่เริ่ม' : 'กำลังฝึก'}
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    step="5" 
                    value={formProgress} 
                    onChange={(e) => setFormProgress(parseInt(e.target.value, 10))}
                    style={{ width: '100%', accentColor: 'var(--secondary)' }}
                  />
                </div>

                {/* บันทึกผลการประเมินความคืบหน้า */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>บันทึกความคืบหน้า / ข้อสังเกตของครู</label>
                  <textarea 
                    className="form-control" 
                    rows={2} 
                    placeholder="เช่น น้องเริ่มทำได้ดีขึ้นเมื่อให้แรงเสริมทางบวก..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-light" onClick={() => setShowModal(false)}>
                  ยกเลิก
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingGoalId ? 'บันทึกการแก้ไข' : 'บันทึกเป้าหมาย'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
