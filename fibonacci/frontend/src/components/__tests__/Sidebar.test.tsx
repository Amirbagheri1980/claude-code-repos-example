import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Sidebar from '../Sidebar'

describe('Sidebar', () => {
  it("displays the passed-in user's name and role", () => {
    render(<Sidebar userName="Ada Lovelace" role="Facilitator" />)
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Role')).toBeInTheDocument()
    expect(screen.getByText('Facilitator')).toBeInTheDocument()
  })
})
