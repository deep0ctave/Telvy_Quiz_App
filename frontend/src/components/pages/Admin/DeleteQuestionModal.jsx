import React from "react";

const DeleteQuestionModal = ({ isOpen, question, onClose, onConfirm }) => {
  if (!isOpen || !question) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-base-100 rounded-box p-6 w-full max-w-md shadow-xl space-y-4">
        <h3 className="text-xl font-bold text-error">Delete Question</h3>
        <p>
          Are you sure you want to delete the question:
        </p>
        <blockquote className="border-l-4 border-error pl-4 italic text-sm text-base-content/80">
          {question.question_text}
        </blockquote>

        <div className="flex justify-end gap-2 mt-4">
          <button className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-error" onClick={() => onConfirm(question.id)}>
            Yes, Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteQuestionModal;
