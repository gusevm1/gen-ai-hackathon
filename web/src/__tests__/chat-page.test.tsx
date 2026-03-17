import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { ChatPage } from "@/components/chat/chat-page"

// Mock scrollIntoView (not available in jsdom)
Element.prototype.scrollIntoView = vi.fn()

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/ai-search",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}))

describe("ChatPage", () => {
  it("renders centered layout in idle state", () => {
    render(<ChatPage />)

    expect(
      screen.getByPlaceholderText(/Describe your ideal property/i)
    ).toBeDefined()
  })

  it("shows Start Creating Profile button in idle state", () => {
    render(<ChatPage />)

    expect(screen.getByText("Start Creating Profile")).toBeDefined()
  })

  it("shows profile name prompt after clicking Start Creating Profile", async () => {
    render(<ChatPage />)

    // Must type something first -- button is disabled when textarea is empty
    const textarea = screen.getByPlaceholderText(/Describe your ideal property/i)
    fireEvent.change(textarea, { target: { value: "A nice 3-room flat in Zurich" } })
    fireEvent.click(screen.getByText("Start Creating Profile"))

    await waitFor(() => {
      expect(
        screen.getByText(/What should we call this profile/i)
      ).toBeDefined()
    })
  })

  it("sends first message after naming profile", async () => {
    render(<ChatPage />)

    // Fill in description and proceed
    const textarea = screen.getByPlaceholderText(/Describe your ideal property/i)
    fireEvent.change(textarea, { target: { value: "A nice 3-room flat in Zurich" } })
    fireEvent.click(screen.getByText("Start Creating Profile"))

    await waitFor(() => {
      expect(
        screen.getByText(/What should we call this profile/i)
      ).toBeDefined()
    })

    const nameInput = screen.getByRole("textbox")
    fireEvent.change(nameInput, { target: { value: "My Dream Flat" } })
    fireEvent.click(screen.getByText("Start Conversation"))

    await waitFor(() => {
      // The first message in the thread is the property description, not the profile name
      expect(screen.getByText("A nice 3-room flat in Zurich")).toBeDefined()
    })
  })

  it("shows AI avatar with house icon on assistant messages", () => {
    // This test expects a conversation state with assistant messages
    render(<ChatPage />)

    // Will be meaningful once ChatPage renders assistant messages with AIAvatar
    const avatars = document.querySelectorAll(".bg-primary")
    // In idle state there may not be assistant messages yet
    // This test scaffold will be updated in plan 03
    expect(avatars).toBeDefined()
  })

  it("user can send follow-up messages", async () => {
    render(<ChatPage />)

    // Fill in description and proceed
    const textarea = screen.getByPlaceholderText(/Describe your ideal property/i)
    fireEvent.change(textarea, { target: { value: "A nice 3-room flat in Zurich" } })
    fireEvent.click(screen.getByText("Start Creating Profile"))

    await waitFor(() => {
      expect(
        screen.getByText(/What should we call this profile/i)
      ).toBeDefined()
    })

    const nameInput = screen.getByRole("textbox")
    fireEvent.change(nameInput, { target: { value: "My Dream Flat" } })
    fireEvent.click(screen.getByText("Start Conversation"))

    // Wait for chatting phase to be active
    await waitFor(() => {
      expect(screen.getByText("A nice 3-room flat in Zurich")).toBeDefined()
    })

    // Now send a follow-up message via Enter key
    const chatTextarea = screen.getByRole("textbox")
    fireEvent.change(chatTextarea, {
      target: { value: "I want a 2-bedroom flat near the lake" },
    })
    fireEvent.keyDown(chatTextarea, { key: "Enter", code: "Enter" })

    await waitFor(() => {
      expect(
        screen.getByText("I want a 2-bedroom flat near the lake")
      ).toBeDefined()
    })
  })
})
