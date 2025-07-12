/**
 * Unit tests for Header component
 */

import { render, screen } from '@testing-library/react'
import Header from '../layout/Header'

describe('Header', () => {
  it('renders Reverbia logo', () => {
    render(<Header />)
    expect(screen.getByText('Reverbia')).toBeInTheDocument()
  })

  it('renders navigation links', () => {
    render(<Header />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Meetings')).toBeInTheDocument()
    expect(screen.getByText('Templates')).toBeInTheDocument()
  })

  it('renders sign in button', () => {
    render(<Header />)
    expect(screen.getByText('Sign In')).toBeInTheDocument()
  })

  it('has correct links', () => {
    render(<Header />)
    expect(screen.getByText('Dashboard')).toHaveAttribute('href', '/dashboard')
    expect(screen.getByText('Meetings')).toHaveAttribute('href', '/meetings')
    expect(screen.getByText('Templates')).toHaveAttribute('href', '/templates')
  })

  it('logo links to home page', () => {
    render(<Header />)
    expect(screen.getByText('Reverbia')).toHaveAttribute('href', '/')
  })
})