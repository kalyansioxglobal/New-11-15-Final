import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f3f4f6",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: "2rem",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          textAlign: "center",
          maxWidth: "400px",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem", color: "#b91c1c" }}>
          Access Denied
        </h1>
        <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>
          You don&apos;t have permission to access this page.
        </p>
        <Link
          href="/"
          style={{
            display: "inline-block",
            padding: "0.75rem 1.5rem",
            borderRadius: "6px",
            background: "#111827",
            color: "#fff",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          Go to Dashboard
        </Link>
      </div>
    </main>
  );
}
