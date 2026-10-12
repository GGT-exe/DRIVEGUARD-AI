import { Component } from 'react'

// Aísla errores de un panel para que no apague toda la pantalla.
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hayError: false }
  }

  static getDerivedStateFromError() {
    return { hayError: true }
  }

  componentDidCatch(error, info) {
    console.error('Panel con error:', error, info.componentStack)
  }

  render() {
    if (this.state.hayError) {
      return (
        <div role="alert" style={{ padding: 12, margin: 8, border: '1px solid #fca5a5', background: '#fef2f2', color: '#991b1b', borderRadius: 6 }}>
          Este panel no pudo cargarse. Revisa la sesión o la conexión con el servidor.
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary