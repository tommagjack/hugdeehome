import React, { useState, useEffect, useMemo } from 'react';
import { formatPatientNickname, parseDateToAD } from '../utils/format';
import { 
  UserPlus, 
  Search, 
  Eye, 
  Edit2, 
  Trash2, 
  Printer, 
  Check,
  AlertCircle,
  Upload,
  Download,
  Plus
} from 'lucide-react';
import Swal from 'sweetalert2';
import { exportToCSV, parseCSV } from '../utils/csvHelper';

const headersMap = {
  hn: ['hn', 'รหัส hn', 'รหัสผู้ป่วย'],
  status: ['status', 'สถานะ'],
  gender: ['gender', 'เพศ'],
  title: ['title', 'คำนำหน้า', 'คำนำหน้าชื่อ'],
  firstname: ['firstname', 'ชื่อ', 'ชื่อผู้รับบริการ'],
  lastname: ['lastname', 'นามสกุล'],
  nickname: ['nickname', 'ชื่อเล่น'],
  dob: ['dob', 'dob_yyyy_mm_dd', 'วันเกิด', 'วันเกิด (yyyy-mm-dd)', 'วันเกิด (ค.ศ. yyyy-mm-dd)', 'วันเกิด (ค.ศ. yyyy_mm_dd)'],
  guardian: ['guardian', 'ผู้ปกครอง', 'ชื่อผู้ปกครอง'],
  phone: ['phone', 'เบอร์โทร', 'เบอร์โทรติดต่อ', 'โทรศัพท์'],
  allergies: ['allergies', 'การแพ้ยา', 'แพ้ยา'],
  allergiesDetails: ['allergiesdetails', 'รายละเอียดการแพ้ยา', 'ประวัติการแพ้ยา'],
  conditions: ['conditions', 'โรคประจำตัว'],
  conditionsDetails: ['conditionsdetails', 'รายละเอียดโรคประจำตัว', 'ประวัติโรคประจำตัว'],
  channels: ['channels', 'ช่องทางรู้จักคลินิก', 'ช่องทางรู้จัก', 'ช่องทางที่รู้จัก'],
  channelsOtherDetails: ['channelsotherdetails', 'รายละเอียดช่องทางอื่นๆ', 'ช่องทางอื่นๆ'],
  worries: ['worries', 'พฤติกรรมหรืออาการที่กังวล', 'อาการหรือพฤติกรรมที่กังวล', 'อาการกังวล'],
  lineUserId: ['line_user_id', 'lineuserid', 'line user id', 'รหัสไลน์']
};

export default function PatientRegister({ 
  patients, 
  setPatients,
  onAddPatient, 
  onUpdatePatient, 
  onDeletePatient,
  onPrintPatient,
  currentUser,
  appointments = [],
  therapists = []
}) {
  const isAdmin = currentUser?.role === 'Admin';
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // All, Active, Pending, Inactive
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);
  
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // สถานะฟอร์ม
  const [isEditing, setIsEditing] = useState(false);
  const [formHn, setFormHn] = useState('');
  const [status, setStatus] = useState('Active');
  const [gender, setGender] = useState('ชาย');
  const [title, setTitle] = useState('เด็กชาย');
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [nickname, setNickname] = useState('');
  const [dob, setDob] = useState('');
  const [ageText, setAgeText] = useState('0 ปี 0 เดือน');
  const [guardian, setGuardian] = useState('');
  const [phone, setPhone] = useState('');
  const [lineUserId, setLineUserId] = useState('');
  
  const [allergies, setAllergies] = useState('ปฏิเสธการแพ้ยา');
  const [allergiesDetails, setAllergiesDetails] = useState('');
  const [conditions, setConditions] = useState('ไม่มี');
  const [conditionsDetails, setConditionsDetails] = useState('');
  
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [channelsOtherDetails, setChannelsOtherDetails] = useState('');
  const [worries, setWorries] = useState('');

  // 1. คำนวณช่วงคำนำหน้าชื่อตามเพศ
  useEffect(() => {
    if (gender === 'ชาย') {
      if (title !== 'เด็กชาย' && title !== 'นาย') {
        setTitle('เด็กชาย');
      }
    } else {
      if (title !== 'เด็กหญิง' && title !== 'นางสาว') {
        setTitle('เด็กหญิง');
      }
    }
  }, [gender]);

  // 2. คำนวณอายุเมื่อเลือกวันเกิด
  useEffect(() => {
    if (!dob) {
      setAgeText('0 ปี 0 เดือน');
      return;
    }
    
    const birthDate = parseDateToAD(dob);
    if (!birthDate) {
      return { years: 0, months: 0, text: 'วันเกิดไม่ถูกต้อง' };
    }
    const normalizedBirthYear = birthDate.getFullYear();
    const today = new Date(); // อิงเวลาปัจจุบัน
    
    let years = today.getFullYear() - normalizedBirthYear;
    let months = today.getMonth() - birthDate.getMonth();
    
    if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
      years--;
      months += 12;
    }
    if (today.getDate() < birthDate.getDate()) {
      months--;
    }
    
    if (months < 0) {
      months = 11;
    }

    setAgeText(`${years} ปี ${months} เดือน`);
  }, [dob]);

  // 3. คำนวณรัน HN อัตโนมัติ (เช่น ปี 69 รันเป็น 69001)
  const generateNextHn = () => {
    const today = new Date();
    const beYear = today.getFullYear() + 543; // แปลง ค.ศ. เป็น พ.ศ.
    const yearSuffix = beYear.toString().slice(-2); // ได้ "69"
    
    const yearPatients = (patients || []).filter(p => p && p.hn && String(p.hn).startsWith(yearSuffix));
    if (yearPatients.length === 0) {
      return `${yearSuffix}001`;
    }
    
    // ค้นหารหัสที่สูงสุด
    const hns = yearPatients.map(p => parseInt(String(p.hn).slice(2)));
    const maxNum = Math.max(...hns);
    const nextNum = maxNum + 1;
    const paddedNum = nextNum.toString().padStart(3, '0');
    return `${yearSuffix}${paddedNum}`;
  };

  // เตรียม HN เมื่อคลิกเพิ่มผู้ป่วยใหม่
  useEffect(() => {
    if (!isEditing) {
      setFormHn(generateNextHn());
    }
  }, [patients, isEditing]);

  // 4. จัดการช่องทางติดต่อ (Multiple Selection Toggle)
  const handleChannelToggle = (channel) => {
    if (selectedChannels.includes(channel)) {
      setSelectedChannels(selectedChannels.filter(c => c !== channel));
    } else {
      setSelectedChannels([...selectedChannels, channel]);
    }
  };

  // 5. ค้นหาและกรองผู้ป่วย
  const filteredPatients = useMemo(() => {
    let list = patients || [];

    if (currentUser?.role === 'OT') {
      const myTherapist = therapists.find(t => 
        t.id === currentUser.employeeId || 
        t.fullname === currentUser.fullname || 
        (t.nickname && currentUser.nickname && t.nickname === currentUser.nickname)
      );
      const myTherapistId = myTherapist ? myTherapist.id : 'NONE';
      const myHns = new Set(
        (appointments || [])
          .filter(app => app.therapistId === myTherapistId)
          .map(app => app.hn)
      );
      list = list.filter(p => p && myHns.has(p.hn));
    }

    return list
      .filter(p => {
        if (!p) return false;
        // ค้นหาเรียลไทม์
        const query = searchQuery.trim().toLowerCase();
        const matchesQuery = 
          String(p.hn || '').toLowerCase().includes(query) ||
          String(p.firstname || '').toLowerCase().includes(query) ||
          String(p.lastname || '').toLowerCase().includes(query) ||
          String(p.phone || '').includes(query) ||
          (p.nickname && String(p.nickname).toLowerCase().includes(query));
          
        // กรองสถานะ
        const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
        
        return matchesQuery && matchesStatus;
      })
      .sort((a, b) => String(b.hn || '').localeCompare(String(a.hn || ''))); // เรียง HN จากมากไปน้อย
  }, [patients, searchQuery, statusFilter, currentUser, appointments, therapists]);

  const paginatedPatients = useMemo(() => {
    const itemsPerPage = 20;
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPatients.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPatients, currentPage]);

  const maxPages = Math.ceil(filteredPatients.length / 20) || 1;

  // 6. ล้างข้อมูลฟอร์ม
  const resetForm = () => {
    setIsEditing(false);
    setFormHn(generateNextHn());
    setStatus('Active');
    setGender('ชาย');
    setTitle('เด็กชาย');
    setFirstname('');
    setLastname('');
    setNickname('');
    setDob('');
    setAgeText('0 ปี 0 เดือน');
    setGuardian('');
    setPhone('');
    setLineUserId('');
    setAllergies('ปฏิเสธการแพ้ยา');
    setAllergiesDetails('');
    setConditions('ไม่มี');
    setConditionsDetails('');
    setSelectedChannels([]);
    setChannelsOtherDetails('');
    setWorries('');
    setShowRegisterModal(false);
  };

  // 7. บันทึกข้อมูลฟอร์ม (เพิ่ม/แก้ไข)
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!firstname || !lastname || !dob || !phone) {
      Swal.fire({
        icon: 'error',
        title: 'ข้อมูลไม่ครบถ้วน',
        text: 'กรุณากรอก ชื่อ-นามสกุล, วันเกิด และเบอร์โทรติดต่อให้ครบถ้วน',
        confirmButtonColor: 'var(--secondary)'
      });
      return;
    }

    const patientData = {
      hn: formHn,
      status,
      gender,
      title,
      firstname,
      lastname,
      nickname,
      dob,
      guardian,
      phone,
      allergies,
      allergiesDetails: allergies === 'มี' ? allergiesDetails : '',
      conditions,
      conditionsDetails: conditions === 'มี' ? conditionsDetails : '',
      channels: selectedChannels,
      channelsOtherDetails: selectedChannels.includes('อื่นๆ') ? channelsOtherDetails : '',
      worries,
      lineUserId,
      created_at: isEditing ? ((patients || []).find(p => p.hn === formHn)?.created_at || new Date().toISOString()) : new Date().toISOString(),
      createdBy: isEditing 
        ? ((patients || []).find(p => p.hn === formHn)?.createdBy || '')
        : (currentUser?.fullname || 'ผู้ดูแลระบบ')
    };

    if (isEditing) {
      onUpdatePatient(patientData);
      Swal.fire({
        icon: 'success',
        title: 'แก้ไขข้อมูลสำเร็จ',
        showConfirmButton: false,
        timer: 1500
      });
    } else {
      onAddPatient(patientData);
      Swal.fire({
        icon: 'success',
        title: 'ลงทะเบียนผู้รับบริการใหม่สำเร็จ',
        text: `รหัส HN: ${patientData.hn}`,
        confirmButtonColor: 'var(--secondary)'
      });
    }
    resetForm();
    setShowRegisterModal(false);
  };

  // 8. คลิกแก้ไข
  const handleEditClick = (p) => {
    setIsEditing(true);
    setFormHn(p.hn);
    setStatus(p.status);
    setGender(p.gender);
    setTitle(p.title);
    setFirstname(p.firstname);
    setLastname(p.lastname);
    setNickname(p.nickname || '');
    setDob(p.dob);
    setGuardian(p.guardian || '');
    setPhone(p.phone);
    setAllergies(p.allergies);
    setAllergiesDetails(p.allergiesDetails || '');
    setConditions(p.conditions);
    setConditionsDetails(p.conditionsDetails || '');
    setSelectedChannels(p.channels || []);
    setChannelsOtherDetails(p.channelsOtherDetails || '');
    setWorries(p.worries || '');
    setLineUserId(p.lineUserId || '');
    setShowRegisterModal(true);
  };

  // 9. คลิกดูข้อมูล (SweetAlert2)
  const handleViewDetails = (p) => {
    const channelsText = p.channels && p.channels.length > 0 
      ? p.channels.map(c => c === 'อื่นๆ' ? `อื่นๆ (${p.channelsOtherDetails || '-'})` : c).join(', ')
      : 'ไม่ได้ระบุ';

    const dobText = (() => {
      if (!p.dob) return 'ไม่ได้ระบุ';
      const d = new Date(p.dob);
      if (isNaN(d.getTime())) return p.dob || 'ไม่ได้ระบุ';
      return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
    })();

    Swal.fire({
      title: `<span style="color:var(--dark); font-family:var(--font-family)">ข้อมูลเวชระเบียนผู้ป่วย [HN: ${p.hn}]</span>`,
      html: `
        <div style="text-align: left; font-family: var(--font-family); font-size: 0.95rem; line-height: 1.6; display: flex; flex-direction: column; gap: 0.5rem; color: var(--dark)">
          <div style="border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; margin-bottom: 0.5rem">
            <strong>ชื่อ-นามสกุล:</strong> ${p.title}${p.firstname} ${p.lastname} (${p.nickname ? formatPatientNickname(p.nickname) : 'ไม่มีชื่อเล่น'})<br/>
            <strong>เพศ:</strong> ${p.gender} | <strong>สถานะ:</strong> <span class="badge ${p.status === 'Active' ? 'badge-success' : p.status === 'Pending' ? 'badge-warning' : 'badge-secondary'}">${p.status}</span>
          </div>
          <div>
            <strong>วันเกิด (พ.ศ.):</strong> ${dobText}<br/>
            <strong>ผู้ปกครอง:</strong> ${p.guardian || 'ไม่ระบุ'}<br/>
            <strong>เบอร์โทรติดต่อ:</strong> ${p.phone}<br/>
            <strong>LINE User ID:</strong> ${p.lineUserId || 'ยังไม่ได้ผูกสิทธิ์'}
          </div>
          <div style="border-top: 1px solid var(--border); padding-top: 0.5rem; margin-top: 0.5rem">
            <strong>ประวัติการแพ้ยา:</strong> ${p.allergies === 'มี' ? `<span style="color:var(--danger)">${p.allergiesDetails}</span>` : 'ปฏิเสธการแพ้ยา'}<br/>
            <strong>โรคประจำตัว:</strong> ${p.conditions === 'มี' ? `<span style="color:var(--warning)">${p.conditionsDetails}</span>` : 'ไม่มี'}<br/>
            <strong>ช่องทางติดต่อ:</strong> ${channelsText}
          </div>
          <div style="background-color: var(--light); padding: 0.75rem; border-radius: var(--radius-sm); border: 1px dashed var(--border); margin-top: 0.5rem">
            <strong>อาการหรือพฤติกรรมที่กังวล:</strong><br/>
            <span style="font-style: italic; color: var(--dark-light)">${p.worries || 'ไม่มี'}</span>
          </div>
        </div>
      `,
      confirmButtonText: 'ปิดหน้าต่าง',
      confirmButtonColor: 'var(--secondary)',
      customClass: {
        popup: 'card-3xl'
      }
    });
  };

  // 10. คลิก ลบ
  const handleDeleteClick = (hn) => {
    Swal.fire({
      title: 'ต้องการลบข้อมูลผู้รับบริการ?',
      text: "การลบข้อมูลนี้จะไม่สามารถกู้คืนได้ และข้อมูลนัดหมายที่เกี่ยวข้องทั้งหมดจะได้รับผลกระทบ!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--danger)',
      cancelButtonColor: 'var(--dark-light)',
      confirmButtonText: 'ใช่, ต้องการลบ!',
      cancelButtonText: 'ยกเลิก'
    }).then((result) => {
      if (result.isConfirmed) {
        onDeletePatient(hn);
        Swal.fire({
          title: 'ลบข้อมูลสำเร็จ',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
      }
    });
  };

  const handleExportCSV = () => {
    const headers = [
      'รหัส HN', 'สถานะ', 'เพศ', 'คำนำหน้าชื่อ', 'ชื่อ', 'นามสกุล',
      'ชื่อเล่น', 'วันเกิด (ค.ศ. YYYY-MM-DD)', 'ผู้ปกครอง', 'เบอร์โทร',
      'การแพ้ยา', 'รายละเอียดการแพ้ยา', 'โรคประจำตัว', 'รายละเอียดโรคประจำตัว',
      'ช่องทางที่รู้จัก', 'รายละเอียดช่องทางอื่นๆ', 'พฤติกรรมหรืออาการที่กังวล', 'LINE User ID'
    ];

    let rows = [];
    if (patients.length === 0) {
      // Export template
      rows = [
        ['69001', 'Active', 'ชาย', 'เด็กชาย', 'สมชาย', 'ใจดี', 'ชาย', '2020-01-15', 'สมศรี ใจดี', '0812345678', 'ปฏิเสธการแพ้ยา', '', 'ไม่มี', '', 'Facebook|Line', '', 'พูดช้ากว่าวัย']
      ];
      Swal.fire({
        title: 'ส่งออกไฟล์เทมเพลต',
        text: 'เนื่องจากไม่มีข้อมูลผู้รับบริการในระบบ ระบบจะส่งออกเป็นไฟล์เทมเพลตตัวอย่าง',
        icon: 'info',
        confirmButtonColor: 'var(--secondary)'
      });
    } else {
      rows = patients.map(p => [
        p.hn,
        p.status,
        p.gender,
        p.title,
        p.firstname,
        p.lastname,
        p.nickname || '',
        p.dob,
        p.guardian || '',
        p.phone,
        p.allergies,
        p.allergiesDetails || '',
        p.conditions,
        p.conditionsDetails || '',
        (p.channels || []).join('|'),
        p.channelsOtherDetails || '',
        p.worries || '',
        p.lineUserId || ''
      ]);
    }

    exportToCSV('patients_register.csv', headers, rows);
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

      // Find index mapping
      const indexMap = {};
      Object.keys(headersMap).forEach(key => {
        const matchingHeaders = headersMap[key];
        const idx = csvHeaders.findIndex(h => matchingHeaders.includes(h));
        if (idx !== -1) {
          indexMap[key] = idx;
        }
      });

      // We must map at least firstname, lastname, phone, dob
      if (indexMap.firstname === undefined || indexMap.lastname === undefined || indexMap.phone === undefined || indexMap.dob === undefined) {
        Swal.fire({
          icon: 'error',
          title: 'รูปแบบคอลัมน์ไม่ถูกต้อง',
          text: 'กรุณาตรวจสอบว่ามีคอลัมน์ ชื่อ, นามสกุล, เบอร์โทร และวันเกิด อย่างน้อยที่สุด',
          confirmButtonColor: 'var(--secondary)'
        });
        return;
      }

      let addedCount = 0;
      let updatedCount = 0;
      let errorCount = 0;

      let currentPatientsList = [...patients];

      rows.forEach(row => {
        // Skip empty rows
        if (row.length === 0 || (row.length === 1 && row[0] === '')) return;

        const val = (key) => {
          const idx = indexMap[key];
          return idx !== undefined && row[idx] !== undefined ? row[idx].trim() : '';
        };

        const firstname = val('firstname');
        const lastname = val('lastname');
        const phone = val('phone');
        const dob = val('dob');

        // Validation
        if (!firstname || !lastname || !dob || !phone) {
          errorCount++;
          return;
        }

        // Channels are split by | or comma
        const channelsRaw = val('channels');
        const channels = channelsRaw ? channelsRaw.split(/[|,]+/).map(c => c.trim()).filter(Boolean) : [];

        // Check or generate HN
        let hn = val('hn');
        const exists = currentPatientsList.some(p => p && String(p.hn) === String(hn));

        if (!hn || (!exists && isNaN(parseInt(hn)))) {
          const generateTempHn = (tempList) => {
            const today = new Date();
            const beYear = today.getFullYear() + 543;
            const yearSuffix = beYear.toString().slice(-2);
            
            const yearPatients = tempList.filter(p => p && p.hn && String(p.hn).startsWith(yearSuffix));
            if (yearPatients.length === 0) {
              return `${yearSuffix}001`;
            }
            const hns = yearPatients.map(p => parseInt(String(p.hn).slice(2)));
            const maxNum = Math.max(...hns);
            const nextNum = maxNum + 1;
            const paddedNum = nextNum.toString().padStart(3, '0');
            return `${yearSuffix}${paddedNum}`;
          };
          hn = generateTempHn(currentPatientsList);
        }

        const patientData = {
          hn,
          status: val('status') || 'Active',
          gender: val('gender') || 'ชาย',
          title: val('title') || (val('gender') === 'หญิง' ? 'เด็กหญิง' : 'เด็กชาย'),
          firstname,
          lastname,
          nickname: val('nickname'),
          dob,
          guardian: val('guardian'),
          phone,
          allergies: val('allergies') || 'ปฏิเสธการแพ้ยา',
          allergiesDetails: val('allergiesDetails'),
          conditions: val('conditions') || 'ไม่มี',
          conditionsDetails: val('conditionsDetails'),
          channels,
          channelsOtherDetails: val('channelsOtherDetails'),
          worries: val('worries'),
          lineUserId: val('lineUserId'),
          created_at: new Date().toISOString()
        };

        const existingPatientIndex = currentPatientsList.findIndex(p => p && String(p.hn) === String(hn));
        if (existingPatientIndex !== -1) {
          const existingPatient = currentPatientsList[existingPatientIndex];
          currentPatientsList[existingPatientIndex] = {
            ...existingPatient,
            ...patientData,
            created_at: existingPatient.created_at,
            createdBy: existingPatient.createdBy || currentUser?.fullname || 'ผู้ดูแลระบบ'
          };
          updatedCount++;
        } else {
          currentPatientsList.push({
            ...patientData,
            createdBy: currentUser?.fullname || 'ผู้ดูแลระบบ'
          });
          addedCount++;
        }
      });

      if (setPatients) {
        setPatients(currentPatientsList);
      }

      Swal.fire({
        icon: 'success',
        title: 'นำเข้าข้อมูลสำเร็จ',
        html: `
          <div style="font-family: var(--font-family); text-align: left; font-size: 0.95rem; line-height: 1.6;">
            นำเข้าใหม่: <strong>${addedCount}</strong> รายการ<br/>
            อัปเดตข้อมูลเดิม: <strong>${updatedCount}</strong> รายการ<br/>
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
          <UserPlus size={28} />
          ทะเบียนประวัติผู้รับบริการ
        </h1>
        <div className="page-actions">
          {currentUser?.role !== 'OT' && (
            <button className="btn btn-primary" onClick={() => { resetForm(); setShowRegisterModal(true); }} title="ลงทะเบียนผู้รับบริการรายใหม่">
              <Plus size={16} /> ลงทะเบียนรายใหม่
            </button>
          )}
          {currentUser?.role === 'Admin' && (
            <>
              <button className="btn btn-light" onClick={handleExportCSV} title="ส่งออกข้อมูลรายชื่อผู้รับบริการเป็นไฟล์ CSV">
                <Download size={16} /> Export CSV
              </button>
              <label className="btn btn-light" style={{ cursor: 'pointer', margin: 0 }} title="นำเข้าข้อมูลรายชื่อผู้รับบริการผ่านไฟล์ CSV">
                <Upload size={16} /> Import CSV
                <input type="file" accept=".csv" onChange={handleImportCSV} style={{ display: 'none' }} />
              </label>
            </>
          )}
        </div>
      </div>

      {/* MODAL: ลงทะเบียนรายใหม่ */}
      {showRegisterModal && (
        <div className="modal-overlay">
          <div className="modal-content-wrapper" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 700 }}>
                {isEditing ? 'แก้ไขข้อมูลประวัติ' : 'ลงทะเบียนรายใหม่'}
              </h3>
              <button className="close-modal-btn" onClick={() => setShowRegisterModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">HN (รันอัตโนมัติ)</label>
                    <input type="text" className="form-control" value={formHn} readOnly style={{ backgroundColor: '#f0f0f0', fontWeight: 600 }} />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">สถานะ</label>
                    <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
                      <option value="Active">Active</option>
                      <option value="Pending">Pending</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">เพศ</label>
                     <select 
                       className="form-control" 
                       value={gender} 
                       onChange={(e) => {
                         const val = e.target.value;
                         setGender(val);
                         if (val === 'ชาย') {
                           setTitle('เด็กชาย');
                         } else {
                           setTitle('เด็กหญิง');
                         }
                       }}
                     >
                       <option value="ชาย">ชาย</option>
                       <option value="หญิง">หญิง</option>
                     </select>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">คำนำหน้า</label>
                    <select className="form-control" value={title} onChange={(e) => setTitle(e.target.value)}>
                      {gender === 'ชาย' ? (
                        <>
                          <option value="เด็กชาย">เด็กชาย</option>
                          <option value="นาย">นาย</option>
                        </>
                      ) : (
                        <>
                          <option value="เด็กหญิง">เด็กหญิง</option>
                          <option value="นางสาว">นางสาว</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">ชื่อ-นามสกุลผู้ป่วย <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input type="text" className="form-control" placeholder="ชื่อ" value={firstname} onChange={(e) => setFirstname(e.target.value)} required />
                      <input type="text" className="form-control" placeholder="นามสกุล" value={lastname} onChange={(e) => setLastname(e.target.value)} required />
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">ชื่อเล่น</label>
                    <input type="text" className="form-control" placeholder="เช่น บี" value={nickname} onChange={(e) => setNickname(e.target.value)} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">วันเกิด (ค.ศ. ระบบจะแปลง พ.ศ.) <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input type="date" className="form-control" value={dob} onChange={(e) => setDob(e.target.value)} required />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">อายุคำนวณ</label>
                    <input type="text" className="form-control" value={ageText} readOnly style={{ backgroundColor: '#f9f9f9', fontWeight: 600, color: 'var(--secondary)' }} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">ชื่อผู้ปกครอง</label>
                    <input type="text" className="form-control" placeholder="ชื่อ-นามสกุล ผู้ปกครอง" value={guardian} onChange={(e) => setGuardian(e.target.value)} />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">เบอร์โทรติดต่อ <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input type="tel" className="form-control" placeholder="เช่น 0812345678" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">รหัส LINE User ID ผู้ปกครอง</label>
                  <input type="text" className="form-control" placeholder="เช่น U1a2b3c4d5e... (ปกติจะผูกผ่านระบบ Self-Service)" value={lineUserId} onChange={(e) => setLineUserId(e.target.value)} />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">แพ้ยา</label>
                    <select className="form-control" value={allergies} onChange={(e) => setAllergies(e.target.value)}>
                      <option value="ปฏิเสธการแพ้ยา">ปฏิเสธการแพ้ยา</option>
                      <option value="มี">มีประวัติการแพ้ยา</option>
                    </select>
                    {allergies === 'มี' && (
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="ระบุชื่อยาที่แพ้และอาการ" 
                        value={allergiesDetails} 
                        onChange={(e) => setAllergiesDetails(e.target.value)}
                        style={{ marginTop: '0.5rem', borderColor: 'var(--danger)' }}
                        required
                      />
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">โรคประจำตัว</label>
                    <select className="form-control" value={conditions} onChange={(e) => setConditions(e.target.value)}>
                      <option value="ไม่มี">ไม่มีโรคประจำตัว</option>
                      <option value="มี">มีโรคประจำตัว</option>
                    </select>
                    {conditions === 'มี' && (
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="ระบุโรคประจำตัว" 
                        value={conditionsDetails} 
                        onChange={(e) => setConditionsDetails(e.target.value)}
                        style={{ marginTop: '0.5rem', borderColor: 'var(--secondary)' }}
                        required
                      />
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">ช่องทางรู้จักคลินิก (เลือกได้หลายรายการ)</label>
                  <div className="multi-select-toggles">
                    {['Facebook', 'Line', 'Walk-in', 'เพื่อนแนะนำ', 'คลินิกเด็ก', 'อื่นๆ'].map(channel => (
                      <label key={channel} className="toggle-checkbox-btn">
                        <input 
                          type="checkbox" 
                          checked={selectedChannels.includes(channel)}
                          onChange={() => handleChannelToggle(channel)}
                        />
                        <span className="toggle-checkbox-label">{channel}</span>
                      </label>
                    ))}
                  </div>
                  {selectedChannels.includes('อื่นๆ') && (
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="ระบุช่องทางติดต่อเพิ่มเติม" 
                      value={channelsOtherDetails} 
                      onChange={(e) => setChannelsOtherDetails(e.target.value)}
                      style={{ marginTop: '0.5rem' }}
                      required
                    />
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">อาการหรือพฤติกรรมที่กังวล</label>
                  <textarea 
                    className="form-control" 
                    rows="3" 
                    placeholder="ระบุรายละเอียดอาการ ทักษะที่ต้องการส่งเสริม หรือพฤติกรรมที่เป็นกังวล"
                    value={worries}
                    onChange={(e) => setWorries(e.target.value)}
                  ></textarea>
                </div>

              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-light" onClick={resetForm}>
                  ยกเลิก
                </button>
                <button type="submit" className="btn btn-secondary">
                  {isEditing ? 'บันทึกการแก้ไข' : 'ลงทะเบียน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* แสดงเลย์เอาต์แบบเต็มจอ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* ตารางรายชื่อผู้ป่วย (ฝั่งขวา) */}
        <div className="card-3xl">
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>ค้นหาและกรองผู้รับบริการ</h2>
            
            <div className="search-filter-bar">
              <div className="search-input-wrapper">
                <Search size={18} className="search-icon" />
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="ค้นหาด้วย HN, ชื่อ, นามสกุล, ชื่อเล่น หรือเบอร์โทร..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <div className="toggle-filter-group">
                <button 
                  className={`toggle-filter-btn ${statusFilter === 'All' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('All')}
                >
                  ทั้งหมด
                </button>
                <button 
                  className={`toggle-filter-btn ${statusFilter === 'Active' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('Active')}
                  style={{ color: statusFilter === 'Active' ? 'var(--success)' : '' }}
                >
                  Active
                </button>
                <button 
                  className={`toggle-filter-btn ${statusFilter === 'Pending' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('Pending')}
                  style={{ color: statusFilter === 'Pending' ? 'var(--warning)' : '' }}
                >
                  Pending
                </button>
                <button 
                  className={`toggle-filter-btn ${statusFilter === 'Inactive' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('Inactive')}
                  style={{ color: statusFilter === 'Inactive' ? 'var(--dark-light)' : '' }}
                >
                  Inactive
                </button>
              </div>
            </div>
          </div>

          <div className="table-container">
            <table className="hdh-table">
              <thead>
                <tr>
                  <th>HN</th>
                  <th>ชื่อ-นามสกุล</th>
                  <th>เบอร์โทร</th>
                  <th>สถานะ</th>
                  <th style={{ textAlign: 'center' }}>การดำเนินการ</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPatients.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--dark-light)' }}>
                      ไม่พบข้อมูลผู้รับบริการตามตัวกรองนี้
                    </td>
                  </tr>
                ) : (
                  paginatedPatients.map((p) => (
                    <tr key={p.hn}>
                      <td style={{ fontWeight: 600, color: 'var(--secondary)' }}>{p.hn}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.title}{p.firstname} {p.lastname}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--dark-light)' }}>
                          {p.nickname ? formatPatientNickname(p.nickname) : '-'} ({p.gender})
                        </div>
                      </td>
                      <td>{p.phone}</td>
                      <td>
                        <span className={`badge ${
                          p.status === 'Active' ? 'badge-success' : 
                          p.status === 'Pending' ? 'badge-warning' : 'badge-secondary'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                          <button 
                            className="btn btn-light btn-icon-only" 
                            title="ดูข้อมูลอย่างละเอียด"
                            onClick={() => handleViewDetails(p)}
                            type="button"
                          >
                            <Eye size={16} color="var(--dark)" />
                          </button>
                          
                          {currentUser?.role !== 'OT' && (
                            <button 
                              className="btn btn-light btn-icon-only" 
                              title="แก้ไขข้อมูล"
                              onClick={() => handleEditClick(p)}
                              type="button"
                            >
                              <Edit2 size={16} color="var(--secondary)" />
                            </button>
                          )}

                          <button 
                            className="btn btn-light btn-icon-only" 
                            title="พิมพ์ประวัติผู้ป่วย (PDF)"
                            onClick={() => onPrintPatient(p.hn)}
                            type="button"
                          >
                            <Printer size={16} color="var(--info)" />
                          </button>
                          
                          {isAdmin && (
                            <button 
                              className="btn btn-light btn-icon-only" 
                              title="ลบผู้ป่วย"
                              onClick={() => handleDeleteClick(p.hn)}
                              type="button"
                            >
                              <Trash2 size={16} color="var(--danger)" />
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
            แสดง {filteredPatients.length === 0 ? 0 : (currentPage - 1) * 20 + 1} - {Math.min(currentPage * 20, filteredPatients.length)} จากทั้งหมด {filteredPatients.length} รายการ (เรียงจากล่าสุด)
          </div>
        </div>

      </div>
    </div>
  );
}
