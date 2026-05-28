import React, { useState, useEffect } from "react";
import api from "../api/axios";
import { FiTrash2 } from "react-icons/fi";
import toast from "react-hot-toast";
import { usePopup } from "../context/PopupContext";
import "./UserManagement.css";
import EasDocLoader from "../components/EasDocLoader";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showPopup } = usePopup();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get("/users");
      setUsers(res.data);
    } catch {
      toast.error("Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.put(`/users/${userId}/role`, { role: newRole });
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast.success("User role updated successfully.");
    } catch {
      toast.error("Failed to update user role.");
    }
  };

  const handleDelete = async (userId) => {
    showPopup({
      type: 'warning',
      title: 'Delete User',
      message: 'Are you sure you want to delete this user? This action cannot be undone and will remove all their data.',
      confirmText: 'Delete User',
      onConfirm: async () => {
        try {
          await api.delete(`/users/${userId}`);
          setUsers(users.filter(u => u.id !== userId));
          toast.success("User deleted successfully.");
        } catch {
          toast.error("Failed to delete user.");
        }
      },
      onCancel: () => {}
    });
  };

  if (loading) return <EasDocLoader message="Loading users" />;

  return (
    <div className="user-management-page animate-fade-in">
      <div className="user-management-header">
        <h2>User Management</h2>
        <p>Manage platform access, assign roles, and remove accounts.</p>
      </div>

      <div className="user-table-container">
        <table className="user-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Manage Role</th>
              <th>Badge</th>
              <th>Joined Date</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length > 0 ? (
              users.map((user) => (
                <tr key={user.id}>
                  <td style={{ fontWeight: 600 }}>{user.fullName}</td>
                  <td>{user.email}</td>
                  <td>
                    <select 
                      value={user.role} 
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className="role-select"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>
                    <span className={`badge badge-${user.role === 'admin' ? 'warning' : 'success'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td className="text-right">
                    <div className="flex gap-2 justify-end">
                      <button className="btn-delete" onClick={() => handleDelete(user.id)} title="Delete User">
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="empty-state">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagement;

