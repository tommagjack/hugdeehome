import React, { useState, useEffect } from 'react';
import { User, Image, Lock, Shield, Phone, Mail, Award, Check } from 'lucide-react';
import Swal from 'sweetalert2';

export default function UserProfile({ currentUser, onUpdateProfile, users }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [imgError, setImgError] = useState(false);

  // โหลดข้อมูลปัจจุบัน
  useEffect(() => {
    if (currentUser) {
      setUsername(currentUser.username || '');
      setPassword(currentUser.password || '');
      setAvatarUrl(currentUser.avatarUrl || '');
      setAvatarFile(null);
      setImgError(false);
    }
  }, [currentUser]);

  useEffect(() => {
    setImgError(false);
  }, [avatarUrl]);

  const handleUrlChange = (val) => {
    let formatted = val.trim();
    if (formatted && !formatted.startsWith('http://') && !formatted.startsWith('https://') && !formatted.startsWith('data:image')) {
      formatted = 'https://' + formatted;
    }
    setAvatarUrl(formatted);
    setImgError(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      Swal.fire('ไฟล์มีขนาดใหญ่เกินไป', 'กรุณาอัปโหลดไฟล์ขนาดไม่เกิน 3MB เพื่อประหยัดพื้นที่ระบบ', 'error');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result;
      setAvatarUrl(base64Data);
      setImgError(false);
      setAvatarFile({
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        data: base64Data
      });

      Swal.fire({
        icon: 'success',
        title: 'แนบรูปโปรไฟล์สำเร็จ',
        text: 'แสดงผลรูปภาพเรียบร้อย กรุณากด "บันทึกการเปลี่ยนแปลง" เพื่อยืนยัน',
        timer: 1500,
        showConfirmButton: false
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      Swal.fire('ข้อมูลไม่ครบถ้วน', 'ชื่อผู้ใช้งานระบบและรหัสผ่านห้ามว่างเปล่า', 'error');
      return;
    }

    // ตรวจสอบชื่อผู้ใช้งานซ้ำกับคนอื่นในระบบ (ยกเว้นตัวเอง)
    if (currentUser.username !== 'admin') {
      const isDuplicate = users.some(u => u.username === username && u.username !== currentUser.username && u.username !== 'admin');
      if (isDuplicate) {
        Swal.fire('ชื่อผู้ใช้ซ้ำ', 'ชื่อผู้ใช้งานนี้ถูกใช้โดยพนักงานคนอื่นแล้ว กรุณาใช้ชื่ออื่น', 'warning');
        return;
      }
    }

    const updatedUser = {
      ...currentUser,
      username: username.trim(),
      password: password.trim(),
      avatarUrl: avatarUrl
    };

    onUpdateProfile(updatedUser);

    Swal.fire({
      icon: 'success',
      title: 'บันทึกข้อมูลส่วนตัวสำเร็จ!',
      text: 'ข้อมูลโปรไฟล์และการตั้งค่าบัญชีได้รับการอัปเดตเรียบร้อย',
      confirmButtonColor: 'var(--secondary)'
    });
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="page-header">
        <h1 className="page-title">
          <User size={28} />
          ข้อมูลส่วนตัวผู้ใช้งาน (My Profile)
        </h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '2rem' }}>
        
        {/* คาร์ดด้านซ้าย: ข้อมูลส่วนตัว (Read-only) */}
        <div className="card-3xl" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', backgroundColor: '#FEF8F1', border: '1.5px dashed var(--secondary-light)' }}>
          <div style={{ width: '130px', height: '130px', borderRadius: '50%', border: '4px solid white', boxShadow: 'var(--shadow-md)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--secondary-light)', marginBottom: '1.5rem', flexShrink: 0 }}>
            {!imgError && avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt="Avatar" 
                referrerPolicy="no-referrer"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                onError={() => setImgError(true)} 
              />
            ) : (
              <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--secondary)' }}>
                {getInitials(currentUser?.fullname || 'ผู้ใช้งาน')}
              </span>
            )}
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--dark)' }}>
            {currentUser?.fullname || 'ผู้ใช้งานระบบ'}
          </h2>
          {currentUser?.nickname && (
            <div style={{ fontSize: '0.95rem', color: 'var(--secondary)', fontWeight: 600, marginTop: '2px' }}>
              ({currentUser.nickname})
            </div>
          )}

          <div className="badge badge-secondary" style={{ marginTop: '0.75rem', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
            {currentUser?.role === 'Admin' ? 'ผู้ดูแลระบบ (Admin)' : currentUser?.role === 'OT' ? 'นักกิจกรรมบำบัด (OT)' : 'พนักงานทั่วไป (Staff)'}
          </div>

          <div style={{ width: '100%', borderTop: '1px solid var(--border)', marginTop: '2rem', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Award size={18} color="var(--secondary)" />
              <div><strong>รหัสพนักงาน:</strong> {currentUser?.employeeId || '-'}</div>
            </div>
            
            {currentUser?.position && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <Shield size={18} color="var(--secondary)" />
                <div><strong>ตำแหน่งงาน:</strong> {currentUser?.position}</div>
              </div>
            )}
            
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Phone size={18} color="var(--secondary)" />
              <div><strong>เบอร์โทรศัพท์:</strong> {currentUser?.phone || '-'}</div>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Mail size={18} color="var(--secondary)" />
              <div><strong>อีเมล:</strong> {currentUser?.email || '-'}</div>
            </div>
          </div>
        </div>

        {/* คาร์ดด้านขวา: แบบฟอร์มแก้ไขบัญชี */}
        <div className="card-3xl" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '1.5rem', color: 'var(--dark)' }}>
            ตั้งค่าความปลอดภัยของบัญชีและการแสดงผล (Edit Settings)
          </h3>

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            <div className="form-group">
              <label className="form-label">
                <Image size={16} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
                รูปภาพโปรไฟล์ (Profile Avatar)
              </label>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <input 
                    type="file" 
                    className="form-control"
                    accept="image/*" 
                    onChange={handleFileUpload} 
                    style={{ fontSize: '0.85rem' }}
                  />
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="หรือระบุลิงก์ URL รูปภาพ (เช่น https://...)" 
                    value={avatarUrl.startsWith('data:image') ? '' : avatarUrl} 
                    onChange={(e) => handleUrlChange(e.target.value)}
                    style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  <User size={16} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
                  ชื่อผู้ใช้งานระบบ (Username) <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Lock size={16} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
                  รหัสผ่าน (Password) <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.5rem', fontSize: '0.95rem' }}>
                <Check size={18} />
                บันทึกการเปลี่ยนแปลง
              </button>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
}
