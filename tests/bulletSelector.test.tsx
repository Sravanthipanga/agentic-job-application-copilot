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

function makeEnhanced(id: string): TailoredBullet {
  return {
    bulletId: id,
    company: "Bamboo Health",
    role: "Software Engineer",
    originalText: `Original bullet ${id}`,
    suggestedText: `Original bullet ${id}, leveraging Unit Testing.`,
    matchedKeywords: ["Testing"],
    relevance: 1,
    approved: true,
    surfacedSkills: ["Unit Testing"],
  };
}

describe("BulletSelector — JD enhancement controls", () => {
  it("shows the helper copy explaining enhancements are per-application", () => {
    render(<Harness initial={[makeEnhanced("b1")]} />);
    expect(
      screen.getByText(/Enhancements only surface skills already on each point/),
    ).toBeInTheDocument();
    expect(screen.getByText(/your profile points stay original/)).toBeInTheDocument();
  });

  it("shows the Enhanced badge and surfaced skills only when the text differs from the original", () => {
    const plain: TailoredBullet = {
      ...makeEnhanced("b2"),
      suggestedText: "Original bullet b2",
      surfacedSkills: [],
    };
    render(<Harness initial={[makeEnhanced("b1"), plain]} />);
    expect(screen.getAllByText("Enhanced for this JD")).toHaveLength(1);
    expect(screen.getByText("Surfaced: Unit Testing")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Reset to original" })).toHaveLength(1);
  });

  it("Reset to original restores the bullet's original text", () => {
    render(<Harness initial={[makeEnhanced("b1")]} />);
    const textarea = screen.getByLabelText(
      "Tailored bullet for Bamboo Health",
    ) as HTMLTextAreaElement;
    expect(textarea.value).toContain("leveraging Unit Testing");
    fireEvent.click(screen.getByRole("button", { name: "Reset to original" }));
    expect(textarea.value).toBe("Original bullet b1");
    expect(screen.queryByText("Enhanced for this JD")).toBeNull();
  });

  it("Reset all to original restores every bullet's original text", () => {
    render(<Harness initial={[makeEnhanced("b1"), makeEnhanced("b2")]} />);
    fireEvent.click(screen.getByRole("button", { name: "Reset all to original" }));
    const textareas = screen.getAllByLabelText(
      "Tailored bullet for Bamboo Health",
    ) as HTMLTextAreaElement[];
    expect(textareas.map((t) => t.value)).toEqual(["Original bullet b1", "Original bullet b2"]);
    expect(screen.queryByText("Enhanced for this JD")).toBeNull();
  });

  it("manual editing of the textarea still works after enhancement", () => {
    render(<Harness initial={[makeEnhanced("b1")]} />);
    const textarea = screen.getByLabelText(
      "Tailored bullet for Bamboo Health",
    ) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "Hand-edited bullet text." } });
    expect(textarea.value).toBe("Hand-edited bullet text.");
  });
});
