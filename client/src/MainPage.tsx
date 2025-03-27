import { Outlet, useNavigate } from "react-router-dom";

function MainPage() {
  const navigate = useNavigate();

  return (
    <div className="w-full h-full bg-neutral-100 text-primary-text">
      <div className="w-full bg-neutral-200 flex items-center">
        <p className="p-4 my-auto text-2xl">TSR Server Manager</p>
        <div>
          <button className="p-4" onClick={() => navigate("/")}>
            Servers
          </button>
          <button className="p-4" onClick={() => navigate("/nodes")}>
            Nodes
          </button>
        </div>
      </div>
      <Outlet />
    </div>
  );
}

export default MainPage;
