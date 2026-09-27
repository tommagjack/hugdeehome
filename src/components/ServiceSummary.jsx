import React, { useState, useMemo, useEffect } from 'react';
import { formatPatientNickname } from '../utils/format';
import { db } from '../utils/db';
import { 
  BarChart3, 
  Calendar, 
  Clock, 
  User, 
  Eye, 
  Award,
  Sparkles,
  Download,
  MapPin,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Users as UsersIcon,
  Briefcase
} from 'lucide-react';

export default function ServiceSummary({ 
  patients = [], 
  appointments = [], 
  therapists = [],
  users = [],
  attendance: propAttendance = [],
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

  // แท็บหลัก: 'teaching' (ชั่วโมงสอนครู OT) หรือ 'attendance' (การเข้าทำงานของพนักงาน)
  const [activeSummaryTab, setActiveSummaryTab] = useState('teaching');

  const [startDate, setStartDate] = useState(defaultDates.start);
  const [endDate, setEndDate] = useState(defaultDates.end);
  const [selectedTherapistId, setSelectedTherapistId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  
  // ซิงค์ attendance จาก prop และ fallback หาจาก db.getAttendance()
  const [attendance, setAttendance] = useState(() => {
    if (Array.isArray(propAttendance) && propAttendance.length > 0) return propAttendance;
    return db.getAttendance();
  });

  useEffect(() => {
    if (Array.isArray(propAttendance) && propAttendance.length > 0) {
      setAttendance(propAttendance);
    } else {
      setAttendance(db.getAttendance());
    }
  }, [propAttendance]);

  // วันที่ปัจจุบัน YYYY-MM-DD
  const todayStr = useMemo(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // สถานะเปิด Modal รายละเอียดการสอน (Tab 1)
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [modalDetails, setModalDetails] = useState({
    therapistName: '',
    nickname: '',
    date: '',
    cases: []
  });

  // สถานะเปิด Modal รายละเอียดการเข้างาน (Tab 2)
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [modalAttendance, setModalAttendance] = useState(null);

  // ค้นหาข้อมูลพนักงานจาก users / therapists
  const getEmployeeInfo = (empId, fallbackName = '') => {
    const normId = String(empId || '').toUpperCase().trim();
    const u = (users || []).find(user => 
      String(user.employeeId || user.employee_id || user.username || '').toUpperCase().trim() === normId ||
      (user.fullname && user.fullname === fallbackName)
    );
    if (u) {
      return {
        employeeId: u.employeeId || u.employee_id || normId,
        fullname: u.fullname || u.name || fallbackName,
        nickname: u.nickname || '',
        position: u.position || u.role || 'พนักงาน',
        role: u.role || 'Staff'
      };
    }
    const t = (therapists || []).find(therapist => 
      String(therapist.id || '').toUpperCase().trim() === normId ||
      therapist.fullname === fallbackName
    );
    if (t) {
      return {
        employeeId: t.id || normId,
        fullname: t.fullname || fallbackName,
        nickname: t.nickname || '',
        position: 'นักกิจกรรมบำบัด',
        role: 'OT'
      };
    }
    return {
      employeeId: normId,
      fullname: fallbackName || normId,
      nickname: '',
      position: 'พนักงาน',
      role: ''
    };
  };

  // ตรวจสอบสิทธิ์การแสดงผลสำหรับผู้ใช้ที่ล็อกอินอยู่
  const myEmployeeId = useMemo(() => {
    if (!currentUser) return null;
    return String(currentUser.employeeId || currentUser.employee_id || currentUser.username || '').toUpperCase().trim();
  }, [currentUser]);

  const isAllowedEmployee = (empId, empFullname) => {
    if (!currentUser || currentUser.role === 'Admin') return true;
    const normId = String(empId || '').toUpperCase().trim();
    if (myEmployeeId && normId === myEmployeeId) return true;
    if (currentUser.fullname && empFullname === currentUser.fullname) return true;
    if (currentUser.username && String(currentUser.username).toUpperCase() === normId) return true;
    return false;
  };

  // รายชื่อพนักงานสำหรับ Dropdown เลือกใน Tab 2 (Admin view)
  const availableEmployees = useMemo(() => {
    const list = [];
    const seen = new Set();
    
    (users || []).forEach(u => {
      const id = String(u.employeeId || u.employee_id || u.username || '').toUpperCase().trim();
      if (id && !seen.has(id)) {
        seen.add(id);
        list.push({
          id,
          fullname: u.fullname || u.name || id,
          nickname: u.nickname || '',
          position: u.position || u.role || 'พนักงาน'
        });
      }
    });

    (therapists || []).forEach(t => {
      const id = String(t.id || '').toUpperCase().trim();
      if (id && !seen.has(id)) {
        seen.add(id);
        list.push({
          id,
          fullname: t.fullname || id,
          nickname: t.nickname || '',
          position: 'นักกิจกรรมบำบัด'
        });
      }
    });

    return list.sort((a, b) => a.fullname.localeCompare(b.fullname));
  }, [users, therapists]);

  // ==========================================
  // TAB 1: คำนวณชั่วโมงสอนครู (OT)
  // ==========================================

  // 1. คำนวณชั่วโมงสอนของครูแต่ละคนในช่วงเวลาเพื่อแสดงการ์ดสรุปด้านบน
  const teacherSummaryCards = useMemo(() => {
    const counts = {};
    
    therapists.forEach(t => {
      counts[t.id] = 0;
    });

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

    let list = therapists
      .map(t => ({
        id: t.id,
        nickname: t.nickname,
        fullname: t.fullname,
        licenseNo: t.licenseNo,
        totalHours: counts[t.id]
      }))
      .filter(t => t.totalHours > 0);

    if (currentUser && currentUser.role === 'OT') {
      const myTherapist = therapists.find(t => 
        t.id === currentUser.employeeId || 
        t.fullname === currentUser.fullname || 
        (t.nickname && currentUser.nickname && t.nickname === currentUser.nickname)
      );
      const myTherapistId = myTherapist ? myTherapist.id : 'NONE';
      list = list.filter(t => t.id === myTherapistId);
    } else if (selectedTherapistId) {
      list = list.filter(t => t.id === selectedTherapistId);
    }

    return list;
  }, [appointments, therapists, startDate, endDate, currentUser, selectedTherapistId]);

  // 2. จัดกลุ่มนัดหมายที่สอนสำเร็จตาม ครู + วัน (1 แถวต่อครูในวันเดียวกัน)
  const aggregatedTeachingRows = useMemo(() => {
    const groups = {};

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
        } else if (selectedTherapistId) {
          return row.therapistId === selectedTherapistId;
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || a.therapistNickname.localeCompare(b.therapistNickname));
  }, [appointments, therapists, startDate, endDate, currentUser, selectedTherapistId]);

  // คลิกดูรายละเอียดเคสที่สอนในวันนั้น
  const handleViewDetailClick = (row) => {
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

  // ==========================================
  // TAB 2: คำนวณการเข้าทำงานของพนักงาน (Attendance)
  // ==========================================

  // แปลงและคลีน Attendance logs
  const normalizedAttendanceLogs = useMemo(() => {
    if (!Array.isArray(attendance)) return [];
    return attendance.map(log => {
      const empId = String(log.employeeId || log.employee_id || '').toUpperCase().trim();
      const empName = log.employeeName || log.employee_name || '';
      const date = log.date || (log.createdAt ? log.createdAt.split('T')[0] : '');
      const time = log.time || (log.createdAt ? log.createdAt.split('T')[1]?.split('.')[0] : '00:00:00');
      const type = log.type || 'เข้างาน';
      const workHours = Number(log.workHours ?? log.work_hours ?? 0);
      const lat = log.latitude;
      const lng = log.longitude;
      const accuracy = log.accuracy;
      const mapsUrl = log.mapsUrl || log.maps_url || (lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : '');
      const notes = log.notes || '';
      return {
        ...log,
        employeeId: empId,
        employeeName: empName,
        date,
        time,
        type,
        workHours,
        latitude: lat,
        longitude: lng,
        accuracy,
        mapsUrl,
        notes
      };
    });
  }, [attendance]);

  // จัดกลุ่มการเข้าทำงานรายวัน (1 แถวต่อพนักงาน 1 คนใน 1 วัน)
  const dailyAttendanceRows = useMemo(() => {
    const filtered = normalizedAttendanceLogs.filter(log => {
      if (!log.date || log.date < startDate || log.date > endDate) return false;
      if (currentUser?.role === 'Admin') {
        if (selectedEmployeeId && log.employeeId !== selectedEmployeeId) return false;
        return true;
      }
      return isAllowedEmployee(log.employeeId, log.employeeName);
    });

    const groups = {};
    filtered.forEach(log => {
      const key = `${log.date}_${log.employeeId}`;
      if (!groups[key]) {
        groups[key] = {
          date: log.date,
          employeeId: log.employeeId,
          logs: []
        };
      }
      groups[key].logs.push(log);
    });

    return Object.values(groups).map(g => {
      const empInfo = getEmployeeInfo(g.employeeId, g.logs[0]?.employeeName);
      const sortedLogs = [...g.logs].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
      
      const inLogs = sortedLogs.filter(l => l.type === 'เข้างาน' || l.type === 'IN');
      const outLogs = sortedLogs.filter(l => l.type === 'เลิกงาน' || l.type === 'OUT');
      
      const firstIn = inLogs[0] || null;
      const latestOut = outLogs[outLogs.length - 1] || null;
      
      let workHours = 0;
      outLogs.forEach(l => {
        if (l.workHours > 0) {
          workHours += l.workHours;
        }
      });

      if (workHours === 0 && firstIn && latestOut && firstIn.time && latestOut.time) {
        const [h1, m1, s1] = firstIn.time.split(':').map(Number);
        const [h2, m2, s2] = latestOut.time.split(':').map(Number);
        const d1 = new Date(2000, 0, 1, h1 || 0, m1 || 0, s1 || 0);
        const d2 = new Date(2000, 0, 1, h2 || 0, m2 || 0, s2 || 0);
        const diffMs = Math.max(0, d2 - d1);
        workHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
      } else {
        workHours = Math.round(workHours * 10) / 10;
      }

      const isWorkingNow = firstIn && !latestOut && g.date === todayStr;
      const isMissingCheckOut = firstIn && !latestOut && g.date < todayStr;

      return {
        key: `${g.date}_${g.employeeId}`,
        date: g.date,
        employeeId: empInfo.employeeId,
        employeeName: empInfo.fullname,
        employeeNickname: empInfo.nickname,
        employeePosition: empInfo.position,
        firstInTime: firstIn?.time || null,
        latestOutTime: latestOut?.time || null,
        inRecord: firstIn,
        outRecord: latestOut,
        allDayLogs: sortedLogs,
        workHours,
        isWorkingNow,
        isMissingCheckOut,
        hasLocation: !!(firstIn?.mapsUrl || latestOut?.mapsUrl)
      };
    }).sort((a, b) => b.date.localeCompare(a.date) || a.employeeName.localeCompare(b.employeeName));
  }, [normalizedAttendanceLogs, startDate, endDate, currentUser, selectedEmployeeId, users, therapists, todayStr]);

  // การ์ดสรุปการทำงานของพนักงานแต่ละคนในรอบนี้
  const employeeSummaryCards = useMemo(() => {
    const map = {};

    dailyAttendanceRows.forEach(row => {
      if (!map[row.employeeId]) {
        map[row.employeeId] = {
          employeeId: row.employeeId,
          fullname: row.employeeName,
          nickname: row.employeeNickname,
          position: row.employeePosition,
          datesSet: new Set(),
          totalHours: 0
        };
      }
      map[row.employeeId].datesSet.add(row.date);
      map[row.employeeId].totalHours += row.workHours;
    });

    return Object.values(map).map(item => ({
      employeeId: item.employeeId,
      fullname: item.fullname,
      nickname: item.nickname,
      position: item.position,
      daysWorked: item.datesSet.size,
      totalHours: Math.round(item.totalHours * 10) / 10
    })).sort((a, b) => b.totalHours - a.totalHours || a.fullname.localeCompare(b.fullname));
  }, [dailyAttendanceRows]);

  // คลิกเปิด Modal รายละเอียดการเข้างาน
  const handleViewAttendanceDetail = (row) => {
    setModalAttendance(row);
    setShowAttendanceModal(true);
  };

  // Helper วันภาษาไทย
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

  const formatThaiDate = (dateStr) => {
    if (!dateStr) return '-';
    const parts = String(dateStr).split('-');
    if (parts.length !== 3) return dateStr;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  // Export CSV สำหรับชั่วโมงสอนครู
  const handleExportCSV = () => {
    const headers = ['นักกิจกรรมบำบัด', 'วันที่', 'วันที่ในสัปดาห์', 'จำนวนเคสที่ฝึก'];
    const csvRows = [headers.join(',')];
    
    aggregatedTeachingRows.forEach(row => {
      const therapistName = `${row.therapistFullname} (${row.therapistNickname})`;
      const formattedDate = formatThaiDate(row.date);
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

  // Export CSV สำหรับการเข้าทำงานของพนักงาน
  const handleExportAttendanceCSV = () => {
    const headers = [
      'รหัสพนักงาน', 
      'ชื่อ-นามสกุล', 
      'ชื่อเล่น', 
      'ตำแหน่ง', 
      'วันที่', 
      'วันในสัปดาห์', 
      'เวลาเข้างาน', 
      'เวลาเลิกงาน', 
      'ชั่วโมงทำงานรวม', 
      'สถานะ', 
      'พิกัดเข้างาน (Maps URL)', 
      'พิกัดเลิกงาน (Maps URL)'
    ];
    const csvRows = [headers.join(',')];

    dailyAttendanceRows.forEach(row => {
      const dayOfWeek = getThaiDayOfWeek(row.date);
      const formattedDate = formatThaiDate(row.date);
      const statusText = row.latestOutTime 
        ? 'เสร็จสิ้น' 
        : (row.isWorkingNow ? 'กำลังปฏิบัติงาน' : (row.isMissingCheckOut ? 'ยังไม่ลงเวลาเลิกงาน' : '-'));

      const line = [
        `"${(row.employeeId || '').replace(/"/g, '""')}"`,
        `"${(row.employeeName || '').replace(/"/g, '""')}"`,
        `"${(row.employeeNickname || '').replace(/"/g, '""')}"`,
        `"${(row.employeePosition || '').replace(/"/g, '""')}"`,
        `"${(formattedDate || '').replace(/"/g, '""')}"`,
        `"${(dayOfWeek || '').replace(/"/g, '""')}"`,
        `"${(row.firstInTime ? row.firstInTime + ' น.' : '-').replace(/"/g, '""')}"`,
        `"${(row.latestOutTime ? row.latestOutTime + ' น.' : '-').replace(/"/g, '""')}"`,
        `"${row.workHours} ชั่วโมง"`,
        `"${statusText.replace(/"/g, '""')}"`,
        `"${(row.inRecord?.mapsUrl || '').replace(/"/g, '""')}"`,
        `"${(row.outRecord?.mapsUrl || '').replace(/"/g, '""')}"`
      ].join(',');
      csvRows.push(line);
    });

    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `รายงานการเข้าทำงานพนักงาน_${startDate}_ถึง_${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* ส่วนหัวหน้าเว็บและปุ่ม Export */}
      <div className="page-header" style={{ alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">
            <BarChart3 size={28} />
            {activeSummaryTab === 'teaching' ? 'สรุปการให้บริการและชั่วโมงสอนครู' : 'สรุปการเข้าทำงานของพนักงาน'} {currentUser?.role === 'Admin' ? '(Admin Only)' : ''}
          </h1>
          <p style={{ margin: '0.25rem 0 0 2.25rem', fontSize: '0.875rem', color: 'var(--dark-light)' }}>
            {activeSummaryTab === 'teaching' 
              ? 'สรุปชั่วโมงสอนกิจกรรมบำบัดรายบุคคลและรายวันตามรอบบิล' 
              : 'สรุปการลงเวลาเข้า-ออกงาน พิกัดสถานที่ และชั่วโมงทำงานรวมของบุคลากร'}
          </p>
        </div>

        {currentUser?.role === 'Admin' && (
          <div className="page-actions">
            <button 
              className="btn btn-primary" 
              onClick={activeSummaryTab === 'teaching' ? handleExportCSV : handleExportAttendanceCSV}
            >
              <Download size={16} /> Export CSV
            </button>
          </div>
        )}
      </div>

      {/* แถบสลับ Tab หลัก: ชั่วโมงสอนครู (OT) vs การเข้าทำงานของพนักงาน */}
      <div style={{
        display: 'inline-flex',
        background: '#FAF6F0',
        padding: '5px',
        borderRadius: '14px',
        border: '1px solid var(--border-light)',
        alignSelf: 'flex-start',
        gap: '6px'
      }}>
        <button
          type="button"
          onClick={() => setActiveSummaryTab('teaching')}
          style={{
            padding: '0.65rem 1.4rem',
            borderRadius: '10px',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: activeSummaryTab === 'teaching' ? 'var(--primary)' : 'transparent',
            color: activeSummaryTab === 'teaching' ? '#fff' : 'var(--dark-light)',
            boxShadow: activeSummaryTab === 'teaching' ? '0 3px 10px rgba(224, 122, 95, 0.25)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <Award size={18} />
          ชั่วโมงสอนครู (OT)
        </button>

        <button
          type="button"
          onClick={() => setActiveSummaryTab('attendance')}
          style={{
            padding: '0.65rem 1.4rem',
            borderRadius: '10px',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: activeSummaryTab === 'attendance' ? 'var(--primary)' : 'transparent',
            color: activeSummaryTab === 'attendance' ? '#fff' : 'var(--dark-light)',
            boxShadow: activeSummaryTab === 'attendance' ? '0 3px 10px rgba(224, 122, 95, 0.25)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <Clock size={18} />
          การเข้าทำงานของพนักงาน
        </button>
      </div>

      {/* แถบตัวกรองรอบวันที่และบุคลากร */}
      <div className="card-2xl" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Calendar size={20} color="var(--secondary)" />
          <span style={{ fontWeight: 600 }}>
            {activeSummaryTab === 'teaching' ? 'รอบเงินเดือนผู้สอน:' : 'รอบเงินเดือนพนักงาน:'}
          </span>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {currentUser?.role === 'Admin' && (
            activeSummaryTab === 'teaching' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem' }}>ครูผู้สอน:</span>
                <select
                  className="form-control"
                  value={selectedTherapistId}
                  onChange={(e) => setSelectedTherapistId(e.target.value)}
                  style={{ width: '180px', padding: '0.4rem 0.6rem' }}
                >
                  <option value="">ทั้งหมด (ทุกครู)</option>
                  {therapists.map(t => (
                    <option key={t.id} value={t.id}>{t.fullname} ({t.nickname})</option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem' }}>พนักงาน:</span>
                <select
                  className="form-control"
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  style={{ width: '220px', padding: '0.4rem 0.6rem' }}
                >
                  <option value="">ทั้งหมด (พนักงานทุกคน)</option>
                  {availableEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      [{emp.id}] {emp.fullname} {emp.nickname ? `(${emp.nickname})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )
          )}

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

      {/* ======================================================== */}
      {/* VIEW 1: สรุปชั่วโมงสอนครู (OT)                            */}
      {/* ======================================================== */}
      {activeSummaryTab === 'teaching' && (
        <>
          {/* Dynamic Summary Cards ด้านบน */}
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
                          {formatThaiDate(row.date)}
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
        </>
      )}

      {/* ======================================================== */}
      {/* VIEW 2: สรุปการเข้าทำงานของพนักงาน (Attendance)           */}
      {/* ======================================================== */}
      {activeSummaryTab === 'attendance' && (
        <>
          {/* Dynamic Summary Cards ด้านบนของพนักงาน */}
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UsersIcon size={18} color="var(--secondary)" />
              พนักงานที่เข้าทำงานในรอบบิลนี้
            </h2>

            {employeeSummaryCards.length === 0 ? (
              <div className="card-2xl" style={{ textAlign: 'center', padding: '2rem', color: 'var(--dark-light)', border: '1px dashed var(--border)' }}>
                ไม่มีข้อมูลการเข้าทำงานของพนักงานในช่วงรอบวันที่เลือก
              </div>
            ) : (
              <div className="dashboard-grid">
                {employeeSummaryCards.map(emp => (
                  <div key={emp.employeeId} className="card-2xl stat-card" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div>
                        <div className="stat-title" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{ 
                            background: '#F0EAE1', 
                            padding: '2px 6px', 
                            borderRadius: '4px', 
                            fontWeight: 700,
                            fontFamily: 'monospace' 
                          }}>
                            {emp.employeeId}
                          </span>
                          <span>• {emp.position}</span>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '1.15rem', color: 'var(--dark)', marginTop: '0.35rem' }}>
                          {emp.fullname} {emp.nickname ? `(${emp.nickname})` : ''}
                        </div>
                      </div>
                      <Sparkles size={20} color="var(--primary)" />
                    </div>
                    
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'baseline', 
                      marginTop: '1rem', 
                      borderTop: '1px solid var(--border-light)', 
                      paddingTop: '0.5rem' 
                    }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--dark-light)' }}>
                        มาทำงาน: <strong style={{ color: 'var(--dark)' }}>{emp.daysWorked}</strong> วัน
                      </span>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--dark-light)', marginRight: '0.35rem' }}>ชั่วโมงสะสม:</span>
                        <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--secondary)' }}>
                          {emp.totalHours} ชม.
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ตารางแสดงการเข้าทำงานรายวันของพนักงาน (พนักงาน 1 คนต่อ 1 วัน = 1 แถว) */}
          <div className="card-3xl">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>รายการบันทึกเวลาเข้า-ออกงานรายวัน</h2>
              <span style={{ fontSize: '0.85rem', color: 'var(--dark-light)' }}>
                พบทั้งหมด <strong>{dailyAttendanceRows.length}</strong> รายการ
              </span>
            </div>

            <div className="table-container">
              <table className="hdh-table">
                <thead>
                  <tr>
                    <th>วันที่เข้างาน</th>
                    <th>รหัสพนักงาน</th>
                    <th>ชื่อ-นามสกุลพนักงาน</th>
                    <th style={{ textAlign: 'center' }}>เวลาเข้างาน</th>
                    <th style={{ textAlign: 'center' }}>เวลาเลิกงาน</th>
                    <th style={{ textAlign: 'center' }}>ชั่วโมงรวมในวัน</th>
                    <th style={{ textAlign: 'center' }}>พิกัดสถานที่</th>
                    <th style={{ textAlign: 'center' }}>ดูรายละเอียด</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyAttendanceRows.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--dark-light)' }}>
                        ไม่มีข้อมูลการลงเวลาทำงานในช่วงเวลานี้
                      </td>
                    </tr>
                  ) : (
                    dailyAttendanceRows.map((row) => (
                      <tr key={row.key}>
                        <td style={{ fontWeight: 600 }}>
                          <div>{formatThaiDate(row.date)}</div>
                          <small style={{ color: 'var(--dark-light)', fontSize: '0.8rem' }}>
                            วัน{getThaiDayOfWeek(row.date)}
                          </small>
                        </td>
                        <td>
                          <span style={{ 
                            background: '#F0EAE1', 
                            padding: '3px 8px', 
                            borderRadius: '4px', 
                            fontWeight: 700, 
                            fontFamily: 'monospace',
                            fontSize: '0.85rem'
                          }}>
                            {row.employeeId}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--dark)' }}>
                            {row.employeeName} {row.employeeNickname ? `(${row.employeeNickname})` : ''}
                          </div>
                          <small style={{ color: 'var(--dark-light)', fontSize: '0.8rem' }}>
                            {row.employeePosition}
                          </small>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {row.firstInTime ? (
                            <span style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '4px',
                              padding: '3px 8px', 
                              borderRadius: '6px', 
                              background: '#E8F5E9', 
                              color: '#2E7D32',
                              fontWeight: 600,
                              fontSize: '0.85rem'
                            }}>
                              <Clock size={13} />
                              {row.firstInTime} น.
                            </span>
                          ) : (
                            <span style={{ color: 'var(--dark-light)', fontSize: '0.85rem' }}>-</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {row.latestOutTime ? (
                            <span style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '4px',
                              padding: '3px 8px', 
                              borderRadius: '6px', 
                              background: '#E3F2FD', 
                              color: '#1565C0',
                              fontWeight: 600,
                              fontSize: '0.85rem'
                            }}>
                              <Clock size={13} />
                              {row.latestOutTime} น.
                            </span>
                          ) : row.isWorkingNow ? (
                            <span style={{ 
                              padding: '3px 8px', 
                              borderRadius: '6px', 
                              background: '#FFF3E0', 
                              color: '#E65100',
                              fontWeight: 600,
                              fontSize: '0.8rem'
                            }}>
                              กำลังปฏิบัติงาน
                            </span>
                          ) : (
                            <span style={{ 
                              padding: '3px 8px', 
                              borderRadius: '6px', 
                              background: '#F5F5F5', 
                              color: '#757575',
                              fontSize: '0.8rem'
                            }}>
                              ยังไม่ลงเวลาออก
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--secondary)', fontSize: '1.05rem' }}>
                          {row.workHours > 0 ? `${row.workHours} ชม.` : '-'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {row.hasLocation ? (
                            <a
                              href={row.inRecord?.mapsUrl || row.outRecord?.mapsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-light"
                              style={{ 
                                padding: '4px 8px', 
                                fontSize: '0.8rem', 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '4px',
                                color: 'var(--secondary)',
                                textDecoration: 'none'
                              }}
                              title="คลิกเพื่อดูแผนที่ Google Maps"
                            >
                              <MapPin size={14} />
                              เปิดแผนที่
                            </a>
                          ) : (
                            <span style={{ color: 'var(--dark-light)', fontSize: '0.8rem' }}>ไม่มีพิกัด</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <button 
                              className="btn btn-light btn-icon-only" 
                              title="ดูรายละเอียดการลงเวลาวันนี้"
                              onClick={() => handleViewAttendanceDetail(row)}
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
        </>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: รายละเอียดการสอนของครู (Teaching cases)           */}
      {/* ======================================================== */}
      {showDetailModal && (
        <div className="modal-overlay">
          <div className="modal-content-wrapper" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 700 }}>ตารางการสอนคุณครู {modalDetails.nickname} วันที่ {formatThaiDate(modalDetails.date)}</h3>
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

      {/* ======================================================== */}
      {/* MODAL 2: รายละเอียดการลงเวลาพนักงาน (Attendance details)    */}
      {/* ======================================================== */}
      {showAttendanceModal && modalAttendance && (
        <div className="modal-overlay">
          <div className="modal-content-wrapper" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontWeight: 700, margin: 0 }}>
                  รายละเอียดการลงเวลา: {modalAttendance.employeeName}
                </h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--dark-light)' }}>
                  [{modalAttendance.employeeId}] {modalAttendance.employeePosition} • วันที่ {formatThaiDate(modalAttendance.date)}
                </span>
              </div>
              <button className="close-modal-btn" onClick={() => setShowAttendanceModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* แถบสรุป 3 กล่อง */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  <div style={{ background: '#E8F5E9', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#2E7D32', fontWeight: 600 }}>เวลาเข้างานแรก</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1B5E20', marginTop: '0.25rem' }}>
                      {modalAttendance.firstInTime ? `${modalAttendance.firstInTime} น.` : '-'}
                    </div>
                  </div>

                  <div style={{ background: '#E3F2FD', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#1565C0', fontWeight: 600 }}>เวลาเลิกงานล่าสุด</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0D47A1', marginTop: '0.25rem' }}>
                      {modalAttendance.latestOutTime ? `${modalAttendance.latestOutTime} น.` : '-'}
                    </div>
                  </div>

                  <div style={{ background: '#FFF3E0', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#E65100', fontWeight: 600 }}>ชั่วโมงทำงานสุทธิ</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#BF360C', marginTop: '0.25rem' }}>
                      {modalAttendance.workHours > 0 ? `${modalAttendance.workHours} ชม.` : '-'}
                    </div>
                  </div>
                </div>

                {/* รายละเอียดพิกัด GPS */}
                <div className="card-2xl" style={{ padding: '1rem', background: '#FAFAF8', border: '1px solid var(--border-light)' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <MapPin size={16} color="var(--primary)" />
                    ข้อมูลพิกัด GPS ตำแหน่งที่บันทึก
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    {/* จุดเข้างาน */}
                    <div style={{ background: '#fff', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#2E7D32', marginBottom: '0.35rem' }}>
                        พิกัดเวลาเข้างาน:
                      </div>
                      {modalAttendance.inRecord?.latitude ? (
                        <div style={{ fontSize: '0.8rem', color: 'var(--dark)' }}>
                          <div>ละติจูด: {modalAttendance.inRecord.latitude.toFixed(6)}</div>
                          <div>ลองจิจูด: {modalAttendance.inRecord.longitude.toFixed(6)}</div>
                          {modalAttendance.inRecord.accuracy && (
                            <div style={{ color: 'var(--dark-light)' }}>ความแม่นยำ: ±{modalAttendance.inRecord.accuracy} เมตร</div>
                          )}
                          <div style={{ marginTop: '0.5rem' }}>
                            <a 
                              href={modalAttendance.inRecord.mapsUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              className="btn btn-light"
                              style={{ padding: '3px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <ExternalLink size={12} /> เปิดดูใน Google Maps
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.8rem', color: 'var(--dark-light)' }}>ไม่มีข้อมูลพิกัด GPS</div>
                      )}
                    </div>

                    {/* จุดเลิกงาน */}
                    <div style={{ background: '#fff', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1565C0', marginBottom: '0.35rem' }}>
                        พิกัดเวลาเลิกงาน:
                      </div>
                      {modalAttendance.outRecord?.latitude ? (
                        <div style={{ fontSize: '0.8rem', color: 'var(--dark)' }}>
                          <div>ละติจูด: {modalAttendance.outRecord.latitude.toFixed(6)}</div>
                          <div>ลองจิจูด: {modalAttendance.outRecord.longitude.toFixed(6)}</div>
                          {modalAttendance.outRecord.accuracy && (
                            <div style={{ color: 'var(--dark-light)' }}>ความแม่นยำ: ±{modalAttendance.outRecord.accuracy} เมตร</div>
                          )}
                          <div style={{ marginTop: '0.5rem' }}>
                            <a 
                              href={modalAttendance.outRecord.mapsUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              className="btn btn-light"
                              style={{ padding: '3px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <ExternalLink size={12} /> เปิดดูใน Google Maps
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.8rem', color: 'var(--dark-light)' }}>
                          {modalAttendance.latestOutTime ? 'ไม่มีข้อมูลพิกัด GPS' : 'ยังไม่ได้ลงเวลาเลิกงาน'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* รายการเหตุการณ์ทั้งหมดที่กดในวันนั้น */}
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>
                    ประวัติการบันทึกเวลาทั้งหมดในวันนี้ ({modalAttendance.allDayLogs.length} ครั้ง)
                  </h4>
                  <div className="table-container" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    <table className="hdh-table" style={{ fontSize: '0.85rem' }}>
                      <thead>
                        <tr>
                          <th>เวลา</th>
                          <th>ประเภท</th>
                          <th>พิกัด</th>
                          <th>หมายเหตุ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {modalAttendance.allDayLogs.map((log, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 600 }}>{log.time} น.</td>
                            <td>
                              <span style={{ 
                                padding: '2px 6px', 
                                borderRadius: '4px', 
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                background: (log.type === 'เข้างาน' || log.type === 'IN') ? '#E8F5E9' : '#E3F2FD',
                                color: (log.type === 'เข้างาน' || log.type === 'IN') ? '#2E7D32' : '#1565C0'
                              }}>
                                {log.type}
                              </span>
                            </td>
                            <td>
                              {log.mapsUrl ? (
                                <a 
                                  href={log.mapsUrl} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  style={{ color: 'var(--primary)', textDecoration: 'underline' }}
                                >
                                  ดูแผนที่
                                </a>
                              ) : '-'}
                            </td>
                            <td style={{ color: 'var(--dark-light)' }}>
                              {log.notes || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAttendanceModal(false)}>ปิดหน้าต่าง</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
