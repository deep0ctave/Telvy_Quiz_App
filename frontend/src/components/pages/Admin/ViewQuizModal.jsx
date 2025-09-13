import React, { useState, useEffect } from "react";
import { getQuizById } from "../../../services/api";
import { toast } from "react-hot-toast";

const ViewQuizModal = ({ quizId, onClose }) => {
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadQuiz = async () => {
      try {
        console.log('Loading quiz with ID:', quizId);
        const data = await getQuizById(quizId);
        console.log('Quiz data received:', data);
        setQuiz(data);
      } catch (err) {
        console.error('Error loading quiz:', err);
        toast.error(err?.response?.data?.error || "Failed to load quiz details");
        onClose();
      } finally {
        setLoading(false);
      }
    };
    loadQuiz();
  }, [quizId]);

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'badge-success';
      case 'medium': return 'badge-warning';
      case 'hard': return 'badge-error';
      default: return 'badge-info';
    }
  };

  const getQuizTypeColor = (type) => {
    return type === 'scheduled' ? 'badge-secondary' : 'badge-accent';
  };

  const formatTags = (tags) => {
    if (!tags || tags.length === 0) return 'No tags';
    return tags.map(tag => (
      <span key={tag} className="badge badge-outline mr-1 mb-1">{tag}</span>
    ));
  };

  if (loading) {
    return (
      <div className="modal modal-open">
        <div className="modal-box">
          <div className="flex justify-center py-8">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        </div>
      </div>
    );
  }

  if (!quiz) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-4xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6">Quiz Details</h2>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label">
                <span className="label-text font-semibold">Title</span>
              </label>
              <div className="text-lg font-medium">{quiz.title}</div>
            </div>

            <div>
              <label className="label">
                <span className="label-text font-semibold">Quiz Type</span>
              </label>
              <div>
                <span className={`badge ${getQuizTypeColor(quiz.quiz_type)}`}>
                  {quiz.quiz_type}
                </span>
                {quiz.quiz_type === 'scheduled' && quiz.scheduled_at && (
                  <div className="text-sm text-base-content/60 mt-1">
                    Scheduled for: {new Date(quiz.scheduled_at).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="label">
              <span className="label-text font-semibold">Description</span>
            </label>
            <div className="p-3 bg-base-200 rounded-lg">
              {quiz.description || 'No description provided'}
            </div>
          </div>

          {/* Quiz Properties */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="label">
                <span className="label-text font-semibold">Difficulty</span>
              </label>
              <div>
                <span className={`badge ${getDifficultyColor(quiz.difficulty)}`}>
                  {quiz.difficulty || 'medium'}
                </span>
              </div>
            </div>

            <div>
              <label className="label">
                <span className="label-text font-semibold">Time Limit</span>
              </label>
              <div className="text-lg">
                {quiz.total_time ? `${quiz.total_time} minutes` : 'No time limit'}
              </div>
            </div>

            <div>
              <label className="label">
                <span className="label-text font-semibold">Questions</span>
              </label>
              <div className="text-lg">
                {quiz.number_of_questions || 0} questions
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="label">
              <span className="label-text font-semibold">Tags</span>
            </label>
            <div className="flex flex-wrap">
              {formatTags(quiz.tags)}
            </div>
          </div>

          {/* Image URL */}
          {quiz.image_url && (
            <div>
              <label className="label">
                <span className="label-text font-semibold">Image URL</span>
              </label>
              <div className="p-3 bg-base-200 rounded-lg break-all">
                <a 
                  href={quiz.image_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {quiz.image_url}
                </a>
              </div>
            </div>
          )}

                     {/* Metadata */}
           <div className="divider"></div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
             <div>
               <label className="label">
                 <span className="label-text font-semibold">Created By</span>
               </label>
               <div>
                 {quiz.creator_name || quiz.creator_username || 'Unknown'}
               </div>
             </div>

             <div>
               <label className="label">
                 <span className="label-text font-semibold">Created At</span>
               </label>
               <div>
                 {quiz.created_at 
                   ? new Date(quiz.created_at).toLocaleString()
                   : 'N/A'
                 }
               </div>
             </div>

             <div>
               <label className="label">
                 <span className="label-text font-semibold">Last Updated</span>
               </label>
               <div>
                 {quiz.updated_at 
                   ? new Date(quiz.updated_at).toLocaleString()
                   : 'N/A'
                 }
               </div>
             </div>
           </div>

                     {/* Questions Preview */}
           {quiz.questions && quiz.questions.length > 0 && (
             <div>
               <label className="label">
                 <span className="label-text font-semibold">Questions Preview</span>
               </label>
               <div className="space-y-4 max-h-96 overflow-y-auto">
                 {quiz.questions.map((question, index) => (
                   <div key={question.id || index} className="p-4 border rounded-lg bg-base-200">
                     <div className="font-medium mb-2">
                       Q{index + 1}: {question.question_text}
                     </div>
                     <div className="text-sm text-base-content/60 mb-3">
                       Type: {question.question_type} • 
                       Time: {question.time_limit || 0}s • 
                       Difficulty: {question.difficulty || 'medium'}
                     </div>
                     
                                           {/* Options */}
                      {question.options && question.options.length > 0 && (
                        <div className="mb-3">
                          <div className="text-sm font-semibold mb-2">Options:</div>
                          <div className="space-y-1">
                            {question.options.map((option, optIndex) => {
                              // Handle both object format {id, text} and string format
                              const optionId = typeof option === 'object' ? option.id : String.fromCharCode(97 + optIndex);
                              const optionText = typeof option === 'object' ? option.text : option;
                              const isCorrect = question.correct_answers && 
                                (question.correct_answers.includes(optionId) || 
                                 question.correct_answers.includes(optionText));
                              
                              return (
                                <div 
                                  key={optionId || optIndex} 
                                  className={`p-2 rounded border ${
                                    isCorrect ? 'bg-success/20 border-success' : 'bg-base-300'
                                  }`}
                                >
                                  <span className="font-mono text-sm mr-2">{optionId}.</span>
                                  {optionText}
                                  {isCorrect && (
                                    <span className="ml-2 badge badge-success badge-sm">✓ Correct</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                     
                     {/* Correct Answers */}
                     {question.correct_answers && question.correct_answers.length > 0 && (
                       <div className="mb-2">
                         <div className="text-sm font-semibold text-success">Correct Answer(s):</div>
                         <div className="flex flex-wrap gap-1 mt-1">
                           {question.correct_answers.map((answer, ansIndex) => (
                             <span key={ansIndex} className="badge badge-success badge-sm">
                               {answer}
                             </span>
                           ))}
                         </div>
                       </div>
                     )}
                     
                     {/* Tags */}
                     {question.tags && question.tags.length > 0 && (
                       <div className="flex flex-wrap gap-1 mt-2">
                         {question.tags.map((tag, tagIndex) => (
                           <span key={tagIndex} className="badge badge-outline badge-xs">
                             {tag}
                           </span>
                         ))}
                       </div>
                     )}
                   </div>
                 ))}
               </div>
             </div>
           )}
        </div>

        <div className="modal-action">
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewQuizModal;
