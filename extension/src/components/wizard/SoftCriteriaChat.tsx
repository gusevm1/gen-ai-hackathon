import { useState } from 'react';
import type { SoftCriterion } from '@/schema/profile';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

// -- Keyword-to-suggestion mapping (Phase 1 placeholder) --------------------

const KEYWORD_MAP: Array<{ keywords: string[]; suggestion: string; category: string }> = [
  { keywords: ['lake', 'river', 'water', 'see'], suggestion: 'Lake/river view', category: 'Surroundings & Location' },
  { keywords: ['school', 'schule'], suggestion: 'Near schools', category: 'Surroundings & Location' },
  { keywords: ['quiet', 'ruhig', 'silent', 'peaceful'], suggestion: 'Quiet neighborhood', category: 'Surroundings & Location' },
  { keywords: ['transport', 'train', 'bus', 'tram', 'bahn'], suggestion: 'Near public transport', category: 'Surroundings & Location' },
  { keywords: ['garden', 'garten'], suggestion: 'Private garden', category: 'Outdoor Space' },
  { keywords: ['balcony', 'balkon', 'terrace', 'terrasse'], suggestion: 'Large balcony', category: 'Outdoor Space' },
  { keywords: ['sun', 'sunny', 'sonnig', 'south'], suggestion: 'Sunny exposure', category: 'Outdoor Space' },
  { keywords: ['modern', 'renovated', 'new'], suggestion: 'Modern renovation', category: 'Building & Quality' },
  { keywords: ['bright', 'light', 'hell'], suggestion: 'Bright/lots of light', category: 'Lifestyle & Comfort' },
  { keywords: ['ceiling', 'high', 'hoch'], suggestion: 'High ceilings', category: 'Lifestyle & Comfort' },
  { keywords: ['office', 'homeoffice', 'work from home'], suggestion: 'Home office space', category: 'Lifestyle & Comfort' },
  { keywords: ['shop', 'restaurant', 'einkauf'], suggestion: 'Near shops/restaurants', category: 'Surroundings & Location' },
  { keywords: ['park', 'green', 'nature'], suggestion: 'Near park/green space', category: 'Surroundings & Location' },
  { keywords: ['commute', 'pendeln'], suggestion: 'Short commute', category: 'Practical' },
  { keywords: ['internet', 'wifi', 'fiber'], suggestion: 'Good internet connectivity', category: 'Practical' },
];

function matchKeywords(input: string): Array<{ suggestion: string; category: string }> {
  const lower = input.toLowerCase();
  const matches: Array<{ suggestion: string; category: string }> = [];

  for (const entry of KEYWORD_MAP) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      matches.push({ suggestion: entry.suggestion, category: entry.category });
    }
  }

  return matches;
}

// -- Props -------------------------------------------------------------------

interface SoftCriteriaChatProps {
  onAddCriteria: (criteria: SoftCriterion[]) => void;
  existingCriteria: SoftCriterion[];
}

// -- Component ---------------------------------------------------------------

export function SoftCriteriaChat({ onAddCriteria, existingCriteria }: SoftCriteriaChatProps) {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<Array<{ suggestion: string; category: string }>>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const matches = matchKeywords(trimmed);

    if (matches.length > 0) {
      // Filter out suggestions that are already selected
      const existingTexts = new Set(existingCriteria.map((c) => c.text));
      const newMatches = matches.filter((m) => !existingTexts.has(m.suggestion));
      setSuggestions(newMatches.length > 0 ? newMatches : matches);
    } else {
      // No keyword match -- add the full text as a custom criterion
      const id = crypto.randomUUID();
      onAddCriteria([
        {
          id,
          category: 'Custom',
          text: trimmed,
          isCustom: true,
        },
      ]);
    }

    setHasSearched(true);
    setInput('');
  };

  const handleSuggestionClick = (suggestion: string, category: string) => {
    const alreadyExists = existingCriteria.some((c) => c.text === suggestion);
    if (alreadyExists) return;

    const id = crypto.randomUUID();
    onAddCriteria([
      {
        id,
        category,
        text: suggestion,
        isCustom: false,
      },
    ]);

    // Remove from displayed suggestions
    setSuggestions((prev) => prev.filter((s) => s.suggestion !== suggestion));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="rounded-xl border-dashed border-2 border-border/60 bg-muted/30">
      <CardContent className="p-4 space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            Describe what matters to you
          </p>
          <p className="text-xs text-muted-foreground">
            AI-powered refinement coming soon -- for now, try describing what matters to you!
          </p>
        </div>

        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='e.g. "I want a place near the lake with good schools"'
            className="rounded-lg flex-1"
          />
          <Button
            type="button"
            onClick={handleSend}
            className="rounded-lg bg-[#E4006E] hover:bg-[#E4006E]/90 text-white shrink-0"
          >
            Send
          </Button>
        </div>

        {/* Suggestions from keyword matching */}
        {suggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Click to add these suggestions:
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => {
                const alreadySelected = existingCriteria.some(
                  (c) => c.text === s.suggestion,
                );
                return (
                  <Badge
                    key={s.suggestion}
                    variant={alreadySelected ? 'default' : 'secondary'}
                    className={`cursor-pointer transition-colors ${
                      alreadySelected
                        ? 'bg-[#E4006E] text-white'
                        : 'hover:bg-[#E4006E]/10 hover:border-[#E4006E]/30'
                    }`}
                    onClick={() => handleSuggestionClick(s.suggestion, s.category)}
                  >
                    {s.suggestion}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Show when no matches found and we added as custom */}
        {hasSearched && suggestions.length === 0 && (
          <p className="text-xs text-muted-foreground italic">
            Added as custom criterion.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
