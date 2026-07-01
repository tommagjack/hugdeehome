import React, { useState, useMemo } from 'react';
import { formatPatientNickname } from '../utils/format';
import { 
  BarChart3, 
  Calendar, 
  Clock, 
  User, 
  Eye, 
  Award,
  Sparkles,
  Download
} from 'lucide-react';

export default function ServiceSummary({ 
  patients, 
  appointments, 
  therapists,
  currentUser
}) {
  // คำนวณรอบเงินเดือนปัจจุบันโดยอัตโนมัติ (วันที่ 26 ของเดือนก่อน ถึง วันที่ 25 ของเดือนปัจจุบัน)
  const defaultDates = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0 = ม.ค.
    const date = today.getDate();

    let startYear, startMonth, endYear, endMonth;

    if (date <= 25) {
      // รอบบิลสิ้นสุดในวันที่ 25 ของเดือนนี้
      endYear = year;
      endMonth = month;
      
      const prev = new Date(year, month - 1, 26);
      startYear = prev.getFullYear();
      startMonth = prev.getMonth();
    } else {
      // รอบบิลสิ้นสุดในวันที่ 25 ของเดือนถัดไป
      const next = new Date(year, month + 1, 25);
      endYear = next.getFullYear();
      endMonth = next.getMonth();
      
      startYear = year;
      startMonth = month;
    }

    const format = (y, m, d) => {
      const mm = String(m + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      return `${y}-${mm}-${dd}`;
    };

    return {
      start: format(startYear, startMonth, 26),
      end: format(endYear, endMonth, 25)
    };
  }, []);

  const [startDate, setStartDate] = useState(defaultDates.start);
  const [endDate, setEndDate] = useState(defaultDates.end);
  
  // สถานะเปิด Modal รายละเอียด
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [modalDetails, setModalDetails] = useState({
    therapistName: '',
    nickname: '',
    date: '',
    cases: []
  });

  // 1. คำนวณชั่วโมงสอนของครูแต่ละคนในช่วงเวลาเพื่อแสดงการ์ดสรุปด้านบน
  // (ครูคนไหนไม่มีงานในช่วงนั้นจะไม่แสดงการ์ด)
  const teacherSummaryCards = useMemo(() => {
    // นับจำนวนชั่วโมงที่สอนสำเร็จ (รับบริการแล้ว) ของแต่ละครู
    const counts = {};
    
    // ตั้งต้นครูทั้งหมดด้วย 0
    therapists.forEach(t => {
      counts[t.id] = 0;
    });

    // กรองและนับ (เฉพาะ 'ประเมินพัฒนาการครั้งแรก' และ 'ฝึกกระตุ้นพัฒนาการ' ที่มีสถานะ 'รับบริการแล้ว')
    appointments.forEach(app => {
      if (
        app.status === 'รับบริการแล้ว' && 
        (app.type === 'ประเมินพัฒนาการครั้งแรก' || app.type === 'ฝึกกระตุ้นพัฒนาการ') &&
        app.date >= startDate && 
        app.date <= endDate
      ) {
        if (counts[app.therapistId] !== undefined) {
          counts[app.therapistId]++;
        }
      }
    });

    // แมปข้อมูลครูและส่งคืนเฉพาะครูที่มีชั่วโมงสอน > 0
    let list = therapists
      .map(t => ({
        id: t.id,
        nickname: t.nickname,
        fullname: t.fullname,
        licenseNo: t.licenseNo,
        totalHours: counts[t.id]
      }))
      .filter(t => t.totalHours > 0);

    // ถ้าเป็นบทบาท OT ให้แสดงเฉพาะชั่วโมงสอนของตนเอง
    if (currentUser && currentUser.role === 'OT') {
      const myTherapist = therapists.find(t => 
        t.id === currentUser.employeeId || 
        t.fullname === currentUser.fullname || 
        (t.nickname && currentUser.nickname && t.nickname === currentUser.nickname)
      );
      const myTherapistId = myTherapist ? myTherapist.id : 'NONE';
      list = list.filter(t => t.id === myTherapistId);
    }

    return list;
  }, [appointments, therapists, startDate, endDate, currentUser]);

  // 2. จัดกลุ่มนัดหมายที่สอนสำเร็จตาม ครู + วัน (1 แถวต่อครูในวันเดียวกัน)
  const aggregatedTeachingRows = useMemo(() => {
    const groups = {};

    // กรองเฉพาะนัดหมายที่สอนสำเร็จในรอบวันที่เลือก (เฉพาะ 'ประเมินพัฒนาการครั้งแรก' และ 'ฝึกกระตุ้นพัฒนาการ')
    const servedApps = appointments.filter(app => 
      app.status === 'รับบริการแล้ว' && 
      (app.type === 'ประเมินพัฒนาการครั้งแรก' || app.type === 'ฝึกกระตุ้นพัฒนาการ') &&
      app.date >= startDate && 
      app.date <= endDate
    );

    servedApps.forEach(app => {
      const key = `${app.therapistId}_${app.date}`;
      if (!groups[key]) {
        groups[key] = {
          therapistId: app.therapistId,
          date: app.date,
          hours: 0,
          appointmentIds: []
        };
      }
      groups[key].hours++;
      groups[key].appointmentIds.push(app.id);
    });

    let myTherapistId = null;
    if (currentUser && currentUser.role === 'OT') {
      const myTherapist = therapists.find(t => 
        t.id === currentUser.employeeId || 
        t.fullname === currentUser.fullname || 
        (t.nickname && currentUser.nickname && t.nickname === currentUser.nickname)
      );
      myTherapistId = myTherapist ? myTherapist.id : 'NONE';
    }

    // แปลงกลุ่มเป็นอาเรย์ แร็พชื่อคุณครู และเรียงตามวันที่ล่าสุด
    return Object.values(groups)
      .map(g => {
        const therapist = therapists.find(t => t.id === g.therapistId);
        return {
          ...g,
          therapistNickname: therapist ? therapist.nickname : 'ไม่ระบุชื่อครู',
          therapistFullname: therapist ? therapist.fullname : 'ไม่ระบุชื่อครู',
          licenseNo: therapist ? therapist.licenseNo : ''
        };
      })
      .filter(row => {
        if (currentUser && currentUser.role === 'OT') {
          return row.therapistId === myTherapistId;
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || a.therapistNickname.localeCompare(b.therapistNickname));
  }, [appointments, therapists, startDate, endDate, currentUser]);

  // 3. คลิกดูข้อมูลเปิด Modal
  const handleViewDetailClick = (row) => {
    // ดึงนัดหมายที่เป็นของครูคนนี้ในวันนั้นและมีสถานะรับบริการแล้ว (เฉพาะ 'ประเมินพัฒนาการครั้งแรก' และ 'ฝึกกระตุ้นพัฒนาการ')
    const dailyApps = appointments
      .filter(app => 
        app.therapistId === row.therapistId && 
        app.date === row.date && 
        app.status === 'รับบริการแล้ว' &&
        (app.type === 'ประเมินพัฒนาการครั้งแรก' || app.type === 'ฝึกกระตุ้นพัฒนาการ')
      )
      .map(app => {
        const patient = patients.find(p => String(p.hn) === String(app.hn));
        return {
          ...app,
          patientName: patient ? `${patient.title}${patient.firstname} ${patient.lastname}` : 'ไม่พบข้อมูล',
          patientNickname: patient ? patient.nickname : ''
        };
      })
      .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));

    setModalDetails({
      therapistName: row.therapistFullname,
      nickname: row.therapistNickname,
      date: row.date,
      cases: dailyApps
    });
    
    setShowDetailModal(true);
  };

  const getThaiDayOfWeek = (dateStr) => {
    if (!dateStr) return '';
    const parts = String(dateStr).split('-');
    if (parts.length !== 3) return '';
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    return days[d.getDay()] || '';
  };

  const handleExportCSV = () => {
    const headers = ['นักกิจกรรมบำบัด', 'วันที่', 'วันที่ในสัปดาห์', 'จำนวนเคสที่ฝึก'];
    const csvRows = [headers.join(',')];
    
    aggregatedTeachingRows.forEach(row => {
      const therapistName = `${row.therapistFullname} (${row.therapistNickname})`;
      
      const parts = String(row.date || '').split('-');
      let formattedDate = row.date;
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        formattedDate = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
      }
      
      const dayOfWeek = getThaiDayOfWeek(row.date);
      const caseCount = row.hours;
      
      const line = [
        `"${therapistName.replace(/"/g, '""')}"`,
        `"${formattedDate.replace(/"/g, '""')}"`,
        `"${dayOfWeek.replace(/"/g, '""')}"`,
        caseCount
      ].join(',');
      csvRows.push(line);
    });
    
    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `รายงานชั่วโมงสอนครู_${startDate}_ถึง_${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="page-header">
        <h1 className="page-title">
          <BarChart3 size={28} />
          สรุปการให้บริการและชั่วโมงสอนครู {currentUser?.role === 'Admin' ? '(Admin Only)' : ''}
        </h1>
        {currentUser?.role === 'Admin' && (
          <div className="page-actions">
            <button className="btn btn-primary" onClick={handleExportCSV}>
              <Download size={16} /> Export CSV
            </button>
          </div>
        )}
      </div>

      {/* เลือกช่วงเวลาอัจฉริยะ (เริ่มต้น 26 เดือนก่อนหน้า - 25 เดือนปัจจุบัน) */}
      <div className="card-2xl" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Calendar size={20} color="var(--secondary)" />
          <span style={{ fontWeight: 600 }}>รอบเงินเดือนผู้สอน:</span>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem' }}>จากวันที่</span>
            <input 
              type="date" 
              className="form-control" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              style={{ width: '150px', padding: '0.4rem 0.6rem' }}
            />
          </div>
          
          <span style={{ color: 'var(--dark-light)' }}>ถึง</span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem' }}>วันที่</span>
            <input 
              type="date" 
              className="form-control" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              style={{ width: '150px', padding: '0.4rem 0.6rem' }}
            />
          </div>
        </div>
      </div>

      {/* Dynamic Summary Cards ด้านบน (ครูคนไหนไม่มีงานในรอบนั้นจะไม่แสดงการ์ด) */}
      <div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Award size={18} color="var(--secondary)" />
          นักกิจกรรมบำบัดที่เข้าสอนในรอบบิลนี้
        </h2>

        {teacherSummaryCards.length === 0 ? (
          <div className="card-2xl" style={{ textAlign: 'center', padding: '2rem', color: 'var(--dark-light)', border: '1px dashed var(--border)' }}>
            ไม่มีข้อมูลชั่วโมงการสอนของครูท่านใดในช่วงรอบวันที่เลือก
          </div>
        ) : (
          <div className="dashboard-grid">
            {teacherSummaryCards.map(t => (
              <div key={t.id} className="card-2xl stat-card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <div className="stat-title" style={{ fontSize: '0.75rem' }}>{t.licenseNo || 'ไม่ระบุเลข ก.บ.'}</div>
                    <div style={{ fontWeight: 700, fontSize: '1.15rem', color: 'var(--dark)', marginTop: '0.25rem' }}>
                      {t.fullname} ({t.nickname})
                    </div>
                  </div>
                  <Sparkles size={20} color="var(--primary)" />
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '1rem', borderTop: '1px solid var(--border-light)', paddingTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--dark-light)' }}>ชั่วโมงสะสมในรอบ:</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--secondary)' }}>{t.totalHours} ชม.</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ตารางแสดงการเข้าสอนแต่ละวันแบบรวมแถว (ครู 1 คนต่อ 1 วัน = 1 แถว) */}
      <div className="card-3xl">
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem' }}>รายการชั่วโมงปฏิบัติงานรายวัน</h2>

        <div className="table-container">
          <table className="hdh-table">
            <thead>
              <tr>
                <th>วันที่เข้าสอน</th>
                <th>ครูผู้สอน</th>
                <th>เลขนักกิจกรรมบำบัด (ก.บ.)</th>
                <th style={{ textAlign: 'center' }}>ชั่วโมงสอนรวมในวัน</th>
                <th style={{ textAlign: 'center' }}>ดูรายละเอียดเคส</th>
              </tr>
            </thead>
            <tbody>
              {aggregatedTeachingRows.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--dark-light)' }}>
                    ไม่มีข้อมูลสรุปงานในช่วงเวลานี้
                  </td>
                </tr>
              ) : (
                aggregatedTeachingRows.map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>
                      {new Date(row.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </td>
                    <td style={{ fontWeight: 600 }}>{row.therapistFullname} ({row.therapistNickname})</td>
                    <td style={{ fontFamily: 'monospace' }}>{row.licenseNo || '-'}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--secondary)', fontSize: '1.1rem' }}>
                      {row.hours} ชั่วโมง
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <button 
                          className="btn btn-light btn-icon-only" 
                          title="ดูรายละเอียดการสอนวันนี้"
                          onClick={() => handleViewDetailClick(row)}
                        >
                          <Eye size={16} color="var(--dark)" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal ส่องดูเคสที่สอนในวันนั้น */}
      {showDetailModal && (
        <div className="modal-overlay">
          <div className="modal-content-wrapper" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 700 }}>ตารางการสอนคุณครู {modalDetails.nickname} วันที่ {new Date(modalDetails.date).toLocaleDateString('th-TH')}</h3>
              <button className="close-modal-btn" onClick={() => setShowDetailModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--dark-light)', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
                  <strong>ผู้สอนหลัก:</strong> {modalDetails.therapistName} | <strong>รวมคลาสสอนสำเร็จ:</strong> {modalDetails.cases.length} คลาส
                </div>

                <div className="table-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  <table className="hdh-table">
                    <thead>
                      <tr>
                        <th>ช่วงเวลา</th>
                        <th>HN ผู้ป่วย</th>
                        <th>ชื่อผู้เข้ารับบริการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalDetails.cases.map((cs, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600, color: 'var(--secondary)' }}>{cs.timeSlot}</td>
                          <td style={{ fontFamily: 'monospace' }}>{cs.hn}</td>
                          <td>
                            <strong>{cs.patientName}</strong> ({cs.patientNickname ? formatPatientNickname(cs.patientNickname) : ''})
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>ปิดหน้าต่าง</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
