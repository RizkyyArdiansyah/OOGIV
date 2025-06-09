import React, { createContext, useContext, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const CorrectionContext = createContext();

export const useCorrectionContext = () => {
    const context = useContext(CorrectionContext);
    if (!context) {
        throw new Error('useCorrectionContext must be used within a CorrectionProvider');
    }
    return context;
};

export const CorrectionProvider = ({ children }) => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
    const [isCorrecting, setIsCorrecting] = useState(false);
    const [correctionResult, setCorrectionResult] = useState(null);
    const [error, setError] = useState(null);

    const submitCorrection = async (keyFiles, studentFiles) => {
        if (!keyFiles || keyFiles.length === 0) {
            toast.error('Harap upload file kunci jawaban!');
            return;
        }

        if (!studentFiles || studentFiles.length === 0) {
            toast.error('Harap upload file jawaban siswa!');
            return;
        }

        setIsCorrecting(true);
        setError(null);
        setCorrectionResult(null);

        try {
            const formData = new FormData();

            // Append key answer file (only one file allowed)
            formData.append('kunci_jawaban', keyFiles[0]);

            // Append student answer files (multiple files allowed)
            studentFiles.forEach((file, index) => {
                formData.append(`jawaban_siswa`, file);
            });

            const response = await axios.post(`${API_BASE_URL}/koreksi`, formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        accept: 'application/json',
                    },
                    timeout: 120000,
                    withCredentials: true,
                }
            );

            // Handle response structure based on the API format
            if (response.data && response.data.oogiv_response) {
                // Check if oogiv_response has daftar_nilai array
                if (response.data.oogiv_response.daftar_nilai && Array.isArray(response.data.oogiv_response.daftar_nilai)) {
                    setCorrectionResult(response.data.oogiv_response.daftar_nilai);
                } else {
                    // If daftar_nilai doesn't exist, use oogiv_response directly
                    setCorrectionResult(response.data.oogiv_response);
                }
                toast.success('Koreksi berhasil diselesaikan!');
            } else if (response.data) {
                // Jika struktur response berbeda, coba langsung gunakan response.data
                setCorrectionResult(response.data);
                toast.success('Koreksi berhasil diselesaikan!');
            } else {
                throw new Error('Format response tidak valid');
            }

        } catch (error) {
            console.error('Correction error:', error);

            let errorMessage = 'Terjadi kesalahan saat melakukan koreksi';

            if (error.response) {
                // Server responded with error status
                if (error.response.status === 413) {
                    errorMessage = 'File terlalu besar. Maksimal ukuran file adalah 5MB';
                } else if (error.response.status === 400) {
                    errorMessage = 'Format file tidak didukung atau data tidak valid';
                } else if (error.response.status === 500) {
                    errorMessage = 'Terjadi kesalahan pada server. Silakan coba lagi';
                } else {
                    errorMessage = `Error: ${error.response.status} - ${error.response.statusText}`;
                }
            } else if (error.request) {
                // Network error
                errorMessage = 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda';
            } else if (error.code === 'ECONNABORTED') {
                // Timeout error
                errorMessage = 'Proses koreksi timeout. Silakan coba lagi';
            }

            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsCorrecting(false);
        }
    };

    const resetCorrection = () => {
        setCorrectionResult(null);
        setError(null);
        setIsCorrecting(false);
    };

    const value = {
        isCorrecting,
        correctionResult,
        error,
        submitCorrection,
        resetCorrection
    };

    return (
        <CorrectionContext.Provider value={value}>
            {children}
        </CorrectionContext.Provider>
    );
};