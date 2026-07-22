import { useState, useMemo, useEffect } from 'react';
import { 
  Users2, 
  Plus, 
  Edit3, 
  Trash2,
  Download,
  Upload,
  Printer
} from 'lucide-react';
import Swal from 'sweetalert2';
import { exportToCSV, parseCSV } from '../utils/csvHelper';
import { getGasUrl } from '../utils/db';

const formatDateToInputDate = (dateStr) => {
  if (!dateStr) return '';
  let cleanStr = String(dateStr).trim().split('T')[0].split(' ')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
    return cleanStr;
  }
  const dmyMatch = cleanStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }
  const ymdMatch = cleanStr.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return '';
};

const headersMap = {
  username: ['username', 'ชื่อผู้ใช้', 'ชื่อบัญชีผู้ใช้ (username)', 'ชื่อบัญชี', 'ชื่อบัญชีผู้ใช้', 'ชื่อผู้ใช้ (username)'],
  password: ['password', 'รหัสผ่าน', 'รหัสผ่าน (password)'],
  employeeId: ['employeeid', 'รหัสพนักงาน', 'รหัส', 'id'],
  title: ['title', 'คำนำหน้า', 'คำนำหน้าชื่อ', 'prefix'],
  fullname: ['fullname', 'ชื่อ-นามสกุล', 'ชื่อ-สกุล', 'ชื่อสกุล', 'ชื่อนามสกุล', 'name'],
  nickname: ['nickname', 'ชื่อเล่น'],
  role: ['role', 'สิทธิ์', 'สิทธิ์การใช้งาน', 'สิทธิ์การใช้งาน (admin/ot/staff)', 'สิทธิ์การเข้าใช้งานระบบ'],
  employeeType: ['employeetype', 'ประเภทพนักงาน', 'ประเภทของพนักงาน', 'emptype'],
  position: ['position', 'ตำแหน่ง', 'ตำแหน่งงาน'],
  citizenId: ['citizenid', 'เลขบัตรประชาชน', 'เลขประจำตัวประชาชน', 'เลขบัตรประจำตัวประชาชน', 'idcard', 'id_card', 'id card'],
  gender: ['gender', 'เพศ'],
  dob: ['dob', 'วันเกิด', 'วันเกิด (yyyy-mm-dd)', 'วันเกิด (ค.ศ. yyyy-mm-dd)'],
  startDate: ['startdate', 'วันที่เริ่มงาน', 'วันที่เริ่มงาน (yyyy-mm-dd)', 'วันที่เริ่มงาน (ค.ศ. yyyy-mm-dd)'],
  phone: ['phone', 'เบอร์โทร', 'เบอร์โทรศัพท์', 'เบอร์ติดต่อ', 'โทรศัพท์'],
  email: ['email', 'อีเมล', 'e-mail'],
  basicSalary: ['basicsalary', 'เงินเดือน', 'เงินเดือนพื้นฐาน', 'ฐานเงินเดือน'],
  status: ['status', 'สถานะ', 'สถานะการใช้งาน', 'สถานะ (active/inactive)'],
  bankName: ['bankname', 'ชื่อธนาคาร', 'ธนาคาร'],
  bankAccountNo: ['bankaccountno', 'เลขบัญชี', 'เลขบัญชีธนาคาร', 'เลขที่บัญชี'],
  avatarUrl: ['avatarurl', 'รูปโปรไฟล์', 'ลิ้งก์รูปภาพ', 'รูปภาพ', 'profile url', 'รูปโปรไฟล์ (profile url)'],
  userFolderUrl: ['userfolderurl', 'ลิงก์โฟลเดอร์พนักงาน', 'โฟลเดอร์พนักงาน', 'folder url', 'user folder url', 'userfolderurl', 'ลิงก์โฟลเดอร์พนักงาน (userfolderurl)'],
  contractDoc: ['contractdoc', 'สัญญาจ้าง', 'เอกสารสัญญาจ้าง', 'contract doc', 'contract_doc', 'contractdoc']
};

const getNextEmployeeId = (userList) => {
  let maxId = 0;
  userList.forEach(u => {
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
};

export default function Users({ users, setUsers, setPrintView }) {
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUsername, setEditingUsername] = useState(null);
  
  // สถานะฟอร์มข้อมูลผู้ใช้/พนักงาน
  const [uUsername, setUUsername] = useState('');
  const [uPassword, setUPassword] = useState('');
  const [uFullname, setUFullname] = useState('');
  const [uRole, setURole] = useState('Staff');
  const [uEmployeeId, setUEmployeeId] = useState('');
  const [uEmployeeType, setUEmployeeType] = useState('พนักงานประจำ');
  const [uTitle, setUTitle] = useState('นาย');
  const [uNickname, setUNickname] = useState('');
  const [uCitizenId, setUCitizenId] = useState('');
  const [uGender, setUGender] = useState('ชาย');
  const [uDob, setUDob] = useState('');
  const [uPosition, setUPosition] = useState('');
  const [uStartDate, setUStartDate] = useState('');
  const [uPhone, setUPhone] = useState('');
  const [uEmail, setUEmail] = useState('');
  const [uBasicSalary, setUBasicSalary] = useState('');
  const [uStatus, setUStatus] = useState('Active');
  const [uBankName, setUBankName] = useState('กสิกรไทย');
  const [uBankAccountNo, setUBankAccountNo] = useState('');
  const [uAvatarUrl, setUAvatarUrl] = useState('');
  const [uUserFolderUrl, setUUserFolderUrl] = useState('');
  const [uIsConnectingFolder, setUIsConnectingFolder] = useState(false);

  // ฟิลด์ไฟล์แนบจำลองเอกสาร
  const [uAvatarFile, setUAvatarFile] = useState(null);
  const [uCitizenIdDoc, setUCitizenIdDoc] = useState(null);
  const [uHouseRegDoc, setUHouseRegDoc] = useState(null);
  const [uBankBookDoc, setUBankBookDoc] = useState(null);
  const [uLicenseDoc, setULicenseDoc] = useState(null);
  const [uContractDoc, setUContractDoc] = useState(null);
  const [uOtherDoc, setUOtherDoc] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // รีเซ็ตหน้าเมื่อเปลี่ยนคำค้นหา
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // ฟังก์ชันอัปโหลดไฟล์ไปยังเซิร์ฟเวอร์จำลอง
  const handleFileUpload = (e, setDocState, docType) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      Swal.fire('ไฟล์มีขนาดใหญ่เกินไป', 'กรุณาอัปโหลดไฟล์ขนาดไม่เกิน 5MB เพื่อเซฟเนื้อที่ระบบ', 'error');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const origName = file.name;
      const ext = origName.substring(origName.lastIndexOf('.'));
      
      const parts = String(uFullname || '').trim().split(/\s+/);
      const fname = parts[0] || 'Unknown';
      const lname = parts[1] || 'Unknown';
      const folderName = `${uEmployeeId || 'TEMP'}-${fname}-${lname}`;
      const fileName = `${uEmployeeId || 'TEMP'}-${fname}-${lname}-${docType}${ext}`;

      // ดึง Google Apps Script URL และ Google Drive Folder ID
      const gasUrl = getGasUrl();
      const clinicDataStr = localStorage.getItem('hdh_clinic_info');
      const clinicData = clinicDataStr ? JSON.parse(clinicDataStr) : {};
      
      let parentFolderId = '';
      let folderNameParam = folderName;
      
      // ถ้ามีการตั้งค่าโฟลเดอร์พนักงานโดยเฉพาะ ให้ใช้โฟลเดอร์นั้นและเขียนลงไปตรงๆ (ไม่ต้องสร้างโฟลเดอร์พนักงานซ้ำซ้อนด้านใน)
      if (uUserFolderUrl) {
        const match = uUserFolderUrl.match(/\/folders\/([a-zA-Z0-9-_]+)/);
        if (match) {
          parentFolderId = match[1];
          folderNameParam = '';
        }
      }
      
      if (!parentFolderId) {
        parentFolderId = clinicData.folderId || '';
        if (!parentFolderId && clinicData.folderUrl) {
          const match = clinicData.folderUrl.match(/\/folders\/([a-zA-Z0-9-_]+)/);
          parentFolderId = match ? match[1] : null;
        }
      }
      
      if (!parentFolderId) {
        parentFolderId = '1A2B3C4D5E6F7G8H9I0J'; // fallback default
      }

      if (gasUrl) {
        // Direct browser upload to Google Apps Script Web App to bypass Vercel's 4.5MB payload limit.
        // Use Content-Type: 'text/plain' to avoid CORS preflight OPTIONS request.
        fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            action: 'upload_file',
            parentFolderId: parentFolderId,
            folder: folderNameParam,
            filename: fileName,
            base64Data: reader.result
          })
        })
        .then(async res => {
          if (!res.ok) {
            throw new Error(`Google Apps Script returned status ${res.status}`);
          }
          const data = await res.json();
          if (data.status !== 'success') {
            throw new Error(data.message || 'อัปโหลดไปยัง Google Drive ล้มเหลว');
          }
          return data;
        })
        .then(data => {
          setDocState({
            name: origName,
            size: `${(file.size / 1024).toFixed(1)} KB`,
            path: data.url,
            data: data.url, // เก็บเป็นลิงก์แทน Base64 เพื่อป้องกัน LocalStorage เต็ม
            uploadedAt: new Date().toISOString()
          });
          Swal.fire({
            icon: 'success',
            title: 'อัปโหลดสำเร็จ',
            text: `บันทึกไฟล์ ${origName} เรียบร้อย`,
            timer: 1200,
            showConfirmButton: false
          });
        })
        .catch(err => {
          console.error(err);
          Swal.fire('อัปโหลดล้มเหลว', err.message || 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์', 'error');
        });
      } else {
        const base64Data = reader.result;
        setDocState({
          name: origName,
          size: `${(file.size / 1024).toFixed(1)} KB`,
          path: base64Data,
          data: base64Data,
          uploadedAt: new Date().toISOString()
        });
        if (docType === 'รูปถ่ายโปรไฟล์') {
          setUAvatarUrl(base64Data);
        }
        Swal.fire({
          icon: 'success',
          title: 'แนบไฟล์สำเร็จ',
          text: `แนบไฟล์ ${origName} เรียบร้อย`,
          timer: 1200,
          showConfirmButton: false
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // ฟังก์ชันสร้างและเชื่อมต่อโฟลเดอร์พนักงานบน Google Drive
  const handleConnectFolder = () => {
    const parts = String(uFullname || '').trim().split(/\s+/);
    const fname = parts[0] || '';
    if (!uEmployeeId || !fname) {
      Swal.fire('ข้อมูลไม่ครบถ้วน', 'กรุณาระบุรหัสพนักงานและชื่อ-นามสกุลก่อนเพื่อใช้ตั้งชื่อโฟลเดอร์', 'warning');
      return;
    }
    
    const folderName = `${uEmployeeId}-${fname}-${parts[1] || ''}`.trim().replace(/-$/, '');
    
    // ดึง GAS URL และ Parent Folder ID ของระบบ
    const gasUrl = getGasUrl();
    if (!gasUrl) {
      Swal.fire('ไม่พบ GAS URL', 'กรุณาตั้งค่า Google Apps Script Web App URL ในหน้าตั้งค่าระบบก่อน', 'warning');
      return;
    }
    
    const clinicDataStr = localStorage.getItem('hdh_clinic_info');
    const clinicData = clinicDataStr ? JSON.parse(clinicDataStr) : {};
    let parentFolderId = clinicData.folderId || '';
    if (!parentFolderId && clinicData.folderUrl) {
      const match = clinicData.folderUrl.match(/\/folders\/([a-zA-Z0-9-_]+)/);
      parentFolderId = match ? match[1] : null;
    }
    if (!parentFolderId) {
      parentFolderId = '1A2B3C4D5E6F7G8H9I0J'; // fallback default
    }

    setUIsConnectingFolder(true);
    
    // Direct browser fetch to Google Apps Script Web App to bypass Vercel and prevent CORS preflight OPTIONS request
    fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'create_folder',
        folder: folderName,
        parentFolderId: parentFolderId
      })
    })
    .then(async res => {
      if (!res.ok) {
        throw new Error(`Google Apps Script returned status ${res.status}`);
      }
      const data = await res.json();
      if (data.status !== 'success') {
        throw new Error(data.message || 'สร้างโฟลเดอร์ล้มเหลว');
      }
      return data;
    })
    .then(data => {
      if (data.url) {
        setUUserFolderUrl(data.url);
        Swal.fire({
          icon: 'success',
          title: 'เชื่อมต่อโฟลเดอร์สำเร็จ',
          text: 'สร้างโฟลเดอร์ Google Drive เรียบร้อยแล้ว (⚠️ กรุณากดปุ่ม "บันทึก" ด้านล่างสุดเพื่อบันทึกข้อมูลพนักงานลงระบบ)',
          confirmButtonColor: '#b0895a'
        });
      }
    })
    .catch(err => {
      console.error(err);
      Swal.fire('เชื่อมต่อล้มเหลว', err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อโฟลเดอร์', 'error');
    })
    .finally(() => {
      setUIsConnectingFolder(false);
    });
  };

  // ฟังก์ชันช่วยแยกวิเคราะห์เอกสาร (String หรือ Object)
  const parseDoc = (doc) => {
    if (!doc) return null;
    if (typeof doc === 'string') {
      const clean = doc.trim();
      if (clean.startsWith('{') && clean.endsWith('}')) {
        try {
          return JSON.parse(clean);
        } catch (e) {
          console.error('Error parsing doc JSON:', e);
        }
      }
      return { name: 'document', path: clean, data: clean };
    }
    return doc;
  };

  // ฟังก์ชันดูเอกสารแบบปลอดภัย
  const handleViewDoc = (doc) => {
    const parsed = parseDoc(doc);
    if (!parsed || (!parsed.path && !parsed.data)) {
      Swal.fire('ไม่พบที่อยู่เอกสาร', 'เอกสารนี้ไม่มีลิงก์เชื่อมโยงที่ถูกต้อง', 'warning');
      return;
    }
    const url = parsed.path || parsed.data;
    window.open(url, '_blank');
  };

  // ฟังก์ชันดาวน์โหลดไฟล์แบบจำลอง
  const handleDownloadFile = (doc) => {
    const parsed = parseDoc(doc);
    if (!parsed || !parsed.data) {
      Swal.fire('ไม่พบข้อมูลไฟล์', 'ไม่สามารถดาวน์โหลดได้เนื่องจากไฟล์ไม่มีข้อมูล', 'warning');
      return;
    }
    const link = document.createElement('a');
    link.href = parsed.data;
    link.download = parsed.name || (parsed.path ? parsed.path.split('/').pop() : 'download');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    Swal.fire({
      icon: 'success',
      title: 'ดาวน์โหลดสำเร็จ',
      text: `ชื่อไฟล์: ${link.download}`,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 1500
    });
  };

  const resetUserForm = () => {
    setEditingUsername(null);
    setUUsername('');
    setUPassword('');
    setUFullname('');
    setURole('Staff');
    setUEmployeeId(getNextEmployeeId(users));
    setUEmployeeType('พนักงานประจำ');
    setUTitle('นาย');
    setUNickname('');
    setUCitizenId('');
    setUGender('ชาย');
    setUDob('');
    setUPosition('');
    setUStartDate('');
    setUPhone('');
    setUEmail('');
    setUBasicSalary('');
    setUStatus('Active');
    setUBankName('กสิกรไทย');
    setUAvatarUrl('');
    setUAvatarFile(null);
    setUCitizenIdDoc(null);
    setUHouseRegDoc(null);
    setUBankBookDoc(null);
    setULicenseDoc(null);
    setUContractDoc(null);
    setUOtherDoc(null);
    setUUserFolderUrl('');
  };

  const handleEditUser = (u) => {
    setEditingUsername(u.username);
    setUUsername(u.username);
    setUPassword(u.password);
    setUFullname(u.fullname);
    setURole(u.role);
    setUEmployeeId(u.employeeId || getNextEmployeeId(users));
    setUEmployeeType(u.employeeType || 'พนักงานประจำ');
    setUTitle(u.title || 'นาย');
    setUNickname(u.nickname || '');
    setUCitizenId(u.citizenId || '');
    setUGender(u.gender || 'ชาย');
    setUDob(formatDateToInputDate(u.dob));
    setUPosition(u.position || '');
    setUStartDate(formatDateToInputDate(u.startDate));
    setUPhone(u.phone || '');
    setUEmail(u.email || '');
    setUBasicSalary(u.basicSalary || '');
    setUStatus(u.status || 'Active');
    setUBankName(u.bankName || 'กสิกรไทย');
    setUBankAccountNo(u.bankAccountNo || '');
    setUAvatarUrl(u.avatarUrl || '');
    setUAvatarFile(u.avatarFile || null);
    setUCitizenIdDoc(u.citizenIdDoc || null);
    setUHouseRegDoc(u.houseRegDoc || null);
    setUBankBookDoc(u.bankBookDoc || null);
    setULicenseDoc(u.licenseDoc || null);
    setUContractDoc(u.contractDoc || null);
    setUOtherDoc(u.otherDoc || null);
    setUUserFolderUrl(u.userFolderUrl || '');
    setShowUserModal(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    
    const isNew = !editingUsername;
    
    if (isNew) {
      if (!uEmail || !uPassword) {
        Swal.fire('ข้อมูลไม่ครบถ้วน', 'จำเป็นต้องระบุอีเมลและรหัสผ่านสำหรับลงทะเบียนบัญชี Supabase Auth', 'error');
        return;
      }
      
      Swal.fire({
        title: 'กำลังลงทะเบียนบัญชี...',
        text: 'กำลังบันทึกสิทธิ์บนระบบ Supabase Auth',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        const authClient = createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          }
        });
        
        const { data, error } = await authClient.auth.signUp({
          email: uEmail,
          password: uPassword,
          options: {
            data: {
              username: uUsername,
              role: uRole
            }
          }
        });
        
        if (error) throw new Error(error.message);
        
      } catch (err) {
        console.error('Auth registration error:', err);
        Swal.fire('การลงทะเบียนบัญชีผู้ใช้ล้มเหลว', 'ไม่สามารถสร้างบัญชีในระบบความปลอดภัยได้: ' + err.message, 'error');
        return;
      }
    }
    
    const newUser = {
      username: uUsername,
      password: '', // ไม่เก็บรหัสผ่านเป็นข้อความธรรมดา (Plaintext) อีกต่อไป เพื่อความปลอดภัย PDPA
      fullname: uFullname,
      role: uRole,
      employeeId: uEmployeeId,
      employeeType: uEmployeeType,
      title: uTitle,
      nickname: uNickname,
      citizenId: uCitizenId,
      gender: uGender,
      dob: uDob,
      position: uPosition,
      startDate: uStartDate,
      phone: uPhone,
      email: uEmail,
      basicSalary: Number(uBasicSalary) || 0,
      status: uStatus,
      bankName: uBankName,
      bankAccountNo: uBankAccountNo,
      avatarUrl: uAvatarFile?.data ? uAvatarFile.data : uAvatarUrl,
      avatarFile: uAvatarFile,
      citizenIdDoc: uCitizenIdDoc,
      houseRegDoc: uHouseRegDoc,
      bankBookDoc: uBankBookDoc,
      licenseDoc: uLicenseDoc,
      contractDoc: uContractDoc,
      otherDoc: uOtherDoc,
      userFolderUrl: uUserFolderUrl
    };

    if (editingUsername) {
      if (uUsername !== editingUsername && (users.some(u => u.username === uUsername) || uUsername.toLowerCase() === 'admin')) {
        Swal.fire('ชื่อผู้ใช้ซ้ำ', 'มีชื่อล็อกอินนี้ในระบบหรือถูกสงวนไว้แล้ว', 'error');
        return;
      }
      setUsers(users.map(u => u.username === editingUsername ? newUser : u));
      Swal.fire({ icon: 'success', title: 'อัปเดตข้อมูลสำเร็จ', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
    } else {
      if (users.find(u => u.username === uUsername) || uUsername.toLowerCase() === 'admin') {
        Swal.fire('ชื่อผู้ใช้ซ้ำ', 'มีชื่อล็อกอินนี้ในระบบหรือถูกสงวนไว้แล้ว', 'error');
        return;
      }
      setUsers([...users, newUser]);
      Swal.fire({ icon: 'success', title: 'เพิ่มผู้ใช้งานสำเร็จ', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
    }
    setShowUserModal(false);
    resetUserForm();
  };

  const handleDeleteUser = (username) => {
    if (username === 'admin') {
      Swal.fire('ข้อห้าม', 'ไม่สามารถลบผู้ใช้หลักระบบ (admin) ได้', 'error');
      return;
    }
    Swal.fire({
      title: 'ลบผู้ใช้งานระบบรายนี้?',
      text: 'การลบจะทำให้บัญชีไม่สามารถเข้าใช้งานระบบได้อีกต่อไป',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--danger)',
      cancelButtonColor: 'var(--dark-light)',
      confirmButtonText: 'ยืนยันลบ',
      cancelButtonText: 'ยกเลิก'
    }).then(res => {
      if (res.isConfirmed) {
        setUsers(users.filter(u => u.username !== username));
        Swal.fire({ icon: 'success', title: 'ลบข้อมูลสำเร็จ', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
      }
    });
  };

  const handleExportCSV = () => {
    const headers = [
      'ชื่อผู้ใช้ (Username)', 'รหัสผ่าน (Password)', 'รหัสพนักงาน', 'คำนำหน้า', 'ชื่อ-นามสกุล', 'ชื่อเล่น',
      'สิทธิ์การใช้งาน (Admin/OT/Staff)', 'ประเภทพนักงาน', 'ตำแหน่งงาน', 'เลขบัตรประชาชน', 'เพศ',
      'วันเกิด (YYYY-MM-DD)', 'วันที่เริ่มงาน (YYYY-MM-DD)', 'เบอร์โทรศัพท์', 'อีเมล', 'เงินเดือนพื้นฐาน',
      'สถานะ (Active/Inactive)', 'ชื่อธนาคาร', 'เลขบัญชีธนาคาร', 'รูปโปรไฟล์ (Profile URL)', 'ลิงก์โฟลเดอร์พนักงาน (UserFolderURL)', 'สัญญาจ้าง (ContractDoc)'
    ];

    let rows;
    if (users.length === 0) {
      rows = [
        ['staff_example', '123456', 'HDH005', 'นางสาว', 'สมศรี รักงานดี', 'ศรี', 'Staff', 'พนักงานประจำ', 'ธุรการ', '1234567890123', 'หญิง', '1995-05-15', '2026-06-01', '0891234567', 'somsri@hugdeehome.com', '15000', 'Active', 'กสิกรไทย', '123-4-56789-0', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330']
      ];
      Swal.fire({
        title: 'ส่งออกไฟล์เทมเพลต',
        text: 'เนื่องจากไม่มีข้อมูลบัญชีผู้ใช้ในระบบ ระบบจะส่งออกเป็นไฟล์เทมเพลตตัวอย่าง',
        icon: 'info',
        confirmButtonColor: 'var(--secondary)'
      });
    } else {
      rows = users.map(u => [
        u.username,
        u.password,
        u.employeeId || '',
        u.title || '',
        u.fullname,
        u.nickname || '',
        u.role,
        u.employeeType || '',
        u.position || '',
        u.citizenId ? (String(u.citizenId).trim().match(/^\d+$/) ? "'" + String(u.citizenId).trim() : u.citizenId) : '',
        u.gender || '',
        u.dob || '',
        u.startDate || '',
        u.phone ? (String(u.phone).trim().match(/^\d+$/) ? "'" + String(u.phone).trim() : u.phone) : '',
        u.email || '',
        u.basicSalary || 0,
        u.status || 'Active',
        u.bankName || '',
        u.bankAccountNo ? (String(u.bankAccountNo).trim().match(/^\d+$/) ? "'" + String(u.bankAccountNo).trim() : u.bankAccountNo) : '',
        u.avatarUrl || '',
        u.userFolderUrl || '',
        u.contractDoc ? JSON.stringify(u.contractDoc) : ''
      ]);
    }

    exportToCSV('system_users.csv', headers, rows);
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

      // ตรวจสอบคีย์ระบุพนักงาน (ต้องการ employeeId หรือ fullname เพื่อทำการอัปเดต)
      // หรือหากนำเข้าพนักงานใหม่ทั้งหมด ต้องมีข้อมูลพื้นฐานหลักครบถ้วน
      const hasRequiredForNew = indexMap.username !== undefined && indexMap.password !== undefined && indexMap.fullname !== undefined && indexMap.role !== undefined;
      const hasRequiredForUpdate = indexMap.employeeId !== undefined || indexMap.fullname !== undefined;

      if (!hasRequiredForNew && !hasRequiredForUpdate) {
        Swal.fire({
          icon: 'error',
          title: 'รูปแบบคอลัมน์ไม่ถูกต้อง',
          text: 'กรุณาตรวจสอบว่ามีคอลัมน์ รหัสพนักงาน (ID) หรือ ชื่อ-นามสกุล (Name) เพื่อระบุตัวตนพนักงาน',
          confirmButtonColor: 'var(--secondary)'
        });
        return;
      }

      let addedCount = 0;
      let updatedCount = 0;
      let errorCount = 0;

      let currentUsersList = [...users];

      rows.forEach(row => {
        if (row.length === 0 || (row.length === 1 && row[0] === '')) return;

        const val = (key) => {
          const idx = indexMap[key];
          if (idx === undefined || row[idx] === undefined) return '';
          let cleanVal = row[idx].trim();
          if (cleanVal.startsWith('="') && cleanVal.endsWith('"')) {
            cleanVal = cleanVal.slice(2, -1);
          }
          if (cleanVal.startsWith("'") || cleanVal.startsWith('\t')) {
            cleanVal = cleanVal.slice(1);
          }
          return cleanVal;
        };

        const username = val('username');
        const fullname = val('fullname');
        const employeeId = val('employeeId');

        // ค้นหาพนักงานเดิมเพื่ออัปเดต
        let existingUserIndex = -1;
        if (employeeId) {
          existingUserIndex = currentUsersList.findIndex(u => u && u.employeeId && String(u.employeeId).toLowerCase() === String(employeeId).toLowerCase());
        }
        if (existingUserIndex === -1 && fullname) {
          existingUserIndex = currentUsersList.findIndex(u => u && u.fullname && u.fullname.trim().toLowerCase() === fullname.trim().toLowerCase());
        }
        if (existingUserIndex === -1 && username) {
          existingUserIndex = currentUsersList.findIndex(u => u && u.username && u.username.trim().toLowerCase() === username.trim().toLowerCase());
        }

        if (existingUserIndex !== -1) {
          const existingUser = currentUsersList[existingUserIndex];
          const updatedUserData = { ...existingUser };

          if (val('title')) updatedUserData.title = val('title');
          if (val('nickname')) updatedUserData.nickname = val('nickname');
          if (val('gender')) updatedUserData.gender = val('gender');
          if (val('dob')) updatedUserData.dob = val('dob');
          if (val('phone')) updatedUserData.phone = val('phone');
          if (val('email')) updatedUserData.email = val('email');
          
          if (val('citizenId')) {
            updatedUserData.citizenId = val('citizenId');
          }

          if (val('employeeType')) {
            let empType = val('employeeType');
            const empTypeLower = empType.toLowerCase();
            if (empTypeLower === 'full-time' || empTypeLower === 'fulltime') {
              empType = 'พนักงานประจำ';
            } else if (empTypeLower === 'part-time' || empTypeLower === 'parttime') {
              empType = 'พนักงานชั่วคราว';
            } else if (empTypeLower.includes('freelance') || empTypeLower.includes('อิสระ')) {
              empType = 'นักบำบัดอิสระ (Freelance)';
            }
            updatedUserData.employeeType = empType;
          }

          if (val('position')) updatedUserData.position = val('position');
          if (val('basicSalary')) updatedUserData.basicSalary = Number(val('basicSalary')) || 0;
          if (val('bankName')) updatedUserData.bankName = val('bankName');
          if (val('bankAccountNo')) updatedUserData.bankAccountNo = val('bankAccountNo');
          if (val('avatarUrl')) updatedUserData.avatarUrl = val('avatarUrl');
          if (val('userFolderUrl')) updatedUserData.userFolderUrl = val('userFolderUrl');
          if (val('contractDoc')) {
            try {
              updatedUserData.contractDoc = JSON.parse(val('contractDoc'));
            } catch(e) {
              updatedUserData.contractDoc = null;
            }
          }

          currentUsersList[existingUserIndex] = updatedUserData;
          updatedCount++;
        } else {
          // สำหรับการเพิ่มพนักงานใหม่ ต้องมีข้อมูลครบ
          let role = val('role');
          const password = val('password');
          if (!username || !password || !fullname || !role) {
            errorCount++;
            return;
          }

          let standardizedRole = 'Staff';
          const roleLower = role.toLowerCase();
          if (roleLower.includes('admin') || roleLower.includes('ผู้ดูแล')) {
            standardizedRole = 'Admin';
          } else if (roleLower.includes('ot') || roleLower.includes('บำบัด')) {
            standardizedRole = 'OT';
          }

          let status = 'Active';
          const statusLower = val('status').toLowerCase();
          if (statusLower.includes('inactive') || statusLower === 'ระงับ' || statusLower === 'ปิดการใช้งาน') {
            status = 'Inactive';
          }

          let empId = employeeId;
          if (!empId || empId === 'HDH-Auto') {
            empId = getNextEmployeeId(currentUsersList);
          }

          let empType = val('employeeType') || 'พนักงานประจำ';
          const empTypeLower = empType.toLowerCase();
          if (empTypeLower === 'full-time' || empTypeLower === 'fulltime') {
            empType = 'พนักงานประจำ';
          } else if (empTypeLower === 'part-time' || empTypeLower === 'parttime') {
            empType = 'พนักงานชั่วคราว';
          } else if (empTypeLower.includes('freelance') || empTypeLower.includes('อิสระ')) {
            empType = 'นักบำบัดอิสระ (Freelance)';
          }

          const userData = {
            username,
            password,
            fullname,
            role: standardizedRole,
            employeeId: empId,
            employeeType: empType,
            title: val('title') || 'นาย',
            nickname: val('nickname'),
            citizenId: val('citizenId'),
            gender: val('gender') || 'ชาย',
            dob: val('dob'),
            position: val('position') || 'ไม่ระบุ',
            startDate: val('startDate') || new Date().toISOString().split('T')[0],
            phone: val('phone'),
            email: val('email'),
            basicSalary: Number(val('basicSalary')) || 0,
            status,
            bankName: val('bankName') || 'กสิกรไทย',
            bankAccountNo: val('bankAccountNo'),
            avatarUrl: val('avatarUrl') || '',
            userFolderUrl: val('userFolderUrl') || '',
            contractDoc: (() => {
              try {
                return val('contractDoc') ? JSON.parse(val('contractDoc')) : null;
              } catch(e) {
                return null;
              }
            })()
          };

          currentUsersList.push(userData);
          addedCount++;
        }
      });

      if (setUsers) {
        setUsers(currentUsersList);
      }

      Swal.fire({
        icon: 'success',
        title: 'นำเข้าข้อมูลบัญชีผู้ใช้สำเร็จ',
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

  // ค้นหาพนักงาน
  const filteredUsers = useMemo(() => {
    return users
      .filter(u => {
        if (u.username.toLowerCase() === 'admin') return false;
        const query = searchQuery.trim().toLowerCase();
        if (!query) return true;
        return (
          String(u.username || '').toLowerCase().includes(query) ||
          String(u.fullname || '').toLowerCase().includes(query) ||
          (u.nickname && String(u.nickname).toLowerCase().includes(query)) ||
          (u.employeeId && String(u.employeeId).toLowerCase().includes(query)) ||
          (u.position && String(u.position).toLowerCase().includes(query))
        );
      })
      .sort((a, b) => {
        const empIdA = a.employeeId || '';
        const empIdB = b.employeeId || '';
        return empIdB.localeCompare(empIdA);
      });
  }, [users, searchQuery]);

  const paginatedUsers = useMemo(() => {
    const itemsPerPage = 20;
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredUsers, currentPage]);

  const maxPages = Math.ceil(filteredUsers.length / 20) || 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="page-header">
        <h1 className="page-title">
          <Users2 size={28} />
          ระบบจัดการบัญชีผู้ใช้งานระบบ (พนักงาน)
        </h1>
        <div className="page-actions">
          <button 
            className="btn btn-secondary" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            onClick={() => {
              const applyUrl = window.location.origin + window.location.pathname + '#/apply';
              navigator.clipboard.writeText(applyUrl).then(() => {
                Swal.fire({
                  icon: 'success',
                  title: 'สร้างและคัดลอกลิงก์สมัครงานแล้ว!',
                  text: applyUrl,
                  confirmButtonColor: 'var(--secondary)'
                });
              }).catch(() => {
                Swal.fire('คัดลอกไม่สำเร็จ', 'กรุณาคัดลอกลิงก์ด้วยตนเอง: ' + applyUrl, 'warning');
              });
            }}
          >
            สร้างลิ้งค์ฟอร์มสมัคร
          </button>
          <button className="btn btn-primary" onClick={() => { resetUserForm(); setShowUserModal(true); }}>
            <Plus size={16} /> เพิ่มบัญชีผู้ใช้ใหม่
          </button>
          <button className="btn btn-light" onClick={handleExportCSV} title="ส่งออกข้อมูลบัญชีผู้ใช้เป็นไฟล์ CSV">
            <Download size={16} /> Export CSV
          </button>
          <label className="btn btn-light" style={{ cursor: 'pointer', margin: 0 }} title="นำเข้าข้อมูลบัญชีผู้ใช้ผ่านไฟล์ CSV">
            <Upload size={16} /> Import CSV
            <input type="file" accept=".csv" onChange={handleImportCSV} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* ช่องค้นหาด่วน */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ flex: 1, maxWidth: '400px' }}>
            <input 
              type="text" 
              className="form-control" 
              placeholder="ค้นหาพนักงานจาก รหัส, ชื่อ, ชื่อเล่น, ตำแหน่ง..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* ตารางเต็มจอ */}
        <div className="table-container">
          <table className="hdh-table">
            <thead>
              <tr>
                <th>รหัสพนักงาน</th>
                <th>ชื่อบัญชีผู้ใช้ (Username)</th>
                <th>ชื่อ-นามสกุลจริง (ชื่อเล่น)</th>
                <th>ตำแหน่งงาน</th>
                <th>สิทธิ์การใช้งาน</th>
                <th>เงินเดือนพื้นฐาน</th>
                <th>สถานะ</th>
                <th style={{ textAlign: 'center' }}>การดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--dark-light)' }}>
                    ไม่พบข้อมูลผู้ใช้งานพนักงานในระบบ
                  </td>
                </tr>
              ) : (
                paginatedUsers.map(u => (
                  <tr key={u.username}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{u.employeeId || '-'}</td>
                    <td style={{ fontWeight: 700, color: 'var(--secondary)' }}>{u.username}</td>
                    <td>{u.fullname} {u.nickname ? `(${u.nickname})` : ''}</td>
                    <td>{u.position || 'ไม่ระบุ'}</td>
                    <td>
                      <span className={`badge ${
                        u.role === 'Admin' ? 'badge-danger' : 
                        u.role === 'OT' ? 'badge-info' : 'badge-success'
                      }`}>
                        {u.role === 'Admin' ? 'ผู้ดูแล (Admin)' : u.role === 'OT' ? 'นักบำบัด (OT)' : 'พนักงาน (Staff)'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{u.basicSalary ? `฿${u.basicSalary.toLocaleString('th-TH', { minimumFractionDigits: 2 })}` : '฿0.00'}</td>
                    <td>
                      <span className="badge" style={
                        u.status === 'Pending' ? { backgroundColor: '#f59e0b', color: 'white' } : 
                        u.status === 'Active' ? { backgroundColor: '#10b981', color: 'white' } : 
                        { backgroundColor: '#ef4444', color: 'white' }
                      }>
                        {u.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                        <button className="btn btn-light btn-icon-only" onClick={() => handleEditUser(u)} title="แก้ไขข้อมูล" type="button">
                          <Edit3 size={14} color="var(--secondary)" />
                        </button>
                        <button className="btn btn-light btn-icon-only" onClick={() => setPrintView && setPrintView({ show: true, type: 'employee', data: u })} title="พิมพ์ข้อมูลพนักงาน" type="button">
                          <Printer size={14} color="var(--primary)" />
                        </button>
                        <button className="btn btn-light btn-icon-only" onClick={() => handleDeleteUser(u.username)} title="ลบผู้ใช้" type="button">
                          <Trash2 size={14} color="var(--danger)" />
                        </button>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>หน้า</span>
              <select 
                value={currentPage} 
                onChange={(e) => setCurrentPage(Number(e.target.value))}
                style={{
                  padding: '0.2rem 0.5rem',
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
          แสดง {filteredUsers.length === 0 ? 0 : (currentPage - 1) * 20 + 1} - {Math.min(currentPage * 20, filteredUsers.length)} จากทั้งหมด {filteredUsers.length} รายการ (เรียงจากรหัสพนักงานมากไปน้อย)
        </div>
      </div>

      {/* MODAL: เพิ่ม/แก้ไข บัญชีผู้ใช้งานระบบ */}
      {showUserModal && (
        <div className="modal-overlay">
          <div className="modal-content-wrapper" style={{ maxWidth: '750px' }}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 700 }}>{editingUsername ? 'แก้ไขข้อมูลพนักงาน/ผู้ใช้งาน' : 'เพิ่มพนักงาน'}</h3>
              <button className="close-modal-btn" onClick={() => setShowUserModal(false)}>×</button>
            </div>
            <form onSubmit={handleSaveUser}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                
                {/* ข้อมูลการเข้าสู่ระบบบัญชี */}
                <h4 style={{ color: '#b0895a', fontWeight: 700, marginBottom: '0.25rem', fontSize: '0.95rem' }}>ข้อมูลเข้าสู่ระบบ</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">ชื่อบัญชีผู้ใช้งาน (Username) <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="ภาษาอังกฤษไม่มีช่องว่าง" 
                      value={uUsername} 
                      onChange={(e) => setUUsername(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">รหัสผ่าน (Password) <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input type="text" className="form-control" value={uPassword} onChange={(e) => setUPassword(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">สิทธิ์การเข้าใช้งานระบบ</label>
                    <select className="form-control" value={uRole} onChange={(e) => setURole(e.target.value)}>
                      <option value="Staff">Staff (พนักงานทั่วไป)</option>
                      <option value="OT">OT (นักกิจกรรมบำบัด)</option>
                      <option value="Admin">Admin (ผู้ดูแลระบบสูงสุด)</option>
                    </select>
                  </div>
                </div>

                <div style={{ height: '1px', background: 'var(--border-light)', margin: '0.5rem 0' }}></div>

                {/* ข้อมูลโปรไฟล์พนักงาน */}
                <h4 style={{ color: '#b0895a', fontWeight: 700, marginBottom: '0.25rem', fontSize: '0.95rem' }}>ข้อมูลส่วนตัวและตำแหน่งงาน</h4>
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">รหัสพนักงาน</label>
                    <input type="text" className="form-control" value={uEmployeeId} onChange={(e) => setUEmployeeId(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">ประเภทพนักงาน</label>
                    <select className="form-control" value={uEmployeeType} onChange={(e) => setUEmployeeType(e.target.value)}>
                      <option value="พนักงานประจำ">พนักงานประจำ</option>
                      <option value="พนักงานชั่วคราว">พนักงานชั่วคราว</option>
                      <option value="นักบำบัดอิสระ (Freelance)">นักบำบัดอิสระ (Freelance)</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">คำนำหน้า</label>
                    <select className="form-control" value={uTitle} onChange={(e) => setUTitle(e.target.value)}>
                      <option value="นาย">นาย</option>
                      <option value="นาง">นาง</option>
                      <option value="นางสาว">นางสาว</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">ชื่อ-สกุล <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input type="text" className="form-control" value={uFullname} onChange={(e) => setUFullname(e.target.value)} required />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">ชื่อเล่น</label>
                    <input type="text" className="form-control" placeholder="ระบุชื่อเล่น" value={uNickname} onChange={(e) => setUNickname(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">เลขบัตรประชาชน</label>
                    <input type="text" className="form-control" placeholder="เลข 13 หลัก" value={uCitizenId} onChange={(e) => setUCitizenId(e.target.value)} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">เพศ</label>
                    <select className="form-control" value={uGender} onChange={(e) => setUGender(e.target.value)}>
                      <option value="ชาย">ชาย</option>
                      <option value="หญิง">หญิง</option>
                      <option value="อื่นๆ">อื่นๆ</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">วันเกิด</label>
                    <input type="date" className="form-control" value={uDob} onChange={(e) => setUDob(e.target.value)} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">ตำแหน่ง</label>
                    <input type="text" className="form-control" placeholder="เช่น ธุรการ, นักกิจกรรมบำบัด" value={uPosition} onChange={(e) => setUPosition(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">วันที่เริ่มงาน</label>
                    <input type="date" className="form-control" value={uStartDate} onChange={(e) => setUStartDate(e.target.value)} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">เบอร์โทรศัพท์ (0XXXXXXXXX)</label>
                    <input type="tel" className="form-control" placeholder="08xxxxxxxx" value={uPhone} onChange={(e) => setUPhone(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">อีเมล</label>
                    <input type="email" className="form-control" placeholder="name@email.com" value={uEmail} onChange={(e) => setUEmail(e.target.value)} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">เงินเดือนพื้นฐาน</label>
                    <input type="number" className="form-control" placeholder="ระบุจำนวนเงิน" value={uBasicSalary} onChange={(e) => setUBasicSalary(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">สถานะ</label>
                    <select className="form-control" value={uStatus} onChange={(e) => setUStatus(e.target.value)}>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      {uStatus === 'Pending' && <option value="Pending">Pending</option>}
                    </select>
                  </div>
                </div>

                <div className="form-row" style={{ alignItems: 'center' }}>
                  <div className="form-group" style={{ flex: 3 }}>
                    <label className="form-label">รูปถ่ายโปรไฟล์ (Profile Image)</label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => handleFileUpload(e, setUAvatarFile, 'รูปถ่ายโปรไฟล์')} 
                        style={{ fontSize: '0.8rem' }}
                      />
                    </div>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="หรือระบุ URL รูปภาพ (เช่น https://...)" 
                      value={uAvatarUrl} 
                      onChange={(e) => setUAvatarUrl(e.target.value)}
                      style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <label className="form-label" style={{ marginBottom: '0.25rem' }}>ตัวอย่าง</label>
                    <div style={{ width: '45px', height: '45px', borderRadius: '50%', border: '1px solid var(--border-light)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9f9f9' }}>
                      {uAvatarFile?.data ? (
                        <img src={uAvatarFile.data} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : uAvatarUrl ? (
                        <img src={uAvatarUrl} alt="preview" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
                      ) : (
                        <span style={{ fontSize: '0.65rem', color: 'var(--dark-light)' }}>ไม่มีรูป</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* เอกสารแนบพนักงาน */}
                <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem' }}>
                  <h4 style={{ color: '#b0895a', fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.95rem' }}>เอกสารแนบประกอบพนักงาน</h4>
                  
                  {(() => {
                    const clinicDataStr = localStorage.getItem('hdh_clinic_info');
                    const clinicData = clinicDataStr ? JSON.parse(clinicDataStr) : {};
                    
                    let parentId = clinicData.folderId || '';
                    if (!parentId && clinicData.folderUrl) {
                      const match = clinicData.folderUrl.match(/\/folders\/([a-zA-Z0-9-_]+)/);
                      parentId = match ? match[1] : null;
                    }
                    if (!parentId) {
                      parentId = '1A2B3C4D5E6F7G8H9I0J'; // fallback default
                    }
                    
                    const fname = (uFullname || '').trim().split(/\s+/)[0] || 'Unknown';
                    const lname = (uFullname || '').trim().split(/\s+/)[1] || 'Unknown';
                    const folderName = `${uEmployeeId || 'TEMP'}-${fname}-${lname}`;
                    
                    const query = `'${parentId}' in parents and name contains '${folderName}'`;
                    const targetFolderUrl = uUserFolderUrl || `https://drive.google.com/drive/search?q=${encodeURIComponent(query)}`;
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        {/* ช่องกรอกและสร้างโฟลเดอร์พนักงาน */}
                        <div>
                          <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--dark)' }}>
                            ลิงก์โฟลเดอร์ Google Drive พนักงาน (UserFolderURL)
                          </label>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input 
                              type="text" 
                              className="form-control" 
                              placeholder="ระบุลิงก์โฟลเดอร์ หรือกดปุ่มด้านขวาเพื่อสร้างอัตโนมัติ..." 
                              value={uUserFolderUrl} 
                              onChange={(e) => setUUserFolderUrl(e.target.value)} 
                              style={{ fontSize: '0.8rem', padding: '0.3rem 0.5rem' }}
                            />
                            <button 
                              type="button" 
                              className="btn btn-primary" 
                              onClick={handleConnectFolder} 
                              disabled={uIsConnectingFolder}
                              style={{ 
                                padding: '0.3rem 0.75rem', 
                                fontSize: '0.75rem', 
                                whiteSpace: 'nowrap',
                                backgroundColor: '#b0895a',
                                borderColor: '#b0895a',
                                color: '#fff'
                              }}
                            >
                              {uIsConnectingFolder ? 'กำลังเชื่อม...' : 'สร้าง/เชื่อมต่อโฟลเดอร์'}
                            </button>
                          </div>
                        </div>

                        <div style={{ 
                          backgroundColor: '#fbf7f2', 
                          border: '1px solid #f1e4d7', 
                          borderRadius: 'var(--radius-md)', 
                          padding: '0.6rem 0.75rem', 
                          fontSize: '0.8rem', 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div>
                            <span style={{ fontWeight: 600, color: '#8b5a2b' }}>พาธเก็บไฟล์ (Cloud Path): </span>
                            <span style={{ fontFamily: 'monospace', color: 'var(--dark)' }}>{folderName}</span>
                            <div style={{ marginTop: '0.2rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <span style={{ 
                                width: '6px', 
                                height: '6px', 
                                borderRadius: '50%', 
                                backgroundColor: uUserFolderUrl ? '#28a745' : '#ffc107',
                                display: 'inline-block'
                              }} />
                              <span style={{ color: 'var(--dark-light)' }}>
                                {uUserFolderUrl ? 'เชื่อมต่อโฟลเดอร์เฉพาะรายบุคคลแล้ว' : 'ยังไม่ได้เชื่อมโยง (ระบบจะใช้โฟลเดอร์ส่วนกลางในการเก็บ/ค้นหาไฟล์)'}
                              </span>
                            </div>
                          </div>
                          {targetFolderUrl && (
                            <a href={targetFolderUrl} target="_blank" rel="noopener noreferrer" className="btn btn-light" style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', textDecoration: 'none', border: '1px solid var(--border)' }}>
                              เปิดโฟลเดอร์เก็บไฟล์
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem' }}>
                    
                    {/* บัตรประชาชน */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0f0f0', paddingBottom: '0.4rem' }}>
                      <span style={{ fontWeight: 600, width: '180px' }}>บัตรประจำตัวประชาชน:</span>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flex: 1 }}>
                        <input type="file" onChange={(e) => handleFileUpload(e, setUCitizenIdDoc, 'บัตรประจำตัวประชาชน')} style={{ fontSize: '0.75rem', width: '150px' }} />
                        {uCitizenIdDoc ? (
                          <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                            <span style={{ color: 'green', fontSize: '0.75rem', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '200px' }} title={uCitizenIdDoc.name}>{uCitizenIdDoc.name} ({uCitizenIdDoc.size})</span>
                            <button type="button" className="btn btn-light" style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem' }} onClick={() => handleViewDoc(uCitizenIdDoc)}>ดูเอกสาร</button>
                            <button type="button" className="btn btn-light" style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem' }} onClick={() => handleDownloadFile(uCitizenIdDoc)}>ดาวน์โหลด</button>
                            <button type="button" className="btn btn-light" style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem', color: 'red' }} onClick={() => setUCitizenIdDoc(null)}>ลบ</button>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--dark-light)', fontSize: '0.75rem' }}>ยังไม่ได้แนบเอกสาร</span>
                        )}
                      </div>
                    </div>

                    {/* ทะเบียนบ้าน */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0f0f0', paddingBottom: '0.4rem' }}>
                      <span style={{ fontWeight: 600, width: '180px' }}>ทะเบียนบ้าน:</span>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flex: 1 }}>
                        <input type="file" onChange={(e) => handleFileUpload(e, setUHouseRegDoc, 'ทะเบียนบ้าน')} style={{ fontSize: '0.75rem', width: '150px' }} />
                        {uHouseRegDoc ? (
                          <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                            <span style={{ color: 'green', fontSize: '0.75rem', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '200px' }} title={uHouseRegDoc.name}>{uHouseRegDoc.name} ({uHouseRegDoc.size})</span>
                            <button type="button" className="btn btn-light" style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem' }} onClick={() => handleViewDoc(uHouseRegDoc)}>ดูเอกสาร</button>
                            <button type="button" className="btn btn-light" style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem' }} onClick={() => handleDownloadFile(uHouseRegDoc)}>ดาวน์โหลด</button>
                            <button type="button" className="btn btn-light" style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem', color: 'red' }} onClick={() => setUHouseRegDoc(null)}>ลบ</button>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--dark-light)', fontSize: '0.75rem' }}>ยังไม่ได้แนบเอกสาร</span>
                        )}
                      </div>
                    </div>

                    {/* สมุดบัญชีธนาคาร */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0f0f0', paddingBottom: '0.4rem' }}>
                      <span style={{ fontWeight: 600, width: '180px' }}>สมุดบัญชีธนาคาร:</span>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flex: 1 }}>
                        <input type="file" onChange={(e) => handleFileUpload(e, setUBankBookDoc, 'สมุดบัญชีธนาคาร')} style={{ fontSize: '0.75rem', width: '150px' }} />
                        {uBankBookDoc ? (
                          <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                            <span style={{ color: 'green', fontSize: '0.75rem', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '200px' }} title={uBankBookDoc.name}>{uBankBookDoc.name} ({uBankBookDoc.size})</span>
                            <button type="button" className="btn btn-light" style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem' }} onClick={() => handleViewDoc(uBankBookDoc)}>ดูเอกสาร</button>
                            <button type="button" className="btn btn-light" style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem' }} onClick={() => handleDownloadFile(uBankBookDoc)}>ดาวน์โหลด</button>
                            <button type="button" className="btn btn-light" style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem', color: 'red' }} onClick={() => setUBankBookDoc(null)}>ลบ</button>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--dark-light)', fontSize: '0.75rem' }}>ยังไม่ได้แนบเอกสาร</span>
                        )}
                      </div>
                    </div>

                    {/* ใบประกอบวิชาชีพ */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0f0f0', paddingBottom: '0.4rem' }}>
                      <span style={{ fontWeight: 600, width: '180px' }}>เอกสารใบประกอบวิชาชีพ:</span>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flex: 1 }}>
                        <input type="file" onChange={(e) => handleFileUpload(e, setULicenseDoc, 'เอกสารใบประกอบวิชาชีพ')} style={{ fontSize: '0.75rem', width: '150px' }} />
                        {uLicenseDoc ? (
                          <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                            <span style={{ color: 'green', fontSize: '0.75rem', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '200px' }} title={uLicenseDoc.name}>{uLicenseDoc.name} ({uLicenseDoc.size})</span>
                            <button type="button" className="btn btn-light" style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem' }} onClick={() => handleViewDoc(uLicenseDoc)}>ดูเอกสาร</button>
                            <button type="button" className="btn btn-light" style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem' }} onClick={() => handleDownloadFile(uLicenseDoc)}>ดาวน์โหลด</button>
                            <button type="button" className="btn btn-light" style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem', color: 'red' }} onClick={() => setULicenseDoc(null)}>ลบ</button>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--dark-light)', fontSize: '0.75rem' }}>ยังไม่ได้แนบเอกสาร</span>
                        )}
                      </div>
                    </div>

                    {/* เอกสารสัญญาจ้าง */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0f0f0', paddingBottom: '0.4rem' }}>
                      <span style={{ fontWeight: 600, width: '180px' }}>เอกสารสัญญาจ้าง:</span>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flex: 1 }}>
                        <input type="file" onChange={(e) => handleFileUpload(e, setUContractDoc, 'เอกสารสัญญาจ้าง')} style={{ fontSize: '0.75rem', width: '150px' }} />
                        {uContractDoc ? (
                          <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                            <span style={{ color: 'green', fontSize: '0.75rem', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '200px' }} title={uContractDoc.name}>{uContractDoc.name} ({uContractDoc.size})</span>
                            <button type="button" className="btn btn-light" style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem' }} onClick={() => handleViewDoc(uContractDoc)}>ดูเอกสาร</button>
                            <button type="button" className="btn btn-light" style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem' }} onClick={() => handleDownloadFile(uContractDoc)}>ดาวน์โหลด</button>
                            <button type="button" className="btn btn-light" style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem', color: 'red' }} onClick={() => setUContractDoc(null)}>ลบ</button>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--dark-light)', fontSize: '0.75rem' }}>ยังไม่ได้แนบเอกสาร</span>
                        )}
                      </div>
                    </div>

                    {/* เอกสารอื่นๆ */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.4rem' }}>
                      <span style={{ fontWeight: 600, width: '180px' }}>เอกสารอื่นๆ (ถ้ามี):</span>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flex: 1 }}>
                        <input type="file" onChange={(e) => handleFileUpload(e, setUOtherDoc, 'เอกสารอื่นๆ')} style={{ fontSize: '0.75rem', width: '150px' }} />
                        {uOtherDoc ? (
                          <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                            <span style={{ color: 'green', fontSize: '0.75rem', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '200px' }} title={uOtherDoc.name}>{uOtherDoc.name} ({uOtherDoc.size})</span>
                            <button type="button" className="btn btn-light" style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem' }} onClick={() => handleViewDoc(uOtherDoc)}>ดูเอกสาร</button>
                            <button type="button" className="btn btn-light" style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem' }} onClick={() => handleDownloadFile(uOtherDoc)}>ดาวน์โหลด</button>
                            <button type="button" className="btn btn-light" style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem', color: 'red' }} onClick={() => setUOtherDoc(null)}>ลบ</button>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--dark-light)', fontSize: '0.75rem' }}>ยังไม่ได้แนบเอกสาร</span>
                        )}
                      </div>
                    </div>

                  </div>
                </div>

                {/* ข้อมูลธนาคาร */}
                <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem' }}>
                  <h4 style={{ color: '#b0895a', fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.95rem' }}>Banking Info</h4>
                  <div className="form-row">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">ชื่อธนาคาร</label>
                      <select className="form-control" value={uBankName} onChange={(e) => setUBankName(e.target.value)}>
                        <option value="กสิกรไทย">กสิกรไทย (KBANK)</option>
                        <option value="ไทยพาณิชย์">ไทยพาณิชย์ (SCB)</option>
                        <option value="กรุงไทย">กรุงไทย (KTB)</option>
                        <option value="กรุงเทพ">กรุงเทพ (BBL)</option>
                        <option value="ทหารไทยธนชาต">ทหารไทยธนชาต (TTB)</option>
                        <option value="ออมสิน">ออมสิน (GSB)</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">เลขบัญชี</label>
                      <input type="text" className="form-control" placeholder="ระบุเลขบัญชีธนาคาร" value={uBankAccountNo} onChange={(e) => setUBankAccountNo(e.target.value)} />
                    </div>
                  </div>
                </div>

              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-light" onClick={() => { resetUserForm(); setShowUserModal(false); }}>ยกเลิก</button>
                <button type="submit" className="btn btn-secondary">บันทึก</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
