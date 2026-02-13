
import React, { useState, useEffect, useCallback } from 'react';
import { translations } from './translations';
import { Language, Screen, AttendanceRecord, Status } from './types';
import { 
  LogIn, 
  LogOut, 
  Scan, 
  CheckCircle, 
  XCircle, 
  RotateCcw, 
  Download, 
  Settings, 
  User, 
  ShieldCheck,
  ChevronLeft
} from 'lucide-react';

const VALID_QR_CODE = "KUMAMOTO_HIGO";

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('lang');
    return (saved as Language) || 'ja';
  });
  const [screen, setScreen] = useState<Screen>('punch');
  const [employeeName, setEmployeeName] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [records, setRecords] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem('attendance_records');
    return saved ? JSON.parse(saved) : [];
  });
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [sortKey, setSortKey] = useState<keyof AttendanceRecord>('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const t = translations[language];

  useEffect(() => {
    localStorage.setItem('lang', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('attendance_records', JSON.stringify(records));
  }, [records]);

  const showMessage = (text: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleLanguageChange = (lang: Language) => setLanguage(lang);

  const getCurrentDate = () => new Date().toISOString().split('T')[0];
  const getCurrentTime = () => new Date().toLocaleTimeString('ja-JP');

  const onScanSuccess = useCallback((decodedText: string) => {
    if (decodedText === VALID_QR_CODE) {
      setIsScanning(false);
      showMessage(t.scanInstructions, 'success');
    } else {
      showMessage(t.errQrInvalid, 'error');
    }
  }, [t]);

  const handlePunchIn = () => {
    if (!employeeName.trim()) {
      showMessage(t.errNameEmpty, 'error');
      return;
    }
    const today = getCurrentDate();
    const existing = records.find(r => r.name === employeeName && r.date === today);

    if (existing) {
      showMessage(t.errAlreadyIn, 'error');
      return;
    }

    const newRecord: AttendanceRecord = {
      id: Date.now(),
      date: today,
      name: employeeName,
      clockIn: getCurrentTime(),
      clockOut: null,
      status: 'pending'
    };

    setRecords([newRecord, ...records]);
    showMessage(t.successIn, 'success');
  };

  const handlePunchOut = () => {
    if (!employeeName.trim()) {
      showMessage(t.errNameEmpty, 'error');
      return;
    }
    const today = getCurrentDate();
    const recordIndex = records.findIndex(r => r.name === employeeName && r.date === today);

    if (recordIndex === -1) {
      showMessage(t.errNotIn, 'error');
      return;
    }

    if (records[recordIndex].clockOut) {
      showMessage(t.errAlreadyOut, 'error');
      return;
    }

    const updatedRecords = [...records];
    updatedRecords[recordIndex] = {
      ...updatedRecords[recordIndex],
      clockOut: getCurrentTime()
    };

    setRecords(updatedRecords);
    showMessage(t.successOut, 'success');
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === 'admin') {
      setScreen('admin');
      setAdminPassword('');
    } else {
      showMessage('Invalid password', 'error');
    }
  };

  const updateRecordStatus = (id: number, newStatus: Status) => {
    setRecords(records.map(r => r.id === id ? { ...r, status: newStatus } : r));
    showMessage(t.successAction, 'success');
  };

  const sortedRecords = [...records].sort((a, b) => {
    const valA = a[sortKey];
    const valB = b[sortKey];
    if (valA === null) return 1;
    if (valB === null) return -1;
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
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_${getCurrentDate()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-2xl font-bold text-blue-800 flex items-center gap-2">
          <ShieldCheck className="w-8 h-8" />
          {t.title}
        </h1>
        <div className="flex gap-2">
          {(['ja', 'en', 'zh'] as Language[]).map(lang => (
            <button
              key={lang}
              onClick={() => handleLanguageChange(lang)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                language === lang ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 border border-blue-600 hover:bg-blue-50'
              }`}
            >
              {lang === 'ja' ? '日本語' : lang === 'en' ? 'English' : '中文'}
            </button>
          ))}
          {screen === 'punch' ? (
            <button 
              onClick={() => setScreen('login')}
              className="p-2 text-gray-600 hover:text-blue-600"
              title={t.adminLogin}
            >
              <Settings className="w-6 h-6" />
            </button>
          ) : (
            <button 
              onClick={() => setScreen('punch')}
              className="flex items-center gap-1 p-2 text-gray-600 hover:text-blue-600"
            >
              <ChevronLeft className="w-5 h-5" />
              {t.back}
            </button>
          )}
        </div>
      </header>

      {/* Global Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg shadow-sm flex items-center gap-3 animate-bounce ${
          message.type === 'success' ? 'bg-green-100 text-green-800 border-l-4 border-green-500' : 
          message.type === 'error' ? 'bg-red-100 text-red-800 border-l-4 border-red-500' : 
          'bg-yellow-100 text-yellow-800 border-l-4 border-yellow-500'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* Screens */}
      {screen === 'punch' && (
        <div className="bg-white p-6 md:p-10 rounded-2xl shadow-xl border border-gray-100">
          <div className="space-y-8">
            <section>
              <label className="block text-lg font-bold text-gray-700 mb-2 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                {t.employeeName}
              </label>
              <input
                type="text"
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                placeholder={t.namePlaceholder}
                className="w-full px-4 py-4 text-xl border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              />
            </section>

            <section className="flex flex-col items-center gap-4">
              {isScanning ? (
                <div className="w-full max-w-sm">
                  <QrScanner 
                    onSuccess={onScanSuccess} 
                    onError={() => showMessage(t.errQrFailed, 'error')}
                    onCameraError={() => showMessage(t.errCameraDenied, 'error')}
                    cancelText={t.back}
                    onCancel={() => setIsScanning(false)}
                  />
                  <p className="mt-4 text-center text-gray-500">{t.scanInstructions}</p>
                </div>
              ) : (
                <button
                  onClick={() => setIsScanning(true)}
                  className="w-full py-6 bg-blue-50 border-2 border-dashed border-blue-300 text-blue-600 rounded-2xl flex flex-col items-center gap-2 hover:bg-blue-100 transition-colors"
                >
                  <Scan className="w-10 h-10" />
                  <span className="text-xl font-bold">{t.scanQr}</span>
                </button>
              )}
            </section>

            <section className="grid grid-cols-2 gap-4">
              <button
                disabled={isScanning}
                onClick={handlePunchIn}
                className="group relative overflow-hidden py-10 bg-green-500 hover:bg-green-600 text-white rounded-3xl flex flex-col items-center justify-center gap-3 transition-all transform active:scale-95 disabled:opacity-50"
              >
                <LogIn className="w-12 h-12" />
                <span className="text-2xl font-black">{t.clockIn}</span>
              </button>
              <button
                disabled={isScanning}
                onClick={handlePunchOut}
                className="group relative overflow-hidden py-10 bg-orange-500 hover:bg-orange-600 text-white rounded-3xl flex flex-col items-center justify-center gap-3 transition-all transform active:scale-95 disabled:opacity-50"
              >
                <LogOut className="w-12 h-12" />
                <span className="text-2xl font-black">{t.clockOut}</span>
              </button>
            </section>
          </div>
        </div>
      )}

      {screen === 'login' && (
        <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-xl">
          <h2 className="text-xl font-bold mb-6 text-center">{t.adminLogin}</h2>
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.password}</label>
              <input
                type="password"
                autoFocus
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-200 outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t.login}
            </button>
          </form>
        </div>
      )}

      {screen === 'admin' && (
        <div className="bg-white p-6 rounded-2xl shadow-xl border overflow-x-auto">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-blue-600" />
              {t.adminPanel}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                {t.exportCsv}
              </button>
              <button
                onClick={() => setScreen('punch')}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-medium transition-colors"
              >
                <LogOut className="w-4 h-4" />
                {t.logout}
              </button>
            </div>
          </div>

          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                <th 
                  className="px-4 py-3 cursor-pointer hover:bg-gray-100"
                  onClick={() => { setSortKey('date'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}
                >
                  {t.tableDate} {sortKey === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-4 py-3 cursor-pointer hover:bg-gray-100"
                  onClick={() => { setSortKey('name'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}
                >
                  {t.tableName} {sortKey === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3">{t.tableIn}</th>
                <th className="px-4 py-3">{t.tableOut}</th>
                <th className="px-4 py-3">{t.tableStatus}</th>
                <th className="px-4 py-3 text-right">{t.tableActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedRecords.map((record) => (
                <tr key={record.id} className={`transition-colors ${
                  record.status === 'approved' ? 'bg-green-50' : 
                  record.status === 'rejected' ? 'bg-red-50' : 'bg-white'
                }`}>
                  <td className="px-4 py-4 font-medium">{record.date}</td>
                  <td className="px-4 py-4">{record.name}</td>
                  <td className="px-4 py-4 text-green-700 font-mono">{record.clockIn}</td>
                  <td className="px-4 py-4 text-orange-700 font-mono">{record.clockOut || '-'}</td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      record.status === 'approved' ? 'bg-green-200 text-green-800' :
                      record.status === 'rejected' ? 'bg-red-200 text-red-800' :
                      'bg-gray-200 text-gray-800'
                    }`}>
                      {record.status === 'approved' ? t.statusApproved : 
                       record.status === 'rejected' ? t.statusRejected : t.statusPending}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        title={t.approve}
                        onClick={() => updateRecordStatus(record.id, 'approved')}
                        className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                      <button
                        title={t.reject}
                        onClick={() => updateRecordStatus(record.id, 'rejected')}
                        className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                      <button
                        title={t.cancel}
                        onClick={() => updateRecordStatus(record.id, 'pending')}
                        className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <RotateCcw className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-500 italic">
                    No records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer Info */}
      <footer className="mt-12 text-center text-gray-400 text-sm">
        <p>© 2024 Attendance Manager - Universal Access Ver.</p>
      </footer>
    </div>
  );
};

// QR Scanner Component Wrapper
interface QrScannerProps {
  onSuccess: (text: string) => void;
  onError: () => void;
  onCameraError: () => void;
  cancelText: string;
  onCancel: () => void;
}

const QrScanner: React.FC<QrScannerProps> = ({ onSuccess, onError, onCameraError, cancelText, onCancel }) => {
  useEffect(() => {
    // @ts-ignore (using global script loaded in index.html)
    const scanner = new window.Html5QrcodeScanner("reader", { 
      fps: 10, 
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0
    });

    scanner.render(
      (decodedText: string) => {
        scanner.clear();
        onSuccess(decodedText);
      },
      (error: any) => {
        // Just silent scan errors (common during continuous scanning)
      }
    );

    return () => {
      scanner.clear().catch((e: any) => console.warn("Scanner cleanup failed", e));
    };
  }, [onSuccess, onError]);

  return (
    <div className="w-full">
      <div id="reader" className="rounded-xl overflow-hidden border-2 border-blue-200"></div>
      <button 
        onClick={onCancel}
        className="w-full mt-2 py-2 text-gray-500 hover:text-gray-700 font-medium"
      >
        {cancelText}
      </button>
    </div>
  );
};

export default App;
