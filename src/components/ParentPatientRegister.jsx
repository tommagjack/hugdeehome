import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  User, 
  Calendar, 
  Phone, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowLeft, 
  AlertTriangle, 
  MessageCircle, 
  Send,
  HelpCircle,
  Clock
} from 'lucide-react';
import Swal from 'sweetalert2';
import ThaiDatePicker, { calculateAgeFromParts, parseRawDateToParts } from './ThaiDatePicker';
import { DEFAULT_CLINIC_LOGO } from '../utils/defaultAssets';
import { supabase } from '../utils/supabaseClient';
import { broadcastChange } from '../utils/realtime';

export default function ParentPatientRegister({ clinicInfo, onRegister }) {
  // Form states
  const [gender, setGender] = useState('ชาย');
  const [title, setTitle] = useState('เด็กชาย');
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [nickname, setNickname] = useState('');
  const [dob, setDob] = useState('');
  const [dobBE, setDobBE] = useState('');
  const [ageText, setAgeText] = useState('0 ปี 0 เดือน');
  const [guardian, setGuardian] = useState('');
  const [phone, setPhone] = useState('');

  const [allergies, setAllergies] = useState('ปฏิเสธการแพ้ยา');
  const [allergiesDetails, setAllergiesDetails] = useState('');
  const [conditions, setConditions] = useState('ไม่มี');
  const [conditionsDetails, setConditionsDetails] = useState('');

  const [selectedChannels, setSelectedChannels] = useState([]);
  const [channelsOtherDetails, setChannelsOtherDetails] = useState('');
  const [worries, setWorries] = useState('');

  // Consent & Review state
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [isConsented, setIsConsented] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);

  // Sync title when gender changes
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

  const handleChannelToggle = (ch) => {
    if (selectedChannels.includes(ch)) {
      setSelectedChannels(selectedChannels.filter(c => c !== ch));
    } else {
      setSelectedChannels([...selectedChannels, ch]);
    }
  };

  const handleInitialValidate = (e) => {
    e.preventDefault();
    if (!firstname.trim() || !lastname.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณากรอกชื่อ-นามสกุล',
        text: 'โปรดระบุชื่อและนามสกุลของผู้รับบริการให้ครบถ้วน',
        confirmButtonColor: 'var(--secondary)'
      });
      return;
    }
    if (!dob) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาระบุวันเกิด (พ.ศ.)',
        text: 'โปรดเลือกวัน เดือน และปี พ.ศ. เกิดของผู้รับบริการ',
        confirmButtonColor: 'var(--secondary)'
      });
      return;
    }
    if (!phone.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณากรอกเบอร์โทรติดต่อ',
        text: 'โปรดระบุเบอร์โทรศัพท์สำหรับให้เจ้าหน้าที่ติดต่อกลับ',
        confirmButtonColor: 'var(--secondary)'
      });
      return;
    }

    setShowConsentModal(true);
  };

  const handleConfirmSubmit = async () => {
    if (!isConsented) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณายินยอมให้จัดเก็บข้อมูล',
        text: 'โปรดทำเครื่องหมายยินยอมให้คลินิกจัดเก็บและประมวลผลข้อมูลเพื่อการรักษา',
        confirmButtonColor: 'var(--secondary)'
      });
      return;
    }

    setIsSubmitting(true);

    const generatedPendingHn = `PND-${Date.now().toString().slice(-6)}`;
    const nowIso = new Date().toISOString();

    const patientRecord = {
      hn: generatedPendingHn,
      title: title,
      firstname: firstname.trim(),
      lastname: lastname.trim(),
      nickname: nickname.trim(),
      dob: dob, // Saved as standard YYYY-MM-DD
      gender: gender,
      guardian: guardian.trim(),
      phone: phone.trim(),
      status: 'Pending', // Marked as Pending as required
      created_at: nowIso,
      created_by: 'ผู้ปกครอง (ลงทะเบียนออนไลน์)',
      allergies: allergies,
      allergies_details: allergies === 'มี' ? allergiesDetails.trim() : '',
      allergiesDetails: allergies === 'มี' ? allergiesDetails.trim() : '',
      conditions: conditions,
      conditions_details: conditions === 'มี' ? conditionsDetails.trim() : '',
      conditionsDetails: conditions === 'มี' ? conditionsDetails.trim() : '',
      channels: selectedChannels,
      channels_other_details: selectedChannels.includes('อื่นๆ') ? channelsOtherDetails.trim() : '',
      channelsOtherDetails: selectedChannels.includes('อื่นๆ') ? channelsOtherDetails.trim() : '',
      worries: worries.trim(),
      line_user_id: '',
      lineUserId: ''
    };

    try {
      // 1. Try Supabase RPC first if available
      let submittedToCloud = false;
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('submit_patient_registration', {
          p_title: patientRecord.title,
          p_firstname: patientRecord.firstname,
          p_lastname: patientRecord.lastname,
          p_nickname: patientRecord.nickname,
          p_dob: patientRecord.dob,
          p_gender: patientRecord.gender,
          p_guardian: patientRecord.guardian,
          p_phone: patientRecord.phone,
          p_allergies: patientRecord.allergies,
          p_allergies_details: patientRecord.allergiesDetails,
          p_conditions: patientRecord.conditions,
          p_conditions_details: patientRecord.conditionsDetails,
          p_channels: JSON.stringify(patientRecord.channels),
          p_channels_other_details: patientRecord.channelsOtherDetails,
          p_worries: patientRecord.worries
        });

        if (!rpcError) {
          submittedToCloud = true;
          if (rpcData && rpcData.hn) {
            patientRecord.hn = rpcData.hn;
          }
        }
      } catch (e) {
        console.warn('RPC submit warning:', e);
      }

      // 2. If RPC not yet present, try direct insert
      if (!submittedToCloud) {
        const { error: insertError } = await supabase.from('patients').insert([{
          hn: patientRecord.hn,
          title: patientRecord.title,
          firstname: patientRecord.firstname,
          lastname: patientRecord.lastname,
          nickname: patientRecord.nickname,
          dob: patientRecord.dob,
          gender: patientRecord.gender,
          guardian: patientRecord.guardian,
          phone: patientRecord.phone,
          status: 'Pending',
          created_at: patientRecord.created_at,
          created_by: patientRecord.created_by,
          allergies: patientRecord.allergies,
          allergies_details: patientRecord.allergiesDetails,
          conditions: patientRecord.conditions,
          conditions_details: patientRecord.conditionsDetails,
          channels: JSON.stringify(patientRecord.channels),
          channels_other_details: patientRecord.channelsOtherDetails,
          worries: patientRecord.worries,
          line_user_id: ''
        }]);

        if (insertError) {
          console.warn('Direct Supabase insert warning:', insertError.message);
        }
      }

      // 3. ส่งสัญญาณ Realtime Broadcast ไปยังทุกหน้าจอและทุกอุปกรณ์ของคลินิกทันที
      try {
        await broadcastChange({
          table: 'patients',
          action: 'INSERT',
          record: patientRecord,
          toUpsert: [patientRecord],
          pk: 'hn',
          sender: 'parent'
        });
      } catch (broadcastErr) {
        console.warn('Realtime broadcast error from parent form:', broadcastErr);
      }

      // 4. Inform parent React app via callback to update local state immediately
      if (onRegister) {
        onRegister(patientRecord);
      }

      setShowConsentModal(false);
      setIsSubmittedSuccess(true);
    } catch (err) {
      console.error('Registration submission error:', err);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาดในการส่งข้อมูล',
        text: 'กรุณาลองใหม่อีกครั้ง หรือติดต่อคลินิกโดยตรง: ' + (clinicInfo?.phone || '094-675-3557'),
        confirmButtonColor: 'var(--secondary)'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForAnother = () => {
    setFirstname('');
    setLastname('');
    setNickname('');
    setDob('');
    setDobBE('');
    setAgeText('0 ปี 0 เดือน');
    setGuardian('');
    setPhone('');
    setAllergies('ปฏิเสธการแพ้ยา');
    setAllergiesDetails('');
    setConditions('ไม่มี');
    setConditionsDetails('');
    setSelectedChannels([]);
    setChannelsOtherDetails('');
    setWorries('');
    setIsSubmittedSuccess(false);
  };

  // ----------------------------------------------------
  // View 1: Success / Thank You Screen
  // ----------------------------------------------------
  if (isSubmittedSuccess) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f5ede4 0%, #e2d3c1 100%)',
        padding: '2rem 1rem',
        fontFamily: 'var(--font-family, sans-serif)'
      }}>
        <div style={{
          maxWidth: '650px',
          width: '100%',
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          boxShadow: '0 20px 40px rgba(110, 75, 40, 0.12)',
          padding: '3rem 2rem',
          textAlign: 'center',
          border: '1px solid rgba(220, 205, 190, 0.5)'
        }}>
          <div style={{
            width: '84px',
            height: '84px',
            borderRadius: '50%',
            backgroundColor: '#e6f7ec',
            color: '#16a34a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem auto'
          }}>
            <CheckCircle2 size={48} />
          </div>

          <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--secondary, #8b5a2b)', marginBottom: '0.75rem' }}>
            ลงทะเบียนข้อมูลเรียบร้อยแล้ว
          </h2>

          <p style={{ fontSize: '1.05rem', color: '#4b5563', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            คลินิกบ้านฮักดีได้รับข้อมูลประวัติของ <strong>น้อง{nickname || firstname}</strong> เรียบร้อยแล้วค่ะ<br/>
            เจ้าหน้าที่จะตรวจสอบข้อมูลและติดต่อกลับทางหมายเลข <strong>{phone}</strong> เพื่อประสานงานและนัดหมายวันเวลาตรวจประเมินพัฒนาการต่อไปค่ะ
          </p>

          <div style={{
            backgroundColor: '#fef8f0',
            border: '1px dashed #d97706',
            borderRadius: '16px',
            padding: '1rem 1.25rem',
            textAlign: 'left',
            fontSize: '0.9rem',
            color: '#92400e',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <Clock size={24} style={{ flexShrink: 0 }} />
            <div>
              <strong>สถานะการลงทะเบียน:</strong> รอดำเนินการ (Pending)<br/>
              เจ้าหน้าที่คลินิกจะดำเนินการตรวจทานและออกเลขที่เวชระเบียน (HN) ให้ทันทีในเวลาทำการ
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {clinicInfo?.lineId && (
              <a
                href={`https://line.me/R/ti/p/@${clinicInfo.lineId.replace('@', '')}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.85rem 1.5rem',
                  borderRadius: '12px',
                  backgroundColor: '#06c755',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '1rem',
                  textDecoration: 'none',
                  boxShadow: '0 4px 10px rgba(6, 199, 85, 0.25)'
                }}
              >
                <MessageCircle size={20} /> ติดต่อคลินิกผ่าน LINE Official Account
              </a>
            )}

            <button
              type="button"
              onClick={handleResetForAnother}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '12px',
                border: '1px solid #d1d5db',
                backgroundColor: 'white',
                color: '#374151',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              + ลงทะเบียนผู้รับบริการอีก 1 ท่าน
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // View 2: Registration Form
  // ----------------------------------------------------
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #faf5ef 0%, #ebdcc9 100%)',
      padding: '2rem 1rem',
      fontFamily: 'var(--font-family, sans-serif)'
    }}>
      <div style={{
        maxWidth: '820px',
        margin: '0 auto',
        backgroundColor: '#ffffff',
        borderRadius: '24px',
        boxShadow: '0 20px 45px rgba(110, 75, 40, 0.1)',
        padding: '2.5rem 2rem',
        border: '1px solid rgba(220, 205, 190, 0.6)'
      }}>
        {/* Header ส่วนหัวคลินิก */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            overflow: 'hidden',
            margin: '0 auto 1rem auto',
            border: '3px solid var(--secondary, #8b5a2b)',
            boxShadow: '0 6px 14px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#ffffff'
          }}>
            <img 
              src={clinicInfo?.logoUrl || DEFAULT_CLINIC_LOGO} 
              alt="Clinic Logo" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = DEFAULT_CLINIC_LOGO;
              }}
            />
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--secondary, #8b5a2b)', margin: '0 0 0.25rem 0' }}>
            {clinicInfo?.name || 'บ้านฮักดี คลินิกกายภาพบำบัดและกิจกรรมบำบัด'}
          </h1>
          <p style={{ fontSize: '0.95rem', color: '#6b7280', margin: 0 }}>
            แบบฟอร์มลงทะเบียนประวัติผู้รับบริการ (สำหรับผู้ปกครอง)
          </p>
        </div>

        {/* แถบคำแนะนำ */}
        <div style={{
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '14px',
          padding: '0.9rem 1.25rem',
          fontSize: '0.9rem',
          color: '#1e40af',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
          marginBottom: '2rem'
        }}>
          <HelpCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>คำชี้แจง:</strong> กรุณากรอกข้อมูลตามความเป็นจริง เพื่อให้ทีมนักกิจกรรมบำบัดสามารถวางแผนการประเมินและดูแลพัฒนาการของน้องได้อย่างถูกต้องและเหมาะสมที่สุด ข้อมูลทั้งหมดจะถูกเก็บรักษาเป็นความลับตามมาตรฐานวิชาชีพ
          </div>
        </div>

        {/* ฟอร์มกรอกข้อมูล */}
        <form onSubmit={handleInitialValidate}>
          
          {/* ข้อมูลพื้นฐานผู้รับบริการ */}
          <div style={{ marginBottom: '1.75rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#374151', borderBottom: '2px solid #f3f4f6', paddingBottom: '0.5rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={20} color="var(--secondary, #8b5a2b)" /> 1. ข้อมูลทั่วไปของผู้รับบริการ
            </h2>

            {/* เพศ & คำนำหน้า */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>เพศ <span style={{ color: 'red' }}>*</span></label>
                <select className="form-control" value={gender} onChange={(e) => setGender(e.target.value)}>
                  <option value="ชาย">ชาย</option>
                  <option value="หญิง">หญิง</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>คำนำหน้า <span style={{ color: 'red' }}>*</span></label>
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

            {/* ชื่อ-นามสกุล & ชื่อเล่น */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>ชื่อ - นามสกุล ผู้รับบริการ <span style={{ color: 'red' }}>*</span></label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="ชื่อจริง" 
                    value={firstname} 
                    onChange={(e) => setFirstname(e.target.value)} 
                    required 
                  />
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="นามสกุล" 
                    value={lastname} 
                    onChange={(e) => setLastname(e.target.value)} 
                    required 
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>ชื่อเล่น</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="เช่น น้องสกาย" 
                  value={nickname} 
                  onChange={(e) => setNickname(e.target.value)} 
                />
              </div>
            </div>

            {/* วันเกิด พ.ศ. */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Calendar size={16} /> วันเกิด (กรอกเป็น พ.ศ.) <span style={{ color: 'red' }}>*</span>
              </label>
              <ThaiDatePicker 
                value={dob}
                onChange={(dateAD, dateBE, ageTextStr) => {
                  setDob(dateAD);
                  setDobBE(dateBE);
                  setAgeText(ageTextStr);
                }}
                required={true}
                showAgeBadge={true}
              />
            </div>
          </div>

          {/* ข้อมูลผู้ปกครองและการติดต่อ */}
          <div style={{ marginBottom: '1.75rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#374151', borderBottom: '2px solid #f3f4f6', paddingBottom: '0.5rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Phone size={20} color="var(--secondary, #8b5a2b)" /> 2. ข้อมูลผู้ปกครองและการติดต่อ
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>ชื่อ-นามสกุล ผู้ปกครอง</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="ระบุชื่อ-นามสกุล ของบิดา/มารดา/ผู้ดูแล" 
                  value={guardian} 
                  onChange={(e) => setGuardian(e.target.value)} 
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>เบอร์โทรศัพท์ติดต่อ <span style={{ color: 'red' }}>*</span></label>
                <input 
                  type="tel" 
                  className="form-control" 
                  placeholder="เช่น 0812345678" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  required 
                />
              </div>
            </div>
          </div>

          {/* ประวัติสุขภาพ */}
          <div style={{ marginBottom: '1.75rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#374151', borderBottom: '2px solid #f3f4f6', paddingBottom: '0.5rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Heart size={20} color="var(--secondary, #8b5a2b)" /> 3. ข้อมูลสุขภาพและการแพ้
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>ประวัติการแพ้ยา / แพ้อาหาร</label>
                <select className="form-control" value={allergies} onChange={(e) => setAllergies(e.target.value)}>
                  <option value="ปฏิเสธการแพ้ยา">ปฏิเสธการแพ้ยา / ไม่มีประวัติแพ้</option>
                  <option value="มี">มีประวัติการแพ้</option>
                </select>
                {allergies === 'มี' && (
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="ระบุชื่อยาหรืออาหารที่แพ้ และอาการที่พบ..." 
                    value={allergiesDetails} 
                    onChange={(e) => setAllergiesDetails(e.target.value)} 
                    style={{ marginTop: '0.5rem', borderColor: '#ef4444' }} 
                    required 
                  />
                )}
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>โรคประจำตัว / ข้อจำกัดด้านสุขภาพ</label>
                <select className="form-control" value={conditions} onChange={(e) => setConditions(e.target.value)}>
                  <option value="ไม่มี">ไม่มีโรคประจำตัว</option>
                  <option value="มี">มีโรคประจำตัว</option>
                </select>
                {conditions === 'มี' && (
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="ระบุชื่อโรคประจำตัว หรือการรักษาปัจจุบัน..." 
                    value={conditionsDetails} 
                    onChange={(e) => setConditionsDetails(e.target.value)} 
                    style={{ marginTop: '0.5rem', borderColor: 'var(--secondary, #8b5a2b)' }} 
                    required 
                  />
                )}
              </div>
            </div>

            {/* ช่องทางรู้จักคลินิก */}
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontWeight: 600 }}>รู้จักคลินิกบ้านฮักดีจากช่องทางใด (เลือกได้มากกว่า 1 ข้อ)</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {['Facebook', 'Line', 'Walk-in', 'เพื่อนแนะนำ', 'คลินิกเด็ก', 'อื่นๆ'].map(ch => {
                  const isChecked = selectedChannels.includes(ch);
                  return (
                    <button
                      type="button"
                      key={ch}
                      onClick={() => handleChannelToggle(ch)}
                      style={{
                        padding: '0.45rem 0.9rem',
                        borderRadius: '20px',
                        border: isChecked ? '1px solid var(--secondary, #8b5a2b)' : '1px solid #d1d5db',
                        backgroundColor: isChecked ? 'var(--secondary, #8b5a2b)' : '#ffffff',
                        color: isChecked ? '#ffffff' : '#374151',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {ch}
                    </button>
                  );
                })}
              </div>
              {selectedChannels.includes('อื่นๆ') && (
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="ระบุช่องทางอื่นๆ..." 
                  value={channelsOtherDetails} 
                  onChange={(e) => setChannelsOtherDetails(e.target.value)} 
                  style={{ marginTop: '0.5rem' }} 
                />
              )}
            </div>

            {/* อาการหรือพฤติกรรมที่กังวล */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 600 }}>
                อาการ พฤติกรรม หรือพัฒนาการที่ผู้ปกครองมีความกังวล / ต้องการส่งเสริม
              </label>
              <textarea 
                className="form-control" 
                rows="4" 
                placeholder="เช่น สมาธิสั้น อยู่ไม่นิ่ง พูดช้ากว่าวัย ไม่สบตา หรือทักษะการช่วยเหลือตัวเอง..." 
                value={worries} 
                onChange={(e) => setWorries(e.target.value)} 
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>

          {/* ปุ่มส่งแบบฟอร์ม */}
          <div style={{ marginTop: '2rem', borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem' }}>
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '1rem',
                borderRadius: '14px',
                backgroundColor: 'var(--secondary, #8b5a2b)',
                color: '#ffffff',
                border: 'none',
                fontSize: '1.1rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 6px 16px rgba(139, 90, 43, 0.25)',
                transition: 'all 0.2s'
              }}
            >
              <Send size={20} /> ตรวจทานและส่งข้อมูลลงทะเบียน
            </button>
          </div>
        </form>

        {/* Modal ยืนยันการให้ความยินยอม (Consent & Review Modal) */}
        {showConsentModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}>
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              maxWidth: '650px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.2)',
              padding: '2rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem', color: 'var(--secondary, #8b5a2b)' }}>
                <ShieldCheck size={28} />
                <h3 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>
                  ตรวจทานข้อมูลและยินยอมการจัดเก็บข้อมูล
                </h3>
              </div>

              {/* การ์ดสรุปข้อมูลตรวจทาน */}
              <div style={{
                backgroundColor: '#f9fafb',
                borderRadius: '16px',
                border: '1px solid #e5e7eb',
                padding: '1.25rem',
                fontSize: '0.9rem',
                lineHeight: 1.6,
                marginBottom: '1.5rem',
                color: '#374151'
              }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111827', marginBottom: '0.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.4rem' }}>
                  สรุปข้อมูลที่กรอก:
                </div>
                <div><strong>ผู้รับบริการ:</strong> {title}{firstname} {lastname} {nickname ? `(น้อง${nickname})` : ''}</div>
                <div><strong>เพศ:</strong> {gender}</div>
                <div><strong>วันเกิด (พ.ศ.):</strong> {dobBE || dob} (อายุคำนวณ: <strong>{ageText}</strong>)</div>
                <div><strong>ผู้ปกครอง:</strong> {guardian || '-'}</div>
                <div><strong>เบอร์โทรติดต่อ:</strong> <strong>{phone}</strong></div>
                <div><strong>ประวัติแพ้ยา/แพ้อาหาร:</strong> {allergies === 'มี' ? allergiesDetails : 'ปฏิเสธการแพ้'}</div>
                <div><strong>โรคประจำตัว:</strong> {conditions === 'มี' ? conditionsDetails : 'ไม่มีโรคประจำตัว'}</div>
                {worries && (
                  <div style={{ marginTop: '0.4rem' }}><strong>อาการที่กังวล:</strong> {worries}</div>
                )}
              </div>

              {/* ข้อความความยินยอม PDPA */}
              <div style={{
                backgroundColor: '#fdf8f6',
                border: '1px solid #fed7aa',
                borderRadius: '14px',
                padding: '1rem',
                marginBottom: '1.5rem'
              }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', cursor: 'pointer', fontSize: '0.85rem', color: '#7c2d12', lineHeight: 1.5 }}>
                  <input 
                    type="checkbox" 
                    checked={isConsented} 
                    onChange={(e) => setIsConsented(e.target.checked)} 
                    style={{ marginTop: '3px', width: '18px', height: '18px', accentColor: 'var(--secondary, #8b5a2b)', cursor: 'pointer' }} 
                  />
                  <span>
                    <strong>ข้าพเจ้ายินยอมให้คลินิกบ้านฮักดีจัดเก็บและประมวลผลข้อมูล:</strong> ข้าพเจ้ายืนยันว่าข้อมูลข้างต้นเป็นความจริง และยินยอมให้คลินิกบันทึก รวบรวม และประมวลผลข้อมูลส่วนบุคคลและข้อมูลสุขภาพดังกล่าว เพื่อประโยชน์ในการติดต่อ นัดหมาย ตรวจประเมิน และวางแผนการบำบัดรักษาฟื้นฟูพัฒนาการ
                  </span>
                </label>
              </div>

              {/* ปุ่มการทำงาน */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowConsentModal(false)}
                  disabled={isSubmitting}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '12px',
                    border: '1px solid #d1d5db',
                    backgroundColor: '#ffffff',
                    color: '#4b5563',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <ArrowLeft size={16} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} /> ย้อนกลับไปแก้ไข
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSubmit}
                  disabled={!isConsented || isSubmitting}
                  style={{
                    padding: '0.65rem 1.5rem',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: isConsented ? 'var(--secondary, #8b5a2b)' : '#9ca3af',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: isConsented ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: isConsented ? '0 4px 12px rgba(139, 90, 43, 0.3)' : 'none'
                  }}
                >
                  {isSubmitting ? 'กำลังส่งข้อมูล...' : 'ยืนยันและส่งข้อมูล'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
