import Link from "next/link";

function AdminHome() {
  return (
    <div>
      <p style={{ marginBottom: "1rem" }}>
        Choose what you want to manage:
      </p>
      <ul style={{ paddingLeft: "1.2rem", lineHeight: 1.7 }}>
        <li>
          <Link href="/admin/ventures">Manage ventures</Link>
        </li>
        <li>
          <Link href="/admin/offices">Manage offices</Link>
        </li>
      </ul>
    </div>
  );
}

AdminHome.title = "Admin";

export default AdminHome;
