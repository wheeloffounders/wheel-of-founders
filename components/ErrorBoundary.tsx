'use client'

import { Component, type ReactNode } from 'react'
import { trackErrorSync } from '@/lib/error-tracker'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  component?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error) {
    trackErrorSync(error, {
      component: this.props.component ?? 'ErrorBoundary',
      action: 'render',
      severity: 'high',
      metadata: { boundary: true },
    })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-900 dark:text-amber-100">Something went wrong</h3>
              <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                {this.state.error.message}
              </p>
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, error: null })}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700"
              >
                <RefreshCw className="w-4 h-4" />
                Try again
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
