import React from 'react'
import { Selector } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'

interface Trip {
  id: string
  name: string
  description?: string
}

interface TripSelectorProps {
  trips: Trip[]
  currentTripId?: string
  onTripChange: (tripId: string) => void
}

export const TripSelector: React.FC<TripSelectorProps> = ({
  trips,
  currentTripId,
  onTripChange
}) => {
  const navigate = useNavigate()

  const tripOptions = trips.map(trip => ({
    label: trip.name,
    value: trip.id,
    description: trip.description
  }))

  const handleChange = (selectedIds: string[]) => {
    if (selectedIds.length > 0) {
      const newTripId = selectedIds[0]
      navigate(`/chat-expense/${newTripId}`)
      onTripChange(newTripId)
    }
  }

  if (!trips || trips.length === 0) {
    return null
  }

  return (
    <div className="trip-selector-container">
      <div className="trip-selector-label">选择行程：</div>
      <Selector
        options={tripOptions}
        value={currentTripId ? [currentTripId] : []}
        onChange={handleChange}
      />
    </div>
  )
}