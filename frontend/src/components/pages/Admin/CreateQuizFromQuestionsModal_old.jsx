import React, { useState } from "react";
import { X, Pencil, Trash2 } from "lucide-react";

const mockQuizzes = [
  { id: 1, title: "Math Basics" },
  { id: 2, title: "Science Quiz" },
  { id: 3, title: "History Round 1" },
];

export default function CreateQuizFromQuestionsModal({
  questions = [],            // ✅ default to empty array
  onClose,
  onCreateNew = () => {},    // ✅ default no-op
  onAddToExisting = () => {},
  onEdit = () => {},
  onDelete = () => {},
}) {
  const [selected, setSelected] = useState([]);
  const [mode, setMode] = useState("new");
  const [quizTitle, setQuizTitle] = useState("");
  const [existingQuizId, setExistingQuizId] = useState("");

  const toggleSelected = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((q) => q !== id) : [...prev, id]
    );
  };

  const handleSubmit = () => {
    const selectedQuestions = questions.filter((q) => selected.includes(q.id));
    if (selectedQuestions.length === 0) return alert("Select at least one question.");

    if (mode === "new") {
      if (!quizTitle.trim()) return alert("Enter a quiz title.");
      onCreateNew({ title: quizTitle, questions: selectedQuestions });
    } else {
      if (!existingQuizId) return alert("Select an existing quiz.");
      onAddToExisting({ quizId: existingQuizId, questions: selectedQuestions });
    }

    onClose();
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-4xl overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between mb-4">
          <h3 className="text-lg font-bold">Create Quiz from Questions</h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm">
            <X />
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="tabs tabs-boxed mb-4">
          <a
            className={`tab ${mode === "new" ? "tab-active" : ""}`}
            onClick={() => setMode("new")}
          >
            New Quiz
          </a>
          <a
            className={`tab ${mode === "existing" ? "tab-active" : ""}`}
            onClick={() => setMode("existing")}
          >
            Add to Existing
          </a>
        </div>

        {mode === "new" ? (
          <input
            type="text"
            className="input input-bordered w-full mb-4"
            placeholder="Enter new quiz title..."
            value={quizTitle}
            onChange={(e) => setQuizTitle(e.target.value)}
          />
        ) : (
          <select
            className="select select-bordered w-full mb-4"
            value={existingQuizId}
            onChange={(e) => setExistingQuizId(e.target.value)}
          >
            <option value="">Select a quiz</option>
            {mockQuizzes.map((quiz) => (
              <option key={quiz.id} value={quiz.id}>
                {quiz.title}
              </option>
            ))}
          </select>
        )}

        {/* Questions List */}
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th></th>
                <th>Question</th>
                <th>Type</th>
                <th>Tags</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {questions.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center text-base-content/60 py-6">
                    No questions available.
                  </td>
                </tr>
              ) : (
                questions.map((q) => (
                  <tr key={q.id}>
                    <td>
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={selected.includes(q.id)}
                        onChange={() => toggleSelected(q.id)}
                      />
                    </td>
                    <td>{q.question_text}</td>
                    <td>
                      <span className="badge badge-outline capitalize">
                        {q.question_type}
                      </span>
                    </td>
                    <td>
                      {q.tags?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {q.tags.map((tag, idx) => (
                            <span key={idx} className="badge badge-ghost text-xs">
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="flex gap-2">
                      <button className="btn btn-sm btn-info" onClick={() => onEdit(q)}>
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button className="btn btn-sm btn-error" onClick={() => onDelete(q.id)}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="modal-action">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            {mode === "new" ? "Create Quiz" : "Add to Quiz"}
          </button>
        </div>
      </div>
    </div>
  );
}
