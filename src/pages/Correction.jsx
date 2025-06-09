import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, File, ArrowLeft, CheckCircle, AlertCircle, Trophy, BookOpen, Download } from 'lucide-react';
import { toast } from 'react-toastify';
import { useCorrectionContext } from '../contexts/CorrectionContext';

const CorrectionPage = () => {
    const [keyFiles, setKeyFiles] = useState([]);
    const [studentFiles, setStudentFiles] = useState([]);
    const [keyDragActive, setKeyDragActive] = useState(false);
    const [studentDragActive, setStudentDragActive] = useState(false);
    const keyFileInputRef = useRef(null);
    const studentFileInputRef = useRef(null);
    const navigate = useNavigate();

    const { isCorrecting, correctionResult, error, submitCorrection, resetCorrection } = useCorrectionContext();

    const handleKeyDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setKeyDragActive(true);
        } else if (e.type === "dragleave") {
            setKeyDragActive(false);
        }
    };

    const handleStudentDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setStudentDragActive(true);
        } else if (e.type === "dragleave") {
            setStudentDragActive(false);
        }
    };

    const handleKeyDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setKeyDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleKeyFiles(e.dataTransfer.files);
        }
    };

    const handleStudentDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setStudentDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleStudentFiles(e.dataTransfer.files);
        }
    };

    const handleKeyFiles = (files) => {
        const MAX_TOTAL_SIZE = 5 * 1024 * 1024; // 5MB
        const validTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain'
        ];

        if (!files || files.length === 0) return;

        const fileArray = Array.from(files);

        // Tampilkan warning kalau user upload lebih dari 1 file
        if (fileArray.length > 1) {
            toast.warning('Harap mengupload hanya 1 file kunci jawaban!');
        }

        const file = fileArray[0];

        if (!validTypes.includes(file.type)) {
            toast.error(`Tipe file "${file.name}" tidak didukung.`);
            return;
        }

        if (file.size > MAX_TOTAL_SIZE) {
            toast.error(`File "${file.name}" melebihi batas ukuran 5MB.`);
            return;
        }

        // Ganti file sebelumnya dengan file yang valid
        setKeyFiles([file]);
    };

    const handleStudentFiles = (files) => {
        const MAX_TOTAL_SIZE = 5 * 1024 * 1024; // 5MB
        const validTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain'
        ];

        const incomingFiles = Array.from(files).filter(file => validTypes.includes(file.type));

        const currentSize = studentFiles.reduce((sum, f) => sum + f.size, 0);
        let totalSize = currentSize;
        const accepted = [];
        let rejected = null;

        for (const file of incomingFiles) {
            if (totalSize + file.size <= MAX_TOTAL_SIZE) {
                accepted.push(file);
                totalSize += file.size;
            } else {
                rejected = file.name;
                break;
            }
        }

        if (accepted.length > 0) {
            setStudentFiles(prev => [...prev, ...accepted]);
        }

        if (rejected) {
            alert(`File "${rejected}" ditolak karena upload size melebihi batas total 5MB.`);
        }
    };

    const removeKeyFile = (index) => {
        setKeyFiles(prev => prev.filter((_, i) => i !== index));
    };

    const removeStudentFile = (index) => {
        setStudentFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleBack = () => {
        navigate('/');
    };

    const onCorrecting = async () => {
        await submitCorrection(keyFiles, studentFiles);
    };

    const getScoreColor = (score, isBadge = false) => {
        if (isBadge) {
            if (score >= 80) return 'bg-green-100 text-green-800';
            if (score >= 60) return 'bg-yellow-100 text-yellow-800';
            return 'bg-red-100 text-red-800';
        } else {
            if (score >= 80) return 'text-green-800';
            if (score >= 60) return 'text-yellow-800';
            return 'text-red-800';
        }
    };

    // Function to download Excel
    const downloadExcel = () => {
        try {
            // Get the table data
            const data = Array.isArray(correctionResult.oogiv_response) ? correctionResult.oogiv_response :
                Array.isArray(correctionResult) ? correctionResult : [correctionResult];

            // Create workbook
            const wb = XLSX.utils.book_new();

            // Prepare data for Excel
            const excelData = [
                ['No', 'Nama', 'Jawaban Benar', 'Jawaban Salah', 'Nilai'], // Header
                ...data.map((item, index) => [
                    index + 1,
                    item.siswa || item.nama || 'Tidak tersedia',
                    item.benar || item.correct || 0,
                    item.salah || item.wrong || 0,
                    item.nilai || item.score || 0
                ])
            ];

            // Create worksheet
            const ws = XLSX.utils.aoa_to_sheet(excelData);

            // Set column widths
            ws['!cols'] = [
                { wch: 5 },  // No
                { wch: 25 }, // Nama
                { wch: 15 }, // Jawaban Benar
                { wch: 15 }, // Jawaban Benar
                { wch: 10 }  // Nilai
            ];

            // Style the header row
            const headerStyle = {
                font: { bold: true },
                fill: { fgColor: { rgb: "FFC000" } }, // Yellow background
                alignment: { horizontal: "center", vertical: "center" }
            };

            // Apply header style
            ['A1', 'B1', 'C1', 'D1'].forEach(cell => {
                if (ws[cell]) {
                    ws[cell].s = headerStyle;
                }
            });

            // Add worksheet to workbook
            XLSX.utils.book_append_sheet(wb, ws, 'Hasil Koreksi');

            // Generate filename with current date
            const now = new Date();
            const filename = `Hasil_Koreksi_${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}.xlsx`;

            // Download the file
            XLSX.writeFile(wb, filename);

            // Show success message (optional)
            toast.success('File Excel berhasil didownload!');

        } catch (error) {
            toast.error('Gagal mendownload file Excel. Silakan coba lagi.');
        }
    };

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <header className="bg-white shadow-md sticky top-0 z-40">
                <div className="w-auto sm:mx-0 md:mx-4 lg:mx-4 py-4 select-none relative">
                    <div className="flex items-center justify-center">
                        <button
                            onClick={handleBack}
                            className="absolute left-4 sm:left-6 lg:left-0 p-2 hover:bg-red-500 rounded-lg transition-colors duration-200 cursor-pointer text-slate-800 hover:text-white"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="text-center">
                            <h1 className="text-xl md:text-2xl font-semibold text-gray-900 lg:mb-2">Koreksi Jawaban</h1>
                            <p className="hidden lg:block text-xs md:text-sm mx-3 text-gray-700 font-medium">OOGIV siap memeriksa dan menilai jawaban secara instan dan akurat.</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="w-full max-w-full mx-auto px-4 lg:px-6 xl:px-8 py-4 select-none">
                <div className="flex flex-col md:flex-row gap-4 lg:gap-6 xl:gap-8">
                    {/* Form Section - Responsive width */}
                    <div className="w-full md:w-2/5 2xl:w-1/3">
                        <div className="rounded-2xl bg-white shadow-lg p-5 sm:p-4 lg:p-6 border-t-sky-300 border-t-6">
                            <div className="space-y-4 sm:space-y-5">
                                <div className="flex flex-col gap-y-3">
                                    {/* Upload Kunci Jawaban*/}
                                    <label className='text-sm font-medium text-gray-700'>Upload Kunci Jawaban</label>
                                    <div
                                        className={`relative border-2 border-dashed rounded-lg p-3 transition-all duration-200 ${keyDragActive
                                            ? 'border-blue-400 bg-blue-50'
                                            : 'border-gray-300 hover:border-gray-400'
                                            }`}
                                        onDragEnter={handleKeyDrag}
                                        onDragLeave={handleKeyDrag}
                                        onDragOver={handleKeyDrag}
                                        onDrop={handleKeyDrop}
                                    >
                                        <div className="text-center">
                                            <Upload className="mx-auto h-5 w-5 text-gray-400 mb-2" />
                                            <p className="text-xs font-medium text-gray-700 mb-1">
                                                Drag and drop files here
                                            </p>
                                            <p className="text-xs text-gray-500 mb-2">
                                                Limit 5MB • PDF, DOCX, PPTX, TXT
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => keyFileInputRef.current?.click()}
                                                className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-md transition-colors duration-200 cursor-pointer"
                                            >
                                                Browse files
                                            </button>
                                        </div>
                                        <input
                                            ref={keyFileInputRef}
                                            type="file"
                                            multiple
                                            accept=".pdf,.docx,.pptx,.txt"
                                            onChange={(e) => handleKeyFiles(e.target.files)}
                                            className="hidden"
                                        />
                                    </div>
                                    {/* Uploaded Key Files */}
                                    {keyFiles.length > 0 && (
                                        <div className="mt-2 space-y-2">
                                            <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                                                {keyFiles.map((file, index) => (
                                                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                                                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                                                            <File className="w-3 h-3 text-blue-500 flex-shrink-0" />
                                                            <span className="text-xs font-medium text-gray-700 truncate">
                                                                {file.name}
                                                            </span>
                                                            <span className="text-xs text-gray-500 flex-shrink-0">
                                                                ({(file.size / 1024 / 1024).toFixed(1)} MB)
                                                            </span>
                                                        </div>
                                                        <button
                                                            onClick={() => removeKeyFile(index)}
                                                            className="text-red-500 hover:text-red-700 transition-colors duration-200 cursor-pointer flex-shrink-0 ml-2"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col gap-y-3">
                                    {/* Upload Jawaban siswa*/}
                                    <label className='text-sm font-medium text-gray-700'>Upload Jawaban Siswa</label>
                                    <div
                                        className={`relative border-2 border-dashed rounded-lg p-3 transition-all duration-200 ${studentDragActive
                                            ? 'border-blue-400 bg-blue-50'
                                            : 'border-gray-300 hover:border-gray-400'
                                            }`}
                                        onDragEnter={handleStudentDrag}
                                        onDragLeave={handleStudentDrag}
                                        onDragOver={handleStudentDrag}
                                        onDrop={handleStudentDrop}
                                    >
                                        <div className="text-center">
                                            <Upload className="mx-auto h-5 w-5 text-gray-400 mb-2" />
                                            <p className="text-xs font-medium text-gray-700 mb-1">
                                                Drag and drop files here
                                            </p>
                                            <p className="text-xs text-gray-500 mb-2">
                                                Limit 5MB • PDF, DOCX, PPTX, TXT
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => studentFileInputRef.current?.click()}
                                                className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-md transition-colors duration-200 cursor-pointer"
                                            >
                                                Browse files
                                            </button>
                                        </div>
                                        <input
                                            ref={studentFileInputRef}
                                            type="file"
                                            multiple
                                            accept=".pdf,.docx,.pptx,.txt"
                                            onChange={(e) => handleStudentFiles(e.target.files)}
                                            className="hidden"
                                        />
                                    </div>
                                    {/* Uploaded Student Files */}
                                    {studentFiles.length > 0 && (
                                        <div className="mt-2 space-y-2">
                                            <div className="max-h-24 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                                {studentFiles.map((file, index) => (
                                                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                                                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                                                            <File className="w-3 h-3 text-blue-500 flex-shrink-0" />
                                                            <span className="text-xs font-medium text-gray-700 truncate">
                                                                {file.name}
                                                            </span>
                                                            <span className="text-xs text-gray-500 flex-shrink-0">
                                                                ({(file.size / 1024 / 1024).toFixed(1)} MB)
                                                            </span>
                                                        </div>
                                                        <button
                                                            onClick={() => removeStudentFile(index)}
                                                            className="text-red-500 hover:text-red-700 transition-colors duration-200 cursor-pointer flex-shrink-0 ml-2"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Generate Button - Fixed */}
                                    <button
                                        onClick={onCorrecting}
                                        disabled={isCorrecting || keyFiles.length === 0 || studentFiles.length === 0}
                                        className={`w-full py-3 sm:py-4 px-4 sm:px-6 rounded-xl font-semibold transition-all duration-400 ${isCorrecting || keyFiles.length === 0 || studentFiles.length === 0
                                            ? 'bg-gray-400 text-white cursor-not-allowed'
                                            : 'bg-slate-100 outline-2 outline-sky-300 hover:bg-sky-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] text-slate-950/70 hover:text-white cursor-pointer'
                                            }`}
                                    >
                                        {isCorrecting ? (
                                            <div className="flex items-center justify-center space-x-3">
                                                <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
                                                <span className='text-white text-sm sm:text-base'>Sedang Mengoreksi...</span>
                                            </div>
                                        ) : (
                                            <span className="text-sm sm:text-base">Koreksi Jawaban</span>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Results Container - Responsive width with max height */}
                    <div className="w-full md:w-3/5 2xl:w-2/3">
                        <div className="rounded-2xl shadow-lg border-b-sky-300 border-b-6 p-3 sm:p-4 lg:p-6 xl:sticky xl:top-24 bg-white max-h-[85vh] overflow-hidden flex flex-col">
                            {!correctionResult && !error && !isCorrecting && (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                        <BookOpen className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <p className="text-sm text-gray-500">
                                        Upload file kunci jawaban dan jawaban siswa, lalu klik tombol "Koreksi Jawaban" untuk memulai proses penilaian otomatis.
                                    </p>
                                </div>
                            )}

                            {isCorrecting && (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-300 mb-4"></div>
                                    <h3 className="text-lg font-medium text-gray-700 mb-2">Sedang Mengoreksi...</h3>
                                    <p className="text-sm text-gray-500">
                                        OOGIV sedang menganalisis dan mengoreksi jawaban. Mohon tunggu sebentar.
                                    </p>
                                </div>
                            )}

                            {error && (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                        <AlertCircle className="w-8 h-8 text-red-500" />
                                    </div>
                                    <h3 className="text-lg font-medium text-red-700 mb-2">Error</h3>
                                    <p className="text-sm text-red-600 max-w-md">
                                        {error}
                                    </p>
                                </div>
                            )}

                            {correctionResult && (
                                <div className="space-y-4 flex flex-col min-h-0">
                                    <div className="text-center border-b pb-2 flex-shrink-0">
                                        <h2 className="text-lg font-bold text-gray-800 mb-1">Hasil Koreksi</h2>
                                    </div>

                                    {/* Summary Statistics */}
                                    <div className="grid grid-cols-3 gap-3 flex-shrink-0">
                                        {/* Total Students */}
                                        <div className="bg-blue-custom/20 hover:bg-blue-custom/60 rounded-2xl p-3 text-center cursor-pointer">
                                            <div className="flex justify-center mb-2">
                                                <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                                    <BookOpen className="w-5 h-5 text-blue-600" />
                                                </div>
                                            </div>
                                            <h3 className="text-xs md:text-sm font-medium text-gray-600 mb-1">Total Siswa</h3>
                                            <p className="text-lg font-bold text-blue-800">
                                                {Array.isArray(correctionResult.oogiv_response) ? correctionResult.oogiv_response.length :
                                                    Array.isArray(correctionResult) ? correctionResult.length : 1}
                                            </p>
                                        </div>

                                        {/* Average Score */}
                                        <div className="bg-emerald-500/20 hover:bg-emerald-500/60 rounded-2xl p-3 text-center cursor-pointer">
                                            <div className="flex justify-center mb-2">
                                                <div className="w-8 h-8 md:w-10 md:h-10 bg-green-100 rounded-full flex items-center justify-center">
                                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                                </div>
                                            </div>
                                            <h3 className="text-xs md:text-sm font-medium text-gray-600 mb-1">Rata-rata Nilai</h3>
                                            <p className="text-lg font-bold text-green-800">
                                                {(() => {
                                                    const data = Array.isArray(correctionResult.oogiv_response) ? correctionResult.oogiv_response :
                                                        Array.isArray(correctionResult) ? correctionResult : [correctionResult];
                                                    const total = data.reduce((sum, item) => sum + (item.nilai || item.score || 0), 0);
                                                    return Math.round(total / data.length);
                                                })()}
                                            </p>
                                        </div>

                                        {/* Highest Score */}
                                        <div className=" bg-yellow-custom/20 hover:bg-yellow-custom/60 rounded-2xl p-3 text-center cursor-pointer">
                                            <div className="flex justify-center mb-2">
                                                <div className="w-8 h-8 md:w-10 md:h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                                                    <Trophy className="w-5 h-5 text-yellow-600" />
                                                </div>
                                            </div>
                                            <h3 className="text-xs md:text-sm font-medium text-gray-600 mb-1">Nilai Tertinggi</h3>
                                            <p className="text-lg font-bold text-yellow-800">
                                                {(() => {
                                                    const data = Array.isArray(correctionResult.oogiv_response) ? correctionResult.oogiv_response :
                                                        Array.isArray(correctionResult) ? correctionResult : [correctionResult];
                                                    return Math.max(...data.map(item => item.nilai || item.score || 0));
                                                })()}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Download Button */}
                                    <div className="flex justify-end flex-shrink-0">
                                        <button
                                            onClick={downloadExcel}
                                            className="flex items-center text-sm gap-2 bg-none border-2 border-emerald-500 hover:bg-emerald-500 hover:text-white px-4 py-2 rounded-lg transition-colors duration-200 active:scale-105 cursor-pointer"
                                        >
                                            <Download className="w-4 h-4" />
                                            Download (Excel)
                                        </button>
                                    </div>

                                    {/* Results Table - Scrollable */}
                                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex-1 min-h-0 flex flex-col">
                                        <div className="bg-soft-blue/60 px-4 py-2 text-center flex-shrink-0">
                                            <h3 className="text-base font-semibold text-gray-800">Kumpulan Nilai Siswa</h3>
                                        </div>

                                        <div className="overflow-auto flex-1">
                                            <table className="w-full" id="resultsTable">
                                                <thead className="bg-gray-50 sticky top-0 z-10">
                                                    <tr>
                                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-950 uppercase tracking-wider border-b">
                                                            No
                                                        </th>
                                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-950 uppercase tracking-wider border-b">
                                                            Nama
                                                        </th>
                                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-950 uppercase tracking-wider border-b">
                                                            Jawaban Benar
                                                        </th>
                                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-950 uppercase tracking-wider border-b">
                                                            Jawaban Salah
                                                        </th>
                                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-950 uppercase tracking-wider border-b">
                                                            Nilai
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {(() => {
                                                        // Handle the API response
                                                        let data = [];

                                                        if (Array.isArray(correctionResult)) {
                                                            // If correctionResult is already an array (daftar_nilai)
                                                            data = correctionResult;
                                                        } else if (correctionResult && correctionResult.daftar_nilai && Array.isArray(correctionResult.daftar_nilai)) {
                                                            // If correctionResult has daftar_nilai property
                                                            data = correctionResult.daftar_nilai;
                                                        } else if (correctionResult && typeof correctionResult === 'object') {
                                                            // If correctionResult is a single object, wrap it in array
                                                            data = [correctionResult];
                                                        }

                                                        return data.map((item, index) => (
                                                            <tr key={index} className="hover:bg-blue-custom text-slate-700 hover:text-white">
                                                                <td className="px-4 py-4 whitespace-nowrap text-sm border-b border-b-gray-500 text-center">
                                                                    {index + 1}
                                                                </td>
                                                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium border-b border-b-gray-500 text-center">
                                                                    {item.nama || item.siswa || 'Tidak tersedia'}
                                                                </td>
                                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-center border-b border-b-gray-500">
                                                                    {item.benar || item.correct || 0}
                                                                </td>
                                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-center border-b border-b-gray-500">
                                                                    {item.salah || item.wrong || 0}
                                                                </td>
                                                                <td className="px-4 py-4 whitespace-nowrap text-center border-b">
                                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getScoreColor(item.nilai || item.score || 0, true)}`}>
                                                                        {item.nilai || item.score || 0}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ));
                                                    })()}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}

export default CorrectionPage;