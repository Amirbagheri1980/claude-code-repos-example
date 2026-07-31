import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import RoomStatus from '../RoomStatus'

describe('RoomStatus', () => {
  it('shows a checking message while validating the room', () => {
    render(<RoomStatus status="checking" />)
    expect(screen.getByText(/looking for this room/i)).toBeInTheDocument()
  })

  it('shows a friendly error and a way back for an invalid room', () => {
    render(<RoomStatus status="invalid" />)
    expect(screen.getByRole('heading', { name: /room not found/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /start a new room/i })).toBeInTheDocument()
  })
})
