"""Admin registration for the User model."""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'role', 'supervisor', 'is_active')
    list_filter = ('role', 'is_active', 'is_staff')
    fieldsets = BaseUserAdmin.fieldsets + (
        ('DebriefPro', {'fields': ('role', 'supervisor')}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('DebriefPro', {'fields': ('role', 'supervisor')}),
    )
    search_fields = ('username', 'email', 'first_name', 'last_name')
