import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { StepFiltersSchema, type StepFiltersData } from '@/schema/profile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';

// -- Constants ---------------------------------------------------------------

const PROPERTY_TYPES = [
  'Apartment',
  'House',
  'Studio',
  'Room',
  'Parking',
  'Commercial',
] as const;

const FLOOR_OPTIONS = [
  { value: 'any', label: 'Any' },
  { value: 'ground', label: 'Ground floor (Erdgeschoss)' },
  { value: 'upper', label: 'Upper floors' },
  { value: 'top', label: 'Top floor' },
  { value: 'basement', label: 'Basement' },
] as const;

const AVAILABILITY_OPTIONS = [
  { value: 'immediately', label: 'Immediately' },
  { value: 'within-1-month', label: 'Within 1 month' },
  { value: 'within-3-months', label: 'Within 3 months' },
  { value: 'within-6-months', label: 'Within 6 months' },
  { value: 'by-agreement', label: 'By agreement' },
  { value: 'no-preference', label: 'No preference' },
] as const;

const FEATURE_OPTIONS = [
  'Balcony/Terrace',
  'Elevator',
  'Parking',
  'Garage',
  'Garden',
  'Minergie',
  'Wheelchair accessible',
  'Dishwasher',
  'Washing machine',
  'Tumble dryer',
  'Cable TV',
  'Fireplace',
  'Swimming pool',
  'View',
  'Pets allowed',
  'Child-friendly',
] as const;

// -- Props -------------------------------------------------------------------

interface StepFiltersProps {
  defaultValues?: Partial<StepFiltersData>;
  onComplete: (data: StepFiltersData) => void;
  onBack?: () => void;
}

// -- Component ---------------------------------------------------------------

export function StepFilters({ defaultValues, onComplete, onBack }: StepFiltersProps) {
  const form = useForm<StepFiltersData>({
    resolver: zodResolver(StepFiltersSchema),
    defaultValues: {
      listingType: undefined,
      location: '',
      radiusKm: 10,
      propertyTypes: [],
      priceMin: undefined,
      priceMax: undefined,
      roomsMin: undefined,
      roomsMax: undefined,
      livingSpaceMin: undefined,
      livingSpaceMax: undefined,
      yearBuiltMin: undefined,
      yearBuiltMax: undefined,
      floorPreference: undefined,
      availability: undefined,
      features: [],
      ...defaultValues,
    },
  });

  const radiusValue = form.watch('radiusKm') ?? 10;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onComplete)}
        className="space-y-6 max-w-3xl mx-auto"
      >
        {/* ---------------------------------------------------------------- */}
        {/* Section 1 - Search Basics                                        */}
        {/* ---------------------------------------------------------------- */}
        <Card className="rounded-xl shadow-sm border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Search Basics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Location */}
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Zurich, Bern, Basel..."
                      className="rounded-lg"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Radius */}
            <FormField
              control={form.control}
              name="radiusKm"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Radius</FormLabel>
                    <span className="text-sm text-muted-foreground font-medium">
                      {radiusValue} km
                    </span>
                  </div>
                  <FormControl>
                    <Slider
                      min={0}
                      max={100}
                      step={1}
                      value={[field.value ?? 10]}
                      onValueChange={(vals) => field.onChange(vals[0])}
                      className="py-2"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Listing type */}
            <FormField
              control={form.control}
              name="listingType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Listing type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value ?? ''}
                      onValueChange={field.onChange}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="rent" id="listing-rent" />
                        <Label htmlFor="listing-rent" className="cursor-pointer">
                          Rent
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="buy" id="listing-buy" />
                        <Label htmlFor="listing-buy" className="cursor-pointer">
                          Buy
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* ---------------------------------------------------------------- */}
        {/* Section 2 - Property                                             */}
        {/* ---------------------------------------------------------------- */}
        <Card className="rounded-xl shadow-sm border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Property</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Property types */}
            <FormField
              control={form.control}
              name="propertyTypes"
              render={() => (
                <FormItem>
                  <FormLabel>Property type</FormLabel>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                    {PROPERTY_TYPES.map((type) => (
                      <FormField
                        key={type}
                        control={form.control}
                        name="propertyTypes"
                        render={({ field }) => {
                          const current = field.value ?? [];
                          return (
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={current.includes(type)}
                                  onCheckedChange={(checked) => {
                                    field.onChange(
                                      checked
                                        ? [...current, type]
                                        : current.filter((t) => t !== type),
                                    );
                                  }}
                                />
                              </FormControl>
                              <Label className="text-sm font-normal cursor-pointer">
                                {type}
                              </Label>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                </FormItem>
              )}
            />

            {/* Floor preference */}
            <FormField
              control={form.control}
              name="floorPreference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Floor preference</FormLabel>
                  <Select
                    value={field.value ?? ''}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="rounded-lg">
                        <SelectValue placeholder="Select floor preference" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FLOOR_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* ---------------------------------------------------------------- */}
        {/* Section 3 - Specifications                                       */}
        {/* ---------------------------------------------------------------- */}
        <Card className="rounded-xl shadow-sm border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Specifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Price range */}
            <div className="space-y-2">
              <Label>Price range (CHF)</Label>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="priceMin"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Min CHF"
                          className="rounded-lg"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === ''
                                ? undefined
                                : Number(e.target.value),
                            )
                          }
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="priceMax"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Max CHF"
                          className="rounded-lg"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === ''
                                ? undefined
                                : Number(e.target.value),
                            )
                          }
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Rooms range */}
            <div className="space-y-2">
              <Label>Rooms</Label>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="roomsMin"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.5"
                          placeholder="Min"
                          className="rounded-lg"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === ''
                                ? undefined
                                : Number(e.target.value),
                            )
                          }
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="roomsMax"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.5"
                          placeholder="Max"
                          className="rounded-lg"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === ''
                                ? undefined
                                : Number(e.target.value),
                            )
                          }
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Living space range */}
            <div className="space-y-2">
              <Label>Living space (sqm)</Label>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="livingSpaceMin"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Min sqm"
                          className="rounded-lg"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === ''
                                ? undefined
                                : Number(e.target.value),
                            )
                          }
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="livingSpaceMax"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Max sqm"
                          className="rounded-lg"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === ''
                                ? undefined
                                : Number(e.target.value),
                            )
                          }
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Year built range */}
            <div className="space-y-2">
              <Label>Year built</Label>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="yearBuiltMin"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="From year"
                          className="rounded-lg"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === ''
                                ? undefined
                                : Number(e.target.value),
                            )
                          }
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="yearBuiltMax"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="To year"
                          className="rounded-lg"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === ''
                                ? undefined
                                : Number(e.target.value),
                            )
                          }
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ---------------------------------------------------------------- */}
        {/* Section 4 - Availability                                         */}
        {/* ---------------------------------------------------------------- */}
        <Card className="rounded-xl shadow-sm border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Availability</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="availability"
              render={({ field }) => (
                <FormItem>
                  <Select
                    value={field.value ?? ''}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="rounded-lg">
                        <SelectValue placeholder="Select availability" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {AVAILABILITY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* ---------------------------------------------------------------- */}
        {/* Section 5 - Features & Furnishings                               */}
        {/* ---------------------------------------------------------------- */}
        <Card className="rounded-xl shadow-sm border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">
              Features & Furnishings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="features"
              render={() => (
                <FormItem>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {FEATURE_OPTIONS.map((feature) => (
                      <FormField
                        key={feature}
                        control={form.control}
                        name="features"
                        render={({ field }) => {
                          const current = field.value ?? [];
                          return (
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={current.includes(feature)}
                                  onCheckedChange={(checked) => {
                                    field.onChange(
                                      checked
                                        ? [...current, feature]
                                        : current.filter((f) => f !== feature),
                                    );
                                  }}
                                />
                              </FormControl>
                              <Label className="text-sm font-normal cursor-pointer">
                                {feature}
                              </Label>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* ---------------------------------------------------------------- */}
        {/* Navigation                                                       */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex justify-between pt-2 pb-8">
          {onBack ? (
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="rounded-xl"
            >
              Back
            </Button>
          ) : (
            <div />
          )}
          <Button
            type="submit"
            className="rounded-xl bg-[#E4006E] hover:bg-[#E4006E]/90 text-white px-8"
          >
            Next
          </Button>
        </div>
      </form>
    </Form>
  );
}
