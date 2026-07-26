import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import LandingPage from '../LandingPage'

describe('LandingPage', () => {
  it('renders a name input, role radios, and an Enter button', () => {
    render(<LandingPage onSubmit={vi.fn()} />)
    expect(screen.getByLabelText(/your name/i)).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'User' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Facilitator' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /enter/i })).toBeInTheDocument()
  })

  it('defaults the role to Facilitator', () => {
    render(<LandingPage onSubmit={vi.fn()} />)
    expect(screen.getByRole('radio', { name: 'Facilitator' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'User' })).not.toBeChecked()
  })

  it('disables the button until a name is entered', async () => {
    const user = userEvent.setup()
    render(<LandingPage onSubmit={vi.fn()} />)
    const button = screen.getByRole('button', { name: /enter/i })
    expect(button).toBeDisabled()

    await user.type(screen.getByLabelText(/your name/i), 'Ada')
    expect(button).toBeEnabled()
  })

  it('does not enable the button for whitespace-only input', async () => {
    const user = userEvent.setup()
    render(<LandingPage onSubmit={vi.fn()} />)
    await user.type(screen.getByLabelText(/your name/i), '   ')
    expect(screen.getByRole('button', { name: /enter/i })).toBeDisabled()
  })

  it('submits the trimmed name and default role when the button is clicked', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<LandingPage onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText(/your name/i), '  Ada Lovelace  ')
    await user.click(screen.getByRole('button', { name: /enter/i }))

    expect(onSubmit).toHaveBeenCalledWith('Ada Lovelace', 'Facilitator')
  })

  it('submits the trimmed name when Enter is pressed', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<LandingPage onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText(/your name/i), 'Grace{Enter}')

    expect(onSubmit).toHaveBeenCalledWith('Grace', 'Facilitator')
  })

  it('submits the User role when selected', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<LandingPage onSubmit={onSubmit} />)

    await user.click(screen.getByRole('radio', { name: 'User' }))
    await user.type(screen.getByLabelText(/your name/i), 'Grace')
    await user.click(screen.getByRole('button', { name: /enter/i }))

    expect(onSubmit).toHaveBeenCalledWith('Grace', 'User')
  })
})
