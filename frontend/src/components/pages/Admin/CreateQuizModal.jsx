// File: components/pages/Admin/CreateQuizModal.jsx
import React, { useState } from "react";
import { createQuiz } from "../../../services/api";
import { toast } from "react-hot-toast";

const CreateQuizModal = ({ onClose, onCreate }) => {
  const [form, setForm] = useState({
    title: "",
    description: "",
    image_url: "",
    quiz_type: "anytime",
    time_limit: 60,
    difficulty: "medium",
    tags: [],
  });

  const handleSubmit = async () => {
    if (!form.title.trim()) return toast.error("Quiz title is required");

    try {
             const payload = {
         title: form.title,
         description: form.description || null,
         image_url: form.image_url || null,
         quiz_type: form.quiz_type,
         total_time: form.time_limit,
         difficulty: form.difficulty,
         tags: form.tags.filter(Boolean),
         scheduled_at: null
       };
      const result = await createQuiz(payload);
      onCreate({ ...form, id: result.id });
      toast.success("Quiz created successfully");
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to create quiz");
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-4xl">
        <h2 className="text-xl font-bold mb-4">Create Quiz</h2>

        <div className="space-y-4">
          <div>
            <label className="label">
              <span className="label-text">Title *</span>
            </label>
            <input
              className="input input-bordered w-full"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Enter quiz title"
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text">Description</span>
            </label>
            <textarea
              className="textarea textarea-bordered w-full"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Enter quiz description"
              rows="3"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">
                <span className="label-text">Quiz Type</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={form.quiz_type}
                onChange={(e) => setForm({ ...form, quiz_type: e.target.value })}
              >
                <option value="anytime">Anytime</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </div>

            <div>
              <label className="label">
                <span className="label-text">Difficulty</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">
              <span className="label-text">Time Limit (minutes)</span>
            </label>
            <input
              type="number"
              className="input input-bordered w-full"
              value={form.time_limit}
              onChange={(e) => setForm({ ...form, time_limit: +e.target.value })}
              placeholder="60"
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text">Image URL</span>
            </label>
            <input
              className="input input-bordered w-full"
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text">Tags (comma-separated)</span>
            </label>
            <input
              className="input input-bordered w-full"
              value={form.tags.join(", ")}
              onChange={(e) =>
                setForm({ ...form, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
              placeholder="math, algebra, basic"
            />
          </div>
        </div>

        <div className="modal-action">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit}>Create</button>
        </div>
      </div>
    </div>
  );
};

export default CreateQuizModal;
