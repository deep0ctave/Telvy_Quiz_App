import React, { useState, useEffect } from "react";
import { createQuiz, assignQuizzes, getAllUsers, setQuizQuestions } from "../../../services/api";
import { toast } from "react-hot-toast";

const CreateQuizWizardModal = ({ isOpen, onClose, selectedQuestions }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [quizData, setQuizData] = useState({
    title: "",
    description: "",
    image_url: "",
    total_time: 60,
    quiz_type: "anytime",
    difficulty: "medium",
    tags: [],
  });

  const [selectedUsers, setSelectedUsers] = useState([]);
  const [filters, setFilters] = useState({ 
    school: "", 
    class: "", 
    role: "student" 
  });
  const [scheduledFrom, setScheduledFrom] = useState("");
  const [scheduledTill, setScheduledTill] = useState("");

  // Fetch users on component mount
  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    try {
      const usersData = await getAllUsers();
      setUsers(usersData);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast.error("Failed to fetch users");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setQuizData({ ...quizData, [name]: value });
  };

  const handleTagsChange = (e) => {
    const tags = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag);
    setQuizData({ ...quizData, tags });
  };

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllUsers = () => {
    const studentIds = filteredUsers.map(user => user.id);
    setSelectedUsers(studentIds);
  };

  const deselectAllUsers = () => {
    setSelectedUsers([]);
  };

  const filteredUsers = users.filter((user) => {
    return (
      user.role === filters.role &&
      (filters.school === "" || user.school === filters.school) &&
      (filters.class === "" || user.class === filters.class)
    );
  });

  const handleCreateQuiz = async () => {
    if (!quizData.title.trim()) {
      toast.error("Quiz title is required");
      return;
    }

    if (selectedQuestions.length === 0) {
      toast.error("Please select at least one question");
      return;
    }

    // Validate schedule window if provided
    if (scheduledFrom) {
      const from = new Date(scheduledFrom);
      if (isNaN(from.getTime())) {
        toast.error("Invalid 'Scheduled from' date/time");
        return;
      }
      if (scheduledTill) {
        const till = new Date(scheduledTill);
        if (isNaN(till.getTime())) {
          toast.error("Invalid 'Scheduled till' date/time");
          return;
        }
        if (till < from) {
          toast.error("'Scheduled till' must be after 'Scheduled from'");
          return;
        }
      }
    }

    setLoading(true);
    try {
      const quizPayload = {
        ...quizData,
        image_url: quizData.image_url?.trim() || null,
        description: quizData.description?.trim() || null
      };

      // Create the quiz
      console.log('Sending quiz payload:', quizPayload);
      const quizResult = await createQuiz(quizPayload);
      const quizId = quizResult.id;

      // Assign questions to the quiz
      const questionIds = selectedQuestions.map(q => q.id);
      await setQuizQuestions(quizId, questionIds);

      // Assign quiz to selected users with optional schedule
      if (selectedUsers.length > 0) {
        await assignQuizzes({
          quiz_id: quizId,
          student_ids: selectedUsers,
          scheduled_from: scheduledFrom ? new Date(scheduledFrom).toISOString() : null,
          scheduled_till: scheduledTill ? new Date(scheduledTill).toISOString() : null
        });
      }

      toast.success(`Quiz "${quizData.title}" created successfully!`);
      onClose();
      
      // Reset form
      setQuizData({
        title: "",
        description: "",
        image_url: "",
        total_time: 60,
        quiz_type: "anytime",
        difficulty: "medium",
        tags: [],
      });
      setSelectedUsers([]);
      setScheduledFrom("");
      setScheduledTill("");
      setStep(1);
    } catch (error) {
      console.error("Failed to create quiz:", error);
      toast.error("Failed to create quiz");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-5xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Create Quiz – Step {step}</h2>

        {/* Step Navigation */}
        <div className="tabs mb-4">
          <a 
            className={`tab tab-bordered ${step === 1 && "tab-active"}`} 
            onClick={() => setStep(1)}
          >
            1. Quiz Details
          </a>
          <a 
            className={`tab tab-bordered ${step === 2 && "tab-active"}`} 
            onClick={() => setStep(2)}
          >
            2. Assign Users
          </a>
          <a 
            className={`tab tab-bordered ${step === 3 && "tab-active"}`} 
            onClick={() => setStep(3)}
          >
            3. Review & Create
          </a>
        </div>

        {/* Step 1 – Quiz Details */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">
                  <span className="label-text">Quiz Title *</span>
                </label>
                <input 
                  name="title" 
                  value={quizData.title} 
                  onChange={handleInputChange} 
                  placeholder="Enter quiz title" 
                  className="input input-bordered w-full" 
                />
              </div>
            </div>

            <div>
              <label className="label">
                <span className="label-text">Description</span>
              </label>
              <textarea 
                name="description" 
                value={quizData.description} 
                onChange={handleInputChange} 
                placeholder="Enter quiz description" 
                className="textarea textarea-bordered w-full" 
                rows="3"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">
                  <span className="label-text">Time Limit (minutes)</span>
                </label>
                <input 
                  name="total_time" 
                  type="number" 
                  value={quizData.total_time} 
                  onChange={handleInputChange} 
                  placeholder="60" 
                  className="input input-bordered w-full" 
                />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Difficulty</span>
                </label>
                <select 
                  name="difficulty" 
                  value={quizData.difficulty} 
                  onChange={handleInputChange} 
                  className="select select-bordered w-full"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Image URL</span>
                </label>
                <input 
                  name="image_url" 
                  value={quizData.image_url} 
                  onChange={handleInputChange} 
                  placeholder="https://..." 
                  className="input input-bordered w-full" 
                />
              </div>
            </div>

            {/* No scheduled date/time here; scheduling belongs to assignments */}

            <div>
              <label className="label">
                <span className="label-text">Tags (comma-separated)</span>
              </label>
              <input 
                name="tags" 
                value={quizData.tags.join(', ')} 
                onChange={handleTagsChange} 
                placeholder="math, algebra, basic" 
                className="input input-bordered w-full" 
              />
            </div>

            <div className="divider">Selected Questions</div>
            
            <div className="bg-base-200 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">Questions ({selectedQuestions.length})</h3>
              </div>
              <div className="max-h-40 overflow-y-auto">
                {selectedQuestions.map((q, index) => (
                  <div key={q.id} className="flex items-center gap-2 py-1">
                    <span className="text-sm font-mono text-base-content/60">{index + 1}.</span>
                    <span className="text-sm flex-1">{q.question_text}</span>
                    <span className="badge badge-outline badge-xs">{q.question_type}</span>
                    <span className="badge badge-info badge-xs">{q.difficulty || 'medium'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2 – Assign Users */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Quiz type now selected during assignment step */}
            <div>
              <label className="label">
                <span className="label-text">Quiz Type</span>
              </label>
              <select 
                name="quiz_type" 
                value={quizData.quiz_type} 
                onChange={handleInputChange} 
                className="select select-bordered w-full"
              >
                <option value="anytime">Anytime</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </div>
            {/* Optional schedule window for assignments, only if scheduled */}
            {quizData.quiz_type === 'scheduled' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">
                    <span className="label-text">Scheduled from</span>
                  </label>
                  <input
                    type="datetime-local"
                    className="input input-bordered w-full"
                    value={scheduledFrom}
                    onChange={(e) => setScheduledFrom(e.target.value)}
                    min={new Date().toISOString().slice(0,16)}
                  />
                </div>
                <div>
                  <label className="label">
                    <span className="label-text">Scheduled till (optional)</span>
                  </label>
                  <input
                    type="datetime-local"
                    className="input input-bordered w-full"
                    value={scheduledTill}
                    onChange={(e) => setScheduledTill(e.target.value)}
                    min={scheduledFrom || new Date().toISOString().slice(0,16)}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">
                  <span className="label-text">Filter by School</span>
                </label>
                <input 
                  placeholder="All Schools" 
                  className="input input-bordered w-full" 
                  value={filters.school}
                  onChange={(e) => setFilters({ ...filters, school: e.target.value })}
                />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Filter by Class</span>
                </label>
                <input 
                  placeholder="All Classes" 
                  className="input input-bordered w-full" 
                  value={filters.class}
                  onChange={(e) => setFilters({ ...filters, class: e.target.value })}
                />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Role</span>
                </label>
                <select 
                  className="select select-bordered w-full"
                  value={filters.role}
                  onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                >
                  <option value="student">Students</option>
                  <option value="teacher">Teachers</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <h3 className="font-semibold">
                Assign to Users ({selectedUsers.length} selected)
              </h3>
              <div className="space-x-2">
                <button 
                  onClick={selectAllUsers} 
                  className="btn btn-xs btn-outline"
                >
                  Select All
                </button>
                <button 
                  onClick={deselectAllUsers} 
                  className="btn btn-xs btn-outline"
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th></th>
                    <th>Name</th>
                    <th>Username</th>
                    <th>School</th>
                    <th>Class</th>
                    <th>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <input 
                          type="checkbox" 
                          checked={selectedUsers.includes(user.id)} 
                          onChange={() => toggleUserSelection(user.id)} 
                          className="checkbox checkbox-sm" 
                        />
                      </td>
                      <td>{user.name || 'N/A'}</td>
                      <td>{user.username}</td>
                      <td>{user.school || 'N/A'}</td>
                      <td>{user.class || 'N/A'}</td>
                      <td>{user.email || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && (
                <div className="text-center py-8 text-base-content/60">
                  No users found matching the filters
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3 – Review and Create */}
        {step === 3 && (
          <div className="space-y-6">
            <h3 className="font-semibold text-lg">Review Quiz Details</h3>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-medium">Quiz Information</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>Title:</strong> {quizData.title || 'Not set'}</p>
                  <p><strong>Description:</strong> {quizData.description || 'Not set'}</p>
                  <p><strong>Type:</strong> {quizData.quiz_type}</p>
                  <p><strong>Time Limit:</strong> {quizData.total_time} minutes</p>
                  <p><strong>Difficulty:</strong> {quizData.difficulty}</p>
                  <p><strong>Tags:</strong> {quizData.tags.length > 0 ? quizData.tags.join(', ') : 'None'}</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium">Assignment Summary</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>Questions:</strong> {selectedQuestions.length}</p>
                  <p><strong>Assigned Users:</strong> {selectedUsers.length}</p>
                  {selectedUsers.length > 0 && (
                    <div>
                      <p><strong>Selected Users:</strong></p>
                      <div className="max-h-32 overflow-y-auto bg-base-200 p-2 rounded">
                        {users
                          .filter(user => selectedUsers.includes(user.id))
                          .slice(0, 5)
                          .map(user => (
                            <div key={user.id} className="text-xs">
                              {user.name || user.username}
                            </div>
                          ))}
                        {selectedUsers.length > 5 && (
                          <div className="text-xs text-base-content/60">
                            ... and {selectedUsers.length - 5} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="alert alert-info">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>
                {selectedUsers.length > 0 
                  ? `This quiz will be created and assigned to ${selectedUsers.length} user(s).`
                  : "This quiz will be created but not assigned to any users. You can assign it later."
                }
              </span>
            </div>
          </div>
        )}

        {/* Footer Controls */}
        <div className="modal-action">
          <button className="btn btn-outline" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          {step > 1 && (
            <button 
              className="btn" 
              onClick={() => setStep(step - 1)}
              disabled={loading}
            >
              Back
            </button>
          )}
          {step < 3 && (
            <button 
              className="btn btn-primary" 
              onClick={() => setStep(step + 1)}
              disabled={loading}
            >
              Next
            </button>
          )}
          {step === 3 && (
            <button 
              className="btn btn-primary" 
              onClick={handleCreateQuiz}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Creating...
                </>
              ) : (
                'Create Quiz'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateQuizWizardModal;
