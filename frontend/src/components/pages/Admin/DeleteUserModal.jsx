import React from "react";

const DeleteUserModal = ({ user, onClose, onConfirm }) => {
  return (
    <dialog className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Delete User</h3>
        <p className="py-4">Are you sure you want to delete <strong>{user?.name}</strong>?</p>

        <div className="modal-action">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-error" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </dialog>
  );
};

export default DeleteUserModal;
