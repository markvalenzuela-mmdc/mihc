import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { push, signInEmail } = vi.hoisted(() => ({
  push: vi.fn(),
  signInEmail: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/lib/better-auth/client", () => ({
  authClient: {
    signIn: {
      email: signInEmail,
    },
  },
}));

import { LoginForm } from "@/app/_components/login-form";

function fillValidCredentials() {
  fireEvent.change(screen.getByRole("textbox", { name: "Email" }), {
    target: { value: "maintainer@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "password123" },
  });
}

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the labeled email and password controls", () => {
    render(<LoginForm />);

    expect(screen.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    expect(screen.getByText("MMDC Testing")).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveAttribute(
      "type",
      "email",
    );
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "type",
      "password",
    );
    expect(screen.getByRole("button", { name: "Log in" })).toBeEnabled();
  });

  it("shows TanStack validation messages and does not call BetterAuth for invalid values", async () => {
    render(<LoginForm />);

    const email = screen.getByRole("textbox", { name: "Email" });
    const password = screen.getByLabelText("Password");

    fireEvent.change(email, { target: { value: "not-an-email" } });
    fireEvent.blur(email);
    fireEvent.change(password, { target: { value: "short" } });
    fireEvent.blur(password);
    fireEvent.submit(screen.getByRole("form", { name: "Log in" }));

    expect(await screen.findByText("Enter a valid email address.")).toBeVisible();
    expect(
      await screen.findByText("Password must be at least 8 characters."),
    ).toBeVisible();
    expect(signInEmail).not.toHaveBeenCalled();
  });

  it("signs in and navigates to smoke testing on success", async () => {
    signInEmail.mockResolvedValueOnce({ data: { user: {} }, error: null });
    render(<LoginForm />);

    fillValidCredentials();
    fireEvent.submit(screen.getByRole("form", { name: "Log in" }));

    await waitFor(() => {
      expect(signInEmail).toHaveBeenCalledWith({
        email: "maintainer@example.com",
        password: "password123",
      });
      expect(push).toHaveBeenCalledWith("/smoke-testing");
    });
  });

  it("renders an auth error returned by BetterAuth", async () => {
    signInEmail.mockResolvedValueOnce({
      data: null,
      error: { message: "Invalid email or password." },
    });
    render(<LoginForm />);

    fillValidCredentials();
    fireEvent.submit(screen.getByRole("form", { name: "Log in" }));

    expect(
      await screen.findByText("Invalid email or password."),
    ).toBeVisible();
    expect(push).not.toHaveBeenCalled();
  });
});
