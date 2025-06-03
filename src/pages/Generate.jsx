import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Youtube, File, X, HelpCircle, Download, ArrowLeft, Copy } from 'lucide-react';
import axios from 'axios';
import jsPDF from 'jspdf';
import { toast } from 'react-toastify';
import { useGenerate } from '../contexts/GenerateContext';

const Tooltip = ({ children, content }) => {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div className="relative inline-block">
            <div
                onMouseEnter={() => setIsVisible(true)}
                onMouseLeave={() => setIsVisible(false)}
            >
                {children}
            </div>
            {isVisible && (
                <div className="absolute z-50 px-3 py-1 text-xs md:text-sm text-white bg-gray-700 rounded-lg shadow-lg -top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                    {content}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                </div>
            )}
        </div>
    );
};

const GeneratePage = () => {
    const [materialType, setMaterialType] = useState('file');
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [subject, setSubject] = useState('');
    const [generatedSubject, setGeneratedSubject] = useState('');
    const [questionLevel, setQuestionLevel] = useState('');
    const [questionType, setQuestionType] = useState('pg');
    const [questionCount, setQuestionCount] = useState();
    const [dragActive, setDragActive] = useState(false);
    const [showNotification, setShowNotification] = useState(false);
    const fileInputRef = useRef(null);
    const navigate = useNavigate();
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [savedContent, setSavedContent] = useState(null);
    const STORAGE_KEY = 'generated_content_cache';

    const {
        isGenerating,
        generatedContent,
        error,
        handleGenerate,
        setGeneratedContent
    } = useGenerate();

    // Function to handle generate button click
    const onGenerate = async () => {
        const success = await handleGenerate({
            subject,
            questionType,
            questionLevel,
            materialType,
            youtubeUrl,
            uploadedFiles,
            questionCount,
        });

        if (success) {
            setSubject('');
            setQuestionType('');
            setQuestionLevel('');
            setYoutubeUrl('');
            setUploadedFiles([]);
            setMaterialType('file');
            setQuestionCount();
        }
    };

    // Load saved content on component mount
    useEffect(() => {
        const loadSavedContent = () => {
            try {
                const saved = localStorage.getItem(STORAGE_KEY);
                if (saved) {
                    const parsedContent = JSON.parse(saved);

                    // Validasi usia data (misalnya 12 jam)
                    const expiredAt = new Date(parsedContent.timestamp);
                    expiredAt.setHours(expiredAt.getHours() + 12);
                    const now = new Date();

                    if (now > expiredAt) {
                        localStorage.removeItem(STORAGE_KEY);
                        return;
                    }

                    setSavedContent(parsedContent);

                    // Tampilkan notifikasi
                    setShowNotification(true);

                    // Sembunyikan notifikasi setelah 2 detik
                    setTimeout(() => {
                        setShowNotification(false);
                    }, 2000);
                }
            } catch (error) {
                console.error('Error loading saved content:', error);
                localStorage.removeItem(STORAGE_KEY);
            }
        };

        loadSavedContent();
    }, []);

    // Save data to localStorage when generatedContent changes
    useEffect(() => {
        if (generatedContent) {
            try {
                const dataToSave = {
                    content: generatedContent,
                    timestamp: new Date().toISOString(),
                    version: '1.0'
                };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
                setSavedContent(dataToSave);
            } catch (error) {
                console.error('Error saving content:', error);
                // Jika localStorage penuh, coba hapus data lama
                try {
                    localStorage.removeItem(STORAGE_KEY);
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
                    setSavedContent(dataToSave);
                } catch (retryError) {
                    console.error('Failed to save content after cleanup:', retryError);
                }
            }
        }
    }, [generatedContent]);

    // Show success message when generation completes
    useEffect(() => {
        if (generatedContent && !isGenerating) {
            setShowSuccessMessage(true);
            const timer = setTimeout(() => {
                setShowSuccessMessage(false);
            }, 2000);

            return () => clearTimeout(timer);
        }
    }, [generatedContent, isGenerating]);

    // Computed property untuk menentukan content mana yang ditampilkan
    const currentContent = generatedContent || savedContent?.content;

    // Function untuk menghapus memory
    const handleClearMemory = () => {
        try {
            // Hapus dari localStorage
            localStorage.removeItem(STORAGE_KEY);

            // Reset state
            setSavedContent(null);
            setGeneratedContent(null);
            setShowSuccessMessage(false);

            toast.info('Soal berhasil dihapus');

        } catch (error) {
            toast.warn('Error clearing memory:', error);
        }
    };

    // Function helper untuk mengecek apakah ada data tersimpan
    const hasStoredData = () => {
        return savedContent !== null || generatedContent !== null;
    };

    // Function helper untuk mendapatkan info terakhir disimpan
    const getLastSavedInfo = () => {
        if (savedContent?.timestamp) {
            return new Date(savedContent.timestamp).toLocaleString('id-ID');
        }
        return null;
    };

    const handleDownloadPDF = async (type) => {
        setIsDownloading(true);

        try {
            // Validasi apakah data soal masih tersedia
            const soalData = generatedContent?.oogiv_response?.soal;
            const metadata = JSON.parse(localStorage.getItem('generateMetadata') || '{}');
            const safeSubject = metadata.subject?.trim() || "default";

            if (!soalData || !Array.isArray(soalData) || soalData.length === 0) {
                toast.warn('Data soal tidak tersedia atau sudah kedaluwarsa. Silakan buat soal ulang.', {
                    className: 'text-sm',
                });
                return;
            }

            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            if (type === 'questions') {
                // === GENERATE SOAL ===
                const title = `SOAL ${safeSubject.toUpperCase()}`;

                // Judul center dan bold
                doc.setFontSize(14);
                doc.setFont("helvetica", "bold");
                const textWidth = doc.getTextWidth(title);
                const xCenter = (pageWidth - textWidth) / 2;
                doc.text(title, xCenter, 30);

                let yPosition = 50;
                doc.setFont("helvetica", "normal");
                doc.setFontSize(12);

                soalData.forEach((item, index) => {
                    // Validasi setiap item soal
                    if (!item || !item.pertanyaan || !item["no soal"]) {
                        console.warn(`Soal ${index + 1} tidak valid, dilewati`);
                        return;
                    }

                    // Cek apakah butuh halaman baru
                    if (yPosition > pageHeight - 60) {
                        doc.addPage();
                        yPosition = 30;
                    }

                    // === Nomor dan Pertanyaan ===
                    const questionText = `${item["no soal"]}. ${item.pertanyaan}`;
                    const wrappedQuestion = doc.splitTextToSize(questionText, 170);

                    doc.text(wrappedQuestion, 20, yPosition);
                    yPosition += wrappedQuestion.length * 7 + 5;

                    // === Opsi Jawaban ===
                    if (Array.isArray(item.opsi)) {
                        item.opsi.forEach((opsi) => {
                            // Cek apakah butuh halaman baru
                            if (yPosition > pageHeight - 30) {
                                doc.addPage();
                                yPosition = 30;
                            }

                            const wrappedOption = doc.splitTextToSize(opsi, 165);
                            doc.text(wrappedOption, 25, yPosition);
                            yPosition += wrappedOption.length * 6 + 2;
                        });
                    }

                    yPosition += 8; // Spasi antar soal
                });

                doc.save(`Soal ${safeSubject}.pdf`);

            } else if (type === 'answers') {
                // === GENERATE KUNCI JAWABAN ===
                const title = `JAWABAN SOAL ${safeSubject.toUpperCase()}`;

                // Judul center dan bold
                doc.setFontSize(14);
                doc.setFont("helvetica", "bold");
                const textWidth = doc.getTextWidth(title);
                const xCenter = (pageWidth - textWidth) / 2;
                doc.text(title, xCenter, 30);

                let yPosition = 50;
                doc.setFont("helvetica", "normal");
                doc.setFontSize(12);

                soalData.forEach((item) => {
                    // Validasi setiap item jawaban
                    if (!item || !item.kunci_jawaban || !item["no soal"]) {
                        console.warn(`Jawaban untuk soal ${item?.["no soal"] || 'unknown'} tidak valid, dilewati`);
                        return;
                    }

                    // Cek apakah butuh halaman baru
                    if (yPosition > pageHeight - 40) {
                        doc.addPage();
                        yPosition = 50;
                    }

                    // Format: (nomor soal dan jawaban)
                    const answerText = `${item["no soal"]}. ${item.kunci_jawaban}`;
                    const wrappedAnswer = doc.splitTextToSize(answerText, 165);
                    doc.text(wrappedAnswer, 25, yPosition);
                    yPosition += wrappedAnswer.length * 6 + 2;
                });

                doc.save(`Jawaban Soal ${safeSubject}.pdf`);
            }

        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Terjadi kesalahan saat membuat PDF. Silakan coba lagi.');
        } finally {
            setIsDownloading(false);
        }
    };

    const materialOptions = [
        { value: 'file', label: 'Upload File', icon: <File className="hidden md:block w-4 h-4 text-blue-custom" /> },
        { value: 'youtube', label: 'URL YouTube', icon: <Youtube className="hidden md:block w-4 h-4 text-red-custom" /> }
    ];

    const questionTypes = [
        { value: 'PG', label: 'Pilihan Ganda' },
        { value: 'Essay', label: 'Essay' },
    ];

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFiles(e.dataTransfer.files);
        }
    };

    const handleFiles = (files) => {
        const MAX_TOTAL_SIZE = 5 * 1024 * 1024; // 5MB
        const validTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain'
        ];

        const incomingFiles = Array.from(files).filter(file => validTypes.includes(file.type));

        // Hitung total size gabungan file lama + file baru
        const currentSize = uploadedFiles.reduce((sum, f) => sum + f.size, 0);
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
            setUploadedFiles(prev => [...prev, ...accepted]);
        }

        if (rejected) {
            toast.warn(`File "${rejected}" ditolak karena upload size melebihi batas total 5MB.`, {
                autoClose: 2000,
                className: 'text-xs',
            });
        }
    };

    const removeFile = (index) => {
        setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const isFormValid = () => {
        if (!materialType) return false;
        if (materialType === 'youtube' && !youtubeUrl.trim()) return false;
        if (materialType === 'file' && uploadedFiles.length === 0) return false;
        if (!subject.trim()) return false;
        if (!questionType) return false;
        if (!questionLevel) return false;
        if (!questionCount || questionCount <= 0 || questionCount > 50) return false;
        return true;
    };

    const handleBack = () => {
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <header className="bg-white shadow-md sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-0 py-4 select-none">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center lg:-ml-6">
                            <button
                                onClick={handleBack}
                                className="p-2 hover:bg-red-custom rounded-lg transition-colors duration-200 cursor-pointer text-slate-800 hover:text-white"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 text-center">
                            <h1 className="text-xl md:text-2xl font-semibold text-gray-900 mb-2">Buat Soal</h1>
                            <p className="text-xs md:text-sm mx-3 text-gray-700 font-medium">OOGIV siap untuk hasilkan soal beserta kunci jawaban yang siap unduh.</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8 select-none">
                <div className="grid grid-cols-1 lg:grid-cols-6 gap-8">
                    {/* Form Section - 40% */}
                    <div className="lg:col-span-2">
                        <div className="rounded-2xl bg-white shadow-lg border border-gray-200 p-6 sm:p-8">
                            <div className="space-y-8">
                                {/* Material Type Selection */}
                                <div>
                                    <label className="flex items-center space-x-2 text-lg font-semibold text-gray-800 mb-4">
                                        <span className='text-[1rem]'>Pilih Sumber Materi</span>
                                        <Tooltip content="Pilih sumber materi yang akan digunakan untuk membuat soal">
                                            <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                                        </Tooltip>
                                    </label>
                                    <div className="space-x-2 flex flex-row select-none">
                                        {materialOptions.map((option) => (
                                            <label
                                                key={option.value}
                                                className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${materialType === option.value
                                                    ? 'border-soft-blue bg-blue-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="materialType"
                                                    value={option.value}
                                                    checked={materialType === option.value}
                                                    onChange={(e) => {
                                                        const selectedValue = e.target.value;

                                                        if (selectedValue === 'youtube') {
                                                            toast.info('Opsi YouTube belum tersedia!');
                                                            return;
                                                        }

                                                        setMaterialType(selectedValue);
                                                    }}
                                                    className="sr-only"
                                                />
                                                <div className="flex items-center space-x-2 md:space-x-3">
                                                    <div
                                                        className={`w-4 h-4 md:w-5 md:h-5 rounded-full border-2 flex items-center justify-center ${materialType === option.value ? 'border-soft-blue' : 'border-gray-300'
                                                            }`}
                                                    >
                                                        {materialType === option.value && (
                                                            <div className="w-3 h-3 md:w-3 md:h-3 rounded-full bg-soft-blue"></div>
                                                        )}
                                                    </div>
                                                    {option.icon}
                                                    <span className="font-medium text-xs text-gray-700">{option.label}</span>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* YouTube URL Input */}
                                {materialType === 'youtube' && (
                                    <div className="animate-in slide-in-from-top-2 duration-300">
                                        <label className="block text-sm font-medium text-gray-700 mb-3">
                                            Link Video YouTube
                                        </label>
                                        <div className="relative">
                                            <Youtube className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-red-custom" />
                                            <input
                                                type="url"
                                                value={youtubeUrl}
                                                onChange={(e) => setYoutubeUrl(e.target.value)}
                                                placeholder="https://youtu.be/xxxxx"
                                                className="text-[0.8rem] w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-950/90 focus:border-transparent outline-none transition-all duration-200"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* File Upload */}
                                {materialType === 'file' && (
                                    <div className="animate-in slide-in-from-top-2 duration-300">
                                        <label className="block text-sm font-medium text-gray-700 mb-3">
                                            Upload File Materi
                                        </label>
                                        <div
                                            className={`relative border-2 border-dashed h-auto rounded-xl p-6 transition-all duration-200 ${dragActive
                                                ? 'border-blue-400 bg-blue-50'
                                                : 'border-gray-400 hover:border-gray-600'
                                                }`}
                                            onDragEnter={handleDrag}
                                            onDragLeave={handleDrag}
                                            onDragOver={handleDrag}
                                            onDrop={handleDrop}
                                        >
                                            <div className="text-center">
                                                <Upload className="mx-auto h-8 w-12 text-gray-400 mb-4" />
                                                <p className="text-md font-medium text-gray-700 mb-2">
                                                    Drag and drop files here
                                                </p>
                                                <p className="text-[0.8rem] text-gray-500 mb-4">
                                                    Limit 5MB per upload • PDF, DOCX, PPTX, TXT
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="text-[0.8rem] px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors duration-200 cursor-pointer"
                                                >
                                                    Browse files
                                                </button>
                                            </div>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                multiple
                                                accept=".pdf,.docx,.pptx,.txt"
                                                onChange={(e) => handleFiles(e.target.files)}
                                                className="hidden"
                                            />
                                        </div>

                                        {/* Uploaded Files */}
                                        {uploadedFiles.length > 0 && (
                                            <div className="mt-4 space-y-2">
                                                <div className="max-h-32 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                                    {uploadedFiles.map((file, index) => (
                                                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                                            <div className="flex items-center space-x-3">
                                                                <File className="w-5 h-5 text-blue-500" />
                                                                <span className="text-sm font-medium text-gray-700 truncate">
                                                                    {file.name}
                                                                </span>
                                                                <span className="text-xs text-gray-500">
                                                                    ({(file.size / 1024 / 1024).toFixed(1)} MB)
                                                                </span>
                                                            </div>
                                                            <button
                                                                onClick={() => removeFile(index)}
                                                                className="text-red-500 hover:text-red-700 transition-colors duration-200 cursor-pointer"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex sm:flex-col lg:flex-row gap-x-2 gap-y-3">
                                    {/* Subject Input */}
                                    <div>
                                        <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-3">
                                            <span>Pelajaran</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={subject}
                                            onChange={(e) => setSubject(e.target.value)}
                                            placeholder="Matematika, IPA"
                                            className="text-[0.8rem] w-full px-4 py-4 border border-gray-400 rounded-xl focus:ring-2 focus:ring-slate-950/90 focus:border-transparent outline-none transition-all duration-200"
                                        />
                                    </div>

                                    <div>
                                        <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-3">
                                            <span>Level</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={questionLevel}
                                            onChange={(e) => setQuestionLevel(e.target.value)}
                                            placeholder="SD , SMP, SMA"
                                            className="text-[0.8rem] w-full px-4 py-4 border border-gray-400 rounded-xl focus:ring-2 focus:ring-slate-950/90 focus:border-transparent outline-none transition-all duration-200"
                                        />
                                    </div>
                                </div>

                                {/* Question Type and Count */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 cursor-pointer">
                                    <div>
                                        <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-3">
                                            <span>Tipe Soal</span>
                                        </label>
                                        <select
                                            value={questionType}
                                            onChange={(e) => setQuestionType(e.target.value)}
                                            className="text-[0.8rem] w-full px-4 py-4 border border-gray-400 rounded-xl focus:ring-2 focus:ring-slate-950/90 focus:border-transparent outline-none transition-all duration-200 bg-white"
                                        >
                                            {questionTypes.map((type) => (
                                                <option key={type.value} value={type.value}>
                                                    {type.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="flex items-center text-sm font-medium text-gray-700 mb-3">
                                            <span>Jumlah Soal</span>
                                        </label>
                                        <div className="flex items-center space-x-3">
                                            <input
                                                type="number"
                                                min="1"
                                                max="50"
                                                placeholder='Maks 50 soal'
                                                value={questionCount}
                                                onChange={(e) => setQuestionCount(Math.max(1, parseInt(e.target.value) || 1))}
                                                className="cursor-pointer text-sm h-[3.34rem] flex-1 px-4 py-3 border border-gray-400 rounded-xl focus:ring-2 focus:ring-slate-950/90 focus:border-transparent outline-none transition-all duration-200"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Generate Button */}
                                <button
                                    onClick={onGenerate}
                                    disabled={isGenerating}
                                    className={`w-full py-4 px-6 rounded-xl font-semibold text-slate-950/70 hover:text-white transition-all duration-400 cursor-pointer ${!isGenerating
                                        ? 'bg-slate-100 outline-2 outline-soft-blue hover:bg-soft-blue shadow-lg hover:shadow-xl transform hover:scale-[1.02]'
                                        : 'bg-gray-400 cursor-not-allowed'
                                        }`}
                                >
                                    {isGenerating ? (
                                        <div className="flex items-center justify-center space-x-3">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                            <span className='text-white'>Generating...</span>
                                        </div>
                                    ) : (
                                        'Buat Soal'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Results Container */}
                    <div className="lg:col-span-4">
                        <div className="rounded-2xl shadow-lg border border-gray-200 p-6 sticky top-24 bg-white">
                            {/* Header dengan tombol Hapus Memory */}
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[1rem] font-semibold text-gray-800">Hasil Generate</h3>
                                {(generatedContent || savedContent) && (
                                    <button
                                        onClick={handleClearMemory}
                                        className="flex items-center space-x-2 px-3 py-2 text-sm text-white hover:text-white hover:bg-pink-600 rounded-lg transition-colors duration-200 cursor-pointer bg-red-custom active:scale-105"
                                        title="Hapus Cache"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        <span>Hapus Cache</span>
                                    </button>
                                )}
                            </div>

                            {error && (
                                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                                            <span className="text-white text-xs">!</span>
                                        </div>
                                        <p className="text-red-700 text-sm font-medium">Error</p>
                                    </div>
                                    <p className="text-red-600 text-sm mt-2">{error}</p>
                                </div>
                            )}

                            {isGenerating && (
                                <div className="text-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                                    <p className="text-gray-600 text-sm">
                                        Sedang memproses permintaan Anda...
                                    </p>
                                    <p className="text-gray-500 text-xs mt-2">
                                        Proses ini mungkin memakan waktu beberapa menit
                                    </p>
                                </div>
                            )}

                            {!currentContent && !isGenerating && !error && (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <File className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <p className="text-gray-500 text-sm">
                                        Soal dan jawaban akan muncul di sini setelah di-generate
                                    </p>
                                </div>
                            )}

                            {currentContent && !isGenerating && (
                                <div className="space-y-4">
                                    {/* Success message with auto-hide */}
                                    {showSuccessMessage && (
                                        <div className="p-4 bg-green-50 border border-green-200 rounded-xl transition-opacity duration-300">
                                            <div className="flex items-center space-x-2 mb-2">
                                                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                                    <span className="text-white text-xs">✓</span>
                                                </div>
                                                <p className="text-green-700 text-sm font-medium">Berhasil!</p>
                                            </div>
                                            <p className="text-green-600 text-sm">
                                                Soal berhasil dibuat. Anda dapat mengunduh file di bawah ini.
                                            </p>
                                        </div>
                                    )}

                                    {/* Indicator jika data dari memory */}
                                    {savedContent && !generatedContent && (
                                        <div
                                            className={`mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg transition-opacity duration-500 ${showNotification ? 'opacity-100' : 'opacity-0 pointer-events-none'
                                                }`}
                                            style={{ display: showNotification ? 'block' : 'none' }}
                                        >
                                            <div className="flex items-center space-x-2">
                                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <p className="text-blue-700 text-sm font-medium">Data dimuat dari memory</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Content preview */}
                                    <div className="relative group p-4 rounded-xl bg-gray-100 border border-gray-200 h-auto overflow-y-auto max-h-105">
                                        {/* Tombol Copy muncul saat hover */}
                                        <div className="flex flow-row justify-center items-center font-medium absolute top-3 right-3 transition-opacity duration-300 px-3 py-1 bg-blue-custom text-white text-xs rounded hover:bg-sky-500 active:scale-105">
                                            <Copy className='w-3 h-3 mr-1' />
                                            <button
                                                className="ml-0.5"
                                                onClick={() => {
                                                    const textToCopy = currentContent?.oogiv_response?.soal?.map((item) => {
                                                        const opsiText = item.opsi ? item.opsi.join('\n') : '';
                                                        return `${item["no soal"]}. ${item.pertanyaan}\n${opsiText}\nJawaban: ${item.kunci_jawaban}`;
                                                    }).join('\n\n');
                                                    navigator.clipboard.writeText(textToCopy || '');
                                                    toast.success('Soal berhasil disalin!');
                                                }}
                                            >
                                                Salin
                                            </button>
                                        </div>
                                        <h4 className="font-medium text-gray-800 mb-2">Preview Hasil:</h4>
                                        <div className="text-sm text-gray-600 whitespace-pre-wrap font-mono space-y-4 select-text">
                                            {Array.isArray(currentContent?.oogiv_response?.soal) ? (
                                                currentContent.oogiv_response.soal.map((item, index) => (
                                                    <div key={index}>
                                                        <div className='text-slate-950'>{item["no soal"]}. {item.pertanyaan}</div>

                                                        {/* Jika soal PG */}
                                                        {Array.isArray(item.opsi) && (
                                                            <div className="">
                                                                {item.opsi.map((opsi, i) => (
                                                                    <div key={i}>{opsi}</div>
                                                                ))}
                                                            </div>
                                                        )}
                                                        <div className="text-green-600 mt-1">Jawaban: <span className='text-slate-800'>{item.kunci_jawaban}</span></div>

                                                        {/* Jika soal Essay (tanpa opsi) */}
                                                        {!item.opsi}
                                                    </div>
                                                ))
                                            ) : (
                                                <pre>
                                                    {typeof currentContent === 'string'
                                                        ? currentContent
                                                        : JSON.stringify(currentContent, null, 2)}
                                                </pre>
                                            )}
                                        </div>
                                    </div>

                                    {/* Download buttons */}
                                    <div className="flex flex-wrap gap-4">
                                        <div className="flex-1 min-w-[250px] p-4 bg-blue-50 rounded-xl border border-soft-blue">
                                            <h4 className="font-medium text-sky-500 mb-2">Unduh Soal</h4>
                                            <button
                                                onClick={() => handleDownloadPDF('questions')}
                                                disabled={isDownloading}
                                                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-sky-500 hover:bg-sky-700 text-white rounded-lg transition-colors duration-200 cursor-pointer"
                                            >
                                                <Download className="w-4 h-4" />
                                                <span>{isDownloading ? 'Mengunduh...' : 'Soal (PDF)'}</span>
                                            </button>
                                        </div>

                                        <div className="flex-1 min-w-[250px] p-4 bg-green-50 rounded-xl border border-emerald-500">
                                            <h4 className="font-medium text-emerald-500 mb-2">Unduh Jawaban</h4>
                                            <button
                                                onClick={() => handleDownloadPDF('answers')}
                                                disabled={isDownloading}
                                                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-700 text-white rounded-lg transition-colors duration-200 cursor-pointer"
                                            >
                                                <Download className="w-4 h-4" />
                                                <span>{isDownloading ? 'Mengunduh...' : 'Jawaban (PDF)'}</span>
                                            </button>
                                        </div>
                                    </div>

                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GeneratePage;