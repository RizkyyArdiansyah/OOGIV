import React, { createContext, useContext, useState, useRef } from 'react';
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
    const [correctionStats, setCorrectionStats] = useState(null);
    const [error, setError] = useState(null);

    // Step management states
    const [currentStep, setCurrentStep] = useState(0);
    const [correctionComplete, setCorrectionComplete] = useState(false);

    // File reset callback - will be set by the component
    const [resetFilesCallback, setResetFilesCallback] = useState(null);

    // Function to calculate statistics from the correction results
    const calculateStats = (hasilNilai) => {
        if (!hasilNilai || !Array.isArray(hasilNilai) || hasilNilai.length === 0) {
            return null;
        }

        const totalSiswa = hasilNilai.length;
        const totalNilai = hasilNilai.reduce((sum, siswa) => sum + siswa.nilai, 0);
        const nilaiRataRata = Math.round(totalNilai / totalSiswa * 100) / 100; // Round to 2 decimal places
        const nilaiTertinggi = Math.max(...hasilNilai.map(siswa => siswa.nilai));

        // Calculate total wrong answers for each student
        const studentsWithWrongCount = hasilNilai.map(siswa => {
            const totalSoal = Object.keys(siswa.koreksi).length;
            const jumlahSalah = totalSoal - siswa.jumlah_benar;

            return {
                nama: siswa.nama,
                jumlah_benar: siswa.jumlah_benar,
                jumlah_salah: jumlahSalah,
                nilai: siswa.nilai,
                jawaban_siswa: siswa.jawaban_siswa,
                koreksi: siswa.koreksi
            };
        });

        return {
            totalSiswa,
            nilaiRataRata,
            nilaiTertinggi,
            students: studentsWithWrongCount
        };
    };

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
        setCorrectionStats(null);

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
                const oogiv_response = response.data.oogiv_response;

                // Check if hasil_nilai exists and is an array
                if (oogiv_response.hasil_nilai && Array.isArray(oogiv_response.hasil_nilai)) {
                    // Set the main correction result
                    setCorrectionResult(oogiv_response);

                    // Calculate and set statistics
                    const stats = calculateStats(oogiv_response.hasil_nilai);
                    setCorrectionStats(stats);

                    // Mark correction as complete and move to final step
                    setCorrectionComplete(true);
                    setCurrentStep(2);

                    toast.success('Koreksi berhasil diselesaikan!');
                } else {
                    throw new Error('Format hasil_nilai tidak valid atau tidak ditemukan');
                }
            } else {
                throw new Error('Format response tidak valid - oogiv_response tidak ditemukan');
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
            } else if (error.message) {
                // Custom error messages
                errorMessage = error.message;
            }

            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsCorrecting(false);
        }
    };

    const resetCorrection = () => {
        setCorrectionResult(null);
        setCorrectionStats(null);
        setError(null);
        setIsCorrecting(false);
        // Reset step states
        setCurrentStep(0);
        setCorrectionComplete(false);
        
        // Reset file inputs if callback is available
        if (resetFilesCallback && typeof resetFilesCallback === 'function') {
            resetFilesCallback();
        }
    };

    // Helper function to go to next step
    const nextStep = () => {
        if (currentStep < 2) {
            setCurrentStep(currentStep + 1);
        }
    };

    // Helper function to go to previous step
    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const value = {
        isCorrecting,
        correctionResult,
        correctionStats,
        error,
        submitCorrection,
        resetCorrection,
        // Step management
        currentStep,
        setCurrentStep,
        correctionComplete,
        setCorrectionComplete,
        nextStep,
        prevStep,
        // File reset callback management
        setResetFilesCallback,
    };

    return (
        <CorrectionContext.Provider value={value}>
            {children}
        </CorrectionContext.Provider>
    );
};