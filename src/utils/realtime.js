import { supabase } from './supabaseClient';

export const REALTIME_CHANNEL_NAME = 'hdh-realtime-sync';
let sharedChannel = null;

/**
 * ดึงหรือสร้าง Supabase Realtime Channel กลางสำหรับการซิงค์ข้อมูลเรียลไทม์ข้ามทุกอุปกรณ์
 */
export const getRealtimeChannel = () => {
  if (!sharedChannel || sharedChannel.state === 'closed' || sharedChannel.state === 'errored') {
    if (sharedChannel) {
      try {
        supabase.removeChannel(sharedChannel);
      } catch {
        // ignore
      }
    }
    sharedChannel = supabase.channel(REALTIME_CHANNEL_NAME, {
      config: {
        broadcast: {
          self: false // ไม่รับข้อความ Broadcast ที่ตัวเองเป็นคนส่ง เพื่อป้องกันการวนลูป
        }
      }
    });
  }
  return sharedChannel;
};

/**
 * ส่งสัญญาณ Broadcast แจ้งการเปลี่ยนแปลงข้อมูล (INSERT / UPDATE / DELETE / SYNC_DELTA)
 * ไปยังทุกเบราว์เซอร์และทุกอุปกรณ์ที่กำลังเปิดใช้งานอยู่ทันทีภายในเสี้ยววินาที (<100ms)
 * @param {Object} payload ข้อมูลตาราง, การกระทำ, และเรคคอร์ดที่เปลี่ยนแปลง
 */
export const broadcastChange = async (payload) => {
  try {
    const channel = getRealtimeChannel();
    // หากช่องยังไม่ได้เชื่อมต่อ ให้ทำการ subscribe ก่อน
    if (channel.state !== 'joined' && channel.state !== 'joining') {
      channel.subscribe();
    }
    await channel.send({
      type: 'broadcast',
      event: 'data_changed',
      payload: {
        ...payload,
        timestamp: Date.now()
      }
    });
  } catch (err) {
    console.warn('[Realtime Broadcast Warning]:', err);
  }
};

/**
 * ปิดการเชื่อมต่อ Channel เมื่อออกจากหน้าหรือปิดแอปพลิเคชัน
 */
export const removeRealtimeChannel = () => {
  if (sharedChannel) {
    try {
      supabase.removeChannel(sharedChannel);
    } catch {
      // ignore
    }
    sharedChannel = null;
  }
};
