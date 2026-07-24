from .models import AuditLog


def _client_ip(request):
    if request is None:
        return None
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    if xff:
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def record_audit(request, action, resource='', **metadata):
    """Persist an attributable admin action. Best-effort: never raises into the
    request path, so a logging hiccup can't fail the actual operation."""
    try:
        actor = getattr(request, 'user', None)
        AuditLog.objects.create(
            actor=actor if getattr(actor, 'is_authenticated', False) else None,
            actor_email=getattr(actor, 'email', '') or '',
            action=action,
            resource=str(resource),
            metadata=metadata or {},
            ip=_client_ip(request),
        )
    except Exception:  # pragma: no cover - logging must not break the action
        pass
