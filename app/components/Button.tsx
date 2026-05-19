type Props = {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  active?: boolean;
  color?: "blue" | "red";
};

export default function UIButton({
    children,
    onClick,
    className = "",
    disabled = false,
    active = false,
    color = "blue",
}: Props) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={{
        padding: "12px 24px",
        borderRadius: 12,
        border: active ? "3px solid #1d4ed8" : "none",
        backgroundColor: color === "red" ? "#ef4444" : "#2563eb",

        color: "white",
        fontWeight: "bold",
        fontSize: 20,

        cursor: "pointer",

        transition: "all 0.2s ease",

        boxShadow: active
          ? "0 8px 20px rgba(37,99,235,0.4)"
          : "0 2px 8px rgba(0,0,0,0.15)",

        transform: active ? "translateY(-2px)" : "translateY(0px)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-5px)";
        e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0px)";
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
      }}
    >
      {children}
    </button>
  );
}
