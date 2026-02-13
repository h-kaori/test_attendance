
import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  LogIn, LogOut, Scan, CheckCircle, XCircle, 
  RotateCcw, Download, Settings, User, ShieldCheck, ChevronLeft,
  Lock, Unlock
} from 'lucide-react';

// --- Types ---
type Status = 'pending' | 'approved' | 'rejected';
interface AttendanceRecord {
  id: number;
  date: string;
  name: string;
  clockIn: string;
  clockOut: string | null;
  status: Status;
}
type Language = 'ja' | 'en' | 'zh';
type Screen = 'punch' | 'login' | 'admin';

// --- Constants ---
const VALID_QR_CODE = "KUMAMOTO_HIGO";

// --- Translations ---
const translations = {
  ja: {
    title: '勤怠管理システム', employeeName: '社員名', namePlaceholder: 'お名前を入力してください',
    scanQr: 'QRコードをスキャン', scanInstructions: '「KUMAMOTO_HIGO」のQRコードをスキャンしてください。',
    clockIn: '出勤', clockOut: '退勤', adminLogin: '管理者ログイン', password: 'パスワード',
    login: 'ログイン', back: '戻る', logout: 'ログアウト', adminPanel: '管理者用パネル',
    exportCsv: 'CSV出力', tableDate: '日付', tableName: '社員名', tableIn: '出勤',
    tableOut: '退勤', tableStatus: '状態', tableActions: '操作', approve: '承認',
    reject: '却下', cancel: '取り消し', statusPending: '待機中', statusApproved: '承認済み',
    statusRejected: '却下済み', errNameEmpty: '名前を入力してください。',
    errQrInvalid: '無効なQRコードです。', errQrFailed: 'スキャンに失敗しました。',
    errCameraDenied: 'カメラへのアクセスを許可してください。', errAlreadyIn: '既に出勤済みです。',
    errNotIn: '先に出勤をしてください。', errAlreadyOut: '既に退勤済みです。',
    successIn: '出勤を記録しました！', successOut: '退勤を記録しました！', successAction: '更新しました。',
    qrRequired: '打刻にはQRスキャンが必要です', qrVerified: '認証完了'
  },
  en: {
    title: 'Attendance System', employeeName: 'Name', namePlaceholder: 'Enter your name',
    scanQr: 'Scan QR Code', scanInstructions: 'Scan "KUMAMOTO_HIGO" QR code.',
    clockIn: 'Clock In', clockOut: 'Clock Out', adminLogin: 'Admin Login', password: 'Password',
    login: 'Login', back: 'Back', logout: 'Logout', adminPanel: 'Admin Dashboard',
    exportCsv: 'Export CSV', tableDate: 'Date', tableName: 'Name', tableIn: 'In',
    tableOut: 'Out', tableStatus: 'Status', tableActions: 'Actions', approve: 'Approve',
    reject: 'Reject', cancel: 'Reset', statusPending: 'Pending', statusApproved: 'Approved',
    statusRejected: 'Rejected', errNameEmpty: 'Please enter name.',
    errQrInvalid: 'Invalid QR Code.', errQrFailed: 'Scan failed.',
    errCameraDenied: 'Camera access denied.', errAlreadyIn: 'Already clocked in.',
    errNotIn: 'Clock in first.', errAlreadyOut: 'Already clocked out.',
    successIn: 'Clock-in recorded!', successOut: 'Clock-out recorded!', successAction: 'Updated.',
    qrRequired: 'Scan QR to unlock buttons', qrVerified: 'Verified'
  },
  zh: {
    title: '出勤管理系统', employeeName: '姓名', namePlaceholder: '请输入姓名',
    scanQr: '扫描二维码', scanInstructions: '请扫描 "KUMAMOTO_HIGO" 二维码。',
    clockIn: '上班', clockOut: '下班', adminLogin: '管理员登录', password: '密码',
    login: '登录', back: '返回', logout: '退出', adminPanel: '管理面板',
    exportCsv: '导出 CSV', tableDate: '日期', tableName: '姓名', tableIn: '上班',
    tableOut: '下班', tableStatus: '状态', tableActions: '操作', approve: '批准',
    reject: '拒绝', cancel: '重置', statusPending: '待处理', statusApproved: '已批准',
    statusRejected: '已拒绝', errNameEmpty: '请输入姓名。',
    errQrInvalid: '无效二维码。', errQrFailed: '扫描失败。',
    errCameraDenied: '请允许摄像头权限。', errAlreadyIn: '已完成上班打卡。',
    errNotIn: '请先打上班卡。', errAlreadyOut: '已完成下班打卡。',
    successIn: '上班打卡成功！', successOut: '下班打卡成功！', successAction: '状态已更新。',
    qrRequired: '打卡前请先扫描二维码', qrVerified: '已认证'
  }
};

// --- Components ---
const QrScanner = ({ onSuccess, onCancel, t }: { onSuccess: (s: string) => void, onCancel: () => void, t: any }) => {
  useEffect(() => {
    // @ts-ignore
    const scanner = new window.Html5QrcodeScanner("reader", { 
      fps: 10, 
      qrbox: 250,
      aspectRatio: 1.0
    });
    scanner.render((text: string) => {
      scanner.clear();
      onSuccess(text);
    }, () => {});
    return () => {
      scanner.clear().catch(() => {});
    };
  }, [onSuccess]);

  return (
    <div className="w-full">
      <div id="reader" className="rounded-xl border-2 border-blue-200 overflow-hidden shadow-inner"></div>
      <button onClick={onCancel} className="w-full mt-4 py-2 text-gray-500 font-medium hover:text-gray-700 underline transition-colors">
        {t.back}
      </button>
    </div>
  );
};

const App = () => {
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('lang') as Language) || 'ja');
  const [screen, setScreen] = useState<Screen>('punch');
  const [employeeName, setEmployeeName] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [records, setRecords] = useState<AttendanceRecord[]>(() => JSON.parse(localStorage.getItem('attendance_records') || '[]'));
  const [message, setMessage] = useState<{ text: string, type: string } | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [sortKey, setSortKey] = useState<keyof AttendanceRecord>('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const t = translations[language];

  useEffect(() => { localStorage.setItem('lang', language); }, [language]);
  useEffect(() => { localStorage.setItem('attendance_records', JSON.stringify(records)); }, [records]);

  const showMsg = (text: string, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmployeeName(e.target.value);
    setIsVerified(false); // 名前が変わったら再認証を求める
  };

  const handlePunch = (type: 'in' | 'out') => {
    if (!employeeName.trim()) return showMsg(t.errNameEmpty, 'error');
    if (!isVerified) return showMsg(t.qrRequired, 'error');

    const today = new Date().toISOString().split('T')[0];
    const idx = records.findIndex(r => r.name === employeeName && r.date === today);

    if (type === 'in') {
      if (idx !== -1) return showMsg(t.errAlreadyIn, 'error');
      setRecords([{ 
        id: Date.now(), 
        date: today, 
        name: employeeName, 
        clockIn: new Date().toLocaleTimeString('ja-JP'), 
        clockOut: null, 
        status: 'pending' 
      }, ...records]);
      showMsg(t.successIn);
    } else {
      if (idx === -1) return showMsg(t.errNotIn, 'error');
      if (records[idx].clockOut) return showMsg(t.errAlreadyOut, 'error');
      const newRecs = [...records];
      newRecs[idx].clockOut = new Date().toLocaleTimeString('ja-JP');
      setRecords(newRecs);
      showMsg(t.successOut);
    }
    
    setIsVerified(false); // 打刻後は認証状態をリセット
  };

  const updateStatus = (id: number, newStatus: Status) => {
    setRecords(records.map(r => r.id === id ? { ...r, status: newStatus } : r));
    showMsg(t.successAction);
  };

  const sortedRecords = [...records].sort((a, b) => {
    const valA = a[sortKey] ?? '';
    const valB = b[sortKey] ?? '';
    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const exportCSV = () => {
    const header = `${t.tableDate},${t.tableName},${t.tableIn},${t.tableOut},${t.tableStatus}\n`;
    const rows = records.map(r => `${r.date},${r.name},${r.clockIn},${r.clockOut || '-'},${r.status}`).join('\n');
    const blob = new Blob(["\uFEFF" + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-2xl font-black text-blue-800 flex items-center gap-2">
          <ShieldCheck size={32} /> {t.title}
        </h1>
        <div className="flex gap-2">
          {(['ja', 'en', 'zh'] as Language[]).map(l => (
            <button key={l} onClick={() => setLanguage(l)} 
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${language === l ? 'bg-blue-600 text-white' : 'bg-white border text-blue-600 hover:bg-blue-50'}`}>
              {l === 'ja' ? '日本語' : l === 'en' ? 'EN' : '中文'}
            </button>
          ))}
          <button onClick={() => setScreen(screen === 'admin' ? 'punch' : 'login')} className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
            <Settings size={24} />
          </button>
        </div>
      </header>

      {message && (
        <div className={`mb-6 p-4 rounded-xl shadow-lg border-l-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${
          message.type === 'success' ? 'bg-green-50 border-green-500 text-green-800' : 'bg-red-50 border-red-500 text-red-800'
        }`}>
          {message.type === 'success' ? <CheckCircle className="flex-shrink-0" /> : <XCircle className="flex-shrink-0" />}
          <span className="font-bold">{message.text}</span>
        </div>
      )}

      {screen === 'punch' && (
        <div className="bg-white p-6 md:p-10 rounded-3xl shadow-2xl border border-gray-100">
          <div className="space-y-8">
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="text-lg font-bold text-gray-700 flex items-center gap-2">
                  <User size={20} /> {t.employeeName}
                </label>
                {isVerified && (
                  <span className="bg-green-100 text-green-700 text-xs font-black px-2 py-1 rounded-full flex items-center gap-1 animate-pulse">
                    <CheckCircle size={12} /> {t.qrVerified}
                  </span>
                )}
              </div>
              <input 
                type="text" 
                value={employeeName} 
                onChange={handleNameChange} 
                placeholder={t.namePlaceholder} 
                className="w-full px-6 py-4 text-xl border-2 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all" 
              />
            </div>

            {isScanning ? (
              <QrScanner t={t} onCancel={() => setIsScanning(false)} onSuccess={text => { 
                if(text === VALID_QR_CODE) { 
                  setIsScanning(false); 
                  setIsVerified(true);
                  showMsg(t.qrVerified); 
                } 
                else showMsg(t.errQrInvalid, 'error'); 
              }} />
            ) : (
              <button 
                onClick={() => setIsScanning(true)} 
                className={`w-full py-8 border-2 border-dashed rounded-2xl flex flex-col items-center transition-all ${
                  isVerified 
                  ? 'bg-green-50 border-green-200 text-green-600' 
                  : 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100'
                }`}
              >
                {isVerified ? <Unlock size={48} /> : <Scan size={48} />}
                <span className="font-bold mt-2">{isVerified ? t.qrVerified : t.scanQr}</span>
              </button>
            )}

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => handlePunch('in')} 
                disabled={!isVerified || isScanning}
                className={`py-10 rounded-3xl flex flex-col items-center gap-2 shadow-lg transition-all transform active:scale-95 ${
                  isVerified 
                  ? 'bg-green-500 hover:bg-green-600 text-white cursor-pointer' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed grayscale'
                }`}
              >
                <LogIn size={40} />
                <span className="text-2xl font-black">{t.clockIn}</span>
                {!isVerified && <Lock size={16} className="mt-1 opacity-50" />}
              </button>
              <button 
                onClick={() => handlePunch('out')} 
                disabled={!isVerified || isScanning}
                className={`py-10 rounded-3xl flex flex-col items-center gap-2 shadow-lg transition-all transform active:scale-95 ${
                  isVerified 
                  ? 'bg-orange-500 hover:bg-orange-600 text-white cursor-pointer' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed grayscale'
                }`}
              >
                <LogOut size={40} />
                <span className="text-2xl font-black">{t.clockOut}</span>
                {!isVerified && <Lock size={16} className="mt-1 opacity-50" />}
              </button>
            </div>
            
            {!isVerified && !isScanning && (
              <p className="text-center text-sm font-bold text-orange-400 animate-pulse">
                ⚠️ {t.qrRequired}
              </p>
            )}
          </div>
        </div>
      )}

      {screen === 'login' && (
        <div className="max-w-md mx-auto bg-white p-8 rounded-3xl shadow-xl border">
          <h2 className="text-xl font-bold mb-6 text-center">{t.adminLogin}</h2>
          <input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} 
            className="w-full p-4 border rounded-xl mb-4 focus:ring-2 focus:ring-blue-500 outline-none" placeholder={t.password} />
          <button onClick={() => { if(adminPassword === 'admin') setScreen('admin'); else showMsg('Invalid Password', 'error'); }} 
            className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors">
            {t.login}
          </button>
        </div>
      )}

      {screen === 'admin' && (
        <div className="bg-white p-6 rounded-3xl shadow-xl border overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <h2 className="text-2xl font-black text-gray-800">{t.adminPanel}</h2>
            <div className="flex gap-2">
              <button onClick={exportCSV} className="flex items-center gap-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-bold text-gray-700">
                <Download size={18} /> {t.exportCsv}
              </button>
              <button onClick={() => setScreen('punch')} className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-bold">
                {t.logout}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="bg-gray-50 text-gray-400 text-xs uppercase font-bold border-b">
                  <th className="p-4 cursor-pointer" onClick={() => { setSortKey('date'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>{t.tableDate}</th>
                  <th className="p-4 cursor-pointer" onClick={() => { setSortKey('name'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>{t.tableName}</th>
                  <th className="p-4">{t.tableIn}</th>
                  <th className="p-4">{t.tableOut}</th>
                  <th className="p-4">{t.tableStatus}</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedRecords.map(r => (
                  <tr key={r.id} className={`transition-colors ${r.status === 'approved' ? 'bg-green-50' : r.status === 'rejected' ? 'bg-red-50' : ''}`}>
                    <td className="p-4 font-mono text-sm">{r.date}</td>
                    <td className="p-4 font-bold">{r.name}</td>
                    <td className="p-4 text-green-700 font-bold">{r.clockIn}</td>
                    <td className="p-4 text-orange-700 font-bold">{r.clockOut || '-'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
                        r.status === 'approved' ? 'bg-green-200 text-green-800' :
                        r.status === 'rejected' ? 'bg-red-200 text-red-800' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {r.status === 'approved' ? t.statusApproved : r.status === 'rejected' ? t.statusRejected : t.statusPending}
                      </span>
                    </td>
                    <td className="p-4 text-right flex justify-end gap-1">
                      <button onClick={() => updateStatus(r.id, 'approved')} className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"><CheckCircle size={20}/></button>
                      <button onClick={() => updateStatus(r.id, 'rejected')} className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"><XCircle size={20}/></button>
                      <button onClick={() => updateStatus(r.id, 'pending')} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"><RotateCcw size={20}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      <footer className="mt-12 text-center text-gray-300 text-xs">
        <p>© 2024 Attendance Manager - Security Enhanced Ver.</p>
      </footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
