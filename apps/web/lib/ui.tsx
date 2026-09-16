export function Banner({ tone, children }: { tone: "success" | "error"; children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "10px 14px",
        borderRadius: 8,
        background: tone === "success" ? "#12331f" : "#3a1414",
        color: tone === "success" ? "#7ee2a8" : "#f28b82",
        fontSize: 14,
      }}
    >
      {children}
    </div>
  );
}

export const cardStyle: React.CSSProperties = {
  background: "#151821",
  borderRadius: 12,
  padding: 16,
};

export const sectionHeading: React.CSSProperties = {
  fontSize: 15,
  color: "#8b93a7",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  marginBottom: 10,
};

export const listStyle: React.CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

export const itemStyle: React.CSSProperties = {
  background: "#151821",
  borderRadius: 8,
  padding: "10px 14px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
};

export const buttonLinkStyle: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 8,
  background: "#4f7cff",
  color: "white",
  textDecoration: "none",
  fontSize: 14,
};

export const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #2a2f3a",
  background: "#0b0d12",
  color: "#e6e8ec",
  fontSize: 14,
};

export const pillStyle = (active: boolean): React.CSSProperties => ({
  padding: "6px 12px",
  borderRadius: 999,
  fontSize: 13,
  textDecoration: "none",
  background: active ? "#4f7cff" : "#151821",
  color: active ? "white" : "#8b93a7",
  border: active ? "none" : "1px solid #2a2f3a",
});
