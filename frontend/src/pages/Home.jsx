import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div>
      <h1>Welcome to SplitIt</h1>
      <p>Split expenses. Manage groups. Keep track of everything.</p>

      <Link to="/login">
        <button>Login</button>
      </Link>
      <Link to="/register">
        <button>Register</button>
      </Link>
    </div>
  );
}