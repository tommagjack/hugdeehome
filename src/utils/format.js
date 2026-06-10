/**
 * ฟังก์ชันช่วยจัดรูปแบบข้อมูลพรีฟิกซ์ชื่อในระบบ
 */

/**
 * เติมคำว่า "น้อง" นำหน้าชื่อเล่นคนไข้เสมอ (ป้องกันคำซ้ำซ้อน)
 * @param {string} nickname ชื่อเล่นคนไข้
 * @returns {string} ชื่อเล่นคนไข้ที่จัดรูปแบบแล้ว
 */
export const formatPatientNickname = (nickname) => {
  if (!nickname) return '';
  const val = String(nickname).trim();
  if (val.startsWith('น้อง')) return val;
  return `น้อง${val}`;
};

/**
 * เติมคำว่า "ครู" นำหน้าชื่อคุณครู/นักกิจกรรมบำบัดเสมอ (ป้องกันคำซ้ำซ้อน)
 * @param {string} name ชื่อเล่นหรือชื่อจริงของคุณครู
 * @returns {string} ชื่อที่จัดรูปแบบแล้ว
 */
export const formatTherapistName = (name) => {
  if (!name) return '';
  const val = String(name).trim();
  if (val.startsWith('ครู')) return val;
  return `ครู${val}`;
};

/**
 * แปลง string วันเกิดหลากหลายรูปแบบ (YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY) เป็น Date วัตถุของ JS ใน ค.ศ. (A.D.)
 * รองรับปีที่เป็น พ.ศ. (B.E. > 2400) โดยจะหักออก 543 อัตโนมัติ
 * @param {string} dateStr วันเกิดที่ต้องการแปลง
 * @returns {Date|null} วัตถุ Date ที่ถูกต้อง หรือ null หากไม่สามารถแปลงได้
 */
export const parseDateToAD = (dateStr) => {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  
  // 1. ลองใช้ standard parse ดูก่อน (เช่น YYYY-MM-DD)
  let d = new Date(str);
  if (!isNaN(d.getTime())) {
    let year = d.getFullYear();
    if (year > 2400) {
      d.setFullYear(year - 543);
    }
    return d;
  }
  
  // 2. ลองตรวจหาแยกส่วนตามสัญลักษณ์ขีดคั่น / หรือ - หรือ .
  const parts = str.split(/[\/\-\.]/);
  if (parts.length === 3) {
    let day, month, year;
    
    if (parts[0].length === 4) {
      // รูปแบบ YYYY-MM-DD หรือ YYYY/MM/DD
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[2], 10);
    } else {
      // รูปแบบ DD/MM/YYYY หรือ DD-MM-YYYY
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      year = parseInt(parts[2], 10);
    }
    
    if (year > 2400) {
      year = year - 543;
    }
    
    const parsedDate = new Date(year, month, day);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  }
  
  return null;
};

