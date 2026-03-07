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
  const { weights, setWeight, resetToEqual, total } = useWeightSliders({
    categories,
    initialWeights: defaultWeights,
  });

  const isExact100 = total === 100;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="mx-auto w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Allocate Importance
          </h2>
          <p className="text-sm text-muted-foreground">
            Drag sliders to indicate how much each category matters to you.
            Total must equal 100%.
          </p>
        </div>

        {/* Total indicator */}
        <div className="flex items-center justify-between rounded-lg border bg-card p-4 shadow-sm">
          <span className="text-sm font-medium text-muted-foreground">
            Total Weight
          </span>
          <span
            className={`text-2xl font-bold tabular-nums transition-colors ${
              isExact100
                ? 'text-primary'
                : 'text-destructive'
            }`}
          >
            {total.toFixed(1)}%
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
