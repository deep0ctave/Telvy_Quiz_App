import React, { useState, useEffect } from "react";
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { createUser, getUserById } from "../../../services/api";
import { toast } from "react-toastify";

const CreateUserModal = ({ onClose, onCreate }) => {
  const [form, setForm] = useState({
    username: "",
    password: "",
    phone: "",
    email: "",
    name: "",
    gender: "",
    dob: null,
    role: "",
    verification_status: false,
    school: "",
    class: "",
    section: "",
  });

  const handleChange = (key, val) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        ...form,
        dob: form.dob ? form.dob.toISOString().split("T")[0] : null,
        phone: form.phone
      };
      const res = await createUser(payload);
      // The backend returns { id: newUserId }, so we need to fetch the complete user data
      const newUser = await getUserById(res.id);
      onCreate(newUser);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to create user");
    }
  };



  return (
    <dialog open className="modal modal-open">
      <div className="modal-box space-y-4 max-w-2xl max-h-[95vh] min-h-[28rem] overflow-visible">
        <h3 className="font-bold text-lg">Create User</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="input">
            <span className="label">Username</span>
            <input value={form.username} onChange={(e) => handleChange("username", e.target.value)} />
          </label>

          <label className="input">
            <span className="label">Password</span>
            <input type="password" value={form.password} onChange={(e) => handleChange("password", e.target.value)} />
          </label>

          <label className="input">
            <span className="label">Phone</span>
            <PhoneInput
              defaultCountry="IN"
              value={form.phone}
              onChange={(val) => handleChange("phone", val || "")}
              className="w-full"
            />
          </label>

          <label className="input">
            <span className="label">Email</span>
            <input value={form.email} onChange={(e) => handleChange("email", e.target.value)} />
          </label>

          <label className="input">
            <span className="label">Name</span>
            <input value={form.name} onChange={(e) => handleChange("name", e.target.value)} />
          </label>

          <label className="input">
            <span className="label">Gender</span>
            <select className="select" value={form.gender} onChange={(e) => handleChange("gender", e.target.value)}>
              <option disabled value="">Select gender</option>
              <option>male</option>
              <option>female</option>
              <option>other</option>
            </select>
          </label>

          <label className="input">
            <span className="label">DOB</span>
            <DatePicker
              selected={form.dob}
              onChange={(date) => handleChange("dob", date)}
              dateFormat="dd/MM/yyyy"
              className="input input-bordered w-full"
              wrapperClassName="w-full"
              popperPlacement="bottom-start"
              popperClassName="z-[9999]"
              shouldCloseOnScroll={false}
              maxDate={new Date()}
              showMonthDropdown
              showYearDropdown
              dropdownMode="select"
              yearDropdownItemNumber={100}
              shouldCloseOnSelect
              placeholderText="Select date"
            />
          </label>

          <label className="input">
            <span className="label">School</span>
            <input
              value={form.school}
              onChange={(e) => handleChange("school", e.target.value)}
              placeholder="Enter school name"
            />
          </label>

          <label className="input">
            <span className="label">Class</span>
            <select className="select" value={form.class} onChange={(e) => handleChange("class", e.target.value)}>
              <option disabled value="">Select</option>
              {[...Array(12)].map((_, i) => <option key={i}>{i + 1}</option>)}
            </select>
          </label>

          <label className="input">
            <span className="label">Section</span>
            <select className="select" value={form.section} onChange={(e) => handleChange("section", e.target.value)}>
              <option disabled value="">Select</option>
              {["A", "B", "C", "D"].map((sec) => <option key={sec}>{sec}</option>)}
            </select>
          </label>

          <label className="input">
            <span className="label">User Type</span>
            <select className="select" value={form.role} onChange={(e) => handleChange("role", e.target.value)}>
              <option disabled value="">Select</option>
              <option>student</option>
              <option>teacher</option>
              <option>admin</option>
            </select>
          </label>

          <label className="input">
            <span className="label">Verified?</span>
            <select className="select" value={form.verification_status} onChange={(e) => handleChange("verification_status", e.target.value === "true")}>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </label>
        </div>

        <div className="modal-action">
          <button className="btn btn-primary" onClick={handleSubmit}>Create</button>
          <button className="btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </dialog>
  );
};

export default CreateUserModal;
