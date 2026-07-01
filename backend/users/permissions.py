"""Custom DRF permissions for role-based access control."""
from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """Only ADMIN role."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_admin)


class IsSupervisor(BasePermission):
    """Only SUPERVISOR role."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_supervisor)


class IsIntern(BasePermission):
    """Only INTERN role."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_intern)


class IsAdminOrSupervisor(BasePermission):
    """ADMIN or SUPERVISOR."""
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
            and (request.user.is_admin or request.user.is_supervisor)
        )


class IsAdminOrSelf(BasePermission):
    """Admin can do anything; others can only access their own object."""
    def has_object_permission(self, request, view, obj):
        return request.user.is_admin or obj == request.user
