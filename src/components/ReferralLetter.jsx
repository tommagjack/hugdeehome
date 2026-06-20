import React, { useState, useMemo, useEffect } from 'react';
import { formatPatientNickname, parseDateToAD } from '../utils/format';
import { 
  Search, 
  Plus, 
  Printer, 
  Edit2, 
  Trash2, 
  Eye, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Ban, 
  Save, 
  FileText
} from 'lucide-react';
import Swal from 'sweetalert2';

export default function ReferralLetter({
  patients,
  therapists,
  referrals,
  setReferrals,
  onPrintReferral,
  currentUser
}) {
  const isAdmin = currentUser?.role === 'Admin';
  
  // List states
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Modals & form configurations
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [showViewerModal, setShowViewerModal] = useState(false);

  // Patient select in creator
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    // Current local date in YYYY-MM-DD
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  
  // Therapist select
  const [selectedTherapistId, setSelectedTherapistId] = useState('');

  // Editor states
  const [currentLetter, setCurrentLetter] = useState(null);
  const [editTo, setEditTo] = useState('');
  const [editHospital, setEditHospital] = useState('');
  const [editIntro, setEditIntro] = useState('บ้านฮักดี คลินิกประกอบโรคศิลปะ สาขากิจกรรมบำบัด ขอส่งตัวผู้รับบริการรายนี้เพื่อเข้ารับการประเมิน วินิจฉัย หรือรับการรักษาต่อ โดยมีรายละเอียดดังต่อไปนี้');
  const [editInterview, setEditInterview] = useState('');
  const [editObservation, setEditObservation] = useState('');
  const [editOpinion, setEditOpinion] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editConclusion, setEditConclusion] = useState('หนังสือส่งตัวฉบับนี้จัดทำขึ้นเพื่อประกอบการส่งต่อผู้รับบริการและใช้ร่วมกับรายงานผลการประเมินที่แนบมาพร้อมกัน หากต้องการข้อมูลเพิ่มเติม นักกิจกรรมบำบัดของคลินิกฯ ยินดีให้ข้อมูลเพิ่มเติมเพื่อประกอบการดูแลรักษาอย่างต่อเนื่อง');

  // Match current user to therapist profile if OT
  const myTherapist = useMemo(() => {
    if (!currentUser) return null;
    return therapists.find(t => 
      t.id === currentUser.employeeId || 
      t.fullname === currentUser.fullname || 
      (t.nickname && currentUser.nickname && t.nickname === currentUser.nickname)
    );
  }, [therapists, currentUser]);

  // Set default therapist on load/creation modal open
  useEffect(() => {
    if (showCreateModal) {
      if (currentUser?.role === 'OT' && myTherapist) {
        setSelectedTherapistId(myTherapist.id);
      } else {
        setSelectedTherapistId('');
      }
    }
  }, [showCreateModal, currentUser, myTherapist]);

  // Handle patient search dropdown filter
  const filteredPatients = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    if (!q) return [];
    return patients.filter(p => 
      String(p.hn).toLowerCase().includes(q) || 
      String(p.nickname || '').toLowerCase().includes(q) || 
      `${p.title || ''}${p.firstname || ''} ${p.lastname || ''}`.toLowerCase().includes(q)
    );
  }, [patients, patientSearch]);

  const handleSelectPatient = (p) => {
    setSelectedPatient(p);
    const cleanTitle = (p.title || '').replace(/\$/g, '');
    const cleanFirstname = (p.firstname || '').replace(/\$/g, '');
    const cleanLastname = (p.lastname || '').replace(/\$/g, '');
    const nick = p.nickname ? `น้อง${p.nickname.replace(/\$/g, '')}` : '';
    setPatientSearch(`HN: ${p.hn} | ${nick} (${cleanTitle}${cleanFirstname} ${cleanLastname})`);
    setShowPatientDropdown(false);
  };

  // Helper: Calculate age at document date
  const calculateAgeAtDate = (dob, docDate) => {
    if (!dob) return '-';
    const birthDate = parseDateToAD(dob);
    if (!birthDate) return '-';
    const evalDate = docDate ? new Date(docDate) : new Date();
    let years = evalDate.getFullYear() - birthDate.getFullYear();
    let months = evalDate.getMonth() - birthDate.getMonth();
    if (months < 0 || (months === 0 && evalDate.getDate() < birthDate.getDate())) {
      years--;
      months += 12;
    }
    if (evalDate.getDate() < birthDate.getDate()) {
      months--;
    }
    if (months < 0) months = 11;
    return years >= 0 ? years : 0;
  };

  // Helper: Format Thai Date
  const formatDateTh = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const yearBE = d.getFullYear() + 543;
    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    return `${d.getDate()} ${thaiMonths[d.getMonth()]} ${yearBE}`;
  };

  // Generate running code for referral: HD-REF-YYMMXXHN
  const generateReferralCode = (dateStr, hn) => {
    const d = new Date(dateStr);
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const prefix = `HD-REF-${yy}${mm}`;
    
    // Check existing referrals in the same month/year
    const matches = referrals.filter(r => r.id.startsWith(prefix));
    let runningNo = 1;
    if (matches.length > 0) {
      const runningNumbers = matches.map(r => {
        // ID format: HD-REF-YYMMXXHN -> Extract indices 11 and 12
        const xxStr = r.id.slice(11, 13);
        const parsed = parseInt(xxStr, 10);
        return isNaN(parsed) ? 0 : parsed;
      });
      runningNo = Math.max(...runningNumbers, 0) + 1;
    }
    const xx = String(runningNo).padStart(2, '0');
    return `HD-REF-${yy}${mm}${xx}${hn}`;
  };

  // Reset pagination on search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Filter and sort referrals: newest to oldest date
  const filteredReferrals = useMemo(() => {
    let list = [...referrals];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r => {
        const p = patients.find(pat => pat.hn === r.hn) || {};
        const pFullName = `${p.title || ''}${p.firstname || ''} ${p.lastname || ''}`.toLowerCase();
        const pNickname = (p.nickname || '').toLowerCase();
        return (
          String(r.hn).toLowerCase().includes(q) ||
          pFullName.includes(q) ||
          pNickname.includes(q) ||
          String(r.id).toLowerCase().includes(q)
        );
      });
    }
    // Sort from newest date to oldest
    return list.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  }, [referrals, searchQuery, patients]);

  // Paginated list
  const paginatedReferrals = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredReferrals.slice(start, start + itemsPerPage);
  }, [filteredReferrals, currentPage]);

  const totalPages = Math.ceil(filteredReferrals.length / itemsPerPage) || 1;

  // Handle confirm setup -> Open editor modal
  const handleConfirmSetup = (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      Swal.fire('ข้อผิดพลาด', 'กรุณาเลือกผู้รับบริการ', 'error');
      return;
    }
    if (!selectedTherapistId) {
      Swal.fire('ข้อผิดพลาด', 'กรุณาเลือกนักกิจกรรมบำบัดผู้ประเมิน', 'error');
      return;
    }

    const newCode = generateReferralCode(selectedDate, selectedPatient.hn);

    // Initializing draft object
    const draft = {
      id: newCode,
      hn: selectedPatient.hn,
      date: selectedDate,
      therapistId: selectedTherapistId,
      to: '',
      hospital: '',
      intro: 'บ้านฮักดี คลินิกประกอบโรคศิลปะ สาขากิจกรรมบำบัด ขอส่งตัวผู้รับบริการรายนี้เพื่อเข้ารับการประเมิน วินิจฉัย หรือรับการรักษาต่อ โดยมีรายละเอียดดังต่อไปนี้',
      interview: '',
      observation: '',
      opinion: '',
      reason: '',
      conclusion: 'หนังสือส่งตัวฉบับนี้จัดทำขึ้นเพื่อประกอบการส่งต่อผู้รับบริการและใช้ร่วมกับรายงานผลการประเมินที่แนบมาพร้อมกัน หากต้องการข้อมูลเพิ่มเติม นักกิจกรรมบำบัดของคลินิกฯ ยินดีให้ข้อมูลเพิ่มเติมเพื่อประกอบการดูแลรักษาอย่างต่อเนื่อง',
      status: 'ใช้งาน', // default status
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setCurrentLetter(draft);
    setEditTo('');
    setEditHospital('');
    setEditIntro(draft.intro);
    setEditInterview('');
    setEditObservation('');
    setEditOpinion('');
    setEditReason('');
    setEditConclusion(draft.conclusion);

    setShowCreateModal(false);
    // Clear select inputs
    setPatientSearch('');
    setSelectedPatient(null);
    setShowEditorModal(true);
  };

  // Handle save referral letter
  const handleSaveLetter = () => {
    if (!currentLetter) return;

    const updated = {
      ...currentLetter,
      to: editTo.trim(),
      hospital: editHospital.trim(),
      intro: editIntro.trim(),
      interview: editInterview.trim(),
      observation: editObservation.trim(),
      opinion: editOpinion.trim(),
      reason: editReason.trim(),
      conclusion: editConclusion.trim(),
      updated_at: new Date().toISOString()
    };

    const exists = referrals.some(r => r.id === updated.id);
    if (exists) {
      setReferrals(referrals.map(r => r.id === updated.id ? updated : r));
    } else {
      setReferrals([updated, ...referrals]);
    }

    Swal.fire({
      icon: 'success',
      title: 'บันทึกสำเร็จ',
      text: `บันทึกหนังสือส่งตัว ${updated.id} สำเร็จแล้ว`,
      timer: 1500,
      showConfirmButton: false
    });

    setCurrentLetter(updated);
    setShowEditorModal(false);
  };

  // Open editor for existing referral
  const handleEditClick = (letter) => {
    setCurrentLetter(letter);
    setEditTo(letter.to || '');
    setEditHospital(letter.hospital || '');
    setEditIntro(letter.intro || '');
    setEditInterview(letter.interview || '');
    setEditObservation(letter.observation || '');
    setEditOpinion(letter.opinion || '');
    setEditReason(letter.reason || '');
    setEditConclusion(letter.conclusion || '');
    setShowEditorModal(true);
  };

  // View existing referral
  const handleViewClick = (letter) => {
    setCurrentLetter(letter);
    setShowViewerModal(true);
  };

  // Cancel referral letter (Soft cancel status)
  const handleCancelClick = (letter) => {
    Swal.fire({
      title: 'ระบุเหตุผลในการยกเลิก',
      text: `กรุณากรอกเหตุผลในการยกเลิกเอกสารส่งตัวเลขที่ ${letter.id}`,
      input: 'text',
      inputPlaceholder: 'เหตุผลในการยกเลิก...',
      showCancelButton: true,
      confirmButtonColor: 'var(--danger)',
      cancelButtonColor: 'var(--dark-light)',
      confirmButtonText: 'ยืนยันยกเลิกเอกสาร',
      cancelButtonText: 'ปิด',
      inputValidator: (value) => {
        if (!value || !value.trim()) {
          return 'กรุณาระบุเหตุผลในการยกเลิก!';
        }
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const reason = result.value.trim();
        const updated = {
          ...letter,
          status: 'ยกเลิก',
          voidReason: reason,
          updated_at: new Date().toISOString()
        };
        setReferrals(referrals.map(r => r.id === letter.id ? updated : r));
        Swal.fire('ยกเลิกเอกสารแล้ว', `ยกเลิกเอกสารเลขที่ ${letter.id} เรียบร้อย`, 'success');
      }
    });
  };

  // Delete referral letter (Remove from state, log details)
  const handleDeleteClick = (letter) => {
    Swal.fire({
      title: 'ยืนยันการลบเอกสาร',
      text: `ต้องการลบหนังสือส่งตัวเลขที่ ${letter.id} หรือไม่? (การลบแล้วจะไม่สามารถเรียกคืนได้)`,
      input: 'text',
      inputPlaceholder: 'ระบุเหตุผลในการลบ...',
      showCancelButton: true,
      confirmButtonColor: 'var(--danger)',
      cancelButtonColor: 'var(--dark-light)',
      confirmButtonText: 'ยืนยันการลบ',
      cancelButtonText: 'ยกเลิก',
      icon: 'warning',
      inputValidator: (value) => {
        if (!value || !value.trim()) {
          return 'กรุณาระบุเหตุผลในการลบ!';
        }
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const reason = result.value.trim();
        
        // Log deletion
        const deletedLog = {
          id: letter.id,
          hn: letter.hn,
          date: letter.date,
          reason: reason,
          deletedBy: currentUser?.fullname || 'ผู้ดูแลระบบ',
          deletedAt: new Date().toISOString(),
          referralData: letter
        };

        try {
          const logs = JSON.parse(localStorage.getItem('hdh_deleted_referrals') || '[]');
          logs.push(deletedLog);
          localStorage.setItem('hdh_deleted_referrals', JSON.stringify(logs));
        } catch (e) {
          console.error('Error logging referral deletion:', e);
        }

        setReferrals(referrals.filter(r => r.id !== letter.id));
        Swal.fire('ลบเอกสารแล้ว', `ลบเอกสารเลขที่ ${letter.id} เรียบร้อยแล้ว`, 'success');
      }
    });
  };

  // Find patient full profile info
  const getPatientInfo = (hn) => {
    const p = patients.find(item => item.hn === hn);
    if (!p) return { fullname: `HN ${hn}`, nickname: '' };
    const cleanTitle = (p.title || '').replace(/\$/g, '');
    const cleanFirstname = (p.firstname || '').replace(/\$/g, '');
    const cleanLastname = (p.lastname || '').replace(/\$/g, '');
    return {
      fullname: `${cleanTitle}${cleanFirstname} ${cleanLastname}`,
      nickname: (p.nickname || '').replace(/\$/g, ''),
      gender: p.gender || '-',
      dob: p.dob || '',
      guardian: (p.guardian || '').replace(/\$/g, '') || '-',
      phone: p.phone || '-',
      allergies: p.allergies === 'มี' ? (p.allergiesDetails || 'มีประวัติการแพ้') : 'ปฏิเสธประวัติการแพ้ยาและอาหาร',
      conditions: p.conditions === 'มี' ? (p.conditionsDetails || 'มีโรคประจำตัว') : 'ไม่มีโรคประจำตัว'
    };
  };

  // Find therapist license/name details
  const getTherapistInfo = (id) => {
    const t = therapists.find(item => item.id === id);
    return t ? {
      fullname: t.fullname,
      nickname: t.nickname,
      licenseNo: t.licenseNo || 'ก.บ. ______'
    } : {
      fullname: id,
      nickname: '',
      licenseNo: 'ก.บ. ______'
    };
  };

  // Patient object for currently edited letter
  const editorPatient = useMemo(() => {
    if (!currentLetter) return null;
    return getPatientInfo(currentLetter.hn);
  }, [currentLetter, patients]);

  // Therapist object for currently edited letter
  const editorTherapist = useMemo(() => {
    if (!currentLetter) return null;
    return getTherapistInfo(currentLetter.therapistId);
  }, [currentLetter, therapists]);

  return (
    <div className="card shadow-sm animate-fade-in" style={{ padding: '1.5rem', backgroundColor: 'var(--white)' }}>
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="icon-wrapper" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', padding: '0.5rem', borderRadius: '8px' }}>
            <FileText size={24} />
          </div>
          <div>
            <h2 className="card-title" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--dark)' }}>ระบบหนังสือส่งตัวผู้รับบริการ</h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--dark-light)' }}>สิทธิ์เข้าใช้งาน: {currentUser?.fullname} ({currentUser?.role})</p>
          </div>
        </div>
        
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} /> สร้างเอกสารส่งตัว
        </button>
      </div>

      {/* Filter and Search */}
      <div className="search-bar" style={{ marginBottom: '1rem', position: 'relative', maxWidth: '400px' }}>
        <Search size={18} className="search-icon" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--dark-light)' }} />
        <input 
          type="text" 
          className="form-control" 
          style={{ paddingLeft: '40px', borderRadius: '8px', fontSize: '0.88rem' }}
          placeholder="ค้นหาจากเลข HN, ชื่อ หรือชื่อเล่นคนไข้..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Referral Table List */}
      <div className="table-responsive" style={{ border: '1px solid #eaeaea', borderRadius: '8px', overflow: 'hidden' }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
          <thead style={{ backgroundColor: '#fcf8f2', borderBottom: '1px solid #eaeaea' }}>
            <tr>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#8d6e63' }}>เลขที่เอกสาร</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#8d6e63' }}>วันที่ส่งตัว</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#8d6e63' }}>ผู้รับบริการ (HN)</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#8d6e63' }}>นักกิจกรรมบำบัด</th>
              <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600, color: '#8d6e63' }}>สถานะ</th>
              <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600, color: '#8d6e63', width: '280px' }}>การจัดการ</th>
            </tr>
          </thead>
          <tbody>
            {paginatedReferrals.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--dark-light)' }}>
                  ไม่มีประวัติหนังสือส่งตัวในระบบ
                </td>
              </tr>
            ) : (
              paginatedReferrals.map((r) => {
                const p = getPatientInfo(r.hn);
                const t = getTherapistInfo(r.therapistId);
                const isCancelled = r.status === 'ยกเลิก';
                
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f5f5f5', backgroundColor: isCancelled ? '#fff0f0' : 'transparent' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 700, fontFamily: 'monospace' }}>{r.id}</td>
                    <td style={{ padding: '0.75rem' }}>{formatDateTh(r.date)}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{ fontWeight: 600 }}>HN: {r.hn}</span> | {p.fullname} (น้อง{p.nickname})
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {t.fullname} {t.nickname ? `(${t.nickname})` : ''}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      {isCancelled ? (
                        <span className="badge badge-danger" title={r.voidReason} style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                          ยกเลิกแล้ว
                        </span>
                      ) : (
                        <span className="badge badge-success" style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                          ใช้งาน
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem', display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                      <button 
                        className="btn btn-light" 
                        onClick={() => handleViewClick(r)}
                        title="ดูข้อมูลรายละเอียด"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                      >
                        <Eye size={14} /> ดู
                      </button>

                      <button 
                        className="btn btn-secondary" 
                        onClick={() => onPrintReferral(r)}
                        title="พิมพ์เอกสาร A4 PDF"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                      >
                        <Printer size={14} /> พิมพ์
                      </button>

                      <button 
                        className="btn btn-light" 
                        onClick={() => handleEditClick(r)}
                        disabled={isCancelled}
                        title="แก้ไขข้อมูลเอกสาร"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                      >
                        <Edit2 size={14} /> แก้ไข
                      </button>

                      <button 
                        className="btn btn-light" 
                        onClick={() => handleCancelClick(r)}
                        disabled={isCancelled}
                        title="ยกเลิกการใช้งานเอกสาร"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem', color: isCancelled ? '#bbb' : 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                      >
                        <Ban size={14} /> ยกเลิก
                      </button>

                      <button 
                        className="btn btn-light text-danger" 
                        onClick={() => handleDeleteClick(r)}
                        title="ลบเอกสารออกจากระบบ"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                      >
                        <Trash2 size={14} /> ลบ
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination component */}
      {totalPages > 1 && (
        <div className="pagination" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1.25rem' }}>
          <button 
            className="btn btn-light" 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            style={{ padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
          >
            <ChevronLeft size={16} /> ก่อนหน้า
          </button>
          <span style={{ fontSize: '0.88rem', color: 'var(--dark-light)' }}>หน้า {currentPage} / {totalPages}</span>
          <button 
            className="btn btn-light" 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            style={{ padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
          >
            ถัดไป <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* -------------------- 1. MODAL SETUP / CREATE -------------------- */}
      {showCreateModal && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content shadow animate-scale-in" style={{ width: '100%', maxWidth: '520px', padding: '1.5rem', borderRadius: '12px', backgroundColor: 'var(--white)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #eee', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--dark)' }}>จัดเตรียมข้อมูลใบส่งตัวผู้รับบริการ</h3>
              <button className="btn-close" onClick={() => { setShowCreateModal(false); setPatientSearch(''); setSelectedPatient(null); }} style={{ background: 'transparent', border: 0 }}>
                <X size={20} style={{ color: 'var(--dark-light)' }} />
              </button>
            </div>

            <form onSubmit={handleConfirmSetup}>
              {/* Search Patient input */}
              <div style={{ marginBottom: '1rem', position: 'relative' }}>
                <label className="form-label" style={{ fontWeight: 600, marginBottom: '0.4rem', display: 'block' }}>ผู้รับบริการ <span style={{ color: 'var(--danger)' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--dark-light)' }} />
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="-- ค้นหาด้วย HN, ชื่อเล่น หรือชื่อจริง --" 
                    style={{ paddingLeft: '38px', borderRadius: '8px' }}
                    value={patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value);
                      setShowPatientDropdown(true);
                      if (selectedPatient) {
                        setSelectedPatient(null);
                      }
                    }}
                    onFocus={() => setShowPatientDropdown(true)}
                  />
                </div>

                {/* Dropdown patients result */}
                {showPatientDropdown && patientSearch.trim().length > 0 && (
                  <ul className="search-dropdown-list" style={{ 
                    position: 'absolute', 
                    top: '100%', 
                    left: 0, 
                    right: 0, 
                    maxHeight: '180px', 
                    overflowY: 'auto', 
                    backgroundColor: 'var(--white)', 
                    border: '1px solid #eaeaea', 
                    borderRadius: '8px', 
                    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                    zIndex: 99, 
                    listStyle: 'none', 
                    padding: 0, 
                    marginTop: '4px' 
                  }}>
                    {filteredPatients.length === 0 ? (
                      <li style={{ padding: '0.5rem 1rem', color: 'var(--dark-light)', fontSize: '0.82rem' }}>ไม่พบรายชื่อผู้รับบริการ</li>
                    ) : (
                      filteredPatients.map(p => {
                        const cleanTitle = (p.title || '').replace(/\$/g, '');
                        const cleanFirstname = (p.firstname || '').replace(/\$/g, '');
                        const cleanLastname = (p.lastname || '').replace(/\$/g, '');
                        const nick = p.nickname ? `น้อง${p.nickname.replace(/\$/g, '')}` : '';
                        return (
                          <li 
                            key={p.hn} 
                            onClick={() => handleSelectPatient(p)}
                            style={{ 
                              padding: '0.5rem 1rem', 
                              cursor: 'pointer', 
                              borderBottom: '1px solid #f5f5f5', 
                              fontSize: '0.82rem',
                              transition: 'background-color 0.15s'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#fcf8f2'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                          >
                            <strong>HN: {p.hn}</strong> | {nick} ({cleanTitle}{cleanFirstname} {cleanLastname})
                          </li>
                        );
                      })
                    )}
                  </ul>
                )}
              </div>

              {/* Date selection */}
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontWeight: 600, marginBottom: '0.4rem', display: 'block' }}>วันที่จัดทำเอกสาร <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input 
                  type="date" 
                  className="form-control" 
                  style={{ borderRadius: '8px' }}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  required
                />
              </div>

              {/* Therapist selection */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontWeight: 600, marginBottom: '0.4rem', display: 'block' }}>นักกิจกรรมบำบัดผู้ประเมิน <span style={{ color: 'var(--danger)' }}>*</span></label>
                <select
                  value={selectedTherapistId}
                  onChange={(e) => setSelectedTherapistId(e.target.value)}
                  disabled={currentUser?.role === 'OT'}
                  className="form-control"
                  style={{ borderRadius: '8px' }}
                  required
                >
                  {currentUser?.role === 'OT' ? (
                    <option value={myTherapist?.id || ''}>
                      {myTherapist ? `${myTherapist.fullname} (${myTherapist.nickname})` : currentUser?.fullname}
                    </option>
                  ) : (
                    <>
                      <option value="">-- เลือกนักกิจกรรมบำบัดผู้ประเมิน --</option>
                      {therapists.filter(t => t.status !== 'Inactive').map(t => (
                        <option key={t.id} value={t.id}>
                          {t.fullname} ({t.nickname})
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                <button type="button" className="btn btn-light" onClick={() => { setShowCreateModal(false); setPatientSearch(''); setSelectedPatient(null); }}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>ยืนยันสร้างใบส่งตัว</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- 2. MODAL REFERRAL EDITOR -------------------- */}
      {showEditorModal && currentLetter && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '1rem' }}>
          <div className="modal-content shadow animate-scale-in" style={{ width: '100%', maxWidth: '900px', borderRadius: '12px', backgroundColor: 'var(--white)', margin: '20px auto', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #eee', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--dark)' }}>แก้ไขหนังสือส่งตัวผู้รับบริการ</h3>
              <button className="btn-close" onClick={() => setShowEditorModal(false)} style={{ background: 'transparent', border: 0 }}>
                <X size={20} style={{ color: 'var(--dark-light)' }} />
              </button>
            </div>

            {/* Document Header Preview */}
            <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem', backgroundColor: '#fafafa' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', borderBottom: '2px solid #5d4037', paddingBottom: '15px' }}>
                {/* Header Left */}
                <div style={{ display: 'flex', gap: '15px' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '2px solid #5d4037' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>LOGO</span>
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#5d4037' }}>บ้านฮักดี</h4>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', fontWeight: 600, color: '#6d4c41' }}>คลินิกการประกอบโรคศิลปะสาขากิจกรรมบำบัด</p>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#555' }}>ที่อยู่: 104/7 หมู่ 17 ตำบลบ้านต๋อม อำเภอเมือง จังหวัดพะเยา 56000</p>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#555' }}>โทร: 094-6753557 | อีเมล: hugdeehome@gmail.com</p>
                  </div>
                </div>

                {/* Header Right */}
                <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>หนังสือส่งตัวผู้รับบริการ</h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', fontWeight: 600, color: 'var(--dark-light)', letterSpacing: '0.05em' }}>REFERRAL LETTER</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem' }}><strong>เลขที่เอกสาร :</strong> <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{currentLetter.id}</span></p>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem' }}><strong>วันที่จัดทำ :</strong> {formatDateTh(currentLetter.date)}</p>
                </div>
              </div>

              {/* Form Input fields */}
              <div style={{ marginTop: '1.25rem' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>เรียน (To) <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="ชื่อผู้รับจดหมาย เช่น แพทย์ผู้ประเมินพัฒนาการ / โรงพยาบาลพะเยา"
                    value={editTo}
                    onChange={(e) => setEditTo(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Pre-filled editable Intro text */}
              <div style={{ marginTop: '1rem' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>ข้อความนำส่งตัว</label>
                <textarea 
                  className="form-control" 
                  rows={2}
                  style={{ textIndent: '2.5em', fontSize: '0.85rem' }}
                  value={editIntro}
                  onChange={(e) => setEditIntro(e.target.value)}
                />
              </div>

              {/* Patient Profile Box (Bold bold fields) */}
              <div style={{ marginTop: '1.25rem', padding: '1rem', border: '1px solid #e0e0e0', borderRadius: '6px', backgroundColor: '#fff', fontSize: '0.85rem' }}>
                <h5 style={{ margin: '0 0 10px 0', fontSize: '0.88rem', borderBottom: '1px solid #eee', paddingBottom: '5px', color: '#5d4037' }}>
                  <strong>ข้อมูลประวัติทั่วไป</strong>
                </h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: '10px 20px' }}>
                    <div><strong>HN No:</strong> {currentLetter.hn}</div>
                    <div><strong>ชื่อ-นามสกุล:</strong> {editorPatient?.fullname}</div>
                    <div><strong>ชื่อเล่น:</strong> {editorPatient?.nickname}</div>
                    
                    <div><strong>เพศ:</strong> {editorPatient?.gender}</div>
                    <div><strong>วันเดือนปีเกิด:</strong> {formatDateTh(editorPatient?.dob)}</div>
                    <div><strong>อายุ:</strong> {calculateAgeAtDate(editorPatient?.dob, currentLetter.date)} ปี</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div><strong>ประวัติการแพ้ยา:</strong> {editorPatient?.allergies}</div>
                    <div><strong>โรคประจำตัว:</strong> {editorPatient?.conditions}</div>
                  </div>

                  <div>
                    <strong>ผู้ปกครอง:</strong> {editorPatient?.guardian}
                    {editorPatient?.phone && (
                      <span style={{ marginLeft: '25px' }}><strong>เบอร์โทรศัพท์:</strong> {editorPatient?.phone}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* 4 Observation Textareas */}
              <div style={{ marginTop: '1.25rem' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.88rem', display: 'block', color: 'var(--dark)' }}>
                    ข้อมูลจากการสัมภาษณ์ผู้ปกครอง:
                  </label>
                  <textarea 
                    className="form-control"
                    rows={3}
                    placeholder="กรอกรายละเอียดผลสัมภาษณ์พฤติกรรม อาการ ความกังวลที่บ้าน..."
                    value={editInterview}
                    onChange={(e) => setEditInterview(e.target.value)}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.88rem', display: 'block', color: 'var(--dark)' }}>
                    ข้อมูลจากการสังเกตทางกิจกรรมบำบัด:
                  </label>
                  <textarea 
                    className="form-control"
                    rows={3}
                    placeholder="กรอกข้อมูลจากการประเมินและพฤติกรรมที่สังเกตได้ขณะฝึกซ้อมกิจกรรม..."
                    value={editObservation}
                    onChange={(e) => setEditObservation(e.target.value)}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.88rem', display: 'block', color: 'var(--dark)' }}>
                    ความเห็นทางคลินิกของนักกิจกรรมบำบัด:
                  </label>
                  <textarea 
                    className="form-control"
                    rows={3}
                    placeholder="กรอกความเห็นและการประเมินสภาวะทางกิจกรรมบำบัดและทักษะ..."
                    value={editOpinion}
                    onChange={(e) => setEditOpinion(e.target.value)}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.88rem', display: 'block', color: 'var(--dark)' }}>
                    เหตุผลในการส่งต่อ:
                  </label>
                  <textarea 
                    className="form-control"
                    rows={3}
                    placeholder="ระบุวัตถุประสงค์ของการส่งตัว เช่น เพื่อประเมินทักษะเพิ่มเติม หรือรับวินิจฉัยสภาวะต่อเนื่อง..."
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                  />
                </div>
              </div>

              {/* Pre-filled Outro text */}
              <div style={{ marginTop: '1.25rem' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>ข้อความปิดท้ายหนังสือ</label>
                <textarea 
                  className="form-control" 
                  rows={2}
                  style={{ textIndent: '2.5em', fontSize: '0.85rem' }}
                  value={editConclusion}
                  onChange={(e) => setEditConclusion(e.target.value)}
                />
              </div>

              {/* Closing Signatures Preview */}
              <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.85rem' }}>
                <p style={{ margin: '0 0 40px 0' }}>ขอแสดงความนับถือ</p>
                <p style={{ margin: '0 0 5px 0' }}>............................................................</p>
                <p style={{ margin: '0 0 5px 0' }}>({editorTherapist?.fullname || ''})</p>
                <p style={{ margin: '0 0 5px 0' }}>นักกิจกรรมบำบัด เลขที่ใบประกอบโรคศิลปะ {editorTherapist?.licenseNo || 'ก.บ. ______'}</p>
                <p style={{ margin: 0, color: 'var(--dark-light)', fontSize: '0.8rem' }}>บ้านฮักดี คลินิกประกอบโรคศิลปะ สาขากิจกรรมบำบัด</p>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
              <button className="btn btn-light" onClick={() => setShowEditorModal(false)}>ปิด</button>
              
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  // Save first, then print
                  const updated = {
                    ...currentLetter,
                    to: editTo.trim(),
                    hospital: editHospital.trim(),
                    intro: editIntro.trim(),
                    interview: editInterview.trim(),
                    observation: editObservation.trim(),
                    opinion: editOpinion.trim(),
                    reason: editReason.trim(),
                    conclusion: editConclusion.trim(),
                    updated_at: new Date().toISOString()
                  };
                  setReferrals(referrals.map(r => r.id === updated.id ? updated : r));
                  onPrintReferral(updated);
                }}
                disabled={!editTo.trim()}
                style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <Printer size={16} /> บันทึกและพิมพ์เอกสาร
              </button>

              <button 
                className="btn btn-primary" 
                onClick={handleSaveLetter}
                disabled={!editTo.trim()}
                style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <Save size={16} /> บันทึกข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- 3. MODAL REFERRAL VIEW ONLY -------------------- */}
      {showViewerModal && currentLetter && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '1rem' }}>
          <div className="modal-content shadow animate-scale-in" style={{ width: '100%', maxWidth: '840px', borderRadius: '12px', backgroundColor: 'var(--white)', margin: '20px auto', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #eee', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--dark)' }}>รายละเอียดหนังสือส่งตัวผู้รับบริการ</h3>
              <button className="btn-close" onClick={() => setShowViewerModal(false)} style={{ background: 'transparent', border: 0 }}>
                <X size={20} style={{ color: 'var(--dark-light)' }} />
              </button>
            </div>

            {/* Document Content View */}
            <div style={{ padding: '1.5rem', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '0.92rem', lineHeight: '1.6', backgroundColor: '#fff', color: '#333' }}>
              
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', borderBottom: '2px solid #5d4037', paddingBottom: '15px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '15px' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '2px solid #5d4037' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>LOGO</span>
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#5d4037' }}>บ้านฮักดี</h4>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', fontWeight: 600, color: '#6d4c41' }}>คลินิกการประกอบโรคศิลปะสาขากิจกรรมบำบัด</p>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#555' }}>ที่อยู่: 104/7 หมู่ 17 ตำบลบ้านต๋อม อำเภอเมือง จังหวัดพะเยา 56000</p>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#555' }}>โทร: 094-6753557 | อีเมล: hugdeehome@gmail.com</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#333' }}>หนังสือส่งตัวผู้รับบริการ</h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', fontWeight: 600, color: '#777' }}>REFERRAL LETTER</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem' }}><strong>เลขที่เอกสาร :</strong> <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{currentLetter.id}</span></p>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.88rem' }}><strong>วันที่จัดทำ :</strong> {formatDateTh(currentLetter.date)}</p>
                </div>
              </div>

              {/* To details */}
              <div style={{ marginBottom: '15px' }}>
                <p style={{ margin: 0 }}><strong>เรียน</strong> {currentLetter.to}</p>
              </div>

              {/* Intro Text */}
              <p style={{ textIndent: '2.5em', textAlign: 'justify', margin: '0 0 20px 0' }}>
                {currentLetter.intro}
              </p>

              {/* Patient General Info */}
              <div style={{ padding: '15px', border: '1px solid #e0e0e0', borderRadius: '6px', backgroundColor: '#fafafa', marginBottom: '20px', fontSize: '0.88rem' }}>
                <h5 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#5d4037', borderBottom: '1px solid #ddd', paddingBottom: '4px' }}>
                  <strong>ข้อมูลประวัติทั่วไป</strong>
                </h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: '8px 20px' }}>
                    {currentLetter.hn && <div><strong>HN No:</strong> {currentLetter.hn}</div>}
                    {editorPatient?.fullname && <div><strong>ชื่อ-นามสกุล:</strong> {editorPatient?.fullname}</div>}
                    {editorPatient?.nickname && <div><strong>ชื่อเล่น:</strong> {editorPatient?.nickname ? formatPatientNickname(editorPatient?.nickname) : '-'}</div>}
                    
                    {editorPatient?.gender && editorPatient?.gender !== '-' && <div><strong>เพศ:</strong> {editorPatient?.gender}</div>}
                    {editorPatient?.dob && <div><strong>วันเดือนปีเกิด:</strong> {formatDateTh(editorPatient?.dob)}</div>}
                    {editorPatient?.dob && <div><strong>อายุ:</strong> {calculateAgeAtDate(editorPatient?.dob, currentLetter.date)} ปี</div>}
                  </div>

                  {/* ประวัติการแพ้ยา และ โรคประจำตัว อยู่บรรทัดเดียวกัน */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    {editorPatient?.allergies && editorPatient?.allergies !== '-' && (
                      <div><strong>ประวัติการแพ้ยา:</strong> {editorPatient?.allergies}</div>
                    )}
                    {editorPatient?.conditions && editorPatient?.conditions !== '-' && (
                      <div><strong>โรคประจำตัว:</strong> {editorPatient?.conditions}</div>
                    )}
                  </div>

                  {/* ชื่อผู้ปกครอง และ เบอร์โทรศัพท์ อยู่บรรทัดเดียวกัน ขยับเว้นช่องว่างสวยงาม */}
                  {(editorPatient?.guardian && editorPatient?.guardian !== '-') && (
                    <div>
                      <strong>ผู้ปกครอง:</strong> {editorPatient?.guardian}
                      {editorPatient?.phone && editorPatient?.phone !== '-' && (
                        <span style={{ marginLeft: '25px' }}><strong>เบอร์โทรศัพท์:</strong> {editorPatient?.phone}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 4 Clinical Areas - ซ่อนหัวข้อที่ไม่มีข้อมูล */}
              <div style={{ marginBottom: '20px' }}>
                {currentLetter.interview && currentLetter.interview.trim() && (
                  <div style={{ marginBottom: '15px' }}>
                    <p style={{ margin: '0 0 4px 0', color: '#5d4037' }}><strong>ข้อมูลจากการสัมภาษณ์ผู้ปกครอง:</strong></p>
                    <div style={{ paddingLeft: '1.5em', whiteSpace: 'pre-wrap', textAlign: 'justify' }}>
                      {currentLetter.interview}
                    </div>
                  </div>
                )}

                {currentLetter.observation && currentLetter.observation.trim() && (
                  <div style={{ marginBottom: '15px' }}>
                    <p style={{ margin: '0 0 4px 0', color: '#5d4037' }}><strong>ข้อมูลจากการสังเกตทางกิจกรรมบำบัด:</strong></p>
                    <div style={{ paddingLeft: '1.5em', whiteSpace: 'pre-wrap', textAlign: 'justify' }}>
                      {currentLetter.observation}
                    </div>
                  </div>
                )}

                {currentLetter.opinion && currentLetter.opinion.trim() && (
                  <div style={{ marginBottom: '15px' }}>
                    <p style={{ margin: '0 0 4px 0', color: '#5d4037' }}><strong>ความเห็นทางคลินิกของนักกิจกรรมบำบัด:</strong></p>
                    <div style={{ paddingLeft: '1.5em', whiteSpace: 'pre-wrap', textAlign: 'justify' }}>
                      {currentLetter.opinion}
                    </div>
                  </div>
                )}

                {currentLetter.reason && currentLetter.reason.trim() && (
                  <div style={{ marginBottom: '15px' }}>
                    <p style={{ margin: '0 0 4px 0', color: '#5d4037' }}><strong>เหตุผลในการส่งต่อ:</strong></p>
                    <div style={{ paddingLeft: '1.5em', whiteSpace: 'pre-wrap', textAlign: 'justify' }}>
                      {currentLetter.reason}
                    </div>
                  </div>
                )}
              </div>

              {/* Outro text */}
              <p style={{ textIndent: '2.5em', textAlign: 'justify', margin: '0 0 30px 0' }}>
                {currentLetter.conclusion}
              </p>

              {/* Centered Closing Block */}
              <div style={{ textAlign: 'center', marginTop: '30px' }}>
                <p style={{ margin: '0 0 40px 0' }}>ขอแสดงความนับถือ</p>
                <p style={{ margin: '0 0 5px 0' }}>............................................................</p>
                <p style={{ margin: '0 0 5px 0' }}>({editorTherapist?.fullname || ''})</p>
                <p style={{ margin: '0 0 5px 0' }}>นักกิจกรรมบำบัด เลขที่ใบประกอบโรคศิลปะ {editorTherapist?.licenseNo || 'ก.บ. ______'}</p>
                <p style={{ margin: 0, color: 'var(--dark-light)', fontSize: '0.8rem' }}>บ้านฮักดี คลินิกประกอบโรคศิลปะ สาขากิจกรรมบำบัด</p>
              </div>

            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', borderTop: '1px solid #eee', paddingTop: '1rem', marginTop: '1rem' }}>
              <button className="btn btn-light" onClick={() => setShowViewerModal(false)}>ปิดหน้าต่าง</button>
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setShowViewerModal(false);
                  onPrintReferral(currentLetter);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <Printer size={16} /> พิมพ์จดหมาย
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
