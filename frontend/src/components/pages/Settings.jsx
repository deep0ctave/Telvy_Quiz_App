import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { updateProfile } from '../../services/api';
import { toast } from 'react-hot-toast';

const Settings = () => {
  const { user, fetchProfile } = useAuth();

  const [formData, setFormData] = useState({
    username: '',
    name: '',
    email: '',
    phone: '',
    school: '',
    class: '',
    section: '',
    gender: '',
    dob: '',
    newPassword: '',
    confirmPassword: '',
    oldPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const loadingRef = useRef(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (profileLoaded || loadingRef.current) return; // Prevent multiple loads
      
      loadingRef.current = true;
      setProfileLoading(true);
      try {
        console.log('Settings - Loading full profile...');
        const profile = await fetchProfile();
        console.log('Settings - Full profile loaded:', profile);
        
        if (profile) {
          setFormData((prev) => ({
            ...prev,
            username: profile.username || '',
            name: profile.name || '',
            email: profile.email || '',
            phone: profile.phone || '',
            school: profile.school || '',
            class: profile.class || '',
            section: profile.section || '',
            gender: profile.gender || '',
            dob: profile.dob?.slice(0, 10) || '',
          }));
          setProfileLoaded(true);
        }
      } catch (err) {
        console.error('Settings - Failed to load profile:', err);
        toast.error('Failed to load profile data');
      } finally {
        setProfileLoading(false);
        loadingRef.current = false;
      }
    };

    if (user && !profileLoaded) {
      loadProfile();
    } else if (!user) {
      setProfileLoading(false);
    }
  }, [user, fetchProfile, profileLoaded]); // Added back fetchProfile and profileLoaded

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const updateData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        school: formData.school,
        class: formData.class,
        section: formData.section,
        gender: formData.gender,
        dob: formData.dob,
      };
      
      await updateProfile(updateData);
      await fetchProfile(); // Refresh user data
      toast.success('Profile updated successfully!');
    } catch (err) {
      console.error('Error updating profile:', err);
      toast.error(err?.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    setLoading(true);
    try {
      await updateProfile({ password: formData.newPassword });
      toast.success('Password updated successfully!');
      
      // Clear password fields
      setFormData(prev => ({
        ...prev,
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    } catch (err) {
      console.error('Error updating password:', err);
      toast.error(err?.response?.data?.error || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Settings</h1>
                 <button 
           onClick={async () => {
             try {
               setProfileLoaded(false); // Reset flag to allow reload
               await fetchProfile();
               toast.success('Profile refreshed!');
             } catch (err) {
               toast.error('Failed to refresh profile');
             }
           }}
           className="btn btn-sm btn-outline"
         >
           Refresh Profile
         </button>
      </div>



      {profileLoading ? (
        <div className="flex justify-center items-center p-8">
          <div className="loading loading-spinner loading-lg"></div>
          <span className="ml-2">Loading profile...</span>
        </div>
      ) : (
        <div role="tablist" className="tabs tabs-bordered">
          {/* Profile tab */}
          <input type="radio" name="settings_tabs" role="tab" className="tab" aria-label="Profile" defaultChecked />
          <div role="tabpanel" className="tab-content p-4 border-base-300 bg-base-100 rounded-box space-y-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Profile Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Username</legend>
                <input type="text" name="username" className="input" value={formData.username} disabled />
                <p className="label">Cannot be changed</p>
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Full Name</legend>
                <input type="text" name="name" className="input" value={formData.name} onChange={handleChange} />
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Email</legend>
                <input type="email" name="email" className="input" value={formData.email} onChange={handleChange} />
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Phone</legend>
                <input type="tel" name="phone" className="input" value={formData.phone} onChange={handleChange} />
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Gender</legend>
                <input type="text" name="gender" className="input" value={formData.gender} onChange={handleChange} />
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Date of Birth</legend>
                <input type="date" name="dob" className="input" value={formData.dob} onChange={handleChange} />
              </fieldset>
            </div>

            {/* School Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <fieldset className="fieldset">
                <legend className="fieldset-legend">School</legend>
                <input
                  type="text"
                  name="school"
                  className="input"
                  value={formData.school}
                  onChange={handleChange}
                />
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Class</legend>
                <input
                  type="text"
                  name="class"
                  className="input"
                  value={formData.class}
                  onChange={handleChange}
                />
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Section</legend>
                <input
                  type="text"
                  name="section"
                  className="input"
                  value={formData.section}
                  onChange={handleChange}
                />
              </fieldset>
            </div>

            <button type="submit" className="btn btn-primary mt-2" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Security tab */}
        <input type="radio" name="settings_tabs" role="tab" className="tab" aria-label="Security" />
        <div role="tabpanel" className="tab-content p-4 border-base-300 bg-base-100 rounded-box">
          <form onSubmit={handlePasswordSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Current Password</legend>
              <input
                type="password"
                name="oldPassword"
                className="input"
                value={formData.oldPassword}
                onChange={handleChange}
                required
              />
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">New Password</legend>
              <input
                type="password"
                name="newPassword"
                className="input"
                value={formData.newPassword}
                onChange={handleChange}
                required
              />
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Confirm New Password</legend>
              <input
                type="password"
                name="confirmPassword"
                className="input"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </fieldset>

            <div className="md:col-span-2">
              <button type="submit" className="btn btn-warning mt-2" disabled={loading}>
                {loading ? 'Updating...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
      )}


    </div>
  );
};

export default Settings;
