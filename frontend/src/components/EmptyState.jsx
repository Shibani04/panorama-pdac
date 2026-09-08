function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="px-4 py-10 text-center">
      {Icon && <Icon className="mx-auto mb-3 text-text-muted" size={28} strokeWidth={1.5} />}
      <p className="text-sm font-medium">{title}</p>
      {subtitle && <p className="text-xs text-text-muted mt-1">{subtitle}</p>}
    </div>
  )
}

export default EmptyState