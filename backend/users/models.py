"""Custom User model for DebriefPro with role-based access."""
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Extended user with three roles: ADMIN, SUPERVISOR, INTERN.
    Interns optionally have a supervisor (self-referential FK).
    """

    class Role(models.TextChoices):
        ADMIN = 'ADMIN', 'Admin'
        SUPERVISOR = 'SUPERVISOR', 'Supervisor'
        INTERN = 'INTERN', 'Intern'

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.INTERN,
    )
    supervisor = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='interns',
        limit_choices_to={'role': Role.SUPERVISOR},
    )

    class Meta:
        ordering = ['username']

    def __str__(self):
        return f'{self.get_full_name() or self.username} ({self.role})'

    @property
    def is_admin(self):
        return self.role == self.Role.ADMIN

    @property
    def is_supervisor(self):
        return self.role == self.Role.SUPERVISOR

    @property
    def is_intern(self):
        return self.role == self.Role.INTERN
