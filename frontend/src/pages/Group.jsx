import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api";

export default function Group() {
  const { id } = useParams();

  const [data, setData] = useState(null);
  const [balances, setBalances] = useState([]);
  const [memberEmail, setMemberEmail] = useState("");
  const [expense, setExpense] = useState({
    description: "",
    amount: "",
    paidBy: "",
    splitUserIds: []
  });
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const [groupRes, balanceRes] = await Promise.all([
        api.get(`/groups/${id}`),
        api.get(`/groups/${id}/balances`)
      ]);

      setData(groupRes.data);
      setBalances(balanceRes.data);

      setExpense(prev => ({
        ...prev,
        paidBy:
          prev.paidBy ||
          String(groupRes.data.members[0]?.id || "")
      }));

    } catch (err) {
      setMessage(
        err.response?.data?.message ||
        "Could not load group"
      );
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function addMember(e) {
    e.preventDefault();

    try {
      await api.post(`/groups/${id}/members`, {
        email: memberEmail
      });

      setMemberEmail("");
      setMessage("Member added!");
      load();

    } catch (err) {
      setMessage(
        err.response?.data?.message ||
        "Could not add member"
      );
    }
  }

  function toggleUser(userId) {
    setExpense(prev => ({
      ...prev,
      splitUserIds: prev.splitUserIds.includes(userId)
        ? prev.splitUserIds.filter(x => x !== userId)
        : [...prev.splitUserIds, userId]
    }));
  }

  async function addExpense(e) {
    e.preventDefault();

    try {
      await api.post(`/groups/${id}/expenses`, {
        description: expense.description,
        amount: Number(expense.amount),
        paidBy: Number(expense.paidBy),
        splitUserIds: expense.splitUserIds
      });

      setExpense({
        description: "",
        amount: "",
        paidBy: data.members[0]?.id || "",
        splitUserIds: []
      });

      setMessage("Expense added!");
      load();

    } catch (err) {
      setMessage(
        err.response?.data?.message ||
        "Could not add expense"
      );
    }
  }


  async function settleBalance(fromUser, toUser, amount) {
    try {
      await api.post(`/groups/${id}/settlements`, {
        fromUser: Number(fromUser),
        toUser: Number(toUser),
        amount: Number(amount)
      });

      setMessage("Payment recorded successfully!");

      await load();
    } catch (err) {
      console.error("Settlement error:", err);

      setMessage(
        err.response?.data?.message ||
        "Could not record payment"
      );
    }
  }

  if (!data) {
    return (
      <div className="page">
        <p>{message || "Loading..."}</p>
      </div>
    );
  }

  /*
    Calculate totals for the current group.
    Positive balance = money owed to that person.
    Negative balance = that person owes money.
  */

  const totalOwed = balances
    .filter(b => b.balance > 0)
    .reduce((sum, b) => sum + Number(b.balance), 0);

  const totalDebt = balances
    .filter(b => b.balance < 0)
    .reduce((sum, b) => sum + Math.abs(Number(b.balance)), 0);

  return (
    <div className="page">

      {/* HEADER */}

      <header className="topbar">
        <h1>
          <Link to="/dashboard">
            CampusSplit
          </Link>
        </h1>

        <Link to="/dashboard">
          ← Dashboard
        </Link>
      </header>

      <main>

        {/* GROUP HEADER */}

        <div className="group-header">
          <div>
            <h2>{data.group.name}</h2>

            <p>
              {data.members.length} member
              {data.members.length !== 1 ? "s" : ""}
              {" • "}
              {data.expenses.length} expense
              {data.expenses.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {message && (
          <div className="message">
            {message}
          </div>
        )}

        {/* BALANCE SUMMARY */}

        <section className="balance-summary">

          <div className="balance-summary-card">
            <span className="balance-summary-icon">
              💰
            </span>

            <div>
              <p>Total money owed</p>

              <h3>
                ₹{totalOwed.toFixed(2)}
              </h3>
            </div>
          </div>

          <div className="balance-summary-card">
            <span className="balance-summary-icon">
              💸
            </span>

            <div>
              <p>Total outstanding debt</p>

              <h3>
                ₹{totalDebt.toFixed(2)}
              </h3>
            </div>
          </div>

        </section>

        {/* MEMBERS */}

        <section className="card">

          <h3>Members</h3>

          <div className="members-list">

            {data.members.map(member => {

              const memberBalance =
                balances.find(
                  b => b.id === member.id
                )?.balance || 0;

              return (
                <div
                  className="member-row"
                  key={member.id}
                >

                  <div>
                    <strong>
                      {member.name}
                    </strong>

                    <small>
                      {member.email}
                    </small>
                  </div>

                  <div className="member-balance">

                    {memberBalance > 0 ? (
                      <span className="positive">
                        +₹{Number(memberBalance).toFixed(2)}
                      </span>
                    ) : memberBalance < 0 ? (
                      <span className="negative">
                        -₹{Math.abs(Number(memberBalance)).toFixed(2)}
                      </span>
                    ) : (
                      <span className="settled">
                        Settled
                      </span>
                    )}

                  </div>

                </div>
              );

            })}

          </div>

          <hr />

          <h4>Add member</h4>

          <form
            className="row"
            onSubmit={addMember}
          >

            <input
              value={memberEmail}
              onChange={e =>
                setMemberEmail(e.target.value)
              }
              placeholder="Registered user's email"
              required
            />

            <button type="submit">
              Add member
            </button>

          </form>

        </section>

        {/* WHO OWES WHOM */}

        <section className="card">

          <h3>Who owes whom?</h3>

          <div className="who-owes">

            {balances.filter(b => b.balance !== 0).length === 0 ? (

              <div className="settled-message">
                <span>✓</span>

                <div>
                  <strong>Everyone is settled up</strong>
                  <p>No outstanding balances.</p>
                </div>
              </div>

            ) : (

              balances
                .filter(b => b.balance !== 0)
                .map(balance => (

                  <div
                    className="who-owes-row"
                    key={balance.id}
                  >

                    <div className="person-avatar">
                      {balance.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="who-owes-info">

                      <strong>
                        {balance.name}
                      </strong>

                      {balance.balance > 0 ? (

                        <span className="positive-text">
                          is owed ₹
                          {Number(balance.balance).toFixed(2)}
                        </span>

                      ) : (

                        <span className="negative-text">
                          owes ₹
                          {Math.abs(Number(balance.balance)).toFixed(2)}
                        </span>

                      )}

                    </div>

                    {balance.balance < 0 && (

                      <button
                        className="settle-button"
                        onClick={() =>
                          settleBalance(
                            balance.id,
                            balances.find(b => b.balance > 0)?.id,
                            Math.abs(Number(balance.balance))
                          )
                        }
                      >
                        Pay
                      </button>

                    )}

                  </div>

                ))

            )}

          </div>

        </section>

        {/* ADD EXPENSE */}

        <section className="card">

          <h3>Add expense</h3>

          <form onSubmit={addExpense}>

            <input
              value={expense.description}
              onChange={e =>
                setExpense({
                  ...expense,
                  description: e.target.value
                })
              }
              placeholder="Expense description e.g. Dinner"
              required
            />

            <input
              type="number"
              min="0.01"
              step="0.01"
              value={expense.amount}
              onChange={e =>
                setExpense({
                  ...expense,
                  amount: e.target.value
                })
              }
              placeholder="Amount"
              required
            />

            <select
              value={expense.paidBy}
              onChange={e =>
                setExpense({
                  ...expense,
                  paidBy: e.target.value
                })
              }
            >

              {data.members.map(member => (
                <option
                  key={member.id}
                  value={member.id}
                >
                  {member.name} paid
                </option>
              ))}

            </select>

            <h4>Split between:</h4>

            {data.members.map(member => (

              <label
                className="check"
                key={member.id}
              >

                <input
                  type="checkbox"
                  checked={expense.splitUserIds.includes(
                    member.id
                  )}
                  onChange={() =>
                    toggleUser(member.id)
                  }
                />

                {member.name}

              </label>

            ))}

            <br />

            <button type="submit">
              Add expense
            </button>

          </form>

        </section>

        {/* RECENT EXPENSES */}

        <section className="card">

          <h3>Recent expenses</h3>

          {data.expenses.length === 0 && (
            <p>No expenses yet.</p>
          )}

          {data.expenses.map(expenseItem => (

            <div
              className="expense"
              key={expenseItem.id}
            >

              <span>

                <strong>
                  {expenseItem.description}
                </strong>

                <small>
                  Paid by {expenseItem.paid_by_name}
                </small>

              </span>

              <strong>
                ₹{Number(
                  expenseItem.amount
                ).toFixed(2)}
              </strong>

            </div>

          ))}

        </section>

      </main>

    </div>
  );
}