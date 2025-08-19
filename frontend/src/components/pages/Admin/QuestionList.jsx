import React, { useRef, useEffect, useState } from "react";
import { Pencil, Trash2, Eye } from "lucide-react";
import CreateQuestionModal from "./CreateQuestionModal";
import EditQuestionModal from "./EditQuestionModal";
import DeleteQuestionModal from "./DeleteQuestionModal";
import ViewQuestionModal from "./ViewQuestionModal";
import CreateQuizFromQuestionsModal from "./CreateQuizFromQuestionsModal";
import CreateQuizWizardModal from "./CreateQuizWizardModal";
import { getAllQuestionsWithDetails, createBulkQuestions } from "../../../services/api";

const QuestionList = () => {
  const [questions, setQuestions] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [timeLimitFilter, setTimeLimitFilter] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [selected, setSelected] = useState([]);
  const [randomCount, setRandomCount] = useState("");
  const [sortField, setSortField] = useState("");
  const [sortDirection, setSortDirection] = useState("asc");
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewTarget, setViewTarget] = useState(null);
  const [showAddToQuizModal, setShowAddToQuizModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showJSONModal, setShowJSONModal] = useState(false);
  const jsonFileInputRef = useRef();

  const handleJSONUpload = () => {
    setShowJSONModal(true);
  };

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const data = await getAllQuestionsWithDetails();
        setQuestions(data);
        setFiltered(data);
      } catch (err) {
        console.error("Failed to fetch questions:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, []);

  useEffect(() => {
    const lower = search.toLowerCase();
    let result = questions.filter((q) => {
      const matchesSearch = q.question_text?.toLowerCase().includes(lower);
      const matchesDifficulty = difficultyFilter ? q.difficulty === difficultyFilter : true;
      const matchesType = typeFilter ? q.question_type === typeFilter : true;
      const matchesTimeLimit = timeLimitFilter ? q.time_limit === parseInt(timeLimitFilter) : true;
      const matchesTags = selectedTags.length
        ? selectedTags.every((tag) => q.tags?.includes(tag))
        : true;
      return matchesSearch && matchesDifficulty && matchesType && matchesTimeLimit && matchesTags;
    });

    if (sortField) {
      result.sort((a, b) => {
        if (a[sortField] < b[sortField]) return sortDirection === "asc" ? -1 : 1;
        if (a[sortField] > b[sortField]) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    setFiltered(result);
  }, [search, difficultyFilter, typeFilter, timeLimitFilter, selectedTags, questions, sortField, sortDirection]);

  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleDelete = (id) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    setSelected((prev) => prev.filter((qid) => qid !== id));
    setDeleteTarget(null);
  };

  const handleCreateQuiz = () => {
    if (selected.length === 0) {
      alert("Select at least one question first.");
      return;
    }
    setShowAddToQuizModal(true);
  };

  

  const handleJSONSubmit = async () => {
    const file = jsonFileInputRef.current?.files?.[0];
    if (!file) {
      alert("Please select a JSON file.");
      return;
    }

    try {
      const text = await file.text();
      const questionsData = JSON.parse(text);
      
      if (!Array.isArray(questionsData)) {
        alert("JSON file must contain an array of questions.");
        return;
      }

      // Validate each question has required fields
      const validQuestions = questionsData.filter(q => {
        return q.question_text && q.question_type && 
               ['mcq', 'multiple', 'truefalse', 'typed'].includes(q.question_type);
      });

      if (validQuestions.length === 0) {
        alert("No valid questions found in the JSON file.");
        return;
      }

      // Send to backend for creation
      const result = await createBulkQuestions(validQuestions);
      
      if (result.created > 0) {
        // Refresh the questions list
        const updatedQuestions = await getAllQuestionsWithDetails();
        setQuestions(updatedQuestions);
        
        alert(`Successfully added ${result.created} questions to the pool!${result.error_count > 0 ? ` ${result.error_count} questions had errors.` : ''}`);
      } else {
        alert("No questions were created. Please check the JSON format.");
      }
      
      setShowJSONModal(false);
    } catch (error) {
      alert(`Error processing JSON file: ${error.message}`);
    }
  };


  const handleTagToggle = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const selectAllVisible = () => {
    const visibleIds = filtered.map((q) => q.id);
    const newSelected = Array.from(new Set([...selected, ...visibleIds]));
    setSelected(newSelected);
  };

  const deselectAll = () => {
    setSelected([]);
  };

  const handleSelectRandom = () => {
    const count = parseInt(randomCount, 10);
    if (isNaN(count) || count <= 0) {
      alert("Please enter a valid number of questions to select.");
      return;
    }
    const shuffled = [...filtered].sort(() => 0.5 - Math.random());
    const selectedIds = shuffled.slice(0, count).map((q) => q.id);
    setSelected(Array.from(new Set([...selected, ...selectedIds])));
  };

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const allTags = [...new Set(questions.flatMap((q) => q.tags || []))];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Manage Questions</h1>
                 <div className="flex gap-2">
           <button className="btn btn-outline" onClick={() => setShowCreate(true)}>
             ➕ Create Question
           </button>
           <button className="btn btn-outline" onClick={handleJSONUpload}>
             📄 Upload JSON
           </button>
           <button className="btn btn-primary" onClick={handleCreateQuiz}>
             + Add to Quiz
           </button>
         </div>
      </div>

      <div className="flex gap-4 flex-wrap items-center">
        <input
          type="text"
          className="input input-bordered w-full max-w-sm"
          placeholder="Search questions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="flex gap-2">
          <button className="btn btn-outline" onClick={selectAllVisible}>
            Select All Visible
          </button>
          <button className="btn btn-outline" onClick={deselectAll}>
            Deselect All
          </button>
          <div className="join outline">
            <input
              className="input join-item"
              placeholder="No. of Questions"
              value={randomCount}
              onChange={(e) => setRandomCount(e.target.value)}
            />
            <button className="btn btn-outline join-item" onClick={handleSelectRandom}>
              Select Random
            </button>
          </div>
        </div>
      </div>

               <div className="flex gap-4 flex-wrap items-center">
           <select
             className="select select-bordered"
             value={difficultyFilter}
             onChange={(e) => setDifficultyFilter(e.target.value)}
           >
             <option value="">All Difficulties</option>
             <option value="easy">Easy</option>
             <option value="medium">Medium</option>
             <option value="hard">Hard</option>
           </select>

           <select
             className="select select-bordered"
             value={typeFilter}
             onChange={(e) => setTypeFilter(e.target.value)}
           >
             <option value="">All Types</option>
             <option value="mcq">MCQ</option>
             <option value="truefalse">True or False</option>
             <option value="typed">Type In</option>
           </select>

           <select
             className="select select-bordered"
             value={timeLimitFilter}
             onChange={(e) => setTimeLimitFilter(e.target.value)}
           >
             <option value="">All Time Limits</option>
             <option value="0">No Limit</option>
             <option value="15">15 seconds</option>
             <option value="30">30 seconds</option>
             <option value="45">45 seconds</option>
             <option value="60">1 minute</option>
             <option value="90">1.5 minutes</option>
             <option value="120">2 minutes</option>
             <option value="180">3 minutes</option>
             <option value="300">5 minutes</option>
           </select>

        <div className="dropdown">
          <div tabIndex={0} role="button" className="btn btn-outline">
            Filter Tags ({selectedTags.length})
          </div>
          <ul
            tabIndex={0}
            className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52 max-h-64 overflow-y-auto"
          >
            {allTags.map((tag) => (
              <li key={tag}>
                <label className="cursor-pointer label justify-start gap-2">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={selectedTags.includes(tag)}
                    onChange={() => handleTagToggle(tag)}
                  />
                  <span className="label-text">{tag}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
                         <tr>
               <th></th>
               <th className="cursor-pointer" onClick={() => toggleSort("id")}>ID</th>
               <th className="cursor-pointer" onClick={() => toggleSort("question_text")}>Question</th>
               <th className="cursor-pointer" onClick={() => toggleSort("question_type")}>Type</th>
               <th className="cursor-pointer" onClick={() => toggleSort("difficulty")}>Difficulty</th>
               <th className="cursor-pointer" onClick={() => toggleSort("time_limit")}>Time Limit</th>
               <th>Tags</th>
               <th>Actions</th>
             </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="text-center py-4">Loading...</td></tr>
                         ) : filtered.length === 0 ? (
               <tr><td colSpan="8" className="text-center py-4 text-base-content/60">No matching questions found.</td></tr>
             ) : (
              filtered.map((q) => (
                <tr key={q.id}>
                  <td>
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={selected.includes(q.id)}
                      onChange={() => toggleSelect(q.id)}
                    />
                  </td>
                  <td>{q.id}</td>
                  <td className="truncate max-w-xs" title={q.question_text}>
                    {q.question_text}
                  </td>
                  <td>
                    <span className="badge badge-outline badge-sm capitalize">{q.question_type}</span>
                  </td>
                                     <td>
                     <span className="badge badge-info badge-sm capitalize">{q.difficulty || "N/A"}</span>
                   </td>
                   <td>
                     <span className="badge badge-neutral badge-sm">
                       {q.time_limit ? `${q.time_limit}s` : "No limit"}
                     </span>
                   </td>
                   <td className="space-x-1">
                     {q.tags?.map((t) => (
                       <span key={t} className="badge badge-ghost badge-xs">{t}</span>
                     ))}
                   </td>
                  <td className="flex gap-2">
                    <button 
                      className="btn btn-square btn-sm btn-ghost" 
                      onClick={() => setViewTarget(q)}
                      title="View Question"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      className="btn btn-square btn-sm btn-info" 
                      onClick={() => setEditTarget(q)}
                      title="Edit Question"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button 
                      className="btn btn-square btn-sm btn-error" 
                      onClick={() => setDeleteTarget(q)}
                      title="Delete Question"
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

      {/* Modals */}
      {showCreate && (
        <CreateQuestionModal
          onClose={() => setShowCreate(false)}
          onCreate={(newQ) => {
            const full = { id: Date.now(), ...newQ };
            setQuestions((prev) => [...prev, full]);
            setShowCreate(false);
          }}
        />
      )}

      {editTarget && (
        <EditQuestionModal
          question={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={(updated) => {
            setQuestions((prev) =>
              prev.map((q) => (q.id === updated.id ? updated : q))
            );
            setEditTarget(null);
          }}
        />
      )}

      {deleteTarget && (
        <DeleteQuestionModal
          isOpen
          question={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => handleDelete(deleteTarget.id)}
        />
      )}

      {viewTarget && (
        <ViewQuestionModal
          question={viewTarget}
          onClose={() => setViewTarget(null)}
        />
      )}

      {showAddToQuizModal && (
  <CreateQuizWizardModal
    isOpen={showAddToQuizModal}
    onClose={() => setShowAddToQuizModal(false)}
    selectedQuestions={questions.filter((q) => selected.includes(q.id))}
  />
)}

      

{showJSONModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Upload Questions via JSON</h3>
            <p className="py-2 text-sm text-base-content/70">
              Please upload a JSON file containing an array of questions.
            </p>
            <div className="bg-base-200 p-3 rounded-lg mb-4">
              <p className="text-xs font-mono">
                Expected format: {'[{"question_text": "...", "question_type": "mcq", "options": [...], "correct_answers": [...], "difficulty": "medium", "tags": [...], "time_limit": 30}]'}
              </p>
            </div>
            <input
              type="file"
              accept=".json"
              ref={jsonFileInputRef}
              className="file-input file-input-bordered w-full"
            />
            <div className="modal-action">
              <button className="btn" onClick={() => setShowJSONModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleJSONSubmit}>Upload</button>
            </div>
          </div>
        </div>
      )}
    </div>   
  );          
};

export default QuestionList;
