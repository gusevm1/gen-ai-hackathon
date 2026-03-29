import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import DownloadPage from "@/app/download/page"

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/download",
}))

// Mock navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
})

describe("DownloadPage", () => {
  it("renders page heading", () => {
    render(<DownloadPage />)

    const heading = screen.getByRole("heading", { level: 1 })
    expect(heading.textContent).toBe("Download Extension")
  })

  it("renders download button with correct link", () => {
    render(<DownloadPage />)

    const link = document.querySelector(
      'a[href="/homematch-extension.zip"]'
    ) as HTMLAnchorElement
    expect(link).not.toBeNull()
    expect(link.hasAttribute("download")).toBe(true)
  })

  it("renders all four installation steps", () => {
    render(<DownloadPage />)

    expect(screen.getByText("Unzip the downloaded file")).toBeDefined()
    expect(screen.getByText("Open Chrome Extensions")).toBeDefined()
    expect(screen.getByText("Enable Developer Mode")).toBeDefined()
    expect(screen.getByText("Load the extension")).toBeDefined()
  })

  it("displays chrome://extensions as copyable text", () => {
    render(<DownloadPage />)

    const codeElement = document.querySelector("code")
    expect(codeElement).not.toBeNull()
    expect(codeElement?.textContent).toContain("chrome://extensions")
  })
})
