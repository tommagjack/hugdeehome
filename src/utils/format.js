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
