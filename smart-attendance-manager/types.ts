
export type Status = 'pending' | 'approved' | 'rejected';

export interface AttendanceRecord {
  id: number;
  date: string; // YYYY-MM-DD
  name: string;
  clockIn: string; // HH:MM:SS
  clockOut: string | null; // HH:MM:SS
  status: Status;
}

export type Language = 'ja' | 'en' | 'zh';

export type Screen = 'punch' | 'login' | 'admin';
