import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardPage from "@/app/page";

describe("Dashboard", () => {
  it("renders the tracker heading and the seeded sample applications", () => {
    render(<DashboardPage />);
    expect(screen.getByText("Application Tracker")).toBeInTheDocument();
    expect(screen.getByText("Acme Health")).toBeInTheDocument();
    expect(screen.getByText("Beacon Labs")).toBeInTheDocument();
  });

  it("shows the stats cards", () => {
    render(<DashboardPage />);
    expect(screen.getByText("Total applications")).toBeInTheDocument();
    expect(screen.getByText("Average ATS score")).toBeInTheDocument();
  });
});
