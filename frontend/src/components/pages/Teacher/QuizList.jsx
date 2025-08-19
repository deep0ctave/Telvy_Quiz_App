import React, { useState, useEffect } from 'react';
import { Eye } from 'lucide-react';
import QuizEditModal from './QuizEditModal';

const mockQuizzes = [
  {
    id: 1,
    title: 'Algebra Basics',
    subject: 'Math',
    createdAt: '2024-06-01',
    totalQuestions: 10,
    studentsAttempted: 42,
    questions: [
      { id: 101, text: 'What is x in 2x + 3 = 7?', tags: ['algebra'] },
      { id: 102, text: 'Solve for y: 3y = 15.', tags: ['algebra'] },
    ],
  },
  {
    id: 2,
    title: 'Photosynthesis',
    subject: 'Biology',
    createdAt: '2024-06-15',
    totalQuestions: 12,
    studentsAttempted: 28,
    questions: [],
  },
  {
    id: 3,
    title: 'World War II',
    subject: 'History',
    createdAt: '2024-07-01',
    totalQuestions: 15,
    studentsAttempted: 34,
    questions: [],
  },
];

const QuizList = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);

  useEffect(() => {
    setQuizzes(mockQuizzes);
  }, []);

  return (
    <div className="px-4 py-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-center">Your Quizzes</h2>

      <div className="overflow-x-auto bg-base-200 rounded-box shadow-lg">
        <table className="table w-full">
          <thead>
            <tr>
              <th className="text-base-content">Title</th>
              <th className="text-base-content">Subject</th>
              <th className="text-base-content">Created</th>
              <th className="text-base-content">Questions</th>
              <th className="text-base-content">Students</th>
              <th className="text-base-content">Actions</th>
            </tr>
          </thead>
          <tbody>
            {quizzes.map((quiz) => (
              <tr key={quiz.id} className="hover">
                <td>{quiz.title}</td>
                <td>{quiz.subject}</td>
                <td>{quiz.createdAt}</td>
                <td>{quiz.totalQuestions}</td>
                <td>{quiz.studentsAttempted}</td>
                <td>
                  <button
                    className="btn btn-sm btn-outline btn-info"
                    title="View & Edit"
                    onClick={() => setSelectedQuiz(quiz)}
                  >
                    <Eye size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {quizzes.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center py-10 text-base-content">
                  No quizzes found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedQuiz && (
        <QuizEditModal
          quiz={selectedQuiz}
          onClose={() => setSelectedQuiz(null)}
          onSave={(updatedQuiz) => {
            setQuizzes((prev) =>
              prev.map((q) => (q.id === updatedQuiz.id ? updatedQuiz : q))
            );
            setSelectedQuiz(null);
          }}
        />
      )}
    </div>
  );
};

export default QuizList;
