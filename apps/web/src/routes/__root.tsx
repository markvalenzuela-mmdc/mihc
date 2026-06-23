import { Outlet, Link, createRootRoute } from "@tanstack/react-router";

const TABS = [
  { to: "/", label: "Smoke" },
  { to: "/inspector", label: "Inspector" },
  { to: "/e2e", label: "E2E" },
  { to: "/configuration", label: "Configuration" },
];

function RootLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b bg-white">
        <div className="mx-auto max-w-4xl flex gap-0">
          {TABS.map((tab) => (
            <Link
              key={tab.to}
              to={tab.to}
              className="px-4 py-3 text-sm font-medium border-b-2 transition-colors"
              activeProps={{
                className:
                  "px-4 py-3 text-sm font-medium border-b-2 border-blue-600 text-blue-600",
              }}
              inactiveProps={{
                className:
                  "px-4 py-3 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700",
              }}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </nav>
      <main className="mx-auto max-w-4xl p-6">
        <Outlet />
      </main>
    </div>
  );
}

export const Route = createRootRoute({
  component: RootLayout,
});