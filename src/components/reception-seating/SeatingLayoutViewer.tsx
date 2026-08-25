import { useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SeatingLayoutElement } from '@/lib/api/celebrations'

// Same fixed logical canvas the admin's seating-layout editor draws on
// (EventSeatingLayoutEditor.tsx, backend) — x/y/width/height on every
// element are pixels on this canvas, not real screen pixels. This viewer
// scales the whole canvas down to fit its container's width instead of
// letting it scroll, since it's read-only (no drag/resize/toolbar).
const CANVAS_WIDTH = 1400
const CANVAS_HEIGHT = 900

// Visual-only enlargement of each table/placeholder around its own center (on top of the
// fit-to-width scale above) so tables read clearly on the guest-facing view instead of looking
// tiny at the admin-authored size — doesn't shift the underlying layout positions.
const ELEMENT_SCALE = 1.3

interface SeatingLayoutViewerProps {
  elements: SeatingLayoutElement[]
  /** The id of the table the logged-in guest is assigned to, if any — gets a distinct "your table" highlight. */
  myTableId?: string | null
  /** The id of the table currently clicked, if any — gets a selection ring, distinct from `myTableId`'s highlight (both can apply at once). */
  selectedTableId?: string | null
  /** Called when a table (not a placeholder) is clicked — omit to make the layout non-interactive. */
  onSelectTable?: (element: SeatingLayoutElement) => void
}

export function SeatingLayoutViewer({
  elements,
  myTableId,
  selectedTableId,
  onSelectTable,
}: SeatingLayoutViewerProps) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setScale(el.clientWidth / CANVAS_WIDTH)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-2xl border border-natural-border bg-natural-soft"
      style={{ height: CANVAS_HEIGHT * scale }}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, transform: `scale(${scale})` }}
      >
        {elements.map((element) => (
          <SeatingElementView
            key={element.id}
            element={element}
            isMine={element.id === myTableId}
            isSelected={element.id === selectedTableId}
            onClick={onSelectTable ? () => onSelectTable(element) : undefined}
            mineLabel={t('pages.receptionSeating.yourTableBadge')}
          />
        ))}
      </div>
    </div>
  )
}

function SeatingElementView({
  element,
  isMine,
  isSelected,
  onClick,
  mineLabel,
}: {
  element: SeatingLayoutElement
  isMine: boolean
  isSelected: boolean
  onClick?: () => void
  mineLabel: string
}) {
  const isPlaceholder = element.type === 'placeholder'
  const isCircle = element.type === 'table-circle'
  const clickable = !isPlaceholder && !!onClick

  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? onClick : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick?.()
              }
            }
          : undefined
      }
      style={{
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        transform: `scale(${ELEMENT_SCALE})`,
      }}
      className={`absolute flex items-center justify-center border-2 text-center transition-colors ${
        isCircle ? 'rounded-full' : 'rounded-md'
      } ${clickable ? 'cursor-pointer' : ''} ${
        isPlaceholder
          ? 'border-dashed border-natural-muted bg-white/70'
          : isMine
            ? 'border-emerald-500 bg-emerald-100 hover:bg-emerald-100/80'
            : 'border-natural-accent/60 bg-natural-accent/10 hover:bg-natural-accent/20'
      } ${isSelected ? 'ring-2 ring-natural-accent ring-offset-2' : ''}`}
    >
      <span className="px-1 font-sans text-xl leading-tight font-medium text-natural-text">
        {isPlaceholder ? (
          element.label || '—'
        ) : (
          <>
            {element.code || '—'}
            {element.maxPeople != null && (
              <>
                <br />
                <span className="text-base font-normal text-natural-muted">×{element.maxPeople}</span>
              </>
            )}
            {isMine && (
              <>
                <br />
                <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  {mineLabel}
                </span>
              </>
            )}
          </>
        )}
      </span>
    </div>
  )
}
