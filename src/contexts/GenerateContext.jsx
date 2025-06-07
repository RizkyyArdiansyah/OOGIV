import { createContext, useContext, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const GenerateContext = createContext();

export const GenerateProvider = ({ children }) => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
    const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
    const YT_URL = import.meta.env.VITE_YOUTUBE_BASE_URL;
    const [isGenerating, setIsGenerating] = useState(false);
    const [isConvertingYoutube, setIsConvertingYoutube] = useState(false);
    const [generatedContent, setGeneratedContent] = useState(null);
    const [error, setError] = useState(null);

    // Function to clear previous localStorage data
    const clearPreviousData = () => {
        localStorage.removeItem('generateMetadata');
        localStorage.removeItem('generatedContent');
        // Clear any other related localStorage items if needed
    };

    // Function to convert YouTube URL to MP3 file
    const convertYoutubeToMp3 = async (youtubeUrl) => {
        try {
            setIsConvertingYoutube(true);
            toast.info('Memproses URL Youtube...');

            // Clear previous data when starting new YouTube conversion
            clearPreviousData();

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

                toast.success('Konversi berhasil!');
                return mp3File;
            } else {
                throw new Error('Gagal mengkonversi video ke MP3');
            }

        } catch (error) {
            console.error('Error converting YouTube to MP3:', error);
            let errorMessage = 'Gagal mengkonversi video YouTube ke MP3';

            if (error.code === 'ECONNABORTED') {
                errorMessage = 'Konversi timeout. Video terlalu panjang atau koneksi lambat.';
            } else if (error.response) {
                const { status, data } = error.response;
                if (status === 400) {
                    errorMessage = 'URL YouTube tidak valid.';
                } else if (status === 404) {
                    errorMessage = 'Video tidak ditemukan atau tidak dapat diakses.';
                } else if (status === 413) {
                    errorMessage = 'Video terlalu besar untuk dikonversi.';
                } else if (status === 500) {
                    errorMessage = 'Server error saat konversi. Silakan coba lagi.';
                } else {
                    errorMessage = data?.detail || data?.message || `Error konversi (${status})`;
                }
            } else if (error.request) {
                errorMessage = 'Tidak dapat terhubung ke server konversi.';
            } else if (error.message) {
                errorMessage = error.message;
            }

            toast.error(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setIsConvertingYoutube(false);
        }
    };

    // Helper function to extract YouTube video ID from URL
    const extractYouTubeId = (url) => {
        const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
        const match = url.match(regex);
        return match ? match[1] : null;
    };

    // Function to handle file uploads (call this when user uploads new files)
    const handleFileUpload = (files) => {
        // Clear previous data when user uploads new files
        clearPreviousData();
        // Reset generated content state
        setGeneratedContent(null);
        setError(null);
        return files;
    };

    // Function to handle YouTube URL input (call this when user enters new YouTube URL)
    const handleYoutubeUrlInput = (url) => {
        // Clear previous data when user enters new YouTube URL
        clearPreviousData();
        // Reset generated content state
        setGeneratedContent(null);
        setError(null);
        return url;
    };

    const handleGenerate = async ({
        subject,
        questionType,
        questionLevel,
        materialType,
        youtubeUrl,
        uploadedFiles,
        questionCount
    }) => {
        try {
            if (!questionType) {
                toast.warn('Silakan pilih tipe soal terlebih dahulu');
                return;
            }

            if (materialType === 'youtube' && !youtubeUrl.trim()) {
                toast.warn('Silakan masukkan URL YouTube');
                return;
            }

            if (materialType === 'file' && uploadedFiles.length === 0) {
                toast.warn('Silakan upload file materi');
                return;
            }

            if (!subject.trim()) {
                toast.warn('Silakan masukkan nama pelajaran');
                return;
            }

            if (!questionLevel.trim()) {
                toast.warn('Silakan masukan tingkat kesulitan soal');
                return;
            }
            if (!questionCount || questionCount <= 0) {
                toast.warn('Silakan masukkan jumlah soal yang valid');
                return;
            }

            if (questionCount > 50) {
                toast.warn('Jumlah soal maksimal 50');
                return;
            }

            setIsGenerating(true);
            setError(null);

            let mp3File = null;

            // Convert YouTube URL to MP3 file if material type is youtube
            if (materialType === 'youtube') {
                try {
                    mp3File = await convertYoutubeToMp3(youtubeUrl);
                } catch (conversionError) {
                    setIsGenerating(false);
                    return false;
                }
            }

            // Clear previous data before generating new content
            clearPreviousData();

            const formData = new FormData();
            formData.append('pelajaran', subject.trim());
            formData.append('jumlah', questionCount.toString());
            formData.append('tipe', questionType.toLowerCase());
            formData.append('level', questionLevel.toLowerCase());

            // Only send the latest file/URL to API
            if (materialType === 'youtube' && mp3File) {
                // Only append the latest converted MP3 file
                formData.append('files', mp3File);
            }

            if (materialType === 'file') {
                // Only append the latest uploaded files
                uploadedFiles.forEach(file => {
                    if (file instanceof File) {
                        formData.append('files', file);
                    }
                });
            }

            const response = await axios.post(`${API_BASE_URL}/buatsoal`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    accept: 'application/json',
                },
                timeout: 120000,
                withCredentials: true,
            });

            setGeneratedContent(response.data);
            
            // Save new metadata to localStorage
            const metadata = {
                subject: subject.trim(),
                questionType,
                questionLevel,
                materialType,
                youtubeUrl,
                questionCount,
                timestamp: new Date().toISOString(), // Add timestamp for tracking
            };
            localStorage.setItem('generateMetadata', JSON.stringify(metadata));
            
            toast.success("Generate soal berhasil!");
            return true;

        } catch (error) {
            console.error('Error generating questions:', error);
            let errorMessage = 'Terjadi kesalahan tidak terduga';

            if (error.code === 'ECONNABORTED') {
                errorMessage = 'Request timeout. Proses pembuatan soal memakan waktu terlalu lama.';
            } else if (error.response) {
                const { status, data } = error.response;
                if (status === 400) {
                    errorMessage = 'Data yang dikirim tidak valid. Periksa kembali form Anda.';
                } else if (status === 422) {
                    errorMessage = data?.detail || 'Format data tidak sesuai. Periksa kembali input Anda.';
                } else if (status === 413) {
                    errorMessage = data?.detail;
                } else if (status === 500) {
                    errorMessage = 'Terjadi kesalahan pada server. Silakan coba lagi nanti.';
                } else {
                    errorMessage = data?.detail || data?.message || `Server error (${status})`;
                }
            } else if (error.request) {
                errorMessage = 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
            } else if (error.message) {
                errorMessage = error.message;
            }

            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <GenerateContext.Provider
            value={{
                isGenerating,
                isConvertingYoutube,
                generatedContent,
                error,
                handleGenerate,
                setGeneratedContent,
                handleFileUpload,
                handleYoutubeUrlInput,
                clearPreviousData,
            }}
        >
            {children}
        </GenerateContext.Provider>
    );
};

export const useGenerate = () => useContext(GenerateContext);