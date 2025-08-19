import React, { useState } from 'react';
import { X, GripVertical, Pencil } from 'lucide-react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SortableItem = ({ question, index }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: question.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between bg-base-100 shadow-sm border p-2 rounded mb-2"
    >
      <div className="flex items-center gap-2">
        <GripVertical {...listeners} {...attributes} className="cursor-move" />
        <div className="font-medium">Q{index + 1}:</div>
        <div>{question.text}</div>
      </div>
      <button className="btn btn-xs btn-outline btn-warning" title="Edit Question">
        <Pencil size={14} />
      </button>
    </div>
  );
};

const QuizEditModal = ({ quiz, onClose, onSave }) => {
  const [title, setTitle] = useState(quiz.title);
  const [subject, setSubject] = useState(quiz.subject);
  const [questions, setQuestions] = useState(quiz.questions);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = questions.findIndex((q) => q.id === active.id);
      const newIndex = questions.findIndex((q) => q.id === over?.id);
      setQuestions((items) => arrayMove(items, oldIndex, newIndex));
    }
  };

  const handleSave = () => {
    onSave({ ...quiz, title, subject, questions });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
      <div className="bg-base-100 p-6 rounded-xl w-full max-w-2xl relative shadow-xl">
        <button className="absolute top-2 right-2 btn btn-sm btn-circle" onClick={onClose}>
          <X size={18} />
        </button>

        <h2 className="text-xl font-bold mb-4">Edit Quiz</h2>

        <div className="space-y-4">
          <div>
            <label className="label">
              <span className="label-text">Title</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input input-bordered w-full"
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text">Subject</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="input input-bordered w-full"
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text">Questions</span>
            </label>
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
                {questions.map((q, i) => (
                  <SortableItem key={q.id} question={q} index={i} />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
};

export default QuizEditModal;
