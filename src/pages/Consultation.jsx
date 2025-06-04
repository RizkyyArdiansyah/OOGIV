import React, { useState, useRef, useEffect } from 'react';
import { Menu, X, Upload, Send, Bot, User, Home, ArrowLeft, Copy, Edit } from 'lucide-react';
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

  const Sidebar = () => {
    // Function to handle clearing memory
    const handleClearMemory = () => {
      // Menggunakan function dari context
      clearConsultationData();
      toast.success('Riwayat berhasil dihapus!');
    };

    return (
      <div className="bg-white p-6 border-r border-gray-200 h-full select-none">
        <div className="mb-6">
          <h3 className="text-md font-semibold text-gray-900 mb-4">Sumber Materi</h3>

          <div className="flex gap-x-3 mb-6">
            <div className="flex flex-row w-full gap-x-2">
              <div className="rounded-xl border-soft-blue bg-blue-50 border-2 px-3 py-4">
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="materialSource"
                    value="upload"
                    checked={materialSource === 'upload'}
                    onChange={(e) => {
                      setMaterialSource(e.target.value);
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-[0.7rem] text-gray-800">Upload Files</span>
                </label>
              </div>

              <div className="rounded-xl border-soft-blue bg-blue-50 border-2 px-3 py-4">
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="materialSource"
                    value="youtube"
                    checked={materialSource === 'youtube'}
                    onChange={(e) => {
                      const selectedValue = e.target.value;

                      if (selectedValue === 'youtube') {
                        toast.info('Fitur YouTube belum tersedia!');
                        return; // Mencegah perubahan state
                      }

                      setMaterialSource(selectedValue);
                    }}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <span className="text-[0.7rem] text-gray-800">Video YouTube</span>
                </label>
              </div>
            </div>
          </div>

          {materialSource === 'youtube' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gunakan Video YouTube
              </label>
              <input
                type="url"
                placeholder="https://youtu.be/xxxxx"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {materialSource === 'upload' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload File Materi
              </label>

              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                  }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 mb-2">Drag and drop files here</p>
                <p className="text-xs text-gray-500 mb-4">
                  Limit 5MB per file • PDF, DOCX, PPTX, TXT
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Browse files
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.pptx,.txt,"
                onChange={handleFileSelect}
                className="hidden"
              />

              {selectedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-gray-700">Selected Files:</p>
                  <div className="max-h-32 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
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
                </div>
              )}
            </div>
          )}

          <div className="flex gap-x-2 ">
            <button
              onClick={handleProcessMaterials}
              disabled={isProcessing}
              className="w-full text-sm bg-yellow-custom text-white py-3 rounded-xl hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium cursor-pointer active:scale-105"
            >
              {isProcessing ? 'Memproses...' : 'Proses Materi'}
            </button>

            {/* Clear Memory Button */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full text-sm bg-red-custom text-white rounded-xl hover:bg-red-500 transition-colors font-medium cursor-pointer active:scale-105"
            >
              Hapus Memory
            </button>
          </div>

          {/* Modal Konfirmasi */}
          <ModalKonfirmasi
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onConfirm={handleClearMemory}
          />

        </div>
      </div>
    );
  };

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
        <div className="flex md:mx-auto lg:flex-col w-full justify-between items-center md:space-y-2">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex flex-col text-center">
            <h1 className="text-xl font-bold text-slate-800 mb-2">QnA Materi</h1>
            <p className="text-sm text-gray-900 hidden sm:block">
              Bingung dengan materi? <span className="font-medium">Tanya OOGIV</span> mengenai materi yang Anda miliki.
            </p></div>
          <button
            onClick={handleBack}
            className="lg:hidden p-2 rounded-lg hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
          >
            <Home className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Desktop */}
        <div className="hidden lg:block w-80 bg-white border-r border-gray-200">
          <Sidebar />
        </div>

        {/* Sidebar - Mobile Overlay */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex select-none">
            <div
              className="fixed inset-0 bg-transparent backdrop-blur-md bg-opacity-50 transition-opacity "
              onClick={() => setSidebarOpen(false)}
            />
            <div className="relative bg-white w-80 h-full shadow-xl transform transition-transform duration-600 ease-in-out translate-x-0">
              <div className="absolute top-4 right-4">
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <Sidebar />
            </div>
          </div>
        )}

        {/* Chat Container */}
        <div className="flex-1 flex flex-col select-none">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-12 md:space-y-4 select-none">
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
                    ? 'bg-gray-50 text-slate-800'
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
                              ? 'text-gray-600 -top-5 right-8'
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
                              className="absolute p-1.5 rounded transition-opacity duration-200 text-gray-600 -top-5 right-0 cursor-pointer"
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

          {/* Input */}
          <div className="border-t border-gray-200 bg-white p-4">
            <div className="border-gray-200 bg-white p-1 md:p-4">
              <div className="flex items-end space-x-3">
                <div className="flex-1 max-w-full">
                  <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Tanya..."
                    className="w-full max-w-full overflow-hidden px-4 py-3 border rounded-2xl border-blue-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="1"
                    style={{ minHeight: '44px', maxHeight: '120px' }}
                    onInput={(e) => {
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                    }}
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isProcessing}
                  className="p-3 bg-blue-500 text-white rounded-2xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-2"
                >
                  <Send className="w-5 h-5 rotate-45 mr-1" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}