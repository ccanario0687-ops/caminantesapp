import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function BackArrow({ to = "/dashboard", className = "hover:opacity-75 transition-opacity" }) {
  const navigate = useNavigate();
  const handleBack = () => {
    const state = window.history.state;
    if (state && typeof state.idx === "number" && state.idx > 0) {
      navigate(-1);
    } else {
      navigate(to);
    }
  };
  return (
    <button type="button" onClick={handleBack} className={className} aria-label="Volver">
      <ArrowLeft className="w-5 h-5" />
    </button>
  );
}