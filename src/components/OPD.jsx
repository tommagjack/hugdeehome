import React, { useState, useMemo } from 'react';
import { formatPatientNickname, formatTherapistName, parseDateToAD } from '../utils/format';
import { 
  ClipboardList, 
  Search, 
  Plus, 
  Printer, 
  Edit2, 
  Trash2, 
  Eye, 
  EyeOff, 
  FileText, 
  Upload, 
  Download,
  X,
  Check,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Swal from 'sweetalert2';
import { exportToCSV, parseCSV } from '../utils/csvHelper';

export default function OPD({
  patients,
  therapists,
  opdRecords,
  setOpdRecords,
  onPrintOPD,
  currentUser
}) {
  const isAdmin = currentUser?.role === 'Admin';
  const [selectedHn, setSelectedHn] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // สถานะแบ่งหน้าของตารางประวัติ
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // รีเซ็ตหน้าเมื่อเปลี่ยนคนไข้หรือคำค้นหา
  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedHn, searchQuery]);

  // สำหรับการค้นหาผู้รับบริการ
  const [patientSearchText, setPatientSearchText] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  // ซิงค์ป้อนคำค้นตาม selectedHn ของผู้รับบริการ
  React.useEffect(() => {
    if (selectedHn) {
      const p = patients.find(item => item.hn === selectedHn);
      if (p) {
        setPatientSearchText(`HN: ${p.hn} | ${formatPatientNickname(p.nickname)} (${p.title}${p.firstname} ${p.lastname})`);
      } else {
        setPatientSearchText('');
      }
    } else {
      setPatientSearchText('');
    }
  }, [selectedHn, patients]);

  // กรองผู้ป่วยในขณะค้นหา
  const filteredActivePatients = useMemo(() => {
    const q = patientSearchText.trim().toLowerCase();
    if (!q || q.startsWith('hn:')) return patients;
    return patients.filter(p => 
      String(p.hn).toLowerCase().includes(q) || 
      String(p.nickname).toLowerCase().includes(q) || 
      `${p.title}${p.firstname} ${p.lastname}`.toLowerCase().includes(q)
    );
  }, [patients, patientSearchText]);

  // ฟอร์มข้อมูลการฝึก
  const [formDate, setFormDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }); // อิงเวลาของระบบ
  const [formTherapist, setFormTherapist] = useState('');
  const [formDetails, setFormDetails] = useState('');
  const [formFileUrl, setFormFileUrl] = useState('');
  const [formIsVisible, setFormIsVisible] = useState(true);
  
  // จัดการสถานะกำลังแก้ไข (Inline Edit)
  const [editingId, setEditingId] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editTherapist, setEditTherapist] = useState('');
  const [editDetails, setEditDetails] = useState('');
  const [editFileUrl, setEditFileUrl] = useState('');
  const [editIsVisible, setEditIsVisible] = useState(true);

  // ค้นหาผู้ป่วยที่เลือก
  const activePatient = useMemo(() => {
    return patients.find(p => p.hn === selectedHn) || null;
  }, [patients, selectedHn]);

  // ตั้งค่าครูผู้สอนตั้งต้นเมื่อเปลี่ยนผู้ป่วยหรือเมื่อเรนเดอร์ครั้งแรก
  React.useEffect(() => {
    if (therapists && therapists.length > 0 && !formTherapist) {
      setFormTherapist(therapists[0].nickname);
    }
  }, [therapists, formTherapist]);

  // กรองประวัติการฝึกเฉพาะของคนไข้ที่เลือกและตามช่องค้นหา
  const filteredRecords = useMemo(() => {
    if (!selectedHn) return [];
    let records = opdRecords.filter(r => r.hn === selectedHn);
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      records = records.filter(r => 
        String(r.details || '').toLowerCase().includes(q) || 
        String(r.therapist || '').toLowerCase().includes(q)
      );
    }
    
    // เรียงลำดับจากวันที่ล่าสุดเสมอ (ย้อนกลับ)
    return [...records].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  }, [opdRecords, selectedHn, searchQuery]);

  // สรุปแถวสำหรับตารางปัจจุบัน (Pagination)
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage]);

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;

  // ฟังก์ชันคำนวณอายุเด็ก ณ วันที่จำลองระบบ 5 มิถุนายน 2569 (2026-06-05)
  const calculateAge = (dob) => {
    if (!dob) return '-';
    const birthDate = parseDateToAD(dob);
    if (!birthDate) return 'วันเกิดไม่ถูกต้อง';
    const normalizedBirthYear = birthDate.getFullYear();
    const today = new Date();
    let years = today.getFullYear() - normalizedBirthYear;
    let months = today.getMonth() - birthDate.getMonth();
    if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
      years--;
      months += 12;
    }
    if (today.getDate() < birthDate.getDate()) {
      months--;
    }
    if (months < 0) months = 11;
    return `${years} ปี ${months} เดือน`;
  };

  // ฟังก์ชันบันทึกข้อมูลผลการฝึกแถวใหม่
  const handleAddRecord = (e) => {
    e.preventDefault();
    if (!selectedHn) {
      Swal.fire({ icon: 'warning', title: 'กรุณาเลือกผู้รับบริการ', confirmButtonColor: 'var(--secondary)' });
      return;
    }
    if (!formDetails.trim()) {
      Swal.fire({ icon: 'warning', title: 'กรุณากรอกรายละเอียดผลการฝึก', confirmButtonColor: 'var(--secondary)' });
      return;
    }

    const newRecord = {
      id: `OPD-${Date.now()}`,
      hn: selectedHn,
      date: formDate,
      therapist: formTherapist || (therapists[0] ? therapists[0].nickname : ''),
      details: formDetails,
      fileUrl: formFileUrl,
      isVisible: formIsVisible
    };

    setOpdRecords([newRecord, ...opdRecords]);
    
    // ล้างค่าฟอร์มยกเว้นครูกับวันที่
    setFormDetails('');
    setFormFileUrl('');
    setFormIsVisible(true);
    setCurrentPage(1);

    Swal.fire({
      icon: 'success',
      title: 'บันทึกสำเร็จ',
      text: 'เพิ่มบันทึกผลการฝึกใหม่เรียบร้อยแล้ว',
      timer: 1500,
      showConfirmButton: false
    });
  };

  // ฟังก์ชันเริ่มการแก้ไขแบบ Inline
  const startEditing = (row) => {
    setEditingId(row.id);
    setEditDate(row.date);
    setEditTherapist(row.therapist);
    setEditDetails(row.details);
    setEditFileUrl(row.fileUrl || '');
    setEditIsVisible(row.isVisible);
  };

  // ฟังก์ชันยกเลิกแก้ไข
  const cancelEditing = () => {
    setEditingId(null);
  };

  // ฟังก์ชันบันทึกการแก้ไข Inline
  const handleSaveEdit = (id) => {
    if (!editDetails.trim()) {
      Swal.fire({ icon: 'warning', title: 'กรุณากรอกรายละเอียดผลการฝึก', confirmButtonColor: 'var(--secondary)' });
      return;
    }

    const updated = opdRecords.map(r => {
      if (r.id === id) {
        return {
          ...r,
          date: editDate,
          therapist: editTherapist,
          details: editDetails,
          fileUrl: editFileUrl,
          isVisible: editIsVisible
        };
      }
      return r;
    });

    setOpdRecords(updated);
    setEditingId(null);

    Swal.fire({
      icon: 'success',
      title: 'แก้ไขสำเร็จ',
      text: 'บันทึกผลการแก้ไขเรียบร้อยแล้ว',
      timer: 1200,
      showConfirmButton: false
    });
  };

  // ฟังก์ชันลบบันทึก
  const handleDeleteRecord = (id) => {
    Swal.fire({
      title: 'ยืนยันการลบข้อมูล?',
      text: "คุณจะไม่สามารถกู้คืนบันทึกผลการฝึกนี้ได้!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--danger)',
      cancelButtonColor: 'var(--dark-light)',
      confirmButtonText: 'ใช่, ลบเลย!',
      cancelButtonText: 'ยกเลิก'
    }).then((result) => {
      if (result.isConfirmed) {
        setOpdRecords(opdRecords.filter(r => r.id !== id));
        Swal.fire({
          icon: 'success',
          title: 'ลบเรียบร้อย!',
          text: 'บันทึกดังกล่าวถูกลบออกจากระบบแล้ว',
          timer: 1200,
          showConfirmButton: false
        });
      }
    });
  };

  // บันทึกไฟล์ประวัติคนไข้ไปยังระบบจริงผ่าน /api/upload
  const handleMockUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!activePatient) {
      Swal.fire('กรุณาเลือกผู้รับบริการก่อน', '', 'warning');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const cleanTitle = (activePatient.title || '').replace(/\$/g, '');
      const cleanFirstname = (activePatient.firstname || '').replace(/\$/g, '');
      const cleanLastname = (activePatient.lastname || '').replace(/\$/g, '');
      const fullnameClean = `${cleanTitle}${cleanFirstname} ${cleanLastname}`.trim().replace(/\s+/g, '-');
      const folderName = `${activePatient.hn}-${fullnameClean}`;
      const fileName = `${activePatient.hn}-${fullnameClean}-${file.name}`;

      fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folder: folderName,
          filename: fileName,
          base64Data: reader.result
        })
      })
      .then(res => {
        if (!res.ok) throw new Error('อัปโหลดไฟล์ประวัติล้มเหลว');
        return res.json();
      })
      .then(data => {
        setFormFileUrl(data.url);
        Swal.fire({
          icon: 'success',
          title: 'อัปโหลดสำเร็จ',
          text: `แนบไฟล์ ${file.name} เรียบร้อย`,
          timer: 1200,
          showConfirmButton: false
        });
      })
      .catch(err => {
        console.error(err);
        Swal.fire('อัปโหลดล้มเหลว', 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์', 'error');
      });
    };
    reader.readAsDataURL(file);
  };

  const handleEditMockUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!activePatient) return;

    const reader = new FileReader();
    reader.onload = () => {
      const cleanTitle = (activePatient.title || '').replace(/\$/g, '');
      const cleanFirstname = (activePatient.firstname || '').replace(/\$/g, '');
      const cleanLastname = (activePatient.lastname || '').replace(/\$/g, '');
      const fullnameClean = `${cleanTitle}${cleanFirstname} ${cleanLastname}`.trim().replace(/\s+/g, '-');
      const folderName = `${activePatient.hn}-${fullnameClean}`;
      const fileName = `${activePatient.hn}-${fullnameClean}-${file.name}`;

      fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folder: folderName,
          filename: fileName,
          base64Data: reader.result
        })
      })
      .then(res => {
        if (!res.ok) throw new Error('อัปโหลดไฟล์ประวัติล้มเหลว');
        return res.json();
      })
      .then(data => {
        setEditFileUrl(data.url);
        Swal.fire({
          icon: 'success',
          title: 'อัปโหลดสำเร็จ',
          text: `แนบไฟล์ ${file.name} เรียบร้อย`,
          timer: 1200,
          showConfirmButton: false
        });
      })
      .catch(err => {
        console.error(err);
        Swal.fire('อัปโหลดล้มเหลว', 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์', 'error');
      });
    };
    reader.readAsDataURL(file);
  };

  const handleExportCSV = () => {
    const recordsToExport = selectedHn 
      ? opdRecords.filter(r => r.hn === selectedHn)
      : opdRecords;
    
    const headers = [
      'รหัสบันทึก', 'รหัส HN', 'วันที่ฝึก', 'ครูผู้ให้บริการ', 'รายละเอียดผลการฝึก', 'ไฟล์แนบ', 'แสดงต่อผู้ปกครอง'
    ];

    let rows = [];

    if (recordsToExport.length === 0) {
      // Export template
      rows = [
        ['OPD-1', selectedHn || '68001', '2026-06-05', 'ครูแนน', 'ตัวอย่างบันทึกการฝึกกิจกรรมบำบัด (กรุณาลบแถวนี้ก่อนใช้งานจริง)', '', 'ใช่']
      ];
      Swal.fire({
        title: 'ส่งออกไฟล์เทมเพลต',
        text: 'เนื่องจากไม่มีข้อมูลบันทึกผลการฝึกในระบบ ระบบจะส่งออกเป็นไฟล์เทมเพลตตัวอย่าง',
        icon: 'info',
        confirmButtonColor: 'var(--secondary)'
      });
    } else {
      rows = recordsToExport.map(r => [
        r.id,
        r.hn,
        r.date,
        r.therapist,
        r.details,
        r.fileUrl || '',
        r.isVisible ? 'ใช่' : 'ไม่ใช่'
      ]);
    }

    const filename = selectedHn ? `opd_records_${selectedHn}.csv` : 'all_opd_records.csv';
    exportToCSV(filename, headers, rows);
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
      const headersMap = {
        id: ['id', 'รหัสบันทึก', 'รหัส opd', 'บันทึก id'],
        hn: ['hn', 'รหัส hn', 'รหัสผู้ป่วย', 'hn ผู้ป่วย'],
        date: ['date', 'วันที่ฝึก', 'วันที่', 'วันที่บันทึก'],
        therapist: ['therapist', 'ครูผู้ฝึก', 'ครูผู้ให้บริการ', 'ครูผู้สอน', 'ครู'],
        details: ['details', 'รายละเอียดการฝึก', 'รายละเอียดผลการฝึก', 'พฤติกรรม', 'รายละเอียด'],
        fileUrl: ['fileurl', 'ไฟล์แนบ', 'ลิงก์ไฟล์', 'รูปภาพ'],
        isVisible: ['isvisible', 'ผู้ปกครองเห็น', 'แสดงต่อผู้ปกครอง', 'สถานะผู้ปกครองเห็น']
      };

      Object.keys(headersMap).forEach(key => {
        const matchingHeaders = headersMap[key];
        const idx = csvHeaders.findIndex(h => matchingHeaders.includes(h));
        if (idx !== -1) {
          indexMap[key] = idx;
        }
      });

      if (indexMap.hn === undefined || indexMap.date === undefined || indexMap.details === undefined) {
        Swal.fire({
          icon: 'error',
          title: 'รูปแบบคอลัมน์ไม่ถูกต้อง',
          text: 'กรุณาตรวจสอบว่ามีคอลัมน์ รหัส HN, วันที่ฝึก และ รายละเอียดการฝึก อย่างน้อยที่สุด',
          confirmButtonColor: 'var(--secondary)'
        });
        return;
      }

      let addedCount = 0;
      let updatedCount = 0;
      let invalidHnCount = 0;
      let errorCount = 0;

      let currentRecords = [...opdRecords];

      rows.forEach((row, index) => {
        if (row.length === 0 || (row.length === 1 && row[0] === '')) return;

        const val = (key) => {
          const idx = indexMap[key];
          return idx !== undefined && row[idx] !== undefined ? row[idx].trim() : '';
        };

        const hn = val('hn');
        const date = val('date');
        const details = val('details');

        if (!hn || !date || !details) {
          errorCount++;
          return;
        }

        const patientExists = patients.some(p => String(p.hn) === String(hn));
        if (!patientExists) {
          invalidHnCount++;
          return;
        }

        let id = val('id');
        if (!id) {
          id = `OPD-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`;
        }

        const isVisibleRaw = val('isVisible').toLowerCase();
        const isVisible = isVisibleRaw === 'ใช่' || isVisibleRaw === 'true' || isVisibleRaw === '1' || isVisibleRaw === 'yes' || isVisibleRaw === '';

        const recordData = {
          id,
          hn,
          date,
          therapist: val('therapist') || (therapists[0] ? therapists[0].nickname : 'ครูผู้ดูแล'),
          details,
          fileUrl: val('fileUrl'),
          isVisible
        };

        const existingIdx = currentRecords.findIndex(r => r.id === id);
        if (existingIdx !== -1) {
          currentRecords[existingIdx] = recordData;
          updatedCount++;
        } else {
          currentRecords.push(recordData);
          addedCount++;
        }
      });

      if (setOpdRecords) {
        setOpdRecords(currentRecords);
      }

      setCurrentPage(1);

      Swal.fire({
        icon: 'success',
        title: 'นำเข้าข้อมูลสำเร็จ',
        html: `
          <div style="font-family: var(--font-family); text-align: left; font-size: 0.95rem; line-height: 1.6;">
            นำเข้าใหม่: <strong>${addedCount}</strong> รายการ<br/>
            อัปเดตข้อมูลเดิม: <strong>${updatedCount}</strong> รายการ<br/>
            ข้ามเนื่องจาก HN ไม่มีในระบบ: <strong style="color:var(--warning)">${invalidHnCount}</strong> รายการ<br/>
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
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>
          <ClipboardList size={28} />
          บันทึกผลการฝึก (OPD Card)
        </h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-light" onClick={handleExportCSV} title="ส่งออกประวัติการฝึกเป็นไฟล์ CSV">
            <Download size={16} /> Export CSV
          </button>
          <label className="btn btn-light" style={{ cursor: 'pointer', margin: 0 }} title="นำเข้าประวัติการฝึกผ่านไฟล์ CSV">
            <Upload size={16} /> Import CSV
            <input type="file" accept=".csv" onChange={handleImportCSV} style={{ display: 'none' }} />
          </label>
          <button 
            className="btn btn-secondary" 
            onClick={() => onPrintOPD('opd_blank', null)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Printer size={16} /> พิมพ์ OPD การ์ดเปล่า
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        {/* ค้นหาและเลือกผู้รับบริการ */}
        <div className="card-2xl">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ fontWeight: 600, fontSize: '0.95rem' }}>กรุณาเลือกผู้รับบริการเพื่อดูและบันทึกประวัติ:</label>
            <div style={{ position: 'relative', width: '100%', maxWidth: '500px' }}>
              <input 
                type="text"
                className="form-control"
                placeholder="-- ค้นหาและเลือกผู้รับบริการด้วย HN หรือชื่อเล่น --"
                value={patientSearchText}
                onChange={(e) => {
                  setPatientSearchText(e.target.value);
                  setSelectedHn('');
                  setCurrentPage(1);
                  setSearchQuery('');
                  setShowPatientDropdown(true);
                }}
                onFocus={() => setShowPatientDropdown(true)}
                onBlur={() => {
                  setTimeout(() => setShowPatientDropdown(false), 200);
                }}
              />
              
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
                      ไม่พบข้อมูลผู้รับบริการ
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
                        HN: {p.hn} | {formatPatientNickname(p.nickname)} ({p.title}{p.firstname} {p.lastname}) [{p.status === 'Active' ? 'ปกติ' : 'ปิดประวัติ'}]
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {activePatient && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {/* ข้อมูลประวัติผู้รับบริการคนนี้ */}
              <div className="card-2xl" style={{ borderLeft: '4px solid var(--secondary)' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--dark)' }}>ข้อมูลผู้รับบริการเบื้องต้น</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
                  <div><strong>เลขทะเบียนผู้ป่วย (HN):</strong> {activePatient.hn}</div>
                  <div><strong>ชื่อ-สกุล:</strong> {activePatient.title}{activePatient.firstname} {activePatient.lastname} ({activePatient.nickname})</div>
                  <div><strong>วันเกิด:</strong> {activePatient.dob ? new Date(activePatient.dob).toLocaleDateString('th-TH') : '-'}</div>
                  <div><strong>อายุ:</strong> {calculateAge(activePatient.dob)}</div>
                  <div><strong>เพศ:</strong> {activePatient.gender}</div>
                  <div><strong>ผู้ปกครอง:</strong> {activePatient.guardian} | โทร: {activePatient.phone}</div>
                  <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', backgroundColor: activePatient.allergies === 'มี' ? 'var(--danger-light)' : 'var(--success-light)', border: '1px solid ' + (activePatient.allergies === 'มี' ? 'var(--danger)' : 'var(--success)') }}>
                    <strong>ประวัติการแพ้ยา/แพ้อาหาร:</strong>{' '}
                    <span style={{ color: activePatient.allergies === 'มี' ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                      {activePatient.allergies === 'มี' ? activePatient.allergiesDetails : 'ไม่มีประวัติแพ้ยา'}
                    </span>
                  </div>
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                    <strong>อาการหรือพฤติกรรมกังวล:</strong>
                    <p style={{ fontSize: '0.85rem', color: 'var(--dark-light)', marginTop: '0.25rem', lineHeight: '1.4' }}>{activePatient.worries || '-'}</p>
                  </div>
                </div>
              </div>

              {/* ฟอร์มกรอกบันทึกใหม่ */}
              <div className="card-2xl">
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--secondary)' }}>บันทึกผลการฝึกใหม่</h2>
                
                <form onSubmit={handleAddRecord} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                    <div className="form-group">
                      <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>วันที่ฝึก:</label>
                      <input 
                        type="date" 
                        className="form-control" 
                        value={formDate} 
                        onChange={(e) => setFormDate(e.target.value)} 
                        required 
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>ครูผู้ให้บริการฝึก:</label>
                      <select 
                        className="form-control" 
                        value={formTherapist} 
                        onChange={(e) => setFormTherapist(e.target.value)}
                        required
                      >
                        {therapists.map(t => (
                          <option key={t.id} value={t.nickname}>{t.fullname} ({t.nickname})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>รายละเอียดผลการฝึก / พฤติกรรม / คำแนะนำผู้ปกครอง:</label>
                    <textarea 
                      className="form-control" 
                      value={formDetails} 
                      onChange={(e) => setFormDetails(e.target.value)} 
                      placeholder="กรอกผลการบำบัด พฤติกรรม ทักษะที่ได้ หรือการทรงตัว..."
                      rows={3}
                      required
                    ></textarea>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'center' }}>
                    <div className="form-group">
                      <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <FileText size={14} /> แนบไฟล์รูป/หลักฐาน (ถ้ามี):
                      </label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input 
                          type="text" 
                          className="form-control" 
                          value={formFileUrl} 
                          onChange={(e) => setFormFileUrl(e.target.value)} 
                          placeholder="ลิงก์ หรือเลือกไฟล์..."
                          style={{ fontSize: '0.85rem' }}
                        />
                        <label className="btn btn-light" style={{ cursor: 'pointer', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 0 }}>
                          <Upload size={14} />
                          <input type="file" style={{ display: 'none' }} onChange={handleMockUpload} />
                        </label>
                      </div>
                    </div>
                    <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '100%', paddingTop: '1.2rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', userSelect: 'none', margin: 0 }}>
                        <input 
                          type="checkbox" 
                          checked={formIsVisible} 
                          onChange={(e) => setFormIsVisible(e.target.checked)} 
                          style={{ width: '16px', height: '16px', accentColor: 'var(--secondary)' }}
                        />
                        อนุญาตให้ผู้ปกครองเห็นประวัติ
                      </label>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                    <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 2rem' }}>
                      <Plus size={16} /> บันทึกผลการฝึก
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* ตารางบันทึกประวัติการบำบัด */}
            <div className="card-3xl">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>ประวัติบันทึกผลการฝึกทั้งหมด ({filteredRecords.length} รายการ)</h2>
                
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button 
                    className="btn btn-light" 
                    onClick={() => onPrintOPD('opd_form', { patient: activePatient, history: [] })}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    <Printer size={14} /> พิมพ์การ์ดเฉพาะหัวคนไข
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => onPrintOPD('opd_filled', { patient: activePatient, history: filteredRecords })}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    <Printer size={14} /> พิมพ์ประวัติทั้งหมด
                  </button>
                </div>
              </div>

              {/* ช่องค้นหาภายในประวัติ */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', maxWidth: '400px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--dark-light)' }} />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="ค้นหาข้อความบันทึก/ผู้ฝึก..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    style={{ paddingLeft: '32px' }}
                  />
                </div>
                {searchQuery && (
                  <button className="btn btn-light" onClick={() => setSearchQuery('')}>ล้าง</button>
                )}
              </div>

              {/* ตาราง */}
              <div className="table-container">
                <table className="hdh-table">
                  <thead>
                    <tr>
                      <th style={{ width: '12%' }}>วัน/เดือน/ปี</th>
                      <th style={{ width: '51%' }}>รายละเอียดผลการฝึก / พฤติกรรมระหว่างบำบัด</th>
                      <th style={{ width: '12%' }}>ครูผู้ให้บริการ</th>
                      <th style={{ width: '10%' }}>ไฟล์แนบ</th>
                      <th style={{ width: '5%', textAlign: 'center' }}>ผู้ปกครองเห็น</th>
                      <th style={{ width: '10%', textAlign: 'center' }}>จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRecords.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--dark-light)' }}>
                          ไม่มีประวัติบันทึกการฝึกของผู้ป่วยรายนี้
                        </td>
                      </tr>
                    ) : (
                      paginatedRecords.map((row) => (
                        <tr key={row.id}>
                          {editingId === row.id ? (
                            // โหมดแก้ไข Inline
                            <>
                              <td>
                                <input 
                                  type="date" 
                                  className="form-control" 
                                  value={editDate} 
                                  onChange={(e) => setEditDate(e.target.value)} 
                                  style={{ padding: '0.2rem 0.4rem', fontSize: '0.85rem' }}
                                />
                              </td>
                              <td>
                                <textarea 
                                  className="form-control" 
                                  value={editDetails} 
                                  onChange={(e) => setEditDetails(e.target.value)} 
                                  rows={3}
                                  style={{ fontSize: '0.85rem' }}
                                ></textarea>
                              </td>
                              <td>
                                <select 
                                  className="form-control" 
                                  value={editTherapist} 
                                  onChange={(e) => setEditTherapist(e.target.value)}
                                  style={{ padding: '0.2rem', fontSize: '0.85rem' }}
                                >
                                  {therapists.map(t => (
                                    <option key={t.id} value={t.nickname}>{t.nickname}</option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                                  <input 
                                    type="text" 
                                    className="form-control" 
                                    value={editFileUrl} 
                                    onChange={(e) => setEditFileUrl(e.target.value)} 
                                    placeholder="ลิงก์..."
                                    style={{ padding: '0.2rem', fontSize: '0.85rem', width: '70px' }}
                                  />
                                  <label className="btn btn-light btn-icon-only" style={{ cursor: 'pointer', padding: '0.2rem', margin: 0 }}>
                                    <Upload size={12} />
                                    <input type="file" style={{ display: 'none' }} onChange={handleEditMockUpload} />
                                  </label>
                                </div>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <input 
                                  type="checkbox" 
                                  checked={editIsVisible} 
                                  onChange={(e) => setEditIsVisible(e.target.checked)} 
                                />
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                                  <button 
                                    className="btn btn-secondary btn-icon-only" 
                                    onClick={() => handleSaveEdit(row.id)}
                                    title="บันทึก"
                                    style={{ padding: '0.3rem' }}
                                  >
                                    <Check size={14} color="green" />
                                  </button>
                                  <button 
                                    className="btn btn-light btn-icon-only" 
                                    onClick={cancelEditing}
                                    title="ยกเลิก"
                                    style={{ padding: '0.3rem' }}
                                  >
                                    <X size={14} color="red" />
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            // โหมดเรนเดอร์ปกติ
                            <>
                              <td style={{ fontWeight: 500 }}>{row.date ? new Date(row.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}</td>
                              <td style={{ whiteSpace: 'pre-wrap', lineHeight: '1.45', textAlign: 'left' }}>{row.details}</td>
                              <td><strong>{formatTherapistName(row.therapist)}</strong></td>
                              <td>
                                {row.fileUrl ? (
                                  <a 
                                    href={row.fileUrl.startsWith('http') ? row.fileUrl : '#'} 
                                    target={row.fileUrl.startsWith('http') ? '_blank' : '_self'} 
                                    rel="noreferrer" 
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color: 'var(--secondary)', fontWeight: 500, fontSize: '0.8rem', wordBreak: 'break-all' }}
                                    onClick={(e) => {
                                      if (!row.fileUrl.startsWith('http')) {
                                        e.preventDefault();
                                        Swal.fire({
                                          title: 'ไฟล์แนบจำลอง',
                                          text: `ไฟล์อ้างอิง: ${row.fileUrl}`,
                                          icon: 'info',
                                          confirmButtonColor: 'var(--secondary)'
                                        });
                                      }
                                    }}
                                  >
                                    <FileText size={14} />
                                    {row.fileUrl.length > 15 ? row.fileUrl.substring(0, 12) + '...' : row.fileUrl}
                                  </a>
                                ) : (
                                  <span style={{ color: 'var(--dark-light)', fontSize: '0.85rem' }}>ไม่มี</span>
                                )}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                {row.isVisible ? (
                                  <Eye size={16} color="var(--success)" title="แสดงต่อผู้ปกครอง" />
                                ) : (
                                  <EyeOff size={16} color="var(--dark-light)" title="ซ่อนจากผู้ปกครอง" />
                                )}
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                                  <button 
                                    className="btn btn-light btn-icon-only" 
                                    onClick={() => startEditing(row)}
                                    title="แก้ไขข้อมูลแถวนี้"
                                  >
                                    <Edit2 size={14} color="var(--dark)" />
                                  </button>
                                  {isAdmin && (
                                    <button 
                                      className="btn btn-light btn-icon-only" 
                                      onClick={() => handleDeleteRecord(row.id)}
                                      title="ลบบันทึกแถวนี้"
                                    >
                                      <Trash2 size={14} color="var(--danger)" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* ปุ่มสลับหน้า (Pagination Controls) */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--dark-light)' }}>
                    แสดง {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredRecords.length)} จากทั้งหมด {filteredRecords.length}
                  </span>
                  
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button 
                      className="btn btn-light btn-icon-only"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => prev - 1)}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button 
                        key={page} 
                        className={`btn ${currentPage === page ? 'btn-secondary' : 'btn-light'}`}
                        style={{ padding: '0.4rem 0.8rem', fontWeight: 600 }}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    ))}
                    
                    <button 
                      className="btn btn-light btn-icon-only"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => prev + 1)}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
