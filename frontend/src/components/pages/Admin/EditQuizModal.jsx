import React, { useState, useEffect } from "react";
import { getQuizById, updateQuiz, setQuizQuestions } from "../../../services/api";
import { toast } from "react-hot-toast";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";

const QuestionItem = ({ question, idx, readonly, onChange, onDelete, collapsed, toggle }) => {
  return (
    <div className="bg-base-100 border rounded-lg p-4 shadow mb-3">
              <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div>
              <p className="font-semibold">Q{idx + 1}: {question.question_text || "Untitled question"}</p>
              <p className="text-sm text-base-content/50">{question.question_type}</p>
            </div>
          </div>
        <div className="flex gap-2">
          {!readonly && <button onClick={onDelete} className="btn btn-sm btn-error btn-outline"><Trash2 /></button>}
          <button onClick={toggle} className="btn btn-sm btn-ghost">
            {collapsed ? <ChevronDown /> : <ChevronUp />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="mt-4 space-y-3">
          <label className="input">
            <span className="label">Text</span>
            <input
              value={question.question_text}
              disabled={readonly}
              onChange={e => onChange(idx, "question_text", e.target.value)}
            />
          </label>

          <label className="input">
            <span className="label">Type</span>
            <select
              value={question.question_type}
              disabled={readonly}
              onChange={e => onChange(idx, "question_type", e.target.value)}
              className="select select-bordered"
            >
                             <option value="mcq">MCQ</option>
               <option value="truefalse">True/False</option>
               <option value="typed">Type-in</option>
            </select>
          </label>

                                           {question.question_type === "mcq" && (
              <div className="space-y-2">
                {[...Array(4)].map((_, oi) => {
                  // Handle both object format {id, text} and string format
                  const option = question.options[oi];
                  const optionText = typeof option === 'object' ? option?.text : option || "";
                  const optionId = typeof option === 'object' ? option?.id : String.fromCharCode(97 + oi);
                  const isCorrect = question.correct_answers && 
                    (question.correct_answers.includes(optionId) || 
                     question.correct_answers.includes(optionText));
                  
                  return (
                    <div key={oi} className="flex items-center gap-2">
                      <input
                        className="input input-bordered flex-grow"
                        placeholder={`Option ${oi + 1}`}
                        value={optionText}
                        disabled={readonly}
                        onChange={e => onChange(idx, `opt_text_${oi}`, e.target.value)}
                      />
                      <input
                        type="radio"
                        name={`correct-${question.tempId}`}
                        disabled={readonly}
                        checked={isCorrect}
                        onChange={() => onChange(idx, "correct_index", oi)}
                      />
                    </div>
                  );
                })}
              </div>
            )}

                     {question.question_type === "truefalse" && (
             <div className="space-y-2">
               {["True", "False"].map((label, oi) => (
                 <div key={oi} className="flex items-center gap-2">
                   <input
                     type="radio"
                     name={`tf-${question.tempId}`}
                     disabled={readonly}
                     checked={question.correct_answers && question.correct_answers.includes(question.options?.[oi]?.id)}
                     onChange={() => onChange(idx, "correct_index", oi)}
                   />
                   <span>{label}</span>
                 </div>
               ))}
             </div>
           )}

          {question.question_type === "type_in" && (
            <label className="input">
              <span className="label">Answer</span>
              <input
                value={question.accepted_answers[0] || ""}
                disabled={readonly}
                onChange={e => onChange(idx, "accepted_answers_0", e.target.value)}
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
};

export default function EditQuizModal({ quizId, onClose, onSave, readonly = false }) {
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadQuiz = async () => {
      try {
        console.log('Loading quiz for edit with ID:', quizId);
        const fetched = await getQuizById(quizId);
        console.log('Quiz data for edit:', fetched);
        setQuiz({
          ...fetched,
          questions: fetched.questions?.map((q, i) => ({
            ...q,
            tempId: `q-${q.id}-${i}`,
            collapsed: false,
          })) || []
        });
      } catch (err) {
        console.error('Error loading quiz for edit:', err);
        toast.error(err?.response?.data?.error || "Failed to load quiz");
        onClose();
      } finally { setLoading(false) }
    };
    loadQuiz();
  }, [quizId]);

  const handleChange = (idx, field, value) => {
  setQuiz(q => {
    const qs = [...q.questions];
    const item = { ...qs[idx] };

    // Ensure options array exists if needed
    if ((item.question_type === "mcq" || item.question_type === "true_false") && !item.options) {
      item.options = [];
    }

         // Handle changing question type
     if (field === "question_type") {
       item.question_type = value;
       if (value === "mcq") {
         item.options = [
           { id: 'a', text: '' },
           { id: 'b', text: '' },
           { id: 'c', text: '' },
           { id: 'd', text: '' }
         ];
         item.correct_answers = [];
       } else if (value === "truefalse") {
         item.options = [
           { id: 'a', text: 'True' },
           { id: 'b', text: 'False' }
         ];
         item.correct_answers = [];
       } else if (value === "typed") {
         item.correct_answers = [""];
         item.options = [];
       }
     }

         // Handle other changes
     else if (field.startsWith("opt_text_")) {
       const oi = +field.split("_")[2];
       item.options[oi] = item.options[oi] || { id: String.fromCharCode(97 + oi), text: "" };
       item.options[oi].text = value;
           } else if (field === "correct_index") {
        if (item.options) {
          const selectedOption = item.options[value];
          if (selectedOption) {
            // Handle both object format {id, text} and string format
            const selectedAnswer = typeof selectedOption === 'object' ? selectedOption.id : selectedOption;
            item.correct_answers = [selectedAnswer];
          }
        }
     } else if (field.startsWith("accepted_answers_")) {
       const ai = +field.split("_")[2];
       item.correct_answers = [...(item.correct_answers || [])];
       item.correct_answers[ai] = value;
     } else {
       item[field] = value;
     }

    qs[idx] = item;
    return { ...q, questions: qs };
  });

  console.log(`Changed Q${idx + 1} field ${field}:`, value);
};

  const toggleCollapse = idx => setQuiz(q => {
    const qs = [...q.questions];
    qs[idx].collapsed = !qs[idx].collapsed;
    return { ...q, questions: qs };
  });

  const deleteQuestion = async (idx) => {
    try {
      const questionToRemove = quiz.questions[idx];
      const remainingQuestions = quiz.questions.filter((_, i) => i !== idx);
      
      // Update the quiz questions using the API
      await setQuizQuestions(quizId, remainingQuestions.map(q => q.id));
      
      // Update local state
      setQuiz(q => ({
        ...q,
        questions: remainingQuestions
      }));
      
      toast.success("Question removed successfully");
    } catch (err) {
      console.error("Error removing question:", err);
      toast.error("Failed to remove question");
    }
  };

  const handleSave = async () => {
    console.log("[SAVE QUIZ]", quiz);
    try {
      const payload = {
        title: quiz.title,
        description: quiz.description || null,
        image_url: quiz.image_url || null,
        quiz_type: quiz.quiz_type,
        total_time: quiz.total_time || quiz.time_limit || 60,
        difficulty: quiz.difficulty || "medium",
        tags: quiz.tags || [],
        scheduled_at: quiz.quiz_type === 'scheduled' && quiz.scheduled_at ? 
          new Date(quiz.scheduled_at).toISOString() : null
      };
      
      // Update quiz details
      await updateQuiz(quizId, payload);
      
      // Update quiz questions if there are any changes
      const existingQuestionIds = quiz.questions
        .filter(q => q.id) // Only include questions that have IDs (not temporary ones)
        .map(q => q.id);
      
      if (existingQuestionIds.length > 0) {
        await setQuizQuestions(quizId, existingQuestionIds);
      }
      
      toast.success("Quiz updated successfully!");
      onSave({ ...quiz });
      onClose();
    } catch (err) {
      console.error("[SAVE ERROR]", err);
      toast.error(err?.response?.data?.error || "Failed to save");
    }
  };

  if (loading) {
    return <div className="modal modal-open"><div className="modal-box">Loading…</div></div>;
  }
  if (!quiz) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-4xl max-h-[90vh] overflow-auto">
        <h2 className="text-2xl font-bold mb-4">Edit Quiz</h2>

        <div className="space-y-4">
          <div>
            <label className="label">
              <span className="label-text">Title *</span>
            </label>
            <input
              className="input input-bordered w-full"
              value={quiz.title}
              disabled={readonly}
              onChange={e => setQuiz(q => ({ ...q, title: e.target.value }))}
              placeholder="Enter quiz title"
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text">Description</span>
            </label>
            <textarea
              className="textarea textarea-bordered w-full"
              rows={3}
              value={quiz.description || ""}
              disabled={readonly}
              onChange={e => setQuiz(q => ({ ...q, description: e.target.value }))}
              placeholder="Enter quiz description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">
                <span className="label-text">Quiz Type</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={quiz.quiz_type}
                disabled={readonly}
                onChange={e => setQuiz(q => ({ ...q, quiz_type: e.target.value }))}
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
                value={quiz.difficulty || "medium"}
                disabled={readonly}
                onChange={e => setQuiz(q => ({ ...q, difficulty: e.target.value }))}
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
              value={quiz.total_time || quiz.time_limit || 60}
              disabled={readonly}
              onChange={e => setQuiz(q => ({ ...q, total_time: +e.target.value }))}
              placeholder="60"
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text">Image URL</span>
            </label>
            <input
              className="input input-bordered w-full"
              value={quiz.image_url || ""}
              disabled={readonly}
              onChange={e => setQuiz(q => ({ ...q, image_url: e.target.value }))}
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text">Tags (comma-separated)</span>
            </label>
            <input
              className="input input-bordered w-full"
              value={quiz.tags?.join(", ") || ""}
              disabled={readonly}
              onChange={e => setQuiz(q => ({
                ...q,
                tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean),
              }))}
              placeholder="math, algebra, basic"
            />
          </div>

          {quiz.quiz_type === 'scheduled' && (
            <div>
              <label className="label">
                <span className="label-text">Scheduled At</span>
              </label>
              <input
                type="datetime-local"
                className="input input-bordered w-full"
                value={quiz.scheduled_at ? new Date(quiz.scheduled_at).toISOString().slice(0, 16) : ""}
                disabled={readonly}
                onChange={e => setQuiz(q => ({ ...q, scheduled_at: e.target.value }))}
              />
            </div>
          )}
        </div>

        <div className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">Questions ({quiz.questions.length})</h3>
            <button className="btn btn-sm btn-outline" disabled={readonly} onClick={() => {
              // For now, we'll just add a placeholder question to the UI
              // In a real implementation, you'd want to open a question selection modal
              setQuiz(q => ({
                ...q,
                questions: [
                  ...q.questions,
                  { tempId: `q-new-${Date.now()}`, question_text: "", question_type: "mcq", options: [], accepted_answers: [], collapsed: false }
                ]
              }));
              toast.info("Add question functionality - select from question pool");
            }}>
              <Plus /> Add Question
            </button>
          </div>

          <div className="space-y-3">
            {quiz.questions.map((q, idx) => (
              <QuestionItem
                key={q.id || q.tempId}
                question={q}
                idx={idx}
                readonly={readonly}
                onDelete={() => deleteQuestion(idx)}
                collapsed={q.collapsed}
                toggle={() => toggleCollapse(idx)}
                onChange={handleChange}
              />
            ))}
          </div>
        </div>

        <div className="modal-action justify-end mt-6">
          <button className="btn" onClick={onClose}>Cancel</button>
          {!readonly && <button className="btn btn-primary" onClick={handleSave}>Save Quiz</button>}
        </div>
      </div>
    </div>
  );
}
