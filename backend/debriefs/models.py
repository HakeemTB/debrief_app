"""Models: DailyDebrief, HourlyLog, Feedback."""
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
from django.utils import timezone

from users.models import User


class DailyDebrief(models.Model):
    """One debrief entry per intern per day."""

    intern = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='debriefs',
        limit_choices_to={'role': User.Role.INTERN},
    )
    date = models.DateField(default=timezone.now)
    yesterday_task = models.TextField(help_text="What did you work on yesterday?")
    progress_made = models.TextField(help_text="What progress did you make?")
    challenges = models.TextField(help_text="What challenges did you face?")
    today_task = models.TextField(help_text="What will you work on today?")
    notes = models.TextField(blank=True, null=True, help_text="Any other notes.")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('intern', 'date')
        ordering = ['-date']

    def __str__(self):
        return f'Debrief: {self.intern.username} – {self.date}'


class HourlyLog(models.Model):
    """Hourly activity log entry for an intern."""

    intern = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='hourly_logs',
        limit_choices_to={'role': User.Role.INTERN},
    )
    date = models.DateField(default=timezone.now)
    start_time = models.TimeField()
    end_time = models.TimeField()
    activity = models.TextField()
    productivity_score = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Productivity rating from 1 (lowest) to 5 (highest).",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['date', 'start_time']

    def __str__(self):
        return (
            f'Log: {self.intern.username} – {self.date} '
            f'{self.start_time}–{self.end_time} (score {self.productivity_score})'
        )

    @property
    def duration_hours(self):
        """Return duration in decimal hours."""
        from datetime import datetime, date
        start = datetime.combine(date.today(), self.start_time)
        end = datetime.combine(date.today(), self.end_time)
        delta = end - start
        return round(delta.total_seconds() / 3600, 2)


class Feedback(models.Model):
    """Supervisor feedback on a specific debrief."""

    debrief = models.OneToOneField(
        DailyDebrief,
        on_delete=models.CASCADE,
        related_name='feedback',
    )
    supervisor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='given_feedback',
        limit_choices_to={'role': User.Role.SUPERVISOR},
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Feedback by {self.supervisor} on {self.debrief}'
