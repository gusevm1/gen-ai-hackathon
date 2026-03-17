"use client"

import { useState, useMemo, useRef, type KeyboardEvent } from "react"
import { mapExtractedPreferences } from "@/lib/chat-preferences-mapper"
import { createProfileWithPreferences } from "@/app/(dashboard)/profiles/actions"
import type { Preferences } from "@/lib/schemas/preferences"
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Pencil, Loader2, X } from "lucide-react"

interface PreferenceSummaryCardProps {
  extractedPreferences: Record<string, unknown>
  profileName: string
  onProfileCreated: (profileId: string) => void
  onContinueChatting: () => void
}

type ImportanceLevel = "critical" | "high" | "medium" | "low"

export function PreferenceSummaryCard({
  extractedPreferences,
  profileName,
  onProfileCreated,
  onContinueChatting,
}: PreferenceSummaryCardProps) {
  const initialPrefs = useMemo(
    () => mapExtractedPreferences(extractedPreferences),
    [extractedPreferences]
  )

  const [preferences, setPreferences] = useState<Preferences>(initialPrefs)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Ref to store the value before editing (for Escape revert)
  const previousValueRef = useRef<unknown>(null)

  const updateField = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPreferences((prev) => ({ ...prev, [key]: value }))
  }

  const updateImportance = (key: keyof Preferences["importance"], value: ImportanceLevel) => {
    setPreferences((prev) => ({
      ...prev,
      importance: { ...prev.importance, [key]: value },
    }))
  }

  const handleConfirm = async () => {
    setIsCreating(true)
    setError(null)
    try {
      const profileId = await createProfileWithPreferences(profileName, preferences)
      onProfileCreated(profileId)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create profile. Please try again.")
    } finally {
      setIsCreating(false)
    }
  }

  // -- Click-to-edit helpers --

  function EditableText({
    fieldKey,
    value,
    label,
    type = "text",
  }: {
    fieldKey: keyof Preferences
    value: string | number | null
    label: string
    type?: "text" | "number"
  }) {
    const isEditing = editingField === fieldKey
    const isEmpty = value === null || value === "" || value === undefined

    if (isEditing) {
      return (
        <Input
          type={type}
          autoFocus
          defaultValue={value ?? ""}
          className="h-7 text-sm"
          onBlur={(e) => {
            const raw = e.target.value
            if (type === "number") {
              updateField(fieldKey, raw === "" ? null : Number(raw) as never)
            } else {
              updateField(fieldKey, raw as never)
            }
            setEditingField(null)
          }}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Escape") {
              updateField(fieldKey, previousValueRef.current as never)
              setEditingField(null)
            } else if (e.key === "Enter") {
              e.currentTarget.blur()
            }
          }}
        />
      )
    }

    return (
      <span
        className="group flex cursor-pointer items-center gap-1"
        onClick={() => {
          previousValueRef.current = value
          setEditingField(fieldKey)
        }}
      >
        {isEmpty ? (
          <span className="text-sm italic text-muted-foreground">
            {type === "number" ? "Not set" : `Click to add ${label.toLowerCase()}`}
          </span>
        ) : (
          <span className="text-sm">{value}</span>
        )}
        <Pencil className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100 text-primary" />
      </span>
    )
  }

  function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs text-muted-foreground shrink-0">{label}</span>
        <div className="text-right">{children}</div>
      </div>
    )
  }

  function SelectField<T extends string>({
    value,
    options,
    onChange,
  }: {
    value: T
    options: { value: T; label: string }[]
    onChange: (val: T) => void
  }) {
    return (
      <Select value={value} onValueChange={(val) => onChange(val as T)}>
        <SelectTrigger size="sm" className="h-7 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  function DealbrekerRow({
    label,
    checked,
    onChange,
  }: {
    label: string
    checked: boolean
    onChange: (val: boolean) => void
  }) {
    return (
      <div className="flex items-center gap-2">
        <Checkbox checked={checked} onCheckedChange={(val) => onChange(Boolean(val))} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    )
  }

  function BadgeListField({
    items,
    placeholder,
    onRemove,
    onAdd,
  }: {
    items: string[]
    placeholder: string
    onRemove: (index: number) => void
    onAdd: (value: string) => void
  }) {
    const [inputValue, setInputValue] = useState("")
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {items.map((item, idx) => (
            <Badge key={`${item}-${idx}`} variant="secondary" className="gap-1">
              {item}
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="ml-0.5 hover:text-destructive"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
        <Input
          placeholder={placeholder}
          className="h-7 text-sm"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter" && inputValue.trim()) {
              e.preventDefault()
              onAdd(inputValue.trim())
              setInputValue("")
            }
          }}
        />
      </div>
    )
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 mx-auto w-full max-w-2xl">
      <Card className="rounded-xl border bg-card">
        <CardHeader className="px-4 py-6">
          <h2 className="text-xl font-semibold">Your Preference Summary</h2>
          <p className="text-sm text-muted-foreground">Profile: {profileName}</p>
        </CardHeader>

        <CardContent className="px-4 space-y-8">
          {/* Section 1: Location & Type */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold">Location &amp; Type</h3>
            <FieldRow label="Location">
              <EditableText fieldKey="location" value={preferences.location} label="Location" />
            </FieldRow>
            <FieldRow label="Offer Type">
              <SelectField
                value={preferences.offerType}
                options={[
                  { value: "RENT", label: "Rent" },
                  { value: "SALE", label: "Sale" },
                ]}
                onChange={(val) => updateField("offerType", val)}
              />
            </FieldRow>
            <FieldRow label="Property Type">
              <SelectField
                value={preferences.objectCategory}
                options={[
                  { value: "APARTMENT", label: "Apartment" },
                  { value: "HOUSE", label: "House" },
                  { value: "ANY", label: "Any" },
                ]}
                onChange={(val) => updateField("objectCategory", val)}
              />
            </FieldRow>
            <FieldRow label="Language">
              <SelectField
                value={preferences.language}
                options={[
                  { value: "de", label: "Deutsch" },
                  { value: "en", label: "English" },
                  { value: "fr", label: "Francais" },
                  { value: "it", label: "Italiano" },
                ]}
                onChange={(val) => updateField("language", val)}
              />
            </FieldRow>
          </section>

          {/* Section 2: Budget & Size */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold">Budget &amp; Size</h3>
            <FieldRow label="Budget Min">
              <EditableText fieldKey="budgetMin" value={preferences.budgetMin} label="Budget min" type="number" />
            </FieldRow>
            <FieldRow label="Budget Max">
              <EditableText fieldKey="budgetMax" value={preferences.budgetMax} label="Budget max" type="number" />
            </FieldRow>
            <DealbrekerRow
              label="Hard limit"
              checked={preferences.budgetDealbreaker}
              onChange={(val) => updateField("budgetDealbreaker", val)}
            />
            <FieldRow label="Rooms Min">
              <EditableText fieldKey="roomsMin" value={preferences.roomsMin} label="Rooms min" type="number" />
            </FieldRow>
            <FieldRow label="Rooms Max">
              <EditableText fieldKey="roomsMax" value={preferences.roomsMax} label="Rooms max" type="number" />
            </FieldRow>
            <DealbrekerRow
              label="Hard limit"
              checked={preferences.roomsDealbreaker}
              onChange={(val) => updateField("roomsDealbreaker", val)}
            />
            <FieldRow label="Living Space Min (m2)">
              <EditableText fieldKey="livingSpaceMin" value={preferences.livingSpaceMin} label="Living space min" type="number" />
            </FieldRow>
            <FieldRow label="Living Space Max (m2)">
              <EditableText fieldKey="livingSpaceMax" value={preferences.livingSpaceMax} label="Living space max" type="number" />
            </FieldRow>
            <DealbrekerRow
              label="Hard limit"
              checked={preferences.livingSpaceDealbreaker}
              onChange={(val) => updateField("livingSpaceDealbreaker", val)}
            />
            <FieldRow label="Floor Preference">
              <SelectField
                value={preferences.floorPreference}
                options={[
                  { value: "any", label: "Any" },
                  { value: "ground", label: "Ground floor" },
                  { value: "not_ground", label: "Not ground floor" },
                ]}
                onChange={(val) => updateField("floorPreference", val)}
              />
            </FieldRow>
            <FieldRow label="Availability">
              <EditableText fieldKey="availability" value={preferences.availability} label="Availability" />
            </FieldRow>
          </section>

          {/* Section 3: Preferences & Amenities */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold">Preferences &amp; Amenities</h3>
            <div>
              <span className="text-xs text-muted-foreground">Features</span>
              <BadgeListField
                items={preferences.features}
                placeholder="Add a feature..."
                onRemove={(idx) =>
                  updateField("features", preferences.features.filter((_, i) => i !== idx))
                }
                onAdd={(val) => updateField("features", [...preferences.features, val])}
              />
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Soft Criteria</span>
              <BadgeListField
                items={preferences.softCriteria}
                placeholder="Add a preference..."
                onRemove={(idx) =>
                  updateField("softCriteria", preferences.softCriteria.filter((_, i) => i !== idx))
                }
                onAdd={(val) => updateField("softCriteria", [...preferences.softCriteria, val])}
              />
            </div>
          </section>

          {/* Section 4: Importance Levels */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold">Importance Levels</h3>
            {(
              [
                ["location", "Location"],
                ["price", "Price"],
                ["size", "Size"],
                ["features", "Features"],
                ["condition", "Condition"],
              ] as const
            ).map(([key, label]) => (
              <FieldRow key={key} label={label}>
                <SelectField
                  value={preferences.importance[key]}
                  options={[
                    { value: "critical", label: "Critical" },
                    { value: "high", label: "High" },
                    { value: "medium", label: "Medium" },
                    { value: "low", label: "Low" },
                  ]}
                  onChange={(val) => updateImportance(key, val as ImportanceLevel)}
                />
              </FieldRow>
            ))}
          </section>
        </CardContent>

        <CardFooter className="flex-col gap-3 px-4 py-4">
          <Button
            className="w-full"
            disabled={isCreating}
            onClick={handleConfirm}
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating profile...
              </>
            ) : (
              "Confirm & Create Profile"
            )}
          </Button>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-foreground underline"
            onClick={onContinueChatting}
          >
            Continue chatting instead
          </button>
        </CardFooter>
      </Card>
    </div>
  )
}
