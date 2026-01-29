import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, X } from 'lucide-react'
import { Database } from '@/types/database'
import { formatDate } from '@/lib/utils'

type TestPlan = Database['public']['Tables']['test_plans']['Row']

interface TestPlanCalendarProps {
  testPlans: TestPlan[]
  onSelectPlan: (plan: TestPlan) => void
}

interface DayPopover {
  date: Date
  plans: TestPlan[]
  position: { x: number; y: number }
}

export default function TestPlanCalendar({ testPlans, onSelectPlan }: TestPlanCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [view, setView] = useState<'calendar' | 'timeline'>('timeline')
  const [dayPopover, setDayPopover] = useState<DayPopover | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setDayPopover(null)
      }
    }

    if (dayPopover) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dayPopover])

  const handleShowMorePlans = (e: React.MouseEvent, date: Date, plans: TestPlan[]) => {
    e.stopPropagation()
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    setDayPopover({
      date,
      plans,
      position: {
        x: rect.left,
        y: rect.bottom + 4
      }
    })
  }

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const today = () => {
    setCurrentMonth(new Date())
  }

  // Get plans for current month
  const getMonthPlans = () => {
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)

    return testPlans.filter(plan => {
      if (!plan.start_date && !plan.end_date) return false
      
      const start = plan.start_date ? new Date(plan.start_date) : null
      const end = plan.end_date ? new Date(plan.end_date) : null

      // Plan overlaps with current month
      if (start && end) {
        return start <= monthEnd && end >= monthStart
      } else if (start) {
        return start >= monthStart && start <= monthEnd
      } else if (end) {
        return end >= monthStart && end <= monthEnd
      }
      return false
    })
  }

  // Timeline View
  const renderTimeline = () => {
    const monthPlans = getMonthPlans()

    if (monthPlans.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          No test plans scheduled for this month
        </div>
      )
    }

    // Sort by start date
    const sortedPlans = [...monthPlans].sort((a, b) => {
      const dateA = a.start_date ? new Date(a.start_date).getTime() : 0
      const dateB = b.start_date ? new Date(b.start_date).getTime() : 0
      return dateA - dateB
    })

    return (
      <div className="space-y-3">
        {sortedPlans.map(plan => {
          const start = plan.start_date ? new Date(plan.start_date) : null
          const end = plan.end_date ? new Date(plan.end_date) : null
          const today = new Date()
          const isActive = start && end && today >= start && today <= end
          const isPast = end && today > end
          const isFuture = start && today < start

          return (
            <div
              key={plan.id}
              onClick={() => onSelectPlan(plan)}
              className={`p-4 rounded-lg border-l-4 cursor-pointer transition-all hover:shadow-md ${
                isActive
                  ? 'border-green-500 bg-green-50'
                  : isPast
                  ? 'border-gray-400 bg-gray-50'
                  : 'border-blue-500 bg-blue-50'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                  {plan.description && (
                    <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                  )}
                  <div className="flex gap-4 mt-2 text-sm">
                    {start && (
                      <span className="text-gray-700">
                        <span className="font-medium">Start:</span> {formatDate(plan.start_date!)}
                      </span>
                    )}
                    {end && (
                      <span className="text-gray-700">
                        <span className="font-medium">End:</span> {formatDate(plan.end_date!)}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  isActive
                    ? 'bg-green-200 text-green-800'
                    : isPast
                    ? 'bg-gray-200 text-gray-700'
                    : 'bg-blue-200 text-blue-800'
                }`}>
                  {isActive ? 'Active' : isPast ? 'Completed' : 'Upcoming'}
                </span>
              </div>

              {/* Duration bar */}
              {start && end && (
                <div className="mt-3">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    {(() => {
                      const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
                      const elapsedDays = Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
                      const progress = Math.min(Math.max((elapsedDays / totalDays) * 100, 0), 100)

                      return (
                        <div
                          className={`h-full transition-all ${
                            isActive ? 'bg-green-500' : isPast ? 'bg-gray-400' : 'bg-blue-500'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      )
                    })()}
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>
                      {start && end
                        ? `${Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))} days`
                        : ''}
                    </span>
                    {isActive && start && end && (
                      <span>
                        {Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))} days remaining
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // Calendar Grid View (simplified)
  const renderCalendar = () => {
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
    const startDate = new Date(monthStart)
    startDate.setDate(startDate.getDate() - startDate.getDay()) // Start from Sunday

    const days = []
    let day = new Date(startDate)

    while (days.length < 35) {
      days.push(new Date(day))
      day.setDate(day.getDate() + 1)
    }

    const monthPlans = getMonthPlans()

    const getPlansForDay = (date: Date) => {
      return monthPlans.filter(plan => {
        const start = plan.start_date ? new Date(plan.start_date) : null
        const end = plan.end_date ? new Date(plan.end_date) : null

        if (start && end) {
          return date >= start && date <= end
        } else if (start) {
          return date.toDateString() === start.toDateString()
        } else if (end) {
          return date.toDateString() === end.toDateString()
        }
        return false
      })
    }

    return (
      <div>
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="bg-gray-100 py-2 text-center text-sm font-medium text-gray-700">
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {days.map((date, index) => {
            const isCurrentMonth = date.getMonth() === currentMonth.getMonth()
            const isToday = date.toDateString() === new Date().toDateString()
            const dayPlans = getPlansForDay(date)

            return (
              <div
                key={index}
                className={`bg-white min-h-[80px] p-2 ${
                  !isCurrentMonth ? 'opacity-40' : ''
                }`}
              >
                <div className={`text-sm font-medium mb-1 ${
                  isToday
                    ? 'w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center'
                    : 'text-gray-700'
                }`}>
                  {date.getDate()}
                </div>
                {dayPlans.length > 0 && (
                  <div className="space-y-1">
                    {dayPlans.slice(0, 2).map(plan => (
                      <div
                        key={plan.id}
                        onClick={() => onSelectPlan(plan)}
                        className="text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded truncate cursor-pointer hover:bg-blue-200"
                        title={plan.name}
                      >
                        {plan.name}
                      </div>
                    ))}
                    {dayPlans.length > 2 && (
                      <button
                        onClick={(e) => handleShowMorePlans(e, date, dayPlans)}
                        className="text-xs text-primary-600 hover:text-primary-800 hover:underline font-medium cursor-pointer"
                      >
                        +{dayPlans.length - 2} more
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={previousMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[200px] text-center">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h2>
          <Button size="sm" variant="secondary" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="secondary" onClick={today}>
            Today
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant={view === 'timeline' ? 'default' : 'secondary'}
            onClick={() => setView('timeline')}
          >
            <List className="w-4 h-4 mr-1" />
            Timeline
          </Button>
          <Button
            size="sm"
            variant={view === 'calendar' ? 'default' : 'secondary'}
            onClick={() => setView('calendar')}
          >
            <CalendarIcon className="w-4 h-4 mr-1" />
            Calendar
          </Button>
        </div>
      </div>

      {/* View */}
      {view === 'timeline' ? renderTimeline() : renderCalendar()}

      {/* Day Plans Popover */}
      {dayPopover && (
        <div
          ref={popoverRef}
          className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 min-w-[280px] max-w-[350px]"
          style={{
            left: Math.min(dayPopover.position.x, window.innerWidth - 360),
            top: Math.min(dayPopover.position.y, window.innerHeight - 300)
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50 rounded-t-lg">
            <div>
              <h4 className="font-semibold text-gray-900">
                {dayPopover.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </h4>
              <p className="text-xs text-gray-500">{dayPopover.plans.length} test plan(s)</p>
            </div>
            <button
              onClick={() => setDayPopover(null)}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Plans List */}
          <div className="max-h-[250px] overflow-y-auto p-2">
            <div className="space-y-2">
              {dayPopover.plans.map(plan => {
                const start = plan.start_date ? new Date(plan.start_date) : null
                const end = plan.end_date ? new Date(plan.end_date) : null
                const today = new Date()
                const isActive = start && end && today >= start && today <= end
                const isPast = end && today > end

                return (
                  <div
                    key={plan.id}
                    onClick={() => {
                      onSelectPlan(plan)
                      setDayPopover(null)
                    }}
                    className={`p-3 rounded-lg cursor-pointer transition-all hover:shadow-md border-l-4 ${
                      isActive
                        ? 'border-green-500 bg-green-50 hover:bg-green-100'
                        : isPast
                        ? 'border-gray-400 bg-gray-50 hover:bg-gray-100'
                        : 'border-blue-500 bg-blue-50 hover:bg-blue-100'
                    }`}
                  >
                    <h5 className="font-medium text-gray-900 text-sm">{plan.name}</h5>
                    {plan.description && (
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{plan.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        isActive
                          ? 'bg-green-200 text-green-800'
                          : isPast
                          ? 'bg-gray-200 text-gray-700'
                          : 'bg-blue-200 text-blue-800'
                      }`}>
                        {isActive ? 'Active' : isPast ? 'Past' : 'Upcoming'}
                      </span>
                      {start && end && (
                        <span className="text-xs text-gray-500">
                          {formatDate(plan.start_date!)} - {formatDate(plan.end_date!)}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
