import React, { useEffect, useState } from "react";
import { Pencil, Trash2, ChevronUp, ChevronDown, Filter, Users, Eye, Plus } from "lucide-react";
import { getAllQuizzes, getAssignmentsForQuiz, deassignQuiz, getAllUsers, assignQuizzes } from "../../../services/api";
import CreateQuizModal from "./CreateQuizModal";
import EditQuizModal from "./EditQuizModal";
import DeleteQuizModal from "./DeleteQuizModal";
import ViewQuizModal from "./ViewQuizModal";
import { toast } from "react-hot-toast";

const QuizList = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    title: "",
    quiz_type: "",
    difficulty: "",
  });
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });
  const [advancedSearch, setAdvancedSearch] = useState(false);

  // Quiz Management States
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showView, setShowView] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState(null);

  // Assignment Management States
  const [showAssignments, setShowAssignments] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [assignmentFilters, setAssignmentFilters] = useState({
    student: "",
    status: "",
  });

  useEffect(() => {
    fetchQuizzes();
    fetchUsers();
  }, []);

  useEffect(() => {
    filterAndSort();
  }, [search, filters, sortConfig, quizzes]);

  const fetchQuizzes = async () => {
    try {
      const data = await getAllQuizzes();
      setQuizzes(data);
    } catch (err) {
      toast.error("Failed to fetch quizzes");
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await getAllUsers();
      setUsers(data.filter(user => user.role === 'student'));
    } catch (err) {
      toast.error("Failed to fetch users");
    }
  };

  const filterAndSort = () => {
    let result = [...quizzes];

    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(
        (q) =>
          q.title?.toLowerCase().includes(s) ||
          q.description?.toLowerCase().includes(s)
      );
    }

    Object.entries(filters).forEach(([key, val]) => {
      if (val.trim()) {
        result = result.filter((q) => {
          const field = q[key];
          if (Array.isArray(field)) {
            return field.some((tag) =>
              tag.toLowerCase().includes(val.toLowerCase())
            );
          }
          return (field || "")
            .toString()
            .toLowerCase()
            .includes(val.toLowerCase());
        });
      }
    });

    if (sortConfig.key) {
      const { key, direction } = sortConfig;
      result.sort((a, b) => {
        const aVal = (a[key] || "").toString().toLowerCase();
        const bVal = (b[key] || "").toString().toLowerCase();
        return direction === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      });
    }

    setFiltered(result);
  };

  const toggleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const badgeColor = (type) =>
    type === "scheduled" ? "badge-secondary" : "badge-accent";

  // Assignment Management Functions
  const handleViewAssignments = async (quizId) => {
    setSelectedQuizId(quizId);
    setLoadingAssignments(true);
    try {
      const data = await getAssignmentsForQuiz(quizId);
      setAssignments(data);
      setShowAssignments(true);
    } catch (error) {
      toast.error("Failed to fetch assignments");
    } finally {
      setLoadingAssignments(false);
    }
  };

  const handleAssignQuiz = async () => {
    if (selectedStudents.length === 0) {
      toast.error("Please select at least one student");
      return;
    }

    try {
      await assignQuizzes({
        quiz_id: selectedQuizId,
        student_ids: selectedStudents,
        due_at: null
      });
      toast.success("Quiz assigned successfully");
      setShowAssignModal(false);
      setSelectedStudents([]);
      // Refresh assignments
      const data = await getAssignmentsForQuiz(selectedQuizId);
      setAssignments(data);
    } catch (error) {
      toast.error("Failed to assign quiz");
    }
  };

  const handleDeassignQuiz = async (assignmentId) => {
    try {
      await deassignQuiz({ assignment_id: assignmentId });
      toast.success("Quiz deassigned successfully");
      // Refresh assignments
      const data = await getAssignmentsForQuiz(selectedQuizId);
      setAssignments(data);
    } catch (error) {
      toast.error("Failed to deassign quiz");
    }
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const filteredAssignments = assignments.filter(assignment => {
    const studentName = assignment.student?.name?.toLowerCase() || '';
    const studentEmail = assignment.student?.email?.toLowerCase() || '';
    const status = assignment.status?.toLowerCase() || '';
    
    return (
      studentName.includes(assignmentFilters.student.toLowerCase()) ||
      studentEmail.includes(assignmentFilters.student.toLowerCase())
    ) && (
      !assignmentFilters.status || status === assignmentFilters.status.toLowerCase()
    );
  });

  return (
    <div className="p-6 space-y-6">
      {/* Quiz Management Section */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-2xl font-bold">Quiz Management</h1>
        <div className="flex gap-2">
          <button
            className="btn btn-outline"
            onClick={() => setAdvancedSearch((s) => !s)}
          >
            <Filter className="w-4 h-4" /> Advanced Search
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" /> Create Quiz
          </button>
        </div>
      </div>

      <input
        type="text"
        className="input input-bordered w-full max-w-md"
        placeholder="Search by title or description..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {advancedSearch && (
        <div className="grid md:grid-cols-3 gap-4 bg-base-200 p-4 rounded-md">
          {Object.keys(filters).map((key) => (
            <input
              key={key}
              type="text"
              className="input input-bordered"
              placeholder={`Filter by ${key.replace("_", " ")}`}
              value={filters[key]}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, [key]: e.target.value }))
              }
            />
          ))}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              {["title", "quiz_type", "difficulty", "total_time", "number_of_questions", "created_at"].map((col) => (
                <th
                  key={col}
                  onClick={() => toggleSort(col)}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-1 capitalize">
                    {col.replace("_", " ")}
                    {sortConfig.key === col &&
                      (sortConfig.direction === "asc" ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      ))}
                  </div>
                </th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="99" className="text-center text-base-content/60 py-4">
                  No matching quizzes found.
                </td>
              </tr>
            ) : (
              filtered.map((quiz) => (
                <tr key={quiz.id}>
                  <td>
                    <div>
                      <div className="font-medium">{quiz.title}</div>
                      <div className="text-sm text-base-content/60">{quiz.description || 'No description'}</div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${badgeColor(quiz.quiz_type)}`}>
                      {quiz.quiz_type}
                    </span>
                    {quiz.quiz_type === 'scheduled' && quiz.scheduled_at && (
                      <div className="text-xs text-base-content/60 mt-1">
                        {new Date(quiz.scheduled_at).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${
                      quiz.difficulty === 'easy' ? 'badge-success' :
                      quiz.difficulty === 'medium' ? 'badge-warning' :
                      'badge-error'
                    }`}>
                      {quiz.difficulty || 'medium'}
                    </span>
                  </td>
                  <td>{quiz.total_time ? `${quiz.total_time} min` : "No limit"}</td>
                  <td>{quiz.number_of_questions || 0} questions</td>
                  <td>
                    {quiz.created_at
                      ? new Date(quiz.created_at).toLocaleDateString("en-GB")
                      : "-"}
                  </td>
                  <td className="flex gap-2">
                                         <button
                       className="btn btn-sm btn-primary"
                       title="View Quiz Details"
                       onClick={() => {
                         console.log('View button clicked for quiz ID:', quiz.id);
                         setSelectedQuizId(quiz.id);
                         setShowView(true);
                       }}
                     >
                       <Eye className="w-4 h-4" />
                     </button>
                                         <button
                       className="btn btn-sm btn-info"
                       title="Edit Quiz"
                       onClick={() => {
                         console.log('Edit button clicked for quiz ID:', quiz.id);
                         setSelectedQuizId(quiz.id);
                         setShowEdit(true);
                       }}
                     >
                       <Pencil className="w-4 h-4" />
                     </button>
                    <button
                      className="btn btn-sm btn-warning"
                      title="Manage Assignments"
                      onClick={() => handleViewAssignments(quiz.id)}
                      disabled={loadingAssignments}
                    >
                      <Users className="w-4 h-4" />
                    </button>
                    <button
                      className="btn btn-sm btn-error"
                      title="Delete Quiz"
                      onClick={() => {
                        setSelectedQuizId(quiz.id);
                        setShowDelete(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* View Quiz Modal */}
      {showView && selectedQuizId && (
        <ViewQuizModal
          quizId={selectedQuizId}
          onClose={() => {
            setShowView(false);
            setSelectedQuizId(null);
          }}
        />
      )}

      {/* Quiz Management Modals */}
      {showCreate && (
        <CreateQuizModal
          onClose={() => setShowCreate(false)}
          onCreate={(created) => {
            setQuizzes((prev) => [...prev, created]);
            toast.success("Quiz created successfully");
          }}
        />
      )}

      {showEdit && selectedQuizId && (
        <EditQuizModal
          quizId={selectedQuizId}
          onClose={() => {
            setSelectedQuizId(null);
            setShowEdit(false);
          }}
          onSave={(updated) => {
            setQuizzes((prev) =>
              prev.map((q) => (q.id === updated.id ? updated : q))
            );
            toast.success("Quiz updated successfully");
          }}
        />
      )}

      {showDelete && selectedQuizId && (
        <DeleteQuizModal
          quiz={quizzes.find((q) => q.id === selectedQuizId)}
          onClose={() => {
            setShowDelete(false);
            setSelectedQuizId(null);
          }}
          onDelete={(deletedId) => {
            setQuizzes((prev) => prev.filter((q) => q.id !== deletedId));
            toast.success("Quiz deleted successfully");
          }}
        />
      )}

      {/* Assignment Management Modal */}
      {showAssignments && selectedQuizId && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">
                Assignment Management - {quizzes.find(q => q.id === selectedQuizId)?.title}
              </h3>
              <button
                className="btn btn-sm btn-primary"
                onClick={() => setShowAssignModal(true)}
              >
                <Plus className="w-4 h-4" /> Assign to Students
              </button>
            </div>
            
            {/* Assignment Filters */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                className="input input-bordered"
                placeholder="Filter by student name or email..."
                value={assignmentFilters.student}
                onChange={(e) => setAssignmentFilters(prev => ({ ...prev, student: e.target.value }))}
              />
              <select
                className="select select-bordered"
                value={assignmentFilters.status}
                onChange={(e) => setAssignmentFilters(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="">All Status</option>
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            
            {loadingAssignments ? (
              <div className="flex justify-center py-8">
                <span className="loading loading-spinner loading-lg"></span>
              </div>
            ) : filteredAssignments.length === 0 ? (
              <div className="text-center py-8 text-base-content/60">
                No assignments found for this quiz.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Email</th>
                      <th>School</th>
                      <th>Class</th>
                      <th>Assigned By</th>
                      <th>Assigned Date</th>
                      <th>Due Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssignments.map((assignment) => (
                      <tr key={assignment.id}>
                        <td>
                          <div>
                            <div className="font-medium">{assignment.student?.name || 'N/A'}</div>
                            <div className="text-sm text-base-content/60">{assignment.student?.username}</div>
                          </div>
                        </td>
                        <td>{assignment.student?.email || 'N/A'}</td>
                        <td>{assignment.student?.school || 'N/A'}</td>
                        <td>{assignment.student?.class || 'N/A'}</td>
                        <td>
                          <div>
                            <div className="font-medium">{assignment.assigned_by?.name || 'N/A'}</div>
                            <div className="text-sm text-base-content/60">{assignment.assigned_by?.username}</div>
                          </div>
                        </td>
                        <td>
                          {assignment.assigned_at 
                            ? new Date(assignment.assigned_at).toLocaleDateString()
                            : 'N/A'
                          }
                        </td>
                        <td>
                          {assignment.due_at 
                            ? new Date(assignment.due_at).toLocaleDateString()
                            : 'No due date'
                          }
                        </td>
                        <td>
                          <span className={`badge ${
                            assignment.status === 'completed' ? 'badge-success' :
                            assignment.status === 'in_progress' ? 'badge-warning' :
                            'badge-info'
                          }`}>
                            {assignment.status || 'not_started'}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-error"
                            onClick={() => handleDeassignQuiz(assignment.id)}
                            title="Deassign Quiz"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            <div className="modal-action">
              <button 
                className="btn" 
                onClick={() => {
                  setShowAssignments(false);
                  setSelectedQuizId(null);
                  setAssignments([]);
                  setAssignmentFilters({ student: "", status: "" });
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Students Modal */}
      {showAssignModal && selectedQuizId && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-lg mb-4">
              Assign Quiz to Students
            </h3>
            
            <div className="mb-4">
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder="Search students..."
                onChange={(e) => {
                  // Filter students based on search
                }}
              />
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {users.map((user) => (
                <div key={user.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={selectedStudents.includes(user.id)}
                    onChange={() => toggleStudentSelection(user.id)}
                  />
                  <div className="flex-1">
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-base-content/60">
                      {user.email} • {user.school || 'N/A'} • Class {user.class || 'N/A'}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="modal-action">
              <button 
                className="btn" 
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedStudents([]);
                }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleAssignQuiz}
                disabled={selectedStudents.length === 0}
              >
                Assign to {selectedStudents.length} Student{selectedStudents.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizList;
