import { Component, ErrorInfo, ReactNode } from 'react'
import { Button, ErrorBlock } from 'antd-mobile'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.href = '/'
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20 }}>
          <ErrorBlock
            status='default'
            title='出错了'
            description={this.state.error?.message || '发生了一些错误，请稍后重试'}
          >
            <Button color='primary' onClick={this.handleReset}>
              返回首页
            </Button>
          </ErrorBlock>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary