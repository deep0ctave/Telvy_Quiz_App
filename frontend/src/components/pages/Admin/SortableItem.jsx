import React from "react";
import { GripVertical, Trash2, ChevronDown, ChevronRight } from "lucide-react";

export default function SortableItem({ id, index, question, onToggle, onDelete, onChange }) {
  const renderOptions = () => {
    if (question.question_type === "mcq") {
      return question.options.map((opt, idx) => (
        <label key={idx} className="input w-full flex items-center gap-2">
          <input
            type="radio"
            name={`correct_${id}`}
            className="radio"
            checked={opt === question.correct_answer}
            onChange={() => onChange("correct_answer", opt)}
          />
          <input
            type="text"
            className="grow"
            placeholder={`Option ${idx + 1}`}
            value={opt}
            onChange={e => {
              const newOpts = [...question.options];
              newOpts[idx] = e.target.value;
              onChange("options", newOpts);
            }}
          />
        </label>
      ));
    }

    if (question.question_type === "true_false") {
      return ["True", "False"].map(opt => (
        <label key={opt} className="input w-full flex items-center gap-2">
          <input
            type="radio"
            name={`correct_${id}`}
            className="radio"
            checked={opt === question.correct_answer}
            onChange={() => onChange("correct_answer", opt)}
          />
          <span className="label">{opt}</span>
        </label>
      ));
    }

    if (question.question_type === "type_in") {
      return (
        <label className="input w-full">
          <span className="label">Correct Answer</span>
          <input
            type="text"
            value={question.correct_answer}
            placeholder="Correct answer"
            onChange={e => onChange("correct_answer", e.target.value)}
          />
        </label>
      );
    }

    return null;
  };

  return (
    <div className="border rounded-xl p-4 bg-base-100 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GripVertical className="cursor-grab text-gray-400" />
          <span className="badge badge-primary">Q{index}</span>
          <span className="font-semibold">Question</span>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-sm btn-ghost" onClick={onToggle}>
            {question.collapsed ? <ChevronRight /> : <ChevronDown />}
          </button>
          <button className="btn btn-sm btn-error btn-outline" onClick={onDelete}>
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!question.collapsed && (
        <div className="space-y-4 pl-6">
          <label className="input w-full">
            <span className="label">Question Text</span>
            <textarea
              className="textarea w-full"
              placeholder="Enter your question"
              value={question.question_text}
              onChange={e => onChange("question_text", e.target.value)}
            />
          </label>

          <label className="input w-full">
            <span className="label">Question Type</span>
            <select
              className="select w-full"
              value={question.question_type}
              onChange={e => {
                const type = e.target.value;
                onChange("question_type", type);
                if (type === "mcq") onChange("options", ["", "", "", ""]);
                else if (type === "true_false") onChange("options", ["True", "False"]);
                else onChange("options", []);
              }}
            >
              <option value="mcq">Multiple Choice</option>
              <option value="true_false">True / False</option>
              <option value="type_in">Type-in Answer</option>
            </select>
          </label>

          {renderOptions()}
        </div>
      )}
    </div>
  );
}
