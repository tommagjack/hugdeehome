import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Plus, 
  ArrowLeftRight, 
  History, 
  CalendarDays, 
  User, 
  ArrowUpRight, 
  ArrowDownLeft,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import Swal from 'sweetalert2';

export default function CourseBalance({ 
  patients, 
  appointments, 
  receipts, 
  onManualAddCourse, 
  onTransferCourse 
}) {
  const [selectedHn, setSelectedHn] = useState('');
  
  // สถานะ Modal
  const [showManualModal, setShowManualModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  
  // ตัวแปรฟอร์ม Manual Add
  const [manualSessions, setManualSessions] = useState(1);
  const [manualRemark, setManualRemark] = useState('เพิ่มคอร์สอำนวยความสะดวกภายนอก');
  
  // ตัวแปรฟอร์ม Transfer
  const [transferSessions, setTransferSessions] = useState(1);
  const [transfereeHn, setTransfereeHn] = useState('');
  const [transferRemark, setTransferRemark] = useState('โอนสิทธิ์ระหว่างครอบครัว');

  // ดึงผู้ป่วยที่เลือก
  const currentPatient = useMemo(() => {
    return patients.find(p => p.hn === selectedHn);
  }, [selectedHn, patients]);

  // คำนวณข้อมูลคอร์สของทุกคน
  const patientCourseBalances = useMemo(() => {
    return patients.map(p => {
      // 1. ยอดซื้อทั้งหมด (ชำระแล้วเท่านั้น)
      const patientReceipts = receipts.filter(r => r.hn === p.hn && r.status === 'ชำระเงินแล้ว');
      let purchased = 0;
      patientReceipts.forEach(r => {
        r.items.forEach(item => {
          if (item.type === 'บริการ') {
            if (item.code === 'TRANSFER_OUT') {
              purchased -= item.quantity; // โอนออก ลดยอด
            } else if (item.code === 'TRANSFER_IN' || item.code === 'MANUAL_ADD') {
              purchased += item.quantity; // โอนเข้า/แมนนวล เพิ่มยอด
            } else {
              const sessionsPerUnit = item.sessionsPerUnit || (item.code === 'SV03' ? 10 : 1);
              purchased += item.quantity * sessionsPerUnit;
            }
          }
        });
      });

      // 2. ยอดใช้ทั้งหมด (รับบริการแล้ว)
      const used = appointments.filter(app => app.hn === p.hn && app.status === 'รับบริการแล้ว').length;
      
      const balance = purchased - used;

      return {
        hn: p.hn,
        name: `${p.title}${p.firstname} ${p.lastname}`,
        nickname: p.nickname,
        status: p.status,
        purchased,
        used,
        balance
      };
    });
  }, [patients, receipts, appointments]);

  // ยอดสรุปของผู้ป่วยปัจจุบัน
  const currentBalanceInfo = useMemo(() => {
    if (!selectedHn) return null;
    return patientCourseBalances.find(b => b.hn === selectedHn);
  }, [selectedHn, patientCourseBalances]);

  // ประวัติการทำรายการแบบละเอียดของคนปัจจุบัน (เรียงตามวัน)
  const courseTransactionHistory = useMemo(() => {
    if (!selectedHn) return [];

    const list = [];

    // ดึงบิลซื้อ/ปรับปรุงคอร์ส ทั้งหมด
    const patientReceipts = receipts.filter(r => r.hn === selectedHn && r.status === 'ชำระเงินแล้ว');
    patientReceipts.forEach(r => {
      r.items.forEach(item => {
        if (item.type === 'บริการ') {
          let sessions = item.quantity;
          let typeLabel = 'ซื้อคอร์สบริการ';
          let direction = 'in';

          if (item.code === 'TRANSFER_OUT') {
            typeLabel = 'โอนคอร์สออก';
            direction = 'out';
            sessions = item.quantity;
          } else if (item.code === 'TRANSFER_IN') {
            typeLabel = 'โอนคอร์สเข้า';
            direction = 'in';
            sessions = item.quantity;
          } else if (item.code === 'MANUAL_ADD') {
            typeLabel = 'ปรับปรุงคอร์สแมนนวล';
            direction = 'in';
            sessions = item.quantity;
          } else {
            const sessionsPerUnit = item.sessionsPerUnit || (item.code === 'SV03' ? 10 : 1);
            sessions = item.quantity * sessionsPerUnit;
          }

          list.push({
            date: r.date,
            type: typeLabel,
            itemName: item.name,
            sessions,
            direction,
            docId: r.id,
            remark: r.discountReason || '-'
          });
        }
      });
    });

    // ดึงนัดหมายที่ใช้บริการแล้ว
    const patientApps = appointments.filter(app => app.hn === selectedHn && app.status === 'รับบริการแล้ว');
    patientApps.forEach(app => {
      list.push({
        date: app.date,
        type: 'เข้าใช้บริการรักษา',
        itemName: `กิจกรรมบำบัดเดี่ยว (คิวสอน)`,
        sessions: 1,
        direction: 'out',
        docId: app.id,
        remark: `สอนโดย ครู${appointments.find(a => a.id === app.id)?.therapistId || ''}`
      });
    });

    // เรียงประวัติจากล่าสุดลงไปอดีต
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [selectedHn, receipts, appointments]);

  // ยื่นคำขอเพิ่มแมนนวล
  const handleManualAddSubmit = (e) => {
    e.preventDefault();
    if (!selectedHn || manualSessions <= 0) return;
    
    onManualAddCourse(selectedHn, Number(manualSessions), manualRemark);
    
    Swal.fire({
      icon: 'success',
      title: 'ปรับปรุงเพิ่มคอร์สแบบแมนนวลสำเร็จ!',
      text: `บวกเพิ่ม ${manualSessions} ครั้ง ให้ น้อง${currentPatient.nickname}`,
      confirmButtonColor: 'var(--secondary)'
    });
    
    setShowManualModal(false);
    setManualSessions(1);
    setManualRemark('เพิ่มคอร์สอำนวยความสะดวกภายนอก');
  };

  // ยื่นคำขอโอนคอร์ส
  const handleTransferSubmit = (e) => {
    e.preventDefault();
    if (!selectedHn || !transfereeHn || transferSessions <= 0) return;

    if (selectedHn === transfereeHn) {
      Swal.fire({
        icon: 'error',
        title: 'ทำรายการไม่สำเร็จ',
        text: 'ไม่สามารถโอนสิทธิ์คอร์สให้ตนเองได้',
        confirmButtonColor: 'var(--secondary)'
      });
      return;
    }

    // ตรวจสอบว่าโอนเกินที่เหลือหรือไม่
    if (transferSessions > currentBalanceInfo.balance) {
      Swal.fire({
        icon: 'error',
        title: 'สิทธิ์คอร์สคงเหลือไม่เพียงพอ',
        text: `น้อง${currentPatient.nickname} มีคอร์สคงเหลือเพียง ${currentBalanceInfo.balance} ครั้ง ไม่สามารถโอน ${transferSessions} ครั้งได้`,
        confirmButtonColor: 'var(--secondary)'
      });
      return;
    }

    const transferee = patients.find(p => p.hn === transfereeHn);

    onTransferCourse(selectedHn, transfereeHn, Number(transferSessions), transferRemark);

    Swal.fire({
      icon: 'success',
      title: 'โอนคอร์สสำเร็จ!',
      text: `โอนจำนวน ${transferSessions} ครั้ง จากน้อง${currentPatient.nickname} ไปยังน้อง${transferee.nickname} เรียบร้อยแล้ว (สร้างบิล 2 ใบอัตโนมัติ)`,
      confirmButtonColor: 'var(--secondary)'
    });

    setShowTransferModal(false);
    setTransferSessions(1);
    setTransfereeHn('');
    setTransferRemark('โอนสิทธิ์ระหว่างครอบครัว');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="page-header">
        <h1 className="page-title">
          <FileText size={28} />
          ระบบบริหารจัดการคอร์สคงเหลือ (Course Balance)
        </h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* รายชื่อและค้นหายอดคงเหลือ (ฝั่งซ้าย) */}
        <div className="card-3xl">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem' }}>ข้อมูลคอร์สรายบุคคล</h2>
          
          <div className="form-group">
            <label className="form-label">ค้นหาและเลือกผู้รับบริการ</label>
            <select 
              className="form-control"
              value={selectedHn}
              onChange={(e) => setSelectedHn(e.target.value)}
            >
              <option value="">-- เลือกผู้รับบริการเพื่อดูประวัติ --</option>
              {patientCourseBalances.map(b => (
                <option key={b.hn} value={b.hn}>
                  HN: {b.hn} | น้อง{b.nickname} (เหลือ {b.balance} ครั้ง)
                </option>
              ))}
            </select>
          </div>

          {currentBalanceInfo ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div className="course-summary-box">
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--dark-light)' }}>ซื้อสะสม</div>
                  <div className="course-metric-val" style={{ color: 'var(--info)' }}>{currentBalanceInfo.purchased} ครั้ง</div>
                </div>
                <div style={{ width: '1px', height: '40px', backgroundColor: 'var(--border)' }}></div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--dark-light)' }}>ใช้จริง</div>
                  <div className="course-metric-val" style={{ color: 'var(--danger)' }}>{currentBalanceInfo.used} ครั้ง</div>
                </div>
                <div style={{ width: '1px', height: '40px', backgroundColor: 'var(--border)' }}></div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--dark-light)' }}>คงเหลือ</div>
                  <div className="course-metric-val" style={{ color: 'var(--success)', fontSize: '1.8rem' }}>
                    {currentBalanceInfo.balance} ครั้ง
                  </div>
                </div>
              </div>

              {/* ปุ่มลัดจัดการคอร์ส */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={() => setShowManualModal(true)}
                >
                  <Plus size={16} />
                  เพิ่มคอร์ส (Manual)
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  disabled={currentBalanceInfo.balance <= 0}
                  onClick={() => setShowTransferModal(true)}
                >
                  <ArrowLeftRight size={16} />
                  โอนคอร์ส (Transfer)
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--dark-light)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
              กรุณาเลือกผู้รับบริการ เพื่อดำเนินการเช็คยอดคอร์ส ปรับปรุงยอด หรือทำการโอนคอร์ส
            </div>
          )}
        </div>

        {/* ประวัติการปรับปรุงคอร์สและเข้าใช้ (ฝั่งขวา) */}
        <div className="card-3xl">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <History color="var(--secondary)" size={20} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>ประวัติการทำรายการคอร์สแบบละเอียด</h2>
          </div>

          {!selectedHn ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--dark-light)' }}>
              กรุณาเลือกผู้ป่วยทางฝั่งซ้ายเพื่อดูประวัติ
            </div>
          ) : courseTransactionHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--dark-light)' }}>
              ไม่พบประวัติการซื้อคอร์ส หรือการเข้าใช้บริการของเด็กรายนี้
            </div>
          ) : (
            <div className="table-container">
              <table className="hdh-table">
                <thead>
                  <tr>
                    <th>วันที่</th>
                    <th>ประเภทรายการ</th>
                    <th>รายละเอียดสินค้า/บริการ</th>
                    <th style={{ textAlign: 'center' }}>จำนวนเซสชัน</th>
                    <th>เอกสารอ้างอิง</th>
                  </tr>
                </thead>
                <tbody>
                  {courseTransactionHistory.map((h, index) => (
                    <tr key={index}>
                      <td>{new Date(h.date).toLocaleDateString('th-TH')}</td>
                      <td>
                        <span className={`badge ${
                          h.type === 'โอนคอร์สออก' ? 'badge-danger' : 
                          h.type === 'เข้าใช้บริการรักษา' ? 'badge-warning' : 
                          h.type === 'ซื้อคอร์สบริการ' ? 'badge-success' : 'badge-info'
                        }`}>
                          {h.type}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{h.itemName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--dark-light)' }}>{h.remark}</div>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: h.direction === 'in' ? 'var(--success)' : 'var(--danger)' }}>
                        {h.direction === 'in' ? `+${h.sessions}` : `-${h.sessions}`}
                      </td>
                      <td style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{h.docId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Modal 1: เพิ่มคอร์สแบบกำหนดเอง (Manual Add) */}
      {showManualModal && currentPatient && (
        <div className="modal-overlay">
          <div className="modal-content-wrapper" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 700 }}>เพิ่มคอร์สแบบกำหนดเอง (Manual)</h3>
              <button className="close-modal-btn" onClick={() => setShowManualModal(false)}>×</button>
            </div>
            <form onSubmit={handleManualAddSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ padding: '0.75rem', backgroundColor: 'var(--light)', borderRadius: 'var(--radius-md)', marginBottom: '0.5rem' }}>
                  <strong>ผู้ได้รับสิทธิ์:</strong> น้อง{currentPatient.nickname} ({currentPatient.title}{currentPatient.firstname})
                </div>
                
                <div className="form-group">
                  <label className="form-label">จำนวนสิทธิ์ที่ต้องการเพิ่ม (ครั้ง) <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input 
                    type="number" 
                    className="form-control" 
                    min="1" max="100" 
                    value={manualSessions} 
                    onChange={(e) => setManualSessions(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">เหตุผลประกอบการปรับปรุงคอร์ส <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <textarea 
                    className="form-control" 
                    rows="3" 
                    value={manualRemark} 
                    onChange={(e) => setManualRemark(e.target.value)} 
                    required
                  ></textarea>
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="submit" className="btn btn-secondary">ยืนยันปรับปรุงยอด</button>
                <button type="button" className="btn btn-light" onClick={() => setShowManualModal(false)}>ยกเลิก</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: โอนคอร์ส (Transfer) */}
      {showTransferModal && currentPatient && (
        <div className="modal-overlay">
          <div className="modal-content-wrapper" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 700 }}>ทำรายการโอนสิทธิ์คอร์ส (Transfer)</h3>
              <button className="close-modal-btn" onClick={() => setShowTransferModal(false)}>×</button>
            </div>
            <form onSubmit={handleTransferSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ padding: '0.75rem', backgroundColor: 'var(--danger-light)', borderRadius: 'var(--radius-md)', color: 'var(--dark)' }}>
                  <strong>ผู้โอนคอร์ส (ต้นทาง):</strong> น้อง{currentPatient.nickname} (คงเหลือ {currentBalanceInfo?.balance} ครั้ง)
                </div>

                <div className="form-group">
                  <label className="form-label">ผู้รับโอนคอร์ส (ปลายทาง) <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <select 
                    className="form-control"
                    value={transfereeHn}
                    onChange={(e) => setTransfereeHn(e.target.value)}
                    required
                  >
                    <option value="">-- เลือกผู้รับโอน --</option>
                    {patients
                      .filter(p => p.hn !== selectedHn && p.status === 'Active')
                      .map(p => (
                        <option key={p.hn} value={p.hn}>HN: {p.hn} | น้อง{p.nickname} ({p.title}{p.firstname})</option>
                      ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="form-label">จำนวนสิทธิ์ที่ต้องการโอน (ครั้ง) <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input 
                    type="number" 
                    className="form-control" 
                    min="1" 
                    max={currentBalanceInfo?.balance || 1} 
                    value={transferSessions} 
                    onChange={(e) => setTransferSessions(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">หมายเหตุการโอนสิทธิ์</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={transferRemark} 
                    onChange={(e) => setTransferRemark(e.target.value)} 
                  />
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="submit" className="btn btn-secondary">ยืนยันการโอนคอร์ส</button>
                <button type="button" className="btn btn-light" onClick={() => setShowTransferModal(false)}>ยกเลิก</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
