"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main
      style={{
        display: "flex",
        minHeight: "80vh",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 12,
        textAlign: "center",
        padding: 16,
      }}
    >
      <h1 style={{ fontSize: 20, margin: 0 }}>Something broke</h1>
      <p style={{ color: "#8b93a7", maxWidth: 400, margin: 0 }}>
        {error.message || "An unexpected error occurred."}
      </p>
      {error.digest && <p style={{ color: "#4a5262", fontSize: 12, margin: 0 }}>Digest: {error.digest}</p>}
      <button
        type="button"
        onClick={reset}
        style={{
          marginTop: 12,
          padding: "8px 16px",
          borderRadius: 8,
          border: "none",
          background: "#4f7cff",
          color: "white",
          cursor: "pointer",
        }}
      >
        Try again
      </button>
    </main>
  );
}
