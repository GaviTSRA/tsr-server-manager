import { Lock } from "react-feather";
import { useNavigate } from "react-router-dom";

export function Forbidden() {
  const navigate = useNavigate();
  return (
    <div className="w-full h-full bg-neutral-100 flex flex-col items-center justify-center gap-4 text-white">
      <Lock className="text-danger" size={80} />
      <p className="font-bold text-2xl">
        You do not have access to this server
      </p>
      <button
        className="bg-neutral-300 px-4 py-2 rounded"
        onClick={() => navigate("/")}
      >
        Back to home
      </button>
    </div>
  );
}
