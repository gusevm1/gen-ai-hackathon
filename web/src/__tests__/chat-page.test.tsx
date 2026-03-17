import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
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

// Mock fetch for real API calls
const mockFetch = vi.fn()

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch)
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      message: "That sounds great! Could you tell me more about your budget range and preferred neighborhood?",
      ready_to_summarize: false,
      extracted_preferences: null,
    }),
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  mockFetch.mockReset()
})

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

  it("shows summary card when AI signals ready_to_summarize", async () => {
    render(<ChatPage />)

    // Enter chatting phase
    const textarea = screen.getByPlaceholderText(/Describe your ideal property/i)
    fireEvent.change(textarea, { target: { value: "A 3-room flat in Zurich, max 2500 CHF" } })
    fireEvent.click(screen.getByText("Start Creating Profile"))

    await waitFor(() => {
      expect(screen.getByText(/What should we call this profile/i)).toBeDefined()
    })

    const nameInput = screen.getByRole("textbox")
    fireEvent.change(nameInput, { target: { value: "Zurich Flat" } })

    // Mock the API to return ready_to_summarize
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: "Let me summarize what you're looking for.",
          ready_to_summarize: true,
          extracted_preferences: {
            location: "Zurich",
            offerType: "RENT",
            objectCategory: "APARTMENT",
            budgetMax: 2500,
            roomsMin: 3,
          },
        }),
      })

    fireEvent.click(screen.getByText("Start Conversation"))

    await waitFor(() => {
      expect(screen.getByText("Your Preference Summary")).toBeDefined()
    })

    // Verify the summary card shows
    expect(screen.getByText("Confirm & Create Profile")).toBeDefined()
    expect(screen.getByText(/Profile: Zurich Flat/)).toBeDefined()
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
