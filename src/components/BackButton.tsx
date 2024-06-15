import { useNavigate } from "react-router-dom";

export function BackButton() {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => {
        history.length > 1 ? navigate(-1) : navigate("/");
      }}
    >
      ← Back
    </button>
  );
}
