import React, { useState, useEffect, useMemo } from 'react';
import { 
  ClipboardCheck, 
  Brain, 
  HelpCircle, 
  Smile, 
  Frown, 
  Plus, 
  Eye, 
  Printer, 
  Trash2,
  Upload,
  Download,
  X,
  Edit
} from 'lucide-react';
import Swal from 'sweetalert2';
import { exportToCSV, parseCSV } from '../utils/csvHelper';

const headersMap = {
  id: ['id', 'เลขที่เอกสาร', 'เลขที่เอกสารการประเมิน', 'assessment id'],
  hn: ['hn', 'รหัส hn', 'รหัสผู้ป่วย'],
  date: ['date', 'วันที่ประเมิน', 'วันที่ประเมิน (yyyy-mm-dd)', 'วันที่'],
  gm: ['gm', 'กล้ามเนื้อมัดใหญ่', 'กล้ามเนื้อมัดใหญ่ (gm)'],
  fm: ['fm', 'กล้ามเนื้อมัดเล็ก', 'กล้ามเนื้อมัดเล็ก (fm)'],
  language: ['language', 'ด้านภาษา', 'ด้านภาษา (language)'],
  social: ['social', 'ด้านสังคม', 'ด้านสังคม (social)'],
  tactile: ['tactile', 'sensory_tactile', 'ประสาทสัมผัสทางผิวหนัง'],
  vestibular: ['vestibular', 'sensory_vestibular', 'การทรงตัว'],
  proprioceptive: ['proprioceptive', 'sensory_proprioceptive', 'กล้ามเนื้อและข้อต่อ'],
  visual: ['visual', 'sensory_visual', 'การรับรู้ทางสายตา'],
  auditory: ['auditory', 'sensory_auditory', 'การรับรู้ทางเสียง'],
  movement: ['movement', 'sensory_movement', 'การวางแผนเคลื่อนไหว'],
  snapInattention: ['snapinattention', 'snap_inattention', 'สมาธิสั้น', 'ขาดสมาธิ'],
  snapHyperactivity: ['snaphyperactivity', 'snap_hyperactivity', 'ซนสมาธิสั้น', 'ซน/วู่วาม'],
  snapOppositional: ['snapoppositional', 'snap_oppositional', 'ดื้อต่อต้าน', 'ดื้อ/ต่อต้าน']
};

export default function DevelopmentalAssessment({ 
  patients, 
  assessments, 
  therapists = [],
  onAddAssessment, 
  onDeleteAssessment,
  onPrintAssessment 
}) {
  const [selectedHn, setSelectedHn] = useState('');
  const [therapistId, setTherapistId] = useState('');
  const [evalDate, setEvalDate] = useState('2026-06-05'); // วันที่จำลองระบบ
  
  // พัฒนาการ 4 ด้าน (สมวัย/ล่าช้า)
  const [gm, setGm] = useState('สมวัย');
  const [fm, setFm] = useState('สมวัย');
  const [language, setLanguage] = useState('สมวัย');
  const [social, setSocial] = useState('สมวัย');

  // Sensory Test 6 ด้าน (คะแนน 1-50 ต่อด้าน)
  const [tactile, setTactile] = useState(0);
  const [vestibular, setVestibular] = useState(0);
  const [proprioceptive, setProprioceptive] = useState(0);
  const [visual, setVisual] = useState(0);
  const [auditory, setAuditory] = useState(0);
  const [movement, setMovement] = useState(0);

  // SNAP-IV คะแนนดิบ
  const [snapInattention, setSnapInattention] = useState(0);
  const [snapHyperactivity, setSnapHyperactivity] = useState(0);
  const [snapOppositional, setSnapOppositional] = useState(0);

  // Modals and Search States
  const [showFormModal, setShowFormModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingAssessment, setViewingAssessment] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // ดึงข้อมูลผู้ป่วยที่เลือกเพื่อคำนวณอายุ
  const selectedPatient = useMemo(() => {
    return patients.find(p => p.hn === selectedHn);
  }, [selectedHn, patients]);

  // คำนวณอายุเป็นตัวเลขจำนวนปีและเดือนเพื่อนำมาตรวจสอบเงื่อนไข
  const patientAgeInfo = useMemo(() => {
    if (!selectedPatient) return { years: 0, months: 0, text: 'กรุณาเลือกผู้รับบริการ' };
    
    const birthDate = new Date(selectedPatient.dob);
    const today = new Date('2026-06-05');
    
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    
    if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
      years--;
      months += 12;
    }
    if (today.getDate() < birthDate.getDate()) {
      months--;
    }
    if (months < 0) months = 11;

    return {
      years,
      months,
      text: `${years} ปี ${months} เดือน`
    };
  }, [selectedPatient]);

  // ตรวจสอบสิทธิ์ Sensory Test (เฉพาะเด็กอายุ 6 ปีขึ้นไป ถ้าน้อยกว่าให้ Disabled)
  const isSensoryEnabled = useMemo(() => {
    return patientAgeInfo.years >= 6;
  }, [patientAgeInfo]);

  // ปิดช่อง Sensory Test และเซ็ตค่าเป็น 0 หากผู้ป่วยอายุน้อยกว่า 6 ปี
  useEffect(() => {
    if (!isSensoryEnabled) {
      setTactile(0);
      setVestibular(0);
      setProprioceptive(0);
      setVisual(0);
      setAuditory(0);
      setMovement(0);
    }
  }, [isSensoryEnabled]);

  // คำนวณคะแนนรวม Sensory Test
  const sensoryTotal = useMemo(() => {
    return Number(tactile) + Number(vestibular) + Number(proprioceptive) + Number(visual) + Number(auditory) + Number(movement);
  }, [tactile, vestibular, proprioceptive, visual, auditory, movement]);

  // คำนวณแปลผลความเสี่ยง SNAP-IV อัตโนมัติ (ขาดสมาธิ>=16, ซน>=13, ดื้อ>=15)
  const snapEvaluation = useMemo(() => {
    const inattentionStatus = snapInattention >= 16 ? 'เสี่ยง' : 'ปกติ';
    const hyperactivityStatus = snapHyperactivity >= 13 ? 'เสี่ยง' : 'ปกติ';
    const oppositionalStatus = snapOppositional >= 15 ? 'เสี่ยง' : 'ปกติ';
    return { inattentionStatus, hyperactivityStatus, oppositionalStatus };
  }, [snapInattention, snapHyperactivity, snapOppositional]);

  // ล้างฟอร์ม
  const resetForm = () => {
    setSelectedHn('');
    setTherapistId('');
    setGm('สมวัย');
    setFm('สมวัย');
    setLanguage('สมวัย');
    setSocial('สมวัย');
    setTactile(0);
    setVestibular(0);
    setProprioceptive(0);
    setVisual(0);
    setAuditory(0);
    setMovement(0);
    setSnapInattention(0);
    setSnapHyperactivity(0);
    setSnapOppositional(0);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsEditing(false);
    setEditingId(null);
    setShowFormModal(true);
  };

  const handleOpenEditModal = (item) => {
    setSelectedHn(item.hn);
    setTherapistId(item.therapistId || '');
    setEvalDate(item.date);
    setGm(item.gm);
    setFm(item.fm);
    setLanguage(item.language);
    setSocial(item.social);
    setTactile(item.sensoryScores?.tactile ?? 0);
    setVestibular(item.sensoryScores?.vestibular ?? 0);
    setProprioceptive(item.sensoryScores?.proprioceptive ?? 0);
    setVisual(item.sensoryScores?.visual ?? 0);
    setAuditory(item.sensoryScores?.auditory ?? 0);
    setMovement(item.sensoryScores?.movement ?? 0);
    setSnapInattention(item.snapIV?.inattention ?? 0);
    setSnapHyperactivity(item.snapIV?.hyperactivity ?? 0);
    setSnapOppositional(item.snapIV?.oppositional ?? 0);
    setIsEditing(true);
    setEditingId(item.id);
    setShowFormModal(true);
  };

  // บันทึกการประเมิน
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedHn) {
      Swal.fire({ icon: 'warning', title: 'กรุณาเลือกผู้รับบริการ', confirmButtonColor: 'var(--secondary)' });
      return;
    }

    // รันเลขที่เอกสารในรูปแบบ HDA[ปี2หลัก]-[HN] (ปี พ.ศ. ของวันที่ตรวจ)
    const beYear = new Date(evalDate).getFullYear() + 543;
    const year2Digits = beYear.toString().slice(-2);
    const docId = `HDA${year2Digits}-${selectedHn}`;

    // ถ้าเป็นโหมดแก้ไขแล้วไอดีไม่ตรงเดิม (HN/วันประเมินเปลี่ยน) ให้ลบตัวเดิมทิ้งก่อน
    if (isEditing && editingId && editingId !== docId) {
      onDeleteAssessment(editingId);
    }

    const newAssessment = {
      id: docId,
      hn: selectedHn,
      therapistId: therapistId,
      date: evalDate,
      gm,
      fm,
      language,
      social,
      sensoryScores: {
        tactile: Number(tactile),
        vestibular: Number(vestibular),
        proprioceptive: Number(proprioceptive),
        visual: Number(visual),
        auditory: Number(auditory),
        movement: Number(movement),
        total: sensoryTotal
      },
      snapIV: {
        inattention: Number(snapInattention),
        hyperactivity: Number(snapHyperactivity),
        oppositional: Number(snapOppositional),
        inattentionStatus: snapEvaluation.inattentionStatus,
        hyperactivityStatus: snapEvaluation.hyperactivityStatus,
        oppositionalStatus: snapEvaluation.oppositionalStatus
      },
      created_at: new Date().toISOString()
    };

    onAddAssessment(newAssessment);

    Swal.fire({
      icon: 'success',
      title: isEditing ? 'แก้ไขผลการประเมินสำเร็จ' : 'บันทึกผลการประเมินสำเร็จ',
      text: `เลขที่เอกสาร: ${docId}`,
      confirmButtonColor: 'var(--secondary)'
    });

    resetForm();
    setShowFormModal(false);
  };

  // ค้นหารายละเอียดประวัติที่บันทึก
  const assessmentsList = useMemo(() => {
    return assessments.map(item => {
      const patient = patients.find(p => p.hn === item.hn);
      return {
        ...item,
        patientName: patient ? `${patient.title}${patient.firstname} ${patient.lastname}` : 'ไม่พบชื่อ',
        patientNickname: patient ? patient.nickname : ''
      };
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [assessments, patients]);

  const filteredAssessmentsList = useMemo(() => {
    if (!searchQuery.trim()) return assessmentsList;
    const q = searchQuery.toLowerCase().trim();
    return assessmentsList.filter(item => {
      const fullname = item.patientName.toLowerCase();
      const nickname = item.patientNickname.toLowerCase();
      const hn = item.hn.toLowerCase();
      return hn.includes(q) || nickname.includes(q) || fullname.includes(q);
    });
  }, [assessmentsList, searchQuery]);

  const handleDelete = (id) => {
    Swal.fire({
      title: 'ลบผลการประเมินนี้?',
      text: "คุณจะไม่สามารถกู้คืนเอกสารการประเมินนี้ได้อีก!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--danger)',
      cancelButtonColor: 'var(--dark-light)',
      confirmButtonText: 'ลบเอกสาร!',
      cancelButtonText: 'ยกเลิก'
    }).then((result) => {
      if (result.isConfirmed) {
        onDeleteAssessment(id);
        Swal.fire({ title: 'ลบเรียบร้อย', icon: 'success', timer: 1500, showConfirmButton: false });
      }
    });
  };

  const handleExportCSV = () => {
    const headers = [
      'เลขที่เอกสาร', 'รหัส HN', 'วันที่ประเมิน (YYYY-MM-DD)', 
      'กล้ามเนื้อมัดใหญ่ (GM)', 'กล้ามเนื้อมัดเล็ก (FM)', 'ด้านภาษา (Language)', 'ด้านสังคม (Social)',
      'Sensory_Tactile', 'Sensory_Vestibular', 'Sensory_Proprioceptive', 'Sensory_Visual', 'Sensory_Auditory', 'Sensory_Movement',
      'SNAP_Inattention', 'SNAP_Hyperactivity', 'SNAP_Oppositional'
    ];

    let rows = [];
    if (assessments.length === 0) {
      // Export template
      rows = [
        ['HDA69-69001', '69001', '2026-06-05', 'สมวัย', 'สมวัย', 'สมวัย', 'สมวัย', '0', '0', '0', '0', '0', '0', '0', '0', '0']
      ];
      Swal.fire({
        title: 'ส่งออกไฟล์เทมเพลต',
        text: 'เนื่องจากไม่มีข้อมูลผลประเมินในระบบ ระบบจะส่งออกเป็นไฟล์เทมเพลตตัวอย่าง',
        icon: 'info',
        confirmButtonColor: 'var(--secondary)'
      });
    } else {
      rows = assessments.map(item => [
        item.id,
        item.hn,
        item.date,
        item.gm,
        item.fm,
        item.language,
        item.social,
        item.sensoryScores?.tactile ?? 0,
        item.sensoryScores?.vestibular ?? 0,
        item.sensoryScores?.proprioceptive ?? 0,
        item.sensoryScores?.visual ?? 0,
        item.sensoryScores?.auditory ?? 0,
        item.sensoryScores?.movement ?? 0,
        item.snapIV?.inattention ?? 0,
        item.snapIV?.hyperactivity ?? 0,
        item.snapIV?.oppositional ?? 0
      ]);
    }

    exportToCSV('developmental_assessments.csv', headers, rows);
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

      if (indexMap.hn === undefined || indexMap.date === undefined) {
        Swal.fire({
          icon: 'error',
          title: 'รูปแบบคอลัมน์ไม่ถูกต้อง',
          text: 'กรุณาตรวจสอบว่ามีคอลัมน์ รหัส HN และวันที่ประเมิน อย่างน้อยที่สุด',
          confirmButtonColor: 'var(--secondary)'
        });
        return;
      }

      let addedCount = 0;
      let updatedCount = 0;
      let invalidHnCount = 0;
      let errorCount = 0;

      let currentAssessmentsList = [...assessments];

      rows.forEach(row => {
        if (row.length === 0 || (row.length === 1 && row[0] === '')) return;

        const val = (key) => {
          const idx = indexMap[key];
          return idx !== undefined && row[idx] !== undefined ? row[idx].trim() : '';
        };

        const hn = val('hn');
        const date = val('date');

        if (!hn || !date) {
          errorCount++;
          return;
        }

        const patientExists = patients.some(p => p.hn === hn);
        if (!patientExists) {
          invalidHnCount++;
          return;
        }

        const gm = val('gm') || 'สมวัย';
        const fm = val('fm') || 'สมวัย';
        const language = val('language') || 'สมวัย';
        const social = val('social') || 'สมวัย';

        const tactile = Number(val('tactile')) || 0;
        const vestibular = Number(val('vestibular')) || 0;
        const proprioceptive = Number(val('proprioceptive')) || 0;
        const visual = Number(val('visual')) || 0;
        const auditory = Number(val('auditory')) || 0;
        const movement = Number(val('movement')) || 0;
        const sensoryTotal = tactile + vestibular + proprioceptive + visual + auditory + movement;

        const snapInattention = Number(val('snapInattention')) || 0;
        const snapHyperactivity = Number(val('snapHyperactivity')) || 0;
        const snapOppositional = Number(val('snapOppositional')) || 0;

        const inattentionStatus = snapInattention >= 16 ? 'เสี่ยง' : 'ปกติ';
        const hyperactivityStatus = snapHyperactivity >= 13 ? 'เสี่ยง' : 'ปกติ';
        const oppositionalStatus = snapOppositional >= 15 ? 'เสี่ยง' : 'ปกติ';

        let id = val('id');
        const exists = currentAssessmentsList.some(a => a.id === id);

        if (!id || !exists) {
          const beYear = new Date(date).getFullYear() + 543;
          const year2Digits = beYear.toString().slice(-2);
          id = `HDA${year2Digits}-${hn}`;
        }

        const assessmentData = {
          id,
          hn,
          date,
          gm,
          fm,
          language,
          social,
          sensoryScores: {
            tactile,
            vestibular,
            proprioceptive,
            visual,
            auditory,
            movement,
            total: sensoryTotal
          },
          snapIV: {
            inattention: snapInattention,
            hyperactivity: snapHyperactivity,
            oppositional: snapOppositional,
            inattentionStatus,
            hyperactivityStatus,
            oppositionalStatus
          },
          created_at: new Date().toISOString()
        };

        const existingAssessment = currentAssessmentsList.find(a => a.id === id);
        if (existingAssessment) {
          onDeleteAssessment(id);
          onAddAssessment(assessmentData);
          currentAssessmentsList = currentAssessmentsList.filter(a => a.id !== id);
          currentAssessmentsList.push(assessmentData);
          updatedCount++;
        } else {
          onAddAssessment(assessmentData);
          currentAssessmentsList.push(assessmentData);
          addedCount++;
        }
      });

      Swal.fire({
        icon: 'success',
        title: 'นำเข้าผลการประเมินสำเร็จ',
        html: `
          <div style="font-family: var(--font-family); text-align: left; font-size: 0.95rem; line-height: 1.6;">
            นำเข้าใหม่: <strong>${addedCount}</strong> รายการ<br/>
            อัปเดตข้อมูลเดิม: <strong>${updatedCount}</strong> รายการ<br/>
            ข้ามเนื่องจากไม่พบรหัส HN ผู้รับบริการ: <strong style="color:var(--warning)">${invalidHnCount}</strong> รายการ<br/>
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
          <ClipboardCheck size={28} />
          ระบบบันทึกผลการประเมินพัฒนาการ
        </h1>
        <div className="page-actions">
          <button className="btn btn-light" onClick={handleExportCSV} title="ส่งออกผลประเมินพัฒนาการเป็นไฟล์ CSV">
            <Download size={16} /> Export CSV
          </button>
          <label className="btn btn-light" style={{ cursor: 'pointer', margin: 0 }} title="นำเข้าผลประเมินพัฒนาการจากไฟล์ CSV">
            <Upload size={16} /> Import CSV
            <input type="file" accept=".csv" onChange={handleImportCSV} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {/* ตารางประวัติการประเมินแบบเต็มพื้นที่ */}
      <div className="card-3xl">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem' }}>ประวัติการประเมินพัฒนาการย้อนหลัง</h2>

        {/* ค้นหาและปุ่มสร้างใหม่ */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <div className="search-input-wrapper" style={{ flex: 1, minWidth: '250px', margin: 0 }}>
            <input 
              type="text" 
              className="form-control" 
              placeholder="ค้นหาจาก HN, ชื่อเล่น, หรือชื่อจริง..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <button className="btn btn-secondary" onClick={handleOpenAddModal}>
            <Plus size={16} />
            บันทึกผลการประเมินใหม่
          </button>
        </div>

        <div className="table-container">
          <table className="hdh-table">
            <thead>
              <tr>
                <th>เลขที่ใบประเมิน</th>
                <th>วันที่ประเมิน</th>
                <th>ผู้ป่วย</th>
                <th>สรุปผล SNAP-IV</th>
                <th style={{ textAlign: 'center' }}>การดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssessmentsList.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--dark-light)' }}>
                    {searchQuery.trim() ? 'ไม่พบข้อมูลประเมินพัฒนาการที่ตรงกับคำค้นหา' : 'ยังไม่มีประวัติการประเมินบันทึกไว้ในระบบ'}
                  </td>
                </tr>
              ) : (
                filteredAssessmentsList.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600, color: 'var(--secondary)' }}>{item.id}</td>
                    <td>{new Date(item.date).toLocaleDateString('th-TH')}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.patientName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--dark-light)' }}>HN: {item.hn} (น้อง{item.patientNickname})</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem' }}>
                        สมาธิ: <strong style={{ color: item.snapIV.inattentionStatus === 'เสี่ยง' ? 'var(--danger)' : 'var(--success)' }}>{item.snapIV.inattention} ({item.snapIV.inattentionStatus})</strong><br/>
                        ซน: <strong style={{ color: item.snapIV.hyperactivityStatus === 'เสี่ยง' ? 'var(--danger)' : 'var(--success)' }}>{item.snapIV.hyperactivity} ({item.snapIV.hyperactivityStatus})</strong><br/>
                        ดื้อ: <strong style={{ color: item.snapIV.oppositionalStatus === 'เสี่ยง' ? 'var(--danger)' : 'var(--success)' }}>{item.snapIV.oppositional} ({item.snapIV.oppositionalStatus})</strong>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                        <button 
                          className="btn btn-light btn-icon-only" 
                          title="ดูข้อมูล"
                          onClick={() => {
                            setViewingAssessment(item);
                            setShowViewModal(true);
                          }}
                        >
                          <Eye size={16} color="var(--secondary)" />
                        </button>

                        <button 
                          className="btn btn-light btn-icon-only" 
                          title="แก้ไขใบประเมิน"
                          onClick={() => handleOpenEditModal(item)}
                        >
                          <Edit size={16} color="var(--dark-light)" />
                        </button>
                        
                        <button 
                          className="btn btn-light btn-icon-only" 
                          title="พิมพ์ใบประเมิน (PDF)"
                          onClick={() => onPrintAssessment(item.id)}
                        >
                          <Printer size={16} color="var(--info)" />
                        </button>
                        
                        <button 
                          className="btn btn-light btn-icon-only" 
                          title="ลบใบประเมิน"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 size={16} color="var(--danger)" />
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

      {/* --- modal บันทึก/แก้ไขข้อมูลการประเมิน --- */}
      {showFormModal && (
        <div className="modal-overlay">
          <div className="modal-content-wrapper" style={{ maxWidth: '850px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Brain color="var(--secondary)" size={20} />
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--dark)' }}>
                  {isEditing ? `แก้ไขผลการประเมินพัฒนาการ (เลขที่เอกสาร: ${editingId})` : 'บันทึกพัฒนาการและพฤติกรรม'}
                </h2>
              </div>
              <button className="close-modal-btn" onClick={() => setShowFormModal(false)}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">ผู้รับบริการ <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <select 
                      className="form-control"
                      value={selectedHn}
                      onChange={(e) => setSelectedHn(e.target.value)}
                      required
                      disabled={isEditing} // ไม่อนุญาตแก้ไขผู้ป่วยเพื่อรักษากฎความสมบูรณ์ของรหัสตรวจ
                    >
                      <option value="">-- เลือกผู้รับบริการ --</option>
                      {patients.map(p => (
                        <option key={p.hn} value={p.hn}>
                          HN: {p.hn} | น้อง{p.nickname} ({p.title}{p.firstname})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">วันที่ประเมิน <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={evalDate} 
                      onChange={(e) => setEvalDate(e.target.value)} 
                      required 
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">นักกิจกรรมบำบัดผู้ประเมิน <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <select
                      className="form-control"
                      value={therapistId}
                      onChange={(e) => setTherapistId(e.target.value)}
                      required
                    >
                      <option value="">-- เลือกนักกิจกรรมบำบัดผู้ประเมิน --</option>
                      {therapists.map(t => (
                        <option key={t.id} value={t.id}>
                          ครู{t.nickname} | {t.fullname} (ใบอนุญาต: {t.licenseNo || 'ไม่มี'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedHn && (
                  <div style={{ 
                    backgroundColor: 'var(--light)', 
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem',
                    fontSize: '0.85rem',
                    color: 'var(--dark)'
                  }}>
                    <strong>ข้อมูลเด็ก:</strong> อายุ ณ ปัจจุบัน คือ <strong>{patientAgeInfo.text}</strong>
                    {patientAgeInfo.years < 6 && (
                      <span style={{ color: 'var(--danger)', display: 'block', marginTop: '0.25rem', fontWeight: 500 }}>
                        ⚠️ น้องอายุน้อยกว่า 6 ปี: ฟังก์ชัน Sensory Test จะถูกระงับ (Disabled) อัตโนมัติ
                      </span>
                    )}
                  </div>
                )}

                {/* 1. พัฒนาการ 4 ด้าน */}
                <div>
                  <div className="assessment-section-title">พัฒนาการ 4 ด้านพื้นฐาน</div>
                  <div className="development-grid">
                    <div className="form-group">
                      <label className="form-label">กล้ามเนื้อมัดใหญ่ (GM)</label>
                      <select className="form-control" value={gm} onChange={(e) => setGm(e.target.value)}>
                        <option value="สมวัย">สมวัย</option>
                        <option value="ล่าช้า">ล่าช้า</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">กล้ามเนื้อมัดเล็ก (FM)</label>
                      <select className="form-control" value={fm} onChange={(e) => setFm(e.target.value)}>
                        <option value="สมวัย">สมวัย</option>
                        <option value="ล่าช้า">ล่าช้า</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">ด้านภาษา (Language)</label>
                      <select className="form-control" value={language} onChange={(e) => setLanguage(e.target.value)}>
                        <option value="สมวัย">สมวัย</option>
                        <option value="ล่าช้า">ล่าช้า</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">ด้านสังคม (Social)</label>
                      <select className="form-control" value={social} onChange={(e) => setSocial(e.target.value)}>
                        <option value="สมวัย">สมวัย</option>
                        <option value="ล่าช้า">ล่าช้า</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. Sensory Test */}
                <div style={{ opacity: isSensoryEnabled ? 1 : 0.6 }}>
                  <div className="assessment-section-title">
                    Sensory Test 6 ด้าน {!isSensoryEnabled && '(เฉพาะเด็กอายุ 6 ปีขึ้นไป)'}
                  </div>
                  <div className="sensory-grid">
                    <div className="form-group">
                      <label className="form-label">สัมผัส (Tactile)</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        min="0" max="50"
                        disabled={!isSensoryEnabled} 
                        value={tactile} 
                        onChange={(e) => setTactile(e.target.value)} 
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">การทรงตัว (Vestibular)</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        min="0" max="50"
                        disabled={!isSensoryEnabled} 
                        value={vestibular} 
                        onChange={(e) => setVestibular(e.target.value)} 
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">ข้อต่อ/กล้ามเนื้อ (Proprio)</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        min="0" max="50"
                        disabled={!isSensoryEnabled} 
                        value={proprioceptive} 
                        onChange={(e) => setProprioceptive(e.target.value)} 
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">การมองเห็น (Visual)</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        min="0" max="50"
                        disabled={!isSensoryEnabled} 
                        value={visual} 
                        onChange={(e) => setVisual(e.target.value)} 
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">การได้ยิน (Auditory)</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        min="0" max="50"
                        disabled={!isSensoryEnabled} 
                        value={auditory} 
                        onChange={(e) => setAuditory(e.target.value)} 
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">การเคลื่อนไหว (Movement)</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        min="0" max="50"
                        disabled={!isSensoryEnabled} 
                        value={movement} 
                        onChange={(e) => setMovement(e.target.value)} 
                      />
                    </div>
                  </div>
                  
                  <div className="form-group" style={{ maxWidth: '200px' }}>
                    <label className="form-label">คะแนนรวมประสาทสัมผัส</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      readOnly 
                      value={sensoryTotal}
                      style={{ backgroundColor: '#f5f5f5', fontWeight: 700, color: 'var(--secondary)' }} 
                    />
                  </div>
                </div>

                {/* 3. SNAP-IV */}
                <div>
                  <div className="assessment-section-title">แบบประเมินพฤติกรรม SNAP-IV (คะแนนดิบ)</div>
                  <div className="snap-grid">
                    <div className="form-group">
                      <label className="form-label">
                        ขาดสมาธิ (Inattention) 
                        <span style={{ 
                          fontSize: '0.75rem', 
                          display: 'block', 
                          color: snapEvaluation.inattentionStatus === 'เสี่ยง' ? 'var(--danger)' : 'var(--success)' 
                        }}>
                          แปลผล: {snapEvaluation.inattentionStatus} (เกณฑ์ ≥16)
                        </span>
                      </label>
                      <input 
                        type="number" 
                        className="form-control" 
                        min="0" max="27"
                        value={snapInattention} 
                        onChange={(e) => setSnapInattention(Number(e.target.value))} 
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        ซน/วู่วาม (Hyperactive)
                        <span style={{ 
                          fontSize: '0.75rem', 
                          display: 'block', 
                          color: snapEvaluation.hyperactivityStatus === 'เสี่ยง' ? 'var(--danger)' : 'var(--success)' 
                        }}>
                          แปลผล: {snapEvaluation.hyperactivityStatus} (เกณฑ์ ≥13)
                        </span>
                      </label>
                      <input 
                        type="number" 
                        className="form-control" 
                        min="0" max="27"
                        value={snapHyperactivity} 
                        onChange={(e) => setSnapHyperactivity(Number(e.target.value))} 
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        ดื้อ/ต่อต้าน (Oppositional)
                        <span style={{ 
                          fontSize: '0.75rem', 
                          display: 'block', 
                          color: snapEvaluation.oppositionalStatus === 'เสี่ยง' ? 'var(--danger)' : 'var(--success)' 
                        }}>
                          แปลผล: {snapEvaluation.oppositionalStatus} (เกณฑ์ ≥15)
                        </span>
                      </label>
                      <input 
                        type="number" 
                        className="form-control" 
                        min="0" max="24"
                        value={snapOppositional} 
                        onChange={(e) => setSnapOppositional(Number(e.target.value))} 
                      />
                    </div>
                  </div>
                </div>

              </div>
              
              <div className="modal-footer">
                <button type="submit" className="btn btn-secondary">
                  {isEditing ? 'บันทึกการแก้ไข' : 'บันทึกใบประเมิน'}
                </button>
                <button type="button" className="btn btn-light" onClick={() => setShowFormModal(false)}>
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- modal ดูข้อมูลการประเมินแบบอ่านอย่างเดียว --- */}
      {showViewModal && viewingAssessment && (
        <div className="modal-overlay">
          <div className="modal-content-wrapper" style={{ maxWidth: '750px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--secondary)' }}>
                รายละเอียดผลการประเมินพัฒนาการ ({viewingAssessment.id})
              </h2>
              <button className="close-modal-btn" onClick={() => setShowViewModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* ข้อมูลทั่วไปผู้รับบริการ */}
              <div className="card-2xl" style={{ backgroundColor: 'var(--light)', border: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--dark)' }}>
                  ข้อมูลทั่วไปผู้รับบริการ
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', fontSize: '0.9rem' }}>
                  <div><strong>ชื่อ-สกุล:</strong> {viewingAssessment.patientName}</div>
                  <div><strong>ชื่อเล่น:</strong> น้อง{viewingAssessment.patientNickname || '-'}</div>
                  <div><strong>รหัส HN:</strong> {viewingAssessment.hn}</div>
                  <div><strong>วันที่ประเมิน:</strong> {new Date(viewingAssessment.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                </div>
              </div>

              {/* 1. พัฒนาการ 4 ด้าน */}
              <div>
                <h3 className="assessment-section-title">สรุปผลพัฒนาการ 4 ด้านพื้นฐาน</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                  <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--white)', border: '1px solid var(--border)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--dark-light)', fontWeight: 600 }}>กล้ามเนื้อมัดใหญ่ (GM)</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700, color: viewingAssessment.gm === 'สมวัย' ? 'var(--success)' : 'var(--danger)', marginTop: '0.25rem' }}>{viewingAssessment.gm}</div>
                  </div>
                  <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--white)', border: '1px solid var(--border)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--dark-light)', fontWeight: 600 }}>กล้ามเนื้อมัดเล็ก (FM)</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700, color: viewingAssessment.fm === 'สมวัย' ? 'var(--success)' : 'var(--danger)', marginTop: '0.25rem' }}>{viewingAssessment.fm}</div>
                  </div>
                  <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--white)', border: '1px solid var(--border)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--dark-light)', fontWeight: 600 }}>ด้านภาษา (Language)</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700, color: viewingAssessment.language === 'สมวัย' ? 'var(--success)' : 'var(--danger)', marginTop: '0.25rem' }}>{viewingAssessment.language}</div>
                  </div>
                  <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--white)', border: '1px solid var(--border)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--dark-light)', fontWeight: 600 }}>ด้านสังคม (Social)</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700, color: viewingAssessment.social === 'สมวัย' ? 'var(--success)' : 'var(--danger)', marginTop: '0.25rem' }}>{viewingAssessment.social}</div>
                  </div>
                </div>
              </div>

              {/* 2. Sensory Test */}
              <div>
                <h3 className="assessment-section-title">สรุปผลการประเมินระบบประสาทสัมผัส (Sensory Profile Test)</h3>
                {viewingAssessment.sensoryScores && viewingAssessment.sensoryScores.total > 0 ? (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
                      <div style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--white)' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--dark-light)' }}>สัมผัส (Tactile):</span> <strong style={{ float: 'right' }}>{viewingAssessment.sensoryScores.tactile} / 50</strong>
                      </div>
                      <div style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--white)' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--dark-light)' }}>การทรงตัว (Vestibular):</span> <strong style={{ float: 'right' }}>{viewingAssessment.sensoryScores.vestibular} / 50</strong>
                      </div>
                      <div style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--white)' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--dark-light)' }}>ข้อต่อ/กล้ามเนื้อ (Proprio):</span> <strong style={{ float: 'right' }}>{viewingAssessment.sensoryScores.proprioceptive} / 50</strong>
                      </div>
                      <div style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--white)' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--dark-light)' }}>การมองเห็น (Visual):</span> <strong style={{ float: 'right' }}>{viewingAssessment.sensoryScores.visual} / 50</strong>
                      </div>
                      <div style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--white)' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--dark-light)' }}>การได้ยิน (Auditory):</span> <strong style={{ float: 'right' }}>{viewingAssessment.sensoryScores.auditory} / 50</strong>
                      </div>
                      <div style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--white)' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--dark-light)' }}>การเคลื่อนไหว (Movement):</span> <strong style={{ float: 'right' }}>{viewingAssessment.sensoryScores.movement} / 50</strong>
                      </div>
                    </div>
                    <div style={{ backgroundColor: 'var(--light)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: 'var(--dark)' }}>คะแนนรวมการตอบสนองระบบประสาทสัมผัส:</strong>
                      <strong style={{ color: 'var(--secondary)', fontSize: '1.2rem' }}>{viewingAssessment.sensoryScores.total} / 300</strong>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--dark-light)', backgroundColor: '#fcfcfc', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
                    * ผู้รับการประเมินอายุน้อยกว่า 6 ปี ณ วันที่ประเมิน จึงไม่ได้ทำการประเมินระบบประสาทสัมผัส (Sensory Profile Test)
                  </div>
                )}
              </div>

              {/* 3. SNAP-IV */}
              <div>
                <h3 className="assessment-section-title">แบบประเมินพฤติกรรมเสี่ยง SNAP-IV</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                  <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--white)', border: '1px solid var(--border)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--dark-light)', fontWeight: 600 }}>สมาธิสั้น (Inattention)</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.25rem' }}>{viewingAssessment.snapIV?.inattention} / 27</div>
                    <div style={{ fontSize: '0.8rem', color: viewingAssessment.snapIV?.inattentionStatus === 'เสี่ยง' ? 'var(--danger)' : 'var(--success)', fontWeight: 700, marginTop: '0.25rem' }}>
                      แปลผล: {viewingAssessment.snapIV?.inattentionStatus} (เกณฑ์ ≥16)
                    </div>
                  </div>
                  <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--white)', border: '1px solid var(--border)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--dark-light)', fontWeight: 600 }}>ซน/วู่วาม (Hyperactive)</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.25rem' }}>{viewingAssessment.snapIV?.hyperactivity} / 27</div>
                    <div style={{ fontSize: '0.8rem', color: viewingAssessment.snapIV?.hyperactivityStatus === 'เสี่ยง' ? 'var(--danger)' : 'var(--success)', fontWeight: 700, marginTop: '0.25rem' }}>
                      แปลผล: {viewingAssessment.snapIV?.hyperactivityStatus} (เกณฑ์ ≥13)
                    </div>
                  </div>
                  <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--white)', border: '1px solid var(--border)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--dark-light)', fontWeight: 600 }}>ดื้อ/ต่อต้าน (Oppositional)</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.25rem' }}>{viewingAssessment.snapIV?.oppositional} / 24</div>
                    <div style={{ fontSize: '0.8rem', color: viewingAssessment.snapIV?.oppositionalStatus === 'เสี่ยง' ? 'var(--danger)' : 'var(--success)', fontWeight: 700, marginTop: '0.25rem' }}>
                      แปลผล: {viewingAssessment.snapIV?.oppositionalStatus} (เกณฑ์ ≥15)
                    </div>
                  </div>
                </div>
              </div>

            </div>
            <div className="modal-footer">
              <button className="btn btn-light" onClick={() => setShowViewModal(false)}>
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
