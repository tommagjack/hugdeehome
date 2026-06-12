import React, { useRef } from 'react';
import { Printer, X } from 'lucide-react';
import html2canvas from 'html2canvas';
import { formatPatientNickname, parseDateToAD } from '../utils/format';

export default function PDFViewer({ 
  documentType, 
  documentData, 
  clinicInfo, 
  patients, 
  therapists,
  bankAccounts = [],
  users = [],
  onClose 
}) {
  const documentRef = useRef();

  // จัดการพิมพ์โดยตรงผ่านเบราว์เซอร์ (พิมพ์หน้าต่างเว็บบราวเซอร์ที่ถูกล้างเลย์เอาต์ด้วย CSS Print)
  const handlePrint = () => {
    window.print();
  };

  // ดึงวันเกิดภาษาไทย
  const formatDateTh = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  // ดึงชื่อคุณครู
  const getTherapistName = (id) => {
    const t = therapists.find(item => item.id === id);
    return t ? `${t.fullname} (${t.nickname})` : id;
  };

  // ค้นหารายละเอียดผู้ป่วย
  const getPatientInfo = (hn) => {
    const p = patients.find(item => item.hn === hn);
    if (!p) return { fullname: `HN ${hn}`, nickname: '' };
    const cleanTitle = (p.title || '').replace(/\$/g, '');
    const cleanFirstname = (p.firstname || '').replace(/\$/g, '');
    const cleanLastname = (p.lastname || '').replace(/\$/g, '');
    return {
      fullname: `${cleanTitle}${cleanFirstname} ${cleanLastname}`,
      nickname: (p.nickname || '').replace(/\$/g, ''),
      gender: p.gender,
      dob: p.dob,
      guardian: (p.guardian || '').replace(/\$/g, ''),
      phone: p.phone,
      allergies: p.allergies,
      allergiesDetails: p.allergiesDetails,
      conditions: p.conditions,
      conditionsDetails: p.conditionsDetails,
      worries: p.worries,
      channels: p.channels,
      channelsOtherDetails: p.channelsOtherDetails
    };
  };

  const renderClinicHeaderLeftText = (titleSize = '1.35rem', subSize = '0.9rem') => {
    const name = clinicInfo.name || '';
    const keyword = "คลินิกการประกอบโรคศิลปะ";
    const index = name.indexOf(keyword);
    
    if (index !== -1) {
      const title = name.substring(0, index).trim();
      const sub = name.substring(index).trim();
      return (
        <>
          <span className="a4-clinic-name" style={{ fontSize: titleSize, fontWeight: 700, color: 'var(--secondary)' }}>{title}</span>
          <span className="a4-clinic-subtitle" style={{ fontSize: subSize, color: 'var(--dark-light)', marginTop: '2px', fontWeight: 500 }}>{sub}</span>
        </>
      );
    }
    return (
      <>
        <span className="a4-clinic-name" style={{ fontSize: titleSize, fontWeight: 700, color: 'var(--secondary)' }}>{name}</span>
        <span className="a4-clinic-subtitle" style={{ fontSize: subSize, color: 'var(--dark-light)', marginTop: '2px', fontWeight: 500 }}>คลินิกการประกอบโรคศิลปะสาขากิจกรรมบำบัด</span>
      </>
    );
  };

  // --- 1. เอกสารทะเบียนประวัติผู้รับบริการ ---
  const renderPatientProfile = () => {
    const p = documentData; // ผ่านตัวแปรผู้ป่วยมาเลย
    
    // คำนวณอายุอ้างอิงวันที่พิมพ์ (5 มิ.ย. 2026)
    const birthDate = parseDateToAD(p.dob);
    const normalizedBirthYear = birthDate ? birthDate.getFullYear() : 0;
    const today = new Date('2026-06-05');
    let years = birthDate ? (today.getFullYear() - normalizedBirthYear) : 0;
    let months = birthDate ? (today.getMonth() - birthDate.getMonth()) : 0;
    if (birthDate && (months < 0 || (months === 0 && today.getDate() < birthDate.getDate()))) {
      years--;
      months += 12;
    }
    if (birthDate && today.getDate() < birthDate.getDate()) {
      months--;
    }
    if (months < 0) months = 11;

    const cleanTitle = (p.title || '').replace(/\$/g, '');
    const cleanFirstname = (p.firstname || '').replace(/\$/g, '');
    const cleanLastname = (p.lastname || '').replace(/\$/g, '');
    
    return (
      <div className="a4-document" ref={documentRef} id="printable-a4-area">
        {/* หัวกระดาษมาตรฐาน */}
        <div className="a4-header">
          <div className="a4-header-left">
            <div className="a4-logo-circle">
              {clinicInfo.logoUrl ? <img src={clinicInfo.logoUrl} alt="Logo" /> : <span>HUG</span>}
            </div>
            <div className="a4-clinic-details">
              {renderClinicHeaderLeftText('1.35rem', '0.9rem')}
              {clinicInfo.licenseNo && <span className="a4-clinic-subtext">ใบอนุญาตเลขที่: {clinicInfo.licenseNo}</span>}
              <span className="a4-clinic-subtext">ที่อยู่: {clinicInfo.address}</span>
              <span className="a4-clinic-subtext">โทร: {clinicInfo.phone} | Line: {clinicInfo.lineId}</span>
            </div>
          </div>
          <div className="a4-header-right">
            <span className="a4-doc-type-th">ทะเบียนประวัติผู้รับบริการ</span>
            <span className="a4-doc-type-en">Patient Registration Form</span>
            <div className="a4-doc-meta" style={{ marginTop: '10px' }}>
              <span className="a4-doc-meta-label">เลขที่ผู้ป่วย (HN):</span>
              <span className="a4-doc-meta-value" style={{ fontWeight: 700, fontSize: '1.1rem' }}>{p.hn}</span>
              <span className="a4-doc-meta-label">วันที่พิมพ์ประวัติ:</span>
              <span className="a4-doc-meta-value">05 มิถุนายน 2569</span>
            </div>
          </div>
        </div>

        {/* ข้อมูลทั่วไป */}
        <h3 className="a4-table-title">ข้อมูลประวัติทั่วไป (General Info)</h3>
        <div className="a4-patient-section">
          <div className="a4-data-item"><span className="a4-data-label">ชื่อ-นามสกุล:</span><span className="a4-data-value">{cleanTitle}{cleanFirstname} {cleanLastname}</span></div>
          <div className="a4-data-item"><span className="a4-data-label">ชื่อเล่น:</span><span className="a4-data-value">{p.nickname ? formatPatientNickname(p.nickname) : '-'}</span></div>
          <div className="a4-data-item"><span className="a4-data-label">เพศ:</span><span className="a4-data-value">{p.gender}</span></div>
          <div className="a4-data-item"><span className="a4-data-label">วัน/เดือน/ปีเกิด:</span><span className="a4-data-value">{formatDateTh(p.dob)} (พ.ศ.)</span></div>
          <div className="a4-data-item"><span className="a4-data-label">อายุเมื่อเข้าตรวจ:</span><span className="a4-data-value">{years} ปี {months} เดือน</span></div>
          <div className="a4-data-item"><span className="a4-data-label">ชื่อผู้ปกครอง:</span><span className="a4-data-value">{p.guardian || 'ไม่ระบุ'}</span></div>
          <div className="a4-data-item" style={{ gridColumn: 'span 2' }}><span className="a4-data-label">เบอร์โทรศัพท์ติดต่อ:</span><span className="a4-data-value">{p.phone}</span></div>
          <div className="a4-data-item" style={{ gridColumn: 'span 2' }}><span className="a4-data-label">รู้จักคลินิกจากช่องทาง:</span><span className="a4-data-value">
            {p.channels ? p.channels.map(c => c === 'อื่นๆ' ? `อื่นๆ (${p.channelsOtherDetails || '-'})` : c).join(', ') : '-'}
          </span></div>
        </div>

        {/* ข้อมูลสุขภาพและการแพ้ */}
        <h3 className="a4-table-title">ข้อมูลประวัติสุขภาพและทางการแพทย์</h3>
        <table className="a4-table">
          <thead>
            <tr>
              <th style={{ width: '40%' }}>หัวข้อประเมิน</th>
              <th style={{ width: '15%' }}>สถานะ</th>
              <th style={{ width: '45%' }}>รายละเอียดเพิ่มเติม</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>ประวัติการแพ้ยา / แพ้อาหาร</strong></td>
              <td>
                <span style={{ color: p.allergies === 'มี' ? 'red' : 'green', fontWeight: 600 }}>
                  {p.allergies}
                </span>
              </td>
              <td>{p.allergies === 'มี' ? p.allergiesDetails : 'ปฏิเสธการแพ้ยาและแพ้อาหาร'}</td>
            </tr>
            <tr>
              <td><strong>โรคประจำตัว / ข้อจำกัดด้านสุขภาพ</strong></td>
              <td>
                <span style={{ color: p.conditions === 'มี' ? 'orange' : 'green', fontWeight: 600 }}>
                  {p.conditions}
                </span>
              </td>
              <td>{p.conditions === 'มี' ? p.conditionsDetails : 'ไม่มีโรคประจำตัว'}</td>
            </tr>
          </tbody>
        </table>

        {/* พฤติกรรมที่กังวล */}
        <h3 className="a4-table-title">อาการหรือพฤติกรรมที่ผู้ปกครองมีความกังวล (Concerns & Behaviors)</h3>
        <div className="a4-text-area-box" style={{ minHeight: '120px', lineHeight: 1.6 }}>
          {p.worries || 'ไม่ได้ระบุพฤติกรรมหรือความกังวลเป็นพิเศษ'}
        </div>

        <div className="a4-receipt-signatures" style={{ marginTop: '80px' }}>
          <div className="a4-sig-line-container">
            <div className="a4-sig-line" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '3px', fontWeight: 600 }}>
              {p.createdBy || ''}
            </div>
            {p.createdBy ? (
              <span className="a4-sig-label">ผู้บันทึกประวัติ</span>
            ) : (
              <span className="a4-sig-label">ลงชื่อ.............................................................. ผู้บันทึกประวัติ</span>
            )}
            <span className="a4-sig-label" style={{ fontSize: '9px', marginTop: '2px' }}>
              {p.createdBy ? `( ${p.createdBy} )` : ''}
            </span>
          </div>
          <div className="a4-sig-line-container">
            <div className="a4-sig-line"></div>
            <span className="a4-sig-label">ลงชื่อ.............................................................. ผู้ปกครอง / พยาน</span>
            <span className="a4-sig-label" style={{ fontSize: '9px', marginTop: '2px' }}>(ผู้ให้ข้อมูลประวัติการรักษาเบื้องต้น)</span>
          </div>
        </div>
      </div>
    );
  };

  // --- 2. เอกสารประเมินพัฒนาการ (HDA) ---
  const renderAssessmentReport = () => {
    const item = documentData; // ข้อมูลใบประเมิน
    const pInfo = getPatientInfo(item.hn);

    const patientObj = patients.find(p => p.hn === item.hn);
    let isSensoryEnabled = false;
    if (patientObj?.dob) {
      const birthDate = parseDateToAD(patientObj.dob);
      if (birthDate) {
        const evalDate = new Date(item.date);
        let years = evalDate.getFullYear() - birthDate.getFullYear();
        let months = evalDate.getMonth() - birthDate.getMonth();
        if (months < 0 || (months === 0 && evalDate.getDate() < birthDate.getDate())) {
          years--;
        }
        isSensoryEnabled = years >= 6;
      }
    }

    return (
      <div className="a4-document" ref={documentRef} id="printable-a4-area" style={{ padding: '10mm 15mm 15mm 15mm', minHeight: '297mm' }}>
        {/* หัวกระดาษมาตรฐาน */}
        <div className="a4-header">
          <div className="a4-header-left" style={{ width: '55%' }}>
            <div className="a4-logo-circle">
              {clinicInfo.logoUrl ? <img src={clinicInfo.logoUrl} alt="Logo" /> : <span>HUG</span>}
            </div>
            <div className="a4-clinic-details">
              {renderClinicHeaderLeftText('1.35rem', '0.9rem')}
              {clinicInfo.licenseNo && <span className="a4-clinic-subtext">ใบอนุญาตเลขที่: {clinicInfo.licenseNo}</span>}
              <span className="a4-clinic-subtext">ที่อยู่: {clinicInfo.address}</span>
            </div>
          </div>
          <div className="a4-header-right" style={{ width: '45%' }}>
            <span className="a4-doc-type-th" style={{ whiteSpace: 'nowrap', fontSize: '1.2rem', display: 'block' }}>รายงานผลประเมินพัฒนาการ</span>
            <span className="a4-doc-type-en">Development Assessment Report</span>
            <div className="a4-doc-meta" style={{ marginTop: '10px' }}>
              {/* บังคับเลขที่รันตามสเปก HDA[ปี2หลัก]-[HN] */}
              <span className="a4-doc-meta-label">เลขที่ใบประเมิน:</span>
              <span className="a4-doc-meta-value" style={{ fontWeight: 700, fontFamily: 'monospace' }}>{item.id}</span>
              <span className="a4-doc-meta-label">วันที่รับประเมิน:</span>
              <span className="a4-doc-meta-value">{formatDateTh(item.date)}</span>
            </div>
          </div>
        </div>

        {/* ข้อมูลเด็ก */}
        <div className="a4-patient-section">
          <div className="a4-data-item"><span className="a4-data-label">ชื่อผู้รับการประเมิน:</span><span className="a4-data-value">{pInfo.fullname} ({pInfo.nickname ? formatPatientNickname(pInfo.nickname) : '-'})</span></div>
          <div className="a4-data-item"><span className="a4-data-label">รหัส HN:</span><span className="a4-data-value">{item.hn}</span></div>
          <div className="a4-data-item"><span className="a4-data-label">เพศ:</span><span className="a4-data-value">{pInfo.gender}</span></div>
          <div className="a4-data-item"><span className="a4-data-label">ผู้ปกครองผู้ให้ข้อมูล:</span><span className="a4-data-value">{pInfo.guardian || '-'}</span></div>
        </div>

        {/* ส่วนที่ 1: พัฒนาการ 4 ด้าน */}
        <h3 className="a4-table-title">ส่วนที่ 1: สรุปผลพัฒนาการ 4 ด้านพื้นฐาน</h3>
        <table className="a4-table">
          <thead>
            <tr>
              <th>ด้านพัฒนาการที่ประเมิน</th>
              <th style={{ textAlign: 'center', width: '30%' }}>ผลการประเมินเบื้องต้น</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>พัฒนาการด้านกล้ามเนื้อมัดใหญ่ (Gross Motor Skills: GM)</td>
              <td style={{ textAlign: 'center', fontWeight: 600, color: item.gm === 'สมวัย' ? 'green' : 'red' }}>{item.gm}</td>
            </tr>
            <tr>
              <td>พัฒนาการด้านกล้ามเนื้อมัดเล็กและการประสานสัมพันธ์ (Fine Motor Skills: FM)</td>
              <td style={{ textAlign: 'center', fontWeight: 600, color: item.fm === 'สมวัย' ? 'green' : 'red' }}>{item.fm}</td>
            </tr>
            <tr>
              <td>พัฒนาการด้านภาษาและการสื่อสาร (Language & Communication Skills)</td>
              <td style={{ textAlign: 'center', fontWeight: 600, color: item.language === 'สมวัย' ? 'green' : 'red' }}>{item.language}</td>
            </tr>
            <tr>
              <td>พัฒนาการด้านสังคมและการช่วยเหลือตนเอง (Personal-Social Skills)</td>
              <td style={{ textAlign: 'center', fontWeight: 600, color: item.social === 'สมวัย' ? 'green' : 'red' }}>{item.social}</td>
            </tr>
          </tbody>
        </table>

        {/* ส่วนที่ 2: Sensory Test (เฉพาะเด็กอายุ 6 ปีขึ้นไป) */}
        {isSensoryEnabled ? (
          <div>
            <h3 className="a4-table-title">ส่วนที่ 2: สรุปผลการประเมินระบบประสาทความรู้สึก (Sensory Profile Test)</h3>
            <table className="a4-table">
              <thead>
                <tr>
                  <th>ระบบการรับความรู้สึกที่ตรวจวัด (Sensory Systems)</th>
                  <th style={{ textAlign: 'center', width: '30%' }}>คะแนนที่ได้ (ดิบ)</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>ระบบการรับภาพและการมองเห็น (Visual Processing)</td><td style={{ textAlign: 'center' }}>{item.sensoryScores?.visual ?? 0} / 50</td></tr>
                <tr><td>ระบบการได้ยินและการรับเสียง (Auditory Processing)</td><td style={{ textAlign: 'center' }}>{item.sensoryScores?.auditory ?? 0} / 50</td></tr>
                <tr><td>ระบบการเคลื่อนไหวและการควบคุมแกนกลาง (Movement Skills)</td><td style={{ textAlign: 'center' }}>{item.sensoryScores?.movement ?? 0} / 50</td></tr>
                <tr><td>ระบบการทรงตัวและระดับความตื่นตัว (Vestibular System)</td><td style={{ textAlign: 'center' }}>{item.sensoryScores?.vestibular ?? 0} / 50</td></tr>
                <tr><td>ระบบการรับรู้เอ็นข้อต่อและตำแหน่งในอวกาศ (Proprioceptive System)</td><td style={{ textAlign: 'center' }}>{item.sensoryScores?.proprioceptive ?? 0} / 50</td></tr>
                <tr><td>ระบบการรับสัมผัสทางผิวหนัง (Tactile System)</td><td style={{ textAlign: 'center' }}>{item.sensoryScores?.tactile ?? 0} / 50</td></tr>
                <tr style={{ backgroundColor: '#f9f9f9', fontWeight: 700 }}>
                  <td><strong>คะแนนรวมการตอบสนองระบบประสาทสัมผัส (Total Sensory Score)</strong></td>
                  <td style={{ textAlign: 'center', color: 'var(--secondary)' }}>{item.sensoryScores?.total ?? 0} / 300</td>
                </tr>
                <tr style={{ backgroundColor: '#f9f9f9', fontWeight: 700 }}>
                  <td><strong>คะแนน (เด็ก 6 ปี+) (Score for Child 6 Years+)</strong></td>
                  <td style={{ textAlign: 'center', color: 'var(--secondary)' }}>{item.sensoryScores?.score6YearsPlus ?? 0}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '10px 0', fontSize: '11px', color: '#666', fontStyle: 'italic' }}>
            * ผู้รับการประเมินอายุน้อยกว่า 6 ปี ณ วันที่ประเมิน จึงไม่เข้าข่ายเกณฑ์ประเมิน Sensory Profile Test
          </div>
        )}

        {/* ส่วนที่ 3: สรุปผล SNAP-IV (บังคับอยู่ท้ายเอกสารตามสเปก) */}
        <h3 className="a4-table-title">ส่วนที่ 3: สรุปเกณฑ์การคัดกรองพฤติกรรมเสี่ยง (SNAP-IV Rating Scale)</h3>
        <table className="a4-table">
          <thead>
            <tr>
              <th>กลุ่มพฤติกรรมตามเกณฑ์ SNAP-IV</th>
              <th style={{ textAlign: 'center', width: '25%' }}>คะแนนรวมที่ได้</th>
              <th style={{ textAlign: 'center', width: '25%' }}>การประเมินระดับความเสี่ยง</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>กลุ่มสมาธิบกพร่อง (Inattention - ขาดสมาธิ)</td>
              <td style={{ textAlign: 'center' }}>{item.snapIV.inattention} / 27</td>
              <td style={{ textAlign: 'center', fontWeight: 700, color: item.snapIV.inattentionStatus === 'เสี่ยง' ? 'red' : 'green' }}>
                {item.snapIV.inattentionStatus === 'เสี่ยง' ? '⚠️ เสี่ยงสูง (เกณฑ์ ≥16)' : '✓ ปกติ'}
              </td>
            </tr>
            <tr>
              <td>กลุ่มซน วู่วาม อยู่ไม่นิ่ง (Hyperactivity / Impulsivity)</td>
              <td style={{ textAlign: 'center' }}>{item.snapIV.hyperactivity} / 27</td>
              <td style={{ textAlign: 'center', fontWeight: 700, color: item.snapIV.hyperactivityStatus === 'เสี่ยง' ? 'red' : 'green' }}>
                {item.snapIV.hyperactivityStatus === 'เสี่ยง' ? '⚠️ เสี่ยงสูง (เกณฑ์ ≥13)' : '✓ ปกติ'}
              </td>
            </tr>
            <tr>
              <td>กลุ่มพฤติกรรมดื้อ ต่อต้าน (Oppositional Defiant Disorder)</td>
              <td style={{ textAlign: 'center' }}>{item.snapIV.oppositional} / 24</td>
              <td style={{ textAlign: 'center', fontWeight: 700, color: item.snapIV.oppositionalStatus === 'เสี่ยง' ? 'red' : 'green' }}>
                {item.snapIV.oppositionalStatus === 'เสี่ยง' ? '⚠️ เสี่ยงสูง (เกณฑ์ ≥15)' : '✓ ปกติ'}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ส่วนที่ 4: ความเห็นเพิ่มเติม */}
        <h3 className="a4-table-title">ส่วนที่ 4: ความเห็นเพิ่มเติมของนักกิจกรรมบำบัด</h3>
        <div className="a4-text-area-box" style={{ minHeight: '80px', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: '20px' }}>
          {item.comment || '-'}
        </div>

        {/* ลายเซ็นครูประเมิน */}
        {(() => {
          const therapist = therapists ? therapists.find(t => t.id === item.therapistId) : null;
          return (
            <div className="a4-receipt-signatures" style={{ marginTop: '80px' }}>
              <div className="a4-sig-line-container" style={{ gridColumn: '2 / span 1' }}>
                <div className="a4-sig-line" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '3px', fontWeight: 600 }}>
                  {therapist ? therapist.fullname : ''}
                </div>
                {therapist ? (
                  <span className="a4-sig-label">นักกิจกรรมบำบัดผู้ประเมิน</span>
                ) : (
                  <span className="a4-sig-label">ลงชื่อ.............................................................. นักกิจกรรมบำบัดผู้ประเมิน</span>
                )}
                <span className="a4-sig-label" style={{ fontSize: '10px', marginTop: '2px' }}>
                  {therapist ? `(เลขใบประกอบวิชาชีพ: ${therapist.licenseNo || 'ไม่มี'})` : '(ก.บ...................................................)'}
                </span>
              </div>
            </div>
          );
        })()}
      </div>
    );
  };

  // --- 3. เอกสารใบเสร็จ (HDR) หรือใบแจ้งหนี้ ---
  const renderReceipt = () => {
    const bill = documentData;
    const pInfo = getPatientInfo(bill.hn);
    
    const isDraft = bill.status === 'รอชำระเงิน';
    const isVoided = bill.status === 'ยกเลิก';

    // คำนวณยอดดิบในตารางสินค้า
    const itemsSubtotal = bill.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // ยอดลดสุทธิ
    let discountAmount = 0;
    if (bill.discountType === 'flat') {
      discountAmount = bill.discountValue;
    } else {
      discountAmount = (itemsSubtotal * bill.discountValue) / 100;
    }

    return (
      <div className="a4-document" ref={documentRef} id="printable-a4-area" style={{ paddingTop: '10mm' }}>
        {/* ลายน้ำ VOID แสดงข้อความทับตัวแดงตามสเปก */}
        {isVoided && <div className="void-watermark">ยกเลิกเอกสารนี้แล้ว (VOIDED)</div>}

        {/* หัวกระดาษมาตรฐาน */}
        <div className="a4-header">
          <div className="a4-header-left" style={{ width: '60%' }}>
            <div className="a4-logo-circle">
              {clinicInfo.logoUrl ? <img src={clinicInfo.logoUrl} alt="Logo" /> : <span>HUG</span>}
            </div>
            <div className="a4-clinic-details">
              {renderClinicHeaderLeftText('1.35rem', '0.9rem')}
              {clinicInfo.licenseNo && <span className="a4-clinic-subtext">ใบอนุญาตเลขที่: {clinicInfo.licenseNo}</span>}
              <span className="a4-clinic-subtext" style={{ whiteSpace: 'nowrap', display: 'block' }}>ที่อยู่: {clinicInfo.address}</span>
              <span className="a4-clinic-subtext">โทร: {clinicInfo.phone} | อีเมล: {clinicInfo.email}</span>
            </div>
          </div>
          <div className="a4-header-right" style={{ width: '40%' }}>
            {/* บังคับ: หากบิลรอชำระเงินให้ขึ้นชื่อเอกสารว่า "ใบแจ้งหนี้" */}
            <span className="a4-doc-type-th" style={{ 
              color: isDraft ? 'var(--dark)' : isVoided ? 'var(--danger)' : 'var(--secondary)',
              whiteSpace: 'nowrap',
              display: 'block'
            }}>
              {isDraft ? 'ใบแจ้งหนี้ / ใบเรียกเก็บเงิน' : 'ใบเสร็จรับเงิน'}
            </span>
            <span className="a4-doc-type-en" style={{ whiteSpace: 'nowrap', display: 'block' }}>{isDraft ? 'INVOICE / BILLING' : 'RECEIPT'}</span>
            
            <div className="a4-doc-meta" style={{ marginTop: '10px' }}>
              <span className="a4-doc-meta-label">เลขที่เอกสาร:</span>
              <span className="a4-doc-meta-value" style={{ fontWeight: 700, fontFamily: 'monospace' }}>{bill.id}</span>
              <span className="a4-doc-meta-label">วันที่ออกบิล:</span>
              <span className="a4-doc-meta-value">{formatDateTh(bill.date)}</span>
            </div>
          </div>
        </div>

        {/* ข้อมูลลูกค้าในใบเสร็จ */}
        <div className="a4-patient-section">
          <div className="a4-data-item"><span className="a4-data-label">ลูกค้า/ผู้รับบริการ:</span><span className="a4-data-value">{pInfo.fullname}</span></div>
          <div className="a4-data-item"><span className="a4-data-label">รหัสผู้ป่วย (HN):</span><span className="a4-data-value">{bill.hn} ({pInfo.nickname ? `น้อง${pInfo.nickname}` : 'ไม่มีชื่อเล่น'})</span></div>
          <div className="a4-data-item"><span className="a4-data-label">ผู้ปกครองติดต่อ:</span><span className="a4-data-value">{pInfo.guardian || '-'}</span></div>
          <div className="a4-data-item"><span className="a4-data-label">เบอร์โทรติดต่อ:</span><span className="a4-data-value">{pInfo.phone}</span></div>
        </div>

        {/* ตารางรายการสินค้า */}
        <table className="a4-table a4-receipt-table">
          <thead>
            <tr>
              <th style={{ width: '10%', textAlign: 'center' }}>ลำดับ</th>
              <th style={{ width: '50%', textAlign: 'left' }}>รายละเอียดบริการ / สินค้า</th>
              <th style={{ width: '12%', textAlign: 'center' }}>ราคาต่อหน่วย</th>
              <th style={{ width: '10%', textAlign: 'center' }}>จำนวน</th>
              {/* บังคับช่องคอลัมน์สุดท้ายมีระยะเว้นขอบ Padding-Right */}
              <th style={{ width: '18%', textAlign: 'right', paddingRight: '15px' }}>จำนวนเงิน (บาท)</th>
            </tr>
          </thead>
          <tbody>
            {bill.items.map((item, idx) => (
              <tr key={idx}>
                <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                <td>
                  <div style={{ fontWeight: 600 }}>{item.name}</div>
                  <div style={{ fontSize: '10px', color: '#666' }}>รหัสบริการ: {item.code} ({item.type})</div>
                </td>
                <td style={{ textAlign: 'center' }}>{item.price.toLocaleString()}</td>
                <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ textAlign: 'right', paddingRight: '15px' }}>{(item.price * item.quantity).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ยอดเงินสรุปท้ายบิล */}
        <div className="a4-receipt-summary">
          <div className="a4-receipt-summary-left">
            <strong>วิธีชำระเงิน:</strong> {bill.paymentMethod}<br/>
            {bill.bankAccountId && (() => {
              const bank = bankAccounts.find(b => b.id === bill.bankAccountId);
              return (
                <span>
                  <strong>โอนเข้าธนาคาร:</strong> {bank ? `${bank.bankName} เลขที่ ${bank.accountNo}` : bill.bankAccountId}
                  <br/>
                </span>
              );
            })()}
            {bill.slipUrl && <span><strong>ไฟล์สลิปอ้างอิง:</strong> {bill.slipUrl}<br/></span>}
            <div style={{ borderTop: '1px solid #ddd', marginTop: '10px', paddingTop: '5px' }}>
              <strong>คำชี้แจง:</strong> ใบแจ้งหนี้/ใบเสร็จนี้ออกโดยระบบจัดส่งข้อมูลอัตโนมัติคลินิก บ้านฮักดี หากมีข้อสงสัยหรือต้องการปรับแก้ไขข้อมูล สามารถติดต่อเจ้าหน้าที่การเงินคลินิกได้ทันที
            </div>
          </div>

          <div className="a4-receipt-summary-right">
            <div className="a4-summary-row">
              <span className="a4-summary-row-label">ยอดรวมสินค้า (Subtotal):</span>
              <span className="a4-summary-row-val">฿{itemsSubtotal.toLocaleString()}</span>
            </div>
            
            {discountAmount > 0 && (
              <div className="a4-summary-row" style={{ color: 'red' }}>
                <span className="a4-summary-row-label">ส่วนลด (Discount):</span>
                <span className="a4-summary-row-val">-฿{discountAmount.toLocaleString()}</span>
              </div>
            )}
            
            {/* บังคับคอลัมน์เงินช่องสุดท้ายตรงแนวกับกล่องสรุปยอดสุทธิเป๊ะๆ */}
            <div className="a4-summary-row total-row">
              <span className="a4-summary-row-label">{isDraft ? 'ยอดเรียกเก็บสุทธิ' : 'ยอดชำระเงินสุทธิ'}:</span>
              <span className="a4-summary-row-val">฿{bill.totalAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* ข้อความท้ายใบเสร็จตามสเปก */}
        <div style={{ textAlign: 'center', fontSize: '11px', color: '#555', marginTop: '30px', borderTop: '1px dashed #ccc', paddingTop: '10px' }}>
          "{clinicInfo.receiptFooter || 'ขอบคุณที่ใช้บริการ ฮักดีโฮม คลินิก'}"
        </div>

        {/* ลายเซ็นผู้รับเงิน */}
        <div className="a4-receipt-signatures" style={{ marginTop: '50px' }}>
          <div className="a4-sig-line-container">
            {/* มีตราสแตมป์คลินิกเป็นลายน้ำจางๆ ลอยอยู่ถ้าตั้งค่าไว้ */}
            {clinicInfo.stampUrl && <img src={clinicInfo.stampUrl} className="a4-sig-stamp" alt="Stamp" />}
            <div className="a4-sig-line" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '3px', fontWeight: 600 }}>
              {bill.createdBy || ''}
            </div>
            {bill.createdBy ? (
              <span className="a4-sig-label">ผู้รับเงิน / เจ้าหน้าที่</span>
            ) : (
              <span className="a4-sig-label">ลงชื่อ.............................................................. ผู้รับเงิน / เจ้าหน้าที่</span>
            )}
            <span className="a4-sig-label" style={{ fontSize: '9px', marginTop: '2px' }}>
              {bill.createdBy ? `( ${bill.createdBy} )` : '(ฝ่ายการเงิน คลินิก Hug Dee Home)'}
            </span>
          </div>

          <div className="a4-sig-line-container">
            <div className="a4-sig-line"></div>
            <span className="a4-sig-label">ลงชื่อ.............................................................. ผู้จ่ายเงิน / ผู้ปกครอง</span>
            <span className="a4-sig-label" style={{ fontSize: '9px', marginTop: '2px' }}>(ผู้ชำระยอด/รับบริการ)</span>
          </div>
        </div>
      </div>
    );
  };

  // --- 4. บันทึกผลการฝึก (OPD Card) ทั้ง 3 รูปแบบ ---
  const renderOPDCard = () => {
    const isBlank = documentType === 'opd_blank';
    const patientRaw = documentData?.patient;
    const patient = patientRaw ? {
      ...patientRaw,
      title: (patientRaw.title || '').replace(/\$/g, ''),
      firstname: (patientRaw.firstname || '').replace(/\$/g, ''),
      lastname: (patientRaw.lastname || '').replace(/\$/g, ''),
      nickname: (patientRaw.nickname || '').replace(/\$/g, '')
    } : null;
    const history = documentData?.history || [];

    const FIRST_PAGE_LIMIT = 8;
    const NEXT_PAGE_LIMIT = 15;

    const pages = [];

    if (isBlank) {
      // สำหรับพิมพ์เปล่า ให้สร้างกระดาษจำลอง 2 หน้าแรกเป็นมาตรฐานไว้
      pages.push({
        pageNum: 1,
        isFirstPage: true,
        items: Array(FIRST_PAGE_LIMIT).fill(0).map(() => ({ isEmpty: true }))
      });
      pages.push({
        pageNum: 2,
        isFirstPage: false,
        items: Array(NEXT_PAGE_LIMIT).fill(0).map(() => ({ isEmpty: true }))
      });
    } else {
      let currentIndex = 0;
      let pageNum = 1;

      if (history.length === 0) {
        pages.push({
          pageNum: 1,
          isFirstPage: true,
          items: Array(FIRST_PAGE_LIMIT).fill(0).map(() => ({ isEmpty: true }))
        });
      }

      while (currentIndex < history.length) {
        const isFirstPage = pageNum === 1;
        const limit = isFirstPage ? FIRST_PAGE_LIMIT : NEXT_PAGE_LIMIT;
        const chunk = history.slice(currentIndex, currentIndex + limit);

        // เติมช่องว่างให้เต็มความสูงหน้า A4 พอดี
        const filledChunk = [...chunk];
        while (filledChunk.length < limit) {
          filledChunk.push({ isEmpty: true });
        }

        pages.push({
          pageNum,
          isFirstPage,
          items: filledChunk
        });

        currentIndex += limit;
        pageNum++;
      }
    }

    // คำนวณอายุเด็ก
    let ageStr = '';
    if (patient?.dob) {
      const birthDate = parseDateToAD(patient.dob);
      const normalizedBirthYear = birthDate ? birthDate.getFullYear() : 0;
      const today = new Date('2026-06-05'); // อิงเวลาจำลอง
      let years = birthDate ? (today.getFullYear() - normalizedBirthYear) : 0;
      let months = birthDate ? (today.getMonth() - birthDate.getMonth()) : 0;
      if (birthDate && (months < 0 || (months === 0 && today.getDate() < birthDate.getDate()))) {
        years--;
        months += 12;
      }
      if (birthDate && today.getDate() < birthDate.getDate()) {
        months--;
      }
      if (months < 0) months = 11;
      ageStr = `${years} ปี ${months} เดือน`;
    }

    return (
      <div ref={documentRef} id="printable-a4-area" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        {pages.map((page, index) => (
          <div 
            key={index} 
            className="a4-document" 
            style={{ 
              backgroundColor: 'white', 
              padding: '30px 40px 20px 40px', 
              boxSizing: 'border-box', 
              display: 'flex', 
              flexDirection: 'column',
              minHeight: '297mm',
              width: '210mm',
              position: 'relative'
            }}
          >
            {page.isFirstPage ? (
              <div style={{ flexShrink: 0 }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '15px' }}>
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <div className="a4-logo-circle" style={{ width: '60px', height: '60px', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF8F1', border: '1px solid var(--border)' }}>
                      {clinicInfo.logoUrl ? <img src={clinicInfo.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontWeight: 'bold', fontSize: '0.8rem', color: 'var(--secondary)' }}>HUG</span>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {renderClinicHeaderLeftText('1.2rem', '0.8rem')}
                      {clinicInfo.licenseNo && <span style={{ fontSize: '9px', color: 'var(--dark-light)' }}>ใบอนุญาตเลขที่: {clinicInfo.licenseNo}</span>}
                      <span style={{ fontSize: '8.5px', color: 'var(--dark-light)', lineHeight: '1.3' }}>ที่อยู่: {clinicInfo.address}</span>
                      <span style={{ fontSize: '8.5px', color: 'var(--dark-light)' }}>โทร: {clinicInfo.phone} | Line: {clinicInfo.lineId}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--secondary)', letterSpacing: '1px', margin: 0 }}>OPD CARD</h2>
                    <span style={{ fontSize: '0.8rem', color: 'var(--dark-light)', fontWeight: 600 }}>บัตรบันทึกผลการฝึก</span>
                  </div>
                </div>

                {/* Section 1: ข้อมูลผู้รับบริการ */}
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--dark)', marginBottom: '10px', borderLeft: '3px solid var(--secondary)', paddingLeft: '8px', lineHeight: '1' }}>ส่วนที่ 1: ข้อมูลผู้รับบริการ</h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '10.5px', color: 'var(--dark)' }}>
                    <div style={{ display: 'flex', gap: '15px' }}>
                      <div style={{ flex: '1 1 20%', display: 'flex', alignItems: 'flex-end' }}>
                        <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap', marginRight: '6px' }}>HN:</span>
                        <div style={{ borderBottom: '1px dotted var(--dark-light)', flex: 1, paddingLeft: '4px', minHeight: '16px', fontWeight: 700 }}>{isBlank ? '' : patient?.hn}</div>
                      </div>
                      <div style={{ flex: '2 1 55%', display: 'flex', alignItems: 'flex-end' }}>
                        <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap', marginRight: '6px' }}>ชื่อ-สกุล:</span>
                        <div style={{ borderBottom: '1px dotted var(--dark-light)', flex: 1, paddingLeft: '4px', minHeight: '16px', fontWeight: 600 }}>{isBlank ? '' : `${patient?.title || ''}${patient?.firstname || ''} ${patient?.lastname || ''}`}</div>
                      </div>
                      <div style={{ flex: '1 1 25%', display: 'flex', alignItems: 'flex-end' }}>
                        <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap', marginRight: '6px' }}>ชื่อเล่น:</span>
                        <div style={{ borderBottom: '1px dotted var(--dark-light)', flex: 1, paddingLeft: '4px', minHeight: '16px', fontWeight: 600 }}>{isBlank ? '' : patient?.nickname}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '15px' }}>
                      <div style={{ flex: '2 1 50%', display: 'flex', alignItems: 'flex-end' }}>
                        <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap', marginRight: '6px' }}>วันเกิด:</span>
                        <div style={{ borderBottom: '1px dotted var(--dark-light)', flex: 1, paddingLeft: '4px', minHeight: '16px' }}>{isBlank ? '' : formatDateTh(patient?.dob)}</div>
                      </div>
                      <div style={{ flex: '1 1 25%', display: 'flex', alignItems: 'flex-end' }}>
                        <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap', marginRight: '6px' }}>อายุ:</span>
                        <div style={{ borderBottom: '1px dotted var(--dark-light)', flex: 1, paddingLeft: '4px', minHeight: '16px' }}>{isBlank ? '' : ageStr}</div>
                      </div>
                      <div style={{ flex: '1 1 25%', display: 'flex', alignItems: 'flex-end' }}>
                        <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap', marginRight: '6px' }}>เพศ:</span>
                        <div style={{ borderBottom: '1px dotted var(--dark-light)', flex: 1, paddingLeft: '4px', minHeight: '16px' }}>{isBlank ? '' : patient?.gender}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '15px' }}>
                      <div style={{ flex: '2 1 60%', display: 'flex', alignItems: 'flex-end' }}>
                        <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap', marginRight: '6px' }}>ชื่อผู้ปกครอง:</span>
                        <div style={{ borderBottom: '1px dotted var(--dark-light)', flex: 1, paddingLeft: '4px', minHeight: '16px' }}>{isBlank ? '' : patient?.guardian}</div>
                      </div>
                      <div style={{ flex: '1 1 40%', display: 'flex', alignItems: 'flex-end' }}>
                        <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap', marginRight: '6px' }}>เบอร์โทรศัพท์:</span>
                        <div style={{ borderBottom: '1px dotted var(--dark-light)', flex: 1, paddingLeft: '4px', minHeight: '16px' }}>{isBlank ? '' : patient?.phone}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: '2px' }}>
                      <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap', marginRight: '6px', paddingTop: '1px' }}>ประวัติการแพ้ยา/แพ้อาหาร:</span>
                      <div style={{ borderBottom: '1px dotted var(--dark-light)', flex: 1, paddingLeft: '4px', minHeight: '18px', color: !isBlank && patient?.allergies === 'มี' ? 'red' : 'inherit', fontWeight: !isBlank && patient?.allergies === 'มี' ? 600 : 'normal' }}>
                        {isBlank ? '' : (patient?.allergies === 'มี' ? patient?.allergiesDetails : 'ปฏิเสธการแพ้ยาและแพ้อาหาร')}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: '2px' }}>
                      <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap', marginRight: '6px', paddingTop: '1px' }}>อาการเบื้องต้น/ความกังวล:</span>
                      <div style={{ borderBottom: '1px dotted var(--dark-light)', flex: 1, paddingLeft: '4px', minHeight: '18px', lineHeight: '1.4' }}>
                        {isBlank ? '' : (patient?.worries || '-')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ flexShrink: 0, marginBottom: '12px', marginTop: '5px' }}>
                {/* Mini-header สำหรับหน้าถัดๆ ไป */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', fontSize: '9.5px', color: 'var(--dark-light)', borderBottom: '1.5px solid var(--dark)', paddingBottom: '6px', marginBottom: '10px' }}>
                  <div><span style={{ fontWeight: 'bold', marginRight: '4px' }}>HN:</span><span style={{ fontWeight: 700 }}>{isBlank ? '.....................' : patient?.hn}</span></div>
                  <div><span style={{ fontWeight: 'bold', marginRight: '4px' }}>ชื่อ-สกุล:</span><span style={{ fontWeight: 600 }}>{isBlank ? '..................................................' : `${patient?.title || ''}${patient?.firstname || ''} ${patient?.lastname || ''}`}</span></div>
                  <div><span style={{ fontWeight: 'bold', marginRight: '4px' }}>ชื่อเล่น:</span><span style={{ fontWeight: 600 }}>{isBlank ? '..............' : patient?.nickname}</span></div>
                  <div><span style={{ fontWeight: 'bold', marginRight: '4px' }}>ประวัติแพ้ยา:</span><span style={{ color: !isBlank && patient?.allergies === 'มี' ? 'red' : 'inherit', fontWeight: !isBlank && patient?.allergies === 'มี' ? 600 : 'normal' }}>{isBlank ? '....................................' : (patient?.allergies === 'มี' ? patient?.allergiesDetails : 'ปฏิเสธการแพ้ยา')}</span></div>
                </div>
              </div>
            )}

            {/* Section 2: ตารางประวัติ */}
            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px', color: 'var(--dark)' }}>
                <thead>
                  {page.pageNum === 1 && (
                    <tr>
                      <th colSpan="3" style={{ textAlign: 'left', paddingBottom: '6px', fontWeight: 'bold', fontSize: '12px', color: 'var(--dark)' }}>
                        ส่วนที่ 2: บันทึกผลการฝึกและพฤติกรรมระหว่างบำบัด
                      </th>
                    </tr>
                  )}
                  <tr style={{ borderTop: '2.5px solid var(--dark)', borderBottom: '2.5px solid var(--dark)' }}>
                    <th style={{ padding: '6px 4px', textAlign: 'left', width: '16%', fontWeight: 'bold' }}>วัน/เดือน/ปี</th>
                    <th style={{ padding: '6px 4px', textAlign: 'left', width: '66%', fontWeight: 'bold' }}>รายละเอียดผลการฝึก / พฤติกรรม / คำแนะนำผู้ปกครอง</th>
                    <th style={{ padding: '6px 4px', textAlign: 'center', width: '18%', fontWeight: 'bold' }}>ผู้ให้บริการฝึก</th>
                  </tr>
                </thead>
                <tbody>
                  {page.items.map((row, rIndex) => (
                    <tr key={rIndex} style={{ borderBottom: '1.2px solid var(--border)' }}>
                      {row.isEmpty ? (
                        <>
                          <td style={{ padding: '7px 4px', height: '40px' }}></td>
                          <td style={{ padding: '7px 4px', height: '40px' }}></td>
                          <td style={{ padding: '7px 4px', height: '40px' }}></td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: '7px 4px', verticalAlign: 'top', fontWeight: 500 }}>
                            {formatDateTh(row.date)}
                          </td>
                          <td style={{ padding: '7px 4px', verticalAlign: 'top', whiteSpace: 'pre-wrap', lineHeight: '1.45', textAlign: 'left' }}>
                            {row.details}
                          </td>
                          <td style={{ padding: '7px 4px', verticalAlign: 'top', textAlign: 'center', fontWeight: 500 }}>
                            {row.therapist}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* หน้าและหมายเหตุ */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '8.5px', color: 'var(--dark-light)', borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '15px' }}>
              <span>* กรุณาพกบัตรนี้มาทุกครั้งเพื่อความต่อเนื่องในการบริการ</span>
              <span>หน้าที่ {page.pageNum}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderAnnualHolidays = () => {
    const { year, list } = documentData;
    const thaiYear = year + 543;
    const clinicName = clinicInfo.name || 'บ้านฮักดี';
    const clinicType = clinicInfo.type || 'คลินิกการประกอบโรคศิลปะ สาขากิจกรรมบำบัด';
    
    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];

    const renderMonthCalendar = (monthIdx) => {
      const monthHolidays = list.filter(h => {
        const d = new Date(h.date);
        return d.getMonth() === monthIdx;
      }).sort((a, b) => a.date.localeCompare(b.date));

      const firstDayDate = new Date(year, monthIdx, 1);
      const startDay = firstDayDate.getDay();
      const colIndex = (startDay === 0) ? 6 : startDay - 1;
      
      const totalDays = new Date(year, monthIdx + 1, 0).getDate();
      
      const cells = [];
      for (let i = 0; i < colIndex; i++) {
        cells.push(null);
      }
      for (let i = 1; i <= totalDays; i++) {
        cells.push(i);
      }
      while (cells.length % 7 !== 0) {
        cells.push(null);
      }

      const rows = [];
      for (let i = 0; i < cells.length; i += 7) {
        rows.push(cells.slice(i, i + 7));
      }

      return (
        <div key={monthIdx} className="calendar-month-box" style={{
          border: '1px solid #d3dbe3',
          borderRadius: '8px',
          padding: '8px',
          backgroundColor: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          fontSize: '9px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          minWidth: 0,
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <div style={{
            textAlign: 'center',
            fontWeight: 700,
            color: '#1a365d',
            fontSize: '11px',
            marginBottom: '6px',
            borderBottom: '1.5px solid #edf2f7',
            paddingBottom: '3px'
          }}>
            {thaiMonths[monthIdx]}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            textAlign: 'center',
            fontWeight: 700,
            color: '#718096',
            marginBottom: '4px',
            fontSize: '8.5px'
          }}>
            <span>จ</span>
            <span>อ</span>
            <span>พ</span>
            <span>พฤ</span>
            <span>ศ</span>
            <span style={{ color: '#e53e3e' }}>ส</span>
            <span style={{ color: '#e53e3e' }}>อา</span>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
            flexGrow: 1
          }}>
            {rows.map((row, rowIdx) => (
              <div key={rowIdx} style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                textAlign: 'center',
                alignItems: 'center',
                height: '14px'
              }}>
                {row.map((day, cellIdx) => {
                  if (day === null) {
                    return <span key={cellIdx} style={{ color: '#cbd5e0' }}></span>;
                  }
                  
                  const currentFormattedDate = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isHoliday = list.some(h => h.date === currentFormattedDate);
                  const isWeekend = cellIdx === 5 || cellIdx === 6;

                  let dateStyle = {
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%',
                    fontWeight: isHoliday ? '700' : '400',
                    color: isHoliday ? '#e53e3e' : isWeekend ? '#e53e3e' : '#2d3748',
                    position: 'relative'
                  };

                  return (
                    <span key={cellIdx} style={dateStyle}>
                      {isHoliday && (
                        <span style={{
                          fontSize: '8px',
                          color: '#e53e3e',
                          position: 'absolute',
                          left: '0px',
                          top: '50%',
                          transform: 'translateY(-50%)'
                        }}>•</span>
                      )}
                      <span style={{ marginLeft: isHoliday ? '4px' : '0' }}>{day}</span>
                    </span>
                  );
                })}
              </div>
            ))}
          </div>

          <div style={{
            borderTop: '1px dotted #cbd5e0',
            marginTop: '6px',
            paddingTop: '4px',
            fontSize: '7.5px',
            color: '#4a5568',
            minHeight: '35px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            overflow: 'hidden'
          }}>
            {monthHolidays.length === 0 ? (
              <span style={{ color: '#a0aec0', fontStyle: 'italic', textAlign: 'center', marginTop: '6px' }}>ไม่มีวันหยุดคลินิก</span>
            ) : (
              monthHolidays.map(h => {
                const day = new Date(h.date).getDate();
                return (
                  <div key={h.date} style={{ display: 'flex', gap: '3px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    <span style={{ fontWeight: 700, color: '#e53e3e' }}>{day}</span>
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden' }}>{h.name}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      );
    };

    return (
      <div className="a4-document" ref={documentRef} id="printable-a4-area" style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '10mm 10mm',
        backgroundColor: '#ffffff',
        margin: '0 auto',
        boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
        fontFamily: "'Inter', 'Outfit', 'Sarabun', sans-serif",
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* หัวกระดาษมาตรฐานคลินิก */}
        <div className="a4-header" style={{ marginBottom: '15px', borderBottom: '2px solid var(--secondary)', paddingBottom: '10px' }}>
          <div className="a4-header-left" style={{ width: '55%' }}>
            <div className="a4-logo-circle">
              {clinicInfo.logoUrl ? <img src={clinicInfo.logoUrl} alt="Logo" /> : <span>HUG</span>}
            </div>
            <div className="a4-clinic-details">
              {renderClinicHeaderLeftText('1.35rem', '0.9rem')}
              {clinicInfo.licenseNo && <span className="a4-clinic-subtext">ใบอนุญาตเลขที่: {clinicInfo.licenseNo}</span>}
              <span className="a4-clinic-subtext">ที่อยู่: {clinicInfo.address}</span>
              <span className="a4-clinic-subtext">โทร: {clinicInfo.phone} | Line: {clinicInfo.lineId}</span>
            </div>
          </div>
          <div className="a4-header-right" style={{ width: '45%' }}>
            <span className="a4-doc-type-th" style={{ whiteSpace: 'nowrap', fontSize: '1.25rem', display: 'block' }}>ปฏิทินวันหยุดคลินิก</span>
            <span className="a4-doc-type-th" style={{ whiteSpace: 'nowrap', fontSize: '1.1rem', display: 'block', marginTop: '2px', color: 'var(--secondary)' }}>ปี พ.ศ. {thaiYear}</span>
            <span className="a4-doc-type-en" style={{ whiteSpace: 'nowrap', display: 'block', marginTop: '2px' }}>Clinic Annual Holidays</span>
            <div className="a4-doc-meta" style={{ marginTop: '8px' }}>
              <span className="a4-doc-meta-label">วันที่ออกเอกสาร:</span>
              <span className="a4-doc-meta-value">05 มิถุนายน 2569</span>
            </div>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px',
          marginBottom: '15px',
          flexGrow: 1
        }}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(mIdx => renderMonthCalendar(mIdx))}
        </div>

        <div style={{
          marginTop: 'auto',
          borderTop: '1px solid #e2e8f0',
          paddingTop: '8px',
          fontSize: '9px',
          color: '#718096',
          textAlign: 'right'
        }}>
          * วันหยุดคลินิกอาจมีการเปลี่ยนแปลงตามความเหมาะสม
        </div>
      </div>
    );
  };

  // ฟังก์ชันแปลงตัวเลขเป็นอักษรไทยสำหรับสลิป
  const thaiBahtText = (num) => {
    if (num === 0) return 'ศูนย์บาทถ้วน';
    const thaiNum = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
    const thaiUnit = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];
    
    const parts = Number(num).toFixed(2).split('.');
    const bahtStr = parts[0];
    const satangStr = parts[1];
    
    let bahtText = '';
    const len = bahtStr.length;
    for (let i = 0; i < len; i++) {
      const digit = Number(bahtStr[i]);
      const unit = len - 1 - i;
      if (digit !== 0) {
        if (unit === 1 && digit === 1) {
          bahtText += 'สิบ';
        } else if (unit === 1 && digit === 2) {
          bahtText += 'ยี่สิบ';
        } else if (unit === 0 && digit === 1 && len > 1) {
          bahtText += 'เอ็ด';
        } else {
          bahtText += thaiNum[digit];
        }
        bahtText += thaiUnit[unit];
      }
    }
    if (bahtText !== '') bahtText += 'บาท';

    let satangText = '';
    if (satangStr !== '00') {
      const digit1 = Number(satangStr[0]);
      const digit2 = Number(satangStr[1]);
      if (digit1 !== 0) {
        if (digit1 === 1) satangText += 'สิบ';
        else if (digit1 === 2) satangText += 'ยี่สิบ';
        else satangText += thaiNum[digit1] + 'สิบ';
      }
      if (digit2 !== 0) {
        if (digit2 === 1 && digit1 !== 0) satangText += 'เอ็ด';
        else satangText += thaiNum[digit2];
      }
      satangText += 'สตางค์';
    } else {
      satangText += 'ถ้วน';
    }

    return bahtText + satangText;
  };

  const renderPayslip = () => {
    const slip = documentData;
    const isVoided = slip.status === 'ยกเลิก';
    const userProfile = (users || []).find(u => u.username === slip.employeeUsername) || {};

    return (
      <div className="a4-document" ref={documentRef} id="printable-a4-area" style={{ paddingTop: '10mm' }}>
        {isVoided && <div className="void-watermark">ยกเลิกสลิปนี้แล้ว (VOIDED)</div>}

        <div className="a4-header" style={{ marginBottom: '15px', borderBottom: '2px solid var(--secondary)', paddingBottom: '10px' }}>
          <div className="a4-header-left" style={{ width: '60%' }}>
            <div className="a4-logo-circle">
              {clinicInfo.logoUrl ? <img src={clinicInfo.logoUrl} alt="Logo" /> : <span>HUG</span>}
            </div>
            <div className="a4-clinic-details">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--secondary)' }}>
                {clinicInfo.name || 'คลินิกกิจกรรมบำบัด ฮักดีโฮม'}
              </h2>
              {clinicInfo.licenseNo && <span className="a4-clinic-subtext">ใบอนุญาตเลขที่: {clinicInfo.licenseNo}</span>}
              <span className="a4-clinic-subtext" style={{ whiteSpace: 'nowrap', display: 'block' }}>ที่อยู่: {clinicInfo.address}</span>
              <span className="a4-clinic-subtext">โทร: {clinicInfo.phone} | Line: {clinicInfo.lineId}</span>
            </div>
          </div>
          <div className="a4-header-right" style={{ width: '40%' }}>
            <span className="a4-doc-type-th" style={{ color: 'var(--secondary)', whiteSpace: 'nowrap', display: 'block', fontSize: '1.3rem' }}>
              ใบเสร็จรับเงินเดือน / Payslip
            </span>
            <span className="a4-doc-type-en" style={{ whiteSpace: 'nowrap', display: 'block' }}>ใบเสร็จรับเงินเดือน</span>
            
            <div className="a4-doc-meta" style={{ marginTop: '10px' }}>
              <span className="a4-doc-meta-label">เลขที่เอกสาร:</span>
              <span className="a4-doc-meta-value" style={{ fontWeight: 700, fontFamily: 'monospace' }}>{slip.id}</span>
              <span className="a4-doc-meta-label">ประจำงวด:</span>
              <span className="a4-doc-meta-value">{slip.month} {slip.year}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px', fontSize: '12px', border: '1px solid #000', padding: '10px', borderRadius: '4px', backgroundColor: '#fafafa', marginBottom: '15px' }}>
          <div>
            <div><strong>รหัสพนักงาน:</strong> {slip.employeeId || '-'}</div>
            <div><strong>ชื่อ-สกุล:</strong> {slip.employeeName}</div>
            <div><strong>ตำแหน่งงาน:</strong> {userProfile.position || '-'}</div>
          </div>
          <div>
            <div><strong>ธนาคาร:</strong> {userProfile.bankName || '-'}</div>
            <div><strong>เลขที่บัญชี:</strong> {userProfile.bankAccountNo || '-'}</div>
            <div><strong>วันที่จ่าย:</strong> {slip.paymentDate ? new Date(slip.paymentDate).toLocaleDateString('th-TH') : new Date(slip.created_at).toLocaleDateString('th-TH')}</div>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontSize: '12px', marginBottom: '15px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '1.5px solid #000' }}>
              <th style={{ width: '50%', padding: '8px', borderRight: '1px solid #000', textAlign: 'left' }}>รายการรับ (Earnings)</th>
              <th style={{ width: '50%', padding: '8px', textAlign: 'left' }}>รายการหัก (Deductions)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ verticalAlign: 'top', padding: '8px', borderRight: '1px solid #000', height: '180px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontWeight: 600 }}>
                  <span>เงินเดือนพื้นฐาน (Basic Salary)</span>
                  <span>฿{(slip.basicSalary || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                </div>
                {(slip.earningsList || []).map((e, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>{e.name}</span>
                    <span>฿{e.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
                {(slip.specialEarnings || []).map((e, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>{e.name} (รายรับพิเศษ)</span>
                    <span>฿{e.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </td>
              <td style={{ verticalAlign: 'top', padding: '8px', height: '180px' }}>
                {(slip.deductionsList || []).map((d, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>{d.name}</span>
                    <span>฿{d.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
                {(slip.specialDeductions || []).map((d, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>{d.name} (รายการหักพิเศษ)</span>
                    <span>฿{d.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </td>
            </tr>
            <tr style={{ borderTop: '1px solid #000', fontWeight: 700, backgroundColor: '#fafafa' }}>
              <td style={{ padding: '8px', borderRight: '1px solid #000' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>รวมรายรับ (Total Earnings)</span>
                  <span>฿{slip.totalEarnings.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                </div>
              </td>
              <td style={{ padding: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>รวมรายการหัก (Total Deductions)</span>
                  <span>฿{slip.totalDeductions.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #000', padding: '12px 15px', backgroundColor: '#f0f4f8', fontSize: '13px', borderRadius: '4px', marginBottom: '25px' }}>
          <div><strong>ตัวอักษร:</strong> {thaiBahtText(slip.netPay)}</div>
          <div><strong>รับสุทธิ (Net Pay):</strong> <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--success)' }}>฿{slip.netPay.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span></div>
        </div>

        <div style={{ textAlign: 'center', fontSize: '11px', color: '#666', borderTop: '1px dashed #ccc', paddingTop: '10px', marginBottom: '40px' }}>
          "{clinicInfo.receiptFooter || 'ขอบคุณที่ร่วมงานกับเรา'}"
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '50px', textAlign: 'center', fontSize: '11px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '180px', borderBottom: '1px solid #333', height: '45px', marginBottom: '6px' }}></div>
            <div>ผู้รับเงิน / Employee Signature</div>
            <div style={{ color: '#666', fontSize: '10px', marginTop: '2px' }}>วันที่: ______/______/______</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '180px', borderBottom: '1px solid #333', height: '45px', marginBottom: '6px' }}></div>
            <div style={{ fontWeight: 600, fontSize: '11.5px', marginBottom: '2px' }}>(นางสาวสุทธิพร สมเนตร)</div>
            <div>ผู้อนุมัติจ่าย / Employer Signature</div>
            <div style={{ color: '#333', fontSize: '10px', marginTop: '2px' }}>วันที่: {slip.paymentDate ? new Date(slip.paymentDate).toLocaleDateString('th-TH') : new Date(slip.created_at).toLocaleDateString('th-TH')}</div>
          </div>
        </div>
      </div>
    );
  };

  const renderEmployeeProfile = () => {
    const u = documentData;
    
    return (
      <div className="a4-document" ref={documentRef} id="printable-a4-area" style={{ paddingTop: '10mm' }}>
        <div className="a4-header" style={{ marginBottom: '25px', borderBottom: '2px solid var(--secondary)', paddingBottom: '10px' }}>
          <div className="a4-header-left" style={{ width: '60%' }}>
            <div className="a4-logo-circle">
              {clinicInfo.logoUrl ? <img src={clinicInfo.logoUrl} alt="Logo" /> : <span>HUG</span>}
            </div>
            <div className="a4-clinic-details">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--secondary)' }}>
                {clinicInfo.name || 'คลินิกกิจกรรมบำบัด ฮักดีโฮม'}
              </h2>
              {clinicInfo.licenseNo && <span className="a4-clinic-subtext">ใบอนุญาตเลขที่: {clinicInfo.licenseNo}</span>}
              <span className="a4-clinic-subtext" style={{ whiteSpace: 'nowrap', display: 'block' }}>ที่อยู่: {clinicInfo.address}</span>
              <span className="a4-clinic-subtext">โทร: {clinicInfo.phone} | Line: {clinicInfo.lineId}</span>
            </div>
          </div>
          <div className="a4-header-right" style={{ width: '40%' }}>
            <span className="a4-doc-type-th" style={{ color: 'var(--secondary)', whiteSpace: 'nowrap', display: 'block', fontSize: '1.3rem' }}>
              ทะเบียนประวัติพนักงาน
            </span>
            <span className="a4-doc-type-en" style={{ whiteSpace: 'nowrap', display: 'block' }}>Employee Profile Form</span>
            
            <div className="a4-doc-meta" style={{ marginTop: '10px' }}>
              <span className="a4-doc-meta-label">รหัสพนักงาน:</span>
              <span className="a4-doc-meta-value" style={{ fontWeight: 700, fontFamily: 'monospace' }}>{u.employeeId || '-'}</span>
              <span className="a4-doc-meta-label">สถานะการทำงาน:</span>
              <span className="a4-doc-meta-value" style={{ fontWeight: 700, color: u.status === 'Active' ? 'green' : 'red' }}>{u.status}</span>
            </div>
          </div>
        </div>

        <div style={{ border: '1px solid #ddd', borderRadius: '6px', overflow: 'hidden', marginBottom: '30px' }}>
          <div style={{ backgroundColor: '#f8fafc', padding: '12px 15px', borderBottom: '1px solid #ddd', fontWeight: 700, fontSize: '14px', color: 'var(--secondary)' }}>
            ข้อมูลทั่วไปพนักงาน (General Information)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0px', fontSize: '13px' }}>
            <div style={{ padding: '10px 15px', borderBottom: '1px solid #eee', borderRight: '1px solid #eee', textAlign: 'left' }}>
              <strong>ชื่อ-นามสกุลจริง:</strong> {u.fullname || '-'}
            </div>
            <div style={{ padding: '10px 15px', borderBottom: '1px solid #eee', textAlign: 'left' }}>
              <strong>ชื่อเล่น:</strong> {u.nickname || '-'}
            </div>
            <div style={{ padding: '10px 15px', borderBottom: '1px solid #eee', borderRight: '1px solid #eee', textAlign: 'left' }}>
              <strong>ชื่อบัญชีผู้ใช้งาน (Username):</strong> {u.username}
            </div>
            <div style={{ padding: '10px 15px', borderBottom: '1px solid #eee', textAlign: 'left' }}>
              <strong>ตำแหน่งงาน:</strong> {u.position || '-'}
            </div>
            <div style={{ padding: '10px 15px', borderBottom: '1px solid #eee', borderRight: '1px solid #eee', textAlign: 'left' }}>
              <strong>สิทธิ์การใช้งานระบบ:</strong> {u.role === 'Admin' ? 'ผู้ดูแล (Admin)' : u.role === 'OT' ? 'นักบำบัด (OT)' : 'พนักงาน (Staff)'}
            </div>
            <div style={{ padding: '10px 15px', borderBottom: '1px solid #eee', textAlign: 'left' }}>
              <strong>เงินเดือนพื้นฐาน:</strong> {u.basicSalary ? `฿${u.basicSalary.toLocaleString('th-TH', { minimumFractionDigits: 2 })}` : '฿0.00'}
            </div>
          </div>
        </div>

        <div style={{ border: '1px solid #ddd', borderRadius: '6px', overflow: 'hidden', marginBottom: '30px' }}>
          <div style={{ backgroundColor: '#f8fafc', padding: '12px 15px', borderBottom: '1px solid #ddd', fontWeight: 700, fontSize: '14px', color: 'var(--secondary)' }}>
            ข้อมูลการติดต่อและการรับเงิน (Contact & Payment Details)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0px', fontSize: '13px' }}>
            <div style={{ padding: '10px 15px', borderBottom: '1px solid #eee', borderRight: '1px solid #eee', textAlign: 'left' }}>
              <strong>เบอร์โทรศัพท์:</strong> {u.phone || '-'}
            </div>
            <div style={{ padding: '10px 15px', borderBottom: '1px solid #eee', textAlign: 'left' }}>
              <strong>อีเมล:</strong> {u.email || '-'}
            </div>
            <div style={{ padding: '10px 15px', borderRight: '1px solid #eee', textAlign: 'left' }}>
              <strong>ชื่อธนาคาร:</strong> {u.bankName || '-'}
            </div>
            <div style={{ padding: '10px 15px', textAlign: 'left' }}>
              <strong>เลขที่บัญชีธนาคาร:</strong> {u.bankAccountNo || '-'}
            </div>
          </div>
        </div>

        <div style={{ marginTop: '80px', fontSize: '11px', color: '#666', borderTop: '1px dashed #ccc', paddingTop: '15px' }}>
          ข้าพเจ้าขอรับรองว่าข้อมูลรายละเอียดประวัติพนักงานดังกล่าวข้างต้นเป็นความจริงทุกประการ
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '50px', textAlign: 'center', fontSize: '11.5px', marginTop: '40px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '180px', borderBottom: '1px solid #333', height: '40px', marginBottom: '6px' }}></div>
            <div>ลงชื่อพนักงาน / Employee</div>
            <div style={{ color: '#666', fontSize: '10px', marginTop: '2px' }}>วันที่: ______/______/______</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '180px', borderBottom: '1px solid #333', height: '40px', marginBottom: '6px' }}></div>
            <div>ผู้รับรองประวัติ / HR Officer</div>
            <div style={{ color: '#333', fontSize: '10px', marginTop: '2px' }}>วันที่: ______/______/______</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div id="pdf-preview-overlay">
      <div className="pdf-preview-toolbar">
        <span style={{ fontWeight: 600 }}>พรีวิวเอกสารอ้างอิงของคลินิก</span>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={handlePrint}>
            <Printer size={16} /> พิมพ์ผ่านเครื่องพิมพ์ (Print)
          </button>
          
          <button className="btn btn-light" onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <X size={16} /> ปิดพรีวิว
          </button>
        </div>
      </div>

      {/* เรนเดอร์เอกสารตามประเภท */}
      {documentType === 'patient' && renderPatientProfile()}
      {documentType === 'assessment' && renderAssessmentReport()}
      {documentType === 'receipt' && renderReceipt()}
      {(documentType === 'opd_blank' || documentType === 'opd_form' || documentType === 'opd_filled') && renderOPDCard()}
      {documentType === 'holidays_annual' && renderAnnualHolidays()}
      {documentType === 'payslip' && renderPayslip()}
      {documentType === 'employee' && renderEmployeeProfile()}
    </div>
  );
}
