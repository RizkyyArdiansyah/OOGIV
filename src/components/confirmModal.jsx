// components/ModalKonfirmasi.jsx
import React from 'react';

const ModalKonfirmasi = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-lg bg-opacity-70">
      <div className="bg-gray-200 w-[80%] max-w-md p-6 rounded-lg shadow-lg">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Yakin ingin hapus semua riwayat?
        </h2>
        <p className="text-gray-600 mb-6">
          Riwayat chat akan dihapus !
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded bg-gray-200 hover:bg-gray-300 text-gray-800 cursor-pointer"
          >
            Batal
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 text-sm rounded bg-red-600 hover:bg-red-700 text-white cursor-pointer"
          >
            Ya, hapus!
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalKonfirmasi;
