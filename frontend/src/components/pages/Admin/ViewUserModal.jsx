import React from "react";
import { X } from "lucide-react";

const ViewUserModal = ({ user, onClose }) => {
  const formatDate = (dateString) => {
    if (!dateString) return "Not provided";
    return new Date(dateString).toLocaleDateString("en-GB");
  };

  const badgeColor = (type) => {
    if (type === "admin") return "badge-neutral";
    if (type === "teacher") return "badge-primary";
    return "badge-accent";
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-xl">User Details</h2>
          <button onClick={onClose} className="btn btn-sm btn-circle">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="space-y-4">
          {/* Basic Information */}
          <div className="card bg-base-200">
            <div className="card-body">
              <h3 className="card-title text-lg">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Name</label>
                  <p className="text-lg">{user.name || "Not provided"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Username</label>
                  <p className="text-lg">{user.username || "Not provided"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-lg">{user.email || "Not provided"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <p className="text-lg">{user.phone || "Not provided"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Role</label>
                  <span className={`badge ${badgeColor(user.role)}`}>
                    {user.role || "Not provided"}
                  </span>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Gender</label>
                  <p className="text-lg capitalize">{user.gender || "Not provided"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Date of Birth</label>
                  <p className="text-lg">{formatDate(user.dob)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Verification Status</label>
                  <span className={`badge ${user.verification_status ? "badge-success" : "badge-warning"}`}>
                    {user.verification_status ? "Verified" : "Not Verified"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* School Information */}
          {(user.role === "student" || user.role === "teacher") && (
            <div className="card bg-base-200">
              <div className="card-body">
                <h3 className="card-title text-lg">School Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">School</label>
                    <p className="text-lg">{user.school || "Not provided"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Class</label>
                    <p className="text-lg">{user.class || "Not provided"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Section</label>
                    <p className="text-lg">{user.section || "Not provided"}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Account Information */}
          <div className="card bg-base-200">
            <div className="card-body">
              <h3 className="card-title text-lg">Account Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">User State</label>
                  <span className={`badge ${user.user_state === "active" ? "badge-success" : "badge-error"}`}>
                    {user.user_state || "Not provided"}
                  </span>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Created At</label>
                  <p className="text-lg">{formatDate(user.created_at)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Last Updated</label>
                  <p className="text-lg">{formatDate(user.updated_at)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">User ID</label>
                  <p className="text-lg font-mono">{user.id}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-action">
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default ViewUserModal;
