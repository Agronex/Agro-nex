import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LogOut, Edit2 } from "lucide-react";
import { auth, db } from "../firebase";
import { signOut, updateProfile } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";

interface ProfileMenuProps {
  onClose: () => void;
}

const ProfileMenu: React.FC<ProfileMenuProps> = ({ onClose }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  // 🔹 Fetch user details from Firebase Auth + Firestore
  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setEmail(user.email || "");

      const fetchProfile = async () => {
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            setUsername(docSnap.data().username || user.displayName || "");
          } else {
            setUsername(user.displayName || "");
          }
        } catch (err) {
          console.error("Error fetching profile:", err);
        } finally {
          setLoading(false);
        }
      };

      fetchProfile();
    }
  }, []);

  // 📝 Save updated username to Firebase
  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      setLoading(true);
      // Update in Firebase Auth
      await updateProfile(user, {
        displayName: username,
      });

      // Update in Firestore
      await updateDoc(doc(db, "users", user.uid), {
        username: username,
      });

      setIsEditing(false);
    } catch (err) {
      console.error("Error updating profile:", err);
    } finally {
      setLoading(false);
    }
  };

  // 🚪 Logout function
  const handleLogout = async () => {
    try {
      await signOut(auth);
      onClose();
      // Optionally redirect to login page
      window.location.href = "/login";
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 p-4 flex items-center justify-center"
      >
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-green-600"></div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 p-4"
    >
      <div className="flex flex-col space-y-3">
        {!isEditing ? (
          <>
            <div>
              <p className="text-lg font-semibold text-gray-800">{username || "No Name"}</p>
              <p className="text-sm text-gray-500">{email}</p>
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center space-x-2 text-green-600 hover:text-green-700"
            >
              <Edit2 className="w-4 h-4" />
              <span>Edit Profile</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 text-red-600 hover:text-red-700"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </>
        ) : (
          <>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-green-400 outline-none"
              placeholder="Username"
            />
            <input
              type="email"
              value={email}
              disabled
              className="w-full p-2 border rounded bg-gray-100 cursor-not-allowed"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsEditing(false)}
                className="text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="text-green-600 font-semibold hover:text-green-700"
                disabled={loading}
              >
                Save
              </button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default ProfileMenu;
