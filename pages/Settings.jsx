import { useState, useEffect } from "react";
import { auth, db } from "../src/firebase";
import { reauthenticateWithCredential, EmailAuthProvider, updatePassword } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function Settings() {
  const nav = useNavigate();

  // PASSWORD STATES
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [showPass, setShowPass] = useState(false);

  // HISTORY
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!auth.currentUser) nav("/");
    loadHistory();
  }, []);

  // -----------------------------------
  // 🔐 CHANGE PASSWORD
  // -----------------------------------
  const changePassword = async () => {
    try {
      const user = auth.currentUser;

      // Re-authenticate user
      const cred = EmailAuthProvider.credential(
        user.email,
        oldPass
      );

      await reauthenticateWithCredential(user, cred);

      await updatePassword(user, newPass);

      alert("Password updated successfully!");
      setOldPass("");
      setNewPass("");

    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  // -----------------------------------
  // 📜 LOAD HISTORY (NOTES)
  // -----------------------------------
  const loadHistory = async () => {
    try {
      const q = query(
        collection(db, "notes"),
        where("uid", "==", auth.currentUser.uid)
      );

      const snap = await getDocs(q);
      const list = [];

      snap.forEach((doc) => {
        list.push({
          id: doc.id,
          ...doc.data()
        });
      });

      setHistory(list.reverse());
    } catch (err) {
      console.error("History load error:", err);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Account Settings</h2>

      {/* CHANGE PASSWORD */}
      <div style={{ marginTop: 20, padding: 15, border: "1px solid #ccc" }}>
        <h3>Change Password</h3>

        <label>Current Password</label><br />
        <input
          type={showPass ? "text" : "password"}
          value={oldPass}
          onChange={(e) => setOldPass(e.target.value)}
        /><br /><br />

        <label>New Password</label><br />
        <input
          type={showPass ? "text" : "password"}
          value={newPass}
          onChange={(e) => setNewPass(e.target.value)}
        /><br /><br />

        <label>
          <input
            type="checkbox"
            checked={showPass}
            onChange={() => setShowPass(!showPass)}
          />
          Show Passwords
        </label>
        <br /><br />

        <button onClick={changePassword}>Update Password</button>
      </div>

      {/* HISTORY */}
      <div style={{ marginTop: 40 }}>
        <h3>Your History</h3>

        {history.length === 0 ? (
          <p>No history found.</p>
        ) : (
          <ul style={{ paddingLeft: 15 }}>
            {history.map((item) => (
              <li key={item.id} style={{ marginBottom: 10 }}>
                <strong>{new Date(item.created.toDate()).toLocaleString()}</strong>
                <br />
                {item.text}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* BACK BUTTON */}
      <button onClick={() => nav("/home")} style={{ marginTop: 20 }}>
        ⬅ Back
      </button>
    </div>
  );
}
