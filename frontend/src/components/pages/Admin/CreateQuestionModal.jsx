import React, { useState } from "react";
import { createQuestion, getQuestionById } from "../../../services/api";
import { toast } from "react-toastify";

const defaultQuestion = {
  question_text: "",
  question_type: "mcq",
  options: ["", ""],
  correct_answers: [],
  difficulty: "medium",
  tags: "",
  time_limit: 30,
};

const CreateQuestionModal = ({ onClose, onCreate }) => {
  const [form, setForm] = useState(defaultQuestion);
  const [error, setError] = useState("");

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCorrectAnswerChange = (value) => {
    // For MCQ and True/False, store as array
    if (form.question_type === "mcq" || form.question_type === "truefalse") {
      setForm((prev) => ({ ...prev, correct_answers: [value] }));
    } else {
      // For type_in, store as array with single value
      setForm((prev) => ({ ...prev, correct_answers: [value] }));
    }
  };

  const handleOptionChange = (i, value) => {
    const newOptions = [...form.options];
    newOptions[i] = value;
    setForm((prev) => ({ ...prev, options: newOptions }));
  };

  const addOption = () => {
    setForm((prev) => ({ ...prev, options: [...prev.options, ""] }));
  };

  const removeOption = (i) => {
    setForm((prev) => ({
      ...prev,
      options: prev.options.filter((_, idx) => idx !== i),
    }));
  };

  const validate = () => {
    if (!form.question_text.trim()) return "Question text is required";
    if (form.question_type === "mcq" && form.options.some((o) => o.trim() === ""))
      return "All options must be filled";
    if (form.question_type === "mcq" && !form.options.includes(form.correct_answers[0]))
      return "Correct answer must match one of the options";
    if (form.question_type === "typed" && !form.correct_answers[0]?.trim())
      return "Correct answer is required";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) return setError(err);

    try {
      const payload = {
        question_text: form.question_text,
        question_type: form.question_type,
        time_limit: form.time_limit,
        difficulty: form.difficulty,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t !== ""),
        options: form.question_type === "mcq" || form.question_type === "truefalse" 
          ? form.options.map((opt, i) => ({ id: String.fromCharCode(97 + i), text: opt }))
          : null,
        correct_answers: form.correct_answers,
      };

      const res = await createQuestion(payload);
      // Fetch the complete question data
      const newQuestion = await getQuestionById(res.id);
      onCreate(newQuestion);
      toast.success("Question created successfully");
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to create question");
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl overflow-y-auto max-h-[90vh]">
        <h3 className="text-xl font-bold mb-4">Create New Question</h3>

        {error && <div className="alert alert-error mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <fieldset>
            <legend className="label">Question Text</legend>
            <textarea
              className="textarea textarea-bordered w-full"
              rows={3}
              value={form.question_text}
              onChange={(e) => handleChange("question_text", e.target.value)}
            />
          </fieldset>

          <fieldset>
            <legend className="label">Question Type</legend>
            <select
              className="select select-bordered w-full"
              value={form.question_type}
              onChange={(e) => {
                const type = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  question_type: type,
                  options:
                    type === "mcq" ? ["", ""] : type === "truefalse" ? ["True", "False"] : [],
                  correct_answers: [],
                }));
              }}
            >
              <option value="mcq">Multiple Choice</option>
              <option value="truefalse">True / False</option>
              <option value="typed">Type In</option>
            </select>
          </fieldset>

          <fieldset>
            <legend className="label">Difficulty</legend>
            <select
              className="select select-bordered w-full"
              value={form.difficulty}
              onChange={(e) => handleChange("difficulty", e.target.value)}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </fieldset>

          <fieldset>
            <legend className="label">Time Limit (seconds)</legend>
            <input
              type="number"
              className="input input-bordered w-full"
              value={form.time_limit}
              onChange={(e) => handleChange("time_limit", parseInt(e.target.value) || 0)}
              min="0"
            />
          </fieldset>

                      {["mcq", "truefalse"].includes(form.question_type) && (
            <fieldset className="space-y-2">
              <legend className="label">Options</legend>
              {form.options.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    value={opt}
                    onChange={(e) => handleOptionChange(i, e.target.value)}
                  />
                  {form.question_type === "mcq" && (
                    <button
                      type="button"
                      className="btn btn-sm btn-error"
                      onClick={() => removeOption(i)}
                      disabled={form.options.length <= 2}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {form.question_type === "mcq" && (
                <button type="button" className="btn btn-sm btn-outline" onClick={addOption}>
                  + Add Option
                </button>
              )}
            </fieldset>
          )}

          <fieldset>
            <legend className="label">Correct Answer</legend>
            <input
              type="text"
              className="input input-bordered w-full"
              value={form.correct_answers[0] || ""}
              onChange={(e) => handleCorrectAnswerChange(e.target.value)}
              placeholder={
                form.question_type === "typed" ? "Type the correct answer" : "Must match an option"
              }
            />
          </fieldset>

          <fieldset>
            <legend className="label">Tags (comma-separated)</legend>
            <input
              type="text"
              className="input input-bordered w-full"
              value={form.tags}
              onChange={(e) => handleChange("tags", e.target.value)}
            />
          </fieldset>

          <div className="modal-action justify-end mt-6">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateQuestionModal;
