import { useMemo, useState } from 'react';
import { useWeightSliders } from '@/hooks/useWeightSliders';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { RotateCcw, Info, ChevronLeft, Save } from 'lucide-react';
import { normalizeWeights } from '@/utils/weight-redistribution';

export interface StepWeightsProps {
  categories: string[];
  defaultWeights?: Record<string, number>;
  onComplete: (weights: Record<string, number>) => void;
  onBack: () => void;
}

/**
 * Tooltip descriptions for well-known categories.
 * Soft criteria categories will fall through to a generic description.
 */
const CATEGORY_TOOLTIPS: Record<string, string> = {
  Location: 'How important is the neighbourhood, address, and proximity to your chosen area?',
  Budget: 'How strictly should listings match your price range?',
  'Size & Rooms': 'How important are the number of rooms and living space?',
  'Property Type': 'How much does the type of property (apartment, house, etc.) matter?',
  Building: 'How important are building characteristics like year built and floor level?',
  Features: 'How much do specific features and furnishings matter?',
  Availability: 'How important is the move-in date or availability window?',
};

function getCategoryTooltip(category: string): string {
  return (
    CATEGORY_TOOLTIPS[category] ??
    `How important is "${category}" when evaluating listings?`
  );
}

export function StepWeights({
  categories,
  defaultWeights,
  onComplete,
  onBack,
}: StepWeightsProps) {
  const { weights, setWeight, resetToEqual } = useWeightSliders({
    categories,
    initialWeights: defaultWeights,
  });
  const normalizedWeights = useMemo(() => normalizeWeights(weights), [weights]);
  const normalizedTotal = useMemo(
    () => Object.values(normalizedWeights).reduce((s, v) => s + v, 0),
    [normalizedWeights],
  );
  const [previewWeights, setPreviewWeights] = useState<Record<string, number>>({});
  const [hasPreview, setHasPreview] = useState(false);

  const previewEntries = useMemo(
    () =>
      Object.entries(previewWeights)
        .filter(([category]) => (weights[category] ?? 0) > 0)
        .sort(([, a], [, b]) => b - a),
    [previewWeights, weights],
  );

  const handleSetPreview = () => {
    setPreviewWeights(normalizedWeights);
    setHasPreview(true);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="mx-auto w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Allocate Importance
          </h2>
          <p className="text-sm text-muted-foreground">
            Drag sliders (0-100) to indicate how much each category matters to you.
            We convert these values to relative weights by dividing each by the
            sum of all sliders, so the normalized weights always sum to 1.
          </p>
        </div>

        {/* Normalized indicator */}
        <div className="flex items-center justify-between rounded-lg border bg-card p-4 shadow-sm">
          <span className="text-sm font-medium text-muted-foreground">
            Normalized total (used for scoring)
          </span>
          <span className="text-2xl font-bold tabular-nums text-primary">
            {normalizedTotal.toFixed(2)}
          </span>
        </div>

        {/* Category sliders */}
        <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2">
          {categories.map((category) => {
            const value = weights[category] ?? 0;

            return (
              <Card
                key={category}
                className="shadow-sm transition-shadow hover:shadow-md"
              >
                <CardContent className="space-y-3 p-4">
                  {/* Category label + tooltip + badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-foreground">
                        {category}
                      </span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                            aria-label={`Info about ${category}`}
                          >
                            <Info className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[220px]">
                          <p className="text-xs">{getCategoryTooltip(category)}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Badge
                      variant={value > 0 ? 'default' : 'secondary'}
                      className="tabular-nums"
                    >
                      {value.toFixed(1)}%
                    </Badge>
                  </div>

                  {/* Slider */}
                  <Slider
                    min={0}
                    max={100}
                    step={0.1}
                    value={[value]}
                    onValueChange={([v]) => setWeight(category, v)}
                    aria-label={`${category} weight`}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Reset button */}
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetToEqual}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to Equal
          </Button>
        </div>

        {/* Set & preview normalized weights */}
        <Card className="shadow-sm">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Set weights</p>
                <p className="text-xs text-muted-foreground">
                  Click to lock in current sliders, normalize them (value / sum), and see the resulting 0–1 weights.
                </p>
              </div>
              <Button size="sm" onClick={handleSetPreview} className="gap-1.5">
                Set
              </Button>
            </div>

            {hasPreview ? (
              previewEntries.length > 0 ? (
                <div className="space-y-2">
                  {previewEntries.map(([category, weight]) => (
                    <div key={category} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground">{category}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {(weight * 100).toFixed(2)}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${weight * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  All sliders are at 0. Increase at least one to see normalized weights.
                </p>
              )
            ) : (
              <p className="text-xs text-muted-foreground">
                No preview yet. Adjust sliders, then click Set to view normalized weights.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" onClick={onBack} className="gap-1.5">
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          <Button
            size="lg"
            onClick={() => onComplete(weights)}
            className="gap-1.5"
          >
            <Save className="h-4 w-4" />
            Save Profile
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
