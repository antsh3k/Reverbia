/**
 * Unit tests for Layout component
 */

import { render, screen } from '@testing-library/react'
import Layout from '../layout/Layout'

describe('Layout', () => {
  it('renders children content', () => {
    render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    )
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('includes Header component', () => {
    render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    )
    expect(screen.getByText('Reverbia')).toBeInTheDocument()
  })

  it('has proper structure with main element', () => {
    render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    )
    const main = screen.getByRole('main')
    expect(main).toBeInTheDocument()
    expect(main).toContainElement(screen.getByText('Test Content'))
  })

  it('has minimum height and background styling', () => {
    const { container } = render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    )
    const layoutDiv = container.firstChild
    expect(layoutDiv).toHaveClass('min-h-screen', 'bg-gray-50')
  })
})