export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <main style={{ display: "flex", minHeight: "80vh", alignItems: "center", justifyContent: "center" }}>
      <form
        method="POST"
        action="/api/auth/login"
        style={{
          background: "#151821",
          padding: 32,
          borderRadius: 12,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          width: 280,
        }}
      >
        <h1 style={{ fontSize: 18, margin: 0 }}>Course Dashboard</h1>
        <input
          type="password"
          name="password"
          placeholder="Password"
          autoFocus
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #2a2f3a",
            background: "#0b0d12",
            color: "#e6e8ec",
          }}
        />
        {params.error && (
          <p style={{ color: "#f28b82", fontSize: 13, margin: 0 }}>Wrong password</p>
        )}
        <button
          type="submit"
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            border: "none",
            background: "#4f7cff",
            color: "white",
            cursor: "pointer",
          }}
        >
          Enter
        </button>
      </form>
    </main>
  );
}
