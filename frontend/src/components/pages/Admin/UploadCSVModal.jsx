import React, { useState } from "react";

const UploadCsvModal = ({ isOpen, onClose, onUpload }) => {
  const [file, setFile] = useState(null);

  const handleSubmit = () => {
    if (!file) return alert("Choose a CSV file first");
    onUpload(file);
  };

  if (!isOpen) return null;
  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Upload Questions CSV</h3>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files[0])}
          className="file-input file-input-bordered w-full my-4"
        />
        <div className="modal-action">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            Upload
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadCsvModal;
