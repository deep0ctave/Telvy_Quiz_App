import React, { useState, useEffect } from "react";
import {
  getAllQuestionsWithDetails,
  getAllQuizzes,
} from "../../../services/api";

const CreateQuizFromQuestionsModal = ({
  isOpen,
  questions = [],
  onClose,
  onCreateNew,
  onAddToExisting,
}) => {
  const [mode, setMode] = useState("new"); // "new" or "existing"
  const [quizList, setQuizList] = useState([]);
  const [selectedQuizId, setSelectedQuizId] = useState("");
  const [meta, setMeta] = useState({ title: "", description: "", timeLimit: "" });
  const [assign, setAssign] = useState({ user: "", school: "", grade: "", isPublic: false });
  const [selectedQuestionIds, setSelectedQuestionIds] = useState(questions.map(q => q.id));

  useEffect(() => {
    if (mode === "existing") {
      getAllQuizzes().then(setQuizList);
    }
  }, [mode]);

  const toggleQ = (id) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSubmit = () => {
    const selectedQs = questions.filter((q) => selectedQuestionIds.includes(q.id));
    if (mode === "new") {
      onCreateNew({ meta, questions: selectedQs, assign });
    } else {
      onAddToExisting({ quizId: selectedQuizId, questions: selectedQs, assign });
    }
    onClose();
  };

  if (!isOpen) return null;
  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-3xl">
        <h3 className="font-bold text-lg">Add Questions to Quiz</h3>
        <div className="tabs">
          <a className={`tab ${mode === "new" && "tab-active"}`} onClick={() => setMode("new")}>New Quiz</a>
          <a className={`tab ${mode === "existing" && "tab-active"}`} onClick={() => setMode("existing")}>Existing Quiz</a>
        </div>

        {mode === "new" && (
          <div className="space-y-4">
            <input
              placeholder="Quiz Title"
              className="input w-full"
              value={meta.title}
              onChange={(e) => setMeta({ ...meta, title: e.target.value })}
            />
            <textarea
              placeholder="Description"
              className="textarea w-full"
              value={meta.description}
              onChange={(e) => setMeta({ ...meta, description: e.target.value })}
            />
            <input
              type="number"
              placeholder="Time Limit (minutes)"
              className="input w-full"
              value={meta.timeLimit}
              onChange={(e) => setMeta({ ...meta, timeLimit: e.target.value })}
            />
          </div>
        )}

        {mode === "existing" && (
          <select
            className="select w-full"
            value={selectedQuizId}
            onChange={(e) => setSelectedQuizId(e.target.value)}
          >
            <option value="">Select Quiz</option>
            {quizList.map((q) => (
              <option key={q.id} value={q.id}>{q.title}</option>
            ))}
          </select>
        )}

        <div className="divider" />

        <h4 className="font-semibold">Assign Quiz To:</h4>
        <div className="grid grid-cols-2 gap-4">
          <input
            placeholder="User ID"
            className="input"
            value={assign.user}
            onChange={(e) => setAssign({ ...assign, user: e.target.value })}
          />
          <input
            placeholder="School ID"
            className="input"
            value={assign.school}
            onChange={(e) => setAssign({ ...assign, school: e.target.value })}
          />
          <input
            placeholder="Grade"
            className="input"
            value={assign.grade}
            onChange={(e) => setAssign({ ...assign, grade: e.target.value })}
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="checkbox"
              checked={assign.isPublic}
              onChange={(e) => setAssign({ ...assign, isPublic: e.target.checked })}
            />
            Make Public
          </label>
        </div>

        <div className="divider" />

        <h4 className="font-semibold">Selected Questions ({selectedQuestionIds.length}):</h4>
        <div className="overflow-y-auto max-h-40">
          {questions.map((q) => (
            <label key={q.id} className="flex gap-2 items-center">
              <input
                type="checkbox"
                className="checkbox"
                checked={selectedQuestionIds.includes(q.id)}
                onChange={() => toggleQ(q.id)}
              />
              <span>{q.question_text} ({q.question_type}, {q.difficulty})</span>
            </label>
          ))}
        </div>

        <div className="modal-action">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit}>Save</button>
        </div>
      </div>
    </div>
  );
};

export default CreateQuizFromQuestionsModal;
