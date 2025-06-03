import React, { useState, useEffect } from 'react';
import { BookOpen, CheckCircle, MessageCircle, FileText, Brain, NotebookPen, School } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';

const HomePage = () => {
    const [activeCard, setActiveCard] = useState(null);
    const [typedText, setTypedText] = useState('');
    const [isTypingComplete, setIsTypingComplete] = useState(false);
    const navigate = useNavigate();

    const fullText = 'Welcome to OOGIV !';

    // Typing animation effect
    useEffect(() => {
        let timeout;
        if (typedText.length < fullText.length) {
            timeout = setTimeout(() => {
                setTypedText(fullText.slice(0, typedText.length + 1));
            }, 100);
        } else {
            setIsTypingComplete(true);
        }
        return () => clearTimeout(timeout);
    }, [typedText, fullText]);

    const features = [
        {
            id: 'generate',
            title: 'Buat Soal / Kuis',
            icon: <FileText className="w-8 h-8" />,
            description: 'Unggah materi dalam format PDF, PPT, atau DOCX, dan OOGIV akan otomatis membuat soal lengkap dengan kunci jawaban siap diunduh dalam format PDF dan TXT.',
            color: 'bg-red-custom',
            titleColor: 'text-red-custom',
            bgPattern: 'bg-white',
            borderColor: 'border-red-custom',
            route: '/generate'
        },
        {
            id: 'consultation',
            title: 'Konsultasi Materi',
            icon: <MessageCircle className="w-8 h-8" />,
            description: 'Unggah materi ajar kamu — PDF, PPT, DOCX, TXT, bahkan tautan YouTube — dan dapatkan bantuan dari AI yang siap menjawab pertanyaanmu secara langsung.',
            color: 'bg-yellow-custom/80',
            titleColor: 'text-yellow-custom',
            bgPattern: 'bg-white',
            borderColor: 'border-yellow-custom',
            route: '/consultation'
        },
        {
            id: 'correction',
            title: 'Koreksi Otomatis',
            icon: <CheckCircle className="w-8 h-8" />,
            description: 'Unggah jawaban siswa dalam format DOCX atau TXT, dan OOGIV akan langsung melakukan koreksi otomatis, sehingga dapat menghemat waktu penilaian.',
            color: 'bg-blue-custom',
            titleColor: 'text-blue-custom',
            bgPattern: 'bg-white',
            borderColor: 'border-blue-custom',
            route: '/correction'
        }
    ];

    const handleCardClick = (feature) => {
        if (feature.id === 'correction') {
            toast.info('Fitur akan segera hadir');
            return;
        }
        navigate(feature.route);
    };

    return (
        <div className="min-h-[100vh] bg-gray-100 relative overflow-hidden">
            {/* Floating Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Animated geometric shapes */}
                <div className="absolute bottom-6 left-1 w-32 h-32 bg-gradient-to-br from-red-custom/70 to-transparent rounded-full animate-float-slow"></div>
                <div className="absolute bottom-6 right-1 w-32 h-32 bg-gradient-to-bl from-blue-custom/70 to-transparent rounded-full animate-float-slow"></div>

                {/* Book icons floating */}
                <div className="lg:block hidden absolute top-[10%] right-1/5 text-soft-blue animate-book-float-1">
                    <BookOpen className="w-12 h-12" />
                </div>
                <div className="lg:block hidden absolute top-[30%] right-[10%] text-soft-blue animate-book-float-1">
                    <NotebookPen className="w-12 h-12" />
                </div>
                <div className="lg:block hidden absolute top-[30%] left-[10%] text-red-custom animate-book-float-2">
                    <Brain className="w-10 h-10" />
                </div>
                <div className="lg:block hidden absolute top-[10%] left-1/5 text-red-custom animate-book-float-2">
                    <School className="w-10 h-10" />
                </div>
            </div>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 relative z-10">
                {/* Hero Section */}
                <div className="text-center mb-12 md:mb-24 select-none">
                    <div className="animate-fade-in-up">
                        <h2 className='font-bold text-[1.7rem] md:text-5xl mb-8 text-black/80 min-h-[3rem] md:min-h-[4rem]'>
                            {typedText.split('OOGIV !').map((part, index) => (
                                <span key={index}>
                                    {part}
                                    {index === 0 && typedText.includes('OOGIV !') && (
                                        <span className='bg-gradient-to-r from-red-custom from-10% via-yellow-custom via-40% to-blue-custom to-80% bg-clip-text text-transparent animate-gradient-pulse'>
                                            OOGIV !
                                        </span>
                                    )}
                                </span>
                            ))}
                            {!isTypingComplete && (
                                <span className="animate-cursor-blink text-red-custom">|</span>
                            )}
                        </h2>
                    </div>
                    <div className="animate-fade-in-up-delay">
                        <p className="text-[0.8rem] md:text-lg text-slate-800/75 max-w-3xl mx-auto font-medium">
                            Dengan teknologi AI yang mudah digunakan, OOGIV otomatis menyusun materi, membuat soal, dan mengoreksi tugas langsung dari file Anda.
                        </p>
                    </div>
                </div>

                {/* Features Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-9 md:gap-8 px-4 md:px-6 max-w-7xl mx-auto mb-12 md:mb-20">
                    {features.map((feature, index) => (
                        <div
                            key={feature.id}
                            className={`relative group cursor-pointer transform transition-all duration-300 hover:scale-105 ${activeCard === feature.id ? 'scale-105' : ''} ${index === 2 ? 'md:col-span-2 md:justify-self-center md:max-w-sm lg:col-span-1 lg:max-w-none' : ''
                                } animate-card-fade-in`}
                            style={{ animationDelay: `${index * 200}ms` }}
                            onMouseEnter={() => setActiveCard(feature.id)}
                            onMouseLeave={() => setActiveCard(null)}
                            onClick={() => handleCardClick(feature)}
                        >
                            {/* Subtle glow effect on hover */}
                            <div className="absolute inset-0 rounded-4xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                <div className={`absolute inset-0 bg-gradient-to-r ${feature.color} blur-xl opacity-20 rounded-4xl animate-pulse-soft`}></div>
                            </div>

                            <div
                                className={`h-full ${feature.bgPattern} rounded-4xl p-6 shadow-lg border-b-8 ${feature.borderColor} border-t-0 transition-all duration-300 group-hover:shadow-2xl relative overflow-hidden flex flex-col backdrop-blur-sm`}
                            >
                                {/* Coming Soon Overlay for Correction Card */}
                                {feature.id === 'correction' && activeCard === 'correction' && (
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/95 to-blue-50/50 backdrop-blur-sm flex items-center justify-center z-20 opacity-0 scale-90 hover:opacity-100 hover:scale-100 transition-all duration-500 ease-out rounded-2xl">
                                        {/* Main Coming Soon Text */}
                                        <div className="relative">
                                            <span className="text-blue-800 font-bold text-xl animate-float shimmer-text relative z-10">
                                                Coming Soon
                                            </span>

                                            {/* Pulse dots */}
                                            <div className="absolute -left-6 top-[55%] transform -translate-y-1/2">
                                                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                                            </div>
                                            <div className="absolute -right-6 top-[55%] transform -translate-y-1/2">
                                                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                                            </div>
                                        </div>

                                        {/* Floating particles */}
                                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                            <div className="absolute w-2 h-2 bg-blue-400 rounded-full animate-particle-1" style={{ left: '20%' }}></div>
                                            <div className="absolute w-2 h-2 bg-blue-400 rounded-full animate-particle-2" style={{ left: '40%' }}></div>
                                            <div className="absolute w-2 h-2 bg-blue-400 rounded-full animate-particle-3" style={{ left: '60%' }}></div>
                                            <div className="absolute w-2 h-2 bg-blue-400 rounded-full animate-particle-4" style={{ left: '80%' }}></div>
                                        </div>
                                    </div>
                                )}

                                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300 rounded-2xl`}></div>

                                {/* Icon */}
                                <div className={`inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r ${feature.color} rounded-xl mb-4 text-white shadow-lg shrink-0 group-hover:animate-icon-bounce`}>
                                    {feature.icon}
                                </div>

                                {/* Content */}
                                <div className="flex flex-col flex-grow relative z-10">
                                    <h3 className={`text-lg md:text-xl font-bold mt-2 ${feature.titleColor} mb-3 group-hover:opacity-90 transition-colors duration-200`}>
                                        {feature.title}
                                    </h3>
                                    <p className="text-gray-600 text-justify leading-relaxed text-sm group-hover:text-gray-700 transition-colors duration-200 mb-6 flex-grow">
                                        {feature.description}
                                    </p>

                                    {/* Get Started Button - Always visible on mobile/tablet */}
                                    <div className="block lg:hidden">
                                        <button
                                            className={`w-full py-3 px-4 bg-gradient-to-r ${feature.color} text-white font-medium rounded-xl hover:opacity-90 transition-all duration-200 text-sm shadow-md hover:shadow-lg transform hover:scale-105`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCardClick(feature);
                                            }}
                                        >
                                            Get Started
                                        </button>
                                    </div>
                                </div>

                                {/* Hover Arrow Icon - Only visible on desktop */}
                                <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300 hidden lg:block">
                                    <div className={`w-8 h-8 bg-gradient-to-r ${feature.color} rounded-full flex items-center justify-center text-white shadow-lg group-hover:animate-arrow-bounce`}>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            <footer className="bg-gray-100 shadow-lg relative z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 mt-1">
                    <div className="flex items-center justify-center">
                        <p className="text-slate-800/75 text-xs md:text-sm font-bold text-center animate-fade-in">
                            © 2025 OOGIV - Made with ♥ for all teachers
                        </p>
                    </div>
                </div>
            </footer>
            
        </div>
    );
};

export default HomePage;