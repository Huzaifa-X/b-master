"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2 } from "lucide-react"
import type { BookingConfig } from "@/types/artifacts"
import { useLocale } from "@/lib/i18n"

interface TimeSlot {
  start: string
  end: string
}

interface WeekSchedule {
  Monday: TimeSlot[]
  Tuesday: TimeSlot[]
  Wednesday: TimeSlot[]
  Thursday: TimeSlot[]
  Friday: TimeSlot[]
  Saturday: TimeSlot[]
  Sunday: TimeSlot[]
}

interface BookingConfigFormProps {
  config: BookingConfig
  onChange: (config: BookingConfig) => void
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const
const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Dubai",
  "Australia/Sydney",
  "Pacific/Auckland",
]

export function BookingConfigForm({ config, onChange }: BookingConfigFormProps) {
  const { t } = useLocale()
  const [useDateRange, setUseDateRange] = useState(!!config.dateRange)

  const handleDayToggle = (day: keyof WeekSchedule) => {
    const newSchedule = { ...config.availability.schedule }
    if (newSchedule[day].length > 0) {
      newSchedule[day] = []
    } else {
      newSchedule[day] = [{ start: "09:00", end: "17:00" }]
    }
    onChange({
      ...config,
      availability: {
        ...config.availability,
        schedule: newSchedule
      }
    })
  }

  const handleAddTimeSlot = (day: keyof WeekSchedule) => {
    const newSchedule = { ...config.availability.schedule }
    newSchedule[day] = [...newSchedule[day], { start: "09:00", end: "17:00" }]
    onChange({
      ...config,
      availability: {
        ...config.availability,
        schedule: newSchedule
      }
    })
  }

  const handleRemoveTimeSlot = (day: keyof WeekSchedule, index: number) => {
    const newSchedule = { ...config.availability.schedule }
    newSchedule[day] = newSchedule[day].filter((_, i) => i !== index)
    onChange({
      ...config,
      availability: {
        ...config.availability,
        schedule: newSchedule
      }
    })
  }

  const handleTimeSlotChange = (
    day: keyof WeekSchedule,
    index: number,
    field: "start" | "end",
    value: string
  ) => {
    const newSchedule = { ...config.availability.schedule }
    newSchedule[day][index][field] = value
    onChange({
      ...config,
      availability: {
        ...config.availability,
        schedule: newSchedule
      }
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("artifacts.booking.eventConfiguration")}</CardTitle>
          <CardDescription>{t("artifacts.booking.configureDetails")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="eventTitle">{t("artifacts.booking.eventTitle")}</Label>
              <Input
                id="eventTitle"
                placeholder={t("artifacts.booking.eventTitlePlaceholder")}
                value={config.eventTitle}
                onChange={(e) => onChange({ ...config, eventTitle: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">{t("artifacts.booking.timezone")}</Label>
              <Select
                value={config.availability.timezone}
                onValueChange={(value) =>
                  onChange({
                    ...config,
                    availability: { ...config.availability, timezone: value }
                  })
                }
              >
                <SelectTrigger id="timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="eventDescription">{t("artifacts.booking.eventDescription")}</Label>
            <Textarea
              id="eventDescription"
              placeholder={t("artifacts.booking.eventDescriptionPlaceholder")}
              value={config.eventDescription}
              onChange={(e) => onChange({ ...config, eventDescription: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="duration">{t("artifacts.booking.duration")}</Label>
              <Input
                id="duration"
                type="number"
                min="15"
                step="15"
                value={config.duration}
                onChange={(e) => onChange({ ...config, duration: parseInt(e.target.value) || 30 })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bufferTime">{t("artifacts.booking.bufferTime")}</Label>
              <Input
                id="bufferTime"
                type="number"
                min="0"
                step="5"
                value={config.bufferTime}
                onChange={(e) => onChange({ ...config, bufferTime: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("artifacts.booking.availabilitySchedule")}</CardTitle>
          <CardDescription>{t("artifacts.booking.setAvailableHours")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {DAYS.map((day) => {
            const daySchedule = config.availability.schedule[day]
            const isEnabled = daySchedule.length > 0

            return (
              <div key={day} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={() => handleDayToggle(day)}
                    />
                    <Label className="text-base font-medium">{t(`artifacts.booking.days.${day}`)}</Label>
                  </div>
                  {isEnabled && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAddTimeSlot(day)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {t("artifacts.booking.addHours")}
                    </Button>
                  )}
                </div>

                {isEnabled && (
                  <div className="ml-11 space-y-2">
                    {daySchedule.map((slot, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            type="time"
                            value={slot.start}
                            onChange={(e) =>
                              handleTimeSlotChange(day, index, "start", e.target.value)
                            }
                            className="w-32"
                          />
                          <span className="text-muted-foreground">{t("artifacts.booking.to")}</span>
                          <Input
                            type="time"
                            value={slot.end}
                            onChange={(e) =>
                              handleTimeSlotChange(day, index, "end", e.target.value)
                            }
                            className="w-32"
                          />
                        </div>
                        {daySchedule.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveTimeSlot(day, index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("artifacts.booking.bookingWindow")}</CardTitle>
          <CardDescription>{t("artifacts.booking.limitDateRange")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              checked={useDateRange}
              onCheckedChange={(checked) => {
                setUseDateRange(checked)
                if (!checked) {
                  onChange({ ...config, dateRange: undefined })
                } else {
                  const today = new Date().toISOString().split("T")[0]
                  const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split("T")[0]
                  onChange({
                    ...config,
                    dateRange: { start: today, end: nextMonth }
                  })
                }
              }}
            />
            <Label>{t("artifacts.booking.enableDateRestriction")}</Label>
          </div>

          {useDateRange && config.dateRange && (
            <div className="ml-11 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dateStart">{t("artifacts.booking.startDate")}</Label>
                <Input
                  id="dateStart"
                  type="date"
                  value={config.dateRange.start}
                  onChange={(e) =>
                    onChange({
                      ...config,
                      dateRange: { ...config.dateRange!, start: e.target.value }
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateEnd">{t("artifacts.booking.endDate")}</Label>
                <Input
                  id="dateEnd"
                  type="date"
                  value={config.dateRange.end}
                  onChange={(e) =>
                    onChange({
                      ...config,
                      dateRange: { ...config.dateRange!, end: e.target.value }
                    })
                  }
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
