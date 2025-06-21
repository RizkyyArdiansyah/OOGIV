import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, File, ArrowLeft, CheckCircle, AlertCircle, Trophy, BookOpen, Download, FileKey, UsersRound, Key, Users, BarChart3 } from 'lucide-react';
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

    const { isCorrecting, correctionResult, error, submitCorrection, resetCorrection, correctionStats, currentStep, setCurrentStep, correctionComplete, setResetFilesCallback } = useCorrectionContext();

    // Function to reset all file inputs
    const resetFileInputs = () => {
        setCurrentStep(0);
        setKeyFiles([]);
        setStudentFiles([]);
        setKeyDragActive(false);
        setStudentDragActive(false);

        // Clear file input values
        if (keyFileInputRef.current) {
            keyFileInputRef.current.value = '';
        }
        if (studentFileInputRef.current) {
            studentFileInputRef.current.value = '';
        }
    };

    // Register the reset callback with the context
    useEffect(() => {
        setResetFilesCallback(() => resetFileInputs);

        // Cleanup function to remove the callback when component unmounts
        return () => {
            setResetFilesCallback(null);
        };
    }, [setResetFilesCallback]);

    // Progress steps definition
    const progressSteps = [
        {
            id: 0,
            title: 'Upload Kunci Jawaban',
            icon: FileKey
        },
        {
            id: 1,
            title: 'Upload Jawaban Siswa',
            icon: UsersRound
        },
        {
            id: 2,
            title: 'Lihat Hasil Penilaian Siswa',
            icon: BarChart3
        }
    ];

    // Calculate progress percentage
    const progressPercentage = currentStep === 0 ? 0 : currentStep === 1 ? 50 :

        // Untuk data individual siswa
        correctionStats?.students.map(siswa => ({
            nama: siswa.nama,
            jumlah_benar: siswa.jumlah_benar,
            jumlah_salah: siswa.jumlah_salah,
            nilai: siswa.nilai
        }))

    // Untuk statistik keseluruhan
    const totalSiswa = correctionStats?.totalSiswa;
    const nilaiRataRata = correctionStats?.nilaiRataRata;
    const nilaiTertinggi = correctionStats?.nilaiTertinggi;

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
        setKeyFiles(prev => [...prev, ...fileArray]);

        setCurrentStep(1);

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
            toast.error(`File "${rejected}" ditolak karena upload size melebihi batas total 5MB.`);
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
            // Check if correctionStats exists and has students data
            if (!correctionStats || !correctionStats.students || correctionStats.students.length === 0) {
                toast.error('Tidak ada data untuk didownload!');
                return;
            }

            // Create workbook
            const wb = XLSX.utils.book_new();

            // Prepare main data for Excel
            const excelData = [
                ['No', 'Nama', 'Jawaban Benar', 'Jawaban Salah', 'Nilai'], // Header
                ...correctionStats.students.map((siswa, index) => [
                    index + 1,
                    siswa.nama,
                    siswa.jumlah_benar,
                    siswa.jumlah_salah,
                    siswa.nilai
                ])
            ];

            // Add summary statistics at the end
            excelData.push(
                [], // Empty row
                ['Statistik Penilaian'], // Summary header
                ['Total Siswa', correctionStats.totalSiswa],
                ['Nilai Rata-rata', correctionStats.nilaiRataRata],
                ['Nilai Tertinggi', correctionStats.nilaiTertinggi]
            );

            // Create worksheet
            const ws = XLSX.utils.aoa_to_sheet(excelData);

            // Set column widths
            ws['!cols'] = [
                { wch: 5 },  // No
                { wch: 20 }, // Nama
                { wch: 10 }, // Jawaban Benar
                { wch: 10 }, // Jawaban Salah
                { wch: 10 }  // Nilai
            ];

            // Style the main header row
            const headerStyle = {
                font: { bold: true },
                fill: { fgColor: { rgb: "3B82F6" } }, // Blue background
                alignment: { horizontal: "center", vertical: "center" },
            };

            // Style for summary section
            const summaryHeaderStyle = {
                font: { bold: true },
                fill: { fgColor: { rgb: "10B981" } }, // Green background
                alignment: { horizontal: "center", vertical: "center" },
            };

            // Apply main header style (Row 1)
            ['A1', 'B1', 'C1', 'D1', 'E1'].forEach(cell => {
                if (ws[cell]) {
                    ws[cell].s = headerStyle;
                }
            });

            // Calculate the row for summary section
            const summaryStartRow = correctionStats.students.length + 3; // +1 for header, +1 for empty row, +1 for summary header

            // Apply summary header style
            const summaryHeaderCell = `A${summaryStartRow}`;
            if (ws[summaryHeaderCell]) {
                ws[summaryHeaderCell].s = summaryHeaderStyle;
            }

            // Style for summary data rows
            const summaryDataStyle = {
                font: { bold: true },
                fill: { fgColor: { rgb: "F3F4F6" } }, // Light gray background
                alignment: { horizontal: "left", vertical: "center" }
            };

            // Apply summary data style
            for (let i = 1; i <= 3; i++) {
                const rowNum = summaryStartRow + i;
                ['A', 'B'].forEach(col => {
                    const cell = `${col}${rowNum}`;
                    if (ws[cell]) {
                        ws[cell].s = summaryDataStyle;
                    }
                });
            }

            // Add borders to all cells with data
            const totalRows = excelData.length;
            const borderStyle = {
                border: {
                    top: { style: "thin", color: { rgb: "000000" } },
                    bottom: { style: "thin", color: { rgb: "000000" } },
                    left: { style: "thin", color: { rgb: "000000" } },
                    right: { style: "thin", color: { rgb: "000000" } }
                }
            };

            // Apply borders to main data table
            for (let row = 1; row <= correctionStats.students.length + 1; row++) {
                ['A', 'B', 'C', 'D', 'E'].forEach(col => {
                    const cell = `${col}${row}`;
                    if (ws[cell]) {
                        ws[cell].s = { ...ws[cell].s, ...borderStyle };
                    }
                });
            }

            // Add worksheet to workbook
            XLSX.utils.book_append_sheet(wb, ws, 'Hasil Koreksi');

            // Generate filename with current date and time
            const now = new Date();
            const filename = `Hasil_Koreksi_${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}.xlsx`;

            // Download the file
            XLSX.writeFile(wb, filename);

            // Show success message
            toast.success(`File Excel berhasil didownload: ${filename}`);

        } catch (error) {
            console.error('Download Excel error:', error);
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
                    <div className="w-full md:w-[50%] 2xl:w-1/3">
                        <div className="rounded-2xl bg-white shadow-lg p-5 sm:p-4 lg:p-6 border-t-sky-300 border-t-6">
                            <div className="space-y-4 sm:space-y-5">
                                {/* Progress Bar */}
                                <div className="mb-2 rounded-2xl py-4 px-2">
                                    <div className="relative flex items-center justify-between mb-2 gap-12">
                                        {/* Progress Line Background */}
                                        <div className="absolute top-6 left-6 right-6 h-1 bg-gray-200 rounded-full -translate-y-1/2 z-0"></div>

                                        {/* Progress Line Active */}
                                        <div
                                            className="absolute top-6 left-6 h-1 bg-emerald-500 rounded-full -translate-y-1/2 transition-all duration-500 ease-out z-0"
                                            style={{
                                                width: correctionComplete
                                                    ? `calc(100% - 3rem)`
                                                    : `calc(${progressPercentage}% - 3rem)`
                                            }}
                                        ></div>

                                        {progressSteps.map((step, index) => {
                                            const StepIcon = step.icon;
                                            const isActive = index <= currentStep;
                                            const isCompleted = index < currentStep;
                                            // Only show final step as active if correction is complete
                                            const isFinalStepActive = index === 2 && correctionComplete;

                                            return (
                                                <div key={step.id} className="flex flex-col items-center flex-1 relative z-10">
                                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all duration-300 ${isFinalStepActive || (isActive && index !== 2)
                                                        ? 'bg-gradient-to-r from-teal-500 via-cyan-400 to-green-500 text-white shadow-lg'
                                                        : 'bg-gray-200 text-gray-400'
                                                        }`}>
                                                        <StepIcon className="w-6 h-6" />
                                                    </div>
                                                    <h3 className={`text-xs font-semibold text-center ${isFinalStepActive || (isActive && index !== 2) ? 'text-gray-800' : 'text-gray-400'
                                                        }`}>
                                                        {step.title}
                                                    </h3>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Step 0: Upload Kunci Jawaban */}
                                {currentStep === 0 && (
                                    <div className="flex flex-col gap-y-3">
                                        <div className="flex gap-2 text-center items-center">
                                            <FileKey className='w-5 h-5' />
                                            <label className='text-md font-medium text-gray-700'>Upload Kunci Jawaban</label>
                                        </div>
                                        <div
                                            className={`relative border-2 border-dashed rounded-xl p-4 transition-all duration-200 ${keyDragActive
                                                ? 'border-blue-400 bg-blue-50'
                                                : 'border-gray-300 hover:border-gray-400'
                                                }`}
                                            onDragEnter={handleKeyDrag}
                                            onDragLeave={handleKeyDrag}
                                            onDragOver={handleKeyDrag}
                                            onDrop={handleKeyDrop}
                                        >
                                            <div className="text-center">
                                                {/* Blue circular upload icon */}
                                                <div className="mx-auto w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mb-3">
                                                    <Upload className="h-5 w-5 text-white" />
                                                </div>

                                                {/* Main heading */}
                                                <h3 className="text-md font-semibold text-gray-900 mb-3">
                                                    Pilih Dokumen
                                                </h3>

                                                {/* Description text */}
                                                <p className="text-sm text-gray-500 mb-3">
                                                    Drag and drop here • limit 5MB per upload
                                                </p>

                                                {/* File type badges */}
                                                <div className="flex justify-center gap-3 mb-3">
                                                    <span className="px-3 py-1.5 bg-blue-100 text-blue-600 text-xs font-medium rounded-lg">
                                                        PDF
                                                    </span>
                                                    <span className="px-3 py-1.5 bg-green-100 text-green-600 text-xs font-medium rounded-lg">
                                                        DOC
                                                    </span>
                                                    <span className="px-3 py-1.5 bg-purple-100 text-purple-600 text-xs font-medium rounded-lg">
                                                        TXT
                                                    </span>
                                                </div>

                                                {/* Browse button (hidden but accessible for click) */}
                                                <button
                                                    type="button"
                                                    onClick={() => keyFileInputRef.current?.click()}
                                                    className="w-full h-full absolute inset-0 opacity-0 cursor-pointer"
                                                    aria-label="Browse files"
                                                />
                                            </div>

                                            <input
                                                ref={keyFileInputRef}
                                                type="file"
                                                multiple
                                                accept=".pdf,.docx,.txt"
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
                                )}

                                {/* Step 1: Upload Jawaban Siswa */}
                                {currentStep === 1 && (
                                    <div className="flex flex-col gap-y-3">
                                        <div className="flex gap-2 text-center items-center">
                                            <UsersRound className='w-5 h-5' />
                                            <label className='text-md font-medium text-gray-700'>Upload Jawaban Siswa</label>
                                        </div>
                                        <div
                                            className={`relative border-2 border-dashed rounded-xl p-4 transition-all duration-200 ${studentDragActive
                                                ? 'border-blue-400 bg-blue-50'
                                                : 'border-gray-300 hover:border-gray-400'
                                                }`}
                                            onDragEnter={handleStudentDrag}
                                            onDragLeave={handleStudentDrag}
                                            onDragOver={handleStudentDrag}
                                            onDrop={handleStudentDrop}
                                        >
                                            <div className="text-center">
                                                {/* Blue circular upload icon */}
                                                <div className="mx-auto w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mb-3">
                                                    <Upload className="h-5 w-5 text-white" />
                                                </div>

                                                {/* Main heading */}
                                                <h3 className="text-md font-semibold text-gray-900 mb-3">
                                                    Pilih Dokumen
                                                </h3>

                                                {/* Description text */}
                                                <p className="text-sm text-gray-500 mb-3">
                                                    Drag and drop here • limit 5MB per upload
                                                </p>

                                                {/* File type badges */}
                                                <div className="flex justify-center gap-3 mb-3">
                                                    <span className="px-3 py-1.5 bg-blue-100 text-blue-600 text-xs font-medium rounded-lg">
                                                        PDF
                                                    </span>
                                                    <span className="px-3 py-1.5 bg-green-100 text-green-600 text-xs font-medium rounded-lg">
                                                        DOC
                                                    </span>
                                                    <span className="px-3 py-1.5 bg-purple-100 text-purple-600 text-xs font-medium rounded-lg">
                                                        TXT
                                                    </span>
                                                </div>

                                                {/* Browse button (hidden but accessible for click) */}
                                                <button
                                                    type="button"
                                                    onClick={() => studentFileInputRef.current?.click()}
                                                    className="w-full h-full absolute inset-0 opacity-0 cursor-pointer"
                                                    aria-label="Browse files"
                                                />
                                            </div>

                                            <input
                                                ref={studentFileInputRef}
                                                type="file"
                                                multiple
                                                accept=".pdf,.docx,.txt"
                                                onChange={(e) => handleStudentFiles(e.target.files)}
                                                className="hidden"
                                            />
                                        </div>

                                        {/* Uploaded Student Files */}
                                        {studentFiles.length > 0 && (
                                            <div className="mt-1 space-y-2">
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

                                        {/* Action Buttons */}
                                        <div className="flex gap-3 mt-2">
                                            {/* Back Button */}
                                            <button
                                                onClick={resetCorrection}
                                                className="flex-1 px-2 py-2 md:py-3 md:px-4 rounded-xl font-semibold transition-all duration-400 bg-gray-100 hover:bg-red-custom text-gray-700 hover:text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] outline-2 outline-red-custom cursor-pointer"
                                            >
                                                <span className="text-sm sm:text-base">Kembali</span>
                                            </button>

                                            {/* Generate Button */}
                                            <button
                                                onClick={onCorrecting}
                                                disabled={isCorrecting || studentFiles.length === 0}
                                                className={`flex-1 px-2 py-2 md:py-3 md:px-4 rounded-xl font-semibold transition-all duration-400 ${isCorrecting || studentFiles.length === 0
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
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Results Container */}
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

                            {correctionResult && correctionStats && (
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
                                                {correctionStats.totalSiswa}
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
                                                {correctionStats.nilaiRataRata}
                                            </p>
                                        </div>

                                        {/* Highest Score */}
                                        <div className="bg-yellow-custom/20 hover:bg-yellow-custom/60 rounded-2xl p-3 text-center cursor-pointer">
                                            <div className="flex justify-center mb-2">
                                                <div className="w-8 h-8 md:w-10 md:h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                                                    <Trophy className="w-5 h-5 text-yellow-600" />
                                                </div>
                                            </div>
                                            <h3 className="text-xs md:text-sm font-medium text-gray-600 mb-1">Nilai Tertinggi</h3>
                                            <p className="text-lg font-bold text-yellow-800">
                                                {correctionStats.nilaiTertinggi}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-x-2">
                                        {/* Download Button */}
                                        <div className="flex justify-end flex-shrink-0">
                                            <button
                                                onClick={downloadExcel}
                                                className="flex items-center text-xs md:text-sm gap-2 bg-gradient-to-tr from-cyan-400 via-sky-400 to-blue-500 hover:shadow-md shadow-soft-blue/30 text-white px-4 py-2 rounded-lg transition-colors duration-200 active:scale-105 cursor-pointer"
                                            >
                                                <Download className="w-4 h-4" />
                                                Download (Excel)
                                            </button>
                                        </div>
                                        <div className="flex justify-end flex-shrink-0">
                                            <button
                                                onClick={resetCorrection}
                                                className="flex items-center text-xs md:text-sm gap-2 hover:shadow-md shadow-soft-blue/30 border-2 border-gray-400 text-black px-4 py-2 rounded-lg transition-colors duration-200 active:scale-105 cursor-pointer"
                                            >
                                                Penilaian Baru
                                            </button>
                                        </div>
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
                                                    {correctionStats.students.map((siswa, index) => (
                                                        <tr key={index} className="hover:bg-blue-custom text-slate-700 hover:text-white">
                                                            <td className="px-4 py-4 whitespace-nowrap text-sm border-b border-b-gray-500 text-center">
                                                                {index + 1}
                                                            </td>
                                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium border-b border-b-gray-500 text-center">
                                                                {siswa.nama}
                                                            </td>
                                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-center border-b border-b-gray-500">
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                                    {siswa.jumlah_benar}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-center border-b border-b-gray-500">
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                                    {siswa.jumlah_salah}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-4 whitespace-nowrap text-center border-b">
                                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getScoreColor(siswa.nilai, true)}`}>
                                                                    {siswa.nilai}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
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