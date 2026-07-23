import React, { useState, useMemo } from 'react';
import { 
  Briefcase, 
  User, 
  Phone, 
  Mail, 
  FileText, 
  Key, 
  Image as ImageIcon, 
  FileCheck, 
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import Swal from 'sweetalert2';
import { getGasUrl } from '../utils/db';
import { compressImage } from '../utils/defaultAssets';

export default function GuestRegister({ clinicInfo, users, onRegister }) {
  // ฟิลด์ข้อมูลสมัครงาน
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullname, setFullname] = useState('');
  const [title, setTitle] = useState('นาย');
  const [nickname, setNickname] = useState('');
  const [citizenId, setCitizenId] = useState('');
  const [gender, setGender] = useState('ชาย');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [bankName, setBankName] = useState('กสิกรไทย');
  const [bankAccountNo, setBankAccountNo] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(''); // เก็บ url รูป (ถ้าใส่เป็นลิ้งก์)

  // ไฟล์แนบและ metadata จำลอง
  const [avatarFile, setAvatarFile] = useState(null);
  const [citizenIdDoc, setCitizenIdDoc] = useState(null);
  const [houseRegDoc, setHouseRegDoc] = useState(null);
  const [bankBookDoc, setBankBookDoc] = useState(null);
  const [licenseDoc, setLicenseDoc] = useState(null);
  const [otherDoc, setOtherDoc] = useState(null);

  // คำนวณรหัสพนักงานลำดับถัดไปแบบอัตโนมัติ
  const nextEmployeeId = useMemo(() => {
    let maxId = 0;
    users.forEach(u => {
      if (u.employeeId) {
        const match = u.employeeId.match(/^HDH(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxId) {
            maxId = num;
          }
        }
      }
    });
    return `HDH${String(maxId + 1).padStart(3, '0')}`;
  }, [users]);

  // ฟังก์ชันอัปโหลดไฟล์ไปยังเซิร์ฟเวอร์จำลอง (เปลี่ยนเป็นระบบ Local Base64 + Google Drive สำรองตามหลังเหมือนกับ Users.jsx)
  const handleFileUpload = async (e, setDocState, docType) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({
        icon: 'error',
        title: 'ไฟล์ขนาดใหญ่เกินไป',
        text: 'กรุณาอัปโหลดไฟล์ขนาดไม่เกิน 5MB',
        confirmButtonColor: 'var(--secondary)'
      });
      e.target.value = '';
      return;
    }

    let compressedBase64 = null;
    if (docType === 'รูปถ่ายโปรไฟล์' || (file.type && file.type.startsWith('image/'))) {
      try {
        compressedBase64 = await compressImage(file, 300, 300, 0.85);
      } catch (err) {
        console.warn('Image compression warning in application form:', err);
      }
    }

    const origName = file.name;
    const processUpload = (dataStr) => {
      const ext = origName.substring(origName.lastIndexOf('.'));
      
      const parts = (fullname || '').trim().split(/\s+/);
      const fname = parts[0] || 'Unknown';
      const lname = parts[1] || 'Unknown';
      const folderName = `${nextEmployeeId}-${fname}-${lname}`;
      const fileName = `${nextEmployeeId}-${fname}-${lname}-${docType}${ext}`;

      const gasUrl = getGasUrl();
      const parentFolderId = clinicInfo?.folderId || '1A2B3C4D5E6F7G8H9I0J';

      // บันทึกและแสดงผล Base64 ทันทีเพื่อความลื่นไหลของหน้าเว็บพรีวิว 100%
      setDocState({
        name: origName,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        path: dataStr,
        data: dataStr,
        uploadedAt: new Date().toISOString()
      });
      if (docType === 'รูปถ่ายโปรไฟล์') {
        setAvatarUrl(dataStr);
      }

      Swal.fire({
        icon: 'success',
        title: 'แนบไฟล์สำเร็จ',
        text: `แนบไฟล์ ${origName} เรียบร้อย`,
        timer: 1200,
        showConfirmButton: false
      });

      // ดึง Google Apps Script เพื่อส่งไฟล์เก็บไว้บนคลาวด์ในเบื้องหลัง
      if (gasUrl) {
        fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            action: 'upload_file',
            parentFolderId: parentFolderId,
            folder: folderName,
            filename: fileName,
            base64Data: dataStr
          })
        })
        .then(async res => {
          if (res.ok) {
            const resData = await res.json().catch(() => ({}));
            if (resData.status === 'success' && resData.url && docType !== 'รูปถ่ายโปรไฟล์') {
              setDocState(prev => ({ ...prev, path: resData.url, data: resData.url }));
            }
          }
        })
        .catch(err => {
          console.warn('Google Drive application file upload warning:', err);
        });
      }
    };

    if (compressedBase64) {
      processUpload(compressedBase64);
    } else {
      const reader = new FileReader();
      reader.onload = () => processUpload(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!fullname || !username || !password || !phone) {
      Swal.fire('กรอกข้อมูลไม่ครบ', 'กรุณากรอกข้อมูลที่จำเป็น (*) ให้ครบถ้วน', 'warning');
      return;
    }

    // เช็ค username ซ้ำในระบบ
    if (users.some(u => u.username === username.trim())) {
      Swal.fire('ชื่อผู้ใช้ซ้ำ', 'ชื่อบัญชีนี้มีผู้ใช้งานแล้ว กรุณากรอกชื่อผู้ใช้อื่น', 'error');
      return;
    }

    // เช็คว่าแนบรูปโปรไฟล์หรือไม่ (ลิ้งก์หรือไฟล์แนบ)
    let finalAvatar = avatarUrl;
    if (avatarFile && avatarFile.data) {
      finalAvatar = avatarFile.data;
    }

    const parts = fullname.trim().split(/\s+/);
    const fname = parts[0] || 'Unknown';
    const lname = parts[1] || 'Unknown';

    // สร้างข้อมูลพนักงานสถานะ Pending
    const pendingUser = {
      username: username.trim(),
      password: password,
      fullname: fullname.trim(),
      role: 'Staff', // ค่าเริ่มต้นสำหรับสิทธิ์
      employeeId: nextEmployeeId,
      employeeType: 'พนักงานประจำ', // รอ admin มาแก้
      title: title,
      nickname: nickname.trim(),
      citizenId: citizenId.trim(),
      gender: gender,
      dob: dob,
      position: 'รอแอดมินกำหนดตำแหน่ง',
      startDate: new Date().toISOString().split('T')[0],
      phone: phone.trim(),
      email: email.trim(),
      basicSalary: 0, // รอแอดมินกำหนด
      status: 'Pending', // สถานะ Pending รออนุมัติ
      bankName: bankName,
      bankAccountNo: bankAccountNo.trim(),
      avatarUrl: finalAvatar,
      
      // ไฟล์เอกสารแนบ
      citizenIdDoc: citizenIdDoc,
      houseRegDoc: houseRegDoc,
      bankBookDoc: bankBookDoc,
      licenseDoc: licenseDoc,
      otherDoc: otherDoc
    };

    onRegister(pendingUser);

    Swal.fire({
      icon: 'success',
      title: 'ส่งใบสมัครงานเรียบร้อยแล้ว!',
      html: `
        <div style="font-family: var(--font-family); text-align: left; font-size: 0.95rem; line-height: 1.6;">
          ใบสมัครของท่านได้รับการบันทึกเข้าสู่ระบบแล้ว<br/>
          รหัสผู้สมัครอ้างอิง: <strong>${nextEmployeeId}</strong><br/>
          สถานะ: <strong style="color: var(--warning)">Pending (รอตรวจทานเอกสารและอนุมัติ)</strong><br/><br/>
          กรุณารอเจ้าหน้าที่ติดต่อกลับเพื่อแจ้งผลการพิจารณาใบสมัคร
        </div>
      `,
      confirmButtonColor: 'var(--secondary)'
    }).then(() => {
      // โยกกลับไปหน้าล็อกอินธรรมดา
      window.location.hash = '';
    });
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f3ece5 0%, #dfd1c3 100%)',
      padding: '2rem 1rem',
      fontFamily: "var(--font-family)"
    }}>
      <div className="card-3xl" style={{
        maxWidth: '850px',
        width: '100%',
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.4)',
        boxShadow: '0 20px 40px rgba(139, 90, 43, 0.1)',
        padding: '2.5rem'
      }}>
        
        {/* หัวเว็บใบสมัคร */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '70px',
            height: '70px',
            borderRadius: '50%',
            overflow: 'hidden',
            margin: '0 auto 1rem auto',
            border: '2px solid var(--secondary)',
            boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fff'
          }}>
            {clinicInfo.logoUrl ? (
              <img src={clinicInfo.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <Briefcase size={32} color="var(--secondary)" />
            )}
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--dark)', marginBottom: '0.25rem' }}>
            ฟอร์มใบสมัครงานพนักงานออนไลน์
          </h1>
          <p style={{ color: 'var(--dark-light)', fontSize: '0.9rem', fontWeight: 500 }}>
            {clinicInfo.name || 'คลินิกกิจกรรมบำบัด ฮักดีโฮม'} • สถานะคำขอสมัครงานเริ่มต้น [Pending]
          </p>
        </div>

        <div style={{
          backgroundColor: '#fffdf9',
          border: '1px solid #f1e4d7',
          borderRadius: 'var(--radius-xl)',
          padding: '1rem',
          marginBottom: '2rem',
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'flex-start',
          fontSize: '0.85rem',
          color: '#8b5a2b'
        }}>
          <ShieldAlert size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>คำชี้แจง:</strong> กรุณากรอกรายละเอียดประวัติจริงและอัปโหลดไฟล์เอกสารประกอบให้ครบถ้วน แอดมินผู้ดูแลระบบจะได้รับข้อมูลเพื่อไปตรวจสอบ ตรวจทานเอกสาร และเปลี่ยนแปลงสถานะเป็น Active เพื่ออนุมัติการเข้าใช้งานระบบในลำดับถัดไป
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* ส่วนที่ 1: ข้อมูลส่วนตัวพนักงาน */}
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--secondary)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <User size={18} />
              1. ข้อมูลประวัติส่วนตัวพนักงาน
            </h3>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">คำนำหน้า <span style={{ color: 'var(--danger)' }}>*</span></label>
                <select className="form-control" value={title} onChange={(e) => setTitle(e.target.value)} required>
                  <option value="นาย">นาย</option>
                  <option value="นาง">นาง</option>
                  <option value="นางสาว">นางสาว</option>
                </select>
              </div>

              <div className="form-group" style={{ flex: 2.5 }}>
                <label className="form-label">ชื่อ-นามสกุลจริง <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="กรอกชื่อจริงและนามสกุล" 
                  value={fullname}
                  onChange={(e) => setFullname(e.target.value)}
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">ชื่อเล่น <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="ชื่อเล่น" 
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  required 
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">เพศ</label>
                <select className="form-control" value={gender} onChange={(e) => setGender(e.target.value)}>
                  <option value="ชาย">ชาย</option>
                  <option value="หญิง">หญิง</option>
                  <option value="อื่นๆ">อื่นๆ</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">วัน/เดือน/ปีเกิด <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input 
                  type="date" 
                  className="form-control" 
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  required 
                />
              </div>

              <div className="form-group" style={{ flex: 1.5 }}>
                <label className="form-label">เลขบัตรประจำตัวประชาชน <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="เลขบัตรประชาชน 13 หลัก" 
                  maxLength={13}
                  value={citizenId}
                  onChange={(e) => setCitizenId(e.target.value)}
                  required 
                />
              </div>
            </div>
          </div>

          {/* ส่วนที่ 2: ข้อมูลการติดต่อ */}
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--secondary)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Phone size={18} />
              2. ช่องทางติดต่อและข้อมูลการรับเงิน
            </h3>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">เบอร์โทรศัพท์มือถือ <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input 
                  type="tel" 
                  className="form-control" 
                  placeholder="เช่น 08xxxxxxxx" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">อีเมลติดต่อ</label>
                <input 
                  type="email" 
                  className="form-control" 
                  placeholder="เช่น name@email.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row" style={{ marginTop: '0.5rem' }}>
              <div className="form-group">
                <label className="form-label">ชื่อธนาคารสำหรับรับเงินเดือน</label>
                <select className="form-control" value={bankName} onChange={(e) => setBankName(e.target.value)}>
                  <option value="กสิกรไทย">กสิกรไทย (KBANK)</option>
                  <option value="ไทยพาณิชย์">ไทยพาณิชย์ (SCB)</option>
                  <option value="กรุงไทย">กรุงไทย (KTB)</option>
                  <option value="กรุงเทพ">กรุงเทพ (BBL)</option>
                  <option value="ทหารไทยธนชาต">ทหารไทยธนชาต (TTB)</option>
                  <option value="ออมสิน">ออมสิน (GSB)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">เลขบัญชีธนาคาร</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="กรอกเลขบัญชีสำหรับรับโอนเงินเดือน" 
                  value={bankAccountNo}
                  onChange={(e) => setBankAccountNo(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* ส่วนที่ 3: อัปโหลดเอกสารหลักฐานแนบ */}
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--secondary)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <FileText size={18} />
              3. อัปโหลดเอกสารประกอบการสมัครงาน (จำลองพาธระบบคลาวด์)
            </h3>

            {/* อัปโหลดรูปภาพโปรไฟล์ */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1.5fr 1fr', 
              gap: '1rem', 
              backgroundColor: '#fafafa', 
              padding: '1rem', 
              borderRadius: 'var(--radius-lg)',
              marginBottom: '1rem',
              border: '1px dashed var(--border)',
              alignItems: 'center'
            }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>อัปโหลดรูปถ่ายหน้าตรงผู้สมัคร (หรือใส่ URL)</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => handleFileUpload(e, setAvatarFile, 'รูปถ่ายโปรไฟล์')} 
                    style={{ fontSize: '0.8rem' }}
                  />
                </div>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="หรือระบุ URL ลิงก์รูปภาพ เช่น https://example.com/photo.jpg" 
                  value={avatarUrl} 
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>พรีวิวรูปถ่าย</span>
                <div style={{ 
                  width: '65px', 
                  height: '65px', 
                  borderRadius: '50%', 
                  border: '2px solid var(--border)', 
                  backgroundColor: '#fff', 
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {avatarFile?.data ? (
                    <img src={avatarFile.data} alt="Avatar Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar Link" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => e.target.style.display = 'none'} />
                  ) : (
                    <ImageIcon size={28} color="var(--dark-light)" />
                  )}
                </div>
              </div>
            </div>

            {/* ตารางฟิลด์แนบไฟล์ 5 ประเภท */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              
              {/* 1. บัตรประชาชน */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0f0f0', paddingBottom: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', display: 'block' }}>บัตรประจำตัวประชาชน <span style={{ color: 'var(--danger)' }}>*</span></span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--dark-light)' }}>สำเนาสี หรือรูปถ่ายสีเห็นชัดเจน</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, setCitizenIdDoc, 'บัตรประจำตัวประชาชน')} required />
                  {citizenIdDoc && <FileCheck size={18} color="green" title="อัปโหลดแล้ว" />}
                </div>
              </div>

              {/* 2. ทะเบียนบ้าน */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0f0f0', paddingBottom: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', display: 'block' }}>ทะเบียนบ้าน <span style={{ color: 'var(--danger)' }}>*</span></span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--dark-light)' }}>หน้าที่มีที่อยู่และหน้าที่มีชื่อของท่าน</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, setHouseRegDoc, 'ทะเบียนบ้าน')} required />
                  {houseRegDoc && <FileCheck size={18} color="green" title="อัปโหลดแล้ว" />}
                </div>
              </div>

              {/* 3. สมุดบัญชีธนาคาร */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0f0f0', paddingBottom: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', display: 'block' }}>สำเนาสมุดบัญชีธนาคาร <span style={{ color: 'var(--danger)' }}>*</span></span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--dark-light)' }}>หน้าแรกที่แสดงชื่อและเลขบัญชีรับเงิน</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, setBankBookDoc, 'สมุดบัญชีธนาคาร')} required />
                  {bankBookDoc && <FileCheck size={18} color="green" title="อัปโหลดแล้ว" />}
                </div>
              </div>

              {/* 4. ใบประกอบวิชาชีพ */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0f0f0', paddingBottom: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', display: 'block' }}>เอกสารใบประกอบวิชาชีพ (ถ้ามี)</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--dark-light)' }}>สำหรับตำแหน่งนักกิจกรรมบำบัด / วิชาชีพ</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, setLicenseDoc, 'เอกสารใบประกอบวิชาชีพ')} />
                  {licenseDoc && <FileCheck size={18} color="green" title="อัปโหลดแล้ว" />}
                </div>
              </div>

              {/* 5. เอกสารอื่นๆ */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', display: 'block' }}>เอกสารอื่นๆ เพิ่มเติม (ถ้ามี)</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--dark-light)' }}>เช่น Transcript, ใบเปลี่ยนชื่อ, ประวัติการทำงาน</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <input type="file" accept="image/*,.pdf,.zip" onChange={(e) => handleFileUpload(e, setOtherDoc, 'เอกสารอื่นๆ')} />
                  {otherDoc && <FileCheck size={18} color="green" title="อัปโหลดแล้ว" />}
                </div>
              </div>

            </div>
          </div>

          {/* ส่วนที่ 4: ข้อมูลบัญชีที่ต้องการใช้ล็อกอินเข้าระบบหลังได้รับการอนุมัติ */}
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--secondary)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Key size={18} />
              4. กำหนดชื่อบัญชีผู้ใช้งานที่ต้องการ (สำหรับลงชื่อเข้าใช้ภายหลังได้รับการอนุมัติ)
            </h3>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">ชื่อบัญชีผู้ใช้ระบบ (Username) <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="พิมพ์เป็นภาษาอังกฤษเท่านั้น (ไม่มีช่องว่าง)" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">รหัสผ่านสำหรับล็อกอิน (Password) <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input 
                  type="password" 
                  className="form-control" 
                  placeholder="ตั้งรหัสผ่านสำหรับเข้าใช้ระบบ" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </div>
            </div>
          </div>

          {/* ปุ่มส่งคำขอสมัครงาน */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button 
              type="button" 
              className="btn btn-light" 
              onClick={() => {
                Swal.fire({
                  title: 'ยกเลิกการสมัครงาน?',
                  text: 'ข้อมูลที่ท่านกรอกไว้ในฟอร์มสมัครงานนี้ทั้งหมดจะสูญหาย',
                  icon: 'warning',
                  showCancelButton: true,
                  confirmButtonColor: 'var(--danger)',
                  confirmButtonText: 'ยกเลิกสมัคร',
                  cancelButtonText: 'กรอกฟอร์มต่อ'
                }).then(res => {
                  if (res.isConfirmed) {
                    window.location.hash = '';
                  }
                });
              }}
            >
              ยกเลิก
            </button>
            <button type="submit" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.6rem 2rem' }}>
              ส่งคำขอสมัครงาน <ChevronRight size={16} />
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
