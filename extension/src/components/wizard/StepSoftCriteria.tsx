import { useState } from 'react';
import type { SoftCriterion } from '@/schema/profile';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { SoftCriteriaChat } from './SoftCriteriaChat';
import { X } from 'lucide-react';

// -- Category definitions with curated suggestions ---------------------------

const CATEGORIES: Array<{
  name: string;
  description: string;
  suggestions: string[];
}> = [
  {
    name: 'Surroundings & Location',
    description: 'What should the neighborhood offer?',
    suggestions: [
      'Near public transport',
      'Lake/river view',
      'Quiet neighborhood',
      'Near schools',
      'Near shops/restaurants',
      'Near park/green space',
      'Near city center',
    ],
  },
  {
    name: 'Building & Quality',
    description: 'What matters about the building itself?',
    suggestions: [
      'Modern renovation',
      'Well-maintained building',
      'Energy efficient',
      'Good insulation',
      'New construction',
      'Historic charm',
    ],
  },
  {
    name: 'Outdoor Space',
    description: 'What outdoor areas are important?',
    suggestions: [
      'Large balcony',
      'Private garden',
      'Rooftop terrace',
      'South-facing',
      'Sunny exposure',
    ],
  },
  {
    name: 'Lifestyle & Comfort',
    description: 'What makes a space feel right for you?',
    suggestions: [
      'Open floor plan',
      'High ceilings',
      'Bright/lots of light',
      'Separate kitchen',
      'Walk-in closet',
      'Home office space',
    ],
  },
  {
    name: 'Practical',
    description: 'What practical aspects are important?',
    suggestions: [
      'Low utility costs',
      'Low tax municipality',
      'Good internet connectivity',
      'Short commute',
      'Ample storage',
    ],
  },
];

// -- Props -------------------------------------------------------------------

interface StepSoftCriteriaProps {
  defaultValues?: SoftCriterion[];
  onComplete: (criteria: SoftCriterion[]) => void;
  onBack: () => void;
}

// -- Component ---------------------------------------------------------------

export function StepSoftCriteria({
  defaultValues = [],
  onComplete,
  onBack,
}: StepSoftCriteriaProps) {
  const [criteria, setCriteria] = useState<SoftCriterion[]>(defaultValues);
  const [customText, setCustomText] = useState('');

  const selectedTexts = new Set(criteria.map((c) => c.text));

  const toggleSuggestion = (text: string, category: string) => {
    if (selectedTexts.has(text)) {
      setCriteria((prev) => prev.filter((c) => c.text !== text));
    } else {
      const newCriterion: SoftCriterion = {
        id: crypto.randomUUID(),
        category,
        text,
        isCustom: false,
      };
      setCriteria((prev) => [...prev, newCriterion]);
    }
  };

  const addCustomCriterion = () => {
    const trimmed = customText.trim();
    if (!trimmed) return;

    // Prevent duplicates
    if (selectedTexts.has(trimmed)) {
      setCustomText('');
      return;
    }

    const newCriterion: SoftCriterion = {
      id: crypto.randomUUID(),
      category: 'Custom',
      text: trimmed,
      isCustom: true,
    };
    setCriteria((prev) => [...prev, newCriterion]);
    setCustomText('');
  };

  const removeCriterion = (id: string) => {
    setCriteria((prev) => prev.filter((c) => c.id !== id));
  };

  const handleChatCriteria = (newCriteria: SoftCriterion[]) => {
    setCriteria((prev) => [...prev, ...newCriteria]);
  };

  const handleCustomKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomCriterion();
    }
  };

  // Group selected criteria by category for the summary panel
  const groupedCriteria = criteria.reduce<Record<string, SoftCriterion[]>>(
    (acc, c) => {
      if (!acc[c.category]) acc[c.category] = [];
      acc[c.category].push(c);
      return acc;
    },
    {},
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">
          What else matters to you?
        </h2>
        <p className="text-muted-foreground">
          Select criteria that standard filters can't capture. These help our AI
          evaluate listing details, descriptions, and images.
        </p>
      </div>

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left panel -- Category Prompts */}
        <div className="lg:col-span-3 space-y-4">
          {CATEGORIES.map((cat) => (
            <Card key={cat.name} className="rounded-xl shadow-sm border-border/50">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-base font-semibold">
                  {cat.name}
                </CardTitle>
                <p className="text-xs text-muted-foreground">{cat.description}</p>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="flex flex-wrap gap-2">
                  {cat.suggestions.map((suggestion) => {
                    const isSelected = selectedTexts.has(suggestion);
                    return (
                      <Badge
                        key={suggestion}
                        variant={isSelected ? 'default' : 'outline'}
                        className={`cursor-pointer transition-all select-none ${
                          isSelected
                            ? 'bg-[#E4006E] text-white border-[#E4006E] hover:bg-[#E4006E]/90'
                            : 'hover:bg-[#E4006E]/10 hover:border-[#E4006E]/30'
                        }`}
                        onClick={() => toggleSuggestion(suggestion, cat.name)}
                      >
                        {isSelected && (
                          <span className="mr-1 text-xs">&#10003;</span>
                        )}
                        {suggestion}
                      </Badge>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Custom text input */}
          <Card className="rounded-xl shadow-sm border-border/50">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-base font-semibold">Custom</CardTitle>
              <p className="text-xs text-muted-foreground">
                Add anything else that matters to you
              </p>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex gap-2">
                <Input
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  onKeyDown={handleCustomKeyDown}
                  placeholder="Type your own criterion..."
                  className="rounded-lg flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addCustomCriterion}
                  className="rounded-lg shrink-0"
                >
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* LLM Chat placeholder */}
          <SoftCriteriaChat
            onAddCriteria={handleChatCriteria}
            existingCriteria={criteria}
          />
        </div>

        {/* Right panel -- Selected Criteria Summary */}
        <div className="lg:col-span-2">
          <Card className="rounded-xl shadow-sm border-border/50 sticky top-4">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">
                  Selected Criteria
                </CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {criteria.length} selected
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              {criteria.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No criteria selected yet -- click suggestions or type your own.
                </p>
              ) : (
                <ScrollArea className="h-[400px] pr-2">
                  <div className="space-y-4">
                    {Object.entries(groupedCriteria).map(([category, items]) => (
                      <div key={category} className="space-y-2">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                          {category}
                        </Label>
                        <div className="space-y-1">
                          {items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2 group"
                            >
                              <span className="text-sm">{item.text}</span>
                              <button
                                type="button"
                                onClick={() => removeCriterion(item.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                                aria-label={`Remove ${item.text}`}
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <Separator className="mt-2" />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-2 pb-8">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="rounded-xl"
        >
          Back
        </Button>
        <Button
          type="button"
          onClick={() => onComplete(criteria)}
          className="rounded-xl bg-[#E4006E] hover:bg-[#E4006E]/90 text-white px-8"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
