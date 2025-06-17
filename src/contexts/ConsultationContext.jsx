import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';

const ConsultationContext = createContext();

export const useConsultation = () => {
    const context = useContext(ConsultationContext);
    if (!context) {
        throw new Error('useConsultation must be used within a ConsultationProvider');
    }
    return context;
};

export const ConsultationProvider = ({ children }) => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
    const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
    const YT_URL = import.meta.env.VITE_YOUTUBE_BASE_URL;

    // State untuk messages
    const [messages, setMessages] = useState(() => {
        try {
            const savedMessages = sessionStorage.getItem('consultation_messages');
            if (savedMessages) {
                return JSON.parse(savedMessages);
            }
        } catch (error) {
            console.error('Error loading messages from sessionStorage:', error);
        }

        return [
            {
                id: 1,
                type: 'bot',
                content: 'Halo, salam kenal! Aku OOGIV. AI Assistant yang siap membantu Kamu dalam memahami materi. Jangan lupa input materi yang ingin ditanyakan yaa..!'
            }
        ];
    });

    const [materialsProcessed, setMaterialsProcessed] = useState(() => {
        try {
            const savedState = sessionStorage.getItem('materials_processed');
            return savedState === 'true';
        } catch (error) {
            console.error('Error loading materials processed state:', error);
            return false;
        }
    });

    const [processedFiles, setProcessedFiles] = useState(() => {
        try {
            const savedFiles = sessionStorage.getItem('processed_files_data');
            if (savedFiles) {
                const filesData = JSON.parse(savedFiles);
                // Convert base64 back to File objects
                return filesData.map(fileData => {
                    const byteCharacters = atob(fileData.content);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    return new File([byteArray], fileData.name, {
                        type: fileData.type,
                        lastModified: fileData.lastModified
                    });
                });
            }
        } catch (error) {
            console.error('Error loading processed files from sessionStorage:', error);
        }
        return [];
    });

    // State untuk menyimpan metadata file (untuk sessionStorage)
    const [processedFilesMetadata, setProcessedFilesMetadata] = useState(() => {
        try {
            const savedMetadata = sessionStorage.getItem('processed_files_metadata');
            return savedMetadata ? JSON.parse(savedMetadata) : [];
        } catch (error) {
            console.error('Error loading processed files metadata:', error);
            return [];
        }
    });

    // State untuk material source
    const [materialSource, setMaterialSource] = useState(() => {
        return sessionStorage.getItem('material_source') || 'upload';
    });

    // State untuk YouTube URL yang sudah diproses
    const [processedYoutubeUrl, setProcessedYoutubeUrl] = useState(() => {
        return sessionStorage.getItem('processed_youtube_url') || '';
    });

    // State untuk tracking aktivitas background dan bot response
    const [isProcessing, setIsProcessing] = useState(false);
    const [isBotResponding, setIsBotResponding] = useState(false);
    const [backgroundTasks, setBackgroundTasks] = useState(new Set());

    // State untuk YouTube conversion
    const [isConvertingYoutube, setIsConvertingYoutube] = useState(false);

    // Ref untuk menyimpan controller AbortController untuk cancel request jika perlu
    const activeRequestsRef = useRef(new Map());

    // Helper function to format file size
    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Helper function to extract YouTube video ID from URL
    const extractYouTubeId = (url) => {
        const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
        const match = url.match(regex);
        return match ? match[1] : null;
    };

    // Function untuk convert YouTube to MP3
    const convertYoutubeToMp3 = async (youtubeUrl) => {
        try {
            setIsConvertingYoutube(true);
            toast.info('Memproses URL Youtube...');

            // Using a YouTube to MP3 conversion service (example using rapidapi or similar service)
            // You'll need to replace this with your preferred YouTube to MP3 API
            const response = await axios.get(`${YT_URL}`, {
                params: { id: extractYouTubeId(youtubeUrl) },
                headers: {
                    'X-RapidAPI-Key': `${API_KEY}`,
                    'X-RapidAPI-Host': 'youtube-mp36.p.rapidapi.com'
                },
                timeout: 180000,
            });

            if (response.data && response.data.link) {
                // Download the MP3 file from the conversion service
                const mp3Response = await axios.get(response.data.link, {
                    responseType: 'blob',
                    timeout: 180000
                });

                // Create a File object from the blob
                const mp3Blob = new Blob([mp3Response.data], { type: 'audio/mpeg' });
                const mp3File = new File([mp3Blob], `youtube_audio_${Date.now()}.mp3`, {
                    type: 'audio/mpeg'
                });
                toast.success('URL Berhasil diterima!');
                return mp3File;
            } else {
                throw new Error('Gagal mengirim URL');
            }

        } catch (error) {
            console.error('Error converting YouTube to MP3:', error);
            let errorMessage = 'Gagal memproses URL';

            if (error.code === 'ECONNABORTED') {
                errorMessage = 'Konversi timeout. Video terlalu panjang atau koneksi lambat.';
            } else if (error.response) {
                const { status, data } = error.response;
                if (status === 400) {
                    errorMessage = 'URL YouTube tidak valid.';
                } else if (status === 404) {
                    errorMessage = 'Video tidak ditemukan atau tidak dapat diakses.';
                } else if (status === 413) {
                    errorMessage = 'Video terlalu besar untuk diproses.';
                } else if (status === 500) {
                    errorMessage = 'Server error saat memproses. Silakan coba lagi.';
                } else {
                    errorMessage = data?.detail || data?.message || `Error konversi (${status})`;
                }
            } else if (error.request) {
                errorMessage = 'Tidak dapat terhubung ke server.';
            } else if (error.message) {
                errorMessage = error.message;
            }

            toast.error(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setIsConvertingYoutube(false);
        }
    };

    // Function untuk convert File ke base64 untuk storage (dengan compression untuk MP3)
    const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const base64 = reader.result.split(',')[1]; // Remove data:... prefix
                const sizeInBytes = base64.length * 0.75; // Approximate size after base64 encoding
                resolve({
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    lastModified: file.lastModified,
                    content: base64,
                    base64Size: sizeInBytes
                });
            };
            reader.onerror = error => reject(error);
        });
    };

    // Function untuk save files ke sessionStorage dengan size management
    const saveFilesToStorage = async (files) => {
        try {
            // 1. Konversi file ke format Base64 (langkah ini tetap diperlukan)
            const filesData = await Promise.all(files.map(file => fileToBase64(file)));

            // 2. Langsung coba simpan data file ke sessionStorage
            try {
                // Operasi utama: menyimpan data file
                sessionStorage.setItem('processed_files_data', JSON.stringify(filesData));
                // Jika berhasil, simpan juga metadatanya
                const filesMetadata = files.map(fileToMetadata);
                sessionStorage.setItem('processed_files_metadata', JSON.stringify(filesMetadata));
                setProcessedFilesMetadata(filesMetadata);
                // Kembalikan status bahwa file berhasil disimpan sepenuhnya
                return { success: true };

            } catch (storageError) {
                // 3. Jika terjadi error saat menyimpan...
                if (storageError.name === 'QuotaExceededError') {
                    // Jika error disebabkan oleh storage penuh, lakukan fallback
                    toast.warn('⚠️ QuotaExceededError terdeteksi. Menyimpan metadata saja sebagai fallback.');

                    // Pastikan key untuk data file bersih
                    sessionStorage.removeItem('processed_files_data');

                    // Simpan HANYA metadata
                    const filesMetadata = files.map(fileToMetadata);
                    sessionStorage.setItem('processed_files_metadata', JSON.stringify(filesMetadata));
                    setProcessedFilesMetadata(filesMetadata);

                    // Kembalikan status bahwa file hanya ada di memori
                    return { success: true, inMemoryOnly: true };
                } else {
                    // Jika error lain, lempar kembali agar bisa ditangani di luar
                    toast.error('Terjadi error storage yang tidak terduga:', storageError);
                    throw storageError;
                }
            }
        } catch (error) {
            // Blok catch ini untuk menangani error dari langkah #1 (fileToBase64)
            toast.error('Error dalam proses saveFilesToStorage:', error);
            throw error;
        }
    };

    // Save messages ke sessionStorage
    useEffect(() => {
        try {
            sessionStorage.setItem('consultation_messages', JSON.stringify(messages));
        } catch (error) {
            console.error('Error saving messages to sessionStorage:', error);
        }
    }, [messages]);

    // Save materials processed state ke sessionStorage
    useEffect(() => {
        try {
            sessionStorage.setItem('materials_processed', materialsProcessed.toString());
        } catch (error) {
            console.error('Error saving materials processed state:', error);
        }
    }, [materialsProcessed]);

    // Save material source ke sessionStorage
    useEffect(() => {
        try {
            sessionStorage.setItem('material_source', materialSource);
        } catch (error) {
            console.error('Error saving material source:', error);
        }
    }, [materialSource]);

    // Save processed YouTube URL ke sessionStorage
    useEffect(() => {
        try {
            sessionStorage.setItem('processed_youtube_url', processedYoutubeUrl);
        } catch (error) {
            console.error('Error saving processed YouTube URL:', error);
        }
    }, [processedYoutubeUrl]);

    // Function untuk validasi ketersediaan material
    const validateMaterialAvailability = () => {
        if (!materialsProcessed) {
            return {
                isValid: false,
                reason: 'materials_not_processed'
            };
        }

        if (materialSource === 'upload') {
            // Check apakah file metadata ada dan tidak kosong
            if (!processedFilesMetadata || processedFilesMetadata.length === 0) {
                return {
                    isValid: false,
                    reason: 'files_metadata_missing'
                };
            }

            // Check apakah file di memory ada dan sesuai dengan metadata
            if (!processedFiles || processedFiles.length === 0) {
                return {
                    isValid: false,
                    reason: 'files_missing_in_memory'
                };
            }

            // Validasi apakah jumlah file di memory sesuai dengan metadata
            if (processedFiles.length !== processedFilesMetadata.length) {
                return {
                    isValid: false,
                    reason: 'files_metadata_mismatch'
                };
            }
        } else if (materialSource === 'youtube') {
            if (!processedFiles || processedFiles.length === 0) {
                return {
                    isValid: false,
                    // Kita buat reason baru yang lebih spesifik
                    reason: 'youtube_file_missing'
                };
            }
        }

        // Jika semua pengecekan di atas lolos, materi tersedia
        return {
            isValid: true
        };
    };

    // Function untuk handle material validation error
    const handleMaterialValidationError = (reason) => {
        let message = '';

        switch (reason) {
            case 'materials_not_processed':
                message = 'Silakan proses materi terlebih dahulu sebelum mengajukan pertanyaan.';
                break;
            case 'files_metadata_missing':
            case 'files_missing_in_memory':
            case 'files_metadata_mismatch':
                message = 'Data materi hilang. Silakan upload dan proses file ulang.';
                // Reset state untuk upload
                setMaterialsProcessed(false);
                setProcessedFiles([]);
                setProcessedFilesMetadata([]);
                break;

            // === TAMBAHKAN CASE BARU DI SINI ===
            case 'youtube_file_missing':
                message = 'Materi YouTube tidak ditemukan. Silakan proses ulang URL materi Anda.';
                // Reset state untuk youtube agar bersih
                setMaterialsProcessed(false);
                setProcessedYoutubeUrl('');
                setProcessedFiles([]);
                setProcessedFilesMetadata([]);
                break;

            case 'youtube_url_missing': // Case ini untuk jika URL-nya sendiri yang hilang
                message = 'URL YouTube hilang. Silakan input dan proses URL YouTube ulang.';
                setMaterialsProcessed(false);
                setProcessedYoutubeUrl('');
                setProcessedFiles([]);
                setProcessedFilesMetadata([]);
                break;

            default:
                message = 'Terjadi masalah dengan data materi. Silakan upload ulang.';
        }

        // Tampilkan notifikasi toast
        toast.info(message);
    };

    // Utility function untuk convert File ke metadata
    const fileToMetadata = (file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        id: `${file.name}_${file.size}_${file.lastModified}` // unique identifier
    });

    // Utility function untuk recreate File dari metadata (jika memungkinkan)
    const metadataToFileReference = (metadata) => ({
        ...metadata,
        isReference: true // flag to indicate this is a reference, not actual file
    });

    // Function untuk memproses materi
    const processMaterials = async (files = [], youtubeUrl = '') => {
        const taskId = Date.now().toString();

        try {
            // Add task to background tasks
            setBackgroundTasks(prev => new Set([...prev, taskId]));
            setIsProcessing(true);
            setIsBotResponding(true);

            const formData = new FormData();
            let processedFilesToUse = [...files];

            if (materialSource === 'upload' && files.length > 0) {
                // Store actual files in memory and sessionStorage
                setProcessedFiles(files);
                const saveResult = await saveFilesToStorage(files);

                if (saveResult.inMemoryOnly) {
                    return;
                }

                // Add files to formData
                files.forEach((file) => {
                    formData.append('files', file);
                });
                formData.append('query', '');

            } else if (materialSource === 'youtube' && youtubeUrl.trim()) {
                // Convert YouTube URL to MP3 first
                try {
                    const mp3File = await convertYoutubeToMp3(youtubeUrl);

                    // Store the converted MP3 file
                    processedFilesToUse = [mp3File];
                    setProcessedFiles([mp3File]);
                    const saveResult = await saveFilesToStorage([mp3File]);

                    if (saveResult.inMemoryOnly) {
                        return;
                    }

                    // Add the MP3 file to formData instead of YouTube URL
                    formData.append('files', mp3File);
                    formData.append('query', ''); // Empty query since we're sending file

                } catch (conversionError) {
                    // If conversion fails, throw error to be handled by outer catch
                    throw conversionError;
                }
            }

            // Create AbortController for this request
            const controller = new AbortController();
            activeRequestsRef.current.set(taskId, controller);

            const response = await fetch(`${API_BASE_URL}/konsulai`, {
                method: 'POST',
                body: formData,
                signal: controller.signal
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const contentType = response.headers.get('content-type') || '';
            let data;

            if (contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }

            // Update state
            setMaterialsProcessed(true);

            // Remove initial greeting message
            setMessages(prev => {
                const filteredMessages = prev.filter(msg =>
                    msg.content !== 'Halo, salam kenal! Aku OOGIV. AI Assistant yang siap membantu Kamu dalam memahami materi. Jangan lupa input materi yang ingin ditanyakan yaa..!'
                );

                let responseContent = 'Materi berhasil diproses! Sekarang Anda dapat mengajukan pertanyaan tentang materi tersebut.';

                if (typeof data === 'string' && data.trim()) {
                    responseContent = data;
                } else if (data && typeof data === 'object') {
                    responseContent = data.message || data.response || data.answer || JSON.stringify(data);
                }

                // Add special message for YouTube conversion
                if (materialSource === 'youtube') {
                    responseContent = `Video YouTube berhasil dikonversi ke MP3 dan diproses! ${responseContent}`;
                }

                const botResponse = {
                    id: Date.now(),
                    type: 'bot',
                    content: responseContent
                };

                return [...filteredMessages, botResponse];
            });

            toast.success(materialSource === 'youtube' ?
                "Video YouTube berhasil diterima !" :
                "Materi berhasil diproses!"
            );
            return { success: true, data };

        } catch (error) {
            if (error.name === 'AbortError') {
                return { success: false, cancelled: true };
            }

            console.error('❌ Error processing materials:', error);

            // Reset states jika error
            setMaterialsProcessed(false);
            setProcessedFiles([]);
            setProcessedFilesMetadata([]);
            sessionStorage.removeItem('processed_files_data');
            sessionStorage.removeItem('processed_files_metadata');

            if (materialSource === 'youtube') {
                setProcessedYoutubeUrl('');
                sessionStorage.removeItem('processed_youtube_url');
            }

            const errorResponse = {
                id: Date.now(),
                type: 'bot',
                content: materialSource === 'youtube' ?
                    'Maaf, terjadi kesalahan saat mengkonversi atau memproses video YouTube. Silakan coba lagi.' :
                    'Maaf, terjadi kesalahan saat memproses materi. Silakan coba lagi.'
            };
            setMessages(prev => [...prev, errorResponse]);

            toast.error(materialSource === 'youtube' ?
                "Gagal mengkonversi/memproses video YouTube. Silakan coba lagi." :
                "Gagal memproses materi. Silakan coba lagi."
            );
            return { success: false, error };

        } finally {
            // Remove task from background tasks
            setBackgroundTasks(prev => {
                const newTasks = new Set(prev);
                newTasks.delete(taskId);
                return newTasks;
            });

            // Remove controller
            activeRequestsRef.current.delete(taskId);

            // Update processing state
            setIsProcessing(false);
            setIsBotResponding(false);
        }
    };

    // Function untuk mengirim pesan
    const sendMessage = async (query) => {
        if (!query.trim()) return { success: false, error: 'Query is empty' };

        // Check if bot is currently responding
        if (isBotResponding) {
            toast.info('Mohon tunggu, bot sedang merespons...');
            return { success: false, error: 'Bot is currently responding' };
        }

        // Validasi ketersediaan material
        const validation = validateMaterialAvailability();
        if (!validation.isValid) {
            handleMaterialValidationError(validation.reason);
            return { success: false, error: 'Material validation failed', reason: validation.reason };
        }

        const taskId = Date.now().toString();
        let botMessageId = null; // Deklarasi di luar blok try

        try {
            // Set bot responding state
            setIsBotResponding(true);

            // Add user message
            const userMessage = {
                id: Date.now(),
                type: 'user',
                content: query
            };
            setMessages(prev => [...prev, userMessage]);

            // Add task to background tasks
            setBackgroundTasks(prev => new Set([...prev, taskId]));

            // Create placeholder bot message
            botMessageId = Date.now() + 1; // Assign value tanpa re-deklarasi
            setMessages(prev => [
                ...prev,
                {
                    id: botMessageId,
                    type: 'bot',
                    content: ''
                }
            ]);

            const formData = new FormData();
            formData.append('query', query);

            // ALWAYS add processed files if available (both for new messages and edits)
            if (processedFiles.length > 0) {
                processedFiles.forEach((file) => {
                    formData.append('files', file);
                });
            }

            // Create AbortController
            const controller = new AbortController();
            activeRequestsRef.current.set(taskId, controller);

            const response = await fetch(`${API_BASE_URL}/konsulai`, {
                method: 'POST',
                body: formData,
                credentials: 'include',
                signal: controller.signal
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Handle streaming response
            if (response.body && response.headers.get('transfer-encoding') === 'chunked') {
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let accumulatedContent = '';

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const chunk = decoder.decode(value, { stream: true });

                        for (let i = 0; i < chunk.length; i++) {
                            accumulatedContent += chunk[i];

                            if (i % 3 === 0 || chunk[i] === ' ' || chunk[i] === '\n') {
                                setMessages(prev =>
                                    prev.map(msg =>
                                        msg.id === botMessageId
                                            ? { ...msg, content: accumulatedContent }
                                            : msg
                                    )
                                );
                                await new Promise(resolve => setTimeout(resolve, 20));
                            }
                        }

                        setMessages(prev =>
                            prev.map(msg =>
                                msg.id === botMessageId
                                    ? { ...msg, content: accumulatedContent }
                                    : msg
                            )
                        );
                    }
                } finally {
                    reader.releaseLock();
                }
            } else {
                // Handle non-streaming response
                const contentType = response.headers.get('content-type') || '';
                let data;

                if (contentType.includes('application/json')) {
                    data = await response.json();
                } else {
                    data = await response.text();
                }

                let botResponseContent = '';

                if (typeof data === 'string' && data.trim()) {
                    botResponseContent = data.trim();
                } else if (data && typeof data === 'object') {
                    botResponseContent = data.message || data.response || data.answer || JSON.stringify(data);
                } else {
                    botResponseContent = 'Maaf, tidak ada respons yang bisa ditampilkan dari server.';
                }

                // Simulate typing effect
                const words = botResponseContent.split(' ');
                let currentContent = '';

                for (let i = 0; i < words.length; i++) {
                    currentContent += (i > 0 ? ' ' : '') + words[i];

                    setMessages(prev =>
                        prev.map(msg =>
                            msg.id === botMessageId
                                ? { ...msg, content: currentContent }
                                : msg
                        )
                    );

                    await new Promise(resolve => setTimeout(resolve, 50));
                }
            }

            return { success: true };

        } catch (error) {
            if (error.name === 'AbortError') {
                return { success: false, cancelled: true };
            }

            console.error('Error sending message:', error);

            // Pastikan botMessageId ada sebelum mengupdate messages
            if (botMessageId) {
                const errorContent = 'Maaf, terjadi kesalahan saat memproses pertanyaan Anda. Silakan coba lagi.';
                setMessages(prev =>
                    prev.map(msg =>
                        msg.id === botMessageId
                            ? { ...msg, content: errorContent }
                            : msg
                    )
                );
            }

            return { success: false, error };

        } finally {
            // Remove task from background tasks
            setBackgroundTasks(prev => {
                const newTasks = new Set(prev);
                newTasks.delete(taskId);
                return newTasks;
            });

            // Remove controller
            activeRequestsRef.current.delete(taskId);

            // Reset bot responding state
            setIsBotResponding(false);
        }
    };

    // Function untuk cancel semua active requests
    const cancelAllRequests = () => {
        activeRequestsRef.current.forEach((controller) => {
            controller.abort();
        });
        activeRequestsRef.current.clear();
        setBackgroundTasks(new Set());
        setIsProcessing(false);
        setIsBotResponding(false);
        setIsConvertingYoutube(false);
    };

    // Function untuk clear consultation data
    const clearConsultationData = () => {
        cancelAllRequests();

        setMessages([
            {
                id: 1,
                type: 'bot',
                content: 'Halo, salam kenal! Aku OOGIV. AI Assistant yang siap membantu Kamu dalam memahami materi. Jangan lupa input materi yang ingin ditanyakan yaa..!'
            }
        ]);

        setMaterialsProcessed(false);
        setProcessedFiles([]);
        setProcessedFilesMetadata([]);
        setProcessedYoutubeUrl('');

        // Clear sessionStorage
        sessionStorage.removeItem('consultation_messages');
        sessionStorage.removeItem('materials_processed');
        sessionStorage.removeItem('processed_files_metadata');
        sessionStorage.removeItem('processed_files_data');
        sessionStorage.removeItem('processed_youtube_url');
        sessionStorage.removeItem('material_source');
    };

    // Function untuk check apakah masih ada background tasks
    const hasBackgroundTasks = () => {
        return backgroundTasks.size > 0;
    };

    // Function untuk check apakah bot sedang merespons
    const isBotCurrentlyResponding = () => {
        return isBotResponding;
    };

    // Function untuk check apakah sedang converting YouTube
    const isCurrentlyConvertingYoutube = () => {
        return isConvertingYoutube;
    };

    // Cleanup saat component unmount
    useEffect(() => {
        return () => {
            // Cancel semua active requests saat component unmount
            cancelAllRequests();
        };
    }, []);

    const contextValue = {
        // State
        messages,
        setMessages,
        materialsProcessed,
        setMaterialsProcessed,
        processedFiles,
        setProcessedFiles,
        processedFilesMetadata,
        materialSource,
        setMaterialSource,
        processedYoutubeUrl,
        setProcessedYoutubeUrl,
        isProcessing,
        isBotResponding,
        backgroundTasks,
        isConvertingYoutube,

        // Functions
        processMaterials,
        sendMessage,
        clearConsultationData,
        cancelAllRequests,
        hasBackgroundTasks,
        isBotCurrentlyResponding,
        isCurrentlyConvertingYoutube,
        validateMaterialAvailability,
        convertYoutubeToMp3,
        extractYouTubeId,

        // Utility functions
        fileToMetadata,
        metadataToFileReference,
        saveFilesToStorage
    };

    return (
        <ConsultationContext.Provider value={contextValue}>
            {children}
        </ConsultationContext.Provider>
    );
};