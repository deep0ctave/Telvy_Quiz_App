import React, { useMemo } from "react";

const TagDropdown = ({
  selectedTags = [],
  setSelectedTags = () => {},
  questions = [],
}) => {
  const allTags = useMemo(() => {
    const tagSet = new Set();
    questions.forEach((q) => {
      if (Array.isArray(q.tags)) {
        q.tags.forEach((tag) => tagSet.add(tag));
      }
    });
    return Array.from(tagSet).sort();
  }, [questions]);

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  return (
    <div className="dropdown">
      <div tabIndex={0} role="button" className="btn btn-sm btn-outline m-1">
        Tags ({selectedTags.length})
      </div>
      <ul
        tabIndex={0}
        className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52 max-h-60 overflow-y-auto"
      >
        {allTags.map((tag) => (
          <li key={tag}>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={selectedTags.includes(tag)}
                onChange={() => toggleTag(tag)}
              />
              <span>{tag}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TagDropdown;
