// services/quiz.js
import api from "./api";

export const getAllQuizzes = async () => {
  const res = await api.get("/api/quizzes");
  return res.data;
};

export const createQuiz = async (quizData) => {
  const res = await api.post("/api/quizzes", quizData);
  return res.data;
};

export const updateQuiz = async (quizId, quizData) => {
  const res = await api.put(`/api/quizzes/${quizId}`, quizData);
  return res.data;
};

export const deleteFullQuiz = async (quizId, deleteQuestions = false) => {
  const res = await api.delete(`/api/quizzes/${quizId}`, {
    data: { deleteQuestions }
  });
  return res.data;
};

export const addQuestionsToQuiz = async (quizId, questions) => {
  const res = await api.post(`/api/quizzes/${quizId}/questions`, { questions });
  return res.data;
};
