import { signOut } from "firebase/auth";
import { auth } from "../firebase";

const SettingsPanel = () => (
  <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-8">
    <h3 className="text-2xl font-bold text-gray-800 mb-6">Settings</h3>

    <button
      onClick={() => signOut(auth)}
      className="
        bg-green-600 text-white px-6 py-3 rounded-xl 
        shadow-lg hover:bg-green-500 hover:scale-105 
        transition transform duration-300 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2
      "
    >
      Logout
    </button>
  </div>
);

export default SettingsPanel;
