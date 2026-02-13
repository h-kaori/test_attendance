
import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  LogIn, LogOut, Scan, CheckCircle, XCircle, 
  RotateCcw, Download, Settings, User, ShieldCheck,
  Lock, Unlock, Loader2, RefreshCw
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
const translations: Record<Language, any> = {
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
    errCameraDenied: 'カメラへのアクセスを許可してください。ブラウザの設定を確認してください。', 
    errAlreadyIn: '既に出勤済みです。',
    errNotIn: '先に出勤をしてください。', errAlreadyOut: '既に退勤済みです。',
    successIn: '出勤を記録しました！', successOut: '退勤を記録しました！', successAction: '更新しました。',
    qrRequired: '打刻にはQRスキャンが必要です', qrVerified: '認証完了',
    startingCamera: 'カメラを起動中...'
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
    errCameraDenied: 'Camera access denied. Please check browser settings.', 
    errAlreadyIn: 'Already clocked in.',
    errNotIn: 'Clock in first.', errAlreadyOut: 'Already clocked out.',
    successIn: 'Clock-in recorded!', successOut: 'Clock-out recorded!', successAction: 'Updated.',
    qrRequired: 'Scan QR to unlock buttons', qrVerified: 'Verified',
    startingCamera: 'Starting camera...'
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
    errCameraDenied: '请允许摄像头权限。请检查浏览器设置。', 
    errAlreadyIn: '已完成上班打卡。',
    errNotIn: '请先打上班卡。', errAlreadyOut: '已完成下班打卡。',
    successIn: '上班打卡成功！', successOut: '下班打卡成功！', successAction: '状态已更新。',
    qrRequired: '打卡前请先扫描二维码', qrVerified: '已认证',
    startingCamera: '正在启动摄像头...'
  }
};

// --- Components ---
const QrScanner = ({ onSuccess, onCancel, t }: { onSuccess: (s: string) => void, onCancel: () => void, t: any }) => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    // @ts-ignore
    const Html5Qrcode = window.Html5Qrcode;
    if (!Html5Qrcode) {
        setError("QR Library not loaded.");
        return;
    }

    const html5QrCode = new Html5Qrcode("reader");
    scannerRef.current = html5QrCode;

    const config = { 
      fps: 15, 
      qrbox: (viewWidth: number, viewHeight: number) => {
        const size = Math.min(viewWidth, viewHeight) * 0.7;
        return { width: size, height: size };
      },
      aspectRatio: 1.0,
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true 
      }
    };

    html5QrCode.start(
      { facingMode: "environment" }, 
      config,
      (decodedText: string) => {
        if (navigator.vibrate) navigator.vibrate(50); 
        // 成功時、確実に停止してからコールバックを実行
        if (html5QrCode.isScanning) {
          html5QrCode.stop().then(() => {
            onSuccess(decodedText);
          }).catch(() => {
            onSuccess(decodedText);
          });
        } else {
          onSuccess(decodedText);
        }
      },
      () => { /* スキャン失敗（読み取り中）は無視 */ }
    ).then(() => {
      setIsLoading(false);
    }).catch((err: any) => {
      console.error("Camera error:", err);
      setIsLoading(false);
      setError(t.errCameraDenied);
    });

    return () => {
      // クリーンアップ時の安全な停止
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [onSuccess, t]);

  return (
    <div className="w-full">
      <div className="relative rounded-3xl border-4 border-blue-100 overflow-hidden shadow-2xl bg-gray-900 aspect-square">
        <div id="reader" className="w-full h-full object-cover"></div>
        
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800 text-white">
            <RefreshCw className="animate-spin mb-3 text-blue-400" size={48} />
            <p className="font-bold text-lg">{t.startingCamera}</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-gray-900/95">
            <XCircle className="text-red-500 mb-4" size={64} />
            <p className="text-white font-bold text-sm leading-relaxed">{error}</p>
          </div>
        )}

        {!error && !isLoading && (
          <>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[70%] h-[70%] border-4 border-blue-500 rounded-3xl animate-pulse shadow-[0_0_0_1000px_rgba(0,0,0,0.5)]"></div>
            </div>
            <div className="absolute top-4 left-0 right-0 text-center pointer-events-none">
               <span className="bg-black/60 text-white px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase">Scanning...</span>
            </div>
          </>
        )}
      </div>
      <button onClick={onCancel} className="w-full mt-6 py-4 bg-gray-100 text-gray-600 font-black rounded-2xl hover:bg-gray-200 transition-all active:scale-95">
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
    setIsVerified(false); 
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
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    
    // 安全に削除するためのバッファ
    setTimeout(() => {
      if (link.parentNode === document.body) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(url);
    }, 100);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 animate-in">
      <header className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
        <h1 className="text-3xl font-black text-blue-900 flex items-center gap-3">
          <ShieldCheck size={40} className="text-blue-600" /> {t.title}
        </h1>
        <div className="flex items-center gap-4">
          <div className="flex bg-white p-1 rounded-full shadow-inner border">
            {(['ja', 'en', 'zh'] as Language[]).map(l => (
              <button key={l} onClick={() => setLanguage(l)} 
                className={`px-4 py-2 rounded-full text-xs font-black transition-all ${language === l ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-blue-600'}`}>
                {l === 'ja' ? '日本語' : l === 'en' ? 'EN' : '中文'}
              </button>
            ))}
          </div>
          <button onClick={() => setScreen(screen === 'admin' ? 'punch' : 'login')} className="p-3 bg-white rounded-full border shadow-sm text-gray-400 hover:text-blue-600 transition-all hover:rotate-90">
            <Settings size={24} />
          </button>
        </div>
      </header>

      {message && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md p-5 rounded-3xl shadow-2xl border-2 flex items-center gap-4 animate-in ${
          message.type === 'success' ? 'bg-green-50 border-green-500 text-green-800' : 'bg-red-50 border-red-500 text-red-800'
        }`}>
          {message.type === 'success' ? <CheckCircle className="text-green-500" size={28}/> : <XCircle className="text-red-500" size={28}/>}
          <span className="font-black text-lg">{message.text}</span>
        </div>
      )}

      {screen === 'punch' && (
        <main className="bg-white p-6 md:p-12 rounded-[2.5rem] shadow-2xl border border-blue-50">
          <div className="space-y-10">
            <div>
              <div className="flex justify-between items-end mb-3">
                <label className="text-xl font-black text-gray-800 flex items-center gap-2 uppercase tracking-widest">
                  <User size={24} className="text-blue-600" /> {t.employeeName}
                </label>
                {isVerified && (
                  <span className="bg-green-100 text-green-700 text-xs font-black px-4 py-1.5 rounded-full flex items-center gap-2 animate-pulse border-2 border-green-200">
                    <CheckCircle size={14} /> {t.qrVerified}
                  </span>
                )}
              </div>
              <input type="text" value={employeeName} onChange={e => {setEmployeeName(e.target.value); setIsVerified(false);}} placeholder={t.namePlaceholder} 
                className="w-full px-8 py-5 text-2xl font-bold border-4 border-gray-100 rounded-3xl focus:border-blue-500 focus:ring-8 focus:ring-blue-50 outline-none transition-all placeholder:text-gray-300" />
            </div>

            {isScanning ? (
              <QrScanner t={t} onCancel={() => setIsScanning(false)} onSuccess={text => { 
                if(text === VALID_QR_CODE) { setIsScanning(false); setIsVerified(true); showMsg(t.qrVerified); } 
                else showMsg(t.errQrInvalid, 'error'); 
              }} />
            ) : (
              <button onClick={() => setIsScanning(true)} 
                className={`w-full py-12 border-4 border-dashed rounded-[2rem] flex flex-col items-center transition-all transform active:scale-95 ${
                  isVerified ? 'bg-green-50 border-green-300 text-green-600' : 'bg-blue-50 border-blue-300 text-blue-600 hover:bg-blue-100'
                }`}>
                {isVerified ? <Unlock size={64} /> : <Scan size={64} />}
                <span className="font-black mt-4 text-2xl">{isVerified ? t.qrVerified : t.scanQr}</span>
                {!isVerified && <p className="text-sm font-bold opacity-60 mt-2 px-6 text-center">{t.scanInstructions}</p>}
              </button>
            )}

            <div className="grid grid-cols-2 gap-6">
              <button onClick={() => handlePunch('in')} disabled={!isVerified || isScanning}
                className={`py-12 rounded-[2rem] flex flex-col items-center gap-3 shadow-2xl transition-all transform active:scale-95 ${
                  isVerified ? 'bg-gradient-to-br from-green-500 to-green-600 text-white' : 'bg-gray-100 text-gray-300 grayscale cursor-not-allowed'
                }`}>
                <LogIn size={48} />
                <span className="text-3xl font-black">{t.clockIn}</span>
                {!isVerified && <Lock size={20} className="mt-1 opacity-30" />}
              </button>
              <button onClick={() => handlePunch('out')} disabled={!isVerified || isScanning}
                className={`py-12 rounded-[2rem] flex flex-col items-center gap-3 shadow-2xl transition-all transform active:scale-95 ${
                  isVerified ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white' : 'bg-gray-100 text-gray-300 grayscale cursor-not-allowed'
                }`}>
                <LogOut size={48} />
                <span className="text-3xl font-black">{t.clockOut}</span>
                {!isVerified && <Lock size={20} className="mt-1 opacity-30" />}
              </button>
            </div>
          </div>
        </main>
      )}

      {screen === 'login' && (
        <div className="max-w-md mx-auto bg-white p-10 rounded-[2.5rem] shadow-2xl border">
          <h2 className="text-2xl font-black mb-8 text-center text-gray-800 tracking-tighter">{t.adminLogin}</h2>
          <input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} 
            className="w-full p-5 border-4 border-gray-50 rounded-2xl mb-6 focus:border-blue-500 outline-none text-center text-2xl tracking-[1em]" placeholder="••••" />
          <button onClick={() => { if(adminPassword === 'admin') setScreen('admin'); else showMsg('Invalid Password', 'error'); }} 
            className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-xl active:scale-95">
            {t.login}
          </button>
          <button onClick={() => setScreen('punch')} className="w-full mt-4 py-3 text-gray-400 font-bold hover:text-gray-600">{t.back}</button>
        </div>
      )}

      {screen === 'admin' && (
        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <h2 className="text-3xl font-black text-gray-800 tracking-tighter">{t.adminPanel}</h2>
            <div className="flex gap-3">
              <button onClick={exportCSV} className="flex items-center gap-2 px-6 py-3 bg-blue-50 hover:bg-blue-100 rounded-2xl font-black text-blue-700 transition-all active:scale-95">
                <Download size={20} /> {t.exportCsv}
              </button>
              <button onClick={() => setScreen('punch')} className="px-6 py-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-2xl font-black transition-all active:scale-95">
                {t.logout}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
              <thead>
                <tr className="bg-gray-50 text-gray-400 text-xs uppercase font-black border-b tracking-widest">
                  <th className="p-5 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => { setSortKey('date'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>{t.tableDate}</th>
                  <th className="p-5 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => { setSortKey('name'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>{t.tableName}</th>
                  <th className="p-5">{t.tableIn}</th>
                  <th className="p-5">{t.tableOut}</th>
                  <th className="p-5">{t.tableStatus}</th>
                  <th className="p-5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-bold">
                {sortedRecords.map(r => (
                  <tr key={r.id} className={`transition-all hover:bg-gray-50/50 ${r.status === 'approved' ? 'bg-green-50/30' : r.status === 'rejected' ? 'bg-red-50/30' : ''}`}>
                    <td className="p-5 font-mono text-sm text-gray-500">{r.date}</td>
                    <td className="p-5 text-lg text-gray-800">{r.name}</td>
                    <td className="p-5 text-green-700 text-xl font-black">{r.clockIn}</td>
                    <td className="p-5 text-orange-700 text-xl font-black">{r.clockOut || '—'}</td>
                    <td className="p-5">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                        r.status === 'approved' ? 'bg-green-100 text-green-700 border-green-200' :
                        r.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-gray-100 text-gray-400 border-gray-200'
                      }`}>
                        {r.status === 'approved' ? t.statusApproved : r.status === 'rejected' ? t.statusRejected : t.statusPending}
                      </span>
                    </td>
                    <td className="p-5 text-right flex justify-end gap-2">
                      <button onClick={() => { setRecords(records.map(rec => rec.id === r.id ? { ...rec, status: 'approved' } : rec)); showMsg(t.successAction); }} className="p-3 text-green-600 hover:bg-green-100 rounded-full transition-all"><CheckCircle size={24}/></button>
                      <button onClick={() => { setRecords(records.map(rec => rec.id === r.id ? { ...rec, status: 'rejected' } : rec)); showMsg(t.successAction); }} className="p-3 text-red-600 hover:bg-red-100 rounded-full transition-all"><XCircle size={24}/></button>
                      <button onClick={() => { setRecords(records.map(rec => rec.id === r.id ? { ...rec, status: 'pending' } : rec)); showMsg(t.successAction); }} className="p-3 text-gray-400 hover:bg-gray-100 rounded-full transition-all"><RotateCcw size={24}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      <footer className="mt-16 text-center text-gray-400 text-xs font-black uppercase tracking-[0.3em] pb-10">
        <p>© 2024 Smart Attendance System - Global High Precision Ver.</p>
      </footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
