// File: components/pages/Questions/ViewQuestionModal.jsx
import React from "react";

const ViewQuestionModal = ({ question, onClose }) => {
  const formatOptions = (options) => {
    if (!options || !Array.isArray(options)) return "N/A";
    return options.map((opt, index) => (
      <div key={index} className="flex items-center gap-2 mb-1">
        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
          {opt.id || String.fromCharCode(97 + index)}
        </span>
        <span>{opt.text || opt}</span>
      </div>
    ));
  };

  const formatCorrectAnswers = (correctAnswers) => {
    if (!correctAnswers || !Array.isArray(correctAnswers)) return "N/A";
    return correctAnswers.join(", ");
  };

  const formatTags = (tags) => {
    if (!tags || !Array.isArray(tags) || tags.length === 0) return "No tags";
    return tags.map((tag, index) => (
      <span
        key={index}
        className="badge badge-outline badge-sm mr-1 mb-1"
      >
        {tag}
      </span>
    ));
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case "easy":
        return "badge-success";
      case "medium":
        return "badge-warning";
      case "hard":
        return "badge-error";
      default:
        return "badge-neutral";
    }
  };

  const getQuestionTypeLabel = (type) => {
    switch (type) {
      case "mcq":
        return "Multiple Choice";
      case "truefalse":
        return "True/False";
      case "typed":
        return "Type In";
      default:
        return type;
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl overflow-y-auto max-h-[90vh]">
        <h3 className="text-xl font-bold mb-4">Question Details</h3>

        <div className="space-y-4">
          {/* Question Text */}
          <fieldset>
            <legend className="label font-semibold">Question Text</legend>
            <div className="p-3 bg-gray-50 rounded-lg">
              {question.question_text || "N/A"}
            </div>
          </fieldset>

          {/* Question Type */}
          <fieldset>
            <legend className="label font-semibold">Question Type</legend>
            <div className="flex items-center gap-2">
              <span className="badge badge-primary">
                {getQuestionTypeLabel(question.question_type)}
              </span>
            </div>
          </fieldset>

          {/* Difficulty */}
          <fieldset>
            <legend className="label font-semibold">Difficulty</legend>
            <div className="flex items-center gap-2">
              <span className={`badge ${getDifficultyColor(question.difficulty)}`}>
                {question.difficulty || "Not set"}
              </span>
            </div>
          </fieldset>

          {/* Time Limit */}
          <fieldset>
            <legend className="label font-semibold">Time Limit</legend>
            <div className="flex items-center gap-2">
              <span className="text-lg">
                {question.time_limit ? `${question.time_limit} seconds` : "No limit"}
              </span>
            </div>
          </fieldset>

          {/* Tags */}
          <fieldset>
            <legend className="label font-semibold">Tags</legend>
            <div className="flex flex-wrap gap-1">
              {formatTags(question.tags)}
            </div>
          </fieldset>

          {/* Options (for MCQ and True/False) */}
          {["mcq", "truefalse"].includes(question.question_type) && (
            <fieldset>
              <legend className="label font-semibold">Options</legend>
              <div className="space-y-1">
                {formatOptions(question.options)}
              </div>
            </fieldset>
          )}

          {/* Correct Answer */}
          <fieldset>
            <legend className="label font-semibold">Correct Answer</legend>
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <span className="font-medium text-green-800">
                {formatCorrectAnswers(question.correct_answers)}
              </span>
            </div>
          </fieldset>

          {/* Metadata */}
          <div className="divider"></div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold">Created:</span>
              <div className="text-gray-600">
                {question.created_at 
                  ? new Date(question.created_at).toLocaleString()
                  : "N/A"
                }
              </div>
            </div>
            <div>
              <span className="font-semibold">Last Updated:</span>
              <div className="text-gray-600">
                {question.updated_at 
                  ? new Date(question.updated_at).toLocaleString()
                  : "N/A"
                }
              </div>
            </div>
            <div>
              <span className="font-semibold">Question ID:</span>
              <div className="text-gray-600">#{question.id}</div>
            </div>
            <div>
              <span className="font-semibold">Created By:</span>
              <div className="text-gray-600">
                {question.created_by || "Unknown"}
              </div>
            </div>
          </div>
        </div>

        <div className="modal-action justify-end mt-6">
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewQuestionModal;
