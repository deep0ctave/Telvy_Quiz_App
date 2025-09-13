import React, { useState } from "react";
import { updateQuestionById, getQuestionById } from "../../../services/api";
import { toast } from "react-toastify";

const EditQuestionModal = ({ question, onClose, onSave }) => {
  const [form, setForm] = useState({
    ...question,
    tags: question.tags?.join(", ") || "",
    options:
      question.question_type === "mcq"
        ? (question.options || []).map(opt => opt.text || opt)
        : question.question_type === "truefalse"
        ? ["True", "False"]
        : [],
    correct_answers: question.correct_answers || [],
  });

  const [error, setError] = useState("");

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
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

      await updateQuestionById(question.id, payload);
      toast.success("Question updated successfully");
      // Fetch the updated question data
      const updatedQuestion = await getQuestionById(question.id);
      onSave(updatedQuestion);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to update question");
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl overflow-y-auto max-h-[90vh]">
        <h3 className="text-xl font-bold mb-4">Edit Question</h3>

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
                  options: type === "mcq" ? ["", ""] : type === "truefalse" ? ["True", "False"] : [],
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
              value={form.difficulty || "medium"}
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
              value={form.time_limit || 30}
              onChange={(e) => handleChange("time_limit", parseInt(e.target.value) || 0)}
              min="0"
            />
          </fieldset>

          <fieldset>
            <legend className="label">Image URL (optional)</legend>
            <input
              type="url"
              className="input input-bordered w-full"
              placeholder="https://example.com/image.jpg"
              value={form.image_url || ""}
              onChange={(e) => handleChange("image_url", e.target.value)}
            />
            {form.image_url && (
              <div className="mt-2">
                <img 
                  src={form.image_url} 
                  alt="Question preview" 
                  className="max-w-full h-32 object-contain rounded border"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            )}
          </fieldset>

                      {["mcq", "truefalse"].includes(form.question_type) && (
            <fieldset className="space-y-2">
              <legend className="label">Options</legend>
              {form.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="font-mono text-sm bg-base-200 rounded px-2 py-1">
                    {String.fromCharCode(97 + i)}
                  </span>
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
              onChange={(e) => handleChange("correct_answers", [e.target.value])}
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
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditQuestionModal;
