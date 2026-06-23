import { createFileRoute } from "@tanstack/react-router";

function Placeholder({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center py-20">
      <p className="text-gray-400 text-lg">{title} - Coming soon</p>
    </div>
  );
}

export const Route = createFileRoute("/configuration")({
  component: () => <Placeholder title="Configuration" />,
});