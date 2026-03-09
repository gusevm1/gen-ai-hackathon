import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { StepFiltersSchema, type StepFiltersData } from '@/schema/profile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

const RADIUS_OPTIONS = [0, 1, 2, 3, 4, 5, 7, 10, 15, 20, 30, 50];

const CATEGORY_OPTIONS = [
  'Apartment and house',
  'Apartment',
  'House, chalet, rustico',
  'Furnished dwelling',
  'Parking space, garage',
  'Office',
  'Commercial and industry',
  'Storage room',
] as const;

const PRICE_OPTIONS = [
  'Any',
  500,
  600,
  700,
  800,
  900,
  1000,
  1100,
  1200,
  1300,
  1400,
  1500,
  1600,
  1700,
  1800,
  1900,
  2000,
  2200,
  2400,
  2600,
  2800,
  3000,
  3500,
  4000,
  4500,
  5000,
  5500,
  6000,
  7000,
  8000,
  9000,
  10000,
] as const;

const ROOM_OPTIONS = ['Any', 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8] as const;

const LIVING_SPACE_OPTIONS = ['Any', 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 140, 160, 180, 200, 250, 300] as const;

const FLOOR_OPTIONS = [
  { value: 'any', label: 'Any' },
  { value: 'on_gf', label: 'On GF' },
  { value: 'not_on_gf', label: 'Not on GF' },
] as const;

const AVAILABILITY_OPTIONS = [
  { value: 'any', label: 'Any' },
  { value: 'immediately', label: 'Immediately' },
  { value: '1m', label: 'In 1 month' },
  { value: '2m', label: 'In 2 months' },
  { value: '3m', label: 'In 3 months' },
  { value: '4m', label: 'In 4 months' },
  { value: '5m', label: 'In 5 months' },
  { value: '6m', label: 'In 6 months' },
  { value: '7m', label: 'In 7 months' },
  { value: '8m', label: 'In 8 months' },
  { value: '9m', label: 'In 9 months' },
  { value: '10m', label: 'In 10 months' },
  { value: '11m', label: 'In 11 months' },
  { value: '12m', label: 'In 12 months' },
] as const;

const FEATURE_OPTIONS = [
  'Balcony / terrace',
  'Elevator',
  'New building',
  'Old building',
  'Swimming pool',
  'Pets allowed',
  'Wheelchair access',
  'Parking space / garage',
  'Minergie',
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
      radiusKm: 0,
      propertyCategory: undefined,
      priceMin: undefined,
      priceMax: undefined,
      onlyWithPrice: false,
      roomsMin: undefined,
      roomsMax: undefined,
      livingSpaceMin: undefined,
      livingSpaceMax: undefined,
      yearBuiltMin: undefined,
      yearBuiltMax: undefined,
      floorPreference: undefined,
      availability: undefined,
      features: [],
      free_text_search: '',
      ...defaultValues,
    },
  });

  const handleSubmit = form.handleSubmit((data) => {
    onComplete({
      ...data,
      free_text_search: data.free_text_search ?? '',
    });
  });

  return (
    <Form {...form}>
      <form
        onSubmit={handleSubmit}
        className="space-y-6 max-w-3xl mx-auto"
      >
        {/* Hidden free text search field (kept in data as empty string) */}
        <input type="hidden" {...form.register('free_text_search')} value="" />

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
                  <FormLabel>Radius</FormLabel>
                  <Select
                    value={field.value !== undefined ? String(field.value) : undefined}
                    onValueChange={(val) => field.onChange(Number(val))}
                  >
                    <FormControl>
                      <SelectTrigger className="rounded-lg">
                        <SelectValue placeholder="Choose radius" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {RADIUS_OPTIONS.map((km) => (
                        <SelectItem key={km} value={String(km)}>
                          +{km} km
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            {/* Listing type (unchanged) */}
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
            {/* Property category dropdown */}
            <FormField
              control={form.control}
              name="propertyCategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select
                    value={field.value ?? undefined}
                    onValueChange={(val) => field.onChange(val)}
                  >
                    <FormControl>
                      <SelectTrigger className="rounded-lg">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    value={field.value ?? undefined}
                    onValueChange={(val) => field.onChange(val)}
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
                        <Select
                          value={field.value !== undefined ? String(field.value) : 'Any'}
                          onValueChange={(val) =>
                            field.onChange(val === 'Any' ? undefined : Number(val))
                          }
                        >
                          <SelectTrigger className="rounded-lg">
                            <SelectValue placeholder="Min" />
                          </SelectTrigger>
                          <SelectContent>
                            {PRICE_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={String(opt)}>
                                {opt === 'Any' ? 'Any' : `${opt} CHF`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                        <Select
                          value={field.value !== undefined ? String(field.value) : 'Any'}
                          onValueChange={(val) =>
                            field.onChange(val === 'Any' ? undefined : Number(val))
                          }
                        >
                          <SelectTrigger className="rounded-lg">
                            <SelectValue placeholder="Max" />
                          </SelectTrigger>
                          <SelectContent>
                            {PRICE_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={String(opt)}>
                                {opt === 'Any' ? 'Any' : `${opt} CHF`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="onlyWithPrice"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2 pt-2">
                    <FormControl>
                      <Checkbox
                        checked={!!field.value}
                        onCheckedChange={(checked) => field.onChange(!!checked)}
                      />
                    </FormControl>
                    <Label className="text-sm font-normal">Only Listings With Price</Label>
                  </FormItem>
                )}
              />
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
                        <Select
                          value={field.value !== undefined ? String(field.value) : 'Any'}
                          onValueChange={(val) =>
                            field.onChange(val === 'Any' ? undefined : Number(val))
                          }
                        >
                          <SelectTrigger className="rounded-lg">
                            <SelectValue placeholder="Min" />
                          </SelectTrigger>
                          <SelectContent>
                            {ROOM_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={String(opt)}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                        <Select
                          value={field.value !== undefined ? String(field.value) : 'Any'}
                          onValueChange={(val) =>
                            field.onChange(val === 'Any' ? undefined : Number(val))
                          }
                        >
                          <SelectTrigger className="rounded-lg">
                            <SelectValue placeholder="Max" />
                          </SelectTrigger>
                          <SelectContent>
                            {ROOM_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={String(opt)}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                        <Select
                          value={field.value !== undefined ? String(field.value) : 'Any'}
                          onValueChange={(val) =>
                            field.onChange(val === 'Any' ? undefined : Number(val))
                          }
                        >
                          <SelectTrigger className="rounded-lg">
                            <SelectValue placeholder="Min" />
                          </SelectTrigger>
                          <SelectContent>
                            {LIVING_SPACE_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={String(opt)}>
                                {opt === 'Any' ? 'Any' : `${opt} m²`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                        <Select
                          value={field.value !== undefined ? String(field.value) : 'Any'}
                          onValueChange={(val) =>
                            field.onChange(val === 'Any' ? undefined : Number(val))
                          }
                        >
                          <SelectTrigger className="rounded-lg">
                            <SelectValue placeholder="Max" />
                          </SelectTrigger>
                          <SelectContent>
                            {LIVING_SPACE_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={String(opt)}>
                                {opt === 'Any' ? 'Any' : `${opt} m²`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                    value={field.value ?? undefined}
                    onValueChange={(val) => field.onChange(val)}
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
