import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard,
  Users, 
  UserCheck, 
  CalendarDays, 
  CircleDollarSign, 
  AlertTriangle,
  ChevronRight,
  Tag
} from 'lucide-react';
import Swal from 'sweetalert2';
import { formatPatientNickname, formatTherapistName, getLocalDateString } from '../utils/format';

export default function Dashboard({ 
  patients, 
  appointments, 
  receipts, 
  therapists, 
  onUpdateAppointmentStatus,
  currentUser,
  holidays = [],
  promotions = []
}) {
  const todayLocalDateString = getLocalDateString(new Date());

  const [selectedDate, setSelectedDate] = useState(todayLocalDateString);
  const [alertPage, setAlertPage] = useState(1);
  const [availDate, setAvailDate] = useState(todayLocalDateString);
  const [availTherapistId, setAvailTherapistId] = useState('All');
  const [availPage, setAvailPage] = useState(1);
  const [promoPage, setPromoPage] = useState(1);

  // คำนวณรหัสครูผู้ใช้งานปัจจุบันเพื่อล็อกสิทธิ์ OT
  const myTherapistId = useMemo(() => {
    if (currentUser?.role === 'OT') {
      const myTherapist = therapists.find(t => 
        t.id === currentUser.employeeId || 
        t.fullname === currentUser.fullname || 
        (t.nickname && currentUser.nickname && t.nickname === currentUser.nickname)
      );
      return myTherapist ? myTherapist.id : 'NONE';
    }
    return null;
  }, [currentUser, therapists]);

  // ตรวจสอบวันหยุดคลินิกสำหรับวันที่เลือก
  const clinicHoliday = useMemo(() => {
    if (!availDate || !holidays) return null;
    return holidays.find(h => h.date === availDate);
  }, [availDate, holidays]);

  // คำนวณชื่อวันสำหรับวันที่เลือกเพื่อความปลอดภัยเรื่อง Timezone
  const availDayName = useMemo(() => {
    if (!availDate) return '';
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const parts = availDate.split('-');
    if (parts.length === 3) {
      return daysOfWeek[new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)).getDay()];
    }
    const d = new Date(availDate);
    return isNaN(d.getTime()) ? '' : daysOfWeek[d.getDay()];
  }, [availDate]);

  // คำนวณคิวว่างของครู
  const teacherAvailableSlots = useMemo(() => {
    if (!availDate) return [];

    const selectedDayName = availDayName;

    const isOT = currentUser?.role === 'OT';
    const effectiveTherapistId = isOT ? (myTherapistId || 'NONE') : availTherapistId;

    let targetTherapists = therapists.filter(t => t.status !== 'Inactive');
    if (effectiveTherapistId !== 'All') {
      targetTherapists = targetTherapists.filter(t => t.id === effectiveTherapistId);
    }

    const list = [];

    targetTherapists.forEach(therapist => {
      // ตรวจสอบว่าครูเข้าปฏิบัติงานในวันดังกล่าวหรือไม่
      const works = (therapist.workDays || []).includes(selectedDayName);
      if (!works) return;

      // ดึงช่วงเวลาทำงานของครู
      let slotsForDay = [];
      if (therapist.workHours) {
        if (typeof therapist.workHours === 'object' && !Array.isArray(therapist.workHours)) {
          slotsForDay = therapist.workHours[selectedDayName] || [];
        } else if (Array.isArray(therapist.workHours)) {
          slotsForDay = therapist.workHours;
        }
      }

      // ดึงสล็อตที่จองไปแล้ว
      const bookedSlots = appointments
        .filter(app => app.date && getLocalDateString(app.date) === availDate && app.therapistId === therapist.id && app.status !== 'ยกเลิก')
        .map(app => app.timeSlot);

      slotsForDay.forEach(slot => {
        const isBooked = bookedSlots.includes(slot);
        if (!isBooked) {
          list.push({
            id: `${therapist.id}-${slot}`,
            time: slot,
            therapistId: therapist.id,
            therapistName: `${formatTherapistName(therapist.nickname)} (${therapist.fullname})`,
            therapistNickname: formatTherapistName(therapist.nickname),
            status: 'ว่าง'
          });
        }
      });
    });

    // เรียงเวลาจากเช้าไปเย็น และเรียงตามชื่อครู
    return list.sort((a, b) => {
      const timeCompare = String(a.time).localeCompare(String(b.time));
      if (timeCompare !== 0) return timeCompare;
      return String(a.therapistNickname).localeCompare(String(b.therapistNickname));
    });
  }, [availDate, availTherapistId, appointments, therapists, currentUser, myTherapistId]);

  const itemsPerPage = 10;
  const maxAvailPages = Math.ceil(teacherAvailableSlots.length / itemsPerPage) || 1;
  const paginatedAvailSlots = useMemo(() => {
    const startIndex = (availPage - 1) * itemsPerPage;
    return teacherAvailableSlots.slice(startIndex, startIndex + itemsPerPage);
  }, [teacherAvailableSlots, availPage]);

  // รีเซ็ตหน้าเมื่อตัวกรองเปลี่ยน
  React.useEffect(() => {
    setAvailPage(1);
  }, [availDate, availTherapistId]);

  // 1. คำนวณสถิติ
  const totalPatients = patients.length;
  
  const activePatients = useMemo(() => {
    return patients.filter(p => p.status === 'Active');
  }, [patients]);
  
  const activeCasesCount = activePatients.length;

  const genderStats = useMemo(() => {
    const maleCount = patients.filter(p => p.gender === 'ชาย').length;
    const femaleCount = patients.filter(p => p.gender === 'หญิง').length;
    const malePercent = totalPatients > 0 ? Math.round((maleCount / totalPatients) * 100) : 0;
    const femalePercent = totalPatients > 0 ? Math.round((femaleCount / totalPatients) * 100) : 0;
    return { maleCount, femaleCount, malePercent, femalePercent };
  }, [patients, totalPatients]);

  const todayAppointmentsCount = useMemo(() => {
    let list = appointments.filter(app => app.date && getLocalDateString(app.date) === todayLocalDateString && app.status !== 'ยกเลิก');
    if (currentUser?.role === 'OT') {
      const myTherapist = therapists.find(t => 
        t.id === currentUser.employeeId || 
        t.fullname === currentUser.fullname || 
        (t.nickname && currentUser.nickname && t.nickname === currentUser.nickname)
      );
      const myTherapistId = myTherapist ? myTherapist.id : 'NONE';
      list = list.filter(app => app.therapistId === myTherapistId);
    }
    return list.length;
  }, [appointments, todayLocalDateString, currentUser, therapists]);

  const monthlySales = useMemo(() => {
    const currentMonth = todayLocalDateString.slice(0, 7); // YYYY-MM
    const monthlyBills = receipts.filter(r => 
      r.date.startsWith(currentMonth) && 
      r.status === 'ชำระเงินแล้ว'
    );
    return monthlyBills.reduce((sum, r) => sum + r.totalAmount, 0);
  }, [receipts, todayLocalDateString]);

  // 2. ตารางนัดหมายตามวันที่เลือก
  const filteredAppointments = useMemo(() => {
    let list = appointments.filter(app => app.date && getLocalDateString(app.date) === selectedDate);
    if (currentUser?.role === 'OT') {
      const myTherapist = therapists.find(t => 
        t.id === currentUser.employeeId || 
        t.fullname === currentUser.fullname || 
        (t.nickname && currentUser.nickname && t.nickname === currentUser.nickname)
      );
      const myTherapistId = myTherapist ? myTherapist.id : 'NONE';
      list = list.filter(app => app.therapistId === myTherapistId);
    }
    return list.map(app => {
      const patient = patients.find(p => String(p.hn) === String(app.hn));
      const therapist = therapists.find(t => t.id === app.therapistId);
      return {
        ...app,
        patientName: patient ? `${patient.title}${patient.firstname} ${patient.lastname}` : 'ไม่พบข้อมูลผู้ป่วย',
        patientNickname: patient ? patient.nickname : '',
        therapistNickname: therapist ? formatTherapistName(therapist.nickname) : 'ไม่พบชื่อครู'
      };
    }).sort((a, b) => String(a.timeSlot || '').localeCompare(String(b.timeSlot || '')));
  }, [appointments, selectedDate, patients, therapists, currentUser]);

  // 3. ตารางคอร์สใกล้หมด (Active Patients, คอร์สเหลือ <= 2)
  // คำนวณคอร์สคงเหลือของแต่ละคน: ยอดซื้อบริการสะสม (Paid) - ยอดใช้งาน (Served)
  // เรียงจากใหม่ไปเก่า (ตามวันที่ลงทะเบียน/HN)
  const courseAlerts = useMemo(() => {
    let list = activePatients;
    if (currentUser?.role === 'OT') {
      const myTherapist = therapists.find(t => 
        t.id === currentUser.employeeId || 
        t.fullname === currentUser.fullname || 
        (t.nickname && currentUser.nickname && t.nickname === currentUser.nickname)
      );
      const myTherapistId = myTherapist ? myTherapist.id : 'NONE';
      const myHns = new Set(
        appointments
          .filter(app => app.therapistId === myTherapistId)
          .map(app => app.hn)
      );
      list = activePatients.filter(p => myHns.has(p.hn));
    }
    return list
      .map(patient => {
        // ยอดซื้อสะสม (เฉพาะบิลชำระเงินแล้ว)
        const patientReceipts = receipts.filter(r => r.hn === patient.hn && r.status === 'ชำระเงินแล้ว');
        let totalPurchased = 0;
        patientReceipts.forEach(r => {
          r.items.forEach(item => {
            if (item.type === 'บริการ') {
              if (item.code === 'TRANSFER_OUT') {
                totalPurchased -= item.quantity;
              } else if (item.code === 'TRANSFER_IN' || item.code === 'MANUAL_ADD') {
                totalPurchased += item.quantity;
              } else if (item.code === 'SV02' || (item.name && item.name.includes('ประเมินพัฒนาการ'))) {
                // ไม่เอา ประเมินพัฒนาการครั้งแรกมานับ
              } else {
                const sessionsPerUnit = item.sessionsPerUnit || (item.code === 'SV03' ? 10 : 1);
                totalPurchased += item.quantity * sessionsPerUnit;
              }
            }
          });
        });

        // ยอดใช้สะสม (สถานะ รับบริการแล้ว)
        const totalUsed = appointments.filter(app => String(app.hn) === String(patient.hn) && app.status === 'รับบริการแล้ว' && app.type === 'ฝึกกระตุ้นพัฒนาการ').length;
        
        const balance = totalPurchased - totalUsed;

        return {
          hn: patient.hn,
          name: `${patient.title}${patient.firstname} ${patient.lastname}`,
          nickname: patient.nickname,
          purchased: totalPurchased,
          used: totalUsed,
          balance: balance,
          created_at: patient.created_at || ''
        };
      })
      .filter(alert => alert.purchased > 0 && alert.balance <= 2)
      .sort((a, b) => {
        // เรียงจากจำนวนคงเหลือน้อยไปมาก (balance asc)
        if (a.balance !== b.balance) {
          return a.balance - b.balance;
        }
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        if (timeB !== timeA) return timeB - timeA;
        return String(b.hn).localeCompare(String(a.hn));
      });
  }, [activePatients, receipts, appointments, currentUser, therapists]);

  const alertsPerPage = 10;
  const maxAlertPages = useMemo(() => {
    return Math.ceil(courseAlerts.length / alertsPerPage);
  }, [courseAlerts]);

  const paginatedAlerts = useMemo(() => {
    const startIndex = (alertPage - 1) * alertsPerPage;
    return courseAlerts.slice(startIndex, startIndex + alertsPerPage);
  }, [courseAlerts, alertPage]);

  React.useEffect(() => {
    setAlertPage(1);
  }, [courseAlerts.length]);

  // คำนวณโปรโมชั่นที่มีสถานะ Active
  const activePromotions = useMemo(() => {
    if (!promotions) return [];
    const list = promotions.map(p => {
      const usedCount = receipts ? receipts.filter(r => r.promotionId === p.code && r.status !== 'ยกเลิก').length : 0;
      const maxUses = parseInt(p.maxUses, 10) || 0;
      const remaining = Math.max(0, maxUses - usedCount);
      const isExpired = !(todayLocalDateString >= p.startDate && todayLocalDateString <= p.endDate);
      const isActive = !isExpired && remaining > 0;
      return {
        ...p,
        usedCount,
        remaining,
        isActive
      };
    }).filter(p => p.isActive);

    // เรียงจากจำนวนสิทธิ์คงเหลือจากน้อยไปมาก
    return list.sort((a, b) => a.remaining - b.remaining);
  }, [promotions, receipts, todayLocalDateString]);

  const promoPerPage = 10;
  const maxPromoPages = useMemo(() => {
    return Math.ceil(activePromotions.length / promoPerPage) || 1;
  }, [activePromotions]);

  const paginatedPromotions = useMemo(() => {
    const startIndex = (promoPage - 1) * promoPerPage;
    return activePromotions.slice(startIndex, startIndex + promoPerPage);
  }, [activePromotions, promoPage]);

  React.useEffect(() => {
    setPromoPage(1);
  }, [activePromotions.length]);

  const handleStatusChange = (appId, newStatus) => {
    onUpdateAppointmentStatus(appId, newStatus);
    Swal.fire({
      icon: 'success',
      title: 'อัปเดตสถานะนัดหมายเรียบร้อย',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 1500
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="page-header">
        <h1 className="page-title">
          <LayoutDashboard size={28} />
          หน้าหลักแดชบอร์ด
        </h1>
        <div style={{ color: 'var(--dark-light)', fontWeight: 500 }}>
          วันที่ระบบ: {(() => {
            const parts = todayLocalDateString.split('-');
            const d = parseInt(parts[2], 10);
            const m = parseInt(parts[1], 10);
            const y = parseInt(parts[0], 10);
            const thaiMonths = [
              'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
              'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
            ];
            return `${d} ${thaiMonths[m - 1]} ${y + 543} (${y})`;
          })()}
        </div>
      </div>

      {/* 4. สรุปข้อมูลยอดการ์ด */}
      <div className="dashboard-grid">
        <div className="card-2xl stat-card">
          <div className="stat-title">ผู้รับบริการทั้งหมด</div>
          <div className="stat-value" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{totalPatients} คน</span>
            <Users size={32} color="var(--primary)" />
          </div>
        </div>

        <div className="card-2xl stat-card">
          <div className="stat-title">Active Cases</div>
          <div className="stat-value" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{activeCasesCount} ราย</span>
            <UserCheck size={32} color="var(--success)" />
          </div>
        </div>

        <div className="card-2xl stat-card">
          <div className="stat-title">นัดหมายวันนี้</div>
          <div className="stat-value" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{todayAppointmentsCount} คิว</span>
            <CalendarDays size={32} color="var(--warning)" />
          </div>
        </div>

        {!['OT', 'Staff'].includes(currentUser?.role) && (
          <div className="card-2xl stat-card">
            <div className="stat-title">
              ยอดขายเดือนนี้ ({(() => {
                const m = parseInt(todayLocalDateString.split('-')[1], 10);
                const thaiMonthAbbrs = [
                  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
                  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
                ];
                return thaiMonthAbbrs[m - 1];
              })()})
            </div>
            <div className="stat-value" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>฿{monthlySales.toLocaleString()}</span>
              <CircleDollarSign size={32} color="var(--secondary)" />
            </div>
          </div>
        )}

        <div className="card-2xl stat-card">
          <div className="stat-title">สัดส่วนเพศผู้รับบริการ</div>
          <div className="gender-ratio">
            <div className="gender-label-group">
              <span style={{ color: 'var(--info)' }}>ชาย {genderStats.maleCount} คน ({genderStats.malePercent}%)</span>
              <span style={{ color: 'var(--secondary)' }}>หญิง {genderStats.femaleCount} คน ({genderStats.femalePercent}%)</span>
            </div>
            <div className="gender-bar-container">
              <div className="gender-bar-male" style={{ width: `${genderStats.malePercent}%` }}></div>
              <div className="gender-bar-female" style={{ width: `${genderStats.femalePercent}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-sections">
        {/* คอลัมน์ซ้าย: รวมตารางนัดหมายรายวัน และ ตารางคิวว่างครู */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* 5. ตารางนัดหมายรายวัน */}
          <div className="card-3xl">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>ตารางนัดหมายประจำวัน</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>เลือกวันที่:</span>
                <input 
                  type="date" 
                  className="form-control" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{ width: '150px', padding: '0.4rem 0.6rem' }}
                />
              </div>
            </div>

            {filteredAppointments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--dark-light)' }}>
                ไม่มีคิวนัดหมายในวันที่ {selectedDate === todayLocalDateString ? 'วันนี้' : selectedDate}
              </div>
            ) : (
              <div className="table-container">
                <table className="hdh-table">
                  <thead>
                    <tr>
                      <th>เวลา</th>
                      <th>HN (ผู้รับบริการ)</th>
                      <th>ประเภทนัดหมาย</th>
                      <th>ครูผู้สอน</th>
                      <th>สถานะ</th>
                      <th>เปลี่ยนสถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAppointments.map((app) => (
                      <tr key={app.id}>
                        <td style={{ fontWeight: 600 }}>{app.timeSlot}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{app.patientName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--dark-light)' }}>HN: {app.hn} ({formatPatientNickname(app.patientNickname)})</div>
                        </td>
                        <td>{app.type || 'ฝึกกระตุ้นพัฒนาการ'}</td>
                        <td>{app.therapistNickname}</td>
                        <td>
                          <span className={`badge ${
                            app.status === 'จองแล้ว' ? 'badge-warning' : 
                            app.status === 'ยืนยันแล้ว' ? 'badge-info' : 
                            app.status === 'รับบริการแล้ว' ? 'badge-success' : 'badge-danger'
                          }`}>
                            {app.status}
                          </span>
                        </td>
                        <td>
                          <select 
                            className="form-control"
                            value={app.status}
                            onChange={(e) => handleStatusChange(app.id, e.target.value)}
                            style={{ padding: '0.3rem 0.5rem', fontSize: '0.85rem', width: '130px' }}
                          >
                            <option value="จองแล้ว">จองแล้ว</option>
                            <option value="ยืนยันแล้ว">ยืนยันแล้ว</option>
                            <option value="รับบริการแล้ว">รับบริการแล้ว</option>
                            <option value="ยกเลิก">ยกเลิก</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 5.1 ตารางคิวว่างของครู */}
          <div className="card-3xl">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>คิวว่างของครู</h2>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>เลือกวันที่:</span>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={availDate}
                    onChange={(e) => setAvailDate(e.target.value)}
                    style={{ width: '150px', padding: '0.4rem 0.6rem' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>ครูผู้สอน:</span>
                  {currentUser?.role === 'OT' ? (
                    <span style={{ fontWeight: 600, color: 'var(--primary)', backgroundColor: 'var(--primary-light, #eff6ff)', padding: '0.4rem 0.8rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                      {(() => {
                        const t = therapists.find(th => th.id === myTherapistId);
                        return t ? `${formatTherapistName(t.nickname)} (${t.fullname})` : 'ไม่พบข้อมูลครู';
                      })()}
                    </span>
                  ) : (
                    <select 
                      className="form-control"
                      value={availTherapistId}
                      onChange={(e) => setAvailTherapistId(e.target.value)}
                      style={{ width: '180px', padding: '0.4rem 0.6rem' }}
                    >
                      <option value="All">-- ครูทุกคน --</option>
                      {therapists.map(t => (
                        <option key={t.id} value={t.id}>
                          {formatTherapistName(t.nickname)} ({t.fullname})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>

            {clinicHoliday ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--danger)', backgroundColor: '#fff5f5', borderRadius: 'var(--radius-md)', border: '1px solid var(--danger-light, #fee2e2)', fontWeight: 600 }}>
                วันหยุดคลินิก: {clinicHoliday.name} - ไม่มีคิวว่างของครูในวันนี้
              </div>
            ) : (currentUser?.role === 'OT' && myTherapistId && !therapists.find(t => t.id === myTherapistId)?.workDays?.includes(availDayName)) ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--dark-light)' }}>
                วันนี้ไม่ได้เป็นวันเข้าปฏิบัติงานของคุณครู
              </div>
            ) : teacherAvailableSlots.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--dark-light)' }}>
                ไม่มีคิวว่างของครูในวันที่เลือก
              </div>
            ) : (
              <>
                <div className="table-container">
                  <table className="hdh-table">
                    <thead>
                      <tr>
                        <th>เวลา</th>
                        <th>ครูผู้สอน</th>
                        <th style={{ textAlign: 'center', width: '120px' }}>สถานะ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedAvailSlots.map((slot) => (
                        <tr key={slot.id}>
                          <td style={{ fontWeight: 600 }}>{slot.time}</td>
                          <td>{slot.therapistName}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="badge badge-success" style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}>
                              {slot.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {maxAvailPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem', marginBottom: '0.5rem' }}>
                    <button 
                      className="btn btn-light" 
                      disabled={availPage === 1}
                      onClick={() => setAvailPage(availPage - 1)}
                      type="button"
                    >
                      ก่อนหน้า
                    </button>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>หน้า {availPage} / {maxAvailPages}</span>
                    <button 
                      className="btn btn-light" 
                      disabled={availPage === maxAvailPages}
                      onClick={() => setAvailPage(availPage + 1)}
                      type="button"
                    >
                      ถัดไป
                    </button>
                  </div>
                )}

                <div style={{ fontSize: '0.8rem', color: 'var(--dark-light)', textAlign: 'right', marginTop: '1rem' }}>
                  แสดง {teacherAvailableSlots.length === 0 ? 0 : (availPage - 1) * itemsPerPage + 1} - {Math.min(availPage * itemsPerPage, teacherAvailableSlots.length)} จากทั้งหมด {teacherAvailableSlots.length} คิวว่าง
                </div>
              </>
            )}
          </div>

        </div>

        {/* คอลัมน์ขวา: แจ้งเตือนโปรโมชั่น และ เตือนคอร์สใกล้หมด */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* แจ้งเตือนโปรโมชั่น */}
          <div className="card-3xl">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <Tag color="var(--primary)" size={20} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>แจ้งเตือนโปรโมชั่นใช้งานอยู่ (Active)</h2>
            </div>
            
            <p style={{ fontSize: '0.8rem', color: 'var(--dark-light)', marginBottom: '1rem' }}>
              แสดงโปรโมชั่นที่เปิดใช้งานอยู่ ณ วันปัจจุบัน และแสดงสิทธิ์คงเหลือที่ใช้ได้ (เรียงจากสิทธิ์น้อยไปมาก)
            </p>

            {activePromotions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--dark-light)', fontSize: '0.9rem' }}>
                ไม่มีโปรโมชั่นที่มีสถานะ Active ในขณะนี้
              </div>
            ) : (
              <>
                <div className="table-container" style={{ margin: 0, border: 'none', boxShadow: 'none' }}>
                  <table className="hdh-table" style={{ fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '0.5rem 0.75rem' }}>รหัส</th>
                        <th style={{ padding: '0.5rem 0.75rem' }}>ชื่อโปรโมชั่น</th>
                        <th style={{ padding: '0.5rem 0.75rem', textAlign: 'center', width: '90px' }}>คงเหลือ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedPromotions.map((promo) => (
                        <tr key={promo.code}>
                          <td style={{ fontWeight: 700, fontFamily: 'monospace', padding: '0.6rem 0.75rem' }}>{promo.code}</td>
                          <td style={{ padding: '0.6rem 0.75rem' }}>
                            <div style={{ fontWeight: 600 }}>{promo.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--dark-light)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }} title={promo.description}>
                              {promo.description || '-'}
                            </div>
                          </td>
                          <td style={{ 
                            textAlign: 'center', 
                            fontWeight: 700, 
                            padding: '0.6rem 0.75rem',
                            color: promo.remaining <= 2 ? 'var(--danger)' : 'inherit'
                          }}>
                            {promo.remaining} สิทธิ์
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {maxPromoPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', marginTop: '1.25rem', marginBottom: '0.5rem' }}>
                    <button 
                      className="btn btn-light" 
                      disabled={promoPage === 1}
                      onClick={() => setPromoPage(promoPage - 1)}
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                      type="button"
                    >
                      ก่อนหน้า
                    </button>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{promoPage} / {maxPromoPages}</span>
                    <button 
                      className="btn btn-light" 
                      disabled={promoPage === maxPromoPages}
                      onClick={() => setPromoPage(promoPage + 1)}
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                      type="button"
                    >
                      ถัดไป
                    </button>
                  </div>
                )}

                <div style={{ fontSize: '0.75rem', color: 'var(--dark-light)', textAlign: 'right', marginTop: '0.5rem' }}>
                  แสดง {activePromotions.length === 0 ? 0 : (promoPage - 1) * promoPerPage + 1} - {Math.min(promoPage * promoPerPage, activePromotions.length)} จากทั้งหมด {activePromotions.length} รายการ
                </div>
              </>
            )}
          </div>

          {/* 6. แจ้งเตือนคอร์สใกล้หมด */}
          <div className="card-3xl">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <AlertTriangle color="var(--danger)" size={20} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>เตือนคอร์สใกล้หมด</h2>
            </div>
            
            <p style={{ fontSize: '0.8rem', color: 'var(--dark-light)', marginBottom: '1rem' }}>
              แสดงลูกค้า Active ที่มียอดคอร์สคงเหลือ ≤ 2 ครั้ง (เรียงจากจำนวนคงเหลือน้อยไปมาก)
            </p>

            {courseAlerts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--success)', fontSize: '0.9rem' }}>
                ✓ ไม่มีคิวลูกค้าคอร์สใกล้หมด
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {paginatedAlerts.map((alert) => (
                    <div 
                      key={alert.hn}
                      style={{ 
                        border: '1px solid var(--border-light)',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.75rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: alert.balance <= 0 ? 'var(--danger-light)' : 'var(--warning-light)'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{formatPatientNickname(alert.nickname)} ({alert.name})</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--dark-light)' }}>HN: {alert.hn} | ซื้อ {alert.purchased} ใช้ {alert.used}</div>
                      </div>
                      
                      <span className={`badge ${alert.balance <= 0 ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '0.85rem', padding: '0.3rem 0.6rem' }}>
                        คงเหลือ {alert.balance} ครั้ง
                      </span>
                    </div>
                  ))}
                </div>

                {maxAlertPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', marginTop: '1.25rem', marginBottom: '0.5rem' }}>
                    <button 
                      className="btn btn-light" 
                      disabled={alertPage === 1}
                      onClick={() => setAlertPage(alertPage - 1)}
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                      type="button"
                    >
                      ก่อนหน้า
                    </button>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{alertPage} / {maxAlertPages}</span>
                    <button 
                      className="btn btn-light" 
                      disabled={alertPage === maxAlertPages}
                      onClick={() => setAlertPage(alertPage + 1)}
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                      type="button"
                    >
                      ถัดไป
                    </button>
                  </div>
                )}

                <div style={{ fontSize: '0.75rem', color: 'var(--dark-light)', textAlign: 'right', marginTop: '0.5rem' }}>
                  แสดง {courseAlerts.length === 0 ? 0 : (alertPage - 1) * alertsPerPage + 1} - {Math.min(alertPage * alertsPerPage, courseAlerts.length)} จากทั้งหมด {courseAlerts.length} รายการ
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
