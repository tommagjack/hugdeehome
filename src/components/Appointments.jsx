import React, { useState, useEffect, useMemo } from 'react';
import { formatPatientNickname, formatTherapistName, getLocalDateString } from '../utils/format';
import { 
  Calendar, 
  Clock, 
  User, 
  Sparkles, 
  Filter,
  CheckCircle,
  XCircle,
  HelpCircle,
  Eye,
  Edit2,
  Trash2,
  Upload,
  Download,
  Plus
} from 'lucide-react';
import Swal from 'sweetalert2';
import { exportToCSV, parseCSV } from '../utils/csvHelper';

const headersMap = {
  id: ['id', 'รหัสนัดหมาย', 'นัดหมาย id', 'appointment id'],
  hn: ['hn', 'รหัส hn', 'รหัสผู้ป่วย'],
  therapistId: ['therapistid', 'รหัสนักบำบัด', 'รหัสผู้สอน', 'รหัสครู'],
  date: ['date', 'วันที่นัดหมาย', 'วันที่', 'วันที่นัดหมาย (yyyy-mm-dd)'],
  timeSlot: ['timeslot', 'เวลาเรียน', 'เวลา', 'ช่วงเวลา'],
  type: ['type', 'ประเภทนัดหมาย', 'ประเภท', 'ประเภทการนัดหมาย'],
  status: ['status', 'สถานะ']
};

export default function Appointments({ 
  patients, 
  appointments, 
  setAppointments,
  therapists, 
  holidays, 
  onAddAppointment, 
  onUpdateAppointmentStatus,
  onDeleteAppointment,
  onUpdateAppointment,
  currentUser
}) {
  const isAdmin = currentUser?.role === 'Admin';
  const [selectedHn, setSelectedHn] = useState('');
  const [bookingDate, setBookingDate] = useState('2026-06-05'); // ค่าเริ่มต้นวันที่ระบบ
  const [selectedTherapistId, setSelectedTherapistId] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [editingAppointmentId, setEditingAppointmentId] = useState(null);
  const [appointmentType, setAppointmentType] = useState('ฝึกกระตุ้นพัฒนาการ');
  
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Search states for custom patient dropdown
  const [patientSearchText, setPatientSearchText] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  // ตัวกรองสำหรับตารางด้านขวา
  const [statusFilter, setStatusFilter] = useState('All'); // All, จองแล้ว, ยืนยันแล้ว, รับบริการแล้ว, ยกเลิก

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, filterDate]);

  // กรองผู้ป่วยที่ Active เท่านั้นสำหรับการจองนัดหมาย
  const activePatients = useMemo(() => {
    return patients.filter(p => p.status === 'Active');
  }, [patients]);

  // Sync patientSearchText when selectedHn updates
  useEffect(() => {
    if (selectedHn) {
      const p = activePatients.find(item => String(item.hn) === String(selectedHn));
      if (p) {
        setPatientSearchText(`HN: ${p.hn} | น้อง${p.nickname} (${p.title}${p.firstname} ${p.lastname})`);
      } else {
        setPatientSearchText('');
      }
    } else {
      setPatientSearchText('');
    }
  }, [selectedHn, activePatients]);

  const filteredActivePatients = useMemo(() => {
    const q = patientSearchText.trim().toLowerCase();
    if (!q || q.startsWith('hn:')) return activePatients;
    return activePatients.filter(p => 
      String(p.hn || '').toLowerCase().includes(q) || 
      String(p.nickname || '').toLowerCase().includes(q) ||
      String(p.firstname || '').toLowerCase().includes(q) ||
      String(p.lastname || '').toLowerCase().includes(q)
    );
  }, [activePatients, patientSearchText]);

  const activeTherapists = useMemo(() => {
    return (therapists || []).filter(t => t.status !== 'Inactive');
  }, [therapists]);

  // ตั้งค่ารหัสครูผู้สอนเริ่มต้นเมื่อเปิดหน้า (ใช้ครูที่ Active เท่านั้น)
  useEffect(() => {
    if (activeTherapists.length > 0 && !selectedTherapistId) {
      setSelectedTherapistId(activeTherapists[0].id);
    }
  }, [activeTherapists]);

  // 1. ตรวจสอบวันหยุดคลินิก
  const clinicHoliday = useMemo(() => {
    if (!bookingDate) return null;
    return holidays.find(h => h.date === bookingDate);
  }, [bookingDate, holidays]);

  // 2. ตรวจสอบวันทำงานของครูที่เลือก
  const therapistWorkDayStatus = useMemo(() => {
    if (!bookingDate || !selectedTherapistId) return { works: true };
    const therapist = therapists.find(t => t.id === selectedTherapistId);
    if (!therapist) return { works: true };

    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let selectedDayName = 'Sunday';
    const parts = bookingDate.split('-');
    if (parts.length === 3) {
      selectedDayName = daysOfWeek[new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)).getDay()];
    } else {
      const d = new Date(bookingDate);
      if (!isNaN(d.getTime())) {
        selectedDayName = daysOfWeek[d.getDay()];
      }
    }
    
    const works = (therapist.workDays || []).includes(selectedDayName);
    return {
      works,
      dayName: selectedDayName,
      dayTh: selectedDayName === 'Sunday' ? 'วันอาทิตย์' :
             selectedDayName === 'Monday' ? 'วันจันทร์' :
             selectedDayName === 'Tuesday' ? 'วันอังคาร' :
             selectedDayName === 'Wednesday' ? 'วันพุธ' :
             selectedDayName === 'Thursday' ? 'วันพฤหัสบดี' :
             selectedDayName === 'Friday' ? 'วันศุกร์' : 'วันเสาร์'
    };
  }, [bookingDate, selectedTherapistId, therapists]);

  // 3. ดึงคิวที่จองไปแล้วของครูในวันนี้เพื่อหักล้าง (Validator)
  const therapistBookedSlots = useMemo(() => {
    if (!bookingDate || !selectedTherapistId) return [];
    return appointments
      .filter(app => app.date && getLocalDateString(app.date) === bookingDate && app.therapistId === selectedTherapistId && app.status !== 'ยกเลิก' && app.id !== editingAppointmentId)
      .map(app => app.timeSlot);
  }, [bookingDate, selectedTherapistId, appointments, editingAppointmentId]);

  // 4. คำนวณช่วงเวลาที่มีประสิทธิภาพสำหรับปุ่มกด (Time Slot List)
  const availableTimeSlots = useMemo(() => {
    if (!selectedTherapistId) return [];
    const therapist = therapists.find(t => t.id === selectedTherapistId);
    if (!therapist) return [];

    const dayName = therapistWorkDayStatus.dayName;
    
    // ดึงสล็อตตามโครงสร้างวันย่อย หรือ fallback สำหรับแบบเดิม (Array)
    let slotsForDay = [];
    if (therapist.workHours) {
      if (typeof therapist.workHours === 'object' && !Array.isArray(therapist.workHours)) {
        slotsForDay = therapist.workHours[dayName] || [];
      } else if (Array.isArray(therapist.workHours)) {
        slotsForDay = therapist.workHours;
      }
    }

    return slotsForDay.map(slot => {
      const isBooked = therapistBookedSlots.includes(slot);
      return {
        slot,
        isBooked,
        available: !isBooked && !clinicHoliday && therapistWorkDayStatus.works
      };
    });
  }, [selectedTherapistId, therapistBookedSlots, clinicHoliday, therapistWorkDayStatus, therapists]);



  // 5. บันทึกคิวจอง
  const handleBooking = (e) => {
    e.preventDefault();
    if (!selectedHn) {
      Swal.fire({ icon: 'warning', title: 'กรุณาเลือกผู้รับบริการ', confirmButtonColor: 'var(--secondary)' });
      return;
    }
    if (!selectedTimeSlot) {
      Swal.fire({ icon: 'warning', title: 'กรุณาเลือกเวลาเรียน', confirmButtonColor: 'var(--secondary)' });
      return;
    }

    const patientObj = patients.find(p => p.hn === selectedHn);
    const therapistObj = therapists.find(t => t.id === selectedTherapistId);

    if (editingAppointmentId) {
      const origApp = appointments.find(a => a.id === editingAppointmentId);
      const updatedApp = {
        id: editingAppointmentId,
        hn: selectedHn,
        therapistId: selectedTherapistId,
        date: bookingDate,
        timeSlot: selectedTimeSlot,
        type: appointmentType,
        status: origApp ? origApp.status : 'จองแล้ว',
        created_at: origApp ? origApp.created_at : new Date().toISOString()
      };

      onUpdateAppointment(updatedApp);

      Swal.fire({
        icon: 'success',
        title: 'แก้ไขนัดหมายสำเร็จ!',
        html: `
          <div style="font-family: var(--font-family); text-align: left; font-size: 0.9rem; line-height: 1.5">
            <strong>ผู้ป่วย:</strong> ${patientObj.title}${patientObj.firstname} ${patientObj.lastname} (น้อง${patientObj.nickname})<br/>
            <strong>นักกิจกรรมบำบัด:</strong> ${therapistObj.nickname} (${therapistObj.fullname})<br/>
            <strong>วันที่:</strong> ${new Date(bookingDate).toLocaleDateString('th-TH')}<br/>
            <strong>เวลา:</strong> ${selectedTimeSlot}
          </div>
        `,
        confirmButtonColor: 'var(--secondary)'
      });

      setEditingAppointmentId(null);
    } else {
      const newAppointment = {
        id: 'A' + (appointments.length + 1) + Math.floor(Math.random() * 1000),
        hn: selectedHn,
        therapistId: selectedTherapistId,
        date: bookingDate,
        timeSlot: selectedTimeSlot,
        type: appointmentType,
        status: 'จองแล้ว',
        created_at: new Date().toISOString()
      };

      onAddAppointment(newAppointment);

      Swal.fire({
        icon: 'success',
        title: 'นัดหมายสำเร็จ!',
        html: `
          <div style="font-family: var(--font-family); text-align: left; font-size: 0.9rem; line-height: 1.5">
            <strong>ผู้ป่วย:</strong> ${patientObj.title}${patientObj.firstname} ${patientObj.lastname} (น้อง${patientObj.nickname})<br/>
            <strong>นักกิจกรรมบำบัด:</strong> ${therapistObj.nickname} (${therapistObj.fullname})<br/>
            <strong>วันที่:</strong> ${new Date(bookingDate).toLocaleDateString('th-TH')}<br/>
            <strong>เวลา:</strong> ${selectedTimeSlot}
          </div>
        `,
        confirmButtonColor: 'var(--secondary)'
      });
    }

    // ล้างข้อมูลที่เลือก
    setSelectedHn('');
    setSelectedTimeSlot('');
    setShowBookingModal(false);
  };
  // 6. เปลี่ยนสถานะในตาราง
  const handleStatusChange = (appId, newStatus) => {
    onUpdateAppointmentStatus(appId, newStatus);
    Swal.fire({
      icon: 'success',
      title: 'เปลี่ยนสถานะสำเร็จ',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 1500
    });
  };

  // ดูรายละเอียดคิวนัดหมาย
  const handleViewDetails = (app) => {
    const patient = patients.find(p => String(p.hn) === String(app.hn)) || {};
    const therapist = therapists.find(t => t.id === app.therapistId) || {};
    
    Swal.fire({
      title: 'รายละเอียดคิวนัดหมาย',
      html: `
        <div style="font-family: var(--font-family); text-align: left; font-size: 0.95rem; line-height: 1.6; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1rem; background-color: var(--light);">
          <div style="margin-bottom: 0.5rem;"><strong>HN:</strong> ${app.hn}</div>
          <div style="margin-bottom: 0.5rem;"><strong>ผู้ป่วย:</strong> ${patient.title || ''}${patient.firstname || 'ไม่ระบุ'} ${patient.lastname || ''} (${patient.nickname ? formatPatientNickname(patient.nickname) : 'ไม่ระบุ'})</div>
          <div style="margin-bottom: 0.5rem;"><strong>ผู้ปกครอง:</strong> ${patient.guardian || '-'} (โทร. ${patient.phone || '-'})</div>
          <div style="margin-bottom: 0.5rem;"><strong>ผู้สอน:</strong> ${formatTherapistName(therapist.nickname || 'ไม่ระบุ')} (${therapist.fullname || '-'})</div>
          <div style="margin-bottom: 0.5rem;"><strong>เลขใบประกอบโรคศิลปะ:</strong> ${therapist.licenseNo || '-'}</div>
          <div style="margin-bottom: 0.5rem;"><strong>วันที่นัดหมาย:</strong> ${new Date(app.date).toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
          <div style="margin-bottom: 0.5rem;"><strong>เวลา:</strong> ${app.timeSlot} น.</div>
          <div style="margin-bottom: 0.5rem;"><strong>สถานะ:</strong> <span class="badge ${app.status === 'จองแล้ว' ? 'badge-warning' : app.status === 'ยืนยันแล้ว' ? 'badge-info' : app.status === 'รับบริการแล้ว' ? 'badge-success' : 'badge-danger'}">${app.status}</span></div>
          <div><strong>วันที่ทำรายการ:</strong> ${app.created_at ? new Date(app.created_at).toLocaleString('th-TH') : '-'}</div>
        </div>
      `,
      confirmButtonColor: 'var(--secondary)',
      confirmButtonText: 'ปิดหน้าต่าง'
    });
  };

  // โหลดคิวนัดหมายเข้าฟอร์ม
  const handleEditClick = (app) => {
    setEditingAppointmentId(app.id);
    setSelectedHn(app.hn);
    setBookingDate(app.date);
    setSelectedTherapistId(app.therapistId);
    setSelectedTimeSlot(app.timeSlot);
    setAppointmentType(app.type || 'ฝึกกระตุ้นพัฒนาการ');
    
    setShowBookingModal(true);
  };

  // ลบคิวนัดหมายพร้อมถามยืนยัน
  const handleDeleteClick = (appId) => {
    Swal.fire({
      title: 'ต้องการลบคิวนัดหมายนี้?',
      text: 'การกระทำนี้จะลบข้อมูลนัดหมายอย่างถาวรและไม่สามารถเรียกคืนได้!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--danger)',
      cancelButtonColor: 'var(--dark-light)',
      confirmButtonText: 'ยืนยันลบ',
      cancelButtonText: 'ยกเลิก'
    }).then((result) => {
      if (result.isConfirmed) {
        if (onDeleteAppointment) {
          onDeleteAppointment(appId);
          Swal.fire({
            icon: 'success',
            title: 'ลบนัดหมายสำเร็จ!',
            showConfirmButton: false,
            timer: 1500
          });
        }
      }
    });
  };

  // 7. รายการนัดหมายทั้งหมดที่จะแสดงในตารางพร้อมตัวกรอง
  const filteredAppointments = useMemo(() => {
    let list = appointments || [];

    if (currentUser?.role === 'OT' && therapists) {
      const myTherapist = therapists.find(t => 
        t.id === currentUser.employeeId || 
        t.fullname === currentUser.fullname || 
        (t.nickname && currentUser.nickname && t.nickname === currentUser.nickname)
      );
      const myTherapistId = myTherapist ? myTherapist.id : 'NONE';
      list = list.filter(app => app.therapistId === myTherapistId);
    }

    return list
      .map(app => {
        const patient = (patients || []).find(p => String(p.hn) === String(app.hn));
        const therapist = (therapists || []).find(t => t.id === app.therapistId);
        let tNickname = 'ไม่ระบุชื่อครู';
        if (therapist) {
          tNickname = formatTherapistName(therapist.nickname);
        }
        return {
          ...app,
          patientName: patient ? `${patient.title}${patient.firstname} ${patient.lastname}` : 'ไม่พบข้อมูลผู้ป่วย',
          patientNickname: patient ? formatPatientNickname(patient.nickname) : '',
          patientFirstname: patient ? patient.firstname : '',
          therapistNickname: tNickname
        };
      })
      .filter(app => {
        const matchesStatus = statusFilter === 'All' || app.status === statusFilter;
        
        const query = searchQuery.trim().toLowerCase();
        const matchesQuery = !query || 
          String(app.hn || '').toLowerCase().includes(query) ||
          String(app.patientName || '').toLowerCase().includes(query) ||
          (app.patientNickname && String(app.patientNickname).toLowerCase().includes(query));
          
        const matchesDate = !filterDate || (app.date && getLocalDateString(app.date) === filterDate);
          
        return matchesStatus && matchesQuery && matchesDate;
      })
      // เรียงจากวันที่นัดหมายล่าสุดและเวลานัดหมายล่าสุด
      .sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.timeSlot).localeCompare(String(a.timeSlot)));
  }, [appointments, patients, therapists, statusFilter, searchQuery, filterDate, currentUser]);

  const paginatedAppointments = useMemo(() => {
    const itemsPerPage = 20;
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAppointments.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAppointments, currentPage]);

  const maxPages = Math.ceil(filteredAppointments.length / 20) || 1;

  const handleExportCSV = () => {
    const headers = [
      'รหัสนัดหมาย', 'รหัส HN', 'รหัสนักบำบัด', 'วันที่นัดหมาย (YYYY-MM-DD)', 'เวลาเรียน', 'ประเภทนัดหมาย', 'สถานะ'
    ];

    let rows = [];
    if (appointments.length === 0) {
      // Export template
      rows = [
        ['A1', '69001', 'T1', '2026-06-05', '10:00 - 11:00', 'ฝึกกระตุ้นพัฒนาการ', 'จองแล้ว']
      ];
      Swal.fire({
        title: 'ส่งออกไฟล์เทมเพลต',
        text: 'เนื่องจากไม่มีข้อมูลตารางนัดหมายในระบบ ระบบจะส่งออกเป็นไฟล์เทมเพลตตัวอย่าง',
        icon: 'info',
        confirmButtonColor: 'var(--secondary)'
      });
    } else {
      rows = appointments.map(app => [
        app.id,
        app.hn,
        app.therapistId,
        app.date,
        app.timeSlot,
        app.type || 'ฝึกกระตุ้นพัฒนาการ',
        app.status
      ]);
    }

    exportToCSV('appointments_schedule.csv', headers, rows);
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const parsed = parseCSV(text);

      if (parsed.length < 2) {
        Swal.fire({
          icon: 'error',
          title: 'ไฟล์ว่างเปล่า',
          text: 'ไม่พบข้อมูลในไฟล์ CSV ที่อัปโหลด',
          confirmButtonColor: 'var(--secondary)'
        });
        return;
      }

      const csvHeaders = parsed[0].map(h => h.trim().toLowerCase());
      const rows = parsed.slice(1);

      const indexMap = {};
      Object.keys(headersMap).forEach(key => {
        const matchingHeaders = headersMap[key];
        const idx = csvHeaders.findIndex(h => matchingHeaders.includes(h));
        if (idx !== -1) {
          indexMap[key] = idx;
        }
      });

      if (indexMap.hn === undefined || indexMap.therapistId === undefined || indexMap.date === undefined || indexMap.timeSlot === undefined) {
        Swal.fire({
          icon: 'error',
          title: 'รูปแบบคอลัมน์ไม่ถูกต้อง',
          text: 'กรุณาตรวจสอบว่ามีคอลัมน์ รหัส HN, รหัสนักบำบัด, วันที่นัดหมาย และเวลาเรียน อย่างน้อยที่สุด',
          confirmButtonColor: 'var(--secondary)'
        });
        return;
      }

      let addedCount = 0;
      let updatedCount = 0;
      let invalidHnCount = 0;
      let invalidTherapistCount = 0;
      let errorCount = 0;

      let currentAppointmentsList = [...appointments];

      rows.forEach(row => {
        if (row.length === 0 || (row.length === 1 && row[0] === '')) return;

        const val = (key) => {
          const idx = indexMap[key];
          return idx !== undefined && row[idx] !== undefined ? row[idx].trim() : '';
        };

        const hn = val('hn');
        const therapistId = val('therapistId');
        const date = val('date');
        const timeSlot = val('timeSlot');

        if (!hn || !therapistId || !date || !timeSlot) {
          errorCount++;
          return;
        }

        const patientExists = patients.some(p => p.hn === hn);
        if (!patientExists) {
          invalidHnCount++;
          return;
        }

        const therapistExists = therapists.some(t => t.id === therapistId);
        if (!therapistExists) {
          invalidTherapistCount++;
          return;
        }

        let id = val('id');
        const exists = currentAppointmentsList.some(app => app.id === id);

        if (!id || !exists) {
          id = 'A' + (currentAppointmentsList.length + 1) + Math.floor(Math.random() * 1000);
        }

        const appData = {
          id,
          hn,
          therapistId,
          date,
          timeSlot,
          type: val('type') || 'ฝึกกระตุ้นพัฒนาการ',
          status: val('status') || 'จองแล้ว',
          created_at: new Date().toISOString()
        };

        const existingAppIndex = currentAppointmentsList.findIndex(app => app.id === id);
        if (existingAppIndex !== -1) {
          const existingApp = currentAppointmentsList[existingAppIndex];
          currentAppointmentsList[existingAppIndex] = {
            ...existingApp,
            ...appData,
            created_at: existingApp.created_at
          };
          updatedCount++;
        } else {
          currentAppointmentsList.push(appData);
          addedCount++;
        }
      });

      if (setAppointments) {
        setAppointments(currentAppointmentsList);
      }

      Swal.fire({
        icon: 'success',
        title: 'นำเข้าข้อมูลนัดหมายสำเร็จ',
        html: `
          <div style="font-family: var(--font-family); text-align: left; font-size: 0.95rem; line-height: 1.6;">
            นำเข้าใหม่: <strong>${addedCount}</strong> รายการ<br/>
            อัปเดตข้อมูลเดิม: <strong>${updatedCount}</strong> รายการ<br/>
            ข้ามเนื่องจากไม่พบรหัส HN ผู้รับบริการ: <strong style="color:var(--warning)">${invalidHnCount}</strong> รายการ<br/>
            ข้ามเนื่องจากไม่พบรหัสนักบำบัด: <strong style="color:var(--warning)">${invalidTherapistCount}</strong> รายการ<br/>
            ข้ามเนื่องจากข้อมูลไม่ครบถ้วน: <strong style="color:var(--danger)">${errorCount}</strong> รายการ
          </div>
        `,
        confirmButtonColor: 'var(--secondary)'
      });

      e.target.value = '';
    };

    reader.readAsText(file);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="page-header">
        <h1 className="page-title">
          <Calendar size={28} />
          ตารางนัดหมายและการตรวจสอบคิว
        </h1>
        <div className="page-actions">
          {currentUser?.role !== 'OT' && (
            <button className="btn btn-primary" onClick={() => { setEditingAppointmentId(null); setSelectedHn(''); setSelectedTimeSlot(''); setAppointmentType('ฝึกกระตุ้นพัฒนาการ'); setShowBookingModal(true); }}>
              <Plus size={16} /> จองคิวใหม่
            </button>
          )}
          <button className="btn btn-light" onClick={handleExportCSV} title="ส่งออกตารางนัดหมายเป็นไฟล์ CSV">
            <Download size={16} /> Export CSV
          </button>
          {currentUser?.role !== 'OT' && (
            <label className="btn btn-light" style={{ cursor: 'pointer', margin: 0 }} title="นำเข้าตารางนัดหมายจากไฟล์ CSV">
              <Upload size={16} /> Import CSV
              <input type="file" accept=".csv" onChange={handleImportCSV} style={{ display: 'none' }} />
            </label>
          )}
        </div>
      </div>

      {/* MODAL: จองคิวนัดหมาย */}
      {showBookingModal && (
        <div className="modal-overlay">
          <div className="modal-content-wrapper" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 700 }}>
                {editingAppointmentId ? 'แก้ไขคิวนัดหมายเรียน' : 'จองคิวนัดหมายเรียน'}
              </h3>
              <button className="close-modal-btn" onClick={() => setShowBookingModal(false)}>×</button>
            </div>
            <form onSubmit={handleBooking}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">ผู้รับบริการ (เฉพาะสถานะ Active) <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="text"
                      className="form-control"
                      placeholder="-- ค้นหาด้วย HN หรือชื่อเล่น --"
                      value={patientSearchText}
                      onChange={(e) => {
                        setPatientSearchText(e.target.value);
                        setSelectedHn('');
                        setShowPatientDropdown(true);
                      }}
                      onFocus={() => setShowPatientDropdown(true)}
                      onBlur={() => {
                        setTimeout(() => setShowPatientDropdown(false), 200);
                      }}
                      required
                    />
                    <input type="hidden" value={selectedHn} required />
                    
                    {showPatientDropdown && (
                      <div 
                        className="card-md"
                        style={{ 
                          position: 'absolute', 
                          top: '100%', 
                          left: 0, 
                          right: 0, 
                          maxHeight: '200px', 
                          overflowY: 'auto', 
                          zIndex: 1000,
                          backgroundColor: 'white',
                          border: '1px solid var(--border)',
                          boxShadow: 'var(--shadow-lg)',
                          borderRadius: 'var(--radius-md)',
                          marginTop: '0.25rem',
                          padding: '0.5rem 0'
                        }}
                      >
                        {filteredActivePatients.length === 0 ? (
                          <div style={{ padding: '0.5rem 1rem', color: 'var(--dark-light)', fontSize: '0.85rem' }}>
                            ไม่พบข้อมูลผู้ป่วย
                          </div>
                        ) : (
                          filteredActivePatients.map(p => (
                            <div 
                              key={p.hn} 
                              style={{ 
                                padding: '0.5rem 1rem', 
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                transition: 'background-color 0.2s',
                                backgroundColor: 'transparent'
                              }}
                              onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--light)'}
                              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                              onClick={() => {
                                 setSelectedHn(p.hn);
                                 setPatientSearchText(`HN: ${p.hn} | ${formatPatientNickname(p.nickname)} (${p.title}${p.firstname} ${p.lastname})`);
                                 setShowPatientDropdown(false);
                               }}
                             >
                               HN: {p.hn} | {formatPatientNickname(p.nickname)} ({p.title}${p.firstname} ${p.lastname})
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">ประเภทนัดหมาย <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <select 
                    className="form-control" 
                    value={appointmentType} 
                    onChange={(e) => setAppointmentType(e.target.value)}
                    required
                  >
                    <option value="ฝึกกระตุ้นพัฒนาการ">ฝึกกระตุ้นพัฒนาการ</option>
                    <option value="ประเมินพัฒนาการครั้งแรก">ประเมินพัฒนาการครั้งแรก</option>
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">เลือกครูผู้สอน <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <select 
                      className="form-control" 
                      value={selectedTherapistId} 
                      onChange={(e) => {
                        setSelectedTherapistId(e.target.value);
                        setSelectedTimeSlot('');
                      }}
                      required
                    >
                      {activeTherapists.map(t => (
                        <option key={t.id} value={t.id}>
                          {formatTherapistName(t.nickname)} ({t.fullname})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">วันที่ต้องการนัดหมาย <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={bookingDate} 
                      onChange={(e) => {
                        setBookingDate(e.target.value);
                        setSelectedTimeSlot('');
                      }}
                      required 
                    />
                  </div>
                </div>

                {/* ส่วนของ Validator ตรวจสอบวันหยุด / วันเข้าทำงาน */}
                <div>
                  <span className="form-label">ช่วงเวลาที่ว่าง (Time Slots)</span>
                  
                  {clinicHoliday ? (
                    <div style={{ 
                      backgroundColor: 'var(--danger-light)', 
                      border: '1px solid var(--danger)', 
                      color: 'var(--danger)',
                      padding: '0.8rem',
                      borderRadius: 'var(--radius-md)',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginTop: '0.5rem'
                    }}>
                      <span>❌ วันหยุดคลินิก ({clinicHoliday.name})</span>
                    </div>
                  ) : !therapistWorkDayStatus.works ? (
                    <div style={{ 
                      backgroundColor: 'var(--danger-light)', 
                      border: '1px solid var(--danger)', 
                      color: 'var(--danger)',
                      padding: '0.8rem',
                      borderRadius: 'var(--radius-md)',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginTop: '0.5rem'
                    }}>
                      <span>❌ คุณครูไม่เข้างานใน{therapistWorkDayStatus.dayTh}</span>
                    </div>
                  ) : (
                    <div className="time-slot-grid">
                      {availableTimeSlots.map(({ slot, isBooked, available }) => (
                        <button
                          key={slot}
                          type="button"
                          disabled={!available}
                          className={`time-slot-btn ${selectedTimeSlot === slot ? 'selected' : ''}`}
                          onClick={() => setSelectedTimeSlot(slot)}
                        >
                          <div>{slot}</div>
                          <div style={{ fontSize: '0.7rem', marginTop: '0.2rem', opacity: 0.8 }}>
                            {isBooked ? 'คิวเต็ม' : 'ว่าง'}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-light" 
                  onClick={() => setShowBookingModal(false)}
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit" 
                  className="btn btn-secondary"
                  disabled={!!clinicHoliday || !therapistWorkDayStatus.works || !selectedTimeSlot}
                >
                  {editingAppointmentId ? 'บันทึกการแก้ไข' : 'บันทึกการนัดหมาย'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* แสดงเลย์เอาต์แบบเต็มจอ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>ประวัตินัดหมายทั้งหมด</h2>
            
            {/* ช่องค้นหาด่วน */}
            <div style={{ flex: 1, minWidth: '220px', display: 'flex', alignItems: 'center', position: 'relative' }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="ค้นหาจาก HN, ชื่อจริง, หรือชื่อเล่น..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingRight: '2.5rem' }}
              />
            </div>

            {/* ค้นหาจากวันที่ */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--dark-light)' }}>วันที่:</span>
              <input 
                type="date" 
                className="form-control" 
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                style={{ width: '150px', padding: '0.45rem' }}
              />
              {filterDate && (
                <button 
                  type="button"
                  className="btn btn-link btn-sm" 
                  onClick={() => setFilterDate('')}
                  style={{ color: 'var(--danger)', padding: 0, fontSize: '0.85rem', textDecoration: 'none', marginLeft: '0.25rem' }}
                >
                  ล้าง
                </button>
              )}
            </div>

            {/* ตัวกรองสถานะนัดหมาย */}
            <div className="toggle-filter-group">
              <button 
                className={`toggle-filter-btn ${statusFilter === 'All' ? 'active' : ''}`}
                onClick={() => setStatusFilter('All')}
              >
                ทั้งหมด
              </button>
              <button 
                className={`toggle-filter-btn ${statusFilter === 'จองแล้ว' ? 'active' : ''}`}
                onClick={() => setStatusFilter('จองแล้ว')}
                style={{ color: 'var(--warning)' }}
              >
                จองแล้ว
              </button>
              <button 
                className={`toggle-filter-btn ${statusFilter === 'ยืนยันแล้ว' ? 'active' : ''}`}
                onClick={() => setStatusFilter('ยืนยันแล้ว')}
                style={{ color: 'var(--info)' }}
              >
                ยืนยันแล้ว
              </button>
              <button 
                className={`toggle-filter-btn ${statusFilter === 'รับบริการแล้ว' ? 'active' : ''}`}
                onClick={() => setStatusFilter('รับบริการแล้ว')}
                style={{ color: 'var(--success)' }}
              >
                รับบริการแล้ว
              </button>
              <button 
                className={`toggle-filter-btn ${statusFilter === 'ยกเลิก' ? 'active' : ''}`}
                onClick={() => setStatusFilter('ยกเลิก')}
                style={{ color: 'var(--danger)' }}
              >
                ยกเลิก
              </button>
            </div>
          </div>
          <div className="table-container">
            <table className="hdh-table">
              <thead>
                <tr>
                  <th>วันที่/เวลา</th>
                  <th>ผู้ป่วย</th>
                  <th>ครูผู้สอน</th>
                  <th>สถานะ</th>
                  <th>เปลี่ยนสถานะ</th>
                  <th style={{ textAlign: 'center' }}>การดำเนินการ</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAppointments.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--dark-light)' }}>
                      ไม่พบประวัตินัดหมายตามตัวกรองที่ระบุ
                    </td>
                  </tr>
                ) : (
                  paginatedAppointments.map((app) => (
                    <tr key={app.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>
                          {new Date(app.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--dark-light)' }}>
                          {app.timeSlot}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{app.patientName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--dark-light)' }}>
                          HN: {app.hn} ({app.patientNickname})
                        </div>
                        {app.type && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: 500, marginTop: '2px' }}>
                            {app.type}
                          </div>
                        )}
                      </td>
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
                          disabled={currentUser?.role === 'OT'}
                        >
                          <option value="จองแล้ว">จองแล้ว</option>
                          <option value="ยืนยันแล้ว">ยืนยันแล้ว</option>
                          <option value="รับบริการแล้ว">รับบริการแล้ว</option>
                          <option value="ยกเลิก">ยกเลิก</option>
                        </select>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                          <button 
                            className="btn btn-light btn-icon-only" 
                            onClick={() => handleViewDetails(app)}
                            title="ดูข้อมูล"
                            type="button"
                          >
                            <Eye size={14} color="var(--dark)" />
                          </button>
                          {currentUser?.role !== 'OT' && (
                            <button 
                              className="btn btn-light btn-icon-only" 
                              onClick={() => handleEditClick(app)}
                              title="แก้ไข"
                              type="button"
                            >
                              <Edit2 size={14} color="var(--secondary)" />
                            </button>
                          )}
                          {isAdmin && (
                            <button 
                              className="btn btn-light btn-icon-only" 
                              onClick={() => handleDeleteClick(app.id)}
                              title="ลบ"
                              type="button"
                            >
                              <Trash2 size={14} color="var(--danger)" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {maxPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem', marginBottom: '0.5rem' }}>
              <button 
                className="btn btn-light" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                type="button"
              >
                ก่อนหน้า
              </button>
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>หน้า {currentPage} / {maxPages}</span>
              <button 
                className="btn btn-light" 
                disabled={currentPage === maxPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                type="button"
              >
                ถัดไป
              </button>
            </div>
          )}

          <div style={{ fontSize: '0.8rem', color: 'var(--dark-light)', textAlign: 'right' }}>
            แสดง {filteredAppointments.length === 0 ? 0 : (currentPage - 1) * 20 + 1} - {Math.min(currentPage * 20, filteredAppointments.length)} จากทั้งหมด {filteredAppointments.length} รายการ (เรียงจากล่าสุด)
          </div>
        </div>

      </div>
  );
}
