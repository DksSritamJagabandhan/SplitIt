const express = require("express");
const db = require("../db");
const auth = require("../middleware/auth");

const router = express.Router();
console.log("API.JS LOADED");
router.use(auth);

async function isMember(groupId, userId) {
  const [rows] = await db.query(
    "SELECT 1 FROM group_members WHERE group_id=? AND user_id=?",
    [groupId, userId]
  );
  return rows.length > 0;
}

router.get("/me", async (req, res) => {
  const [rows] = await db.query(
    "SELECT id,name,email,created_at FROM users WHERE id=?",
    [req.user.id]
  );
  res.json(rows[0]);
});

router.get("/groups", async (req, res) => {
  
  const [rows] = await db.query(`
    SELECT g.id,g.name,g.created_at,
           COUNT(gm.user_id) AS member_count
    FROM groups_table g
    JOIN group_members mine ON mine.group_id=g.id AND mine.user_id=?
    LEFT JOIN group_members gm ON gm.group_id=g.id
    GROUP BY g.id
    ORDER BY g.created_at DESC
  `, [req.user.id]);
  res.json(rows);
});

router.post("/groups", async (req, res) => {
  console.log("POST /api/groups REACHED");
  const name = (req.body.name || "").trim();
  if (!name) return res.status(400).json({ message: "Group name is required" });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      "INSERT INTO groups_table (name,created_by) VALUES (?,?)",
      [name, req.user.id]
    );
    await conn.query(
      "INSERT INTO group_members (group_id,user_id) VALUES (?,?)",
      [result.insertId, req.user.id]
    );
    await conn.commit();
    res.status(201).json({ id: result.insertId, name });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: "Could not create group" });
  } finally {
    conn.release();
  }
});

router.get("/groups/:id", async (req, res) => {
  const groupId = Number(req.params.id);
  if (!(await isMember(groupId, req.user.id))) {
    return res.status(403).json({ message: "You are not a group member" });
  }

  const [[group]] = await db.query(
    "SELECT id,name,created_at FROM groups_table WHERE id=?",
    [groupId]
  );
  const [members] = await db.query(`
    SELECT u.id,u.name,u.email
    FROM users u
    JOIN group_members gm ON gm.user_id=u.id
    WHERE gm.group_id=?
    ORDER BY u.name
  `, [groupId]);

  const [expenses] = await db.query(`
    SELECT e.id,e.description,e.amount,e.created_at,
           u.id AS paid_by_id,u.name AS paid_by_name
    FROM expenses e
    JOIN users u ON u.id=e.paid_by
    WHERE e.group_id=?
    ORDER BY e.created_at DESC
  `, [groupId]);

  res.json({ group, members, expenses });
});

router.post("/groups/:id/members", async (req, res) => {
  const groupId = Number(req.params.id);
  const email = (req.body.email || "").trim().toLowerCase();

  if (!(await isMember(groupId, req.user.id))) {
    return res.status(403).json({ message: "You are not a group member" });
  }

  const [users] = await db.query("SELECT id,name,email FROM users WHERE email=?", [email]);
  if (!users.length) return res.status(404).json({ message: "No registered user with that email" });

  try {
    await db.query(
      "INSERT INTO group_members (group_id,user_id) VALUES (?,?)",
      [groupId, users[0].id]
    );
    res.status(201).json({ message: "Member added", user: users[0] });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "User is already a member" });
    }
    console.error(err);
    res.status(500).json({ message: "Could not add member" });
  }
});

router.post("/groups/:id/expenses", async (req, res) => {
  const groupId = Number(req.params.id);
  const description = (req.body.description || "").trim();
  const amount = Number(req.body.amount);
  const paidBy = Number(req.body.paidBy);
  const splitUserIds = Array.isArray(req.body.splitUserIds)
    ? req.body.splitUserIds.map(Number).filter(Boolean)
    : [];

  if (!(await isMember(groupId, req.user.id))) {
    return res.status(403).json({ message: "You are not a group member" });
  }
  if (!description || !amount || amount <= 0 || !paidBy || !splitUserIds.length) {
    return res.status(400).json({ message: "Description, amount, payer and split members are required" });
  }

  const memberCheck = await db.query(`
    SELECT user_id FROM group_members
    WHERE group_id=? AND user_id IN (${splitUserIds.map(() => "?").join(",")})
  `, [groupId, ...splitUserIds]);

  if (memberCheck[0].length !== splitUserIds.length) {
    return res.status(400).json({ message: "All split users must belong to the group" });
  }
  if (!(await isMember(groupId, paidBy))) {
    return res.status(400).json({ message: "Payer must belong to the group" });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [expense] = await conn.query(
      "INSERT INTO expenses (group_id,description,amount,paid_by) VALUES (?,?,?,?)",
      [groupId, description, amount.toFixed(2), paidBy]
    );

    const share = amount / splitUserIds.length;
    for (const userId of splitUserIds) {
      await conn.query(
        "INSERT INTO expense_splits (expense_id,user_id,share) VALUES (?,?,?)",
        [expense.insertId, userId, share.toFixed(2)]
      );
    }

    await conn.commit();
    res.status(201).json({ message: "Expense added", expenseId: expense.insertId });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: "Could not add expense" });
  } finally {
    conn.release();
  }
});

router.get("/groups/:id/balances", async (req, res) => {
  const groupId = Number(req.params.id);
  if (!(await isMember(groupId, req.user.id))) {
    return res.status(403).json({ message: "You are not a group member" });
  }

  const [members] = await db.query(`
    SELECT u.id,u.name
    FROM users u
    JOIN group_members gm ON gm.user_id=u.id
    WHERE gm.group_id=?
  `, [groupId]);

  const balances = Object.fromEntries(members.map(m => [m.id, 0]));

  const [paid] = await db.query(`
    SELECT paid_by AS user_id, SUM(amount) AS total
    FROM expenses WHERE group_id=? GROUP BY paid_by
  `, [groupId]);
  paid.forEach(r => { balances[r.user_id] += Number(r.total); });

  const [owed] = await db.query(`
    SELECT es.user_id, SUM(es.share) AS total
    FROM expense_splits es
    JOIN expenses e ON e.id=es.expense_id
    WHERE e.group_id=?
    GROUP BY es.user_id
  `, [groupId]);
  owed.forEach(r => { balances[r.user_id] -= Number(r.total); });

  const [settledFrom] = await db.query(`
    SELECT from_user AS user_id, SUM(amount) AS total
    FROM settlements WHERE group_id=? GROUP BY from_user
  `, [groupId]);
  settledFrom.forEach(r => { balances[r.user_id] += Number(r.total); });

  const [settledTo] = await db.query(`
    SELECT to_user AS user_id, SUM(amount) AS total
    FROM settlements WHERE group_id=? GROUP BY to_user
  `, [groupId]);
  settledTo.forEach(r => { balances[r.user_id] -= Number(r.total); });

  res.json(members.map(m => ({
    id: m.id,
    name: m.name,
    balance: Number(balances[m.id].toFixed(2))
  })));
});

router.post("/groups/:id/settlements", async (req, res) => {
  const groupId = Number(req.params.id);
  const fromUser = Number(req.body.fromUser);
  const toUser = Number(req.body.toUser);
  const amount = Number(req.body.amount);

  if (!(await isMember(groupId, req.user.id))) {
    return res.status(403).json({ message: "You are not a group member" });
  }
  if (!fromUser || !toUser || fromUser === toUser || !amount || amount <= 0) {
    return res.status(400).json({ message: "Invalid settlement" });
  }

  await db.query(
    "INSERT INTO settlements (group_id,from_user,to_user,amount) VALUES (?,?,?,?)",
    [groupId, fromUser, toUser, amount.toFixed(2)]
  );
  res.status(201).json({ message: "Settlement recorded" });
});

module.exports = router;
