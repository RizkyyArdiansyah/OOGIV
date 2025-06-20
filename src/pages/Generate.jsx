import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Youtube, File, X, Download, ArrowLeft, Copy, Sparkles, Link, Info} from 'lucide-react';
import jsPDF from 'jspdf';
import { toast } from 'react-toastify';
import { useGenerate } from '../contexts/GenerateContext';

const GeneratePage = () => {
    const [materialType, setMaterialType] = useState('file');
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [subject, setSubject] = useState('');
    const [questionLevel, setQuestionLevel] = useState('easy');
    const [questionType, setQuestionType] = useState('pg');
    const [questionCount, setQuestionCount] = useState('');
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
            setQuestionType('pg');
            setQuestionLevel('easy');
            setYoutubeUrl('');
            setUploadedFiles([]);
            setMaterialType('file');
            setQuestionCount('');
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

            toast.success('Soal berhasil dihapus');

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
                    yPosition += wrappedQuestion.length * 4 + 5;

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

                    yPosition += 6; // Spasi antar soal
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
        {
            value: 'file',
            icon: Upload,
            title: 'Upload Document',
            description: 'PDF, DOC, TXT files'
        },
        {
            value: 'youtube',
            icon: Link,
            title: 'YouTube URL',
            description: 'Video transcript analysis'
        }
    ];

    const questionLevels = [
        { value: 'Easy', label: 'Mudah' },
        { value: 'Medium', label: 'Sedang' },
        { value: 'Hard', label: 'Sulit' },
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
                <div className="w-auto sm:mx-0 md:mx-4 lg:mx-4 py-4 select-none relative">
                    <div className="flex items-center justify-center">
                        <button
                            onClick={handleBack}
                            className="absolute left-4 sm:left-6 lg:left-0 p-2 hover:bg-red-custom rounded-lg transition-colors duration-200 cursor-pointer text-slate-800 hover:text-white"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="text-center">
                            <h1 className="text-xl md:text-2xl font-semibold text-gray-900 lg:mb-2">Buat Soal</h1>
                            <p className="hidden lg:block text-xs md:text-sm mx-3 text-gray-700 font-medium">OOGIV siap untuk hasilkan soal beserta kunci jawaban yang siap unduh.</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="w-full max-w-full mx-auto px-5 md:px-10 lg:px-6 xl:px-8 py-4 select-none">
                <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 xl:gap-8">
                    {/* Form Section - Responsive width */}
                    <div className="w-full lg:w-2/5 2xl:w-1/3">
                        <div className="rounded-2xl bg-white shadow-lg border-t-6 border-t-red-custom p-5 sm:p-4 lg:p-6">
                            <div className="space-y-4 md:space-y-6 lg:space-y-6">
                                {/* Material Type Selection */}
                                <div>
                                    <label className="flex items-center space-x-2 text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">
                                        <span className='text-sm sm:text-base'>Pilih Sumber Materi</span>
                                    </label>
                                    <div className="grid grid-cols-2 gap-4">
                                        {materialOptions.map((option) => (
                                            <label
                                                key={option.value}
                                                className={`relative flex flex-col items-center px-3 py-4 md:py-8 border-2 rounded-2xl cursor-pointer transition-all duration-200 bg-white hover:shadow-md ${materialType === option.value
                                                    ? 'border-blue-600 bg-blue-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="materialType"
                                                    value={option.value}
                                                    checked={materialType === option.value}
                                                    onChange={(e) => setMaterialType(e.target.value)}
                                                    className="sr-only"
                                                />

                                                <div className={`w-8 h-8 md:w-12 md:h-12 rounded-lg flex items-center justify-center mb-4 transition-colors duration-200 ${materialType === option.value
                                                    ? 'bg-blue-600'
                                                    : 'bg-gray-400'
                                                    }`}>
                                                    <option.icon className="w-4 h-4 md:w-6 md:h-6 text-white" />
                                                </div>

                                                <h3 className="text-xs md:text-sm font-semibold text-gray-800 mb-2 text-center">
                                                    {option.title}
                                                </h3>

                                                <p className="text-[0.7rem] md:text-xs text-gray-500 text-center">
                                                    {option.description}
                                                </p>
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
                                            <Youtube className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-red-custom" />
                                            <input
                                                type="url"
                                                value={youtubeUrl}
                                                onChange={(e) => setYoutubeUrl(e.target.value)}
                                                placeholder="https://youtu.be/xxxxx"
                                                className="text-xs sm:text-sm w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-950/90 focus:border-transparent outline-none transition-all duration-200"
                                            />
                                        </div>
                                        <div className="flex py-3 px-2 mt-3 rounded-lg bg-blue-50 items-center text-center">
                                            <Info color="#0804f6" strokeWidth={3} className='ml-1 mr-2 w-4 h-4' />
                                            <span className='text-xs text-gray-600 font-medium'>Durasi maksimal video 15 Menit</span>
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
                                            className={`relative border-2 border-dashed rounded-xl p-6 transition-all duration-200 cursor-pointer ${dragActive
                                                    ? 'border-blue-400 bg-blue-50'
                                                    : 'border-gray-300 hover:border-gray-400'
                                                }`}
                                            onDragEnter={handleDrag}
                                            onDragLeave={handleDrag}
                                            onDragOver={handleDrag}
                                            onDrop={handleDrop}
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <div className="text-center">
                                                {/* Circular upload icon */}
                                                <div className="mx-auto w-12 h-12 md:w-16 md:h-16 bg-blue-500 rounded-full flex items-center justify-center mb-6">
                                                    <Upload className="w-5 h-5 md:w-6 md:h-6 text-white" />
                                                </div>

                                                {/* Main heading */}
                                                <h3 className="text-md md:text-xl font-semibold text-gray-800 mb-3">
                                                    Pilih Dokumen
                                                </h3>

                                                {/* Subtitle */}
                                                <p className="text-sm text-gray-500 mb-6">
                                                    Drag and drop here • limit 5MB per upload
                                                </p>

                                                {/* File type badges */}
                                                <div className="flex justify-center gap-2">
                                                    <span className="px-3 py-1 bg-blue-100 text-blue-600 text-sm font-medium rounded-full">
                                                        PDF
                                                    </span>
                                                    <span className="px-3 py-1 bg-green-100 text-green-600 text-sm font-medium rounded-full">
                                                        DOC
                                                    </span>
                                                    <span className="px-3 py-1 bg-purple-100 text-purple-600 text-sm font-medium rounded-full">
                                                        TXT
                                                    </span>
                                                </div>

                                                {/* Hidden file input */}
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    multiple
                                                    accept=".pdf,.doc,.docx,.txt"
                                                    onChange={(e) => handleFiles(e.target.files)}
                                                    className="hidden"
                                                />
                                            </div>
                                        </div>

                                        {/* Uploaded Files */}
                                        {uploadedFiles.length > 0 && (
                                            <div className="mt-4 space-y-2">
                                                <div className="max-h-32 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                                    {uploadedFiles.map((file, index) => (
                                                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                                            <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                                                                <File className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" />
                                                                <span className="text-xs sm:text-sm font-medium text-gray-700 truncate">
                                                                    {file.name}
                                                                </span>
                                                                <span className="text-xs text-gray-500 flex-shrink-0">
                                                                    ({(file.size / 1024 / 1024).toFixed(1)} MB)
                                                                </span>
                                                            </div>
                                                            <button
                                                                onClick={() => removeFile(index)}
                                                                className="text-red-500 hover:text-red-700 transition-colors duration-200 cursor-pointer flex-shrink-0 ml-2"
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

                                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full">
                                    {/* Subject Input */}
                                    <div className='flex-1'>
                                        <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2 sm:mb-3">
                                            <span>Pelajaran</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={subject}
                                            onChange={(e) => setSubject(e.target.value)}
                                            placeholder="Matematika, IPA"
                                            className="text-xs sm:text-sm w-full px-3 sm:px-4 py-3 sm:py-4 border border-gray-400 rounded-xl focus:ring-2 focus:ring-slate-950/90 focus:border-transparent outline-none transition-all duration-200"
                                        />
                                    </div>

                                    <div className='flex-1'>
                                        <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2 sm:mb-3">
                                            <span>Level</span>
                                        </label>
                                        <select
                                            type="text"
                                            value={questionLevel}
                                            onChange={(e) => setQuestionLevel(e.target.value)}
                                            placeholder="Easy"
                                            className="text-xs sm:text-sm w-full px-3 sm:px-4 py-3 sm:py-4 border border-gray-400 rounded-xl focus:ring-2 focus:ring-slate-950/90 focus:border-transparent outline-none transition-all duration-200"
                                        >
                                            {questionLevels.map((type) => (
                                                <option key={type.value} value={type.value}>
                                                    {type.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Question Type and Count */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 cursor-pointer">
                                    <div>
                                        <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2 sm:mb-3">
                                            <span>Tipe Soal</span>
                                        </label>
                                        <select
                                            value={questionType}
                                            onChange={(e) => setQuestionType(e.target.value)}
                                            className="text-xs sm:text-sm w-full px-3 sm:px-4 py-3 sm:py-4 border border-gray-400 rounded-xl focus:ring-2 focus:ring-slate-950/90 focus:border-transparent outline-none transition-all duration-200 bg-white"
                                        >
                                            {questionTypes.map((type) => (
                                                <option key={type.value} value={type.value}>
                                                    {type.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="flex items-center text-sm font-medium text-gray-700 mb-2 sm:mb-3">
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
                                                className="cursor-pointer text-xs sm:text-sm h-12 sm:h-14 flex-1 px-3 sm:px-4 py-3 border border-gray-400 rounded-xl focus:ring-2 focus:ring-slate-950/90 focus:border-transparent outline-none transition-all duration-200"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Generate Button */}
                                <button
                                    onClick={onGenerate}
                                    disabled={isGenerating}
                                    className={`w-full py-3 sm:py-4 px-4 sm:px-6 rounded-xl font-semibold text-slate-950/70 hover:text-white transition-all duration-400 cursor-pointer mb-4 ${!isGenerating
                                        ? 'bg-slate-100 outline-2 outline-soft-blue hover:bg-soft-blue shadow-lg hover:shadow-xl transform hover:scale-[1.02]'
                                        : 'bg-gray-400 cursor-not-allowed'
                                        }`}
                                >
                                    {isGenerating ? (
                                        <div className="flex items-center justify-center space-x-3">
                                            <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
                                            <span className='text-white text-sm sm:text-base'>Generating...</span>
                                        </div>
                                    ) : (
                                        <div className="flex justify-center items-center">
                                            <span className="mr-2 text-sm sm:text-base">Buat Soal</span>
                                            <Sparkles className='w-5 h-5' />
                                        </div>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Results Container - Responsive width */}
                    <div className="w-full lg:w-3/5 2xl:w-2/3">
                        <div className="rounded-2xl shadow-lg border-b-6 border-b-red-custom p-3 sm:p-4 lg:p-6 xl:sticky xl:top-24 bg-white">
                            {/* Header dengan tombol Hapus Memory */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4 gap-2">
                                <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-800">Hasil Generate</h3>
                                {(generatedContent || savedContent) && (
                                    <button
                                        onClick={handleClearMemory}
                                        className="flex items-center justify-center sm:justify-start space-x-2 px-3 py-2 text-xs sm:text-sm text-white hover:text-white hover:bg-pink-600 rounded-lg transition-colors duration-200 cursor-pointer bg-red-custom active:scale-105"
                                        title="Hapus Cache"
                                    >
                                        <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        <span>Hapus Soal</span>
                                    </button>
                                )}
                            </div>

                            {error && (
                                <div className="mb-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-4 h-4 sm:w-5 sm:h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                                            <span className="text-white text-xs">!</span>
                                        </div>
                                        <p className="text-red-700 text-xs sm:text-sm font-medium">Error</p>
                                    </div>
                                    <p className="text-red-600 text-xs sm:text-sm mt-2">{error}</p>
                                </div>
                            )}

                            {isGenerating && (
                                <div className="text-center py-8 sm:py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                                    <p className="text-gray-600 text-xs sm:text-sm">
                                        Sedang memproses permintaan Anda...
                                    </p>
                                    <p className="text-gray-500 text-xs mt-2">
                                        Proses ini mungkin memakan waktu beberapa menit
                                    </p>
                                </div>
                            )}

                            {!currentContent && !isGenerating && !error && (
                                <div className="text-center py-8 sm:py-12">
                                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <File className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                                    </div>
                                    <p className="text-gray-500 text-xs sm:text-sm">
                                        Soal dan jawaban akan muncul di sini setelah di-generate
                                    </p>
                                </div>
                            )}

                            {currentContent && !isGenerating && (
                                <div className="space-y-3 sm:space-y-4">
                                    {/* Success message with auto-hide */}
                                    {showSuccessMessage && (
                                        <div className="p-3 sm:p-4 bg-green-50 border border-green-200 rounded-xl transition-opacity duration-300">
                                            <div className="flex items-center space-x-2 mb-2">
                                                <div className="w-4 h-4 sm:w-5 sm:h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                                                    <span className="text-white text-xs">✓</span>
                                                </div>
                                                <p className="text-green-700 text-xs sm:text-sm font-medium">Berhasil!</p>
                                            </div>
                                            <p className="text-green-600 text-xs sm:text-sm">
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
                                                <svg className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <p className="text-blue-700 text-xs sm:text-sm font-medium">Data dimuat dari memory</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Content preview */}
                                    <div className="relative group p-3 sm:p-4 rounded-xl bg-gray-100 border border-gray-200 h-auto overflow-y-auto max-h-64 sm:max-h-80 lg:max-h-96">
                                        {/* Tombol Copy muncul saat hover */}
                                        <div className="flex flow-row justify-center items-center font-medium absolute top-2 sm:top-3 right-2 sm:right-3 transition-opacity duration-300 px-2 sm:px-3 py-1 bg-blue-custom text-white text-xs rounded hover:bg-sky-500 active:scale-105">
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
                                        <h4 className="font-medium text-gray-800 mb-2 text-xs sm:text-sm">Preview Hasil:</h4>
                                        <div className="text-xs sm:text-sm text-gray-600 whitespace-pre-wrap font-mono space-y-3 sm:space-y-4 select-text">
                                            {Array.isArray(currentContent?.oogiv_response?.soal) ? (
                                                currentContent.oogiv_response.soal.map((item, index) => (
                                                    <div key={index}>
                                                        <div className='text-slate-950 font-medium'>{item["no soal"]}. {item.pertanyaan}</div>

                                                        {/* Jika soal PG */}
                                                        {Array.isArray(item.opsi) && (
                                                            <div className="ml-2 sm:ml-4">
                                                                {item.opsi.map((opsi, i) => (
                                                                    <div key={i}>{opsi}</div>
                                                                ))}
                                                            </div>
                                                        )}
                                                        <div className="text-green-600 mt-1">Jawaban: <span className='text-slate-800 font-medium'>{item.kunci_jawaban}</span></div>

                                                        {/* Jika soal Essay (tanpa opsi) */}
                                                        {!item.opsi}
                                                    </div>
                                                ))
                                            ) : (
                                                <pre className="text-xs sm:text-sm">
                                                    {typeof currentContent === 'string'
                                                        ? currentContent
                                                        : JSON.stringify(currentContent, null, 2)}
                                                </pre>
                                            )}
                                        </div>
                                    </div>

                                    {/* Download buttons */}
                                    <div className="flex flex-row gap-3 sm:gap-4">
                                        <div className="flex-1 p-3 sm:p-4 bg-blue-50 rounded-xl border border-soft-blue">
                                            <h4 className="font-medium text-sky-500 mb-2 text-xs">Unduh Soal</h4>
                                            <button
                                                onClick={() => handleDownloadPDF('questions')}
                                                disabled={isDownloading}
                                                className="w-full flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 sm:py-3 bg-sky-500 hover:bg-sky-700 text-white rounded-lg transition-colors duration-200 cursor-pointer"
                                            >
                                                <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                                                <span className="text-xs">{isDownloading ? 'Mengunduh...' : 'Soal (PDF)'}</span>
                                            </button>
                                        </div>

                                        <div className="flex-1 p-3 sm:p-4 bg-green-50 rounded-xl border border-emerald-500">
                                            <h4 className="font-medium text-emerald-500 mb-2 text-xs">Unduh Jawaban</h4>
                                            <button
                                                onClick={() => handleDownloadPDF('answers')}
                                                disabled={isDownloading}
                                                className="w-full flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 sm:py-3 bg-emerald-500 hover:bg-emerald-700 text-white rounded-lg transition-colors duration-200 cursor-pointer"
                                            >
                                                <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                                                <span className="text-xs">{isDownloading ? 'Mengunduh...' : 'Jawaban (PDF)'}</span>
                                            </button>
                                        </div>
                                    </div>

                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div >

    );
};

export default GeneratePage;