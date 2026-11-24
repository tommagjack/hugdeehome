import React, { useState, useEffect, useMemo } from 'react';
import { formatPatientNickname, getLocalDateString } from '../utils/format';
import {
  BellRing,
  Plus,
  Calendar as CalendarIcon,
  List,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Search,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  UserCheck,
  Phone,
  User
} from 'lucide-react';
import Swal from 'sweetalert2';

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const WEEKDAYS_TH = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

export default function RetentionFollowUp({
  patients = [],
  users = [],
  therapists = [],
  currentUser,
  retentionNotes = [],
  setRetentionNotes,
  autoEditNoteId,
  onClearAutoEdit,
  logActivity
}) {
  const todayStr = getLocalDateString(new Date());
  const nowDate = new Date();

  // ค่าเริ่มต้นแสดงเดือนและปีปัจจุบัน
  const [selectedYear, setSelectedYear] = useState(nowDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(nowDate.getMonth()); // 0 - 11
  const [viewMode, setViewMode] = useState('both'); // 'both' | 'table' | 'calendar'

  // ตัวกรองและค้นหา
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ทั้งหมด'); // 'ทั้งหมด' | 'กำลังติดตาม' | 'ติดตามแล้ว'
  const [assigneeFilter, setAssigneeFilter] = useState('ทั้งหมด');

  // Pagination สำหรับตาราง (หน้าละ 10 รายการ)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // สถานะ Modal (เพิ่ม / แก้ไข / ดูข้อมูล)
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit' | 'view'
  const [editingId, setEditingId] = useState(null);

  // ฟิลด์ในฟอร์ม
  const [formHn, setFormHn] = useState('');
  const [patientSearchText, setPatientSearchText] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [formReminderDate, setFormReminderDate] = useState(todayStr);
  const [formDetails, setFormDetails] = useState('');
  const [formStatus, setFormStatus] = useState('กำลังติดตาม');
  const [formAssignee, setFormAssignee] = useState('');

  // รวมรายชื่อผู้รับผิดชอบจาก users และ therapists
  const staffOptions = useMemo(() => {
    const namesSet = new Set();
    (users || []).forEach(u => {
      if (u && u.status !== 'Inactive' && (u.fullname || u.nickname)) {
        const display = u.nickname ? `${u.fullname} (${u.nickname})` : u.fullname;
        namesSet.add(display.trim());
      }
    });
    (therapists || []).forEach(t => {
      if (t && t.status !== 'Inactive' && (t.fullname || t.nickname)) {
        const display = t.nickname ? `${t.fullname} (${t.nickname})` : t.fullname;
        namesSet.add(display.trim());
      }
    });
    if (currentUser?.fullname) {
      const curDisplay = currentUser.nickname
        ? `${currentUser.fullname} (${currentUser.nickname})`
        : currentUser.fullname;
      namesSet.add(curDisplay.trim());
    }
    return Array.from(namesSet);
  }, [users, therapists, currentUser]);

  const defaultAssigneeName = useMemo(() => {
    if (!currentUser) return staffOptions[0] || 'เจ้าหน้าที่คลินิก';
    return currentUser.nickname
      ? `${currentUser.fullname} (${currentUser.nickname})`
      : (currentUser.fullname || currentUser.username || 'เจ้าหน้าที่คลินิก');
  }, [currentUser, staffOptions]);

  // แผนที่ข้อมูลผู้รับบริการตาม HN
  const patientMap = useMemo(() => {
    const map = new Map();
    (patients || []).forEach(p => {
      if (p && p.hn !== undefined && p.hn !== null) {
        map.set(String(p.hn), p);
      }
    });
    return map;
  }, [patients]);

  // เปิด Modal เพิ่ม / แก้ไข / ดูข้อมูล
  const handleOpenModal = (mode, note = null, presetDate = null) => {
    setModalMode(mode);
    if (mode === 'add') {
      setEditingId(null);
      setFormHn('');
      setPatientSearchText('');
      setFormReminderDate(presetDate || todayStr);
      setFormDetails('');
      setFormStatus('กำลังติดตาม');
      setFormAssignee(defaultAssigneeName);
    } else if (note) {
      setEditingId(note.id);
      setFormHn(String(note.hn || ''));
      const p = patientMap.get(String(note.hn));
      if (p) {
        setPatientSearchText(`HN: ${p.hn} | ${formatPatientNickname(p.nickname)} (${p.title || ''}${p.firstname} ${p.lastname})`);
      } else {
        setPatientSearchText(`HN: ${note.hn}`);
      }
      setFormReminderDate(note.reminderDate || todayStr);
      setFormDetails(note.details || '');
      setFormStatus(note.status || 'กำลังติดตาม');
      setFormAssignee(note.assignee || defaultAssigneeName);
    }
    setShowModal(true);
  };

  // รีเซ็ตหน้า Pagination เมื่อเปลี่ยนเดือนหรือตัวกรอง
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedYear, selectedMonth, searchQuery, statusFilter, assigneeFilter]);

  // รองรับการคลิกจากกระดิ่งแจ้งเตือนหน้าแรก เพื่อเปิด Modal แก้ไข/อัปเดตสถานะของโน้ตนั้นทันที
  useEffect(() => {
    if (autoEditNoteId && Array.isArray(retentionNotes)) {
      const targetNote = retentionNotes.find(n => n && String(n.id) === String(autoEditNoteId));
      if (targetNote) {
        if (targetNote.reminderDate) {
          const parts = targetNote.reminderDate.split('-');
          if (parts.length === 3) {
            setSelectedYear(Number(parts[0]));
            setSelectedMonth(Number(parts[1]) - 1);
          }
        }
        handleOpenModal('edit', targetNote);
      }
      if (typeof onClearAutoEdit === 'function') {
        onClearAutoEdit();
      }
    }
  }, [autoEditNoteId, retentionNotes]);

  // ค้นหาผู้รับบริการใน Dropdown ของ Modal
  const filteredPatientCandidates = useMemo(() => {
    const q = patientSearchText.trim().toLowerCase();
    if (!q || q.startsWith('hn:')) return patients;
    return (patients || []).filter(p => {
      const hnStr = String(p.hn || '').toLowerCase();
      const nickStr = String(p.nickname || '').toLowerCase();
      const fullStr = `${p.title || ''}${p.firstname || ''} ${p.lastname || ''}`.toLowerCase();
      const phoneStr = String(p.phone || '').toLowerCase();
      return hnStr.includes(q) || nickStr.includes(q) || fullStr.includes(q) || phoneStr.includes(q);
    });
  }, [patients, patientSearchText]);

  const selectedPatientObj = useMemo(() => {
    if (!formHn) return null;
    return patientMap.get(String(formHn)) || null;
  }, [formHn, patientMap]);

  // รูปแบบ YYYY-MM ของเดือนที่เลือก
  const selectedYearMonthPrefix = useMemo(() => {
    return `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
  }, [selectedYear, selectedMonth]);

  // กรองรายการตามเดือนปัจจุบันที่เลือก + ตัวกรองสถานะ + ผู้รับผิดชอบ + คำค้นหา
  const filteredMonthNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return (retentionNotes || [])
      .filter(note => {
        if (!note || !note.reminderDate) return false;
        // แสดงเฉพาะข้อมูลในเดือนและปีที่เลือก
        if (!String(note.reminderDate).startsWith(selectedYearMonthPrefix)) return false;

        if (statusFilter !== 'ทั้งหมด' && note.status !== statusFilter) return false;
        if (assigneeFilter !== 'ทั้งหมด' && note.assignee !== assigneeFilter) return false;

        if (q) {
          const p = patientMap.get(String(note.hn));
          const hnMatch = String(note.hn || '').toLowerCase().includes(q);
          const nickMatch = String(p?.nickname || '').toLowerCase().includes(q);
          const nameMatch = `${p?.title || ''}${p?.firstname || ''} ${p?.lastname || ''}`.toLowerCase().includes(q);
          const detailMatch = String(note.details || '').toLowerCase().includes(q);
          const assigneeMatch = String(note.assignee || '').toLowerCase().includes(q);
          if (!hnMatch && !nickMatch && !nameMatch && !detailMatch && !assigneeMatch) return false;
        }
        return true;
      })
      // เรียงลำดับจากใหม่ไปเก่า (วันที่แจ้งเตือนล่าสุดขึ้นก่อน และตามด้วยเวลาสร้างล่าสุด)
      .sort((a, b) => {
        const cmpDate = String(b.reminderDate || '').localeCompare(String(a.reminderDate || ''));
        if (cmpDate !== 0) return cmpDate;
        return String(b.createdAt || b.id || '').localeCompare(String(a.createdAt || a.id || ''));
      });
  }, [retentionNotes, selectedYearMonthPrefix, statusFilter, assigneeFilter, searchQuery, patientMap]);

  // สรุปตัวเลขสถิติของเดือนที่เลือก
  const monthStats = useMemo(() => {
    const allInMonth = (retentionNotes || []).filter(
      n => n && n.reminderDate && String(n.reminderDate).startsWith(selectedYearMonthPrefix)
    );
    const following = allInMonth.filter(n => n.status === 'กำลังติดตาม').length;
    const dueOrOverdue = allInMonth.filter(n => n.status === 'กำลังติดตาม' && n.reminderDate <= todayStr).length;
    const completed = allInMonth.filter(n => n.status === 'ติดตามแล้ว').length;
    return {
      total: allInMonth.length,
      following,
      dueOrOverdue,
      completed
    };
  }, [retentionNotes, selectedYearMonthPrefix, todayStr]);

  // คำนวณ Pagination (10 รายการต่อหน้า)
  const maxPages = Math.max(1, Math.ceil(filteredMonthNotes.length / itemsPerPage));
  const paginatedNotes = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredMonthNotes.slice(start, start + itemsPerPage);
  }, [filteredMonthNotes, currentPage]);

  // สร้างตารางวันในปฏิทินของเดือนที่เลือก
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1);
    const lastDayOfMonth = new Date(selectedYear, selectedMonth + 1, 0);
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) - 6 (Sat)
    const totalDaysInMonth = lastDayOfMonth.getDate();

    const cells = [];
    // ช่องว่างก่อนวันที่ 1
    for (let i = 0; i < startDayOfWeek; i++) {
      cells.push({ isEmpty: true, key: `empty-start-${i}` });
    }

    // จัดกลุ่มโน้ตตามวันที่ YYYY-MM-DD
    const notesByDate = {};
    filteredMonthNotes.forEach(n => {
      const d = n.reminderDate;
      if (!notesByDate[d]) notesByDate[d] = [];
      notesByDate[d].push(n);
    });

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({
        isEmpty: false,
        key: dateStr,
        day,
        dateStr,
        isToday: dateStr === todayStr,
        notes: notesByDate[dateStr] || []
      });
    }

    // เติมช่องว่างท้ายตารางให้ครบแถว 7 วัน
    const remainder = cells.length % 7;
    if (remainder !== 0) {
      for (let i = 0; i < 7 - remainder; i++) {
        cells.push({ isEmpty: true, key: `empty-end-${i}` });
      }
    }

    return cells;
  }, [selectedYear, selectedMonth, filteredMonthNotes, todayStr]);

  // การเลื่อนเดือน
  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(y => y - 1);
    } else {
      setSelectedMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(y => y + 1);
    } else {
      setSelectedMonth(m => m + 1);
    }
  };

  const handleResetCurrentMonth = () => {
    const d = new Date();
    setSelectedYear(d.getFullYear());
    setSelectedMonth(d.getMonth());
  };

  // บันทึกข้อมูลโน้ต (เพิ่ม / แก้ไข)
  const handleSaveNote = (e) => {
    e.preventDefault();
    if (modalMode === 'view') {
      setModalMode('edit');
      return;
    }

    if (!formHn) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาเลือกผู้รับบริการ',
        text: 'โปรดค้นหาและเลือกรายชื่อผู้รับบริการที่ต้องการติดตาม',
        confirmButtonColor: 'var(--secondary)'
      });
      return;
    }

    if (!formReminderDate) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาเลือกวันที่แจ้งเตือน',
        confirmButtonColor: 'var(--secondary)'
      });
      return;
    }

    if (!formDetails.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณากรอกรายละเอียด',
        text: 'โปรดระบุรายละเอียดหรือบันทึกการติดตามผู้รับบริการ',
        confirmButtonColor: 'var(--secondary)'
      });
      return;
    }

    const nowIso = new Date().toISOString();
    const p = patientMap.get(String(formHn));
    const nickLabel = p ? formatPatientNickname(p.nickname) : `HN ${formHn}`;

    if (modalMode === 'add') {
      const newNote = {
        id: `RFU-${Date.now()}`,
        hn: String(formHn),
        reminderDate: formReminderDate,
        details: formDetails.trim(),
        status: formStatus,
        assignee: formAssignee || defaultAssigneeName,
        createdBy: currentUser?.fullname || currentUser?.username || 'เจ้าหน้าที่',
        createdAt: nowIso,
        updatedAt: nowIso
      };

      setRetentionNotes([newNote, ...(retentionNotes || [])]);
      if (typeof logActivity === 'function') {
        logActivity(`เพิ่มโน้ต Retention Follow-up ของ ${nickLabel} (แจ้งเตือนวันที่ ${formReminderDate})`);
      }

      // ปรับเดือนที่แสดงให้ตรงกับเดือนของโน้ตที่เพิ่งเพิ่ม เพื่อให้ผู้ใช้เห็นรายการทันที
      const parts = formReminderDate.split('-');
      if (parts.length === 3) {
        setSelectedYear(Number(parts[0]));
        setSelectedMonth(Number(parts[1]) - 1);
      }

      Swal.fire({
        icon: 'success',
        title: 'บันทึกโน้ตติดตามสำเร็จ',
        text: `เพิ่มรายการติดตาม ${nickLabel} เรียบร้อยแล้ว`,
        timer: 1500,
        showConfirmButton: false
      });
    } else if (modalMode === 'edit' && editingId) {
      const updatedList = (retentionNotes || []).map(item => {
        if (item && String(item.id) === String(editingId)) {
          return {
            ...item,
            hn: String(formHn),
            reminderDate: formReminderDate,
            details: formDetails.trim(),
            status: formStatus,
            assignee: formAssignee || defaultAssigneeName,
            updatedAt: nowIso
          };
        }
        return item;
      });

      setRetentionNotes(updatedList);
      if (typeof logActivity === 'function') {
        logActivity(`อัปเดตโน้ต Retention Follow-up (${editingId}) ของ ${nickLabel} เป็นสถานะ "${formStatus}"`);
      }

      Swal.fire({
        icon: 'success',
        title: 'อัปเดตข้อมูลการติดตามสำเร็จ',
        text: `บันทึกการแก้ไขของ ${nickLabel} เรียบร้อยแล้ว`,
        timer: 1500,
        showConfirmButton: false
      });
    }

    setShowModal(false);
  };

  // สลับสถานะด่วน (กำลังติดตาม <-> ติดตามแล้ว)
  const handleQuickToggleStatus = (note) => {
    const nextStatus = note.status === 'ติดตามแล้ว' ? 'กำลังติดตาม' : 'ติดตามแล้ว';
    const nowIso = new Date().toISOString();
    const updatedList = (retentionNotes || []).map(item => {
      if (item && String(item.id) === String(note.id)) {
        return { ...item, status: nextStatus, updatedAt: nowIso };
      }
      return item;
    });
    setRetentionNotes(updatedList);
    if (typeof logActivity === 'function') {
      logActivity(`เปลี่ยนสถานะ Retention Follow-up (${note.id}) เป็น "${nextStatus}"`);
    }
    Swal.fire({
      icon: 'success',
      title: `เปลี่ยนสถานะเป็น "${nextStatus}"`,
      toast: true,
      position: 'top-end',
      timer: 1500,
      showConfirmButton: false
    });
  };

  // ลบโน้ตติดตาม
  const handleDeleteNote = (note) => {
    const p = patientMap.get(String(note.hn));
    const nickLabel = p ? formatPatientNickname(p.nickname) : `HN ${note.hn}`;

    Swal.fire({
      title: 'ยืนยันการลบโน้ตติดตาม?',
      text: `ต้องการลบโน้ตติดตามของ ${nickLabel} (วันที่ ${formatThaiDateShort(note.reminderDate)}) หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--danger)',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'ใช่, ลบเลย',
      cancelButtonText: 'ยกเลิก'
    }).then((result) => {
      if (result.isConfirmed) {
        const remaining = (retentionNotes || []).filter(item => item && String(item.id) !== String(note.id));
        setRetentionNotes(remaining);
        if (showModal && String(editingId) === String(note.id)) {
          setShowModal(false);
        }
        if (typeof logActivity === 'function') {
          logActivity(`ลบโน้ต Retention Follow-up (${note.id}) ของ ${nickLabel}`);
        }
        Swal.fire({
          icon: 'success',
          title: 'ลบรายการเรียบร้อยแล้ว',
          timer: 1200,
          showConfirmButton: false
        });
      }
    });
  };

  const formatThaiDateShort = (dateStr) => {
    if (!dateStr) return '-';
    const parts = String(dateStr).split('-');
    if (parts.length !== 3) return dateStr;
    const yearBE = Number(parts[0]) + 543;
    const monthIdx = Number(parts[1]) - 1;
    const day = Number(parts[2]);
    return `${day} ${THAI_MONTHS[monthIdx] || parts[1]} ${yearBE}`;
  };

  const yearOptions = useMemo(() => {
    const curY = new Date().getFullYear();
    return [curY - 2, curY - 1, curY, curY + 1, curY + 2];
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* ส่วนหัวหน้าจอ */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: 0 }}>
            <BellRing size={28} color="var(--secondary)" />
            ระบบติดตามผู้รับบริการ (Retention Follow-up)
          </h1>
          <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.9rem', color: 'var(--dark-light)' }}>
            บันทึกโน้ตติดตามผู้รับบริการ ตั้งวันที่แจ้งเตือนอัตโนมัติที่กระดิ่งหน้าแรก และบริหารจัดการสถานะการติดตามรายเดือน
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', fontSize: '0.95rem', fontWeight: 700 }}
          onClick={() => handleOpenModal('add')}
        >
          <Plus size={18} />
          เพิ่มโน้ตติดตาม
        </button>
      </div>

      {/* แถบเลือกเดือน/ปี และการ์ดสรุปยอดประจำเดือน */}
      <div className="card-3xl" style={{ padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          {/* ตัวเลือกเดือนและปี */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-light"
              style={{ padding: '0.45rem 0.75rem', border: '1px solid var(--border)' }}
              onClick={handlePrevMonth}
              title="เดือนก่อนหน้า"
            >
              <ChevronLeft size={18} />
            </button>

            <select
              className="form-control"
              style={{ width: 'auto', fontWeight: 700, fontSize: '1rem', padding: '0.4rem 0.85rem' }}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
            >
              {THAI_MONTHS.map((mName, idx) => (
                <option key={idx} value={idx}>{mName}</option>
              ))}
            </select>

            <select
              className="form-control"
              style={{ width: 'auto', fontWeight: 700, fontSize: '1rem', padding: '0.4rem 0.85rem' }}
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {yearOptions.map(y => (
                <option key={y} value={y}>พ.ศ. {y + 543}</option>
              ))}
            </select>

            <button
              type="button"
              className="btn btn-light"
              style={{ padding: '0.45rem 0.75rem', border: '1px solid var(--border)' }}
              onClick={handleNextMonth}
              title="เดือนถัดไป"
            >
              <ChevronRight size={18} />
            </button>

            <button
              type="button"
              className="btn btn-light"
              style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem', fontWeight: 600, border: '1px solid var(--border)', color: 'var(--secondary)' }}
              onClick={handleResetCurrentMonth}
            >
              เดือนปัจจุบัน
            </button>
          </div>

          {/* ปุ่มสลับมุมมอง */}
          <div style={{ display: 'flex', gap: '0.35rem', backgroundColor: 'var(--light)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
            <button
              type="button"
              onClick={() => setViewMode('both')}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.4rem 0.85rem', fontSize: '0.85rem', fontWeight: 600,
                borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
                backgroundColor: viewMode === 'both' ? 'white' : 'transparent',
                color: viewMode === 'both' ? 'var(--secondary)' : 'var(--dark-light)',
                boxShadow: viewMode === 'both' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              <LayoutGrid size={15} />
              ตาราง + ปฏิทิน
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.4rem 0.85rem', fontSize: '0.85rem', fontWeight: 600,
                borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
                backgroundColor: viewMode === 'table' ? 'white' : 'transparent',
                color: viewMode === 'table' ? 'var(--secondary)' : 'var(--dark-light)',
                boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              <List size={15} />
              เฉพาะตาราง
            </button>
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.4rem 0.85rem', fontSize: '0.85rem', fontWeight: 600,
                borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
                backgroundColor: viewMode === 'calendar' ? 'white' : 'transparent',
                color: viewMode === 'calendar' ? 'var(--secondary)' : 'var(--dark-light)',
                boxShadow: viewMode === 'calendar' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              <CalendarIcon size={15} />
              เฉพาะปฏิทิน
            </button>
          </div>
        </div>

        {/* การ์ดสรุปสถานะประจำเดือน */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ padding: '0.9rem 1.1rem', borderRadius: 'var(--radius-md)', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>รายการในเดือน{THAI_MONTHS[selectedMonth]}ทั้งหมด</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', marginTop: '0.2rem' }}>{monthStats.total} รายการ</div>
          </div>
          <div style={{ padding: '0.9rem 1.1rem', borderRadius: 'var(--radius-md)', backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
            <div style={{ fontSize: '0.8rem', color: '#b45309', fontWeight: 600 }}>สถานะ: กำลังติดตาม</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#d97706', marginTop: '0.2rem' }}>{monthStats.following} รายการ</div>
          </div>
          <div style={{ padding: '0.9rem 1.1rem', borderRadius: 'var(--radius-md)', backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
            <div style={{ fontSize: '0.8rem', color: '#b91c1c', fontWeight: 600 }}>ถึงกำหนดแจ้งเตือน / เลยกำหนด</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#dc2626', marginTop: '0.2rem' }}>{monthStats.dueOrOverdue} รายการ</div>
          </div>
          <div style={{ padding: '0.9rem 1.1rem', borderRadius: 'var(--radius-md)', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <div style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: 600 }}>สถานะ: ติดตามแล้ว</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16a34a', marginTop: '0.2rem' }}>{monthStats.completed} รายการ</div>
          </div>
        </div>

        {/* แถบค้นหาและตัวกรอง */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--dark-light)' }} />
            <input
              type="text"
              className="form-control"
              placeholder="ค้นหาชื่อเล่น, HN, รายละเอียดโน้ต..."
              style={{ paddingLeft: '2.2rem' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="form-control"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ทั้งหมด">สถานะ: ทั้งหมด</option>
            <option value="กำลังติดตาม">สถานะ: กำลังติดตาม</option>
            <option value="ติดตามแล้ว">สถานะ: ติดตามแล้ว</option>
          </select>

          <select
            className="form-control"
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
          >
            <option value="ทั้งหมด">ผู้รับผิดชอบ: ทั้งหมด</option>
            {staffOptions.map((st, idx) => (
              <option key={idx} value={st}>ผู้รับผิดชอบ: {st}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ส่วนที่ 1: มุมมองปฏิทินรายเดือน (Monthly Calendar View) */}
      {(viewMode === 'both' || viewMode === 'calendar') && (
        <div className="card-3xl">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CalendarIcon size={20} color="var(--secondary)" />
              ปฏิทินการติดตามประจำเดือน {THAI_MONTHS[selectedMonth]} พ.ศ. {selectedYear + 543}
            </h2>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block' }} />
                ถึงกำหนด/เลยกำหนด (กำลังติดตาม)
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f59e0b', display: 'inline-block' }} />
                กำลังติดตาม (ยังไม่ถึงวัน)
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }} />
                ติดตามแล้ว
              </span>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: '760px', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderTop: '1px solid var(--border)', borderLeft: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
              {/* หัวตารางวันอาทิตย์ - เสาร์ */}
              {WEEKDAYS_TH.map((dayLabel, idx) => (
                <div
                  key={dayLabel}
                  style={{
                    padding: '0.6rem',
                    textAlign: 'center',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    backgroundColor: idx === 0 || idx === 6 ? '#fdf8f3' : '#f8fafc',
                    color: idx === 0 ? 'var(--danger)' : 'var(--dark)',
                    borderRight: '1px solid var(--border)',
                    borderBottom: '1px solid var(--border)'
                  }}
                >
                  {dayLabel}
                </div>
              ))}

              {/* ช่องวันที่ในปฏิทิน */}
              {calendarDays.map((cell) => {
                if (cell.isEmpty) {
                  return (
                    <div
                      key={cell.key}
                      style={{
                        minHeight: '110px',
                        backgroundColor: '#fafafa',
                        borderRight: '1px solid var(--border)',
                        borderBottom: '1px solid var(--border)'
                      }}
                    />
                  );
                }

                return (
                  <div
                    key={cell.key}
                    style={{
                      minHeight: '115px',
                      padding: '0.45rem',
                      backgroundColor: cell.isToday ? '#fffdf7' : 'white',
                      borderRight: '1px solid var(--border)',
                      borderBottom: '1px solid var(--border)',
                      boxShadow: cell.isToday ? 'inset 0 0 0 2px var(--secondary)' : 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.3rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span
                        style={{
                          fontSize: '0.82rem',
                          fontWeight: cell.isToday ? 800 : 600,
                          color: cell.isToday ? 'white' : 'var(--dark)',
                          backgroundColor: cell.isToday ? 'var(--secondary)' : 'transparent',
                          borderRadius: '12px',
                          padding: cell.isToday ? '1px 7px' : '0'
                        }}
                      >
                        {cell.day} {cell.isToday ? '(วันนี้)' : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenModal('add', null, cell.dateStr)}
                        title={`เพิ่มโน้ตวันที่ ${formatThaiDateShort(cell.dateStr)}`}
                        style={{
                          border: 'none',
                          background: 'var(--light)',
                          color: 'var(--dark-light)',
                          borderRadius: '4px',
                          width: '20px',
                          height: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: 700
                        }}
                      >
                        +
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '130px', overflowY: 'auto' }}>
                      {cell.notes.map((note) => {
                        const p = patientMap.get(String(note.hn));
                        const nick = p ? formatPatientNickname(p.nickname) : `HN ${note.hn}`;
                        const isCompleted = note.status === 'ติดตามแล้ว';
                        const isDue = !isCompleted && note.reminderDate <= todayStr;

                        const bg = isCompleted ? '#dcfce7' : isDue ? '#fee2e2' : '#fef3c7';
                        const border = isCompleted ? '#86efac' : isDue ? '#fca5a5' : '#fde68a';
                        const color = isCompleted ? '#166534' : isDue ? '#991b1b' : '#92400e';

                        return (
                          <div
                            key={note.id}
                            onClick={() => handleOpenModal('edit', note)}
                            title={`${nick} (${note.status})\nผู้รับผิดชอบ: ${note.assignee || '-'}\nรายละเอียด: ${note.details || '-'}\n(คลิกเพื่อดู/แก้ไข)`}
                            style={{
                              padding: '0.25rem 0.4rem',
                              borderRadius: '5px',
                              backgroundColor: bg,
                              border: `1px solid ${border}`,
                              color: color,
                              fontSize: '0.74rem',
                              cursor: 'pointer',
                              lineHeight: 1.3,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontWeight: 600
                            }}
                          >
                            {isCompleted ? '✓ ' : isDue ? '🔔 ' : '⏳ '}
                            {nick} - {note.details}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ส่วนที่ 2: มุมมองตารางรายการ (Table View พร้อม Pagination หน้าละ 10 รายการ เรียงจากใหม่ไปเก่า) */}
      {(viewMode === 'both' || viewMode === 'table') && (
        <div className="card-3xl">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <List size={20} color="var(--secondary)" />
              ตารางรายการติดตามเดือน {THAI_MONTHS[selectedMonth]} พ.ศ. {selectedYear + 543} (เรียงจากใหม่ไปเก่า)
            </h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--dark-light)', fontWeight: 600 }}>
              ทั้งหมด {filteredMonthNotes.length} รายการ (แสดงหน้าละ 10 รายการ)
            </span>
          </div>

          {filteredMonthNotes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--dark-light)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
              ไม่พบรายการโน้ตติดตามผู้รับบริการในเดือน {THAI_MONTHS[selectedMonth]} พ.ศ. {selectedYear + 543} ตามเงื่อนไขที่เลือก
            </div>
          ) : (
            <>
              <div className="table-container">
                <table className="hdh-table">
                  <thead>
                    <tr>
                      <th style={{ width: '15%' }}>วันที่แจ้งเตือน</th>
                      <th style={{ width: '22%' }}>ผู้รับบริการ</th>
                      <th style={{ width: '28%' }}>รายละเอียดการติดตาม</th>
                      <th style={{ width: '14%' }}>ผู้รับผิดชอบ</th>
                      <th style={{ width: '11%', textAlign: 'center' }}>สถานะ</th>
                      <th style={{ width: '10%', textAlign: 'center' }}>การดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedNotes.map((note) => {
                      const p = patientMap.get(String(note.hn));
                      const nick = p ? formatPatientNickname(p.nickname) : 'ไม่ระบุชื่อเล่น';
                      const fullName = p ? `${p.title || ''}${p.firstname || ''} ${p.lastname || ''}`.trim() : `HN: ${note.hn}`;
                      const isCompleted = note.status === 'ติดตามแล้ว';
                      const isDueToday = !isCompleted && note.reminderDate === todayStr;
                      const isOverdue = !isCompleted && note.reminderDate < todayStr;

                      return (
                        <tr key={note.id} style={{ backgroundColor: isDueToday || isOverdue ? '#fffafa' : 'transparent' }}>
                          <td>
                            <div style={{ fontWeight: 700, color: 'var(--dark)' }}>
                              {formatThaiDateShort(note.reminderDate)}
                            </div>
                            {isDueToday && (
                              <span style={{ display: 'inline-block', marginTop: '3px', padding: '1px 7px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 700, backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>
                                🔔 ถึงกำหนดวันนี้
                              </span>
                            )}
                            {isOverdue && (
                              <span style={{ display: 'inline-block', marginTop: '3px', padding: '1px 7px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 700, backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' }}>
                                ⚠️ ถึงกำหนดติดตาม
                              </span>
                            )}
                          </td>
                          <td>
                            <div style={{ fontWeight: 700, color: 'var(--secondary)' }}>
                              {nick} <span style={{ fontSize: '0.8rem', color: 'var(--dark-light)', fontWeight: 600 }}>(HN: {note.hn})</span>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--dark)' }}>{fullName}</div>
                            {p?.phone && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--dark-light)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '2px' }}>
                                <Phone size={11} /> {p.phone} {p.guardian ? `(${p.guardian})` : ''}
                              </div>
                            )}
                          </td>
                          <td>
                            <div style={{ fontSize: '0.88rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.45 }}>
                              {note.details}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <UserCheck size={14} color="var(--secondary)" />
                              {note.assignee || '-'}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleQuickToggleStatus(note)}
                              title="คลิกเพื่อสลับสถานะ (กำลังติดตาม / ติดตามแล้ว)"
                              className={`badge ${isCompleted ? 'badge-success' : 'badge-warning'}`}
                              style={{
                                border: 'none',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                padding: '0.35rem 0.65rem',
                                fontSize: '0.78rem'
                              }}
                            >
                              {isCompleted ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                              {note.status || 'กำลังติดตาม'}
                            </button>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.35rem' }}>
                              <button
                                type="button"
                                className="btn btn-light btn-icon-only"
                                title="ดูข้อมูลรายละเอียด"
                                onClick={() => handleOpenModal('view', note)}
                              >
                                <Eye size={15} color="var(--info)" />
                              </button>
                              <button
                                type="button"
                                className="btn btn-light btn-icon-only"
                                title="แก้ไข / อัปเดตผลการติดตาม"
                                onClick={() => handleOpenModal('edit', note)}
                              >
                                <Edit2 size={15} color="var(--secondary)" />
                              </button>
                              <button
                                type="button"
                                className="btn btn-light btn-icon-only"
                                title="ลบรายการ"
                                onClick={() => handleDeleteNote(note)}
                              >
                                <Trash2 size={15} color="var(--danger)" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* แถบ Pagination หน้าละ 10 รายการ */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginTop: '1.25rem' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--dark-light)' }}>
                  แสดง {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredMonthNotes.length)} จากทั้งหมด {filteredMonthNotes.length} รายการ
                </div>

                {maxPages > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button
                      type="button"
                      className="btn btn-light"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    >
                      ก่อนหน้า
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>หน้า</span>
                      <select
                        value={currentPage}
                        onChange={(e) => setCurrentPage(Number(e.target.value))}
                        style={{
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.88rem',
                          borderRadius: '6px',
                          border: '1px solid var(--border)',
                          backgroundColor: 'white',
                          cursor: 'pointer',
                          fontWeight: 600
                        }}
                      >
                        {Array.from({ length: maxPages }, (_, i) => i + 1).map(page => (
                          <option key={page} value={page}>{page}</option>
                        ))}
                      </select>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>/ {maxPages}</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-light"
                      disabled={currentPage === maxPages}
                      onClick={() => setCurrentPage(p => Math.min(maxPages, p + 1))}
                    >
                      ถัดไป
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Modal: เพิ่ม / แก้ไข / ดูข้อมูลโน้ตติดตามผู้รับบริการ */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content-wrapper" style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <BellRing size={20} color="var(--secondary)" />
                {modalMode === 'add'
                  ? 'เพิ่มโน้ตติดตามผู้รับบริการ (Retention Follow-up)'
                  : modalMode === 'edit'
                  ? 'แก้ไข / อัปเดตผลการติดตามผู้รับบริการ'
                  : 'รายละเอียดโน้ตติดตามผู้รับบริการ'}
              </h3>
              <button className="close-modal-btn" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={handleSaveNote}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                {/* 1. เลือกรายชื่อผู้รับบริการ */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    รายชื่อผู้รับบริการ <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="-- ค้นหาด้วยรหัส HN, ชื่อเล่น หรือชื่อ-นามสกุล --"
                      value={patientSearchText}
                      disabled={modalMode === 'view'}
                      onChange={(e) => {
                        setPatientSearchText(e.target.value);
                        setFormHn('');
                        setShowPatientDropdown(true);
                      }}
                      onFocus={() => {
                        if (modalMode !== 'view') setShowPatientDropdown(true);
                      }}
                      onBlur={() => {
                        setTimeout(() => setShowPatientDropdown(false), 200);
                      }}
                      required
                    />
                    {showPatientDropdown && modalMode !== 'view' && (
                      <div
                        className="card-md"
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          maxHeight: '210px',
                          overflowY: 'auto',
                          zIndex: 1200,
                          backgroundColor: 'white',
                          border: '1px solid var(--border)',
                          boxShadow: 'var(--shadow-lg)',
                          borderRadius: 'var(--radius-md)',
                          marginTop: '0.25rem',
                          padding: '0.35rem 0'
                        }}
                      >
                        {filteredPatientCandidates.length === 0 ? (
                          <div style={{ padding: '0.6rem 1rem', color: 'var(--dark-light)', fontSize: '0.85rem' }}>
                            ไม่พบรายชื่อผู้รับบริการ
                          </div>
                        ) : (
                          filteredPatientCandidates.map(p => (
                            <div
                              key={p.hn}
                              style={{
                                padding: '0.5rem 1rem',
                                cursor: 'pointer',
                                fontSize: '0.88rem',
                                borderBottom: '1px solid #f1f5f9'
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--light)')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                              onClick={() => {
                                setFormHn(String(p.hn));
                                setPatientSearchText(`HN: ${p.hn} | ${formatPatientNickname(p.nickname)} (${p.title || ''}${p.firstname} ${p.lastname})`);
                                setShowPatientDropdown(false);
                              }}
                            >
                              <strong>HN: {p.hn} | {formatPatientNickname(p.nickname)}</strong> ({p.title || ''}${p.firstname} {p.lastname})
                              <span style={{ float: 'right', fontSize: '0.75rem', color: p.status === 'Active' ? 'var(--success)' : 'var(--dark-light)' }}>
                                {p.status}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* แสดงข้อมูลติดต่อผู้ปกครองเมื่อเลือกผู้รับบริการแล้ว */}
                  {selectedPatientObj && (
                    <div style={{ marginTop: '0.45rem', padding: '0.55rem 0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.82rem', color: '#475569', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span><User size={13} style={{ verticalAlign: 'middle' }} /> <strong>ผู้ปกครอง:</strong> {selectedPatientObj.guardian || '-'}</span>
                      <span><Phone size={13} style={{ verticalAlign: 'middle' }} /> <strong>โทร:</strong> {selectedPatientObj.phone || '-'}</span>
                    </div>
                  )}
                </div>

                {/* 2. วันที่แจ้งเตือน และ ผู้รับผิดชอบ */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">
                      วันที่แจ้งเตือน <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={formReminderDate}
                      disabled={modalMode === 'view'}
                      onChange={(e) => setFormReminderDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">
                      ผู้รับผิดชอบ <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <select
                      className="form-control"
                      value={formAssignee}
                      disabled={modalMode === 'view'}
                      onChange={(e) => setFormAssignee(e.target.value)}
                      required
                    >
                      {!staffOptions.includes(formAssignee) && formAssignee && (
                        <option value={formAssignee}>{formAssignee}</option>
                      )}
                      {staffOptions.map((st, idx) => (
                        <option key={idx} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 3. สถานะ (กำลังติดตาม / ติดตามแล้ว) */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    สถานะการติดตาม <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        padding: '0.6rem',
                        borderRadius: '8px',
                        border: formStatus === 'กำลังติดตาม' ? '2px solid #d97706' : '1px solid var(--border)',
                        backgroundColor: formStatus === 'กำลังติดตาม' ? '#fffbeb' : 'white',
                        color: formStatus === 'กำลังติดตาม' ? '#b45309' : 'var(--dark)',
                        fontWeight: 700,
                        cursor: modalMode === 'view' ? 'default' : 'pointer'
                      }}
                    >
                      <input
                        type="radio"
                        name="retentionStatus"
                        value="กำลังติดตาม"
                        disabled={modalMode === 'view'}
                        checked={formStatus === 'กำลังติดตาม'}
                        onChange={() => setFormStatus('กำลังติดตาม')}
                      />
                      <Clock size={16} />
                      กำลังติดตาม
                    </label>

                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        padding: '0.6rem',
                        borderRadius: '8px',
                        border: formStatus === 'ติดตามแล้ว' ? '2px solid #16a34a' : '1px solid var(--border)',
                        backgroundColor: formStatus === 'ติดตามแล้ว' ? '#f0fdf4' : 'white',
                        color: formStatus === 'ติดตามแล้ว' ? '#15803d' : 'var(--dark)',
                        fontWeight: 700,
                        cursor: modalMode === 'view' ? 'default' : 'pointer'
                      }}
                    >
                      <input
                        type="radio"
                        name="retentionStatus"
                        value="ติดตามแล้ว"
                        disabled={modalMode === 'view'}
                        checked={formStatus === 'ติดตามแล้ว'}
                        onChange={() => setFormStatus('ติดตามแล้ว')}
                      />
                      <CheckCircle2 size={16} />
                      ติดตามแล้ว
                    </label>
                  </div>
                </div>

                {/* 4. รายละเอียดการติดตาม */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    รายละเอียดการติดตาม / บันทึกโน้ต <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <textarea
                    className="form-control"
                    rows="4"
                    placeholder="ระบุรายละเอียดที่ต้องการติดตาม หรือบันทึกผลการพูดคุยกับผู้ปกครอง..."
                    value={formDetails}
                    disabled={modalMode === 'view'}
                    onChange={(e) => setFormDetails(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  {modalMode !== 'add' && editingId && (
                    <button
                      type="button"
                      className="btn btn-light"
                      style={{ color: 'var(--danger)', border: '1px solid #fecaca', backgroundColor: '#fef2f2' }}
                      onClick={() => {
                        const target = (retentionNotes || []).find(n => n && String(n.id) === String(editingId));
                        if (target) handleDeleteNote(target);
                      }}
                    >
                      <Trash2 size={15} /> ลบโน้ตนี้
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {modalMode === 'view' ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={(e) => {
                        e.preventDefault();
                        setModalMode('edit');
                      }}
                    >
                      <Edit2 size={15} /> แก้ไข / อัปเดตสถานะ
                    </button>
                  ) : (
                    <button type="submit" className="btn btn-primary">
                      {modalMode === 'add' ? 'บันทึกโน้ตติดตาม' : 'บันทึกการอัปเดต'}
                    </button>
                  )}
                  <button type="button" className="btn btn-light" onClick={() => setShowModal(false)}>
                    ปิด
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
