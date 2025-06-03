import { createContext, useContext, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const GenerateContext = createContext();

export const GenerateProvider = ({ children }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedContent, setGeneratedContent] = useState(null);
    const [error, setError] = useState(null);

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

            const formData = new FormData();
            formData.append('pelajaran', subject.trim());
            formData.append('jumlah', questionCount.toString());
            formData.append('tipe', questionType.toLowerCase());
            formData.append('level', questionLevel.toLowerCase());

            if (materialType === 'youtube') {
                formData.append('youtube_url', youtubeUrl.trim());
            }

            if (materialType === 'file') {
                uploadedFiles.forEach(file => {
                    if (file instanceof File) {
                        formData.append('files', file);
                    }
                });
            }

            const response = await axios.post('https://ai.oogiv.com/api/buatsoal', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    accept: 'application/json',
                },
                timeout: 120000,
                withCredentials: true,
            });

            setGeneratedContent(response.data);
            const metadata = {
                subject: subject.trim(),
                questionType,
                questionLevel,
                materialType,
                youtubeUrl,
                questionCount,
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
                generatedContent,
                error,
                handleGenerate,
                setGeneratedContent,
            }}
        >
            {children}
        </GenerateContext.Provider>
    );
};

export const useGenerate = () => useContext(GenerateContext);
