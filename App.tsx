
import React, { useState, useMemo, useRef } from 'react';
import { EVALUATION_CATEGORIES } from './constants';
import { StudentRecord, ClassMetadata } from './types';
import { GoogleGenAI } from "@google/genai";
import * as XLSX from 'xlsx';

const App: React.FC = () => {
  const [metadata, setMetadata] = useState<ClassMetadata>({
    schoolName: '',
    className: '',
    topic: '',
    duration: '',
    dateCreated: '',
    teacherName: ''
  });

  const [remarks, setRemarks] = useState('');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [bghName, setBghName] = useState('');

  const [mtLabels, setMtLabels] = useState<Record<string, string>>({});
  const [dynamicMtKeys, setDynamicMtKeys] = useState<string[]>([]);
  const [dynamicCategories, setDynamicCategories] = useState<{name: string, count: number}[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [newStudentName, setNewStudentName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialMtKeys = useMemo(() => 
    EVALUATION_CATEGORIES.flatMap(cat => cat.targets.map((_, i) => `${cat.id}_${i}`)),
  []);

  const activeMtKeys = dynamicMtKeys.length > 0 ? dynamicMtKeys : initialMtKeys;
  const activeCategories = dynamicCategories.length > 0 ? dynamicCategories : EVALUATION_CATEGORIES.map(c => ({name: c.name, count: 5}));

  const createStudentObject = (name: string): StudentRecord => ({
    id: Math.random().toString(36).substring(2, 9),
    name: name.trim(),
    evaluations: activeMtKeys.reduce((acc, key) => {
      acc[key] = '';
      return acc;
    }, {} as Record<string, string>)
  });

  const stats = useMemo(() => {
    return activeMtKeys.reduce((acc, key) => {
      const colEvals = students.map(s => s.evaluations[key]).filter(v => v !== '');
      const reached = colEvals.filter(v => v === '+').length;
      const unreached = colEvals.filter(v => v === '-').length;
      const total = colEvals.length;
      acc[key] = { reached, unreached, total };
      return acc;
    }, {} as Record<string, { reached: number, unreached: number, total: number }>);
  }, [students, activeMtKeys]);

  const exportFinalExcel = () => {
    const totalCols = activeMtKeys.length + 4;
    
    const data: any[][] = [
      [metadata.schoolName.toUpperCase()],
      ["Lớp: " + metadata.className],
      [""],
      ["BẢNG ĐÁNH GIÁ TRẺ CUỐI CHỦ ĐỀ"],
      ["Chủ đề: " + metadata.topic],
      ["Thời gian thực hiện: " + metadata.duration],
      [""],
      ["STT", "Họ và tên", "MỤC TIÊU GIÁO DỤC (Đạt +; chưa đạt -)", ...Array(activeMtKeys.length - 1).fill(""), "Tổng Đạt", "Tổng Chưa"],
      ["", "", ...activeCategories.flatMap(cat => [cat.name, ...Array(cat.count - 1).fill("")]), "", ""],
      ["", "", ...activeMtKeys.map(k => mtLabels[k] || "MT...") , "", ""],
    ];

    students.forEach((s, idx) => {
      const vals = Object.values(s.evaluations);
      const reach = vals.filter(v => v === '+').length;
      const unreach = vals.filter(v => v === '-').length;
      data.push([idx + 1, s.name, ...activeMtKeys.map(k => s.evaluations[k] || ""), reach, unreach]);
    });

    data.push(["", "Tổng số trẻ đạt", ...activeMtKeys.map(k => stats[k].reached), "", ""]);
    data.push(["", "Tỉ lệ trẻ đạt (%)", ...activeMtKeys.map(k => stats[k].total ? Math.round((stats[k].reached / stats[k].total) * 100) : 0), "", ""]);
    data.push(["", "Số trẻ chưa đạt", ...activeMtKeys.map(k => stats[k].unreached), "", ""]);
    data.push(["", "Tỉ lệ trẻ chưa đạt (%)", ...activeMtKeys.map(k => stats[k].total ? Math.round((stats[k].unreached / stats[k].total) * 100) : 0), "", ""]);
    
    data.push([""]);
    data.push(["Nhận xét chung của giáo viên:"]);
    data.push([remarks]);
    data.push([""]);
    const dateStr = `......, ngày ${day || "..."} tháng ${month || "..."} năm ${year || "20..."}`;
    data.push(["", "", ...Array(activeMtKeys.length - 2).fill(""), dateStr]);
    data.push(["BGH phê duyệt", "", ...Array(activeMtKeys.length - 2).fill(""), "Người lập biểu"]);
    data.push([""]);
    data.push([""]);
    data.push([bghName, "", ...Array(activeMtKeys.length - 2).fill(""), metadata.teacherName]);

    const ws = XLSX.utils.aoa_to_sheet(data);

    const merges = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: totalCols - 1 } },
      { s: { r: 4, c: 0 }, e: { r: 4, c: totalCols - 1 } },
      { s: { r: 5, c: 0 }, e: { r: 5, c: totalCols - 1 } },
      { s: { r: 7, c: 0 }, e: { r: 8, c: 0 } },
      { s: { r: 7, c: 1 }, e: { r: 8, c: 1 } },
      { s: { r: 7, c: 2 }, e: { r: 7, c: 2 + activeMtKeys.length - 1 } },
      { s: { r: 7, c: totalCols - 2 }, e: { r: 8, c: totalCols - 2 } },
      { s: { r: 7, c: totalCols - 1 }, e: { r: 8, c: totalCols - 1 } },
    ];

    let currentCol = 2;
    activeCategories.forEach(cat => {
      merges.push({ s: { r: 8, c: currentCol }, e: { r: 8, c: currentCol + cat.count - 1 } });
      currentCol += cat.count;
    });
    ws['!merges'] = merges;

    ws['!ref'] = XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: totalCols - 1, r: data.length - 1 } });
    ws['!cols'] = [
      { wch: 6 },
      { wch: 28 },
      ...activeMtKeys.map(() => ({ wch: 5 })), 
      { wch: 10 }, 
      { wch: 10 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bao_Cao");
    
    XLSX.writeFile(wb, `Bao_Cao_In_Chuan_${metadata.className || 'Tre'}.xlsx`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any[]>(firstSheet, { header: 1 });
      if (rows.length < 3) return;
      const categoryRow = rows[1]; 
      const mtRow = rows[2];       
      const detectedCategories: {name: string, count: number}[] = [];
      const detectedMtKeys: string[] = [];
      const detectedLabels: Record<string, string> = {};
      const merges = firstSheet['!merges'] || [];
      const catMerges = merges.filter(m => m.s.r === 1 && m.s.c >= 2).sort((a, b) => a.s.c - b.s.c);
      if (catMerges.length > 0) {
        catMerges.forEach((m, idx) => {
          const name = categoryRow[m.s.c]?.toString().trim() || `Lĩnh vực ${idx + 1}`;
          const count = (m.e.c - m.s.c) + 1;
          detectedCategories.push({ name, count });
          for (let i = 0; i < count; i++) {
            const colIndex = m.s.c + i;
            const mtLabel = mtRow[colIndex]?.toString().trim() || `MT${detectedMtKeys.length + 1}`;
            const key = `dyn_${detectedMtKeys.length}`;
            detectedMtKeys.push(key);
            detectedLabels[key] = mtLabel;
          }
        });
      }
      setDynamicCategories(detectedCategories);
      setDynamicMtKeys(detectedMtKeys);
      setMtLabels(detectedLabels);
      const studentRows = rows.slice(3);
      const newStudents = studentRows.map(row => {
        const name = row[1]?.toString().trim();
        if (!name) return null;
        const evals: Record<string, string> = {};
        detectedMtKeys.forEach((key, i) => {
          const val = row[i + 2]?.toString().trim();
          if (val === '+' || val === '-') evals[key] = val;
        });
        return { id: Math.random().toString(36).substr(2, 9), name, evaluations: evals };
      }).filter(s => s !== null) as StudentRecord[];
      setStudents(newStudents);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadTemplate = () => {
    const wsData = [
      ["STT", "Họ và tên", "MỤC TIÊU GIÁO DỤC (Đạt +; chưa đạt -)", ...Array(activeMtKeys.length - 1).fill(""), "Tổng Đạt", "Tổng Chưa"],
      ["", "", ...activeCategories.flatMap(cat => [cat.name, ...Array(cat.count - 1).fill("")]), "", ""],
      ["", "", ...activeMtKeys.map(k => mtLabels[k] || "MT...") , "", ""],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const merges = [{ s: { r: 0, c: 2 }, e: { r: 0, c: 2 + activeMtKeys.length - 1 } }, { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } }, { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } }];
    let currentCol = 2;
    activeCategories.forEach(cat => { merges.push({ s: { r: 1, c: currentCol }, e: { r: 1, c: currentCol + cat.count - 1 } }); currentCol += cat.count; });
    ws['!merges'] = merges;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mau");
    XLSX.writeFile(wb, "Mau.xlsx");
  };

  const getCellBgColor = (val: string) => {
    if (val === '+') return 'bg-white';
    if (val === '-') return 'bg-blue-200';
    return 'bg-red-200';
  };

  return (
    <div className="min-h-screen pb-10 bg-slate-50 font-sans text-[13px]">
      <nav className="bg-indigo-950 text-white p-4 no-print flex justify-between items-center shadow-md">
        <div className="flex flex-col">
          <h1 className="font-bold text-lg flex items-center gap-2">
            <i className="fas fa-school"></i> QUẢN LÝ ĐÁNH GIÁ TRẺ MẦM NON
          </h1>
          <span className="text-[10px] opacity-70 italic">Tác giả: Nguyễn Thị Bé Hòa - GV Trường MG Bình Hòa</span>
        </div>
        <div className="flex gap-3">
          <button onClick={exportFinalExcel} className="bg-white text-indigo-900 px-4 py-2 rounded text-sm font-bold shadow transition-all border border-indigo-200 hover:bg-indigo-50">
            <i className="fas fa-file-excel mr-1"></i> Xuất Excel In (A4)
          </button>
          <button onClick={() => window.print()} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded text-sm transition-all border border-white/20">
            <i className="fas fa-print mr-1"></i> In báo cáo
          </button>
        </div>
      </nav>

      <div className="max-w-[1550px] mx-auto bg-white p-12 mt-6 shadow-2xl border border-slate-200 print:m-0 print:shadow-none print:border-none print:p-4" style={{ fontFamily: 'Times New Roman, serif' }}>
        <div className="mb-12 text-slate-900">
          <div className="flex justify-between mb-4 no-print">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">Tên trường học</label>
              <input type="text" className="border-b-2 border-slate-200 outline-none w-full focus:border-indigo-600 font-bold py-1" value={metadata.schoolName} onChange={e => setMetadata({...metadata, schoolName: e.target.value})} placeholder="Nhập tên trường..." />
            </div>
            <div className="flex-1"></div>
            <div className="flex flex-col gap-1 flex-1 items-end">
              <label className="text-[10px] uppercase font-bold text-slate-500">Tên lớp học</label>
              <input type="text" className="border-b-2 border-slate-200 outline-none w-48 focus:border-indigo-600 font-bold py-1 text-right" value={metadata.className} onChange={e => setMetadata({...metadata, className: e.target.value})} placeholder="Tên lớp..." />
            </div>
          </div>
          
          <div className="text-center">
            <h2 className="text-3xl font-bold text-black uppercase mb-4 tracking-tight">BẢNG ĐÁNH GIÁ TRẺ CUỐI CHỦ ĐỀ</h2>
            <div className="flex flex-col items-center space-y-2">
              <div className="flex items-center gap-2 text-lg">
                <span className="font-bold">Chủ đề:</span>
                <input type="text" className="border-b border-dashed border-black w-96 text-center outline-none" value={metadata.topic} onChange={e => setMetadata({...metadata, topic: e.target.value})} />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold uppercase text-sm">Thời gian thực hiện:</span>
                <input type="text" className="border-b border-dashed border-black w-80 text-center outline-none" value={metadata.duration} onChange={e => setMetadata({...metadata, duration: e.target.value})} />
              </div>
            </div>
          </div>
        </div>

        <div className="no-print grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
           <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col justify-between">
              <h3 className="font-black text-indigo-900 mb-2 uppercase text-sm tracking-wider flex items-center gap-2">
                <i className="fas fa-file-excel"></i> Nhập liệu/Tải mẫu
              </h3>
              <div className="flex gap-3 mt-4">
                <button onClick={downloadTemplate} className="flex-1 bg-white border-2 border-indigo-100 text-indigo-700 py-3 rounded-xl hover:bg-indigo-50 font-bold">Tải Mau.xlsx</button>
                <label className="flex-1 bg-indigo-600 text-white py-3 rounded-xl cursor-pointer hover:bg-indigo-700 flex items-center justify-center gap-2 font-bold shadow-lg">
                  Upload File
                  <input type="file" className="hidden" accept=".xlsx" ref={fileInputRef} onChange={handleFileUpload} />
                </label>
              </div>
           </div>
           <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <h3 className="font-black text-slate-800 mb-2 uppercase text-sm tracking-wider">Thêm trẻ</h3>
              <div className="flex gap-2 mt-4">
                <input type="text" className="flex-1 border-2 border-slate-200 rounded-xl px-5 py-3 outline-none focus:border-indigo-500" placeholder="Họ tên trẻ..." value={newStudentName} onChange={e=>setNewStudentName(e.target.value)} onKeyDown={e=>e.key==='Enter' && newStudentName.trim() && setStudents([...students, createStudentObject(newStudentName)])} />
                <button onClick={() => { if(newStudentName.trim()) setStudents([...students, createStudentObject(newStudentName)]); setNewStudentName(''); }} className="bg-slate-900 text-white px-8 py-3 rounded-xl hover:bg-black font-black uppercase text-xs tracking-widest">Thêm</button>
              </div>
           </div>
        </div>

        <div className="overflow-x-auto border border-black">
          <table className="w-full border-collapse text-[13px] leading-tight">
            <thead>
              <tr className="bg-white">
                <th rowSpan={3} className="border border-black p-2 w-10 font-bold text-center">STT</th>
                <th rowSpan={3} className="border border-black p-2 w-64 font-bold text-left">Họ và tên</th>
                <th colSpan={activeMtKeys.length} className="border border-black p-2 uppercase font-bold text-base text-center">MỤC TIÊU GIÁO DỤC (Đạt +; chưa đạt -)</th>
                <th colSpan={2} className="border border-black p-2 uppercase font-bold text-center">Tổng</th>
              </tr>
              <tr className="bg-white">
                {activeCategories.map((cat, idx) => (
                  <th key={idx} colSpan={cat.count} className="border border-black p-1 font-bold uppercase text-center">{cat.name}</th>
                ))}
                <th rowSpan={2} className="border border-black p-1 w-12 font-bold">Đạt</th>
                <th rowSpan={2} className="border border-black p-1 w-12 font-bold">Chưa</th>
              </tr>
              <tr className="bg-white">
                {activeMtKeys.map(key => (
                  <th key={key} className="border border-black w-12 h-10 p-0">
                    <input type="text" className="w-full h-full text-center outline-none font-bold bg-transparent" value={mtLabels[key] || ''} onChange={e => setMtLabels({...mtLabels, [key]: e.target.value})} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((s, idx) => {
                const vals = Object.values(s.evaluations);
                const reach = vals.filter(v => v === '+').length;
                const unreach = vals.filter(v => v === '-').length;
                return (
                  <tr key={s.id} className="h-8">
                    <td className="border border-black text-center">{idx + 1}</td>
                    <td className="border border-black px-2 relative group">{s.name}</td>
                    {activeMtKeys.map(key => (
                      <td 
                        key={key} 
                        onClick={() => {
                          const current = s.evaluations[key];
                          const next = current === '+' ? '-' : (current === '-' ? '' : '+');
                          setStudents(students.map(st => st.id === s.id ? {...st, evaluations: {...st.evaluations, [key]: next}} : st));
                        }} 
                        className={`border border-black text-center cursor-pointer font-bold text-lg transition-colors ${getCellBgColor(s.evaluations[key])}`}
                      >
                        {s.evaluations[key]}
                      </td>
                    ))}
                    <td className="border border-black text-center font-bold">{reach || ''}</td>
                    <td className="border border-black text-center font-bold">{unreach || ''}</td>
                  </tr>
                );
              })}
              {students.length > 0 && (
                <>
                  <tr className="font-bold"><td colSpan={2} className="border border-black p-1 text-right uppercase text-[10px]">Tổng số trẻ đạt:</td>{activeMtKeys.map(key => (<td key={key} className="border border-black text-center">{stats[key].reached}</td>))}<td colSpan={2} className="border border-black"></td></tr>
                  <tr className="font-bold"><td colSpan={2} className="border border-black p-1 text-right uppercase text-[10px]">Tỉ lệ trẻ đạt (%):</td>{activeMtKeys.map(key => (<td key={key} className="border border-black text-center">{stats[key].total ? Math.round((stats[key].reached / stats[key].total) * 100) : 0}%</td>))}<td colSpan={2} className="border border-black"></td></tr>
                  <tr className="font-bold"><td colSpan={2} className="border border-black p-1 text-right uppercase text-[10px]">Số trẻ chưa đạt:</td>{activeMtKeys.map(key => (<td key={key} className="border border-black text-center">{stats[key].unreached}</td>))}<td colSpan={2} className="border border-black"></td></tr>
                  <tr className="font-bold"><td colSpan={2} className="border border-black p-1 text-right uppercase text-[10px]">Tỉ lệ trẻ chưa đạt (%):</td>{activeMtKeys.map(key => (<td key={key} className="border border-black text-center">{stats[key].total ? Math.round((stats[key].unreached / stats[key].total) * 100) : 0}%</td>))}<td colSpan={2} className="border border-black"></td></tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-20">
          <div className="space-y-4">
            <p className="font-bold italic uppercase text-sm">Nhận xét chung của giáo viên:</p>
            <textarea className="w-full border border-black rounded p-2 min-h-[80px] outline-none text-[13px] resize-none" value={remarks} onChange={e => setRemarks(e.target.value)} />
          </div>
          <div className="text-center flex flex-col justify-between items-center">
            <div className="flex items-center gap-1 italic font-medium">
              <span>......, ngày</span><input type="text" className="w-8 border-b border-black text-center outline-none" value={day} onChange={e => setDay(e.target.value)} />
              <span>tháng</span><input type="text" className="w-8 border-b border-black text-center outline-none" value={month} onChange={e => setMonth(e.target.value)} />
              <span>năm</span><input type="text" className="w-12 border-b border-black text-center outline-none" value={year} onChange={e => setYear(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 w-full mt-8">
              <div className="space-y-16"><p className="font-bold uppercase">BGH phê duyệt</p><input type="text" className="w-full border-b border-black text-center outline-none font-bold" value={bghName} onChange={e => setBghName(e.target.value)} /></div>
              <div className="space-y-16"><p className="font-bold uppercase">Người lập biểu</p><input type="text" className="w-full border-b border-black text-center outline-none font-bold" value={metadata.teacherName} onChange={e => setMetadata({...metadata, teacherName: e.target.value})} /></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
