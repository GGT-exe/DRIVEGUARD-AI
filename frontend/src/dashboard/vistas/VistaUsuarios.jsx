import { useState } from 'react'
import { leerJson } from '../datos'
import { useCarga } from '../useCarga'
import { PERMISOS_POR_ROL } from '../roles'

const VACIO = { nombre: '', correo: '', contrasena: '', rol: 'supervisor' }

export default function VistaUsuarios() {
  const [abierto, setAbierto] = useState(false)
  const [form, setForm] = useState(VACIO)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const [enviando, setEnviando] = useState(false)

  const usuarios = useCarga(() => leerJson('/usuarios'), [])
  const cambiar = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }))

  const crear = async (e) => {
    e.preventDefault()
    setError('')
    setExito('')
    if (form.contrasena.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    setEnviando(true)
    try {
      await leerJson('/registro', {
        method: 'POST',
        body: JSON.stringify({ ...form, nombre: form.nombre.trim(), correo: form.correo.trim() }),
      })
      setExito(`Usuario ${form.correo.trim()} creado.`)
      setForm(VACIO)
      setAbierto(false)
      usuarios.recargar()
    } catch (err) {
      setError(err.message.includes('Unique') || err.message.includes('unique')
        ? 'Ya existe un usuario con ese correo.'
        : err.message)
    } finally {
      setEnviando(false)
    }
  }

  const lista = Array.isArray(usuarios.datos) ? usuarios.datos : []

  return (
    <div className="listgrid">
      <div className="panel">
        <div className="panel-head">
          <h2>Usuarios del sistema</h2>
          <button type="button" className="btn small" onClick={() => { setAbierto(true); setError(''); setExito('') }}>+ Agregar usuario</button>
        </div>
        {exito && <div className="okbox" role="status" style={{ margin: '12px 16px' }}>{exito}</div>}
        {usuarios.error && <div className="errorbox" role="alert">{usuarios.error}</div>}
        <div className="tablewrap">
          <table>
            <thead><tr><th>Usuario</th><th>Rol</th><th>Estado</th></tr></thead>
            <tbody>
              {lista.map((u) => (
                <tr className="tdata" key={u.id}>
                  <td>
                    <div>{u.nombre}</div>
                    <div className="alert-sub">{u.correo}</div>
                  </td>
                  <td>{u.rol}</td>
                  <td><span className={`badge ${u.activo ? 'ok' : 'neutral'}`}>{u.activo ? 'Activo' : 'Inactivo'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {usuarios.cargando && <div className="empty">Cargando…</div>}
      </div>

      <div className="panel">
        <div className="panel-head"><h2>Permisos por rol</h2></div>
        {PERMISOS_POR_ROL.map((p) => (
          <div key={p.rol} style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{p.rol}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{p.desc}</div>
          </div>
        ))}
      </div>

      {abierto && (
        <>
          <div className="overlay" onClick={() => setAbierto(false)} />
          <aside className="drawer" aria-label="Agregar usuario">
            <div className="drawer-head">
              <h3>Agregar usuario</h3>
              <button type="button" className="drawer-close" onClick={() => setAbierto(false)} aria-label="Cerrar">✕</button>
            </div>
            <form className="drawer-body" onSubmit={crear}>
              <label className="field" style={{ marginBottom: 12 }}>Nombre
                <input className="input wide" required value={form.nombre} onChange={cambiar('nombre')} />
              </label>
              <label className="field" style={{ marginBottom: 12 }}>Correo
                <input className="input wide" type="email" required value={form.correo} onChange={cambiar('correo')} />
              </label>
              <label className="field" style={{ marginBottom: 12 }}>Contraseña (mínimo 8 caracteres)
                <input className="input wide" type="password" required autoComplete="new-password" value={form.contrasena} onChange={cambiar('contrasena')} />
              </label>
              <label className="field" style={{ marginBottom: 12 }}>Rol
                <select className="select" value={form.rol} onChange={cambiar('rol')}>
                  <option value="supervisor">Supervisor</option>
                  <option value="gerente">Gerente</option>
                  <option value="administrador">Administrador</option>
                </select>
              </label>
              {error && <div className="errorbox" role="alert" style={{ margin: '0 0 12px' }}>{error}</div>}
              <button type="submit" className="btn" disabled={enviando}>{enviando ? 'Creando…' : 'Crear usuario'}</button>
            </form>
          </aside>
        </>
      )}
    </div>
  )
}
