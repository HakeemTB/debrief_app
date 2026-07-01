"""Object-level permissions for debriefs, logs, and feedback."""
from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsOwnerIntern(BasePermission):
    """The intern can only access their own records."""

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.is_admin:
            return True
        if user.is_supervisor:
            return True  # supervisors can read all
        # Interns own their records
        intern = getattr(obj, 'intern', obj)
        return intern == user


class CanWriteFeedback(BasePermission):
    """Only SUPERVISOR or ADMIN can write feedback."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return request.user.is_authenticated
        return request.user.is_authenticated and (
            request.user.is_supervisor or request.user.is_admin
        )
