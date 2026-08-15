import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [groups, setGroups] = useState([]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const [totalOwed, setTotalOwed] = useState(0);
  const [totalOwe, setTotalOwe] = useState(0);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);

      const [userResponse, groupsResponse] = await Promise.all([
        api.get("/me"),
        api.get("/groups"),
      ]);

      setUser(userResponse.data);
      setGroups(groupsResponse.data);

      // Calculate dashboard balances
      let owed = 0;
      let owe = 0;

      for (const group of groupsResponse.data) {
        try {
          const response = await api.get(`/groups/${group.id}/balances`);

          const currentUser = response.data.find(
            (member) => member.id === userResponse.data.id
          );

          if (currentUser) {
            const balance = Number(currentUser.balance);

            if (balance > 0) {
              owed += balance;
            } else if (balance < 0) {
              owe += Math.abs(balance);
            }
          }
        } catch (error) {
          console.error(
            `Could not load balance for group ${group.id}`,
            error
          );
        }
      }

      setTotalOwed(owed);
      setTotalOwe(owe);
    } catch (error) {
      console.error("Dashboard error:", error);

      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  }

  async function createGroup() {
    if (!name.trim()) {
      setMessage("Please enter a group name");
      return;
    }

    try {
      const response = await api.post("/groups", {
        name: name.trim(),
      });

      setName("");
      setMessage("Group created successfully!");

      await loadDashboard();

      console.log("Group created:", response.data);
    } catch (error) {
      console.error("Create group error:", error);

      setMessage(
        error.response?.data?.message ||
          "Could not create group"
      );
    }
  }

  function openGroup(groupId) {
    navigate(`/groups/${groupId}`);
  }

  function logout() {
    localStorage.removeItem("token");
    navigate("/login");
  }

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="loading">
          Loading CampusSplit...
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">

      {/* HEADER */}
      <header className="dashboard-header">
        <div>
          <h1>CampusSplit</h1>
          <p>Split expenses. Track balances. Stay organized.</p>
        </div>

        <div className="header-user">
          <div>
            <strong>
              {user?.name || "User"}
            </strong>
            <small>
              {user?.email}
            </small>
          </div>

          <button
            className="logout-button"
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard-container">

        {/* WELCOME */}
        <section className="welcome-section">
          <h2>
            Welcome back, {user?.name || "User"} 👋
          </h2>

          <p>
            Here's an overview of your shared expenses.
          </p>
        </section>

        {/* SUMMARY CARDS */}
        <section className="summary-grid">

          <div className="summary-card">
            <span className="summary-icon">👥</span>

            <div>
              <p>Total Groups</p>
              <h3>{groups.length}</h3>
            </div>
          </div>

          <div className="summary-card">
            <span className="summary-icon">💰</span>

            <div>
              <p>You Are Owed</p>
              <h3>
                ₹{totalOwed.toFixed(2)}
              </h3>
            </div>
          </div>

          <div className="summary-card">
            <span className="summary-icon">💸</span>

            <div>
              <p>You Owe</p>
              <h3>
                ₹{totalOwe.toFixed(2)}
              </h3>
            </div>
          </div>

        </section>

        {/* CREATE GROUP */}
        <section className="create-group-card">

          <div>
            <h2>Create a New Group</h2>

            <p>
              Create a group for your friends, roommates,
              trip or college project.
            </p>
          </div>

          <div className="create-group-form">

            <input
              type="text"
              placeholder="e.g. College Friends"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setMessage("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  createGroup();
                }
              }}
            />

            <button onClick={createGroup}>
              + Create Group
            </button>

          </div>

          {message && (
            <p className="group-message">
              {message}
            </p>
          )}

        </section>

        {/* GROUPS */}
        <section className="groups-section">

          <div className="section-heading">
            <div>
              <h2>Your Groups</h2>
              <p>
                Manage your shared expenses and members.
              </p>
            </div>

            <span className="group-count">
              {groups.length} group
              {groups.length !== 1 ? "s" : ""}
            </span>
          </div>

          {groups.length === 0 ? (

            <div className="empty-groups">

              <div className="empty-icon">
                👥
              </div>

              <h3>No groups yet</h3>

              <p>
                Create your first group to start
                splitting expenses.
              </p>

            </div>

          ) : (

            <div className="groups-grid">

              {groups.map((group) => (
                <div
                  className="group-card"
                  key={group.id}
                >

                  <div className="group-card-top">

                    <div className="group-icon">
                      👥
                    </div>

                    <span>
                      {group.member_count} member
                      {Number(group.member_count) !== 1
                        ? "s"
                        : ""}
                    </span>

                  </div>

                  <h3>
                    {group.name}
                  </h3>

                  <p>
                    Created{" "}
                    {new Date(
                      group.created_at
                    ).toLocaleDateString()}
                  </p>

                  <button
                    className="open-group-button"
                    onClick={() =>
                      openGroup(group.id)
                    }
                  >
                    Open Group →
                  </button>

                </div>
              ))}

            </div>

          )}

        </section>

      </main>
    </div>
  );
}