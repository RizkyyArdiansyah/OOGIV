import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';

const ConsultationContext = createContext();

export const useConsultation = () => {
    const context = useContext(ConsultationContext);
    if (!context) {
        throw new Error('useConsultation must be used within a ConsultationProvider');
    }
    return context;
};

export const ConsultationProvider = ({ children }) => {
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

    // State untuk materials processed
    const [materialsProcessed, setMaterialsProcessed] = useState(() => {
        try {
            const savedState = sessionStorage.getItem('materials_processed');
            return savedState === 'true';
        } catch (error) {
            console.error('Error loading materials processed state:', error);
            return false;
        }
    });

    // State untuk menyimpan file yang sudah diproses (dalam memory dengan persistence)
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

    // Ref untuk menyimpan controller AbortController untuk cancel request jika perlu
    const activeRequestsRef = useRef(new Map());

    // Function untuk convert File ke base64 untuk storage
    const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const base64 = reader.result.split(',')[1]; // Remove data:... prefix
                resolve({
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    lastModified: file.lastModified,
                    content: base64
                });
            };
            reader.onerror = error => reject(error);
        });
    };

    // Function untuk save files ke sessionStorage
    const saveFilesToStorage = async (files) => {
        try {
            const filesData = await Promise.all(files.map(file => fileToBase64(file)));
            sessionStorage.setItem('processed_files_data', JSON.stringify(filesData));
            
            // Also save metadata
            const filesMetadata = files.map(fileToMetadata);
            sessionStorage.setItem('processed_files_metadata', JSON.stringify(filesMetadata));
            setProcessedFilesMetadata(filesMetadata);
        } catch (error) {
            console.error('Error saving files to sessionStorage:', error);
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
            // Check apakah YouTube URL ada
            if (!processedYoutubeUrl || processedYoutubeUrl.trim() === '') {
                return {
                    isValid: false,
                    reason: 'youtube_url_missing'
                };
            }
        }

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
                // Reset material processed state
                setMaterialsProcessed(false);
                setProcessedFiles([]);
                setProcessedFilesMetadata([]);
                break;
            case 'youtube_url_missing':
                message = 'URL YouTube hilang. Silakan input dan proses URL YouTube ulang.';
                // Reset material processed state
                setMaterialsProcessed(false);
                setProcessedYoutubeUrl('');
                break;
            default:
                message = 'Terjadi masalah dengan data materi. Silakan upload ulang.';
        }

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

            if (materialSource === 'upload' && files.length > 0) {
                // Store actual files in memory and sessionStorage
                setProcessedFiles(files);
                await saveFilesToStorage(files);

                // Add files to formData
                files.forEach((file) => {
                    formData.append('files', file);
                });
                formData.append('query', '');

            } else if (materialSource === 'youtube' && youtubeUrl.trim()) {
                setProcessedYoutubeUrl(youtubeUrl);
                formData.append('query', youtubeUrl);
            }

            // Create AbortController for this request
            const controller = new AbortController();
            activeRequestsRef.current.set(taskId, controller);

            const response = await fetch('https://ai.oogiv.com/api/konsulai', {
                method: 'POST',
                body: formData,
                credentials: 'include',
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

                const botResponse = {
                    id: Date.now(),
                    type: 'bot',
                    content: responseContent
                };

                return [...filteredMessages, botResponse];
            });

            toast.success("Materi berhasil diproses!");
            return { success: true, data };

        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Request was cancelled');
                return { success: false, cancelled: true };
            }

            console.error('Error processing materials:', error);

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
                content: 'Maaf, terjadi kesalahan saat memproses materi. Silakan coba lagi.'
            };
            setMessages(prev => [...prev, errorResponse]);

            toast.error("Gagal memproses materi. Silakan coba lagi.");
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
            const botMessageId = Date.now() + 1;
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
            if (materialSource === 'upload' && processedFiles.length > 0) {
                processedFiles.forEach((file) => {
                    formData.append('files', file);
                });
            }

            // Create AbortController
            const controller = new AbortController();
            activeRequestsRef.current.set(taskId, controller);

            const response = await fetch('https://ai.oogiv.com/api/konsulai', {
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
                console.log('Request was cancelled');
                return { success: false, cancelled: true };
            }

            console.error('Error sending message:', error);

            const errorContent = 'Maaf, terjadi kesalahan saat memproses pertanyaan Anda. Silakan coba lagi.';
            setMessages(prev =>
                prev.map(msg =>
                    msg.id === botMessageId
                        ? { ...msg, content: errorContent }
                        : msg
                )
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

        // Functions
        processMaterials,
        sendMessage,
        clearConsultationData,
        cancelAllRequests,
        hasBackgroundTasks,
        isBotCurrentlyResponding,
        validateMaterialAvailability,

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