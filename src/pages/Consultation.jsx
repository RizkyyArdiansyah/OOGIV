import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Send, Bot, User, Home, ArrowLeft, Copy, Edit, Link, Paperclip, Youtube, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import ModalKonfirmasi from '../components/confirmModal';
import { useConsultation } from '../contexts/ConsultationContext';

export default function Consultation() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Menggunakan context
  const {
    messages,
    setMessages,
    materialSource,
    setMaterialSource,
    isProcessing,
    isBotCurrentlyResponding,
    processMaterials,
    sendMessage,
    clearConsultationData
  } = useConsultation();

  // Local state untuk UI
  const [inputValue, setInputValue] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editedContent, setEditedContent] = useState('');
  const [isYoutubePopupOpen, setIsYoutubePopupOpen] = useState(false);

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const handleBack = () => {
    navigate('/');
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
    const fileList = Array.from(files);
    const MAX_TOTAL_SIZE = 5 * 1024 * 1024; // 5MB
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain'
    ];

    let totalSize = selectedFiles.reduce((total, file) => total + file.size, 0);
    const acceptedFiles = [];
    const rejectedFiles = [];

    for (const file of fileList) {
      if (!validTypes.includes(file.type)) {
        rejectedFiles.push(`${file.name} memiliki format yang tidak didukung.`);
        continue;
      }

      if (totalSize + file.size > MAX_TOTAL_SIZE) {
        rejectedFiles.push(`Upload size melebihi batas total 5MB.`);
        continue;
      }

      acceptedFiles.push(file);
      totalSize += file.size;
    }

    if (acceptedFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...acceptedFiles]);
    }

    if (rejectedFiles.length > 0) {
      toast.warn(
        <div>
          <p className="ml-1 mr-2 mt-1">
            {rejectedFiles.map((msg, i) => (
              <span key={i} className="text-sm">{msg}</span>
            ))}
          </p>
        </div>,
      );
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleProcessMaterials = async () => {
    if (materialSource === 'upload' && selectedFiles.length === 0) {
      toast.info('Silakan pilih file untuk diproses terlebih dahulu.');
      return;
    }

    if (materialSource === 'youtube' && !youtubeUrl.trim()) {
      toast.info('Silakan masukkan URL YouTube terlebih dahulu.');
      return;
    }

    const result = await processMaterials(
      materialSource === 'upload' ? selectedFiles : [],
      materialSource === 'youtube' ? youtubeUrl : ''
    );

    if (result.success) {
      setSelectedFiles([]);
      setYoutubeUrl('');
      setIsYoutubePopupOpen(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const query = inputValue;
    setInputValue('');

    await sendMessage(query);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const LoadingAnimation = () => (
    <div className="flex items-center space-x-2 p-4 bg-gray-50 rounded-lg">
      <Bot className="w-6 h-6 text-blue-500" />
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
      </div>
      <span className="text-sm text-gray-600">OOGIV sedang memproses...</span>
    </div>
  );

  const handleEditMessage = async (messageId, newContent) => {
    if (!newContent.trim()) return;

    // Hapus hanya pesan yang di-edit
    setMessages(prev => prev.filter(msg => msg.id !== messageId));

    // Kirim ulang pesan yang sudah diubah
    await sendMessage(newContent.trim());
  };


  const isMobile = window.innerWidth < 768;
  const isTablet = window.innerWidth < 1024;
  const textareaStyle = {
    width: isMobile ? '146%' : isTablet ? '284%' : '376%',
  };

  const handleClearMemory = () => {
    // Menggunakan function dari context
    clearConsultationData();
    toast.success('Riwayat berhasil dihapus!');
  };

  const YoutubePopup = () => (
    <div className="mb-1 flex items-center justify-center">
      <div
        className="fixed inset-0"
        onClick={() => setIsYoutubePopupOpen(false)}
      />
      <div className="relative rounded-2xl p-6 w-[60%] mx-auto bg-blue-50 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-red-500 rounded-full">
              <div className="w-4 h-4 rounded flex items-center justify-center">
                <Youtube className='text-white' />
              </div>
            </div>
            <h3 className="text-sm font-semibold text-gray-900">Add YouTube Video</h3>
          </div>
          <button
            onClick={() => setIsYoutubePopupOpen(false)}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="flex w-full gap-x-2 items-center">
          <div className="">
            <input
              type="url"
              placeholder="Paste YouTube URL here..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              className="w-[36rem] px-4 py-2 border border-gray-300 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>

          <button
            onClick={handleProcessMaterials}
            disabled={isProcessing || !youtubeUrl.trim()}
            className="bg-blue-600 text-white px-6 text-sm py-2 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium cursor-pointer"
          >
            {isProcessing ? 'Processing...' : 'Proses'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className=" px-4 py-2 flex items-center justify-between bg-white shadow-md select-none z-50">
        <button
          onClick={handleBack}
          className="lg:block hidden p-2 rounded-lg hover:bg-red-custom hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex md:mx-auto flex-row w-full justify-between items-center md:space-y-2">
          <button
            onClick={handleBack}
            className="lg:hidden p-2 rounded-lg hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
          >
            <Home className="w-5 h-5" />
          </button>
          <div className="flex flex-col text-center mx-auto">
            <h1 className="text-xl font-bold text-slate-800 lg:mb-2">QnA Materi</h1>
            <p className="text-sm text-gray-900 hidden sm:block">
              Bingung dengan materi? <span className="font-medium">Tanya OOGIV</span> mengenai materi yang Anda miliki.
            </p></div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="p-2 rounded-lg hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
          >
            <Trash2 className="w-5 h-5" />
          </button>

        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Chat Container */}
        <div className="flex-1 flex flex-col select-none">
          {/* Messages */}
          <div className="flex-1 w-full overflow-y-auto p-6 space-y-12 md:space-y-4 select-none max-w-[55rem] mx-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start space-x-3 max-w-2xl ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <div className={`aspect-square w-8 rounded-full flex items-center justify-center ${message.type === 'user' ? 'px-2 bg-soft-blue' : 'px-2 bg-black'}`}>
                    {message.type === 'user' ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <span className="text-yellow-custom text-center font-semibold text-2xl" >O.</span>
                    )}
                  </div>
                  <div className={`px-4 py-3 rounded-lg relative group ${message.type === 'user'
                    ? 'bg-gray-50 text-slate-800 select-text'
                    : 'bg-gray-100 text-gray-800 select-text'
                    }`}>

                    {/* Conditional rendering: Edit mode atau normal mode */}
                    {editingMessageId === message.id ? (
                      // Edit Mode
                      <div className="px-10 md:px-40 lg:px-60 space-y-3">
                        <textarea
                          value={editedContent}
                          onChange={(e) => setEditedContent(e.target.value)}
                          className="w-full -ml-10 md:-ml-40 lg:-ml-60 p-2 rounded bg-white text-gray-800 border border-gray-300 resize-none focus:outline-none focus:ring-2 focus:ring-gray-400 box-border"
                          style={textareaStyle}
                          rows={Math.max(4, editedContent.split('\n').length)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.ctrlKey) {
                              handleEditMessage(message.id, editedContent);
                              setEditingMessageId(null);
                              setEditedContent('');
                            }
                          }}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              // Kirim pesan yang sudah di-edit
                              handleEditMessage(message.id, editedContent);
                              setEditingMessageId(null);
                              setEditedContent('');
                            }}
                            className="px-3 py-2 font-medium bg-emerald-400 hover:bg-emerald-600 text-white rounded text-sm active:scale-105"
                          >
                            Simpan
                          </button>
                          <button
                            onClick={() => {
                              setEditingMessageId(null);
                              setEditedContent('');
                            }}
                            className="px-3 py-1 font-medium bg-slate-50 hover:bg-red-500 text-slate-800 hover:text-white rounded text-sm active:scale-105 transition-colors duration-300"
                          >
                            Batalkan
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Normal Mode
                      <>
                        <div className="whitespace-pre-wrap lg:text-md text-sm">
                          {message.content}
                          {message.isStreaming && (
                            <span className="inline-block w-2 h-5 bg-gray-600 ml-1 animate-pulse"></span>
                          )}
                        </div>

                        {/* Buttons - Copy dan Edit */}
                        <div className="flex gap-1">
                          {/* Copy button */}
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(message.content);
                              toast.success('Pesan berhasil disalin!');
                            }}
                            className={`absolute p-1.5 rounded opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200 cursor-pointer ${message.type === 'user'
                              ? 'text-gray-600 hidden'
                              : 'text-gray-600 -bottom-8 left-0'
                              }`}
                            title="Salin"
                          >
                            <Copy className='w-4 h-4' />
                          </button>

                          {/* Edit button - hanya untuk user messages */}
                          {message.type === 'user' && (
                            <button
                              onClick={() => {
                                setEditingMessageId(message.id);
                                setEditedContent(message.content);
                              }}
                              className="absolute p-1.5 rounded transition-opacity duration-200 text-gray-600 hidden cursor-pointer"
                              title="Edit"
                            >
                              <Edit className='w-4 h-4' />
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Only show loading animation when processing */}
            {isProcessing && <LoadingAnimation />}
            <div ref={messagesEndRef} />
          </div>

          {/* Kontainer hanya muncul jika ada file yang dipilih DAN belum diproses */}
          {selectedFiles.length > 0 && (
            <div className="relative inset-0 bg-soft-blue/15 rounded-2xl mx-auto w-[68%] px-4 py-2 mb-1">
              <div className="mt-2 space-y-2">
                <p className="text-sm font-medium text-gray-700">Selected Files:</p>
                <div className="flex flex-row items-center">
                  <div className="max-h-32 w-[30rem] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded-xl">
                        <span className="text-sm text-gray-600 truncate">{file.name}</span>
                        <button
                          onClick={() => removeFile(index)}
                          className="text-red-500 hover:text-red-700 ml-2"
                        >
                          <X className="w-4 h-4 cursor-pointer" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Tombol proses */}
                  <button
                    onClick={handleProcessMaterials}
                    disabled={isProcessing}
                    className="flex items-center w-30 h-10 ml-4 text-sm bg-yellow-custom text-white p-3 rounded-xl hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium cursor-pointer active:scale-105"
                  >
                    {isProcessing ? 'Memproses...' : 'Proses Materi'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Popup Youtube */}
          {isYoutubePopupOpen && <YoutubePopup />}

          {/* Modal Konfirmasi */}
          <ModalKonfirmasi
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onConfirm={handleClearMemory}
          />

          {/* Input */}
          <div className="border-t border-gray-200 bg-white px-4 py-4">
            <div className="border-gray-200 bg-white p-2 md:p-4">
              <div className="flex items-end space-x-3">
                <div className="flex-1 max-w-full">
                  <div className="relative w-full max-w-[50rem] mx-auto border-2 border-gray-300 hover:border-soft-blue rounded-2xl shadow-md bg-white p-4">
                    {/* Textarea */}
                    <textarea
                      placeholder="Konsultasi.."
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      rows="1"
                      className="w-full resize-none border-none focus:ring-0 text-sm focus:outline-none text-gray-700 placeholder-gray-400 pr-16 mb-6"
                      style={{ minHeight: '30px', maxHeight: '120px' }}
                      onInput={(e) => {
                        e.target.style.height = 'auto';
                        e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                      }}
                    />

                    {/* Action Buttons - Bottom Left */}
                    <div className="absolute bottom-4 left-3 flex items-center gap-2 text-gray-500">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        title="Upload File" className="hover:text-blue-custom transition hover:bg-soft-blue/30 p-1 rounded-md cursor-pointer">
                        <Paperclip className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          setIsYoutubePopupOpen(true);
                          setMaterialSource('youtube');
                        }}
                        title="YouTube URL" className="hover:text-blue-custom transition hover:bg-soft-blue/30 p-1 rounded-md cursor-pointer">
                        <Link className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Send Button - Bottom Right */}
                    <button
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim() || isProcessing}
                      className="absolute bottom-1 right-4 p-3 bg-blue-500 text-white rounded-2xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-2"
                    >
                      <Send className="w-4 h-4 md:w-5 md:h-5 rotate-45 mr-1" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}