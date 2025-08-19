import React, { useEffect, useState, useRef } from 'react';
import {
  Loader2,
  BookOpen,
  ClipboardList,
  UserCircle,
  Star,
  Timer,
  Users,
  ListChecks,
  ListTodo,
  Phone,
  Calendar,
  MapPin,
  GraduationCap,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';

const Dashboard = () => {
  const { user, loading, fetchProfile } = useAuth();
  const [fullProfile, setFullProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const loadingRef = useRef(false);

  // Debug: Log user data
  console.log('Dashboard - User data:', user);
  console.log('Dashboard - Full profile:', fullProfile);

  const isStudent = user?.role === 'student';
  const isTeacher = user?.role === 'teacher';
  const isAdmin = user?.role === 'admin';

  // Load full profile data
  useEffect(() => {
    const loadProfile = async () => {
      if (!user || loadingRef.current || fullProfile) return; // Don't load if already have full profile
      
      loadingRef.current = true;
      setProfileLoading(true);
      try {
        console.log('Dashboard - Loading full profile...');
        const profile = await fetchProfile();
        console.log('Dashboard - Full profile loaded:', profile);
        setFullProfile(profile);
      } catch (err) {
        console.error('Dashboard - Failed to load profile:', err);
        toast.error('Failed to load profile data');
      } finally {
        setProfileLoading(false);
        loadingRef.current = false;
      }
    };

    loadProfile();
  }, [user, fetchProfile, fullProfile]); // Added back fetchProfile and fullProfile

  // Use full profile data if available, otherwise fall back to basic user data
  const displayUser = fullProfile || user;

  if (loading || !user || profileLoading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const InfoCard = ({ icon: Icon, label, value, color = 'text-primary' }) => (
    <div className="card bg-base-200 shadow-md">
      <div className="card-body flex items-center gap-4">
        <Icon className={`w-6 h-6 ${color}`} />
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-lg font-semibold">
            {value && value !== 'null' && value !== 'N/A' ? value : 'Not provided'}
          </p>
        </div>
      </div>
    </div>
  );

  const formatDate = (dateString) => {
    if (!dateString || dateString === 'null' || dateString === 'N/A') return 'Not provided';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Profile Card */}
      <div className="card shadow-xl bg-base-100 border border-base-300">
        <div className="card-body flex flex-col md:flex-row gap-6 items-center">
          <div className="avatar">
            <div className="w-24 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
              <img src={`https://api.dicebear.com/7.x/thumbs/svg?seed=${user.name}`} alt="avatar" />
            </div>
          </div>
          <div className="flex-1 space-y-2 text-center md:text-left">
            <h2 className="text-2xl font-bold">{displayUser.name}</h2>
            <p className="text-sm opacity-80">
              {displayUser.username && displayUser.username !== 'null' && displayUser.username !== 'N/A' ? `@${displayUser.username} • ` : ''}{displayUser.email || 'No email provided'}
            </p>
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              <span className="badge badge-outline capitalize">
                {displayUser.role}
              </span>
              {displayUser.verification_status && (
                <span className="badge badge-success">
                  Verified
                </span>
              )}
              {displayUser.user_state && displayUser.user_state !== 'null' && displayUser.user_state !== 'N/A' && (
                <span className="badge badge-info">
                  {displayUser.user_state}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* User Information Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Personal Info */}
        <InfoCard icon={Phone} label="Phone" value={displayUser.phone} color="text-info" />
        <InfoCard icon={Calendar} label="Date of Birth" value={formatDate(displayUser.dob)} color="text-warning" />
        <InfoCard icon={UserCircle} label="Gender" value={displayUser.gender} color="text-accent" />
        
        {/* School Info (for students and teachers) */}
        {(isStudent || isTeacher) && (
          <>
            <InfoCard icon={MapPin} label="School" value={displayUser.school} color="text-success" />
            <InfoCard icon={GraduationCap} label="Class" value={displayUser.class} color="text-primary" />
            <InfoCard icon={Shield} label="Section" value={displayUser.section} color="text-secondary" />
          </>
        )}
      </div>

      {/* Role-specific Information */}
      {isAdmin && (
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <h3 className="card-title text-lg font-semibold mb-4">Admin Dashboard</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <InfoCard icon={Users} label="Manage Users" value="User Management" color="text-primary" />
              <InfoCard icon={BookOpen} label="Manage Quizzes" value="Quiz Management" color="text-success" />
              <InfoCard icon={ListTodo} label="Question Pool" value="Question Management" color="text-warning" />
              <InfoCard icon={Shield} label="System Settings" value="Admin Settings" color="text-info" />
            </div>
            <div className="mt-4 text-sm text-gray-600">
              <p>• Use the sidebar navigation to access different admin features</p>
              <p>• You can create, edit, and delete users, quizzes, and questions</p>
              <p>• Monitor system activity and manage user permissions</p>
            </div>
          </div>
        </div>
      )}

      {isTeacher && (
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <h3 className="card-title text-lg font-semibold mb-4">Teacher Dashboard</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <InfoCard icon={BookOpen} label="Create Quizzes" value="Quiz Creation" color="text-primary" />
              <InfoCard icon={ClipboardList} label="Question Pool" value="Question Management" color="text-success" />
              <InfoCard icon={Users} label="Student Progress" value="Progress Tracking" color="text-warning" />
            </div>
            <div className="mt-4 text-sm text-gray-600">
              <p>• Create and manage quizzes for your students</p>
              <p>• Add questions to the question pool</p>
              <p>• Track student progress and performance</p>
            </div>
          </div>
        </div>
      )}

      {isStudent && (
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <h3 className="card-title text-lg font-semibold mb-4">Student Dashboard</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <InfoCard icon={BookOpen} label="Available Quizzes" value="Take Quizzes" color="text-primary" />
              <InfoCard icon={ListChecks} label="My Attempts" value="View History" color="text-success" />
              <InfoCard icon={Star} label="My Stats" value="Performance" color="text-warning" />
            </div>
            <div className="mt-4 text-sm text-gray-600">
              <p>• Browse and take available quizzes</p>
              <p>• View your quiz attempt history</p>
              <p>• Check your performance statistics</p>
            </div>
          </div>
        </div>
      )}

      {/* Account Information */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h3 className="card-title text-lg font-semibold mb-4">Account Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoCard icon={Calendar} label="Member Since" value={formatDate(displayUser.created_at)} color="text-primary" />
            <InfoCard icon={Calendar} label="Last Updated" value={formatDate(displayUser.updated_at)} color="text-info" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
