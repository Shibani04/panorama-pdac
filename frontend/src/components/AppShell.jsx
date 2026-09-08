function AppShell({ children }) {
  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">PANORAMA PDAC Detection</h1>
          <p className="text-sm text-text-muted">Multimodal CT + clinical risk assessment</p>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}

export default AppShell