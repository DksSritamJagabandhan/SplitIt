import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="homepage">
      <h1>Welcome to <span>SplitIt</span></h1>
      <p>Split expenses. Manage groups. Keep track of everything.</p>

      <Link to="/login">
        <button>Login</button>
      </Link>
      <br></br><br></br>
      <Link to="/register">
        <button>Register</button>
      </Link>
    </div>
  );
}