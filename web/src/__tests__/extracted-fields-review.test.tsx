import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ExtractedFieldsReview } from '@/components/chat/extracted-fields-review'
import type { DynamicField } from '@/lib/schemas/preferences'

const sampleFields: DynamicField[] = [
  { name: 'Quiet neighborhood', value: 'Must be low traffic area', importance: 'high' },
  { name: 'Balcony', value: 'South-facing preferred', importance: 'medium' },
]

describe('ExtractedFieldsReview', () => {
  const defaultProps = {
    fields: sampleFields,
    onAccept: vi.fn(),
    onCancel: vi.fn(),
  }

  it('renders all provided fields with name, value, and importance displayed', () => {
    render(<ExtractedFieldsReview {...defaultProps} />)

    // Both field names should be visible as input values
    const nameInputs = screen.getAllByPlaceholderText('Criterion name')
    expect(nameInputs).toHaveLength(2)
    expect((nameInputs[0] as HTMLInputElement).value).toBe('Quiet neighborhood')
    expect((nameInputs[1] as HTMLInputElement).value).toBe('Balcony')

    // Both values should be visible
    const valueInputs = screen.getAllByPlaceholderText('Details')
    expect(valueInputs).toHaveLength(2)
    expect((valueInputs[0] as HTMLInputElement).value).toBe('Must be low traffic area')
    expect((valueInputs[1] as HTMLInputElement).value).toBe('South-facing preferred')

    // Header with count
    expect(screen.getByText('Extracted Preferences')).toBeDefined()
    expect(screen.getByText('2')).toBeDefined()
  })

  it('editing a field name updates the local state', () => {
    render(<ExtractedFieldsReview {...defaultProps} />)

    const nameInputs = screen.getAllByPlaceholderText('Criterion name')
    fireEvent.change(nameInputs[0], { target: { value: 'Very quiet area' } })
    expect((nameInputs[0] as HTMLInputElement).value).toBe('Very quiet area')
  })

  it('editing a field importance via select updates the local state', () => {
    render(<ExtractedFieldsReview {...defaultProps} />)

    // Find importance select triggers -- they show the current importance label
    const triggers = screen.getAllByRole('combobox')
    expect(triggers.length).toBeGreaterThanOrEqual(2)

    // Click the first trigger to open dropdown and select 'Critical'
    fireEvent.click(triggers[0])
    const criticalOption = screen.getByText('Critical')
    fireEvent.click(criticalOption)

    // After selecting, the trigger should show 'Critical'
    expect(triggers[0].textContent).toContain('Critical')
  })

  it('clicking delete removes the field from the list', () => {
    render(<ExtractedFieldsReview {...defaultProps} />)

    // Should have 2 fields initially
    expect(screen.getAllByPlaceholderText('Criterion name')).toHaveLength(2)

    // Click the first delete button
    const deleteButtons = screen.getAllByLabelText('Remove field')
    fireEvent.click(deleteButtons[0])

    // Now only 1 field
    expect(screen.getAllByPlaceholderText('Criterion name')).toHaveLength(1)
    // The remaining field should be 'Balcony'
    const remainingInput = screen.getByPlaceholderText('Criterion name') as HTMLInputElement
    expect(remainingInput.value).toBe('Balcony')
  })

  it('clicking "Add to Profile" calls onAccept with current edited fields', () => {
    const onAccept = vi.fn()
    render(<ExtractedFieldsReview {...defaultProps} onAccept={onAccept} />)

    // Edit first field's name
    const nameInputs = screen.getAllByPlaceholderText('Criterion name')
    fireEvent.change(nameInputs[0], { target: { value: 'Updated name' } })

    // Click accept
    fireEvent.click(screen.getByText('Add to Profile'))

    expect(onAccept).toHaveBeenCalledOnce()
    const accepted = onAccept.mock.calls[0][0]
    expect(accepted).toHaveLength(2)
    expect(accepted[0].name).toBe('Updated name')
    expect(accepted[1].name).toBe('Balcony')
  })

  it('clicking "Add to Profile" filters out fields with empty names', () => {
    const onAccept = vi.fn()
    render(<ExtractedFieldsReview {...defaultProps} onAccept={onAccept} />)

    // Clear first field's name
    const nameInputs = screen.getAllByPlaceholderText('Criterion name')
    fireEvent.change(nameInputs[0], { target: { value: '' } })

    // Click accept
    fireEvent.click(screen.getByText('Add to Profile'))

    expect(onAccept).toHaveBeenCalledOnce()
    const accepted = onAccept.mock.calls[0][0]
    expect(accepted).toHaveLength(1)
    expect(accepted[0].name).toBe('Balcony')
  })

  it('clicking "Cancel" calls onCancel without calling onAccept', () => {
    const onAccept = vi.fn()
    const onCancel = vi.fn()
    render(
      <ExtractedFieldsReview
        fields={sampleFields}
        onAccept={onAccept}
        onCancel={onCancel}
      />
    )

    fireEvent.click(screen.getByText('Cancel'))

    expect(onCancel).toHaveBeenCalledOnce()
    expect(onAccept).not.toHaveBeenCalled()
  })
})
