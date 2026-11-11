import { describe, expect, it } from "vitest";
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import BulletSelector from "@/components/BulletSelector";
import type { TailoredBullet } from "@/types";

function makeBullet(id: string, approved: boolean): TailoredBullet {
  return {
    bulletId: id,
    company: "Bamboo Health",
    role: "Software Engineer",
    originalText: `Original bullet ${id}`,
    suggestedText: `Tailored bullet ${id}`,
    matchedKeywords: ["Java"],
    relevance: 2,
    approved,
  };
}

function Harness({ initial }: { initial: TailoredBullet[] }) {
  const [bullets, setBullets] = useState(initial);
  return <BulletSelector bullets={bullets} onChange={setBullets} />;
}

function selectAllCheckbox(): HTMLInputElement {
  return screen.getByRole("checkbox", { name: /select all|deselect all/i }) as HTMLInputElement;
}

function bulletCheckboxes(): HTMLInputElement[] {
  // Every checkbox except the Select all / Deselect all control.
  const selectAll = selectAllCheckbox();
  return (screen.getAllByRole("checkbox") as HTMLInputElement[]).filter(
    (el) => el !== selectAll,
  );
}

describe("BulletSelector — Select all", () => {
  it("Select all checks every bullet and updates the count", () => {
    render(
      <Harness
        initial={[makeBullet("b1", false), makeBullet("b2", false), makeBullet("b3", false)]}
      />,
    );
    expect(screen.getByText("0 of 3 selected")).toBeInTheDocument();
    fireEvent.click(selectAllCheckbox());
    expect(screen.getByText("3 of 3 selected")).toBeInTheDocument();
    expect(bulletCheckboxes().every((el) => el.checked)).toBe(true);
    // Once everything is selected the control becomes "Deselect all".
    expect(screen.getByLabelText("Deselect all (3 bullets)")).toBeInTheDocument();
  });

  it("Deselect all unchecks every bullet", () => {
    render(
      <Harness
        initial={[makeBullet("b1", true), makeBullet("b2", true), makeBullet("b3", true)]}
      />,
    );
    expect(screen.getByText("3 of 3 selected")).toBeInTheDocument();
    fireEvent.click(selectAllCheckbox());
    expect(screen.getByText("0 of 3 selected")).toBeInTheDocument();
    expect(bulletCheckboxes().every((el) => !el.checked)).toBe(true);
    expect(screen.getByLabelText("Select all (3 bullets)")).toBeInTheDocument();
  });

  it("partial selection shows the Select all checkbox as indeterminate", () => {
    render(
      <Harness
        initial={[makeBullet("b1", true), makeBullet("b2", false), makeBullet("b3", false)]}
      />,
    );
    expect(screen.getByText("1 of 3 selected")).toBeInTheDocument();
    expect(selectAllCheckbox().indeterminate).toBe(true);
    expect(selectAllCheckbox().checked).toBe(false);
  });

  it("individual toggling updates the count and the Select all state", () => {
    render(
      <Harness
        initial={[makeBullet("b1", false), makeBullet("b2", false), makeBullet("b3", false)]}
      />,
    );
    const boxes = bulletCheckboxes();
    fireEvent.click(boxes[0]);
    expect(screen.getByText("1 of 3 selected")).toBeInTheDocument();
    expect(selectAllCheckbox().indeterminate).toBe(true);
    fireEvent.click(boxes[1]);
    fireEvent.click(boxes[2]);
    expect(screen.getByText("3 of 3 selected")).toBeInTheDocument();
    expect(selectAllCheckbox().checked).toBe(true);
    expect(selectAllCheckbox().indeterminate).toBe(false);
  });

  it("hides the Select all control and shows a helpful message when there are no bullets", () => {
    render(<Harness initial={[]} />);
    expect(screen.queryByRole("checkbox", { name: /select all|deselect all/i })).toBeNull();
    expect(screen.getByText("No tailored bullets for this job description.")).toBeInTheDocument();
  });
});
